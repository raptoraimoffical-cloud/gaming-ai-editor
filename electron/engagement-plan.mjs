import {videoMode} from './video-modes.mjs';
import {sentenceImportance} from './sentence-strategy.mjs';
import {significantMetric} from './number-salience.mjs';
import {visibleRanges,mergeRanges} from './layer-visibility.mjs';
import {motionFor,propertyAt,placementFor} from './layer-motion.mjs';
import research from './data/shortform-engagement-research.json' with {type:'json'};
export const ENGAGEMENT_RESEARCH=research;

export const ENGAGEMENT_POLICY={version:1,targetSeconds:2,hookVisualBy:1,basis:'User two-second pacing preference, official platform guidance and attention research; editorial targets, not guaranteed retention',rules:[
 'Make the actual subject and opening promise visually clear in the first second; never reveal a named subject before its spoken cue.',
 'Aim for a meaningful picture, demonstration, interaction, visual consequence or change of focus about every two seconds. Use exact spoken concepts and clause turns, not an unrelated timer decoration.',
 'Build anticipation, show the action, then deliver its consequence. Escalate the actual premise with a new useful beat; do not invent a twist, claim, number or dialogue.',
 'Keep a continuing lead and clear visual hierarchy while support changes. Prefer one dominant action and compatible supporting lanes; multiple competing highlights reduce clarity.',
 'Use relevant comic contrast and short reactions, varying the staging and gag with the current story. Finish the joke instead of inserting unrelated meme spam.',
 'Keep published information readable and complete attacks/gameplay demonstrations. A useful hold can exceed two seconds; independent supporting action may coexist without covering evidence.',
 'Place short pops, game clicks, whooshes and contact sounds at real visual phases below narration. A sound or changing caption alone is not a new visual beat.',
 'Deliver the promised conclusion. Match the ending visually to the opening only when the actual story supports it; never copy speech, truncate words or force a fake loop.',
 'Compare viewer choice to watch, engaged viewing, duration/percentage viewed and satisfaction when actual analytics are supplied. Timeline coverage is not measured viewer retention.'
]};
export const shortform=p=>videoMode(p).format==='vertical';
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
const connective=new Set(['a','an','the','and','or','of','to','in','it','its','is','are','was','were','so','well','just','really','basically','actually','like']);
export function engagementWindows(scene,project){
 const phrases=sentenceImportance(scene),windows=[];
 for(let start=scene.start;start<scene.end-.15;start+=2){
  const end=Math.min(scene.end,start+2),words=scene.words||[],indices=words.flatMap((w,i)=>w.start>=start-.001&&w.start<end?[i]:[]),important=indices.filter(i=>!connective.has(clean(words[i].captionText||words[i].text)));
  const aligned=(scene.reaction?.entities||[]).filter(e=>!e.inherited&&e.mediaId).map(e=>{const count=String(e.name||'').split(/\s+/).length,matches=words.flatMap((w,i)=>clean(words.slice(i,i+count).map(w=>w.captionText??w.text).join(' ').replace(/\s+/g,' '))===clean(e.name)?[w.start]:[]);return {...e,cueAt:matches.sort((a,b)=>Math.abs(a-e.start)-Math.abs(b-e.start))[0]??e.start};});
  const phrase=phrases.filter(p=>p.start<end&&p.end>start).sort((a,b)=>b.importance-a.importance)[0],entity=aligned.find(e=>e.cueAt>=start&&e.cueAt<end);
  let wordIndex=entity?words.findIndex(w=>w.start>=entity.cueAt-.02):important[0]??indices[0];if(connective.has(clean(words[wordIndex]?.captionText??words[wordIndex]?.text)))wordIndex=important[0]??indices[0];
  const cue=wordIndex>=0?words[wordIndex]?.start:undefined;
  windows.push({start,end,cue,wordIndex:wordIndex>=0?wordIndex:undefined,quote:indices.map(i=>words[i].text).join(' '),phase:start<1?'hook':end>=project.duration-2?'payoff':'develop',purpose:phrase?.reason||'Continue the current explanation',visualNeed:phrase?.visualNeed||'context',entityIds:phrase?.entityIds||[],significantMetrics:(scene.reaction?.metrics||[]).flatMap((m,i)=>m.start>=start&&m.start<end&&significantMetric(scene,m)?[i]:[])});
 }
 return windows;
}
// Author long clauses in manageable passages without splitting timeline scenes,
// caption groups or narration. Each model call retains the complete story.
export function creativePassages(scene,project,{seconds=8}={}){
 const words=scene.words||[];if(scene.end-scene.start<=seconds+.1||words.length<3)return [{...scene,sourceSceneId:scene.id,wordOffset:0,wholeText:scene.text}];
 const parts=[];let from=0;
 while(from<words.length){const start=from?words[from].start:scene.start,deadline=start+seconds;let to=from+1;while(to<words.length&&words[to].start<deadline)to++;
  if(to<words.length){const punctuation=words.map((w,i)=>i>from&&i<to&&w.end>=start+seconds*.65&&/[.!?;]$/.test(w.text)?i+1:-1).filter(i=>i>0).at(-1);if(punctuation)to=punctuation;
   while(to<words.length&&((project.pokemonMentions||[]).some(m=>m.start<words[to].start&&m.end>words[to].start)||words[to].captionText===''))to++;
  }
  const end=to<words.length?words[to].start:scene.end;
  parts.push({...scene,id:scene.id+'-passage-'+parts.length,sourceSceneId:scene.id,wordOffset:from,wholeText:scene.text,start,end,words:words.slice(from,to),text:words.slice(from,to).map(w=>w.text).join(' ')});from=to;
 }
 return parts;
}
export function rebaseActions(actions,passage){return actions.map(a=>({...a,wordIndex:a.wordIndex+passage.wordOffset,...(a.cueWordIndex!==undefined?{cueWordIndex:a.cueWordIndex+passage.wordOffset}:{}),...(a.cuePolicy==='semantic'&&a.cueWordIndex===undefined?{cueWordIndex:a.wordIndex+passage.wordOffset}:{})}));}
const pictureRoles=new Set(['subject','supporting-image','supporting-sprite','narrated-action','game-logo','story-picture','item','nature-mint','type-icon','mechanic-card','moveset-card','reaction-gif','creative-stage-prop','creative-prop','chart']);
const actorRoles=new Set(['subject','narrated-action']);
const actualChart=l=>l.role==='chart'&&(['bar','ring'].includes(l.type)&&Number.isFinite(l.value)||l.type==='line'&&l.points?.length>1&&l.points.every(Number.isFinite));
export function auditEngagement(project){
 const events=[],holds=[],warnings=[],prematureVisuals=[];if(!shortform(project))return {enabled:false,targetSeconds:2,events,holds,gaps:[],warnings,prematureVisuals,measured:false};
 const entries=project.scenes.flatMap(s=>(s.layers||[]).filter(l=>pictureRoles.has(l.role)&&(actualChart(l)||project.media?.some(m=>m.id===l.mediaId&&['image','pokemon','video'].includes(m.kind)))).flatMap(l=>visibleRanges(l,s.start,s.end,s.layers).map(r=>({s,l,...r})))).sort((a,b)=>a.start-b.start);
 const seen=[];
 for(const e of entries){const {s,l,start,end}=e;if(placementFor(l,s.layers,project.media||[],Math.min(end-.001,start+.25),1080,1920,30,!!project.freezePokemonMotion).motion.opacity<=.08)continue;const prior=seen.findLast(p=>p.l.mediaId===l.mediaId&&p.l.role===l.role&&(Math.abs(p.end-start)<.06||p.start<=start&&p.end>start)&&p.l.attachment?.targetId===l.attachment?.targetId);
  if(!prior&&!l.referenceContinuation&&!l.silentEntrance)events.push({start,kind:l.role==='chart'?'data-reveal':'source-picture',sceneId:s.id,layerId:l.id,mediaId:l.mediaId});seen.push(e);
  if(['mechanic-card','moveset-card','chart'].includes(l.role))holds.push({start,end:Math.min(end,start+3),reason:'Read the actual source evidence',sceneId:s.id});
  if(l.role==='subject'&&!l.silhouette&&!l.manual&&!l.instructionLocked){const spoken=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.mediaId===l.mediaId).sort((a,b)=>a.start-b.start)[0];if(spoken&&start<spoken.start-.08)prematureVisuals.push({sceneId:s.id,layerId:l.id,start,spokenAt:spoken.start,mediaId:l.mediaId});}
  if(l.role==='narrated-action')holds.push({start,end,reason:'Complete the narrated attack and reaction',sceneId:s.id});
  if(!project.freezePokemonMotion&&actorRoles.has(l.role)&&!l.cadenceBaseline&&(l.actionMovie||l.creativeAction||l.actorPerformance)){
   const keys=(l.keyframes||[]).filter(k=>k.time>=start&&k.time<end);
   for(const k of keys){const delta=['x','y','rotation','scale','glow','opacity'].some(name=>Math.abs(propertyAt(l,name,k.time)-propertyAt(l,name,Math.max(start,k.time-.2)))>(name==='rotation'?4:name==='glow'?.2:name==='scale'?.045:name==='opacity'?.15:.015));if(delta)events.push({start:k.time,kind:'performed-action',sceneId:s.id,layerId:l.id});}
  }
 }
 for(const s of project.scenes)for(const l of s.layers||[])if(l.role==='gameplay'&&project.media?.some(m=>m.id===l.mediaId&&m.kind==='video'))for(const r of visibleRanges(l,s.start,s.end,s.layers))if(placementFor(l,s.layers,project.media,Math.min(r.end-.001,r.start+.2),1080,1920).motion.opacity>.08)holds.push({...r,sceneId:s.id,reason:'Preserve the supplied gameplay demonstration'});
 for(const e of [...(project.creativeActionReport?.events||[]),...(project.performanceReport?.events||[])])if(project.scenes.find(s=>s.id===e.sceneId)?.layers?.some(l=>(l.creativeAction||l.actorPerformance)&&l.start<e.end&&l.end>e.start))holds.push({start:e.start,end:e.end,sceneId:e.sceneId,reason:'Complete the authored action and payoff'});
 events.sort((a,b)=>a.start-b.start);const unique=events.filter((e,i)=>!i||e.start-events[i-1].start>.08),busy=mergeRanges(holds.map(h=>({start:h.start,end:h.end}))),points=[0,...unique.map(e=>e.start),...busy.flatMap(r=>[r.start,r.end]),project.duration].sort((a,b)=>a-b),gaps=[];
 let anchor=0;
 for(const t of points){if(t-anchor>2.25&&!busy.some(r=>r.start<=anchor+.01&&r.end>=t-.01))gaps.push({start:anchor,end:t,seconds:+(t-anchor).toFixed(2),sceneId:project.scenes.find(s=>s.start<=anchor&&s.end>anchor)?.id,reason:'No new meaningful visual or justified demonstration/reading hold'});if(t>anchor)anchor=t;}
 const first=unique.find(e=>e.kind==='source-picture'||e.kind==='data-reveal')?.start;
 if(first===undefined||first>1)warnings.push('Opening has no relevant foreground picture within the first second.');
 if(gaps.length)warnings.push(gaps.length+' visual interval(s) exceed the two-second target without a deliberate hold.');
 if(prematureVisuals.length)warnings.push(prematureVisuals.length+' named character visual(s) precede their first spoken cue.');
 return {enabled:true,version:1,targetSeconds:2,toleranceSeconds:.25,firstVisualAt:first,events:unique,holds,gaps,warnings,prematureVisuals,measured:false,notice:'Delivered timeline pacing, not measured or predicted viewer retention. Two seconds is a creative target, not a proven universal optimum.'};
}
