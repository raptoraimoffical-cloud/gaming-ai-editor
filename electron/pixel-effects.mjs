import fs from 'node:fs';
import path from 'node:path';
import {noMotion} from './game-presentation.mjs';
import {planMoveEffects} from './move-effects.mjs';
import {COMBAT_PHASES} from './combat-motion.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {narrationProp} from './narration-props.mjs';

export function readPixelEffects(root=path.resolve(import.meta.dirname,'..')){
 const folder=path.join(root,'assets','pixel-effects'),file=path.join(folder,'manifest.json');if(!fs.existsSync(file))return [];
 return JSON.parse(fs.readFileSync(file,'utf8')).effects.flatMap(a=>{
  const target=path.resolve(folder,a.file);if(!target.startsWith(folder+path.sep)||!fs.existsSync(target))return [];
  return [{id:'pixel-fx-'+a.key,kind:'image',name:a.name,path:target,url:'',duration:0,width:a.width,height:a.height,transparent:true,decoded:true,pixelArt:true,assetRole:'animation-effect',tags:'pixel-effect:'+a.key,spriteSheet:a.sheet,license:a.license,identity:{franchise:'unknown',subject:a.key,source:a.source,confidence:1},attribution:{source:a.source,credit:a.credit,licenseUrl:a.licenseUrl,changes:'Original downloaded sprite sheet; animated by frame cropping'}}];
 });
}
const token=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const castRoles=new Set(['subject','narrated-action','story-picture','supporting-image']);
const available=(s,l,at)=>visibleRanges(l,s.start,s.end,s.layers).some(r=>r.start<=at&&r.end>at);
const negative=(ws,i)=>/\b(?:not|never|no|without|cannot|cant|doesnt|isnt|isn t|doesn t|can t|couldn t)\b/.test(ws.slice(Math.max(0,i-5),i).map(w=>token(w.text)).join(' '));
export function clearPixelEffects(project){const p=structuredClone(project);for(const s of p.scenes)s.layers=(s.layers||[]).filter(l=>!l.pixelEffectAuto||l.manual||l.manualFraming);delete p.pixelEffectReport;return p;}
export function applyPixelEffects(project,library=[]){
 const p=clearPixelEffects(project),events=[],warnings=[],pool=[...p.media,...library],motion=!noMotion(p)&&!p.freezePokemonMotion;
 p.pixelEffectReport={events,warnings};if(p.autoPixelEffects===false||/\b(?:no|without|avoid)\s+(?:extra |additional )?(?:effects|animations)\b/i.test(p.editingInstructions||''))return p;
 const effect=key=>pool.find(m=>m.id==='pixel-fx-'+key&&m.spriteSheet);
 const addMedia=m=>{if(!p.media.some(a=>a.id===m.id))p.media.push(m);};
 const owner=(s,at,type='pokemon')=>{
  const visible=(s.layers||[]).filter(l=>castRoles.has(l.role)&&l.mediaId&&!l.attachment&&available(s,l,at)&&!(l.opacity===0&&!l.keyframes?.some(k=>k.opacity>0)));
  const fx=s.layers.find(l=>l.blueprintEffect&&available(s,l,at)&&l.blueprintEffect.actorId)?.blueprintEffect;
  if(type==='pokemon'&&fx){const bound=visible.find(l=>l.id===fx.actorId);if(bound&&p.media.find(m=>m.id===bound.mediaId)?.pokemon)return bound;}
  const mentions=[...(s.reaction?.entities||[]),...(type==='pokemon'?(p.pokemonMentions||[]):[])].filter(e=>e.mediaId&&(e.type===type||type==='pokemon'&&!e.type)&&e.start<=at+.01).sort((a,b)=>b.start-a.start);
  for(const e of mentions){const found=visible.find(l=>l.mediaId===e.mediaId);if(found)return found;}
  return type==='pokemon'&&!mentions.length?visible.find(l=>p.media.find(m=>m.id===l.mediaId)?.pokemon):undefined;
 };
 const attach=(s,m,target,at,duration,kind,{front=false,tint,size=1.45,sound='pop'}={})=>{
  const end=Math.min(s.end,target.end,at+duration);if(end-at<.15||events.some(e=>e.sceneId===s.id&&e.targetId===target.id&&e.kind===kind&&(Math.abs(e.start-at)<1.1||e.start<=at&&e.end>at)))return;
  const id=s.id+'-pixel-'+kind+'-'+Math.round(at*1000)+'-'+target.id;if(s.deletedLayerIds?.includes(id)||s.layers.some(l=>l.id===id))return;addMedia(m);
  if(kind==='trophy')p.narrationAssetPlan={...p.narrationAssetPlan,trophy:m.id};
  s.layers.push({id,pixelEffectAuto:true,type:'image',role:kind==='trophy'?'supporting-image':'pixel-effect',mediaId:m.id,pixelEffect:{kind,tint,motion},effectOwnerId:target.id,attachment:{targetId:target.id,x:kind==='trophy'?.8:.5,y:kind==='trophy'?.76:.5,size:kind==='power-up'?1.22:size,...(kind==='power-up'?{sizing:'height'}:{}),contentBounds:true},x:0,y:0,width:.1,height:.1,start:at,end,animationStart:at,animationEnd:end,fit:'contain',z:(target.z||30)+(front?3:-1),opacity:kind==='trophy'?1:.92,animation:motion?'fade':'none',entranceDuration:.14,exit:motion?'fade':'none',exitDuration:.2,cinematicDepthOverride:target.cinematicDepthOverride??1});
  events.push({sceneId:s.id,kind,targetId:target.id,mediaId:m.id,start:at,end,cue:sound,priority:14,reason:kind==='elemental-impact'?'Narrated action contact with downloaded elemental animation':'Downloaded '+kind+' animation at its narration cue'});
 };
 const weather=(s,key,at)=>{const m=effect(key);if(!m)return;const end=Math.min(s.end,at+5);if(end-at<.15)return;const id=s.id+'-pixel-weather-'+Math.round(at*1000);if(s.deletedLayerIds?.includes(id)||events.some(e=>e.sceneId===s.id&&e.kind===key))return;addMedia(m);s.layers.push({id,pixelEffectAuto:true,type:'image',role:'environment-depth',mediaId:m.id,pixelEffect:{kind:key,tile:true,motion},x:0,y:0,width:1,height:.73,z:9,start:at,end,animationStart:at,animationEnd:end,opacity:key==='fog'?.42:.72,animation:motion?'fade':'none',entranceDuration:.18,exit:motion?'fade':'none',exitDuration:.22,cinematicDepthOverride:0});events.push({sceneId:s.id,kind:key,mediaId:m.id,start:at,end,reason:'Narrated '+key+' weather with downloaded seamless frames'});};
 const moves=planMoveEffects(p);
 for(const s of p.scenes){if(s.manualTemplate)continue;const words=s.words||[],cues=moves.filter(c=>c.sceneId===s.id);
  for(const [i,w] of words.entries()){
   const t=token(w.text),at=Math.max(s.start,w.start),phrase=words.slice(i,i+7).map(w=>token(w.text)).join(' '),before=words.slice(Math.max(0,i-4),i).map(w=>token(w.text)).join(' ');if(negative(words,i))continue;
   const move=cues.find(c=>at>=c.start-.01&&at<(words[(c.wordIndex??-1)+(c.wordCount||c.name.split('-').length)-1]?.end??c.start+.4));
   if(!move&&/^(rain|raining|snow|snowing|blizzard|fog|foggy|mist|misty)$/.test(t)&&!/(?:coins?|money|make it)\s*$/.test(before)&&!/^rain (?:of )?(?:coins|money)/.test(phrase))weather(s,/snow|blizzard/.test(t)?'snow':/fog|mist/.test(t)?'fog':'rain',at);
   if(!move&&/^(?:falling|autumn)$/.test(t)&&/^(?:falling|autumn) leaves\b/.test(phrase))weather(s,'leaves',at);
   const buff=/^(?:(?:boosts?|boosted|raises?|raised|increases?|increased|buffs?|buffed) (?:its? |their |the |his |her )?(?:special )?(?:stats?|attack|defense|speed)|(?:stats?|attack|defense|speed) (?:gets? |is |are )?(?:boosted|raised|increased|buffed)|(?:stats? buffs?|buffed))\b/.test(phrase);
   const praise=/^(good|great|amazing|excellent|incredible|powerful|strong|stronger|strongest|best|unstoppable|broken|overpowered|insane)$/.test(t)&&!/^good as gold\b/.test(phrase)&&!/\b(?:move|ability|item|music|video|picture|photo|team|synergy|together)\b/.test(before+' '+phrase);
   if(buff||praise){const actor=owner(s,at);const m=effect('power-aura');if(actor&&m)attach(s,m,actor,at,buff?2.25:1.65,'power-up',{tint:'gold',sound:buff?'stat-boost':'pop'});}
   if(/^(won|wins|winning|champion)$/.test(t)||/^takes (?:first|the title)\b/.test(phrase)){
    const person=owner(s,at,'person'),trophy=narrationProp(p,'trophy')||pool.find(m=>m.assetRole==='narration-prop'&&m.identity?.subject==='trophy');if(person&&trophy)attach(s,trophy,person,at,2.6,'trophy',{front:true,size:.36,sound:'victory'});
   }
  }
  for(const c of cues){if(c.negative||!c.action)continue;const actor=owner(s,c.start);if(!actor)continue;
   if(c.name==='rain-dance'||c.name==='snowscape'||c.name==='hail'){weather(s,c.name==='rain-dance'?'rain':'snow',c.start);continue;}
   if(c.statChanges?.some(v=>v.change>0)&&['user','users-field'].includes(c.target)){const m=effect('power-aura');if(m)attach(s,m,actor,c.start,2.4,'power-up',{tint:'gold',sound:'stat-boost'});continue;}
   if(c.damageClass==='status')continue;
   const key={fire:'fire',electric:'magic-hit',ice:'freezing',grass:'felspell',water:'magic-bubbles',psychic:'nebula',ghost:'phantom'}[c.type]||'weapon-hit',m=effect(key);if(!m)continue;
   const fx=s.layers.find(l=>l.blueprintEffect&&available(s,l,c.start))?.blueprintEffect,plan=p.actionMovieReport?.plans?.find(a=>a.sceneId===s.id&&a.moveName===c.name&&Math.abs(a.spokenAt-c.start)<.15);
   if(plan?.outcome==='ineffective')continue;
   const hit=plan?plan.start+plan.duration*COMBAT_PHASES.contact:fx?.targetIds?.length?fx.at+(fx.end-fx.at)*(fx.kind==='contact'?.52:.66):undefined;if(hit===undefined||hit>=s.end-.15)continue;
   const target=plan?s.layers.find(l=>castRoles.has(l.role)&&l.mediaId===plan.defenderId&&available(s,l,hit)):fx.targetIds.map(id=>s.layers.find(l=>l.id===id&&available(s,l,hit))).find(Boolean);
   if(target)attach(s,m,target,hit,1.1,'elemental-impact',{front:true,size:.8,sound:c.type==='fire'?'fire':c.type==='electric'?'electric':'impact'});
  }
 }
 return p;
}
