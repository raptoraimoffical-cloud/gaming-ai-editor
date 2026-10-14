const cues=[['victory',/\b(?:win|wins|winning|won|victory|champion|winner)\b/i],['impact',/\b(?:attack|attacks|hit|hits|strike|punch|damage|battle|fight|explosion)\b/i],['click',/\b(?:choose|select|switch|pick|button|menu|click)\b/i],['reveal',/\b(?:reveal|introducing|announced|new|number|rank|ranking|best|first)\b/i]];
import {projectGame} from './game-presentation.mjs';
import {sceneGameAt} from './game-selection.mjs';
export function automaticSounds(project,library){
 if(project.autoSoundEffects===false||/\b(?:no|without|disable|remove)\s+(?:the\s+|automatic\s+)?(?:sound effects?|sfx)\b/i.test((project.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'')))return {...project,soundEffects:(project.soundEffects||[]).filter(f=>!f.auto||f.cue==='pokemon-cry')};
 const pool=[...new Map([...library,...project.media].map(m=>[m.id,m])).values()].filter(m=>m.kind==='audio'&&m.assetRole==='sound-effect'&&m.license&&m.duration>0);
 const manual=(project.soundEffects||[]).filter(f=>!f.auto||['pokemon-cry','minecraft-action'].includes(f.cue)),events=[];
 const game=projectGame(project);
 const dense=project.shortStyle==='pokemon-dense',busy=!!project.shortStyle||game==='pokemon'||game==='minecraft';
 if(dense){
  events.push(...(project.shortStyleReport?.soundBeats||[]));
  for(const scene of project.scenes)for(const l of scene.layers||[])if(l.attachment&&l.role==='item'&&!l.manual&&!l.referenceContinuation)events.push({cue:'reveal',start:l.start,reason:'Planned held-item reveal'});
 }
 else if(project.shortStyle==='pokemon-setup'){
  let lastSubject='',lastCard='',lastClip='';
  for(const shot of project.shortStyleReport?.shots||[]){
   const subject=shot.subjects.map(s=>s.mediaId).join('|'),card=shot.card?.title||'',clip=shot.clip?.mediaId||'';
   if(subject!==lastSubject&&!shot.clip)events.push({cue:'whoosh',start:shot.start,reason:'Planned artwork reveal'});
   if(card&&card!==lastCard)events.push({cue:'reveal',start:shot.start,reason:'Planned '+card+' card reveal'});
   if(clip&&clip!==lastClip)events.push({cue:'click',start:shot.start,reason:'Cut to matched gameplay evidence'});
   lastSubject=subject;lastCard=card;lastClip=clip;
  }
 }
 else{
 for(const scene of project.scenes){
  if(scene.editorialPlanApplied&&scene.editorialPlan?.sound&&scene.editorialPlan.sound!=='none')events.push({cue:scene.editorialPlan.sound,start:Math.min(scene.end-.05,scene.start+.18),reason:'AI editorial sound accent: '+scene.editorialPlan.reason});
  for(const word of scene.words||[]){const cue=cues.find(([,re])=>re.test(word.text));if(cue)events.push({cue:cue[0],start:word.start,reason:'Narration cue: '+word.text});}
  for(const l of scene.layers||[])if(['subject','game-logo'].includes(l.role)&&l.start<scene.end&&!l.referenceContinuation)events.push({cue:l.role==='game-logo'?'reveal':'whoosh',start:l.start,reason:l.role+' entrance'});
  if(scene.start>0)events.push({cue:'whoosh',start:scene.start,reason:'Scene transition'});
 }
 }
 for(const s of project.scenes)if(!s.manualTemplate)for(const w of s.words||[])if(/^(?:choose|select|switch|pick|click)[,.!?]*$/i.test(w.text))events.push({cue:'click',start:w.start,priority:5,reason:'Narrated game selection: '+w.text});
 for(const cue of project.gamePresentationReport?.introImages||[])events.push({cue:'pop',start:cue.start,reason:'Planned intro picture'});
 for(const c of project.reactionGifPlan||[])if(project.scenes.some(s=>s.layers?.some(l=>l.role==='reaction-gif'&&l.mediaId===c.mediaId&&l.start===c.start)))events.push({cue:c.sound,start:c.start,end:c.end,priority:10,reason:'Planned '+c.kind+' reaction GIF'});
 for(const c of project.engagementReport?.cues||[])events.push(c);
 for(const c of [...(project.moveEffectReport?.sounds||[]),...(project.battleReport?.sounds||[])])events.push(c);
 for(const c of [...(project.actionMovieReport?.sounds||[]),...(project.expressionReport?.sounds||[]),...(project.performanceReport?.sounds||[]),...(project.creativeActionReport?.sounds||[]),...(project.hookReport?.events||[]),...(project.cadenceReport?.events||[]),...(project.layeredActivityReport?.events||[]).filter(e=>e.cue)])events.push(c);
 for(const c of project.storyShotReport?.events||[])events.push({...c,priority:7,reason:c.reason||'Narrated story picture: '+c.kind});
 for(const c of [...(project.explanationCastReport?.events||[]),...(project.counterDiagramReport?.events||[]),...(project.rankPodiumReport?.events||[])])events.push(c);
 // Cues follow the actual delivered visuals, including callouts and item
 // reveals. Continuations never replay an entrance sound at a sentence cut.
 for(const s of project.scenes)if(!s.manualTemplate)for(const l of s.layers||[])if((!l.manual||l.autoItem)&&!l.silentEntrance&&!l.referenceContinuation&&['subject','game-logo','item','move-callout','mechanic-card','type-icon','story-picture','reaction-gif','creative-stage-prop','creative-prop'].includes(l.role))events.push({start:l.start,cue:['move-callout','mechanic-card','type-icon'].includes(l.role)&&game==='pokemon'?'click':'pop',priority:6,reason:'Actual '+l.role+' reveal'});
 if(game==='pokemon')for(const s of project.scenes)for(const [i,w] of (s.words||[]).entries()){
  const phrase=s.words.slice(i,i+7).map(w=>w.captionText??w.text).join(' '),before=s.words.slice(Math.max(0,i-3),i).map(w=>w.text).join(' ');
  if(!/\b(?:not|never|without|cannot|cant|doesnt)\b/i.test(before.replace(/'/g,''))&&/^(?:(?:boosts?|boosted|boosting|raises?|raised|increases?|increased) (?:its? |their |the |his |her )?(?:special )?(?:stats?|attack|defense|speed)|(?:stats?|attack|defense|speed) (?:gets? |is |are )?(?:boosted|raised|increased))\b/i.test(phrase))events.push({start:w.start,cue:'stat-boost',priority:14,reason:'Narrated stat boost'});
 }
 for(const c of project.pixelEffectReport?.events||[])if(c.cue)events.push(c);
 for(const c of project.transitionSoundPlan||[])events.push(c);for(const c of project.sceneBlueprintReport?.soundBeats||[])events.push(c);
 if(!project.battleReport?.sounds?.length)for(const s of project.scenes)if(s.battlePlan){const b=s.battlePlan;events.push({cue:'whoosh',start:b.at+b.duration*.18,priority:9,reason:'Battle lunge or projectile'}, {cue:'impact',start:b.at+b.duration*.45,priority:9,reason:'Battle contact'});}
 const effects=[],media=new Map(project.media.map(m=>[m.id,m]));
 for(const e of events)if(e.priority===undefined&&/^(?:Planned|Cut to)/.test(e.reason||''))e.priority=8;
 let reveals=0;
 for(const original of events.sort((a,b)=>a.start-b.start||(b.priority||0)-(a.priority||0))){
  const event={...original};
  const scene=project.scenes.find(s=>s.start<=event.start&&s.end>event.start),game=scene?sceneGameAt(project,scene,event.start,projectGame(project)):projectGame(project);
  if(game==='pokemon'&&event.cue==='pop'&&(event.kind==='actor-focus'||/Planned .*graphic change/.test(event.reason||'')))event.cue='click';
  // A reveal pop must not consume the space reserved for the narrated beam or
  // contact. Those sounds are part of the authored action, not generic accents.
  if((event.priority||0)<12&&events.some(e=>(e.priority||0)>=12&&(e.priority||0)>(event.priority||0)&&Math.abs(e.start-event.start)<(busy?.4:.85)))continue;
  const deliberate=/Animated story performance phase/.test(event.reason||'')||event.cue==='whoosh'&&/Animated|Opening cast|Battle|Scene transition|Narrated (?:action|physical|special|creative|rain|snow)|Sourced prop/.test(event.reason||'')||event.cue==='impact'&&/Battle|Narration cue:|Narrated action/.test(event.reason||'');
  if(['whoosh','reveal','victory','impact'].includes(event.cue)&&!deliberate&&!project.scenes.some(s=>s.battlePlan&&s.start<=event.start&&s.end>event.start)){event.cue=game==='pokemon'&&++reveals%3===0?'click':'pop';}
  const phase=/Animated story performance phase|Sourced prop leaves|Prop caught|Animated prop handoff|Creative action payoff|Planned creative contact|Narrated action contact|attack travel|Battle contact/i.test(event.reason||''),gap=busy&&phase?.14:busy?.22:.65;
  if(effects.length>=Math.max(3,Math.ceil(project.duration/(busy?.45:1.2)))||event.start<0||event.start>=project.duration||manual.some(f=>!(f.auto&&f.cue==='pokemon-cry')&&Math.abs(f.start-event.start)<(busy?.22:.65))||effects.some(f=>Math.abs(f.start-event.start)<gap))continue;
  const aliases={coin:'coin|metallic|click', 'stat-boost':'stat.?boost|stat.?rise|stat.?increase',fire:'fire|flame|burn',electric:'electric|zap|spark',splash:'splash|water',ice:'ice|freeze|crackle',boing:'boing|comic|bounce',pop:'pop|reveal',chatter:'chatter|chattering',whoosh:'whoosh|swoosh|swish|transition',reveal:'reveal|pop',impact:'impact|hit|punch|explosion|laser',click:'click|menu|select|button|ding',victory:'victory|success|win|fanfare'};
  const matches=pool.filter(m=>(!m.identity?.franchise||['unknown',game].includes(m.identity.franchise))&&new RegExp('(?:^|[^a-z])(?:'+(aliases[event.cue]||event.cue)+')(?:[^a-z]|$)','i').test(m.tags+' '+m.name));
  const exactPop=event.cue==='pop'?matches.filter(m=>/\bpop\b/i.test(m.name+' '+m.tags)):[];
  const gameClick=['click','stat-boost','impact','victory'].includes(event.cue)&&game==='pokemon'?matches.filter(m=>m.identity?.franchise==='pokemon'):[];
  const air=event.cue==='whoosh'?matches.filter(m=>/^generated-(?:swoosh|swish)-v2$/.test(m.id)):[];
  const preferred=matches.filter(m=>!m.id.startsWith('generated-')),choices=gameClick.length?gameClick:exactPop.length?exactPop:air.length?air:preferred.length?preferred:matches,used=effects.filter(f=>f.cue===event.cue).length,chosen=choices[used%Math.max(1,choices.length)];if(!chosen)continue;
  media.set(chosen.id,chosen);effects.push({mediaId:chosen.id,start:event.start,end:Math.min(project.duration,event.end??project.duration,event.start+Math.min(['stat-boost','chatter','fire','electric','splash','ice'].includes(event.cue)?1.6:busy?.65:2,chosen.duration)),volume:['stat-boost','chatter','fire','electric','splash','ice'].includes(event.cue)?.09:event.cue==='impact'?.10:busy?.13:.16,auto:true,cue:event.cue,reason:event.reason});
 }
 return {...project,media:[...media.values()],soundEffects:[...manual,...effects].sort((a,b)=>a.start-b.start),soundEffectReport:{automatic:effects.length,manual:manual.length,cues:effects.map(f=>({start:f.start,cue:f.cue,reason:f.reason}))}};
}
