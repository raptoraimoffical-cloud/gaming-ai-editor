import crypto from 'node:crypto';
import {validateProject} from './planner.mjs';
import {recordRevision,applyOperations} from './revisions.mjs';
import {clipLayer} from './clip-layer.mjs';
import {propertyAt} from './layer-motion.mjs';
import {mergeRanges} from './layer-visibility.mjs';
import {sameAudio} from './audio-routing.mjs';

const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const motionKeys=['x','y','width','height','scale','scaleX','scaleY','rotation'];
function claim(l){l.manual=true;l.instructionLocked=true;for(const k of ['engagementCoverage','cinematicDepthOverride','cinematicDecoration','cinematicActivation','autoMoveEffect','engagementEffect','referenceDecoration','pixelEffectAuto','natureMint','creativeAction','actorPerformance','storyShot','actionMovie','layeredActivity','hookVisual','sourceMoveCard','sourceMoveset','narrationExpression'])delete l[k];return l;}
function syncSources(scene,before,after){
 for(const key of Object.keys(scene).filter(k=>k.endsWith('SourceLayers')&&Array.isArray(scene[k]))){
  scene[key]=scene[key].flatMap(l=>l.id===before.id?(after?[structuredClone(after)]:[]):[l]);
  if(before.actorSourceId)for(const l of scene[key])if(l.id===before.actorSourceId)l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),{start:before.start,end:before.end}]);
 }
}
const asset=(p,id)=>{const m=p.media.find(m=>m.id===id);if(!m)throw Error('Choose an existing library asset');return m;};
function timing(p,start,end){if(!finite(start,0,p.duration)||!finite(end,0,p.duration)||end-start<1/30)throw Error('Keep the clip inside the video with at least one frame');}
function soundAsset(p,id){const m=asset(p,id);if(m.kind!=='audio'||sameAudio(m,asset(p,p.voiceId)))throw Error('Choose a sound separate from narration');if(m.assetRole==='sound-effect')return m;const alias={...m,id:'manual-sound-'+m.id,assetRole:'sound-effect'},existing=p.media.find(a=>a.id===alias.id);if(existing)return existing;p.media.push(alias);return alias;}
export function manualEdit(project,command){
 validateProject(project);const next=structuredClone(project),c=command||{},scene=next.scenes.find(s=>s.id===c.sceneId),l=scene?.layers?.find(l=>l.id===c.layerId);let label='Manual edit';
 if(['add-visual','add-text'].includes(c.type)){
  timing(next,c.start,c.end);const m=c.type==='add-visual'?asset(next,c.mediaId):undefined;
  if(m&&!['image','pokemon','video'].includes(m.kind))throw Error('An overlay needs an image, GIF or video');
  if(!m&&(typeof c.text!=='string'||!c.text.trim()||c.text.length>2000))throw Error('Enter overlay text');
  const group='manual-'+crypto.randomUUID();
  for(const s of next.scenes.filter(s=>s.start<c.end&&s.end>c.start)){s.layers??=[];const layer={id:group+'-'+s.id,manualClipId:group,type:m?.kind==='video'?'video':m?'image':'text',role:'supporting-image',manual:true,instructionLocked:true,...(m?{mediaId:m.id}:{text:c.text,color:'#ffffff',fontSize:60}),start:Math.max(s.start,c.start),end:Math.min(s.end,c.end),animationStart:c.start,animationEnd:c.end,x:.15,y:.18,width:.70,height:m?.kind==='video'?.42:m?.kind==='image'?.36:.08,z:Math.min(950,Math.max(50,...s.layers.map(l=>l.z+1))),fit:'contain',animation:'fade',entranceDuration:.25,exit:'fade',exitDuration:.25};s.layers.push(layer);}
  label=m?'Added overlay: '+m.name:'Added text overlay';
 }else if(c.type==='cinematic'){
  if(typeof c.enabled!=='boolean')throw Error('Choose whether to enable the cinematic finish');next.cinematicMotion=c.enabled;label=c.enabled?'Enabled cinematic finish':'Disabled cinematic finish';
 }else if(c.type==='audio'){
  editAudio(next,c);label=(c.kind==='music'?'Music':c.kind==='voice'?'Narration':'Sound effect')+' edited';
 }else if(c.type==='captions'){
  if(!scene)throw Error('Select a caption clip');scene.captionStyle={...scene.captionStyle,enabled:c.enabled===true};label=c.enabled?'Restored scene captions':'Deleted scene captions';
 }else{
  if(!scene||!l)throw Error('Select an object to edit');const before=structuredClone(l);
  if(c.type==='properties'||c.type==='text'){
   const edited=applyOperations(next,{operations:[{...c.values,type:c.type,sceneIds:[scene.id],layerIds:[l.id]}]}).project,after=edited.scenes.find(s=>s.id===scene.id);scene.layers=after.layers;const updated=claim(scene.layers.find(x=>x.id===l.id));syncSources(scene,before,updated);label='Updated selected object';
  }else if(c.type==='delete'){
   const ids=new Set([l.id]);for(let changed=true;changed;){changed=false;for(const child of scene.layers)if((ids.has(child.parentId)||ids.has(child.attachment?.targetId)||ids.has(child.effectOwnerId)||ids.has(child.actorSourceId))&&!ids.has(child.id)){ids.add(child.id);changed=true;}}
   scene.deletedLayerIds=[...new Set([...(scene.deletedLayerIds||[]),...ids])];
   for(const old of scene.layers.filter(x=>ids.has(x.id)))syncSources(scene,old,undefined);scene.layers=scene.layers.filter(x=>!ids.has(x.id));label='Deleted selected object';
  }else if(c.type==='duplicate'){
   const copy=claim({...structuredClone(l),id:'manual-'+crypto.randomUUID(),x:l.x+.025,y:l.y+.015});delete copy.manualClipId;copy.actorSourceId=undefined;copy.keyframes=copy.keyframes?.map(k=>({...k,...(k.x!==undefined?{x:k.x+.025}:{}),...(k.y!==undefined?{y:k.y+.015}:{})}));scene.layers.push(copy);label='Duplicated selected object';
  }else if(c.type==='split'){
   if(!finite(c.time,l.start+1/30,l.end-1/30))throw Error('Move the playhead inside the selected clip to split');
   const first=claim(clipLayer(l,l.start,c.time)),second=claim({...clipLayer(l,c.time,l.end),id:'manual-'+crypto.randomUUID()});scene.layers=scene.layers.flatMap(x=>x.id===l.id?[first,second]:[x]);syncSources(scene,before,first);label='Split clip at '+c.time.toFixed(2)+'s';
  }else if(c.type==='replace'){
   const m=asset(next,c.mediaId);if(!['image','pokemon','video'].includes(m.kind))throw Error('Choose a visual replacement');claim(l);l.type=m.kind==='video'?'video':'image';l.mediaId=m.id;for(const k of ['svg','text','setupGraphic','battleEffect','moveEffect','narrationEffect','effectResultMediaId'])delete l[k];syncSources(scene,before,l);label='Replaced selected object with '+m.name;
  }else if(c.type==='motion'){
   if(!['none','fade','slide-in-out','spring-pop','scale-reveal','smooth-zoom','emphasis'].includes(c.entrance)||!['none','fade','slide','scale'].includes(c.exit)||!finite(c.duration,.03,3))throw Error('Choose a supported animation and duration');
   claim(l);l.manualMotion=true;l.animation=c.entrance;l.enter='none';l.exit=c.exit;l.entranceDuration=c.duration;l.exitDuration=c.duration;l.animationStart=l.start;l.animationEnd=l.end;l.float=false;
   l.keyframes=(l.keyframes||[]).map(k=>Object.fromEntries(Object.entries(k).filter(([key])=>key!=='opacity'&&!(c.entrance==='none'&&motionKeys.includes(key))))).filter(k=>Object.keys(k).length>1);
   if(c.entrance==='none'){for(const key of motionKeys)if(!['width','height'].includes(key))l[key]=propertyAt(before,key,c.time??l.start);}
   syncSources(scene,before,l);label='Changed entrance and exit animation';
  }else if(c.type==='keyframe'||c.type==='remove-keyframe'){
   if(!finite(c.time,l.start,l.end))throw Error('Keyframes must be inside the clip');claim(l);l.manualMotion=true;l.easing='smooth';const at=Math.max(l.start,Math.min(l.end,Math.round(c.time*30)/30));
   l.keyframes=(l.keyframes||[]).filter(k=>Math.abs(k.time-at)>1/60);
   if(c.type==='keyframe'){const values=c.values||{};if(!Object.keys(values).length||Object.keys(values).some(k=>!['x','y','scale','rotation','opacity'].includes(k))||Object.values(values).some(v=>!Number.isFinite(v)))throw Error('Enter position, scale, rotation or opacity values');if(values.scale!==undefined&&!finite(values.scale,.1,4)||values.opacity!==undefined&&!finite(values.opacity,0,1)||values.rotation!==undefined&&!finite(values.rotation,-360,360)||values.x!==undefined&&!finite(values.x,-.5,1.5)||values.y!==undefined&&!finite(values.y,-.5,1.5))throw Error('Keyframe values are out of range');
    if(!l.keyframes.length&&at>l.start)l.keyframes.push({time:l.start,...Object.fromEntries(Object.keys(values).map(k=>[k,propertyAt(before,k,l.start)]))});l.keyframes.push({time:at,...values});}
   l.keyframes.sort((a,b)=>a.time-b.time);syncSources(scene,before,l);label=c.type==='keyframe'?'Saved animation keyframe':'Removed animation keyframe';
  }else throw Error('Unsupported manual edit');
 }
 validateProject(next);if(JSON.stringify([project.scenes,project.soundEffects,project.musicId,project.musicClip,project.musicVolume,project.narrationMuted,project.cinematicMotion,project.musicAutoDisabled,project.automaticMusicReport])===JSON.stringify([next.scenes,next.soundEffects,next.musicId,next.musicClip,next.musicVolume,next.narrationMuted,next.cinematicMotion,next.musicAutoDisabled,next.automaticMusicReport]))return project;return recordRevision(project,next,label,[{type:'manual-edit',command:c}],label,'Manual editor');
}
function editAudio(p,c){
 const v=c.values||{};
 if(c.kind==='voice'){p.narrationMuted=!!v.remove;return;}
 if(c.kind==='music'){
  if(v.remove){delete p.musicId;delete p.musicClip;p.musicAutoDisabled=true;return;}
  const m=asset(p,v.mediaId||p.musicId),voice=asset(p,p.voiceId);if(m.kind!=='audio'||sameAudio(m,voice)||m.assetRole==='narration')throw Error('Choose music separate from the narration');
  const old=p.musicClip||{},clip={start:old.start??0,end:old.end??p.duration,sourceOffset:p.musicId===m.id?old.sourceOffset??0:0,fadeIn:old.fadeIn??.4,fadeOut:old.fadeOut??.6,loop:old.loop??true,duck:old.duck??true,...v};delete clip.mediaId;delete clip.volume;timing(p,clip.start,clip.end);
  if(!finite(clip.sourceOffset,0,Math.max(0,m.duration-1/30))||!finite(clip.fadeIn,0,10)||!finite(clip.fadeOut,0,10)||typeof clip.loop!=='boolean'||typeof clip.duck!=='boolean'||v.volume!==undefined&&!finite(v.volume,0,1))throw Error('Invalid music offset, fades or volume');
  p.musicId=m.id;p.musicClip=clip;p.musicAutoDisabled=false;delete p.automaticMusicReport;if(v.volume!==undefined)p.musicVolume=v.volume;
 }else if(c.kind==='sfx'){
  p.soundEffects??=[];if(c.index===undefined){const m=soundAsset(p,v.mediaId),start=v.start??0,end=Math.min(p.duration,start+m.duration);timing(p,start,end);p.soundEffects.push({mediaId:m.id,start,end,volume:.15,auto:false,sourceOffset:0});}
  else{const fx=p.soundEffects[c.index];if(!fx)throw Error('Sound clip no longer exists');if(v.remove){p.soundEffects.splice(c.index,1);return;}const previous=asset(p,fx.mediaId),m=soundAsset(p,v.mediaId||fx.mediaId);if(!sameAudio(previous,m)&&v.sourceOffset===undefined)fx.sourceOffset=0;Object.assign(fx,v,{mediaId:m.id,auto:false});delete fx.remove;if(!finite(fx.volume,0,1)||!finite(fx.sourceOffset??0,0,Math.max(0,m.duration-1/30)))throw Error('Invalid sound volume or offset');fx.end=Math.min(fx.end??p.duration,fx.start+m.duration-(fx.sourceOffset??0),p.duration);timing(p,fx.start,fx.end);}
 }else throw Error('Select music or a sound effect');
}
