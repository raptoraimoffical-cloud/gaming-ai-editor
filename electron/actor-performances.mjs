import {noMotion,projectGame} from './game-presentation.mjs';
import {sceneGame} from './game-selection.mjs';
import {propertyAt} from './layer-motion.mjs';
import {reservedActorAction} from './planned-action-windows.mjs';
const clean=s=>String(s||'').toLowerCase().replace(/[\u2019']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
export const PERFORMANCE_KINDS=['doubt','reveal','swagger','payoff','deflate','double-take','panic','faceplant'];
const phrases=[
 ['doubt',/^(?:not supposed to|should not work|shouldnt work|sounds ridiculous|looks ridiculous|one problem|one catch|the catch|bad idea)\b/,4],
 ['reveal',/^(?:secret weapon|hidden trick|nobody expects|nobody expected|plot twist|out of nowhere)\b/,3],
 ['swagger',/^(?:villain arc|diabolical|menace|unstoppable|absolute monster)\b/,2],
 ['payoff',/^(?:it worked|actually works|somehow won|still wins|ended up winning|turns out|but actually)\b/,3],
 ['deflate',/^(?:does nothing|did nothing|completely useless|fell apart|failed miserably|absolute garbage|total disaster)\b/,3],
 ['double-take',/^(?:wait what|excuse me|you heard that right|are you kidding|that makes no sense|what just happened|one job)\b/,3],
 ['panic',/^(?:oh no|we are cooked|were cooked|in trouble|run for your life|panic button)\b/,3],
 ['faceplant',/^(?:misses again|missed again|famous last words|what could go wrong|skill issue|gets humbled|got humbled|instant regret)\b/,3]
];
export function planPerformances(project){
 if(noMotion(project)||project.autoReactionGifs===false||/\b(?:no|without|disable)\s+(?:humor|comedy|comic reactions)\b/i.test(project.editingInstructions||''))return [];
 const events=[];
 for(const scene of project.scenes){
  if(scene.manualTemplate||scene.battlePlan||sceneGame(project,scene,projectGame(project))!=='pokemon')continue;
  const words=scene.words||[];
  for(let i=0;i<words.length;i++){
   const w=words[i];
   const phrase=words.slice(i,i+7).map(w=>clean(w.captionText||w.text)).join(' '),before=words.slice(Math.max(0,i-3),i).map(w=>clean(w.text)).join(' ');
   const found=phrases.find(([,re])=>re.test(phrase));if(!found||/\b(?:not|never|isnt)\b/.test(before))continue;
   const match=phrase.match(found[1])[0],count=match.split(' ').length,at=words[Math.min(words.length-1,i+count-1)].start;
   events.push({sceneId:scene.id,kind:found[0],start:at,quote:words.slice(i,i+count).map(w=>w.text).join(' '),source:'Narrated expression'});i+=count-1;
  }
  for(const e of scene.editorialPlan?.performances||[])events.push({sceneId:scene.id,kind:e.kind,start:words[e.wordIndex].start,quote:e.quote,actorId:e.actorId,source:'Trained editorial plan',reason:e.reason});
 }
 return events.sort((a,b)=>a.start-b.start).filter((e,i,all)=>!all.slice(0,i).some(p=>e.start-p.start<1.25));
}
export function clearPerformances(project){
 const next=structuredClone(project);for(const s of next.scenes){
  if(s.performanceSourceLayers){const manual=(s.layers||[]).filter(l=>!editable(l)),restored=s.performanceSourceLayers.filter(l=>!manual.some(m=>m.id===l.id));
   for(const m of manual.filter(l=>l.actorPerformance&&l.role==='subject'))for(const old of restored.filter(l=>l.role==='subject'&&l.mediaId===m.mediaId&&l.start<m.end&&l.end>m.start))old.excludedRanges=[...(old.excludedRanges||[]),{start:m.start,end:m.end}];
   s.layers=[...restored,...manual];delete s.performanceSourceLayers;
  }else s.layers=(s.layers||[]).filter(l=>!l.actorPerformance||!editable(l));
 }delete next.performanceReport;return next;
}
export function applyPerformances(project){
 const next=clearPerformances(project),events=planPerformances(next),applied=[];
 for(const [i,e] of events.entries()){
  const s=next.scenes.find(s=>s.id===e.sceneId),end=Math.min(s.end,e.start+(e.kind==='swagger'?2.2:1.35));if(end-e.start<.3)continue;
  if((s.layers||[]).some(l=>l.start<end&&l.end>e.start&&(['gameplay','chart','narrated-action'].includes(l.role)||['stats','metrics'].includes(l.setupGraphic?.kind))))continue;
  const candidates=(s.layers||[]).filter(l=>l.role==='subject'&&editable(l)&&l.start<=e.start&&l.end>=end);
  const named=(next.pokemonMentions||[]).filter(m=>m.end<=e.start+.04&&candidates.some(l=>l.mediaId===m.mediaId)).at(-1);
  const actor=candidates.find(l=>l.mediaId===(e.actorId||named?.mediaId))||candidates.sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!actor)continue;
  if((actor.excludedRanges||[]).some(r=>r.start<end&&r.end>e.start)||reservedActorAction(next,s,actor.mediaId,e.start,end))continue;
  s.performanceSourceLayers??=structuredClone(s.layers);
  const base={x:propertyAt(actor,'x',e.start),y:propertyAt(actor,'y',e.start),scale:propertyAt(actor,'scale',e.start),rotation:propertyAt(actor,'rotation',e.start)},finish={x:propertyAt(actor,'x',end),y:propertyAt(actor,'y',end),scale:propertyAt(actor,'scale',end),rotation:propertyAt(actor,'rotation',end)};
  const keys=[{time:e.start,...base}];
  if(e.kind==='doubt')for(const [dt,angle] of [[.16,-7],[.32,6],[.48,-5],[.68,0]])keys.push({time:e.start+dt,...base,rotation:base.rotation+angle,scale:base.scale*.90});
  if(e.kind==='reveal')keys.push({time:e.start+.16,...base,scale:base.scale*.83,y:base.y+.025},{time:e.start+.42,...base,scale:base.scale*1.08},{time:e.start+.7,...base});
  if(e.kind==='swagger')keys.push({time:e.start+.25,...base,y:Math.max(.12,base.y-.02),rotation:base.rotation-4,scale:base.scale*1.07},{time:e.start+.8,...base,y:Math.max(.12,base.y-.02),rotation:base.rotation+3,scale:base.scale*1.07});
  if(e.kind==='payoff')keys.push({time:e.start+.18,...base,y:Math.max(.12,base.y-.035),scale:base.scale*1.08},{time:e.start+.38,...base,y:base.y+.01,scale:base.scale*.98},{time:e.start+.65,...base,y:Math.max(.12,base.y-.015),scale:base.scale*1.025});
  if(e.kind==='deflate')keys.push({time:e.start+.28,...base,y:base.y+.025,rotation:base.rotation+12,scale:base.scale*.79},{time:e.start+.75,...base,y:base.y+.025,rotation:base.rotation+12,scale:base.scale*.79});
  if(e.kind==='double-take')keys.push({time:e.start+.12,...base,rotation:base.rotation-10,scale:base.scale*.94},{time:e.start+.30,...base,rotation:base.rotation+7,scale:base.scale*1.08},{time:e.start+.55,...base,rotation:base.rotation-3});
  if(e.kind==='panic')for(const [dt,dx,angle] of [[.12,-.012,-6],[.24,.012,6],[.36,-.016,-7],[.48,.016,7],[.64,0,0]])keys.push({time:e.start+dt,...base,x:base.x+dx,rotation:base.rotation+angle});
  if(e.kind==='faceplant')keys.push({time:e.start+.12,...base,y:base.y-.016,scale:base.scale*1.04},{time:e.start+.35,...base,y:base.y+.032,rotation:base.rotation+17,scale:base.scale*.85},{time:e.start+.8,...base,y:base.y+.032,rotation:base.rotation+17,scale:base.scale*.85});
  const keyframes=keys.filter(k=>k.time<end-.03);keyframes.push({time:end,...finish});
  for(const k of keyframes)if(k.time!==e.start&&k.time!==end){k.scale=Math.min(k.scale,(1-.06)/actor.width);if(actor.width>.8)k.rotation=Math.max(-5,Math.min(5,k.rotation));}
  const id=s.id+'-performance-'+i,acting={...actor,id,actorSourceId:actor.id,start:e.start,end,animationStart:e.start,actorPerformance:true,animation:'none',enter:'none',exit:'none',keyframes,easing:'smooth'};
  // Gate the original during the performance; its original camera path resumes
  // at the same clock time without an entrance restart or a duplicate subject.
  actor.excludedRanges=[...(actor.excludedRanges||[]),{start:e.start,end}];s.layers.push(acting);
  // Existing held items follow the actor instead of floating where it used to be.
  for(const item of s.layers.filter(l=>l.attachment?.targetId===actor.id&&l.start<end&&l.end>e.start&&editable(l))){s.layers.push({...item,id:item.id+'-perform-'+i,start:Math.max(item.start,e.start),end:Math.min(item.end,end),actorPerformance:true,attachment:{...item.attachment,targetId:id}});item.excludedRanges=[...(item.excludedRanges||[]),{start:e.start,end}];}
  if(e.kind==='swagger')s.layers.push({id:id+'-lighting',type:'svg',role:'performance-light',actorPerformance:true,start:e.start,end,x:0,y:0,width:1,height:1,z:3,animation:'fade',entranceDuration:.25,exit:'fade',opacity:.40,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><radialGradient id="v"><stop stop-color="#8f243d" stop-opacity=".4"/><stop offset="1" stop-color="#130b25" stop-opacity=".9"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#v)"/></svg>'});
  applied.push({...e,end,mediaId:actor.mediaId,purpose:e.kind==='doubt'?'Let the actor question the setup before the payoff':e.kind==='deflate'?'A short visual letdown, then return to the explanation':e.kind==='swagger'?'A theatrical character entrance matching the narrated tone':'Play the narrated reveal or result with the existing character'});
 }
 next.performanceReport={version:1,events:applied,sounds:applied.map(e=>({start:e.start,cue:['deflate','faceplant'].includes(e.kind)?'boing':['doubt','double-take'].includes(e.kind)?'click':e.kind==='swagger'?'whoosh':e.kind==='panic'?'chatter':'pop',priority:9,reason:'Character '+e.kind+': '+e.quote}))};return next;
}
