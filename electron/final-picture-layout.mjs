import {visibleRanges,mergeRanges} from './layer-visibility.mjs';
import {propertyAt} from './layer-motion.mjs';
const roles=new Set(['subject','story-picture','supporting-image','creative-stage-prop','mechanic-card','moveset-card']);
export function pictureIdentity(project,layer){
 const m=project.media.find(m=>m.id===layer.mediaId);if(!m)return undefined;
 // Forms have distinct canonical names. Different Pokémon must never merge.
 if(m.pokemon?.name)return 'pokemon:'+m.pokemon.name.toLowerCase();
 return 'source:'+(m.artworkFraming?.sourceId||m.id);
}
export function suppressRepeatedStoryPictures(project){
 const p=structuredClone(project);
 for(const s of p.scenes){
  if(s.manualTemplate)continue;
  const pictures=(s.layers||[]).filter(l=>roles.has(l.role)&&l.mediaId&&!l.attachment&&!l.storyCastActor),groups=new Map();
  for(const l of pictures){const key=pictureIdentity(p,l);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);}
  for(const group of groups.values()){
   // A composed battle can intentionally have two of the same species. Only
   // remove repeats introduced by a sourced story insert or mechanic card.
   if(group.length<2||!group.some(l=>l.storyPictureOrigin||l.sourceMoveCard))continue;
   const priority=l=>l.manual||l.instructionLocked||l.blueprintVisual?100:l.actionMovie||l.actorPerformance||l.creativeAction?90:l.role==='subject'?85:l.storyPictureOrigin?80:40;
   group.sort((a,b)=>priority(b)-priority(a));
   for(let i=1;i<group.length;i++){const l=group[i];if(l.manual||l.instructionLocked||l.blueprintVisual||l.actionMovie||l.actorPerformance||l.creativeAction)continue;
    const excluded=[];for(const higher of group.slice(0,i))for(const a of visibleRanges(l,s.start,s.end,s.layers))for(const b of visibleRanges(higher,s.start,s.end,s.layers)){const start=Math.max(a.start,b.start),end=Math.min(a.end,b.end);if(end>start+.001)excluded.push({start,end});}
    if(excluded.length)l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),...excluded]);
   }
  }
 }
 return p;
}
export function finalPictureLayout(project){
 const p=suppressRepeatedStoryPictures(project),promoted=[];
 for(const s of p.scenes){
  const candidates=(s.layers||[]).filter(l=>roles.has(l.role)&&l.mediaId&&p.media.find(m=>m.id===l.mediaId)?.assetRole!=='logo'&&!l.attachment&&!l.manual&&!l.instructionLocked&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction&&!l.storyCastActor&&!l.blueprintVisual);
  for(const l of candidates){
   // A picture alone at the start of a long range may have a partner entering
   // later. Promote only the actual solo interval, then restore its lane.
   const bounds=[...new Set([s.start,s.end,...(s.layers||[]).filter(o=>o!==l&&roles.has(o.role)&&o.mediaId&&!o.attachment).flatMap(o=>visibleRanges(o,s.start,s.end,s.layers).flatMap(r=>[r.start,r.end]).concat((o.keyframes||[]).filter(k=>k.opacity===0).map(k=>k.time)))])].sort((a,b)=>a-b);
   const spans=visibleRanges(l,s.start,s.end,s.layers).flatMap(r=>{const cuts=[r.start,...bounds.filter(t=>t>r.start&&t<r.end),r.end];return cuts.slice(1).map((end,i)=>({start:cuts[i],end}));});for(const r of spans){const at=Math.min(r.end-.01,r.start+.3);
    const others=(s.layers||[]).filter(o=>o!==l&&roles.has(o.role)&&o.mediaId&&p.media.find(m=>m.id===o.mediaId)?.assetRole!=='logo'&&!o.attachment&&visibleRanges(o,at,at+.01,s.layers).length&&propertyAt(o,'opacity',at)> .15);
    if(others.length||l.width>=.52||r.end-r.start<.5)continue;
    const original={x:l.x,y:l.y,width:l.width,height:l.height},keys=l.keyframes||[],finish=Math.min(r.end,r.start+.22),back=Math.max(finish,r.end-.18);
    l.keyframes=[...keys.filter(k=>k.time<r.start||k.time>r.end),{time:r.start,...original},{time:finish,x:.10,y:.14,width:.80,height:.46},{time:back,x:.10,y:.14,width:.80,height:.46},{time:r.end,...original}].sort((a,b)=>a.time-b.time).filter((k,i,a)=>!i||k.time>a[i-1].time);l.easing='smooth';
    promoted.push({sceneId:s.id,layerId:l.id,start:r.start,end:r.end,reason:'The only picture must read as the main visual, not a corner accent'});
   }
  }
 }
 p.finalPictureLayoutReport={promoted};return p;
}
