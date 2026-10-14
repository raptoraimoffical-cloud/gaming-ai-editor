import {planMoveEffects,TYPE_COLORS} from './move-effects.mjs';
import {narrationProp} from './narration-props.mjs';
import {noMotion} from './game-presentation.mjs';
import {motionFor,propertyAt} from './layer-motion.mjs';
import {combatAttacker,combatDefender,combatProjectile,moveArtwork,COMBAT_PHASES} from './combat-motion.mjs';
import {findMechanicImage,sourceMechanicGeometry} from './mechanic-images-policy.mjs';
import {moveContext} from './move-context.mjs';
const norm=s=>String(s||'').toLowerCase().replace(/['\u2019]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
export function clearActionMovie(project){
 const next=structuredClone(project);
 for(const s of next.scenes){if(s.manualTemplate)continue;if(s.actionMovieSourceLayers){const protectedLayers=(s.layers||[]).filter(l=>!editable(l));s.layers=structuredClone(s.actionMovieSourceLayers).filter(l=>!protectedLayers.some(p=>p.id===l.id));s.layers.push(...protectedLayers);delete s.actionMovieSourceLayers;}else s.layers=(s.layers||[]).filter(l=>!l.actionMovie||!editable(l));}
 delete next.actionMovieReport;return next;
}
export function planNarratedActions(project){
 const words=project.scenes.flatMap(s=>(s.words||[]).map(w=>({...w,sceneId:s.id}))),mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&project.media.some(a=>a.id===m.mediaId)).sort((a,b)=>a.start-b.start),plans=[],candidates=[];
 const named=planMoveEffects(project).filter(c=>c.action&&c.damageClass!=='status');
 for(const c of named){const i=words.findIndex(w=>Math.abs(w.start-c.start)<.02);if(i<0)continue;const context=moveContext(project,c),verb=words.slice(Math.max(0,i-7),i).filter(w=>/^(uses?|used|using|attacks?|hits?|fires?|unleashes?|launches?|clicks?|spams?|checks?|counters?|threatens?|threatened|beats?)[,.!?]*$/i.test(w.text)).at(-1);if(context.kind==='matchup'&&(verb||context.action))candidates.push({index:i,at:c.start,verbAt:verb?.start??context.verbAt,move:c,context,quote:c.title,outcome:context.outcome});}
 for(let i=0;i<words.length;i++){
  const phrase=words.slice(i,i+6).map(w=>norm(w.text)).join(' '),hit=/^(?:checks?|counters?|threatens?|beats?|one shot|oneshot|one shots|one shotting|ohko|knock(?:s)? out|knock(?:s)? .+? out|wipe(?:s)? out|shoot(?:s)? (?:a )?beam|(?:uses?|launches?) (?:a )?(?:physical|special) attack)\b/.exec(phrase);
  if(hit&&!named.some(c=>Math.abs(c.start-words[i].start)<3))candidates.push({index:i,at:words[i].start,verbAt:words[i].start,quote:hit[0],explicitClass:/special|beam/.test(hit[0])?'special':'physical',outcome:/one.?shot|ohko|knock|wipe/.test(hit[0])?'faint':'recoil'});
 }
 for(const c of candidates.sort((a,b)=>a.at-b.at)){
  const i=c.index,clauseStart=words.filter(w=>w.end<=c.verbAt&&/[.!?]$/.test(w.text)).at(-1)?.end??0,before=words.filter(w=>w.start>=Math.max(clauseStart,c.verbAt-2)&&w.start<c.verbAt).map(w=>norm(w.text)).join(' ');if(/\b(?:not|never|cannot|cant|without|doesnt)\b/.test(before))continue;
  const recent=mentions.filter(m=>m.end<=c.verbAt+.04&&c.verbAt-m.end<26),closest=recent.at(-1);
  const relative=closest&&closest.start>=clauseStart&&/\b(?:who|which|whom|that) (?:he|she|it|they)\b/.test(words.filter(w=>w.start>=closest.end&&w.start<c.verbAt).map(w=>norm(w.text)).join(' '));
  const continuation=c.context?.passiveReception&&plans.filter(p=>c.at-p.spokenAt<7).at(-1),previousMove=continuation||c.move&&plans.filter(p=>p.moveName===c.move.name&&c.at-p.spokenAt<30).at(-1),contextAttacker=(continuation||c.context?.outcome==='ineffective'&&previousMove)?recent.find(m=>m.mediaId===previousMove.attackerId):recent.find(m=>m.mediaId===c.context?.attackerId);
  const relativeTarget=relative?closest:undefined,attacker=relativeTarget?recent.filter(m=>m.mediaId!==relativeTarget.mediaId).at(-1):contextAttacker||recent.filter(m=>c.verbAt-m.end<12).at(-1);if(!attacker)continue;
  const attackers=[attacker];
  // Only join explicitly coordinated subjects in the attack's own clause.
  // A previously mentioned opponent elsewhere is never recruited as a teammate.
  const sameClause=mentions.filter(m=>m.start>=clauseStart&&m.end<=attacker.start&&attacker.start-m.end<5).reverse();
  for(const previous of sameClause){const current=attackers[0],bridge=words.filter(w=>w.start>=previous.end&&w.end<=current.start+.02).map(w=>norm(w.text)).join(' ');if(previous.mediaId===current.mediaId||! /^(?:(?:and|plus|alongside|together with|as well as|with)(?: mega)?|mega)$/.test(bridge))break;attackers.unshift(previous);if(attackers.length===2)break;}
  const attackerIds=[...new Set(attackers.map(m=>m.mediaId))];
  const sentenceEnd=words.find(w=>w.start>=c.verbAt&&/[.!?]$/.test(w.text))?.end??c.at+4;
  const following=mentions.filter(m=>m.start>c.verbAt&&m.start<c.at+4&&m.start<sentenceEnd&&!attackerIds.includes(m.mediaId)),priorTargets=[...new Map(mentions.filter(m=>m.end<=c.verbAt&&c.verbAt-m.end<12&&!attackerIds.includes(m.mediaId)).map(m=>[m.mediaId,m])).values()],context=words.filter(w=>w.start>=clauseStart&&w.start<sentenceEnd).map(w=>norm(w.text)).join(' '),consequence=words.filter(w=>w.start>=sentenceEnd).slice(0,6).map(w=>norm(w.text)).join(' ');
  const defender=following[0]||relativeTarget||(continuation?mentions.find(m=>m.mediaId===continuation.defenderId&&m.start<c.at):c.context?.outcome==='ineffective'?recent.filter(m=>m.mediaId!==attacker.mediaId).at(-1):mentions.find(m=>m.mediaId===c.context?.defenderId&&m.start<c.at+4))||(/\b(?:it|them|that pokemon|the opponent|on|at|against|checks?|counters?|threatens?|threatened|beats?)\b/.test(context)&&priorTargets.length===1?priorTargets[0]:undefined);if(!defender||following.length>1&&following[1].start-defender.start<.5)continue;
  const start=Math.max(c.at,defender.end),nextAction=candidates.find(n=>n.at>start+1.2&&n.move&&n.context?.action),end=Math.min(project.duration,start+(attackerIds.length>1?2.45:2.1),nextAction?.at??project.duration);if(end-start<1.2||plans.some(p=>p.end>start)||project.scenes.some(s=>s.start<end&&s.end>start&&(s.manualTemplate||s.battlePlan||(s.layers||[]).some(l=>['gameplay','chart'].includes(l.role)&&l.start<end&&l.end>start)||s.layers?.some(l=>[...attackerIds,defender.mediaId].includes(l.mediaId)&&['subject','narrated-action'].includes(l.role)&&!editable(l)))))continue;
  const outcome=c.outcome||(/\b(?:one shot|oneshot|ohko|faints?|knock(?:s)? out)\b/.test(context)||/^(?:it|the opponent|the target) (?:then )?(?:faints?|is knocked out)\b/.test(consequence)?'faint':'recoil'),nextTarget=mentions.find(m=>m.mediaId===defender.mediaId&&m.start>end),scene=project.scenes.find(s=>s.start<=start&&s.end>start),pokemon=project.media.find(m=>m.id===attacker.mediaId)?.pokemon;
  const type=c.move?.type||pokemon?.types?.[0]||'normal',damageClass=c.move?.damageClass||c.explicitClass||'physical',effect=c.move?.name==='leaf-storm'?'leaf-storm':damageClass==='physical'?'contact-hit':c.move?.name==='thunderbolt'?'thunderbolt':c.move?.name==='flamethrower'?'flamethrower':'energy-beam';
  const real=moveArtwork(project,c.move?.name),prop=real||narrationProp(project,effect==='leaf-storm'?'leaf':effect==='thunderbolt'?'lightning':effect==='flamethrower'?'fire':'target');
  plans.push({sceneId:scene.id,start,end,duration:end-start,holdEnd:outcome==='faint'?Math.max(end,nextTarget?.start??project.duration):end,attackerId:attacker.mediaId,attackerIds,attackerTypes:attackerIds.map(id=>c.move?.type||project.media.find(m=>m.id===id)?.pokemon?.types?.[0]||'normal'),defenderId:defender.mediaId,outcome,quote:c.quote,spokenAt:c.at,moveName:c.move?.name,damageClass,type,color:TYPE_COLORS[type],effect:real?'move-image':effect,effectMediaId:prop?.id,realMoveAsset:!!real,source:c.move?.source,reason:c.move?'Choreography uses sourced move type and damage class; not a damage calculation.':'Illustrative '+damageClass+' action; move unspecified, color uses the attacker primary type.'});
 }return plans;
}
export function applyActionMovie(project){
 const next=clearActionMovie(project);
 if(noMotion(next)||/\b(?:no|without|avoid)\s+(?:pokemon\s+)?(?:battles?|attacks?)\b/i.test(next.editingInstructions||''))return next;
 const plans=planNarratedActions(next),sounds=[];
 for(const [index,p] of plans.entries()){
  const sourceAt=(id,time)=>{const scene=next.scenes.find(s=>s.start<=time&&s.end>time),l=scene?.layers?.find(l=>l.mediaId===id&&l.role==='subject'&&l.start<=time&&l.end>time);if(!l)return undefined;const m=motionFor(l,time);return {id:l.id,x:m.x+m.dx,y:m.y+m.dy,rotation:m.rotation,scale:m.scale,opacity:m.opacity,width:propertyAt(l,'width',time),height:propertyAt(l,'height',time)};};
  const poses=new Map([...p.attackerIds,p.defenderId].map(id=>[id,{initial:sourceAt(id,p.start),final:sourceAt(id,p.end)}]));
  const card=p.moveName&&moveContext(next,{name:p.moveName,title:p.moveName.replaceAll('-',' '),start:p.spokenAt}).showCard&&(findMechanicImage(next,'move',p.moveName.replaceAll('-',' '))||next.media.find(m=>m.kind==='image'&&m.effectMoveName===p.moveName&&m.moveArtLayout==='reference'&&m.moveArtInspection?.accepted)),cardBottom=card?sourceMechanicGeometry(card,'move',next).height+.075:0;
  const caption=next.captionStyle||{},canvasHeight=next.format==='horizontal'?1080:1920,bottom=caption.enabled===false?.93:1-(caption.bottom??.13)-Math.max(.06,((caption.fontSize??46)*2.8+20)/canvasHeight)-.025;
  const stageY=Math.max(.29,cardBottom),stageHeight=Math.max(.14,Math.min(card?.32:.40,bottom-stageY-.015)),at=f=>p.start+f*p.duration;
  for(const s of next.scenes.filter(s=>s.end>p.start&&s.start<p.holdEnd)){
  s.actionMovieSourceLayers??=structuredClone(s.layers||[]);const start=Math.max(s.start,p.start),end=Math.min(s.end,p.end),holdEnd=Math.min(s.end,p.holdEnd);
  const output=[];
  for(const l of s.layers||[]){const involved=l.role==='subject'&&[...p.attackerIds,p.defenderId].includes(l.mediaId)&&editable(l);
   const cutoff=l.mediaId===p.defenderId&&p.outcome==='faint'?p.holdEnd:p.end;
   if(!involved||l.end<=p.start||l.start>=cutoff){output.push(l);continue;}
   if(l.start<p.start)output.push({...l,end:p.start});
   if(l.end>cutoff)output.push({...l,id:l.id+'-after-action',start:cutoff,animation:'none',referenceContinuation:true});
  }s.layers=output.flatMap(l=>{if(!l.autoMoveEffect||l.role!=='move-effect'||l.end<=p.start||l.start>=p.end)return [l];return [...(l.start<p.start?[{...l,end:p.start}]:[]),...(l.end>p.end?[{...l,id:l.id+'-after-action',start:p.end}]:[])];});
  const base={type:'image',actionMovie:true,role:'narrated-action',fit:'contain',animation:'none',exit:'none',easing:'smooth',width:.42,height:stageHeight,y:stageY};
  if(end>start)for(const [j,id] of p.attackerIds.entries()){const height=p.attackerIds.length>1?(stageHeight-.015)/2:stageHeight,y=p.attackerIds.length>1?stageY+j*(height+.015):stageY,width=p.attackerIds.length>1?.36:.42,delay=j*.08;
   s.layers.push({...base,id:s.id+'-action-'+index+'-attacker-'+j,actorSourceId:poses.get(id)?.initial?.id,mediaId:id,x:.035,y,width,height,z:31+j,start,end,keyframes:combatAttacker({start:p.start,duration:p.duration,x:.035,y,contactX:p.damageClass==='physical'?.35:.055,physical:p.damageClass==='physical',delay,geometry:{width,height},...poses.get(id)})});}
  if(end>start)s.layers.push({...base,id:s.id+'-action-'+index+'-defender',actorSourceId:poses.get(p.defenderId)?.initial?.id,mediaId:p.defenderId,flipX:true,x:.54,z:32,start,end,keyframes:combatDefender({start:p.start,duration:p.duration,x:.54,y:stageY,geometry:{width:.42,height:stageHeight},faint:p.outcome==='faint',ineffective:p.outcome==='ineffective',resisted:p.outcome==='resisted',secondContact:p.attackerIds.length>1,...poses.get(p.defenderId)})});
  const effect=(name,from,to,box,keys,suffix='')=>{const a=Math.max(s.start,from),b=Math.min(s.end,to);if(b-a<.02)return;const l={id:s.id+'-action-'+index+'-'+name+suffix,type:'group',actionMovie:true,role:'battle-effect',battleEffect:name,battleEffectStart:from,battleEffectEnd:to,effectColor:p.color,mediaId:name===p.effect?p.effectMediaId:undefined,...box,z:80,start:a,end:b,animation:'none',exit:'none',easing:'smooth',...(keys?{keyframes:keys}:{})};s.layers.push(l);return l;};
  const hitY=stageY+stageHeight*.45-.09;
  for(const [j,id] of p.attackerIds.entries()){
   const delay=j*.08,y=p.attackerIds.length>1?stageY+(j+.5)*(stageHeight+.015)/2-.08:hitY;
   effect('charge',at(.20+delay),at(.34+delay),{x:.24,y,width:.16,height:.13},undefined,'-'+j);
   if(p.damageClass==='special'){const layer=effect(p.effect,at(.31+delay),at(.52+delay),{x:.24,y,width:.34,height:p.effect==='leaf-storm'?.27:.16},combatProjectile(p.start,p.duration,delay,y,hitY),'-'+j);if(layer)layer.effectColor=TYPE_COLORS[p.attackerTypes[j]];}
   else effect('speed-trail',at(.31+delay),at(.46+delay),{x:.12,y,width:.40,height:.16},undefined,'-'+j);
   if(p.outcome!=='ineffective')effect('impact',at(.46+delay),at(.60+delay),{x:.56,y:hitY-.04,width:.27,height:.23},undefined,'-'+j);
   if(p.outcome!=='ineffective')effect('shockwave',at(.47+delay),at(.69+delay),{x:.54,y:hitY-.04,width:.30,height:.23},undefined,'-'+j);
  }
  if(p.damageClass==='physical'&&p.outcome!=='ineffective')effect('contact-hit',at(.46),at(.56),{x:.51,y:hitY-.03,width:.28,height:.23});
  if(p.outcome==='faint')effect('faint-stars',at(.60),p.end,{x:.60,y:stageY-.04,width:.24,height:.20});
  const screen={fire:'screen-fire',electric:'electric-storm',water:'water-splash',ice:'ice-freeze',grass:'leaf-burst',psychic:'psychic-wave'}[p.type],screenStart=Math.max(s.start,at(.46)),screenEnd=Math.min(s.end,at(.86));
  if(p.outcome!=='ineffective'&&screen&&screenEnd-screenStart>.02)s.layers.push({id:s.id+'-action-'+index+'-element-impact',type:'group',role:'move-effect',actionMovie:true,moveEffect:screen,moveEffectStart:at(.46),moveEffectEnd:at(.86),mediaId:narrationProp(next,{fire:'fire',electric:'lightning',water:'water',ice:'ice',grass:'leaf'}[p.type])?.id,x:0,y:0,width:1,height:1,z:76,start:screenStart,end:screenEnd,animation:'none',exit:'none',opacity:.65});
  }
 }
 for(const p of plans)for(const [j,id] of p.attackerIds.entries()){const delay=j*.08;sounds.push({start:p.start+p.duration*(COMBAT_PHASES.launch+delay),cue:'whoosh',priority:12,reason:'Narrated '+p.damageClass+' attack travel'});if(p.outcome!=='ineffective')sounds.push({start:p.start+p.duration*(COMBAT_PHASES.contact+delay),cue:'impact',priority:13,reason:'Narrated action contact'});}
 next.actionMovieReport={version:3,phases:COMBAT_PHASES,plans,sounds,notice:'Smooth illustrative cutout choreography; not articulated character animation, game simulation or verified move legality/damage.'};return next;
}
