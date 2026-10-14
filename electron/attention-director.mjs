import {applyVisualSequence} from './visual-sequence.mjs';
import {applyReferenceShort} from './short-styles.mjs';
import {sentenceImportance,youtubeStrategy} from './sentence-strategy.mjs';
import {propertyAt} from './layer-motion.mjs';
import {retentionBrief} from './retention-planner.mjs';

export function planAttention(project,profile){
 const brief=retentionBrief(project,profile),beats=[],strategy=youtubeStrategy(project);
 for(const scene of project.scenes){
  const phrases=sentenceImportance(scene);
  for(let time=scene.start;time<scene.end-.15;time+=2){
   const words=(scene.words||[]).filter(w=>w.end>time&&w.start<Math.min(time+2,scene.end));
   const quote=words.map(w=>w.text).join(' ')||scene.text;
   const phrase=phrases.filter(p=>p.end>time&&p.start<time+2).sort((a,b)=>b.importance-a.importance||a.start-b.start)[0];
   const phase=time<3?'hook':time>=project.duration-3?'payoff':'explanation';
   const metrics=(scene.reaction?.metrics||[]).filter(m=>m.start>=time&&m.start<time+2);
   const entities=(scene.reaction?.entities||[]).filter(e=>e.start<=time+2&&(e.end??scene.end)>time);
   beats.push({sceneId:scene.id,time:Number(time.toFixed(3)),end:Math.min(time+2,scene.end),phase,quote,phraseId:phrase?.id,importantWords:phrase?.keywords||[],visualNeed:phrase?.visualNeed||'context',importance:phrase?.importance??1,entityIds:phrase?.entityIds.length?phrase.entityIds:entities.filter(e=>e.start<=time+.05).map(e=>e.id),metricCue:metrics.length>0,purpose:phrase?phrase.reason:metrics.length?'Make the narrated value easier to understand':entities.length?'Keep attention on '+entities.map(e=>e.name).join(' and '):phase==='hook'?'Establish the subject and question':phase==='payoff'?'Hold the conclusion in focus':'Support this part of the explanation',nearHistoricalDip:brief.riskWindows.some(w=>Math.abs(w.time-time)<2)});
  }
 }
 return {...project,youtubeStrategy:strategy,attentionPlan:{version:2,targetInterval:2,basis:brief.basis,measured:brief.measured,notice:brief.notice,strategy:'Hook → explanation → payoff. Review attention about every two seconds; retain trained actions and deliberate holds, preserve chart reading time and narration. Never add an unrelated asset to fill a slot.',beats,execution:[]}};
}

export function clearAttention(project){
 const next=structuredClone(project);for(const s of next.scenes){if(s.visualSequenceApplied&&s.sequenceSourceLayers){s.layers=structuredClone(s.sequenceSourceLayers);delete s.sequenceSourceLayers;delete s.visualSequence;delete s.visualSequenceApplied;delete s.visualAssetWarnings;}}for(const s of next.scenes)for(const l of s.layers||[])if(l.attentionBaseline&&!l.manual&&!l.instructionLocked){for(const [key,value] of Object.entries(l.attentionBaseline)){if(value===undefined||value===null)delete l[key];else l[key]=value;}delete l.attentionBaseline;}return next;
}

