import model from './data/reference-style-model.json' with {type:'json'};
import {planMoveEffects} from './move-effects.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {artworkBox} from './overlay-layout.mjs';
import {sceneGame,selectedGame} from './game-selection.mjs';
const index=new Map(model.vocabulary.map((word,i)=>[word,i]));
const normal=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function predictSceneStyle(text){
 const words=normal(text).split(' ').filter(Boolean),parts=[...words,...words.slice(1).map((w,i)=>words[i]+' '+w),...words.flatMap(w=>w.length>4?Array.from({length:w.length-3},(_,i)=>'char:'+w.slice(i,i+4)):[])],counts=new Map();
 for(const word of parts){const i=index.get(word);if(i!==undefined)counts.set(i,(counts.get(i)||0)+1);}let norm=0;for(const [i,n] of counts)norm+=(n*model.idf[i])**2;norm=Math.sqrt(norm)||1;
 const logits=[...model.bias];for(const [i,n] of counts)for(let j=0;j<logits.length;j++)logits[j]+=n*model.idf[i]/norm*model.weights[i][j];const max=Math.max(...logits),probs=logits.map(v=>Math.exp(v-max)),sum=probs.reduce((a,b)=>a+b,0);
 return model.labels.map((kind,i)=>({kind,confidence:probs[i]/sum})).sort((a,b)=>b.confidence-a.confidence);
}
export const referenceStyleModelStatus=()=>({name:model.name,digest:model.digest,trained:true,evaluation:model.evaluation,languageModelWeightsChanged:false});
const guidance={
 battle:'Show the established attacker performing the actual move on the established opponent, with anticipation, contact, recoil and synchronized impact. Keep uninvolved learners out of this matchup.',
 'move-explainer':'Keep the real move/ability description readable beside the continuing subject. Use relevant notable learners only for this general explanation and useful diagrams only for actual narrated data.',
 setup:'Show the actual boost as a staged power-up on its owner, with the sourced move/item evidence and a game stat-rise sound. Preserve setup before the later attack.',
 pair:'Stage partners together and demonstrate how one supports the other. Use a meaningful redirect, handoff, protection or relationship cue from the sentence, with independent reactions.',
 person:'Show the correctly identified named person at the spoken name. A narrated win can attach a trophy and a brief celebration; keep event/date claims limited to verified evidence.',
 rank:'Make the actual ranking a visual consequence: a podium, crown exchange or comparison grounded in the narrated placement. Ordinary counts need no extra number graphic.',
 weather:'Use the actual named weather as a moving environment around the cast, with sourced effects and readable captions. A move name such as Make It Rain is a mechanic, not ordinary rainfall.',
 team:'Assemble the resolved roster in an organized composition with actual items. Hold a requested full build long enough to inspect, with all supplied facts intact.',
 neutral:'Continue the actual premise with a relevant source picture, literal prop or independent actor performance. Hold useful information; do not fill time with unrelated images, logos or effects.'};
