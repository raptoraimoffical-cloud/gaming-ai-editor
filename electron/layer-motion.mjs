import {byId} from './indexed-assets.mjs';
import {spring} from 'remotion';
export const ANIMATION_PRESETS=['none','fade','slide-in-out','spring-pop','scale-reveal','smooth-zoom','parallax','mask-reveal','emphasis','reposition','comparison-reveal','ranking-reveal','background-motion'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>x<.5?4*x*x*x:1-(-2*x+2)**3/2;
// Shape-preserving cubic motion: continuous velocity at every key, bounded
// between authored positions. Turning points and held poses come to rest.
const tangent=(points,i,key)=>{
 if(i===0||i===points.length-1)return 0;
 const a=points[i-1],b=points[i],c=points[i+1],h0=b.time-a.time,h1=c.time-b.time;
 const d0=(b[key]-a[key])/h0,d1=(c[key]-b[key])/h1;
 if(d0*d1<=0)return 0;
 const w0=2*h1+h0,w1=h1+2*h0;
 return (w0+w1)/(w0/d0+w1/d1);
};
export function propertyAt(layer,key,time,fallback=layer[key]??(['scale','scaleX','scaleY','opacity'].includes(key)?1:0)){
 const points=(layer.keyframes||[]).filter(k=>k[key]!==undefined);
 if(!points.length)return fallback;if(time<=points[0].time)return points[0][key];if(time>=points.at(-1).time)return points.at(-1)[key];
 const i=points.findIndex(k=>k.time>time),a=points[i-1],b=points[i],h=b.time-a.time;let t=clamp((time-a.time)/h);
 if(layer.easing==='smooth'){
  const t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*a[key]+(t3-2*t2+t)*h*tangent(points,i-1,key)+(-2*t3+3*t2)*b[key]+(t3-t2)*h*tangent(points,i,key);
 }
 if(layer.easing==='easeInOut')t=smooth(t);if(layer.easing==='easeOut')t=1-(1-t)**3;return a[key]+(b[key]-a[key])*t;
}
export function motionFor(l,time,fps=30,frozen=false){
 const age=Math.max(0,time-(l.animationStart??l.start)),life=Math.max(0,(l.animationEnd??l.end)-time),duration=l.entranceDuration||.45;
 const preset=l.animation||({spring:'spring-pop',slide:'slide-in-out',left:'comparison-reveal',right:'comparison-reveal',fade:'fade',none:'none'}[l.enter]||'fade');
 const enter=clamp(age/duration),p=smooth(enter),progress=clamp(age/Math.max(.1,l.animationDuration??l.end-l.start)),amount=l.animationAmount??.12;
 const result={x:frozen?l.x:propertyAt(l,'x',time),y:frozen?l.y:propertyAt(l,'y',time),scale:frozen?l.scale??1:propertyAt(l,'scale',time),scaleX:frozen?l.scaleX??1:propertyAt(l,'scaleX',time),scaleY:frozen?l.scaleY??1:propertyAt(l,'scaleY',time),rotation:frozen?l.rotation??0:propertyAt(l,'rotation',time),opacity:frozen?l.opacity??1:propertyAt(l,'opacity',time),dx:0,dy:0,reveal:1};
 if(frozen)return result;
 const direction=l.direction||(l.enter==='right'?'right':l.enter==='left'?'left':'up'),sign=direction==='right'||direction==='down'?1:-1;
 const translate=(distance)=>{if(direction==='left'||direction==='right')result.dx=distance*sign;else result.dy=distance*sign;};
 if(['fade','slide-in-out','comparison-reveal','ranking-reveal','spring-pop','scale-reveal','reposition'].includes(preset))result.opacity*=p;
 if(['slide-in-out','comparison-reveal','ranking-reveal'].includes(preset))translate((1-p)*amount);
 if(preset==='spring-pop'){const value=spring({frame:age*fps,fps,durationInFrames:Math.round(duration*fps),config:{damping:14,stiffness:130}});result.scale*=.65+.35*value;}
 if(preset==='scale-reveal')result.scale*=.65+.35*p;
 if(preset==='smooth-zoom')result.scale*=1+amount*smooth(progress);
 if(preset==='parallax'||preset==='background-motion'){result.scale*=1+amount;result.dx+=(progress-.5)*amount*.65;result.dy+=(progress-.5)*amount*.2;}
 if(preset==='emphasis'){result.scale*=1+amount*Math.sin(Math.PI*progress)**2;result.dy-=amount*.12*Math.sin(Math.PI*progress);}
 if(preset==='reposition')translate(amount*smooth(progress));
 if(preset==='mask-reveal')result.reveal=p;
 if(l.float){result.dy+=Math.sin(age*2)*.006;}
 if(l.role!=='background'&&l.exit!=='none'){
  const exit=smooth(clamp(life/(l.exitDuration||.3)));result.opacity*=exit;
  if(l.exit==='slide'||preset==='slide-in-out')translate((1-p)*amount+(1-exit)*amount);
  if(l.exit==='scale')result.scale*=.8+.2*exit;
 }
 return result;
}
// Attach in the fitted image's coordinates, then inherit the actor's transform.
export function placementFor(l,layers,media,time,width,height,fps=30,frozen=false,seen=[]){
 const motion=motionFor(l,time,fps,frozen),result={motion,width:frozen?l.width:propertyAt(l,'width',time),height:frozen?l.height:propertyAt(l,'height',time)};
 // Older saved projects also get a moving ground shadow without a remake.
 const ground=l.referenceDecoration&&l.id.endsWith('-reference-ground');
 const attachment=l.attachment||(ground?{targetId:l.id.slice(0,-17),anchor:'ground',x:.5,y:1,size:.72,contentBounds:true}:undefined);
 if(!attachment)return result;
 let parent=byId(layers,attachment.targetId);
 if(parent&&(time<parent.start||time>=parent.end||parent.excludedRanges?.some(r=>time>=r.start&&time<r.end))){
  const source=parent,candidates=layers.filter(p=>p.id!==source.id&&['subject','narrated-action'].includes(p.role)&&p.mediaId===source.mediaId&&time>=p.start&&time<p.end&&!p.excludedRanges?.some(r=>time>=r.start&&time<r.end));
  parent=candidates.find(p=>p.actorSourceId===source.id)||(candidates.length===1?candidates[0]:undefined);
 }
 if(!parent||seen.includes(parent.id)||time<parent.start||time>=parent.end){motion.opacity=0;return result;}
 const p=placementFor(parent,layers,media,time,width,height,fps,frozen,[...seen,l.id]),pm=p.motion,m=byId(media,parent.mediaId);
 let pw=p.width*width,ph=p.height*height,iw=pw,ih=ph;
 const aspect=(m?.pokemon?.spriteWidth||m?.spriteSheet?.bounds?.width||m?.spriteSheet?.frameWidth||m?.width||pw)/(m?.pokemon?.spriteHeight||m?.spriteSheet?.bounds?.height||m?.spriteSheet?.frameHeight||m?.height||ph);
 if(parent.fit!=='cover'){if(pw/ph>aspect)iw=ph*aspect;else ih=pw/aspect;}
 const a=attachment,bounds=a.contentBounds?m?.artworkGeometry?.bounds:undefined,b=bounds||{x:0,y:0,width:1,height:1};
 const authored=m?.attachmentAnchors?.[a.anchor],landmark=a.anchor==='ground'?(m?.attachmentAnchors?.feet||m?.artworkGeometry?.verifiedAnchors?.feet&&m.artworkGeometry.anchors.feet):a.autoAnchor?(authored||m?.artworkGeometry?.anchors?.[a.anchor]):undefined;
 const ax=landmark?.x??a.x??.5,ay=landmark?.y??a.y??.5;
 const size=(a.size??.3)*(a.sizing==='height'?ih*b.height:a.sizing==='width'?iw*b.width:Math.min(iw*b.width,ih*b.height)),dx=(b.x+ax*b.width-.5)*iw*(parent.flipX?-1:1)*pm.scaleX,dy=(b.y+ay*b.height-.5)*ih*pm.scaleY,rad=pm.rotation*Math.PI/180;
 const cx=(pm.x+pm.dx)*width+pw/2+(dx*Math.cos(rad)-dy*Math.sin(rad))*pm.scale,cy=(pm.y+pm.dy)*height+ph/2+(dx*Math.sin(rad)+dy*Math.cos(rad))*pm.scale;
 if(a.anchor==='ground'){
  const sw=iw*b.width*(m?.artworkGeometry?.groundWidth??a.size??.72)*pm.scale*pm.scaleX,sh=Math.min(iw*b.width,ih*b.height)*.065*pm.scale;
  result.width=sw/width;result.height=sh/height;motion.x=(cx-sw/2)/width;motion.y=(cy-sh*.45)/height;
  motion.scale=1;motion.scaleX=1;motion.scaleY=1;motion.rotation=0;
 }else{
  const child=byId(media,l.mediaId),cb=a.contentBounds?child?.artworkGeometry?.bounds:undefined;
  const aspect=(child?.spriteSheet?.bounds?.width||child?.spriteSheet?.frameWidth||child?.width||1)/(child?.spriteSheet?.bounds?.height||child?.spriteSheet?.frameHeight||child?.height||1),cw=aspect>=1?size:size*aspect,ch=aspect>=1?size/aspect:size;
  const factor=cb?1/Math.max(cb.width,cb.height):1,ww=cw*factor,hh=ch*factor;
  const ox=cb?(cb.x+cb.width/2-.5)*ww:0,oy=cb?(cb.y+cb.height/2-.5)*hh:0,angle=(motion.rotation+pm.rotation)*Math.PI/180,scale=motion.scale*pm.scale;
  result.width=ww/width;result.height=hh/height;
  motion.x=(cx-ww/2-(ox*Math.cos(angle)-oy*Math.sin(angle))*scale)/width;motion.y=(cy-hh/2-(ox*Math.sin(angle)+oy*Math.cos(angle))*scale)/height;
  motion.scale=scale;motion.rotation+=pm.rotation;
 }
 motion.dx=0;motion.dy=0;motion.opacity*=pm.opacity;
 return result;
}