export function applyAttention(project){
 if(!project.attentionPlan)return project;
 if(project.shortStyle){const next=applyReferenceShort(clearAttention(project));const plan=structuredClone(project.attentionPlan);plan.strategy='Reference Short: review attention every two seconds; use spoken subject, mechanic and evidence cues; hold useful explanations instead of replacing pictures on a timer.';plan.execution=plan.beats.map(beat=>{const shot=next.shortStyleReport?.shots.find(s=>s.sceneId===beat.sceneId&&s.start<=beat.time&&s.end>beat.time),cues=project.shortStyle==='pokemon-dense'?(next.shortStyleReport?.visualCues||[]).filter(c=>c.sceneId===beat.sceneId&&c.start>=beat.time&&c.start<beat.end):[];return {...beat,status:cues.length?'applied':shot?'held':'unfilled',kind:cues.length?cues.map(c=>c.kind).join(', '):shot?.layout,reason:cues.length?'Narration-aligned visual changes: '+cues.map(c=>c.quote).join(', '):shot?.purpose||'Missing reference-style shot',targetId:next.scenes.find(s=>s.id===beat.sceneId)?.layers?.find(l=>l.role==='subject'&&l.start<=beat.time&&l.end>beat.time)?.id};});return {...next,attentionPlan:plan};}
 const plan=structuredClone(project.attentionPlan),next=applyVisualSequence(clearAttention(project));plan.execution=[];
 const noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
 for(const s of next.scenes){
  // Reapplication restores this pass's baseline, leaving manually changed layers untouched.
  for(const l of s.layers||[])if(l.attentionBaseline&&!l.manual&&!l.instructionLocked){for(const [key,value] of Object.entries(l.attentionBaseline)){if(value===undefined||value===null)delete l[key];else l[key]=value;}delete l.attentionBaseline;}
  for(const beat of plan.beats.filter(b=>b.sceneId===s.id)){
   const scheduled=s.visualSequence?.find(slot=>slot.time<=beat.time&&slot.end>beat.time);if(scheduled){plan.execution.push({...beat,status:scheduled.kind==='hold'?'held':scheduled.kind==='missing'?'unfilled':'applied',targetId:scheduled.targetId,kind:scheduled.kind,reason:scheduled.reason});continue;}
   const authored=next.animationPlan?.beats.find(b=>b.sceneId===s.id);
   if(authored&&s.localAnimationApplied){const moment=authored.moments.find(m=>m.start<beat.end&&m.end>beat.time);plan.execution.push({...beat,status:moment?'existing':'held',...(moment?{targetId:moment.targetId,kind:'trained animation'}:{}),reason:moment?'Retain the trained narration-aligned action.':'Retain the trained director’s deliberate hold; do not add a timer-driven pulse.'});continue;}
   const visible=(s.layers||[]).filter(l=>!l.manual&&!l.instructionLocked&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction&&!l.narrationEffect&&l.start<=beat.time+.05&&l.end>beat.time+.3&&(l.opacity??1)>0);
   if(beat.visualNeed==='hold'){plan.execution.push({...beat,status:'held',reason:'Connecting speech: keep the established visual instead of adding decoration.'});continue;}
   const relevant=visible.filter(l=>['subject','chart','supporting-image','supporting-sprite','background'].includes(l.role));
   const matching=beat.entityIds.length?relevant.filter(l=>l.role==='background'||l.role==='chart'||beat.entityIds.some(id=>s.reaction?.entities?.find(e=>e.id===id)?.mediaId===l.mediaId)):relevant;
   const scored=matching.map(l=>({l,score:(l.role==='chart'&&beat.metricCue?20:0)+(beat.entityIds.some(id=>s.reaction?.entities?.find(e=>e.id===id)?.mediaId===l.mediaId)?10:0)+(l.role==='subject'?5:l.role==='background'?0:3)})).sort((a,b)=>b.score-a.score);
   const l=scored[0]?.l;
   if(beat.entityIds.length&&beat.visualNeed==='image'&&!matching.some(l=>l.role!=='background'&&l.role!=='chart')){plan.execution.push({...beat,status:'unfilled',reason:'The important subject has no relevant visible image; retain context and request matching media.'});continue;}
   if(!l){plan.execution.push({...beat,status:'unfilled',reason:'No editable relevant visual is visible; add suitable source media.'});continue;}
   if(Math.abs(l.start-beat.time)<.15){plan.execution.push({...beat,status:'existing',targetId:l.id,kind:'picture/entrance'});continue;}
   if((l.keyframes||[]).some(k=>k.time>=beat.time-.25&&k.time<beat.time+1)){plan.execution.push({...beat,status:'existing',targetId:l.id,kind:'planned animation'});continue;}
   if(l.role==='chart'){plan.execution.push({...beat,status:'held',targetId:l.id,reason:'Keep evidence stationary and readable; chart motion requires an authored data reveal.'});continue;}
   if(noMotion){plan.execution.push({...beat,status:'held',targetId:l.id,reason:'Respecting no-motion instructions.'});continue;}
   const end=Math.min(beat.time+1.2,l.end-.05,s.end-.05);if(end<=beat.time+.2)continue;
   if(!l.attentionBaseline)l.attentionBaseline={keyframes:l.keyframes?structuredClone(l.keyframes):null,animation:l.animation??null,enter:l.enter??null,float:l.float??null,easing:l.easing??null};
   const scale=propertyAt(l,'scale',beat.time),amount=l.role==='background'?.025:.07;
   const points=[{time:beat.time,scale},{time:beat.time+(end-beat.time)*.45,scale:scale*(1+amount)},{time:end,scale}];
   l.keyframes=[...(l.keyframes||[]).filter(k=>k.time<beat.time||k.time>end),...points].sort((a,b)=>a.time-b.time);l.float=false;l.easing='easeInOut';
   plan.execution.push({...beat,status:'applied',targetId:l.id,kind:beat.metricCue?'value emphasis':'focus change'});
  }
 }
 next.attentionPlan=plan;return next;
}