export function sceneStyleGuidance(scene,project){
 const entities=[...new Map([...(scene.reaction?.entities||[]),...(scene.aiSubjects||[])].map(e=>[e.type+':'+(e.mediaId||e.id||e.name),e])).values()],moves=planMoveEffects({...project,scenes:[scene]});let text=normal(scene.text);
 const names=[...entities.map(e=>({name:normal(e.name),replacement:e.type==='person'?'person':e.type==='pokemon'?'pokemon':'object'})),...moves.map(m=>({name:normal(m.title),replacement:'move'}))].sort((a,b)=>b.name.length-a.name.length);
 for(const n of names)if(n.name)text=(' '+text+' ').split(' '+n.name+' ').join(' '+n.replacement+' ').trim();
 const predictions=predictSceneStyle(text),top=predictions[0],pokemon=entities.filter(e=>e.type==='pokemon'),hasPerson=entities.some(e=>e.type==='person'),performed=moves.some(m=>m.action&&!m.negative),boost=moves.some(m=>m.action&&m.statChanges?.some(c=>c.change>0)&&['user','users-field'].includes(m.target));
 let kind=top.confidence>=.42?top.kind:'neutral';
 if(kind==='battle'&&(!performed||pokemon.length<2))kind=boost?'setup':'neutral';if(kind==='setup'&&!pokemon.length)kind='neutral';if(kind==='person'&&!hasPerson)kind='neutral';if(['pair','team'].includes(kind)&&pokemon.length<2)kind='neutral';if(kind==='move-explainer'&&!moves.length&&!scene.reaction?.categories?.includes('mechanic'))kind='neutral';
 return {kind,confidence:+top.confidence.toFixed(4),modelDigest:model.digest,preferredTreatment:guidance[kind],basis:'Learned local scene choice with factual execution guards; reference editing preference, not a retention prediction'};
}
const clamp=x=>Math.max(0,Math.min(1,x));
export function referenceStyleAssessment(project){
 const relevant=project.scenes.filter(s=>sceneGame(project,s,selectedGame(project))==='pokemon'&&!s.manualTemplate);if(!relevant.length)return {score:0,scenes:0,model:model.digest};
 let score=0;const reports=[];const width=project.format==='horizontal'?1920:1080,height=project.format==='horizontal'?1080:1920;
 for(const s of relevant){const layers=s.layers||[],times=[.22,.5,.78].map(f=>s.start+(s.end-s.start)*f),pictures=layers.filter(l=>['image','video'].includes(l.type)&&l.mediaId&&!['background','environment-depth','shadow','pixel-effect','game-logo'].includes(l.role)),isActive=(l,t)=>visibleRanges(l,s.start,s.end,layers).some(r=>r.start<=t&&r.end>t);
  let area=0,evidence=0,support=0,overlap=0;
  for(const t of times){const active=pictures.filter(l=>isActive(l,t)),actors=active.filter(l=>['subject','narrated-action'].includes(l.role)),boxes=actors.map(l=>artworkBox(l,layers,project.media,t,width,height)).filter(b=>b.opacity>.1);area+=Math.max(0,...boxes.map(b=>clamp(b.w)*clamp(b.h)));support+=Math.max(0,active.length-actors.length);evidence+=Math.max(0,...active.filter(l=>l.sourceMoveCard||l.sourceMoveset).map(l=>clamp(l.width*l.height/.13)));
   if(!s.battlePlan&&!layers.some(l=>l.actionMovie||l.blueprintEffect))for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j],x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));overlap+=x*y/Math.max(.001,Math.min(a.w*a.h,b.w*b.h));}
  }
  const starts=new Set(pictures.map(l=>l.animationStart??l.start)),motion=layers.filter(l=>l.blueprintEffect||l.actionMovie||l.creativeAction||l.actorPerformance||l.narrationEffect||(l.keyframes||[]).some(k=>Math.abs((k.x??l.x)-l.x)>.04||Math.abs(k.rotation||0)>8)).length,first=Math.min(...pictures.filter(l=>(l.opacity??1)>0).map(l=>l.start)),duration=s.end-s.start,hasHold=layers.some(l=>l.sourceMoveCard||l.sourceMoveset||l.role==='instruction-details');
  const values=[clamp(area/3/.22),clamp(evidence/3),clamp(support/3/2),clamp((starts.size+motion)*2/duration),1,0,clamp(overlap/3),pictures.length?1:0,s.start<1&&first>1?1:0,hasHold?1:0,1,pictures.some(l=>l.role==='gameplay')?1:0,clamp(motion/2)];
  const sceneScore=values.reduce((n,v,i)=>n+v*model.rankWeights[i],0);score+=sceneScore;reports.push({sceneId:s.id,score:+sceneScore.toFixed(4),choice:sceneStyleGuidance(s,project).kind});
 }
 return {score:score/relevant.length,scenes:relevant.length,model:model.digest,reports,basis:'Trained editorial preference proxy; structural validation takes priority'};
}
