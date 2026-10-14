import {modelChat} from './inference-trace.mjs';
import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
import {quoteTime} from './local-animator.mjs';
import {videoMode} from './video-modes.mjs';
const visual=m=>['image','video','pokemon'].includes(m.kind)&&m.assetReview?.accepted!==false;
export function shotCandidates(scene,project){
 let entities=scene.reaction?.entities||[];
 if(!entities.length){const index=project.scenes.findIndex(s=>s.id===scene.id);entities=project.scenes.slice(0,index).findLast(s=>s.reaction?.entities?.length)?.reaction.entities||project.scenes.slice(index+1).find(s=>s.reaction?.entities?.length)?.reaction.entities||[];}
 const franchises=new Set(entities.map(franchiseForEntity).filter(f=>f!=='unknown'));
 const subjectIds=new Set(entities.map(e=>e.mediaId));
 const backgrounds=project.media.filter(m=>visual(m)&&(m.license||m.provider==='google-images'&&m.decoded&&m.webAssessment?.accepted)&&!m.pokemon&&(!m.transparent||m.assetRole==='background')&&franchises.has(assetIdentity(m).franchise)&&(m.assetRole==='background'||/gameplay|screenshot|terrain|forest|cave|landscape|environment|arena/i.test(m.name+' '+m.tags))).slice(0,16);
 const support=project.media.filter(m=>visual(m)&&(subjectIds.has(m.id)||backgrounds.some(b=>b.id===m.id))).slice(0,16);
 return {backgrounds,support};
}
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
export function applyShotPlan(project){
 if(!project.shotPlan)return project;
 const noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)/i.test(project.editingInstructions||'');
 const next={...project,scenes:project.scenes.map(scene=>{
  const shot=project.shotPlan.shots.find(s=>s.sceneId===scene.id);if(!shot||scene.manualTemplate)return scene;
  const candidates=shotCandidates(scene,project),layers=(scene.layers||[]).filter(l=>!l.id.startsWith(scene.id+'-shot-')).map(l=>({...l}));
  const bg=layers.find(l=>l.role==='background'&&!l.manual&&!l.instructionLocked);
  const selected=candidates.backgrounds.find(m=>m.id===shot.backgroundId);
  if(bg&&selected&&!project.creationAssets?.backgroundMediaId&&project.creationAssets?.backgroundMode!=='generate'){
   Object.assign(bg,{type:selected.kind==='video'?'video':'image',mediaId:selected.id,fit:'cover',blur:0});delete bg.svg;
   layers.push({id:scene.id+'-shot-tone',type:'shape',role:'environment-depth',x:0,y:0,width:1,height:1,z:bg.z+1,start:scene.start,end:scene.end,color:'#07111e',opacity:.3,enter:'none',exit:'none',animation:'none'});
  }
  // A shared camera path avoids restarting the same scenery at every mention.
  if(bg){bg.animation='none';bg.enter='none';bg.exit='none';bg.float=false;bg.keyframes=noMotion?undefined:[{time:0,scale:1.04,x:0,y:0},{time:project.duration,scale:1.08,x:-.025,y:-.01}];}
  const protectedRoles=['subject','chart','chart-panel','stat-label','stat-value','title','game-logo','comparison-media'];
  const occupied=layers.filter(l=>protectedRoles.includes(l.role)||l.manual);
  const slots=project.format==='horizontal'?[{x:.04,y:.67,width:.24,height:.20},{x:.72,y:.67,width:.24,height:.20},{x:.72,y:.05,width:.24,height:.20}]:[{x:.04,y:.64,width:.28,height:.18},{x:.68,y:.64,width:.28,height:.18},{x:.68,y:.10,width:.28,height:.18}];
  for(const [i,cutaway] of (shot.support||[]).slice(0,2).entries()){
   const m=candidates.support.find(m=>m.id===cutaway.mediaId);if(!m||layers.some(l=>l.mediaId===m.id))continue;
   let start;try{start=Math.max(scene.start,quoteTime(scene,cutaway.quote));}catch{continue;}
   const end=Math.min(scene.end,start+cutaway.duration);if(end-start<.6)continue;
   const slot=slots.find(slot=>!occupied.some(l=>l.start<end&&l.end>start&&overlap(slot,l)>.004));if(!slot)continue;
   const layer={id:scene.id+'-shot-'+i,role:'supporting-media',type:m.kind==='video'?'video':'image',mediaId:m.id,...slot,start,end,fit:'contain',z:25,animation:'fade',enter:'fade',exit:'fade',entranceDuration:.45,exitDuration:.4,keyframes:[{time:start,scale:1},{time:end,scale:1.035}],easing:'easeInOut'};layers.push(layer);occupied.push(layer);
  }
  if(shot.atmosphere==='depth'&&!noMotion&&!/\b(no|without|avoid)\s+(?:visual\s+)?(effects|particles|motion|animation)/i.test(project.editingInstructions||'')&&!layers.some(l=>l.type==='particles'))layers.push({id:scene.id+'-shot-depth',type:'particles',role:'environment-depth',x:0,y:0,width:1,height:1,z:2,start:scene.start,end:scene.end,particleCount:12,color:project.captionColor,opacity:.22,animation:'none',enter:'none',exit:'none'});
  return {...scene,layers,shotPurpose:shot.purpose,backgroundConcept:selected?'Context scenery: '+selected.name:scene.backgroundConcept};
 })};return smoothSequence(next);
}
export function smoothSequence(project){
 return {...project,scenes:project.scenes.map((scene,i)=>({...scene,transition:i?(scene.transition||'crossfade'):scene.transition,transitionDuration:scene.transitionDuration||.45,layers:(scene.layers||[]).map(l=>{
  if(l.manual||l.instructionLocked||l.actionMovie||l.actorPerformance||l.creativeAction||l.narrationEffect)return l;const n={...l};
  if(Math.abs(l.end-scene.end)<.04)n.exit='none';
  if(l.role==='subject'&&l.keyframes?.length){n.animation=['spring-pop','smooth-zoom','emphasis','parallax'].includes(l.animation)?'fade':l.animation;n.float=false;}
  if(l.enter!=='none')n.entranceDuration=Math.min(.55,Math.max(.3,l.entranceDuration||.4),(l.end-l.start)*.4);
  return n;
 })}))};
}
export async function planShots(project,state,progress=()=>{},fetchImpl=fetch){
 if(state.mode==='fast'||!state.models.reasoning)return smoothSequence(project);
 const report={model:state.models.reasoning.name,overview:'',shots:[],warnings:[]};
 for(let offset=0;offset<project.scenes.length;offset+=4){
  const batch=project.scenes.slice(offset,offset+4);progress({stage:`Directing contextual shots ${offset+1}–${Math.min(offset+4,project.scenes.length)}/${project.scenes.length}`});
  const shotSchema={type:'object',required:['sceneId','purpose','backgroundId','support','atmosphere'],properties:{sceneId:{enum:batch.map(s=>s.id)},purpose:{type:'string'},backgroundId:{type:'string'},atmosphere:{enum:['none','depth']},support:{type:'array',maxItems:2,items:{type:'object',required:['mediaId','quote','duration','reason'],properties:{mediaId:{type:'string'},quote:{type:'string'},duration:{type:'number',minimum:.8,maximum:5},reason:{type:'string'}}}}}};
  shotSchema.properties.backgroundId.enum=['',...new Set(batch.flatMap(s=>shotCandidates(s,project).backgrounds.map(m=>m.id)))];
  shotSchema.properties.support.items.properties.mediaId.enum=[...new Set(batch.flatMap(s=>shotCandidates(s,project).support.map(m=>m.id)))];
  if(!shotSchema.properties.support.items.properties.mediaId.enum.length){shotSchema.properties.support.maxItems=0;shotSchema.properties.support.items.properties.mediaId.enum=[''];}
  shotSchema.allOf=batch.map(scene=>({if:{properties:{sceneId:{const:scene.id}},required:['sceneId']},then:{properties:{backgroundId:{enum:['',...shotCandidates(scene,project).backgrounds.map(m=>m.id)]}}}}));
  try{
   const result=await modelChat(state,state.models.reasoning,[{role:'system',content:'Direct a cohesive gaming video, not a keyword slideshow. Read the WHOLE narration first. Establish the world, develop each explanation, and resolve the payoff. Choose real context scenery from each scene’s supplied background IDs. Reuse scenery across related beats; change it when the setting or argument changes. Choose up to two supporting images only if they explain an action, comparison or consequence and are not already on screen. Quote exact narration for their cue. Empty backgroundId means retain current scenery. Every shot needs a concrete purpose connected to previous/next beats. Depth atmosphere supplies restrained ambient motion behind foregrounds when appropriate. User no-motion/no-effect instructions override. Never invent media IDs, facts, images or new subjects. Return overview and exactly one shot per batch scene.'},{role:'user',content:JSON.stringify({instructions:project.editingInstructions,videoMode:videoMode(project),wholeVideo:project.scenes.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end})),previousShots:report.shots.slice(-2),batch:batch.map(s=>{const c=shotCandidates(s,project);return {id:s.id,text:s.text,onScreen:(s.layers||[]).filter(l=>l.mediaId&&l.role!=='background').map(l=>l.mediaId),backgrounds:c.backgrounds.map(m=>({id:m.id,name:m.name,tags:m.tags})),support:c.support.map(m=>({id:m.id,name:m.name}))};})})}],{fetchImpl,stage:'whole-video-shot-direction',format:{type:'object',required:['overview','shots'],properties:{overview:{type:'string'},shots:{type:'array',minItems:batch.length,maxItems:batch.length,items:shotSchema}}}});
   if(!Array.isArray(result.shots)||result.shots.length!==batch.length||new Set(result.shots.map(s=>s.sceneId)).size!==batch.length)throw Error('Incomplete contextual shot plan');
   report.overview ||= String(result.overview||'').slice(0,3000);
   for(const shot of result.shots){const scene=batch.find(s=>s.id===shot.sceneId);if(!scene)throw Error('Unknown shot scene');const c=shotCandidates(scene,project);if(shot.backgroundId&&!c.backgrounds.some(m=>m.id===shot.backgroundId))throw Error('Unrelated background rejected');if(!Array.isArray(shot.support)||shot.support.length>2||shot.support.some(s=>!c.support.some(m=>m.id===s.mediaId)||!Number.isFinite(s.duration)||s.duration<.8||s.duration>5))throw Error('Invalid supporting image rejected');for(const s of shot.support)quoteTime(scene,s.quote);report.shots.push(shot);}
  }catch(e){if(state.signal.aborted)throw e;report.warnings.push(e.message);const event=state.inferenceEvents?.at(-1);if(event){event.accepted=false;event.reason=e.message;}}
 }
 state.limitations.push(...report.warnings);return applyShotPlan({...project,shotPlan:report});
}
