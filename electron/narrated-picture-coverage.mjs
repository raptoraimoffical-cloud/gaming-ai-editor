import {sourceMechanicCues} from './source-move-cards.mjs';
import {findMechanicImage,sourceMechanicGeometry} from './mechanic-images-policy.mjs';
import {moveContext} from './move-context.mjs';
import {visibleRanges,mergeRanges} from './layer-visibility.mjs';
import {placementFor} from './layer-motion.mjs';
import {stageStoryPicture} from './story-picture-sequence.mjs';
import {readSceneBlueprints} from './scene-blueprint.mjs';

const sourceId=(p,id)=>p.media.find(m=>m.id===id)?.artworkFraming?.sourceId||id;
const noPictures=p=>/\b(?:no|without|avoid|disable)\s+(?:extra |additional |all )?(?:images|pictures|overlays)\b/i.test(p.editingInstructions||'');
const canonical=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function narratedPictureCues(project){
 const cues=[];
 for(const s of project.scenes){if(s.manualTemplate||s.deletedLayerIds?.length)continue;
  for(const e of s.reaction?.entities||[]){
   if(e.inherited||!e.mediaId||!['pokemon','person','character','object','hardware'].includes(e.type)||e.start<s.start||e.start>=s.end)continue;
   const m=project.media.find(m=>m.id===e.mediaId);if(!m||!['image','pokemon','video'].includes(m.kind)||m.assetRole==='logo')continue;
   const spoken=s.words.some((w,i)=>Math.abs(w.start-e.start)<.08&&canonical(s.words.slice(i,i+e.name.split(/\s+/).length).map(w=>w.captionText??w.text).join(' '))===canonical(e.name))||(project.pokemonMentions||[]).some(m=>m.status==='ready'&&m.mediaId===e.mediaId&&Math.abs(m.start-e.start)<.1);
   if(spoken)cues.push({sceneId:s.id,start:e.start,name:e.name,kind:e.type,mediaId:m.id,framing:'focus',duration:1.8});
  }
  for(const l of s.layers||[]){
   if(l.role!=='item'||l.referenceContinuation)continue;const m=project.media.find(m=>m.id===l.mediaId);if(!m)continue;
   const name=(m.identity?.subject||m.name).replaceAll('-',' '),count=name.split(/\s+/).length;
   if(s.words.some((w,i)=>Math.abs(w.start-l.start)<.1&&canonical(s.words.slice(i,i+count).map(w=>w.captionText??w.text).join(' '))===canonical(name)))cues.push({sceneId:s.id,start:l.start,name:m.name,kind:'item',mediaId:m.id,framing:'side',duration:1.8});
  }
 }
 for(const c of sourceMechanicCues(project)){
  if(c.kind==='move'&&!moveContext(project,c).showCard)continue;
  const m=findMechanicImage(project,c.kind,c.title);
  cues.push({sceneId:c.sceneId,start:c.start,name:c.title,kind:c.kind,mediaId:m?.id,framing:'evidence',duration:c.kind==='type'?1.5:2.6});
 }
 for(const c of [...(project.naturePlan||[]),...(project.shortMechanics?.cues||[]).filter(c=>c.kind==='item')]){
  const m=project.media.find(m=>m.id===c.mediaId||m.assetRole==='item'&&canonical(m.identity?.subject||m.name)===canonical(c.mint||c.name));
  cues.push({sceneId:c.sceneId,start:c.start,name:c.title||c.name,kind:c.kind,mediaId:m?.id,framing:'side',duration:1.8});
 }
 return [...new Map(cues.map(c=>[[c.kind,c.mediaId||c.name,c.start.toFixed(2)].join('/'),c])).values()].sort((a,b)=>a.start-b.start);
}
function coverage(project,cue,end){
 const intervals=[];
 for(const s of project.scenes)for(const l of s.layers||[]){
  if(!l.mediaId||sourceId(project,l.mediaId)!==sourceId(project,cue.mediaId)||['background','shadow','environment-depth'].includes(l.role))continue;
  for(const r of visibleRanges(l,cue.start,end,s.layers)){const at=(r.start+r.end)/2,p=placementFor(l,s.layers,project.media,at,project.format==='horizontal'?1920:1080,project.format==='horizontal'?1080:1920);if(p.motion.opacity>.15&&p.width*p.height>.008)intervals.push(r);}
 }
 return mergeRanges(intervals);
}
// Give every script a factual visual floor. Recovery uses already resolved
// original assets and exact speech cues, never a stock gag or an old project.
export function clearNarratedPictureCoverage(project){
 const p=structuredClone(project);for(const s of p.scenes)if(s.narratedPictureSourceLayers){const locked=(s.layers||[]).filter(l=>l.manual||l.instructionLocked);s.layers=[...s.narratedPictureSourceLayers.filter(l=>!locked.some(k=>k.id===l.id)),...locked];delete s.narratedPictureSourceLayers;}
 delete p.narratedPictureReport;return p;
}
export function applyNarratedPictureCoverage(project){
 if(noPictures(project)||readSceneBlueprints(project.editingInstructions||'').length)return project;
 const p=clearNarratedPictureCoverage(project),cues=narratedPictureCues(p),report={requested:cues.length,delivered:[],recovered:[],missing:[]};
 for(const [i,c] of cues.entries()){
  const scene=p.scenes.find(s=>s.id===c.sceneId);if(!scene||scene.manualTemplate||scene.deletedLayerIds?.length)continue;
  const media=p.media.find(m=>m.id===c.mediaId);
  if(!media){report.missing.push({...c,reason:'No verified original source asset resolved'});continue;}
  const isEvidence=['move','ability','type'].includes(c.kind),next=cues.slice(i+1).find(n=>n.start>c.start+.05&&(isEvidence?['move','ability','type'].includes(n.kind):n.kind===c.kind)),end=Math.min(p.duration,c.start+c.duration,next?.start??p.duration);
  if(end-c.start<.25)continue;
  const visible=coverage(p,c,end),cover=visible.find(r=>r.start<=c.start+.2&&r.end>=end-.12);
  if(cover){report.delivered.push({...c,end});continue;}
  // A deliberate source/actor already covering its cue is continued instead
  // of duplicated. A missing foreground is promoted to a readable main shot.
  let start=c.start;const first=visible.find(r=>r.start<=c.start+.2);if(first)start=first.end;
  if(end-start<.25){report.delivered.push({...c,end});continue;}
  const geometry=isEvidence?{...sourceMechanicGeometry(media,c.kind,p),...(c.kind==='type'?{keepLead:true}:{})}:['item','nature'].includes(c.kind)?{x:.72,y:.18,width:.22,height:p.format==='horizontal'?.25:.125,keepLead:true}:undefined;
  const delivered=stageStoryPicture(p,{id:'narrated-picture-'+i,media,prop:{framing:c.framing,anchor:'stage',position:{x:.68,y:.10},size:.34,geometry},start,end,revealStart:c.start,tracks:[],sound:'pop',snapshotField:'narratedPictureSourceLayers'});
  if(delivered.length){report.recovered.push({...c,start,end,layers:delivered});report.delivered.push({...c,end});}
  else report.missing.push({...c,reason:'The interval is protected by manual editing'});
 }
 p.narratedPictureReport=report;return p;
}
