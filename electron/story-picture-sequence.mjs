import {pictureStage} from './creative-choreography.mjs';
import {noMotion} from './game-presentation.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {propertyAt} from './layer-motion.mjs';
import {pictureIdentity} from './final-picture-layout.mjs';

// A narrated reveal owns an interval in the recording, not a transcript
// sentence. Split its layer for rendering without restarting the performance.
export function stageStoryPicture(project,{id,media,prop,start,end,tracks=[],sound='pop',revealStart=start,snapshotField='creativeActionSourceLayers'}){
 const delivered=[];let fixedBox=prop.geometry?{...prop.geometry,storyFraming:prop.framing||'side'}:undefined;
 for(const scene of project.scenes){
  const a=Math.max(start,scene.start),b=Math.min(end,scene.end);
  if(b-a<.01||scene.manualTemplate||scene.deletedLayerIds?.length)continue;
  const blocked=(scene.layers||[]).some(l=>(l.manual||l.instructionLocked)&&l.role==='gameplay'&&l.start<b&&l.end>a);
  if(blocked)continue;
  scene[snapshotField]??=structuredClone(scene.layers||[]);
  const identity=pictureIdentity(project,{mediaId:media.id}),existing=(scene.layers||[]).find(l=>l.role==='subject'&&pictureIdentity(project,l)===identity&&visibleRanges(l,a,b,scene.layers).some(r=>r.start<=a+.15&&r.end>=b-.12));
  if(existing){
   // A named character already staged in this shot is the picture. Give it
   // emphasis rather than putting another copy in an unrelated corner.
   if(!noMotion(project)&&!existing.manual&&!existing.instructionLocked&&!existing.actionMovie&&!existing.actorPerformance&&!existing.creativeAction){const scale=propertyAt(existing,'scale',a),merged=new Map();for(const k of [...(existing.keyframes||[]),{time:a,scale},{time:Math.min(b,a+.16),scale:scale*1.045},{time:Math.min(b,a+.4),scale}])merged.set(k.time,{...merged.get(k.time),...k});existing.keyframes=[...merged.values()].sort((x,y)=>x.time-y.time);existing.easing='smooth';}
   delivered.push({sceneId:scene.id,layerId:existing.id,start:a,end:b,reusedActor:true});continue;
  }
  const box=pictureStage(prop,media,scene,project,a,b,project.format==='horizontal'?1920:1080,project.format==='horizontal'?1080:1920,fixedBox);fixedBox??=box;
  const still=noMotion(project),frames=tracks.flatMap(t=>t.keyframes||[]).map(k=>({time:revealStart+k.at,x:box.x+(k.dx||0),y:box.y+(k.dy||0),scale:k.scale??1,opacity:k.opacity??1,rotation:k.rotation||0}));
  if(!frames.length)frames.push({time:revealStart,opacity:0,scale:.96},{time:Math.min(end,revealStart+.16),opacity:1,scale:1},{time:Math.max(revealStart+.16,end-.12),opacity:1,scale:1},{time:end,opacity:0,scale:1});
  const mechanic=media.moveCard?.verified&&/^(?:move|ability|type)-card$/.test(media.assetRole||''),kind=mechanic?(media.moveCard.kind||media.assetRole.replace(/-card$/,'')):undefined;
  const layer={id:id+'-'+scene.id,type:media.kind==='video'?'video':'image',loop:true,role:mechanic?(kind==='type'?'type-icon':'mechanic-card'):'creative-stage-prop',...(mechanic?{sourceMoveCard:true,sourceMechanicKind:kind}:{}),creativeAction:true,mediaId:media.id,start:a,end:b,animationStart:revealStart,animationEnd:end,...box,fit:'contain',animation:'none',exit:'none',silentEntrance:sound==='none'||a>revealStart+.001,referenceContinuation:a>revealStart+.001,storyPictureOrigin:id,...(!still&&frames.length?{keyframes:frames,easing:'smooth'}:{})};
  scene.layers.push(layer);delivered.push({sceneId:scene.id,layerId:layer.id,start:a,end:b});
 }
 return delivered;
}
