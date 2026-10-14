import {sourceMechanicCues} from './source-move-cards.mjs';
import {findMechanicImage} from './mechanic-images-policy.mjs';
import {noMotion} from './game-presentation.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {moveContext} from './move-context.mjs';
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
const disabled=p=>p.autoLayeredActivity===false||/\b(?:sparse|minimal effects|no extra pokemon|no supporting cast)\b/i.test(p.editingInstructions||'');
export async function acquireMoveCast(project,{usage,resolve,image,progress=()=>{},check=()=>{}}){
 const next={...project,media:[...project.media],moveCastPlan:[],moveCastWarnings:[]};if(disabled(next))return next;
 let roster;
 for(const cue of sourceMechanicCues(project).filter(c=>c.kind==='move')){
  check();const s=project.scenes.find(s=>s.id===cue.sceneId),data=project.shortMechanics?.cues.find(c=>c.kind==='move'&&c.name===cue.name),learners=data?.learnedByPokemon;
  if(!learners?.length||!findMechanicImage(next,'move',cue.title))continue;
  if(!moveContext(project,cue).showLearners||s.manualTemplate||s.battlePlan)continue;
  const known=next.media.filter(m=>m.pokemon&&learners.includes(m.pokemon.name)),selected=known.slice(0,4).map(m=>({name:m.pokemon.name,mediaId:m.id,source:data.source}));
  if(selected.length<3&&usage){roster??=await usage.load(next);if(roster.warning)next.moveCastWarnings.push(roster.warning);
   for(const entry of roster.rows||[]){if(selected.length>=4)break;let name;try{name=await resolve(entry.name);}catch{continue;}if(!learners.includes(name)||selected.some(a=>a.name===name))continue;
    try{check();progress({stage:'Finding '+entry.name+' as a sourced '+cue.title+' example'});const m=await image(name,s,next);if(!m)continue;if(!next.media.some(a=>a.id===m.id))next.media.push(m);selected.push({name,mediaId:m.id,source:data.source,usageSource:roster.source,usageFormat:roster.format,usageMonth:roster.month});}catch(e){check();next.moveCastWarnings.push(entry.name+': '+e.message);}
   }
  }
  if(selected.length>=2)next.moveCastPlan.push({sceneId:s.id,start:cue.start,end:s.end,move:cue.name,title:cue.title,examples:selected,notice:'Published-format usage selects examples; PokeAPI verifies general learnability. This does not assert current game or regulation legality.'});
 }
 return next;
}
export function clearExplanationCast(project){const next=structuredClone(project);for(const s of next.scenes){if((s.layers||[]).some(l=>l.explanationCast&&!editable(l)))continue;s.layers=(s.layers||[]).filter(l=>!l.explanationCast||!editable(l));for(const l of s.layers)if(l.explanationCastRanges&&!s.layers.some(a=>a.explanationCast&&!editable(a)&&a.start<l.end&&a.end>l.start)){l.excludedRanges=(l.excludedRanges||[]).filter(r=>!l.explanationCastRanges.some(a=>a.start===r.start&&a.end===r.end));delete l.explanationCastRanges;}}delete next.explanationCastReport;return next;}
export function applyExplanationCast(project){
 const next=clearExplanationCast(project),events=[];if(disabled(next))return next;
 for(const plan of next.moveCastPlan||[]){const s=next.scenes.find(s=>s.id===plan.sceneId);if(!moveContext(next,{...plan,name:plan.move}).showLearners||!s||s.manualTemplate||s.layers.some(l=>l.explanationCast&&!editable(l)&&l.start<plan.end&&l.end>plan.start))continue;const card=s.layers?.find(l=>l.sourceMoveCard&&next.media.find(m=>m.id===l.mediaId)?.moveCard?.name&&clean(next.media.find(m=>m.id===l.mediaId).moveCard.name)===clean(plan.title)&&l.start<=plan.start+.02&&l.end>plan.start);if(!card)continue;
  const end=Math.min(plan.end,card.end),bottom=next.captionStyle?.enabled===false?.89:1-(next.captionStyle?.bottom??.13)-.13,top=Math.max(.27,card.y+card.height+.025),rows=plan.examples.length>2?2:1,h=Math.min(.21,(bottom-top-.025)/rows);if(h<.1||end-plan.start<.8)continue;
  for(const actor of s.layers.filter(l=>['subject','supporting-image'].includes(l.role)&&editable(l)&&l.start<end&&l.end>plan.start)){const ranges=visibleRanges(actor,Math.max(actor.start,plan.start),Math.min(actor.end,end),s.layers);actor.excludedRanges=[...(actor.excludedRanges||[]),...ranges];actor.explanationCastRanges=ranges;}
  const focusWords=s.words.filter(w=>w.start>=plan.start+.8&&w.start<end-.45&&/^(?:slower|faster|first|order|reverse|reverses|speed)[,.!?]*$/i.test(w.text));
  plan.examples.forEach((example,i)=>{const start=plan.start+i*.22;if(end-start<.5)return;const id=s.id+'-move-cast-'+plan.move+'-'+i,keyframes=[];if(!noMotion(next))for(const [j,w] of focusWords.entries()){if(i!==j%plan.examples.length)continue;keyframes.push({time:w.start,scale:1,rotation:0},{time:w.start+.25,scale:1.09,rotation:i%2?-3:3},{time:Math.min(end,w.start+.6),scale:1,rotation:0});events.push({sceneId:s.id,layerId:id,start:w.start,end:Math.min(end,w.start+.6),cue:'click',priority:7,reason:'Character emphasis follows the narrated '+w.text+' explanation'});}
   s.layers.push({id,explanationCast:true,type:'image',role:'supporting-image',mediaId:example.mediaId,x:i%2?.54:.06,y:top+Math.floor(i/2)*(h+.025),width:.4,height:h,z:38,start,end,fit:'contain',easing:'smooth',animation:noMotion(next)?'none':'slide-in-out',direction:i%2?'right':'left',entranceDuration:.22,exit:'fade',exitDuration:.18,...(keyframes.length?{keyframes}:{})});events.push({sceneId:s.id,layerId:id,start,end,cue:'pop',priority:8,reason:'Verified '+example.name+' example of '+plan.title});});
 }
 next.explanationCastReport={events,examples:(next.moveCastPlan||[]).length};return next;
}
