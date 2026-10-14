import {noMotion,projectGame} from './game-presentation.mjs';
import {narrationProp} from './narration-props.mjs';

export function clearNarrativeHook(project){
 const next=structuredClone(project);for(const s of next.scenes)if(s.hookSourceLayers){const locked=(s.layers||[]).filter(l=>l.manual||l.instructionLocked);s.layers=[...s.hookSourceLayers.filter(l=>!locked.some(m=>m.id===l.id)),...locked];delete s.hookSourceLayers;}
 delete next.hookReport;return next;
}
export function planNarrativeHook(project){
 if(projectGame(project)!=='pokemon'||project.creationAssets?.clips?.some(c=>c.start<3)||/\b(?:no|without|disable|avoid)\s+(?:the\s+)?(?:hook|intro|silhouettes?|mystery)\b/i.test(project.editingInstructions||''))return;
 const words=project.scenes.flatMap(s=>s.words||[]).filter(w=>w.start<4),text=words.map(w=>w.text).join(' '),mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&project.media.some(a=>a.id===m.mediaId)).sort((a,b)=>a.start-b.start);
 const named=mentions.filter(m=>m.start<Math.min(3.6,words.at(-1)?.end??4)),generic=/\b(?:these|this|those|which|mystery|secret)\s+(?:\w+\s+){0,2}(?:pok[e\u00e9]mon|mons?)\b(?!\s+(?:champions|showdown|go|unite|tcg|games?|regional|tournament))|who(?:['\u2019]s|\s+is) that pok[e\u00e9]mon|\bguess (?:the|this|these) (?:pok[e\u00e9]mon|mons?)\b/i.exec(text);
 let mysteryAt=0;if(generic){let chars=0;for(const w of words){if(chars+w.text.length>generic.index){mysteryAt=w.start;break;}chars+=w.text.length+1;}}
 if(generic&&(!named.length||named[0].start-mysteryAt>.5)){
  const subjects=[...new Map(mentions.filter(m=>m.start<25).map(m=>[m.mediaId,m])).values()].slice(0,/\bthis\b/i.test(text)?1:3);if(!subjects.length)return;
  return {kind:'mystery',start:mysteryAt,end:Math.min(4.2,named[0]?.start??mentions[0].start??4.2),subjects,reason:'The actual unnamed-Pokemon cue poses a visual question before its spoken reveal'};
 }
 if(!named.length)return;
 const subjects=[...new Map(named.map(m=>[m.mediaId,m])).values()].slice(0,2);
 const kind=/\b(?:beats?|destroy|threat|one.?shot|unstoppa|broken|dominat)/i.test(text)?'challenge':/\b(?:why|how|what|secret|actually)\b/i.test(text)?'question':subjects.length>1?'comparison':/\b(?:worst|worse|bad|weak|terrible)\b/i.test(text)?'reversal':'spotlight';
 return {kind,start:subjects[0].start,end:Math.min(4.2,project.duration),subjects,reason:'Hook staging follows the opening claim: '+kind};
}
export function applyNarrativeHook(project){
 const next=clearNarrativeHook(project),plan=planNarrativeHook(next);if(!plan||plan.end-plan.start<.5)return next;
 const motion=!noMotion(next),question=narrationProp(next,'question-mark'),events=[];
 for(const s of next.scenes){const start=Math.max(s.start,plan.start),end=Math.min(s.end,plan.end);if(end-start<.2||s.manualTemplate||s.battlePlan||(s.layers||[]).some(l=>['gameplay','chart','narrated-action'].includes(l.role)&&l.start<end&&l.end>start))continue;
  if((s.layers||[]).some(l=>l.role==='subject'&&(l.manual||l.instructionLocked)&&l.start<end&&l.end>start))continue;
  if(plan.kind==='mystery'){
   s.hookSourceLayers=structuredClone(s.layers||[]);
   for(const l of s.layers)if(!l.manual&&!l.instructionLocked&&['subject','game-logo','supporting-image','comic-aside'].includes(l.role)&&l.start<end&&l.end>start)l.excludedRanges=[...(l.excludedRanges||[]),{start,end}];
   const count=plan.subjects.length,w=count===1?.55:count===2?.36:.27,gap=.025,total=count*w+(count-1)*gap;
   const family=next.editVersion?.layoutFamily??0,captionTop=1-(next.captionStyle?.bottom??.13)-Math.max(.06,((next.captionStyle?.fontSize??46)*2.8+20)/1920),safeBottom=Math.min(.67,captionTop-.05),pose=i=>{
    if(count!==3||family===0)return {x:(1-total)/2+i*(w+gap),y:.19,width:w,height:Math.min(.38,safeBottom-.19)};
    if(family===1){const h=Math.min(.24,(safeBottom-.10-.025)/2);return {x:i===2?.32:i===0?.08:.58,y:i===2?.10+h+.025:.10,width:.34,height:h};}
    if(family===2){const h=Math.min(.19,(safeBottom-.08-.05)/3);return {x:.05+i*.31,y:.08+i*(h+.025),width:.28,height:h};}
    return {x:i===0?.30:i===1?.02:.75,y:i===0?.13:.24,width:i===0?.40:.23,height:Math.min(i===0?.34:.23,safeBottom-(i===0?.13:.24))};
   };
   for(const [i,m] of plan.subjects.entries()){
    const id=s.id+'-mystery-'+i,at=Math.max(start,plan.start+i*.18);if(end-at<.15)continue;
    const actor={id,type:'image',role:'subject',mediaId:m.mediaId,hookVisual:true,silhouette:true,...pose(i),z:35,start:at,end,animation:motion?'spring-pop':'none',entranceDuration:.18,animationStart:plan.start+i*.18,exit:'none',fit:'contain'};
    s.layers.push(actor,{id:id+'-question',type:question?'image':'text',role:'hook-question',hookVisual:true,mediaId:question?.id,text:question?undefined:'?',fontSize:110,color:'#ffffff',x:actor.x,y:.28,width:.13,height:.13,z:36,start:at,end,fit:'contain',animation:motion?'spring-pop':'none',entranceDuration:.2,attachment:{targetId:id,anchor:'center',x:.5,y:.5,size:.4,contentBounds:true}});
    if(s.start<=plan.start+i*.18)events.push({start:at,cue:i===1?'click':'pop',priority:10,reason:'Mystery Pokemon silhouette appears without revealing its name'});
   }
  }else{
   // Keep exact pictures and spoken entrances. Vary their staging with the
   // claim, rather than replacing every Pokemon intro with a generic logo.
   const actors=(s.layers||[]).filter(l=>l.role==='subject'&&plan.subjects.some(m=>m.mediaId===l.mediaId)&&l.start<end&&l.end>start&&!l.manual&&!l.instructionLocked&&!l.referenceContinuation);
   for(const [i,l] of actors.entries()){if(!s.hookSourceLayers)s.hookSourceLayers=structuredClone(s.layers);if(motion){l.animation=plan.kind==='comparison'?'comparison-reveal':plan.kind==='question'?'mask-reveal':plan.kind==='reversal'?'slide-in-out':'spring-pop';l.direction=i?'right':'left';l.entranceDuration=plan.kind==='question'?.28:.18;l.animationAmount=plan.kind==='challenge'?.14:.09;events.push({start:l.start,cue:plan.kind==='comparison'||plan.kind==='reversal'?'whoosh':'pop',priority:9,reason:'Animated '+plan.kind+' hook'});}}
  }
 }
 next.hookReport={...plan,events};return next;
}
