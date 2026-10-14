import {videoMode} from './video-modes.mjs';
import {referenceActivityBrief} from './reference-activity.mjs';
import {modelChat} from './inference-trace.mjs';
import {retentionBrief} from './retention-planner.mjs';
import {propertyAt} from './layer-motion.mjs';
const actions=['enter','drift','emphasize','orbit','focus','chart-reveal','trail'];
export const editableAnimationTarget=l=>!!l&&!l.manual&&!l.manualFraming&&!l.instructionLocked&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction&&!l.narrationEffect&&['subject','chart'].includes(l.role);
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function quoteTime(scene,quote,window){
 if(!quote)return window?Math.max(scene.start,window.start):scene.start;
 const q=norm(quote).split(' ').filter(Boolean);if(!q.length)throw Error('Animation cue is not in the narration');
 const words=(scene.words||[]).flatMap(w=>norm(w.text).split(' ').filter(Boolean).map(text=>({text,start:w.start,end:w.end})));
 const tokens=words.length?words:norm(scene.text).split(' ').map(text=>({text,start:scene.start,end:scene.end}));
 for(let i=0;i<=tokens.length-q.length;i++)if(q.every((text,j)=>tokens[i+j].text===text)){
  const time=tokens[i].start;if(!window||(time>=window.start-.001&&time<window.end-.1))return time;
 }
 throw Error(window?'Animation narration quote is not spoken while its target is visible':'Animation cue is not in the narration');
}
export function validateAnimationBeat(scene,beat){
 if(!beat||beat.sceneId!==scene.id||!Array.isArray(beat.moments)||beat.moments.length>4)throw Error('Invalid animation beat');
 const moments=beat.moments.map(m=>{
  const layer=scene.layers?.find(l=>l.id===m.targetId);
  if(!editableAnimationTarget(layer))throw Error('Animation cannot change a missing, locked, already performed or unrelated layer');
  if(!actions.includes(m.action)||!['left','right','up','down'].includes(m.direction)||!Number.isFinite(m.duration)||m.duration<.2||m.duration>3||!Number.isFinite(m.intensity)||m.intensity<.01||m.intensity>.12)throw Error('Unsupported animation movement');
  if(m.action==='chart-reveal'&&!['line','ring','bar'].includes(layer.type))throw Error('Chart reveal requires a data chart');
  if(layer.role==='chart'&&!['chart-reveal','focus','emphasize'].includes(m.action))throw Error('Charts need data reveals or emphasis, not unrelated travel');
  if(m.quote&&!scene.words?.length)throw Error('Word timestamps are unavailable; use an empty quote for the visible layer entrance, or hold the picture.');
  const start=quoteTime(scene,m.quote,{start:Math.max(layer.start,scene.start),end:Math.min(scene.end,layer.end)});if(start>=Math.min(scene.end,layer.end)-.1)throw Error('Animation cue is outside the visible layer');
  return {targetId:layer.id,action:m.action,quote:String(m.quote||'').slice(0,160),direction:m.direction,intensity:m.intensity,duration:m.duration,start,end:Math.min(start+m.duration,layer.end,scene.end)};
 });
 const moving=moments.filter(m=>['drift','emphasize','orbit','focus','trail'].includes(m.action));
 if(moving.some((a,i)=>moving.slice(i+1).some(b=>a.targetId===b.targetId&&a.start<b.end&&b.start<a.end)))throw Error('Conflicting movements overlap on one subject');
 return {sceneId:scene.id,purpose:String(beat.purpose||'').slice(0,600),moments};
}
export function applyLocalAnimations(project){
 if(!project.animationPlan)return project;
 if(/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||''))return {...project,animationPlan:{...project.animationPlan,suppressed:'No-motion instructions: no new animation applied.'}};
 return {...project,scenes:project.scenes.map(scene=>{
  const beat=project.animationPlan.beats.find(b=>b.sceneId===scene.id);if(!beat)return scene;
  const layers=(scene.layers||[]).filter(l=>!l.id.startsWith(scene.id+'-animator-')).map(l=>({...l,keyframes:l.keyframes?.map(k=>({...k}))}));
  const baseline={...scene,layers};let validated;try{validated=validateAnimationBeat(baseline,beat);}catch{return scene;}const signature=JSON.stringify(validated);if(scene.localAnimationSignature===signature)return scene;
  for(const [index,m] of validated.moments.entries()){
   const l=layers.find(l=>l.id===m.targetId);const x=propertyAt(l,'x',m.start),y=propertyAt(l,'y',m.start),scale=propertyAt(l,'scale',m.start),rotation=propertyAt(l,'rotation',m.start,0),duration=m.end-m.start;
   const points=[],distance=m.intensity*.4,sign=['right','down'].includes(m.direction)?1:-1;
   const xy=(dx,dy)=>({x:Math.max(0,Math.min(1-l.width,x+dx)),y:Math.max(0,Math.min(.88-l.height,y+dy))});
   if(m.action==='enter'){l.animation='slide-in-out';l.animationStart=m.start;l.direction=m.direction;l.animationAmount=m.intensity;l.entranceDuration=Math.min(1,duration);}
   else if(m.action==='chart-reveal'){l.entranceDuration=Math.min(2,duration);l.animationStart=m.start;l.animation='mask-reveal';}
   else if(m.action==='orbit'){for(let i=0;i<=4;i++){const theta=i*Math.PI/2;points.push({time:m.start+duration*i/4,...xy(Math.sin(theta)*distance,(Math.cos(theta)-1)*distance*.5),scale,rotation:rotation+Math.sin(theta)*4});}}
   else if(m.action==='emphasize'||m.action==='focus'){points.push({time:m.start,x,y,scale,rotation},{time:m.start+duration*.45,x,y,scale:Math.min(scale*(1+m.intensity),1/Math.max(l.width,l.height)),rotation},{time:m.end,x,y,scale,rotation});}
   else {points.push({time:m.start,x,y,scale,rotation},{time:m.start+duration*.5,...xy(['left','right'].includes(m.direction)?sign*distance:0,['up','down'].includes(m.direction)?sign*distance:0),scale,rotation},{time:m.end,x,y,scale,rotation});}
   if(points.length){l.animation='fade';l.float=false;l.keyframes=[...(l.keyframes||[]).filter(k=>k.time<m.start||k.time>m.end),...points].sort((a,b)=>a.time-b.time);l.easing='smooth';}
   if(m.action==='trail')layers.push({id:scene.id+'-animator-'+index,type:'svg',role:'editorial-effect',x:l.x,y:l.y,width:l.width,height:l.height,z:Math.max(1,l.z-1),start:m.start,end:m.end,enter:'fade',exit:'fade',animation:'mask-reveal',animationAmount:.05,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><path d="M60 450 Q180 100 480 160" fill="none" stroke="#8affcb" stroke-opacity=".4" stroke-width="9" stroke-dasharray="18 12"/></svg>'});
  }
  return {...scene,layers,localAnimationApplied:true,localAnimationSignature:signature};
 })};
}
export function scheduleAnimationBeat(scene,beat,adjustments=[]){
 if(!Array.isArray(beat?.moments)||beat.moments.length>4)return validateAnimationBeat(scene,beat);
 const kept=[],moving=[];
 for(const m of beat.moments){const cue=validateAnimationBeat(scene,{...beat,moments:[m]}).moments[0];
  if(['drift','emphasize','orbit','focus','trail'].includes(cue.action)){
   if(moving.some(a=>a.targetId===cue.targetId&&a.start<cue.end&&cue.start<a.end)){adjustments.push(scene.id+': removed overlapping '+cue.action+' on '+cue.targetId+'; retained its first explanatory movement');continue;}
   moving.push(cue);
  }kept.push(m);
 }
 return validateAnimationBeat(scene,{...beat,moments:kept});
}
export async function planLocalAnimations(project,state,profile,progress=()=>{},fetchImpl=fetch){
 const endpoint=new URL(state.settings.url);if(state.settings.provider==='hosted'||!['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname))throw Error('Local animator requires a local model endpoint');
 const brief=retentionBrief(project,profile),report={local:true,model:state.models.reasoning?.name,basis:brief,overview:'',beats:[],warnings:[],adjustments:[]};
 if(!state.models.reasoning)throw Error('Install or select a local reasoning model for the animator');
 // Whole-video context is supplied to each bounded batch, including hook, payoff and historical risk windows.
 for(let offset=0;offset<project.scenes.length;offset+=3){
  const batch=project.scenes.slice(offset,offset+3);progress({stage:`Locally planning retention and animation ${offset+1}–${Math.min(offset+3,project.scenes.length)}/${project.scenes.length}`});
  const momentSchema={type:'object',required:['targetId','action','quote','direction','duration','intensity'],properties:{targetId:{type:'string'},action:{enum:actions},quote:{type:'string'},direction:{enum:['left','right','up','down']},duration:{type:'number',minimum:.2,maximum:3},intensity:{type:'number',minimum:.01,maximum:.12}}};
  const sceneSchema=s=>{const alternatives=['subject','chart'].map(role=>{const ids=(s.layers||[]).filter(l=>editableAnimationTarget(l)&&l.role===role).map(l=>l.id);return ids.length?{...momentSchema,properties:{...momentSchema.properties,targetId:{enum:ids},action:{enum:role==='chart'?['chart-reveal','focus','emphasize']:actions.filter(a=>a!=='chart-reveal')},...(!s.words?.length?{quote:{enum:['']}}:{})}}:null;}).filter(Boolean);return {type:'object',required:['sceneId','purpose','moments'],properties:{sceneId:{enum:[s.id]},purpose:{type:'string'},moments:{type:'array',maxItems:alternatives.length?4:0,items:alternatives.length?{anyOf:alternatives}:momentSchema}}};};
  const beatSchema={anyOf:batch.map(sceneSchema)};
  try{
   const result=await modelChat(state,state.models.reasoning,[{role:'system',content:'You are a local animation director and video editor. Follow sentence importance: emphasize the supplied key subjects, actions, comparisons and evidence. Keep connecting speech on the established visual. Use the supplied YouTube format rules. Do not introduce unrelated visual changes or animate each word. Plan the whole video’s visual narrative, hook, explanation, payoff and pacing. Viewer statistics are historical only: NEVER invent predicted retention percentages, guarantee improvement, or call heuristics measured data. Retention dips suggest where a relevant visual explanation might help, not where to add random movement. Keep narration order and timing intact. For every scene in this batch return purpose and up to 4 animation moments, targeting exact editable layer IDs. Cues quote exact narration text or use empty quote for an entrance. When word timestamps are unavailable, use empty quote to cue the visible layer entrance; do not claim exact spoken-word timing. Actions: enter,drift,emphasize,orbit,focus,chart-reveal,trail. Use chart-reveal only for charts. Movement intensity .01–.12, duration .2–3 seconds, direction left/right/up/down. Animate the actual supplied subjects and diagrams; no unrelated characters or invented media. Respect no-motion instructions. Maintain one dominant motion per subject; use deliberate explanatory sequences rather than random pulses. Read each scene’s shot purpose and background context; use the same visual grammar across the video. Return overview and beats for all batch scene IDs exactly.'},{role:'user',content:JSON.stringify({instructions:project.editingInstructions,referenceActivity:referenceActivityBrief(),youtubeStrategy:project.youtubeStrategy?{rules:project.youtubeStrategy.rules,recommendationBasis:project.youtubeStrategy.recommendationBasis,sentences:project.youtubeStrategy.sentences.filter(s=>batch.some(b=>b.id===s.sceneId))}:undefined,attentionStrategy:project.attentionPlan?{strategy:project.attentionPlan.strategy,targetInterval:2,basis:project.attentionPlan.basis,beats:project.attentionPlan.beats.filter(b=>batch.some(s=>s.id===b.sceneId))}:undefined,videoMode:videoMode(project),retention:brief,wholeVideo:project.scenes.map(s=>({id:s.id,start:s.start,end:s.end,text:s.text})),batch:batch.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end,shotPurpose:s.shotPurpose,backgroundConcept:s.backgroundConcept,timing:s.words?.length?'spoken-word timestamps':'scene timing only; use empty entrance quote',words:s.words,layers:(s.layers||[]).filter(l=>editableAnimationTarget(l)).map(l=>({id:l.id,type:l.type,role:l.role,start:l.start,end:l.end,subject:project.media.find(m=>m.id===l.mediaId)?.name}))}))})}],{fetchImpl,stage:'local-animation-retention',format:{type:'object',required:['overview','beats'],properties:{overview:{type:'string'},beats:{type:'array',items:beatSchema}}}});
   if(!Array.isArray(result.beats)||result.beats.length!==batch.length||new Set(result.beats.map(b=>b.sceneId)).size!==batch.length)throw Error('Incomplete video animation plan');
   report.overview=report.overview||String(result.overview||'').slice(0,3000);
   const batchEvent=state.inferenceEvents?.at(-1);
   for(const s of batch)try{report.beats.push(scheduleAnimationBeat(s,result.beats.find(b=>b.sceneId===s.id),report.adjustments));}catch(e){
    if(batchEvent){batchEvent.accepted=false;batchEvent.reason=e.message;}
    progress({stage:'Correcting conflicting or unrelated animation: '+s.id});
    try{
     const repaired=await modelChat(state,state.models.reasoning,[{role:'system',content:'Repair this animation beat. Use exact editable layer IDs. Charts allow only chart-reveal,focus,emphasize; never orbit or move data charts around. Do not overlap moving cues on the same target. Prefer one deliberate subject motion and one chart reveal. Cues must quote exact narration or be empty for the entrance. Duration .2–3, intensity .01–.12, direction left/right/up/down. Return overview and beats containing exactly this scene. Preserve narration, shot purpose and user instructions.'},{role:'user',content:JSON.stringify({instructions:project.editingInstructions,scene:{id:s.id,text:s.text,start:s.start,end:s.end,words:s.words,layers:(s.layers||[]).filter(l=>editableAnimationTarget(l)).map(l=>({id:l.id,type:l.type,role:l.role,start:l.start,end:l.end}))},rejected:result.beats.find(b=>b.sceneId===s.id),error:e.message})}],{fetchImpl,stage:'local-animation-correction',format:{type:'object',required:['overview','beats'],properties:{overview:{type:'string'},beats:{type:'array',minItems:1,maxItems:1,items:sceneSchema(s)}}}});
     if(repaired.beats?.length!==1)throw Error('Incomplete animation correction');report.beats.push(scheduleAnimationBeat(s,repaired.beats[0],report.adjustments));
    }catch(error){if(state.signal.aborted)throw error;report.warnings.push(s.id+': '+error.message);const last=state.inferenceEvents?.at(-1);if(last){last.accepted=false;last.reason=error.message;}}
   }
  }catch(e){if(state.signal.aborted)throw e;report.warnings.push(e.message);}
 }
 state.limitations.push(...report.warnings);report.inferenceEvents=(state.inferenceEvents||[]).filter(e=>e.stage.startsWith('local-animation'));return applyLocalAnimations({...project,animationPlan:report,...(project.processingReport?{processingReport:{...project.processingReport,inferenceEvents:state.inferenceEvents,limitations:state.limitations}}:{})});
}
