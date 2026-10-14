import {noMotion} from './game-presentation.mjs';
import {narrationProp} from './narration-props.mjs';
import {propertyAt} from './layer-motion.mjs';
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
const concepts=[
 ['small',/^(small|smaller|smallest|tiny|little|miniature)$/,'pop'],
 ['large',/^(big|bigger|biggest|huge|large|larger|massive|giant)$/,'pop'],
 ['speed',/^(fast|faster|quick|quickly|speed|speedy)$/,'whoosh'],
 ['slow',/^(slow|slowly|slower|sluggish)$/,'pop'],
 ['strength',/^(strong|stronger|powerful|power|overpowered)$/,'pop'],
 ['weak',/^(weak|weaker|fragile)$/,'pop'],
 ['time',/^(time|wait|waiting|seconds|minutes|turns)$/,'click'],
 ['money',/^(money|expensive|cost|costs|cheap|price)$/,'click'],
 ['idea',/^(idea|plan|strategy|setup|because|therefore)$/,'pop'],
 ['question',/^(why|how|problem|confusing|confused)$/,'pop'],
 ['lightning',/^(lightning|thunder)$/,'electric'],
 ['shield',/^(protect|protects|defend|defends|shield)$/,'pop'],
 ['target',/^(target|targets|aim|aims)$/,'pop']
];
const specific=s=>/\b(?:base stats?|accuracy|percent|chance|ability|abilities|evs|ivs|damage calculation|exactly|explains?|explaining)\b/i.test(s.text);
const protectedAt=(s,t)=>(s.layers||[]).some(l=>l.start<=t&&l.end>t&&(['gameplay','chart','mechanic-card','battle-effect','move-effect','reaction-gif','narrated-action','expression-effect'].includes(l.role)||l.attachment));
export function clearStoryShots(project){
 const next=structuredClone(project);
 for(const s of next.scenes){if(s.manualTemplate)continue;s.layers=(s.layers||[]).filter(l=>!l.storyShot||!editable(l));for(const l of s.layers){if(!l.storyShotMotionSource)continue;if(editable(l)){if(l.storyShotMotionSource.keyframes===undefined)delete l.keyframes;else l.keyframes=structuredClone(l.storyShotMotionSource.keyframes);}delete l.storyShotMotionSource;}}
 delete next.storyShotReport;return next;
}
export function enforceSpokenReveals(project){
 const next=structuredClone(project),report=[];
 for(const s of next.scenes){if(s.manualTemplate)continue;
  s.layers=(s.layers||[]).filter(l=>!l.role?.includes('hook-teaser'));
  for(const l of s.layers.filter(l=>editable(l)&&l.mediaId&&!['background','gameplay','environment-depth'].includes(l.role))){
   const mentions=(next.pokemonMentions||[]).filter(m=>m.mediaId===l.mediaId&&m.status==='ready'),first=mentions.length?Math.min(...mentions.map(m=>m.start)):undefined;
   if(first!==undefined&&l.start<first-.001){report.push({sceneId:s.id,layerId:l.id,oldStart:l.start,start:first});l.start=Math.max(l.start,first);l.animationStart=Math.max(l.animationStart??l.start,l.start);}
  }
  s.layers=s.layers.filter(l=>l.end>l.start+.02);
 }next.spokenRevealReport=report;return next;
}
export function applyStoryShots(project){
 const next=clearStoryShots(project),events=[],beats=[],motion=!noMotion(next);
 delete next.storyShotReport;
 if(next.autoStoryShots===false||/\b(?:no|without|avoid)\s+(?:visual\s+)?(?:switching|cuts|scene changes)|\b(?:restrained|documentary|sparse|minimal effects)\b/i.test((next.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'')))return next;
 const visualEvents=next.scenes.flatMap(s=>(s.layers||[]).filter(l=>!l.referenceContinuation&&!['background','environment-depth','editorial-depth','credit'].includes(l.role)).map(l=>l.start));
 let last=-2;
 for(const s of next.scenes){if(s.manualTemplate||s.battlePlan)continue;
  for(const [i,w] of (s.words||[]).entries()){
   const concept=concepts.find(([,re])=>re.test(clean(w.captionText||w.text))),prior=(s.words||[]).slice(Math.max(0,i-3),i).map(w=>clean(w.text)).join(' ');
   if(!concept||/\b(?:not|never|no|without|isnt|isn't)\b/.test(prior)||w.start-last<1.5||protectedAt(s,w.start)||specific(s)||s.layers.some(l=>l.storyShot&&!editable(l)&&l.start<=w.start&&l.end>w.start))continue;
   const [kind,,sound]=concept,phrase=(s.words||[]).slice(Math.max(0,i-3),i+4).map(w=>w.text).join(' '),nextReveal=visualEvents.filter(t=>t>w.start+.05).sort((a,b)=>a-b)[0],end=Math.min(s.end,w.start+1.7,nextReveal??s.end);
   if(end-w.start<.25)continue;
   const focus=(next.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.end<=w.start+.04).at(-1)?.mediaId;
   const actors=s.layers.filter(l=>l.role==='subject'&&l.start<=w.start&&l.end>=end&&editable(l)),actor=actors.find(l=>l.mediaId===focus)||actors[0];
   const actorConcept=['small','large','speed','slow','strength','weak'].includes(kind),matching=narrationProp(next,['small','large'].includes(kind)?'ruler':kind);
   if(actorConcept&&!actor)continue;if(!actorConcept&&!matching)continue;
   let placed=false;
   if(matching&&(!actorConcept||['small','large'].includes(kind))){
    // A thin ruler sits beside the actor. Other props occupy a small free
    // corner; reject placement that would obscure a subject, card or caption.
    const ruler=['small','large'].includes(kind),width=ruler?.05:.17,height=ruler?Math.min(.32,actor.height):.13;
    const shrink=kind==='small'&&motion?.55:1,left=actor?actor.x+actor.width*(1-shrink)/2:0,right=actor?actor.x+actor.width*(1+shrink)/2:0;
    const choices=ruler?[{x:Math.max(.02,left-.075),y:actor.y},{x:Math.min(.93,right+.02),y:actor.y}]:[{x:.03,y:.08},{x:.80,y:.08},{x:.03,y:.53},{x:.80,y:.53}];
    const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
    const obstacles=s.layers.filter(l=>l.start<end&&l.end>w.start&&(['subject','chart','mechanic-card','item','move-callout'].includes(l.role)||!editable(l))).map(l=>ruler&&l===actor?{...l,x:left,width:actor.width*shrink}:l);
    const box=choices.map(p=>({...p,width,height})).find(b=>b.y+b.height<=.69&&obstacles.every(l=>overlap(b,l)<.002));
    if(box){s.layers.push({id:s.id+'-story-concept-'+i,storyShot:true,type:'image',role:'story-picture',mediaId:matching.id,...box,z:67,start:w.start,end,fit:'contain',animation:motion?'spring-pop':'none',entranceDuration:.18,exit:'none'});placed=true;}
   }
   let moved=false;
   if(motion&&actor&&!actor.attachment&&end-w.start>=.45){
    actor.storyShotMotionSource??={keyframes:structuredClone(actor.keyframes)};
    const at=w.start,until=end,peak=at+Math.min(.22,(until-at)/3),release=until-Math.min(.18,(until-at)/3),baseScale=propertyAt(actor,'scale',at),baseX=propertyAt(actor,'x',at),endScale=propertyAt(actor,'scale',until),endX=propertyAt(actor,'x',until),amount=kind==='small'?.55:kind==='large'?Math.min(1.1,.94/actor.width):kind==='weak'?.94:1.04;
    actor.keyframes=(actor.keyframes||[]).filter(k=>k.time<at||k.time>until);
    if(['speed','slow'].includes(kind)){
     const y=propertyAt(actor,'y',at),rotation=propertyAt(actor,'rotation',at),runScale=kind==='speed'?baseScale*.84:baseScale,safeWidth=actor.width*runScale,center=baseX+actor.width/2,room=Math.max(0,Math.min(center-safeWidth/2-.025,.975-center-safeWidth/2)),range=Math.min(.10,room),n=kind==='speed'?8:2;
     actor.keyframes.push({time:at,x:baseX,y,rotation});
     for(let j=1;j<n;j++)actor.keyframes.push({time:at+(until-at)*j/n,x:baseX+range*Math.sin(j*Math.PI/2),y:y+(kind==='speed'?.009:0)*(j%2?-1:1),scale:runScale,rotation:rotation+(kind==='speed'?j%2?5:-5:0)});
     actor.keyframes.push({time:until,x:endX,scale:endScale,y:propertyAt({...actor,keyframes:actor.storyShotMotionSource.keyframes},'y',until),rotation:propertyAt({...actor,keyframes:actor.storyShotMotionSource.keyframes},'rotation',until)});
    }else actor.keyframes.push({time:at,scale:baseScale,x:baseX},{time:peak,scale:baseScale*amount,x:baseX},{time:release,scale:baseScale*amount,x:baseX},{time:until,scale:endScale,x:endX});
    actor.keyframes.sort((a,b)=>a.time-b.time);moved=true;
   }
   if(!placed&&!moved)continue;
   events.push({sceneId:s.id,start:w.start,end,kind,quote:w.text,phrase,actorId:actor?.mediaId,mediaId:placed?matching.id:actor?.mediaId,source:placed?matching.attribution?.source||'matching sourced image':'existing actor movement',cue:sound,reason:kind==='speed'?'Animate the focused character running; keep its artwork unobscured':kind==='small'?'Shrink the focused character next to a sourced measurement ruler':'Illustrate the narrated '+kind+' description'});last=w.start;
  }
 }
 // Emphasize an established actor during quiet gaps without duplicating its
 // artwork or introducing a generic speech bubble. Hold narrated proof.
 const schedule=[...visualEvents,...events.map(e=>e.start)].sort((a,b)=>a-b);
 let lastVisual=0;
 for(let t=2;t<next.duration-.25;t+=.25){
  const recent=schedule.filter(v=>v<=t).at(-1);if(recent!==undefined)lastVisual=Math.max(lastVisual,recent);
  if(t-lastVisual<2-.001)continue;
  if(schedule.some(v=>v>t&&v<t+.35))continue; // Wait briefly for the real spoken reveal instead of stacking filler on it.
  const s=next.scenes.find(s=>s.start<=t&&s.end>t);if(!s)continue;
  if(s.manualTemplate||s.battlePlan||specific(s)||protectedAt(s,t)){beats.push({time:t,status:'held',reason:'Hold narrated evidence or a complete action'});lastVisual=t;continue;}
  const actors=(s.layers||[]).filter(l=>['subject','game-logo'].includes(l.role)&&l.mediaId&&l.start<=t&&l.end>t),actor=actors[Math.floor(t/2)%Math.max(1,actors.length)],word=next.scenes.flatMap(s=>s.words||[]).filter(w=>w.start<=t).at(-1);
  if(!actor||!word){beats.push({time:t,status:'unfilled',reason:'No already-spoken subject available'});lastVisual=t;continue;}
  const end=Math.min(s.end,t+1.6);if(end-t<.35)continue;
  if(!motion||!editable(actor)||actor.attachment){lastVisual=t;continue;}
  actor.storyShotMotionSource??={keyframes:structuredClone(actor.keyframes)};
  const base=propertyAt(actor,'scale',t),release=propertyAt(actor,'scale',end),peak=t+.2;
  actor.keyframes=(actor.keyframes||[]).filter(k=>k.time<t||k.time>end);
  actor.keyframes.push({time:t,scale:base},{time:peak,scale:base*1.09},{time:end-.15,scale:base*1.09},{time:end,scale:release});actor.keyframes.sort((a,b)=>a.time-b.time);
  const reason='Emphasize the established actor while holding the narration context';events.push({sceneId:s.id,start:t,end,kind:'actor-focus',quote:word.text,source:'existing actor movement',mediaId:actor.mediaId,cue:'pop',reason});beats.push({time:t,status:'applied',kind:'actor-focus',reason});schedule.push(t);schedule.sort((a,b)=>a-b);lastVisual=t;

 }
 next.storyShotReport={version:1,targetInterval:2,events:events.sort((a,b)=>a.start-b.start),beats,notice:'Narration-linked sourced images, GIFs and actor movement; held proof and actions take priority. Missing external assets are not replaced with unrelated characters.'};return next;
}
