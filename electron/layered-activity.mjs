import {noMotion} from './game-presentation.mjs';
import {sceneGame,selectedGame} from './game-selection.mjs';
import {propertyAt,motionFor} from './layer-motion.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {narrationProp} from './narration-props.mjs';
import {REFERENCE_ACTIVITY} from './reference-activity.mjs';
const quiet=p=>noMotion(p)||p.freezePokemonMotion||p.autoLayeredActivity===false||/\b(?:restrained|documentary|sparse|minimal effects|static images|no effects)\b/i.test((p.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,''));
const free=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked&&!l.attachment&&!l.silhouette;
const visible=(l,s,t)=>visibleRanges(l,s.start,s.end,s.layers||[]).some(r=>t>=r.start&&t<r.end)&&motionFor(l,t).opacity>.1;
const supportRoles=new Set(['supporting-image','story-picture','game-logo','item','nature-mint','type-icon','mechanic-card','moveset-card','chart','reaction-gif','creative-stage-prop','creative-prop']);
const foreground=l=>l.role==='subject'||supportRoles.has(l.role);
function moves(l,a,b){return ['x','y','scale','rotation'].some(k=>Math.abs(propertyAt(l,k,b)-propertyAt(l,k,a))>(k==='rotation'?1:k==='scale'?.02:.006))||(l.keyframes||[]).some(k=>k.time>a&&k.time<b);}
export function clearLayeredActivity(project){
 const next=structuredClone(project);
 for(const s of next.scenes){s.layers=(s.layers||[]).filter(l=>!l.layeredActivity||!free(l));for(const l of s.layers)if(l.layeredActivityBaseline&&free(l)){for(const [k,v] of Object.entries(l.layeredActivityBaseline)){if(v===null)delete l[k];else l[k]=structuredClone(v);}delete l.layeredActivityBaseline;}}
 delete next.layeredActivityReport;return next;
}
export function auditLayeredActivity(project){
 const samples=[],quietWindows=[];let pictureSeconds=0,sampledSeconds=0,concurrentSeconds=0;
 for(const s of project.scenes){if(sceneGame(project,s,selectedGame(project))!=='pokemon')continue;
  for(let t=s.start+.25;t<s.end;t+=.5){const active=(s.layers||[]).filter(l=>foreground(l)&&visible(l,s,t)),proof=(s.layers||[]).some(l=>visible(l,s,t)&&['gameplay','narrated-action'].includes(l.role)),moving=active.filter(l=>moves(l,t,Math.min(s.end,t+.3))).length;
   const dt=Math.min(.5,s.end-t),pictures=new Set(active.filter(l=>l.mediaId||l.role==='chart').map(l=>l.mediaId||l.id)).size;pictureSeconds+=pictures*dt;sampledSeconds+=dt;if(pictures>=2)concurrentSeconds+=dt;
   samples.push({sceneId:s.id,time:+t.toFixed(2),pictures,moving,proof,lead:active.some(l=>l.role==='subject'),support:active.some(l=>supportRoles.has(l.role))});
  }
  for(let start=s.start;start<s.end-.5;start+=2){const window=samples.filter(p=>p.sceneId===s.id&&p.time>=start&&p.time<start+2);if(window.length&&!s.manualTemplate&&!window.some(p=>p.proof)&&window.every(p=>p.pictures<2))quietWindows.push({sceneId:s.id,start,end:Math.min(s.end,start+2),reason:'Only one real foreground picture is visible; needs a relevant sourced support or a planned interaction, not filler.'});}
 }
 return {version:1,referenceIds:REFERENCE_ACTIVITY.references.map(r=>r.id),samples,quietWindows,meanForegroundPictures:sampledSeconds?pictureSeconds/sampledSeconds:0,concurrentFraction:sampledSeconds?concurrentSeconds/sampledSeconds:0,notice:'Counts describe the delivered composition, not predicted viewer retention or equivalence to the reference videos.'};
}
export function applyLayeredActivity(project){
 const next=clearLayeredActivity(project),events=[],holds=[];
 if(quiet(next)){next.layeredActivityReport={...auditLayeredActivity(next),events,holds,disabled:true};return next;}
 for(const s of next.scenes){if(s.manualTemplate||s.battlePlan||sceneGame(next,s,selectedGame(next))!=='pokemon')continue;
  // Weather and celebration use the actual sourced file behind the actors.
  // They never replace the lead or become an opaque image over the evidence.
  const weather=(s.words||[]).map((w,i)=>({w,i,kind:/^(?:rain|raining)[,.!?]*$/i.test(w.text)?'rain':/^(?:snow|snowing)[,.!?]*$/i.test(w.text)?'snow':/^(?:won|winning|victory)[,.!?]*$/i.test(w.text)?'confetti':null})).filter(c=>c.kind);
  for(const [i,c] of weather.entries()){
   const before=s.words.slice(Math.max(0,c.i-3),c.i).map(w=>w.text).join(' ');if(/\b(?:not|never|without|no)\b/i.test(before))continue;
   const m=narrationProp(next,c.kind);if(!m)continue;
   const end=Math.min(s.end,weather[i+1]?.w.start??s.end,c.w.start+3);if(end-c.w.start<.25)continue;
   if((s.layers||[]).some(l=>l.role==='gameplay'&&l.start<end&&l.end>c.w.start))continue;
   const id=s.id+'-layered-weather-'+i;s.layers.push({id,layeredActivity:true,type:'image',role:'ambient-source',mediaId:m.id,start:c.w.start,end,x:0,y:.04,width:1,height:.65,z:5,opacity:c.kind==='confetti'?.28:.18,fit:'cover',animation:'fade',entranceDuration:.15,exit:'fade',keyframes:[{time:c.w.start,y:.01,scale:1.04},{time:end,y:.045,scale:1.06}]});
   events.push({sceneId:s.id,start:c.w.start,end,layerId:id,kind:'sourced-atmosphere',cue:c.kind==='confetti'?'pop':'whoosh',priority:7,reason:'Narrated '+c.kind+' arrives around the continuing lead'});
  }
  const reveals=(s.layers||[]).filter(l=>supportRoles.has(l.role)&&!l.referenceContinuation&&!l.silentEntrance).sort((a,b)=>a.start-b.start);
  let previous=-2;
  for(const reveal of reveals){const start=Math.max(s.start,reveal.start+.16),end=Math.min(s.end,reveal.end,start+.72);if(end-start<.3||start-previous<.75)continue;
   if((s.layers||[]).some(l=>l.start<end&&l.end>start&&['gameplay','narrated-action'].includes(l.role))){holds.push({sceneId:s.id,start,reason:'Complete the actual footage/action before adding a reaction'});continue;}
   const actors=(s.layers||[]).filter(l=>l.role==='subject'&&free(l)&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction&&l.start<=start&&l.end>=end&&visible(l,s,start)&&!moves(l,start,end));
   const actor=actors.sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!actor)continue;
   actor.layeredActivityBaseline??={keyframes:actor.keyframes?structuredClone(actor.keyframes):null,easing:actor.easing??null};
   const base={scale:propertyAt(actor,'scale',start),rotation:propertyAt(actor,'rotation',start)},finish={scale:propertyAt(actor,'scale',end),rotation:propertyAt(actor,'rotation',end)},toward=reveal.x+reveal.width/2>actor.x+actor.width/2?1:-1;
   const angle=actor.width>.75?2:4,peak=start+(end-start)*.45;
   actor.keyframes=[...(actor.keyframes||[]).filter(k=>k.time<start||k.time>end),{time:start,...base},{time:peak,scale:Math.min(base.scale*1.035,.95/actor.width),rotation:base.rotation+toward*angle},{time:end,...finish}].sort((a,b)=>a.time-b.time);actor.easing='smooth';previous=start;
   events.push({sceneId:s.id,start,end,layerId:actor.id,supportId:reveal.id,kind:'notice-support',reason:'The lead notices the actual supporting reveal while source evidence remains still'});
  }
 }
 next.layeredActivityReport={...auditLayeredActivity(next),events,holds};return next;
}
