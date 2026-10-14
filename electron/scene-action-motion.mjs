import {byId} from './indexed-assets.mjs';
import {placementFor} from './layer-motion.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function actionProgress(data,time){const at=data.activatesAt??data.at;return {age:time-at,progress:clamp((time-at)/Math.max(.01,data.end-at))};}
// Reuse the same fitted-artwork and attachment coordinates as visible items.
// An effect never guesses a screen position after its actor has moved/deleted.
export function actionGeometry(data,layers,media,time,width=1080,height=1920,fps=60,frozen=false){
 const point=(id,x=.5,y=.5)=>{const actor=byId(layers,id);if(!actor||time<actor.start||time>=actor.end||actor.excludedRanges?.some(r=>time>=r.start&&time<r.end))return;
  const pin={id:'effect-pin-'+id,type:'image',x:0,y:0,width:0,height:0,start:actor.start,end:actor.end,animation:'none',exit:'none',attachment:{targetId:id,x,y,size:0,contentBounds:true}};
  const p=placementFor(pin,layers,media,time,width,height,fps,frozen);if(p.motion.opacity<.02)return;return {x:p.motion.x*width,y:p.motion.y*height};};
 const origin=point(data.actorId,.55,.46),targets=(data.targetIds||[]).map(id=>point(id,.5,.45)).filter(Boolean),ally=point(data.allyId,.5,.46);return {origin,targets,ally};
}
export function contactPerformance(at,end,a,t,variation=0){
 const duration=end-at,hit=at+duration*.52,reach=t.x+t.width*.30-a.width*.62;
 const attacker=[{time:at,x:a.x,y:a.y,scaleX:1,scaleY:1,rotation:0},{time:at+duration*.16,x:a.x-.012,y:a.y+.008,scaleX:1.045,scaleY:.955,rotation:variation===1?5:-5},{time:at+duration*.30,x:a.x+.025,y:a.y-.025,scaleX:.97,scaleY:1.03,rotation:variation===2?-4:1},{time:hit,x:reach,y:a.y-.012,scale:1.08,scaleX:1.035,scaleY:.98,rotation:variation===1?-8:7},{time:at+duration*.62,x:reach-.02,y:a.y+.005,scale:1.025,scaleX:.97,scaleY:1.025,rotation:-3},{time:end,x:a.x,y:a.y,scale:1,scaleX:1,scaleY:1,rotation:0}];
 const target=[{time:at,x:t.x,y:t.y,rotation:0,scaleX:1,scaleY:1},{time:hit,x:t.x,y:t.y,rotation:0},{time:hit+duration*.09,x:Math.min(1-t.width,t.x+.055),y:t.y+.018,rotation:11,scaleX:.94,scaleY:1.025},{time:at+duration*.79,x:t.x+.01,y:t.y,rotation:-3,scaleX:1.025,scaleY:.98},{time:end,x:t.x,y:t.y,rotation:0,scaleX:1,scaleY:1}];
 return {attacker,target,hit};
}
