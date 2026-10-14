import {noMotion,projectGame} from './game-presentation.mjs';
import {sceneGame} from './game-selection.mjs';
import {placementFor} from './layer-motion.mjs';
import {COMBAT_PHASES} from './combat-motion.mjs';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*(3-2*t);
const actors=new Set(['subject','narrated-action']);
const fixed=new Set(['mechanic-card','move-callout','type-icon','chart','gameplay','game-logo','reaction-gif','supporting-image','story-picture','creative-stage-prop']);
const quiet=p=>p.cinematicMotion===false||noMotion(p)||p.freezePokemonMotion||/\b(?:no effects|without effects|minimal effects|documentary|no camera motion|static camera)\b|\brestrained\s+(?:motion|animation|camera)\b/i.test(p.editingInstructions||'');
export const cinematicEnabled=p=>!quiet(p);
const visible=(l,t)=>t>=l.start&&t<l.end&&!(l.excludedRanges||[]).some(r=>t>=r.start&&t<r.end);

// Source cards stay in screen space. Fighters, attached props, projectiles and
// contact effects share one world transform, so a camera cannot separate a hit.
export function cinematicDepth(l,layers,seen=[]){
 if(Number.isFinite(l.cinematicDepthOverride))return clamp(l.cinematicDepthOverride,0,1.15);
 if(l.attachment){if(seen.includes(l.id))return 0;const owner=layers.find(p=>p.id===l.attachment.targetId);return owner?cinematicDepth(owner,layers,[...seen,l.id]):0;}
 if(l.instructionLocked||l.manualFraming||l.manual&&!l.autoItem||l.parentId||fixed.has(l.role)||l.setupGraphic)return 0;
 if(l.role==='background')return .22;
 if(['environment-depth','editorial-depth'].includes(l.role))return .55;
 if(l.battleEffect||l.moveEffect||actors.has(l.role)||l.role==='creative-prop'||l.role==='item')return 1;
 return 0;
}
export function clearCinematicScenes(project){
 const next=structuredClone(project);delete next.cinematicReport;
 for(const s of next.scenes){delete s.cinematicStage;s.layers=(s.layers||[]).filter(l=>!l.cinematicDecoration||l.manual||l.instructionLocked);for(const l of s.layers)if(!l.manual&&!l.instructionLocked||l.autoItem)delete l.cinematicActivation;}
 return next;
}
function weatherCues(scene,project){
 const cues=[];
 for(const [i,w] of (scene.words||[]).entries()){
  if(project.shortMechanics?.cues.some(c=>c.sceneId===scene.id&&c.name==='make-it-rain'&&i>=c.wordIndex&&i<c.wordIndex+(c.wordCount||3)))continue;
  const token=(w.captionText||w.text).toLowerCase().replace(/[^a-z]/g,''),before=scene.words.slice(Math.max(0,i-3),i).map(w=>w.text).join(' ').replace(/'/g,'');
  const kind=/^(rain|raining|rainy)$/.test(token)?'rain':/^(snow|snowing|hail|blizzard)$/.test(token)?'snow':/^(sunlight|sunshine|sunny|drought)$/.test(token)?'sun':/^(wind|windy|tailwind)$/.test(token)?'wind':undefined;
  if(!kind||/\b(?:not|no|without|never|isnt|doesnt|cannot)\b/i.test(before))continue;
  if(cues.at(-1)?.kind===kind)continue;
  cues.push({kind,start:w.start,end:scene.end,quote:w.text});
 }
 for(let i=0;i<cues.length-1;i++)cues[i].end=cues[i+1].start;
 return cues;
}
export function applyCinematicScenes(project){
 const next=clearCinematicScenes(project),report={version:1,scenes:[],cameraBeats:0,activations:0,weather:[],warnings:[],captionsChanged:false};
 if(quiet(next))return next;
 for(const [i,s] of next.scenes.entries()){
  if(s.manualTemplate||sceneGame(next,s,projectGame(next))!=='pokemon'||!(s.layers||[]).some(l=>actors.has(l.role)))continue;
  const protectedScene=s.layers.some(l=>l.role==='gameplay');if(protectedScene)continue;
  const camera=[];
  for(const e of next.sceneBlueprintReport?.soundBeats||[]){if(e.start<s.start||e.start>=s.end||!['impact','stat-boost'].includes(e.cue))continue;const mediaIds=s.layers.filter(l=>l.blueprintVisual&&actors.has(l.role)&&l.start<=e.start&&l.end>e.start).map(l=>l.mediaId);if(mediaIds.length)camera.push({kind:'attack',start:Math.max(s.start,e.start-.35),end:Math.min(s.end,e.start+.45),contact:e.start,mediaIds,impact:e.cue==='impact'?.65:0,color:'#ffd887'});}
  for(const p of next.actionMovieReport?.plans||[]){
   if(p.end<=s.start||p.start>=s.end)continue;
   camera.push({kind:'attack',start:p.start,end:p.end,contact:p.start+p.duration*COMBAT_PHASES.contact,mediaIds:[...p.attackerIds,p.defenderId],impact:p.outcome==='ineffective'?0:p.outcome==='resisted'?.3:1,color:p.color||'#e6d4a3'});
  }
  for(const e of next.creativeActionReport?.events||[]){
   if(e.sceneId!==s.id||!['dash','dodge','chase','swap-order','power-up','rotate','prop-launch','handoff'].includes(e.kind)||camera.some(c=>c.start<e.end&&c.end>e.start))continue;
   const ids=s.layers.filter(l=>l.creativeAction&&actors.has(l.role)&&l.start<e.end&&l.end>e.start).map(l=>l.mediaId);
   if(ids.length)camera.push({kind:e.kind,start:e.start,end:e.end,contact:e.contacts?.[0]??e.payoff,mediaIds:[...new Set(ids)],impact:e.contacts?.length?.55:0,color:'#d6efc3'});
  }
  const weather=weatherCues(s,next);
  for(const w of weather){const source=s.layers.find(l=>l.role==='ambient-source'&&l.start<=w.start+.02&&l.end>w.start&&next.media.some(m=>m.id===l.mediaId&&m.identity?.subject===w.kind&&(m.animationInfo?.animated||/\.gif$/i.test(m.path||''))));if(source){w.sourceLayerId=source.id;w.sourceMediaId=source.mediaId;w.sourceEnd=source.end;}}
  const prior=next.scenes[i-1],continuing=prior&&(prior.layers||[]).some(a=>actors.has(a.role)&&a.end>=s.start-.03&&s.layers.some(b=>actors.has(b.role)&&b.mediaId===a.mediaId&&b.start<=s.start+.03));
  // A continuing actor gets a match cut. A new cast gets a short camera settle,
  // without freezing an outgoing frame or re-fading the entire scene.
  if(s.autoTransition){delete s.transition;delete s.transitionDuration;delete s.autoTransition;}
  next.transitionSoundPlan=(next.transitionSoundPlan||[]).filter(c=>c.sceneId!==s.id);
  const transition=!continuing&&i>0&&!s.transition&&!/\b(?:hard cuts|no transitions|without transitions)\b/i.test(next.editingInstructions||'');
  if(transition)next.transitionSoundPlan.push({sceneId:s.id,start:s.start,cue:'whoosh',priority:9,reason:'Scene transition with coordinated camera settle'});
  const environment=next.media.find(m=>m.id===next.cinematicEnvironmentPlan?.[s.id]);
 if(environment&&!s.deletedLayerIds?.includes(s.id+'-cinematic-environment')&&!s.layers.some(l=>l.role==='background'&&(l.manual||l.manualFraming||l.instructionLocked))&&!['upload','generate'].includes(next.creationAssets?.backgroundMode)){
   // Overlay the source scenery instead of deleting the underlying timeline;
   // clearing/re-running this pass is reversible and does not duplicate art.
   s.layers.push({id:s.id+'-cinematic-environment',cinematicDecoration:true,type:environment.kind==='video'?'video':'image',role:'background',mediaId:environment.id,x:-.08,y:-.08,width:1.16,height:1.16,fit:'cover',z:1,start:s.start,end:s.end,animation:'none',exit:'none',easing:'smooth',keyframes:[{time:0,x:-.08,y:-.08},{time:next.duration,x:-.025,y:-.06}]});
  }
  const stage={version:1,camera,weather,transition:transition?'settle':undefined,transitionStart:s.start,ambient:true};s.cinematicStage=stage;
  for(const plane of ['depth','foreground']){const id=s.id+'-cinematic-'+plane;if(!s.deletedLayerIds?.includes(id)&&!s.layers.some(l=>l.id===id))s.layers.push({id,type:'group',role:plane==='depth'?'environment-depth':'environment-atmosphere',cinematicDecoration:true,cinematicAtmosphere:plane,x:0,y:0,width:1,height:1,z:plane==='depth'?2:55,start:s.start,end:s.end,animation:'none',exit:'none'});}
  for(const l of s.layers){
   const m=next.media.find(m=>m.id===l.mediaId),icon=m?.kind==='image'&&(l.role==='item'&&l.autoItem||['type-icon','ability-icon'].includes(l.role)&&!l.manual&&m.transparent);
   if(icon&&!l.manualMotion&&!l.instructionLocked&&!l.referenceContinuation){l.cinematicActivation={start:l.start,duration:Math.min(.55,(l.end-l.start)*.4),color:l.effectColor||'#ffeac0'};report.activations++;}
  }
  report.cameraBeats+=camera.length;report.weather.push(...weather.map(w=>({sceneId:s.id,...w})));report.scenes.push({sceneId:s.id,environmentId:environment?.id,continuing:!!continuing,cameraBeats:camera.length});
 }
 if(report.scenes.length&&!report.scenes.some(s=>s.environmentId))report.warnings.push('No sourced cinematic scenery was available; the existing game background remains.');
 next.cinematicReport=report;return next;
}
export function cinematicStageAt(scene,time){const stage=scene.cinematicStage;return stage?.segments?.filter(r=>time>=r.start&&time<r.end).at(-1)?.stage||stage;}
// Store independent stage windows for local patches. Camera phases keep their
// absolute authored clock instead of restarting when a window is clipped.
export function spliceCinematicStage(base,replacement,start,end){
 if(!base&&!replacement)return undefined;
 const plain=s=>{const n=structuredClone(s||{version:1,camera:[],weather:[],ambient:false});delete n.segments;return n;};
 const outside=(base?.segments||[]).flatMap(r=>r.end<=start||r.start>=end?[r]:[{...r,end:start},{...r,start:end}].filter(p=>p.end>p.start));
 const points=[...new Set([start,end,...(replacement?.segments||[]).flatMap(r=>[Math.max(start,r.start),Math.min(end,r.end)]).filter(t=>t>start&&t<end)])].sort((a,b)=>a-b),inside=[];
 for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];inside.push({start:a,end:b,stage:plain(cinematicStageAt({cinematicStage:replacement},(a+b)/2))});}
 return {...plain(base),segments:[...outside,...inside].sort((a,b)=>a.start-b.start)};
}
export function cameraAt(scene,project,time,width=1080,height=1920,fps=30){
 const rest={x:0,y:0,scale:1,rotation:0,light:0,color:'#fff',focusX:.5,focusY:.42};
 const stage=cinematicStageAt(scene,time);if(!stage||quiet(project))return rest;
 const e=stage.camera.find(c=>time>=c.start&&time<c.end);
 let result={...rest};
 if(e){
  const layers=(scene.layers||[]).filter(l=>actors.has(l.role)&&e.mediaIds.includes(l.mediaId)&&visible(l,time));
  if(layers.length){
   const boxes=layers.map(l=>placementFor(l,scene.layers,project.media,time,width,height,fps)),cx=boxes.reduce((sum,b)=>sum+b.motion.x+b.motion.dx+b.width/2,0)/boxes.length,cy=boxes.reduce((sum,b)=>sum+b.motion.y+b.motion.dy+b.height/2,0)/boxes.length;
   const p=clamp((time-e.start)/(e.end-e.start)),envelope=Math.sin(Math.PI*p)**2;
   const punch=Math.max(0,1-Math.abs(time-e.contact)/.11)*(e.impact||0),shake=punch*Math.sin((time-e.contact)*85);
   result={x:clamp((.5-cx)*.11*envelope,-.018,.018)+shake*.0025,y:clamp((.42-cy)*.09*envelope,-.012,.012)-shake*.0015,scale:1+.045*envelope,rotation:shake*.18,light:punch*.26,color:e.color,focusX:cx,focusY:cy};
  }
 }
 const transitionStart=stage.transitionStart??scene.start;
 if(stage.transition==='settle'&&time>=transitionStart&&time<transitionStart+.38){const settle=1-ease(clamp((time-transitionStart)/.38));result.scale+=settle*.028;result.y-=settle*.004;}
 return result;
}
export function cinematicTransform(camera,depth,width,height){return `translate(${camera.x*depth*width}px, ${camera.y*depth*height}px) rotate(${camera.rotation*depth}deg) scale(${1+(camera.scale-1)*depth})`;}
// A bounded, velocity-dependent shutter approximation on fast source artwork.
// It costs two placement samples, not extra image decodes or render passes.
export function shutterBlur(l,layers,media,time,width,height,fps=30){
 if(l.manualMotion||l.instructionLocked||l.attachment||!actors.has(l.role)||!l.actionMovie&&!l.creativeAction)return {x:0,y:0};
 const dt=1/(fps*2),a=placementFor(l,layers,media,time-dt,width,height,fps),b=placementFor(l,layers,media,time+dt,width,height,fps);
 return {x:clamp(Math.abs((b.motion.x+b.motion.dx)-(a.motion.x+a.motion.dx))*width*.3,0,2.8),y:clamp(Math.abs((b.motion.y+b.motion.dy)-(a.motion.y+a.motion.dy))*height*.3,0,2.8)};
}
export function activationAt(l,time){
 const a=l.cinematicActivation;if(!a||time<a.start||time>a.start+a.duration)return {x:0,y:0,rotation:0,scale:1,glow:0};
 const p=clamp((time-a.start)/Math.max(.01,a.duration)),arrive=1-(1-p)**3;
 return {x:(1-arrive)*.045,y:-(1-arrive)*.035,rotation:(1-arrive)*-135,scale:.5+arrive*.5,glow:Math.sin(p*Math.PI)*.65};
}
