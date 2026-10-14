import {auditEngagement,shortform} from './engagement-plan.mjs';
import {propertyAt} from './layer-motion.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {noMotion} from './game-presentation.mjs';
export function clearVisualCadence(project){
 const next=structuredClone(project);for(const s of next.scenes)for(const l of s.layers||[])if(l.cadenceBaseline&&!l.manual&&!l.instructionLocked){if(l.cadenceBaseline.keyframes===null)delete l.keyframes;else l.keyframes=structuredClone(l.cadenceBaseline.keyframes);if(l.cadenceBaseline.easing===null)delete l.easing;else l.easing=l.cadenceBaseline.easing;delete l.cadenceBaseline;}
 delete next.cadenceReport;return next;
}
export function applyVisualCadence(project){
 const next=clearVisualCadence(project),events=[],holds=[];if(noMotion(next)||/\b(?:static|still) (?:pictures|images)|\b(?:no|without|avoid) (?:effects|focus changes)\b/i.test(next.editingInstructions||''))return next;
 const gaps=shortform(next)?auditEngagement(next).gaps:null;
 for(const s of next.scenes){if(s.manualTemplate)continue;
  const reviews=gaps?gaps.flatMap(g=>{const times=[];for(let t=g.start+2;t<g.end-.5;t+=2)if(t>=s.start&&t<s.end-.5){const cue=(s.words||[]).filter(w=>w.start>=Math.max(s.start,t-1.1)&&w.start<=Math.min(t+.25,s.end-.5)&&!/^(?:the|a|an|and|of|to|in|so|well|basically)[,.!?]*$/i.test(w.captionText||w.text)).sort((a,b)=>Math.abs(a.start-t)-Math.abs(b.start-t))[0];if(cue||!s.words?.length)times.push(cue?.start??t);}return times;}):Array.from({length:Math.ceil((s.end-s.start)/2)},(_,i)=>s.start+i*2).filter(t=>t<s.end-.5);
  for(const at of [...new Set(reviews)]){
   const end=Math.min(s.end,at+1.15),active=(s.layers||[]).filter(l=>visibleRanges(l,s.start,s.end,s.layers).some(r=>r.start<=at+.1&&r.end>=end));
   if(active.some(l=>['gameplay','narrated-action'].includes(l.role))){holds.push({sceneId:s.id,start:at,reason:'Finish the active narrated action or battle footage'});continue;}
   const evidence=active.some(l=>['chart','mechanic-card','moveset-card'].includes(l.role));
   const foreground=active.filter(l=>['subject','supporting-image','game-logo','story-picture'].includes(l.role)&&!l.actionMovie&&!l.creativeAction&&!l.actorPerformance);
   if((s.layers||[]).some(l=>['subject','supporting-image','game-logo','story-picture','item','creative-stage-prop','creative-prop','mechanic-card','type-icon','nature-mint','reaction-gif','moveset-card','chart'].includes(l.role)&&l.start>=at-.08&&l.start<at+1.2))continue;
   if(active.filter(l=>l.role==='subject').some(l=>l.actionMovie||l.creativeAction||l.actorPerformance||['x','y','scale','rotation'].some(key=>Math.abs(propertyAt(l,key,end)-propertyAt(l,key,at))>(key==='rotation'?3:key==='scale'?.04:.025))||(l.keyframes||[]).some(k=>k.time>at&&k.time<end&&(Math.abs((k.scale??1)-propertyAt(l,'scale',at))>.045||Math.abs((k.x??l.x)-propertyAt(l,'x',at))>.03))))continue;
   const l=foreground.filter(l=>!l.manual&&!l.manualFraming&&!l.instructionLocked&&!l.attachment&&!l.silhouette).sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!l)continue;
   l.cadenceBaseline??={keyframes:l.keyframes?structuredClone(l.keyframes):null,easing:l.easing??null};
   const scale=propertyAt(l,'scale',at),rotation=propertyAt(l,'rotation',at),peak=at+(end-at)*.45;
   l.keyframes=[...(l.keyframes||[]).filter(k=>k.time<at||k.time>end),{time:at,scale,rotation},{time:peak,scale:Math.min(scale*(evidence?1.04:1.10),.96/Math.max(l.width,l.height)),rotation:rotation+(l.x+l.width/2>.5?-1:1)*(evidence?1.5:3)},{time:end,scale,rotation}].sort((a,b)=>a.time-b.time);l.easing='easeInOut';
   events.push({sceneId:s.id,start:at,end,layerId:l.id,cue:'pop',priority:4,reason:evidence?'The lead stays active beside stationary readable evidence':'Narration focus changes after a quiet visual interval'});
  }
 }
 next.cadenceReport={targetSeconds:2,events,holds};return next;
}
