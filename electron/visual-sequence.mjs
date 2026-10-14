import {applyEditorialPlan,validateEditorialPlan} from './editorial-planner.mjs';
import {sentenceImportance} from './sentence-strategy.mjs';
import {propertyAt} from './layer-motion.mjs';
function restore(scene){
 if(scene.sequenceSourceLayers)scene.layers=structuredClone(scene.sequenceSourceLayers);
 else scene.layers=(scene.layers||[]).filter(l=>!/-sequence-\d+$/.test(l.id));
 delete scene.visualSequenceApplied;
}
export function applyVisualSequence(project,{sceneIds,force=false}={}){
 const next=structuredClone(project);
 for(const scene of next.scenes){
  if(sceneIds&&!sceneIds.includes(scene.id)||scene.visualSequenceApplied&&!force)continue;
  if(force)restore(scene);
  if(scene.manualTemplate||scene.battlePlan||/\b(?:no|without|avoid)\s+(?:visual\s+)?(?:switching|cuts|scene changes)\b/i.test(project.editingInstructions||''))continue;
  let layers=scene.layers||[];
  const editable=layers.filter(l=>(!l.manual||l.id.includes('-uploaded-subject'))&&!l.instructionLocked&&!l.parentId&&!l.attachment&&l.mediaId&&['subject','supporting-image','supporting-media','supporting-sprite'].includes(l.role));
  if(!editable.length||!editable.some(l=>next.media.some(m=>m.id===l.mediaId)))continue;
  scene.sequenceSourceLayers=structuredClone(layers);scene.visualAssetWarnings=[];
  if(!layers.some(l=>l.role==='chart')){const metrics=scene.reaction?.metrics||[],indexes=metrics.map((_,i)=>i),chart=metrics.length===1&&metrics[0].kind==='percentage'?'ring':metrics.length>=3?'line':metrics.length>=2?'bars':'none';
   if(chart!=='none')try{const recipe=validateEditorialPlan(scene,{chart,metricIndexes:indexes,motion:'none',effect:'none',sound:'none',visualQueries:[],reason:'Explain actual narrated values with a custom animated chart.'});const built=applyEditorialPlan({...next,scenes:[{...scene,editorialPlan:recipe}]});Object.assign(scene,built.scenes[0]);layers=scene.layers;}catch{}
  }
  const charts=layers.filter(l=>l.role==='chart'),chartStart=charts.length?Math.min(...charts.map(l=>l.start)):Infinity,chartEnd=charts.length?Math.min(scene.end,Math.max(...charts.map(l=>l.start))+4):scene.start;
  const entities=scene.reaction?.entities||[],phrases=sentenceImportance(scene),cuts=new Set([scene.start,scene.end]);
  for(let t=scene.start+2;t<scene.end;t+=2)cuts.add(t);
  for(const t of [...entities.map(e=>e.start),...editable.flatMap(l=>[l.start,l.end]),chartStart,chartEnd])if(Number.isFinite(t)&&t>scene.start+.05&&t<scene.end-.05)cuts.add(t);
  const times=[...cuts].sort((a,b)=>a-b),slots=[],noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
  for(let i=0;i<times.length-1;i++){
   const time=times[i],end=times[i+1];if(end-time<.03)continue;
   const active=project.animationPlan?.beats?.find(b=>b.sceneId===scene.id)?.moments?.find(m=>m.start<=time&&m.end>time+.15);
   const attached=layers.find(l=>l.attachment&&l.start<end&&l.end>time);
   if(active||attached){slots.push({time,end,kind:'hold',targetId:active?.targetId||attached.attachment.targetId,reason:'Keep the authored action or held-item interaction visible.'});continue;}
   if(charts.length&&time>=chartStart&&time<chartEnd){slots.push({time,end,kind:'hold',targetId:charts[0].id,reason:'Read the actual narrated data chart.'});continue;}
   const phrase=phrases.find(p=>p.start<=time&&p.end>time),spoken=entities.filter(e=>(e.start??scene.start)<=time+.05),latest=spoken.toSorted((a,b)=>(b.start??scene.start)-(a.start??scene.start))[0];
   const focus=scene.reaction?.intent==='comparison'||phrase?.type==='comparison'?spoken.filter(e=>!phrase?.entityIds?.length||phrase.entityIds.includes(e.id)):latest?[latest]:[];
   const needed=focus.map(e=>e.mediaId).filter(Boolean),missing=focus.filter(e=>!e.mediaId);
   const available=editable.filter(l=>l.start<=time+.01&&l.end>=end-.01&&next.media.some(m=>m.id===l.mediaId)&&(!focus.length||needed.includes(l.mediaId)));
   if(!available.length||missing.length){const names=missing.length?missing.map(e=>e.name):focus.map(e=>e.name);const reason='Missing relevant image'+(names.length?': '+names.join(', '):' for this narration beat');scene.visualAssetWarnings.push(reason);slots.push({time,end,kind:'missing',reason});continue;}
   const source=available[focus.length?0:i%available.length],snapshot={};for(const key of ['x','y','scale','rotation'])snapshot[key]=propertyAt(source,key,time);
   const id=scene.id+'-sequence-'+i;
   const framing=focus.length<=1&&!source.manual&&!source.manualFraming?(next.format==='horizontal'?{x:.12,y:.06,width:.76,height:.8}:{x:.04,y:.1,width:.92,height:.7}):{};
   layers.push({...structuredClone(source),...snapshot,...framing,id,role:'supporting-image',start:time,end,parentId:undefined,animationStart:time,opacity:1,float:false,animation:noMotion?'none':'smooth-zoom',animationAmount:i%2?.085:.025,enter:'none',exit:'none',keyframes:undefined});
   slots.push({time,end,kind:'image',targetId:id,sourceId:source.id,mediaId:source.mediaId,reason:focus.length?'Show '+focus.map(e=>e.name).join(' and ')+' at its narrated mention.':'Use an actual supplied image with a deliberate framing change.'});
   if(focus.length>1)for(const second of available.filter(l=>l.id!==source.id))layers.push({...structuredClone(second),id:id+'-'+second.id,role:'supporting-image',start:time,end,opacity:1,animation:noMotion?'none':'fade',animationStart:time,exit:'none',keyframes:undefined});
  }
  for(const l of editable){const original=layers.find(n=>n.id===l.id);if(!original)continue;original.sequenceHidden=true;
   original.keyframes=(original.keyframes||[]).filter(k=>k.opacity===undefined);for(const slot of slots){const visible=slot.kind==='hold'&&(slot.targetId===l.id||charts.some(c=>c.id===slot.targetId));original.keyframes.push({time:slot.time,opacity:visible?1:0},{time:slot.end-.001,opacity:visible?1:0});}
   original.keyframes=[...original.keyframes.reduce((map,k)=>map.set(k.time,{...map.get(k.time),...k}),new Map()).values()].sort((a,b)=>a.time-b.time);
  }
  for(const l of layers.filter(l=>['chart','chart-panel','stat-label','chart-source','stat-value'].includes(l.role)))if(l.start<chartEnd&&chartEnd<scene.end)l.end=Math.min(l.end,chartEnd);
  scene.layers=layers;scene.visualSequenceApplied=true;scene.visualSequence=slots;scene.visualAssetWarnings=[...new Set(scene.visualAssetWarnings)];
 }
 return next;
}
