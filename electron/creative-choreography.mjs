import {placementFor} from './layer-motion.mjs';
import {propertyAt} from './layer-motion.mjs';
import {visibleRanges,mergeRanges} from './layer-visibility.mjs';

export function pictureStage(prop,media,scene,project,start,end,width,height,fixedBox){
 const active=(scene.layers||[]).filter(l=>visibleRanges(l,start,Math.min(end,start+.1),scene.layers).length),actors=active.filter(l=>l.role==='subject'&&!l.manual&&!l.instructionLocked&&!l.attachment&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction),lead=actors.sort((a,b)=>b.width*b.height-a.width*a.height)[0];
 const protectedActors=active.filter(l=>['subject','narrated-action'].includes(l.role)&&l.mediaId&&(l.manual||l.instructionLocked||l.actionMovie||l.actorPerformance||l.creativeAction));
 let mode=prop.framing||'side';if(media?.assetRole==='narration-prop')mode='side';else if(protectedActors.length&&!lead)mode='evidence';else if(!lead||lead.mediaId===media.id)mode='focus';
 const aspect=(media?.width||1)/(media?.height||1),caption={...project.captionStyle,...scene.captionStyle},bottom=caption.enabled===false?.87:Math.min(.77,1-(caption.bottom??.13)-Math.max(.06,((caption.fontSize??46)*2.8+20)/height)-.035);
 let box=mode==='focus'?{x:.07,y:.13,width:.86,height:Math.min(.50,bottom-.15)}:mode==='evidence'||aspect>1.6?{x:.07,y:.10,width:.86,height:Math.min(.29,bottom-.35)}:{x:.53,y:.19,width:.42,height:Math.min(.36,bottom-.22)};
 if(media?.assetRole==='narration-prop')box=stageProp({...prop,size:Math.min(.25,prop.size)},media,width,height);
 if(protectedActors.length&&!lead){const top=Math.min(...protectedActors.map(l=>propertyAt(l,'y',start)));box={x:.07,y:.045,width:.86,height:Math.max(.08,Math.min(.22,top-.065))};}
 if(fixedBox){box={x:fixedBox.x,y:fixedBox.y,width:fixedBox.width,height:fixedBox.height};mode=fixedBox.storyFraming;}
 // Replace previous evidence in the same lane with a short dissolve instead
 // of stacking several posters at identical coordinates.
 for(const l of active.filter(l=>l.role==='creative-stage-prop'&&l.end>start))if(l.x<box.x+box.width&&l.x+l.width>box.x&&l.y<box.y+box.height&&l.y+l.height>box.y){l.end=Math.min(l.end,start+.12);l.exit='fade';l.exitDuration=.12;}
 for(const l of active.filter(l=>l.role==='game-logo'&&!l.manual&&!l.instructionLocked))l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),{start,end}]);
 if(lead&&media?.assetRole!=='narration-prop'&&!fixedBox?.keepLead){
  if(mode==='focus'){lead.excludedRanges=mergeRanges([...(lead.excludedRanges||[]),{start,end}]);}
  else{
   const target=mode==='evidence'||aspect>1.6?{x:.29,y:.43,width:.42,height:Math.max(.15,bottom-.45)}:{x:.055,y:.22,width:.40,height:Math.min(.37,bottom-.24)};
   const before=Object.fromEntries(['x','y','width','height','scale'].map(k=>[k,propertyAt(lead,k,start)])),after=Object.fromEntries(['x','y','width','height','scale'].map(k=>[k,propertyAt(lead,k,end)])),arrive=Math.min(.22,(end-start)*.15);
   lead.keyframes=[...(lead.keyframes||[]).filter(k=>k.time<start||k.time>end),{time:start,...before},{time:start+arrive,...target,scale:1},{time:end-arrive,...target,scale:1},{time:end,...after}].sort((a,b)=>a.time-b.time);lead.easing='smooth';
  }
 }
 return {...box,z:60,shadow:media?.transparent===true,storyFraming:mode};
}

export function stageProp(prop,media,width,height){
 const aspect=(media?.width||1)/(media?.height||1),pixels=Math.min(prop.size*width,.32*height);
 const w=(aspect>=1?pixels:pixels*aspect)/width,h=(aspect>=1?pixels/aspect:pixels)/height;
 return {width:w,height:h,x:Math.max(.03,Math.min(.97-w,prop.position.x)),y:Math.max(.04,Math.min(.77-h,prop.position.y))};
}

// A handoff has three visible phases: held, travelling, held by the recipient.
// Measure both attachments so the original sourced picture never jumps.
export function handoffProp(layer,prop,track,{scene,media,actors,start,end,tempo,width,height}){
 const at=start+track.handoffAt*tempo,arrival=Math.min(end-1/30,at+.38*tempo),recipient=actors.get(track.handoffTo);
 if(!recipient||arrival-at<.1)return undefined;
 const old=placementFor(layer,scene.layers,media,at,width,height);
 const held={...layer,id:layer.id+'-received',start:arrival,end,attachment:{targetId:recipient.id,anchor:track.handoffAnchor||'hand',x:.5,y:track.handoffAnchor==='head'?.2:.6,size:prop.size,autoAnchor:true,contentBounds:true},keyframes:undefined,animation:'none',rotation:0,scale:1};
 const target=placementFor(held,[...scene.layers,held],media,arrival,width,height);
 const w=old.width*old.motion.scale,h=old.height*old.motion.scale;
 if(w<=0||h<=0||old.motion.opacity<.05||target.motion.opacity<.05)return undefined;
 const from={x:old.motion.x+old.motion.dx+(old.width-w)/2,y:old.motion.y+old.motion.dy+(old.height-h)/2,scale:1,rotation:old.motion.rotation,opacity:1};
 const to={x:target.motion.x+target.motion.dx+target.width/2-w/2,y:target.motion.y+target.motion.dy+target.height/2-h/2,scale:target.width*target.motion.scale/w,rotation:target.motion.rotation,opacity:1};
 const travelling={...layer,id:layer.id+'-handoff',start:at,end:arrival,attachment:undefined,x:from.x,y:from.y,width:w,height:h,scale:1,animation:'none',exit:'none',easing:'smooth',keyframes:[{time:at,...from},{time:(at+arrival)/2,x:(from.x+to.x)/2,y:(from.y+to.y)/2-.025,scale:(1+to.scale)/2,rotation:(from.rotation+to.rotation)/2,opacity:1},{time:arrival,...to}]};
 layer.end=at;scene.layers.push(travelling,held);return {at,arrival};
}
export function pairPose(layer,partner,scene,project,start,height){
 const left=propertyAt(layer,'x',start)+layer.width/2<propertyAt(partner,'x',start)+partner.width/2;
 const caption={...project.captionStyle,...scene.captionStyle},bottom=caption.enabled===false?.90:1-(caption.bottom??.13)-Math.max(.06,((caption.fontSize??46)*2.8+20)/height)-.03;
 const evidence=(scene.layers||[]).filter(l=>l.sourceMoveCard&&l.role!=='type-icon'&&l.start<=start&&l.end>start),top=Math.max(.20,...evidence.map(l=>l.y+l.height+.03)),room=Math.max(.12,bottom-top);
 const scale=Math.min(propertyAt(layer,'scale',start),.40/layer.width,Math.min(.30,room)/layer.height);
 return {x:(left?.25:.75)-layer.width/2,y:top+room/2-layer.height/2,scale,rotation:0};
}
