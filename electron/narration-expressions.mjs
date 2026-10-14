import {noMotion} from './game-presentation.mjs';
import {narrationProp} from './narration-props.mjs';
const norm=s=>String(s||'').toLowerCase().replace(/['\u2019]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
const statsCard=(s,t)=>(s.layers||[]).find(l=>l.start<=t&&l.end>t&&l.setupGraphic?.kind==='stats'&&editable(l));
const blocked=(s,start,end,stats)=>s.manualTemplate||s.battlePlan||(s.layers||[]).some(l=>l!==stats&&l.start<end&&l.end>start&&(['gameplay','chart','narrated-action'].includes(l.role)||l.role==='subject'&&!editable(l)));
export function clearNarrationExpressions(project){
 const next=structuredClone(project);for(const s of next.scenes){if(s.manualTemplate)continue;if(s.expressionSourceLayers){const manual=(s.layers||[]).filter(l=>!editable(l));s.layers=structuredClone(s.expressionSourceLayers).filter(l=>!manual.some(m=>m.id===l.id));s.layers.push(...manual);delete s.expressionSourceLayers;}else s.layers=(s.layers||[]).filter(l=>!l.narrationExpression||!editable(l));}delete next.expressionReport;return next;
}
export function planNarrationExpressions(project){
 const words=project.scenes.flatMap(s=>(s.words||[]).map(w=>({...w,sceneId:s.id}))),mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&project.media.some(a=>a.id===m.mediaId)).sort((a,b)=>a.start-b.start),events=[];
 for(let i=0;i<words.length;i++){
  const w=words[i],phrase=words.slice(i,i+8).map(w=>norm(w.captionText??w.text)).join(' '),before=words.slice(Math.max(0,i-3),i).map(w=>norm(w.text)).join(' '),negative=/\b(?:not|never|no|isnt|arent|without)\b/.test(before),actor=mentions.filter(m=>m.end<=w.start+.04&&w.start-m.end<12).at(-1);
  const paper=/^(?:on paper|in theory)\b/.exec(phrase);if(paper&&!negative){const start=words[i+1]?.start??w.start,change=words.slice(i+2,i+14).find(w=>/^(but|actually|reality|practice)[,.!?]*$/i.test(w.text));events.push({kind:'paper-crumple',start,end:Math.min(project.duration,start+3.5),crumpleAt:Math.max(start+.15,change?.start??start+1.25),quote:paper[0]});i++;continue;}
  if(/^(?:bad|terrible|useless|awful|disappointing)\b/.test(phrase)&&!negative&&actor&&!/^bad (?:for|against|matchup|weather)/.test(phrase))events.push({kind:'sad-face',start:w.start,end:Math.min(project.duration,w.start+1.8),actorId:actor.mediaId,quote:w.text});
  const pair=/^(?:good together|great together|good with|great with|combine with|work(?:s)? (?:well )?together|pair(?:s)? (?:well|with|up)|paired with|partners?|duo|synergy|team up|together)\b/.exec(phrase);
  if(pair&&!negative){const near=mentions.filter(m=>m.start>=w.start-12&&m.start<w.start+3),unique=[...new Map(near.map(m=>[m.mediaId,m])).values()];if(unique.length!==2)continue;const start=Math.max(w.start,...unique.map(m=>m.end)),unrelated=mentions.find(m=>m.start>start+.1&&!unique.some(a=>a.mediaId===m.mediaId)),end=Math.min(project.duration,unrelated?.start??start+5);if(end-start>=.6&&!events.some(e=>e.kind==='pair'&&e.end>start))events.push({kind:'pair',start,end,actorIds:unique.map(m=>m.mediaId),quote:pair[0]});}
 }
 return events.sort((a,b)=>a.start-b.start);
}
export function applyNarrationExpressions(project){
 const next=clearNarrationExpressions(project),events=planNarrationExpressions(next),applied=[],motion=!noMotion(next);
 for(const [i,e] of events.entries()){
  const media=narrationProp(next,e.kind==='paper-crumple'?'paper':'sad');if(e.kind!=='pair'&&!media)continue;let used=false;
  for(const s of next.scenes.filter(s=>s.start<e.end&&s.end>e.start)){
   const start=Math.max(e.start,s.start),end=Math.min(e.end,s.end),stats=e.kind==='sad-face'?statsCard(s,start):undefined;if(blocked(s,start,end,stats))continue;s.expressionSourceLayers??=structuredClone(s.layers||[]);
   const base={id:s.id+'-expression-'+i,narrationExpression:true,start,end,animation:motion?'spring-pop':'none',entranceDuration:.2,exit:'none'};
   if(e.kind==='pair'){
    const originals=e.actorIds.map(id=>s.layers.find(l=>l.role==='subject'&&l.mediaId===id&&editable(l)));
    s.layers=s.layers.flatMap(l=>{if(l.role!=='subject'||!e.actorIds.includes(l.mediaId)||!editable(l)||l.end<=start||l.start>=end)return [l];return [...(l.start<start?[{...l,end:start}]:[]),...(l.end>end?[{...l,id:l.id+'-after-pair',start:end,animation:'none'}]:[])];});
    for(const [j,id] of e.actorIds.entries()){const old=originals[j];s.layers.push({...old,...base,id:base.id+'-'+j,type:'image',role:'subject',mediaId:id,x:j?.53:.04,y:.24,width:.43,height:.38,z:35+j,fit:'contain',keyframes:motion?[{time:e.start,scale:.92,y:.27},{time:e.start+.25,scale:1,y:.24},{time:e.end,scale:1.025,y:.24}]:undefined,referenceContinuation:start>e.start});}
   }else if(e.kind==='paper-crumple')s.layers.push({...base,type:'group',role:'expression-effect',mediaId:media.id,effectResultMediaId:narrationProp(next,'crumpled-paper')?.id,narrationEffect:'paper-crumple',effectStart:e.start,effectEnd:e.end,expressionMotion:motion,crumpleAt:e.crumpleAt,x:.66,y:.12,width:.29,height:.29,z:8,opacity:.88,animation:'none'});
   else {
    const actor=s.layers.find(l=>l.mediaId===e.actorId&&l.role==='subject'&&l.start<=start&&l.end>start);if(!actor)continue;
    if(stats){const width=Math.min(.115,stats.width*.20),height=Math.min(.085,stats.height*.25);s.layers.push({...base,type:'image',role:'expression-effect',mediaId:media.id,x:stats.x+stats.width-width-.012,y:stats.y+.008,width,height,z:Math.max(72,stats.z+3),fit:'contain',end:Math.min(end,stats.end)});e.placement='stats';}
    else {const head=next.media.find(m=>m.id===e.actorId)?.headAnchor||{x:.5,y:.24};s.layers.push({...base,type:'image',role:'expression-effect',mediaId:media.id,x:actor.x+actor.width*head.x-.055,y:actor.y+actor.height*head.y-.045,width:.11,height:.09,z:actor.z+3,fit:'contain',attachment:{targetId:actor.id,anchor:'face',x:head.x,y:head.y,size:.26}});e.placement='actor-face';}
   }
   used=true;
  }if(used)applied.push(e);
 }
 next.expressionReport={version:1,events:applied,sounds:applied.map(e=>({start:e.kind==='paper-crumple'&&motion?e.crumpleAt:e.start,cue:e.kind==='paper-crumple'&&motion?'swish':'pop',priority:10,reason:'Narrated '+e.kind})),notice:'Literal phrase interpretation and illustrative interactions; negated claims and authored evidence are protected.'};return next;
}
