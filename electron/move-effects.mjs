import fs from 'node:fs';
import {narrationProp} from './narration-props.mjs';
import {noMotion} from './game-presentation.mjs';
import {mechanicMention,clauseAround} from './mechanic-context.mjs';
import {matchMechanic} from './mechanic-name.mjs';
import {findMechanicImage,sourceMechanicGeometry} from './mechanic-images-policy.mjs';
import {moveContext} from './move-context.mjs';
const bundled=JSON.parse(fs.readFileSync(new URL('./data/core-moves.json',import.meta.url),'utf8'));
export const CORE_MOVES=bundled.moves;
export const TYPE_COLORS={normal:'#a8a878',fire:'#f08030',water:'#6890f0',electric:'#f8d030',grass:'#78c850',ice:'#98d8d8',fighting:'#c03028',poison:'#a040a0',ground:'#e0c068',flying:'#a890f0',psychic:'#f85888',bug:'#a8b820',rock:'#b8a038',ghost:'#705898',dragon:'#7038f8',dark:'#705848',steel:'#b8b8d0',fairy:'#ee99ac'};
const moveIndex=new Map(CORE_MOVES.map(m=>[m.name.replaceAll('-',''),m]));moveIndex.set('flamthrower',moveIndex.get('flamethrower'));moveIndex.set('leefstorm',moveIndex.get('leaf-storm'));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function planMoveEffects(project){
 const cues=[];
 for(const s of project.scenes){const words=s.words||[],known=(project.shortMechanics?.cues||[]).filter(c=>c.sceneId===s.id&&c.kind==='move');
  const moves=known.map(c=>({...CORE_MOVES.find(m=>m.name===c.name),...c,damageClass:c.damageClass||CORE_MOVES.find(m=>m.name===c.name)?.damageClass}));
  for(let i=0;i<words.length;i++){
   const match=matchMechanic(words,i,CORE_MOVES);let m=match?.entry,count=match?.count||0;if(!m&&moveIndex.has(norm(words[i].text).replaceAll(' ',''))){m=moveIndex.get(norm(words[i].text).replaceAll(' ',''));count=1;}
   if(!m||moves.some(c=>Math.abs(c.start-words[i].start)<.02))continue;
   if(!mechanicMention(words,i,count,'move',m.name))continue;
   moves.push({...m,sceneId:s.id,start:words[i].start,end:s.end,quote:words.slice(i,i+count).map(w=>w.text).join(' '),wordIndex:i,wordCount:count,corrected:match?.corrected||count>1&&!m.name.includes('-')||m.name==='flamethrower'&&norm(words[i].text)==='flamthrower'});i+=count-1;
  }
  for(const m of moves.sort((a,b)=>a.start-b.start)){const i=words.findIndex(w=>Math.abs(w.start-m.start)<.02);if(i<0)continue;const before=clauseAround(words,i,m.wordCount||m.name.split('-').length).before,negative=/\b(?:not|never|cannot|cant|can't|no|without|doesnt|doesn't)\b/.test(before),action=!negative&&/\b(?:uses?|used|using|fires?|unleashes?|launches?|attacks?|hits?|clicks?|spams?|checks?|counters?|threatens?|threatened|beats?)\b/.test(before);
   const type=m.type||'normal',effect=m.name==='leaf-storm'?'leaf-storm':m.name==='flamethrower'?'screen-fire':type==='fire'?'screen-fire':type==='electric'?'electric-storm':type==='water'?'water-splash':type==='ice'?'ice-freeze':type==='grass'?'leaf-burst':type==='psychic'||type==='ghost'?'psychic-wave':'attack-impact';
   const context=moveContext(project,m),acting=!negative&&(action||context.action);
   cues.push({...m,sceneId:s.id,type,effect,action:acting,negative,moveContext:context.kind,hasMatchupPair:context.hasPair,outcome:context.outcome,end:Math.min(s.end,m.start+(acting?2.5:1.6)),reason:acting?'Narrated '+m.title+' attack':'Explain the named '+m.title+' move'});
  }
 }return cues.sort((a,b)=>a.start-b.start).map((c,i,all)=>({...c,effectEnd:Math.min(project.duration,c.start+2.5,all[i+1]?.start??project.duration)}));
}
export function applyMoveEffects(project){
 const next=structuredClone(project),motion=!noMotion(next),restrained=/\b(?:minimal effects|restrained|documentary|no effects|without effects)\b/i.test((next.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'')),cues=planMoveEffects(next),sounds=[];
 for(const s of next.scenes)s.layers=(s.layers||[]).filter(l=>!l.autoMoveEffect||l.sourceMoveCard&&cues.some(c=>c.sceneId===s.id&&Math.abs(c.start-l.start)<.02&&norm(next.media.find(m=>m.id===l.mediaId)?.moveCard?.name)===norm(c.title)));
 for(const s of next.scenes){if(s.manualTemplate)continue;
  for(const [i,c] of cues.filter(c=>c.sceneId===s.id).entries()){
   if(c.corrected&&c.wordIndex!==undefined){s.words[c.wordIndex].captionText=c.title;for(let j=1;j<c.wordCount;j++)s.words[c.wordIndex+j].captionText='';}
   const end=Math.min(c.end,cues.find(n=>n.sceneId===s.id&&n.start>c.start)?.start??s.end);if(end-c.start<.12)continue;
   const card=s.layers.some(l=>(['move','move-badge'].includes(l.setupGraphic?.kind)&&norm(l.setupGraphic.title)===norm(c.title)||l.sourceMoveCard&&norm(next.media.find(m=>m.id===l.mediaId)?.moveCard?.name)===norm(c.title))&&l.start<=c.start&&l.end>c.start);
   const image=findMechanicImage(next,'move',c.title);
   if(!card&&image&&moveContext(next,c).showCard)s.layers.push({id:s.id+'-move-name-'+i,type:'image',role:'mechanic-card',autoMoveEffect:true,sourceMoveCard:true,sourceMechanicKind:'move',mediaId:image.id,fit:'contain',...sourceMechanicGeometry(image,'move',next),z:71,start:c.start,end:Math.min(s.end,cues.find(n=>n.sceneId===s.id&&n.start>c.start)?.start??s.end,c.start+2.6),animation:motion&&!restrained?'slide-in-out':'none',direction:'left',entranceDuration:.24,exit:'none'});
   if(image&&s.layers.some(l=>l.sourceMoveCard&&l.mediaId===image.id&&l.start<=c.start&&l.end>c.start))sounds.push({sceneId:s.id,start:c.start,cue:'whoosh',priority:8,reason:'Sourced move image reveal: '+c.title});
   if(c.action&&c.statChanges?.some(v=>v.change>0)&&['user','users-field','user-and-allies','all-allies'].includes(c.target)){
    sounds.push({sceneId:s.id,start:c.start+.32,cue:'stat-boost',priority:14,reason:'Sourced stat-raising move: '+c.title});
    const actor=s.layers.find(l=>l.role==='subject'&&l.start<=c.start&&l.end>c.start);
    if(actor&&motion&&!restrained&&!s.layers.some(l=>['chart','gameplay'].includes(l.role)&&l.start<=c.start&&l.end>c.start))s.layers.push({id:s.id+'-stat-boost-'+i,type:'svg',role:'stat-boost',autoMoveEffect:true,svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="#91f5b5" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M65 225V90m-25 25 25-25 25 25M150 240V65m-25 25 25-25 25 25M235 225V90m-25 25 25-25 25 25"/></g></svg>',x:actor.x,y:actor.y,width:actor.width,height:actor.height,z:(actor.z||20)+2,start:c.start+.2,end:Math.min(end,c.start+1.2),animation:'slide-in-out',direction:'up',animationAmount:.05,opacity:.55,exit:'fade'});
   }
   if(c.action&&!c.hasMatchupPair&&c.outcome!=='ineffective'&&c.damageClass!=='status'&&motion&&!restrained&&!s.layers.some(l=>l.role==='gameplay'&&l.start<=c.start&&l.end>c.start)){
    for(const target of next.scenes.filter(t=>t.end>c.start&&t.start<c.effectEnd)){const start=Math.max(c.start,target.start),finish=Math.min(c.effectEnd,target.end);if(target.manualTemplate||target.layers.some(l=>['gameplay','chart'].includes(l.role)&&l.start<finish&&l.end>start)||target.id!==s.id&&/\bminecraft\b/i.test(target.text))break;
     target.layers.push({id:s.id+'-move-screen-'+i+'-'+target.id,type:'group',role:'move-effect',autoMoveEffect:true,moveEffect:c.effect,moveEffectStart:c.start,moveEffectEnd:c.effectEnd,mediaId:next.media.find(m=>m.assetRole==='move-art'&&m.moveArtLayout!=='reference'&&m.effectMoveName===c.name)?.id||narrationProp(next,({fire:'fire',electric:'lightning',grass:'leaf',water:'water',ice:'ice'})[c.type])?.id,x:0,y:0,width:1,height:1,z:85,start,end:finish,animation:'none',exit:'none'});
    }
    sounds.push({sceneId:s.id,start:c.start,cue:c.type==='fire'?'fire':c.type==='water'?'splash':c.type==='ice'?'ice':c.type==='electric'?'electric':'whoosh',priority:12,reason:'Move effect: '+c.title,end});
   }
  }
 }
 next.moveEffectReport={version:1,cues,sounds,notice:'Move titles use source metadata; screen effects are illustrative, not official move footage or game simulation.'};return next;
}
export function applySmoothTransitions(project){
 const next=structuredClone(project),cues=[];const off=noMotion(next)||/\b(?:hard cuts|no transitions|without transitions)\b/i.test((next.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,''));
 for(const [i,s] of next.scenes.entries()){if(s.autoTransition){delete s.transition;delete s.transitionDuration;delete s.autoTransition;}if(!i||off||s.manualTemplate||next.scenes[i-1].manualTemplate||s.transition)continue;
  const previous=next.scenes[i-1],same=previous.layers?.filter(l=>l.role==='subject'&&l.end>=previous.end-.03).map(l=>l.mediaId).sort().join('|')===s.layers?.filter(l=>l.role==='subject'&&l.start<=s.start+.03).map(l=>l.mediaId).sort().join('|');
  if(same&&previous.backgroundConcept===s.backgroundConcept&&!s.layers.some(l=>l.start===s.start&&['move-callout','game-logo'].includes(l.role)))continue;
  s.transition='crossfade';s.transitionDuration=Math.min(.20,(s.end-s.start)/3,(previous.end-previous.start)/3);s.autoTransition=true;cues.push({sceneId:s.id,start:s.start,cue:'whoosh',priority:9,reason:'Scene transition with smooth crossfade'});
 }next.transitionSoundPlan=cues;return next;
}
