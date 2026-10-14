import {placementFor} from './layer-motion.mjs';
import {visibleRanges} from './layer-visibility.mjs';

const ignored=new Set(['background','environment-depth','editorial-depth','move-effect','narrated-action','performance-light','transition-flash','stat-boost','editorial-effect','creative-prop','relationship-diagram']);
const movable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked&&!l.attachment&&!l.parentId&&!l.actorPerformance&&!l.actionMovie&&!l.narrationEffect&&!ignored.has(l.role)&&!['particles','video'].includes(l.type)&&l.role!=='subject'&&l.role!=='gameplay';
const intersect=(a,b,gx=0,gy=0)=>a.x<b.x+b.w+gx&&a.x+a.w>b.x-gx&&a.y<b.y+b.h+gy&&a.y+a.h>b.y-gy;
const union=boxes=>({x:Math.min(...boxes.map(b=>b.x)),y:Math.min(...boxes.map(b=>b.y)),w:Math.max(...boxes.map(b=>b.x+b.w))-Math.min(...boxes.map(b=>b.x)),h:Math.max(...boxes.map(b=>b.y+b.h))-Math.min(...boxes.map(b=>b.y))});
export function artworkBox(layer,layers,media,time,width,height){
 const p=placementFor(layer,layers,media,time,width,height),m=p.motion,asset=media.find(a=>a.id===layer.mediaId);
 let w=p.width*width,h=p.height*height,cx=(m.x+m.dx)*width+w/2,cy=(m.y+m.dy)*height+h/2;
 if(layer.type==='image'&&asset&&layer.fit!=='cover'){
  const aspect=(asset.width||asset.pokemon?.spriteWidth||w)/(asset.height||asset.pokemon?.spriteHeight||h);
  let iw=w,ih=h;if(w/h>aspect)iw=h*aspect;else ih=w/aspect;
  const b=asset.artworkGeometry?.bounds||{x:0,y:0,width:1,height:1};
  const rad=m.rotation*Math.PI/180,dx=(b.x+b.width/2-.5)*iw*(layer.flipX?-1:1)*m.scale*m.scaleX,dy=(b.y+b.height/2-.5)*ih*m.scale*m.scaleY;
  cx+=dx*Math.cos(rad)-dy*Math.sin(rad);cy+=dx*Math.sin(rad)+dy*Math.cos(rad);w=iw*b.width;h=ih*b.height;
 }
 w*=m.scaleX;h*=m.scaleY;
 const rad=m.rotation*Math.PI/180,rw=(Math.abs(w*Math.cos(rad))+Math.abs(h*Math.sin(rad)))*m.scale,rh=(Math.abs(w*Math.sin(rad))+Math.abs(h*Math.cos(rad)))*m.scale;
 return {x:(cx-rw/2)/width,y:(cy-rh/2)/height,w:rw/width,h:rh/height,opacity:m.opacity};
}
// Move only free-standing automatic overlays. Actor/prop contact, beams, ground
// shadows and manually reviewed patches deliberately share space.
export function arrangeOverlays(project){
 const next=structuredClone(project),width=project.format==='horizontal'?1920:1080,height=project.format==='horizontal'?1080:1920,gx=18/width,gy=18/height,adjustments=[],unresolved=[];
 for(const scene of next.scenes){
  if(scene.manualTemplate)continue;
  const layers=scene.layers||[],caption={...next.captionStyle,...scene.captionStyle};
  const font=caption.fontSize??(next.format==='horizontal'?42:46),captionHeight=Math.max(.06,(font*2.8+20)/height);
  const captionBox=caption.enabled===false?undefined:{x:.055,y:caption.position==='top'?.05:1-(caption.bottom??.13)-captionHeight,w:.89,h:captionHeight};
  const candidates=layers.filter(movable).sort((a,b)=>(a.role==='chart'?-10:0)-(b.role==='chart'?-10:0)||a.start-b.start||b.width*b.height-a.width*a.height);
  for(const l of candidates){
   const ranges=visibleRanges(l,scene.start,scene.end,layers);if(!ranges.length)continue;
   const samples=[...new Set(ranges.flatMap(r=>[Math.min(r.end-.001,r.start+.12),Math.min(r.end-.001,r.start+.24),Math.min(r.end-.001,r.start+.42),r.start+(r.end-r.start)*.5,Math.max(r.start,r.end-.2),...layers.flatMap(o=>(o.keyframes||[]).map(k=>k.time)).filter(t=>t>=r.start&&t<r.end)]))];
   const own=samples.map(t=>artworkBox(l,layers,next.media,t,width,height)).filter(b=>b.opacity>.1);if(!own.length)continue;const box=union(own);
   const obstacles=layers.filter(o=>o!==l&&!o.parentId&&!ignored.has(o.role)&&o.type!=='particles'&&(!movable(o)||candidates.indexOf(o)<candidates.indexOf(l))).flatMap(o=>{
    const relevant=samples.filter(t=>visibleRanges(o,scene.start,scene.end,layers).some(r=>t>=r.start&&t<r.end));
    return relevant.map(t=>artworkBox(o,layers,next.media,t,width,height)).filter(b=>b.opacity>.1);
   });if(captionBox)obstacles.push(captionBox);
   const safe=b=>b.x>=.025&&b.y>=.035&&b.x+b.w<=.975&&b.y+b.h<=.965;
   const free=b=>safe(b)&&obstacles.every(o=>!intersect(b,o,gx,gy));
   if(free(box))continue;
   const xs=[box.x,.03,.97-box.w,...obstacles.flatMap(o=>[o.x-box.w-gx,o.x+o.w+gx])],ys=[box.y,.04,.965-box.h,...obstacles.flatMap(o=>[o.y-box.h-gy,o.y+o.h+gy])];
   const positions=xs.flatMap(x=>ys.map(y=>({...box,x,y}))).filter(free).sort((a,b)=>((a.x-box.x)*width)**2+((a.y-box.y)*height)**2-((b.x-box.x)*width)**2-((b.y-box.y)*height)**2);
   if(!positions.length){unresolved.push({sceneId:scene.id,layerId:l.id,reason:'No free space at the original readable size'});continue;}
   const chosen=positions[0],dx=chosen.x-box.x,dy=chosen.y-box.y;l.x+=dx;l.y+=dy;
   for(const k of l.keyframes||[]){if(k.x!==undefined)k.x+=dx;if(k.y!==undefined)k.y+=dy;}
   adjustments.push({sceneId:scene.id,layerId:l.id,dx,dy,gutterPixels:18});
  }
 }
 next.overlayLayoutReport={version:1,adjustments,unresolved,captionsChanged:false};return next;
}
