import {noMotion} from './game-presentation.mjs';
import {applyBattles} from './battle-choreography.mjs';
const speedLines='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g stroke="#fff025" stroke-width="8" opacity=".55"><path d="M0 100L200 240M1000 100L800 240M0 500H150M1000 500H850M100 900L230 720M900 900L770 720"/></g></svg>';
const ring='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="#fff025" stroke-width="5" opacity=".65"/><path d="M10 15L24 40M184 10L165 40M5 180L28 155M185 185L168 158" stroke="white" stroke-width="6"/></svg>';
export function applyEngagementEffects(project){
 const next=structuredClone(project),cues=[],quiet=/\b(?:restrained|documentary|sparse|minimal effects|clean documentary)\b/i.test((project.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,''));
 for(const s of next.scenes){s.layers=(s.layers||[]).filter(l=>!l.engagementEffect);if(s.manualTemplate||s.battlePlan||noMotion(next)||quiet)continue;
  const subjects=s.layers.filter(l=>['subject','game-logo','supporting-image','item','nature-mint','reaction-gif'].includes(l.role)&&!l.manual&&!l.manualFraming&&!l.instructionLocked).sort((a,b)=>a.start-b.start||a.z-b.z);
  for(const [i,l] of subjects.entries()){
   // A split explanation keeps its actor still; only genuinely new appearances enter.
   if(l.referenceContinuation||subjects.some(p=>p!==l&&p.mediaId===l.mediaId&&p.end<=l.start+.001&&p.end>=l.start-.08)||l.animation==='none'&&l.animationStart<l.start)continue;
   const slide=['supporting-image','item'].includes(l.role)||i%3===2;
   if(l.animation!=='none'||l.start<.02){l.animation=slide?'slide-in-out':'spring-pop';l.direction=slide?(l.x>.45?'right':'left'):'up';l.entranceDuration=.18;l.animationAmount=.10;l.easing='easeOut';l.exit='none';}
   cues.push({sceneId:s.id,start:l.start,cue:slide?'whoosh':'pop',priority:6,reason:'Animated '+l.role+' entrance',layerId:l.id});
   if(l.start<3&&['subject','game-logo'].includes(l.role)&&!cues.some(c=>c.effect&&Math.abs(c.start-l.start)<.5)){const end=Math.min(l.end,l.start+.42);s.layers.push({id:l.id+'-entrance-ring',effectOwnerId:l.id,effectOwnerMediaId:l.mediaId,engagementEffect:true,type:'svg',role:'editorial-effect',svg:ring,x:l.x,y:l.y,width:l.width,height:l.height,z:Math.max(3,l.z-1),start:l.start,end,animation:'none',exit:'none',keyframes:[{time:l.start,scale:.55,opacity:0},{time:l.start+(end-l.start)*.2,scale:.8,opacity:.6},{time:end,scale:1.12,opacity:0}]});cues.at(-1).effect=true;}
  }
  if(s.start<.05){
   s.layers.push({id:s.id+'-hook-lines',engagementEffect:true,type:'svg',role:'editorial-effect',svg:speedLines,x:0,y:.09,width:1,height:.59,z:4,start:0,end:Math.min(s.end,.7),animation:'none',exit:'none',keyframes:[{time:0,opacity:.4,scale:1.10},{time:.7,opacity:0,scale:1}]});
  }
  if(next.autoReactionGifs!==false&&!/\b(?:no|without|disable|remove)\s+(?:reaction\s+)?(?:gifs|memes|reactions|humor)\b/i.test(next.editingInstructions||''))for(const [i,w] of (s.words||[]).entries()){
   if(!/^(?:oops|nope|fails?|failed|misses|wasted)[,.!?]*$/i.test(w.text)||/\b(?:not|never|no|without)\b/i.test(s.words.slice(Math.max(0,i-2),i).map(w=>w.text).join(' ')))continue;
   if(s.layers.some(l=>['chart','mechanic-card','gameplay','reaction-gif'].includes(l.role)&&l.start<=w.start&&l.end>w.start)||cues.some(c=>c.humor&&w.start-c.start<8))continue;
   const id=s.id+'-comic-'+i;s.layers.push({id,engagementEffect:true,type:'text',role:'comic-aside',text:/^nope/i.test(w.text)?'NOPE.':'OOPS.',x:.61,y:.2,width:.33,height:.07,z:64,start:w.start,end:Math.min(s.end,w.start+1.1),color:'#fff025',fontSize:52,rotation:-8,animation:'spring-pop',entranceDuration:.18,exit:'none'});cues.push({sceneId:s.id,start:w.start,cue:'boing',priority:7,humor:true,reason:'Comic aside for narrated '+w.text,layerId:id});
  }
 }
 next.engagementReport={version:1,cues,introSeconds:3,notice:'Cued motion and comic reactions; no fabricated jokes, battle facts or retention predictions.'};return next;
}
export function applyNarratedBattles(project){
 if(noMotion(project)||/\b(?:no|without|avoid)\s+(?:pokemon\s+)?battles?\b/i.test(project.editingInstructions||''))return project;
 let next=structuredClone(project);const planned=[],warnings=[];
 for(const sceneId of next.scenes.map(s=>s.id)){const s=next.scenes.find(s=>s.id===sceneId);if(s.manualTemplate||s.battlePlan)continue;
  const match=s.text.match(/\b(thunderbolt|flamethrower|water[- ]gun|tackle|attack each other|fight each other|fight|battle|dust cloud)\b/i);if(!match||/\b(?:no|not|never|without)\s+(?:(?:a|use|uses|using|do|does)\s+)*(?:fight|battle|attack|thunderbolt|flamethrower|water[- ]gun|tackle)\b/i.test(s.text))continue;
  const mons=[...new Map((next.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.start>=s.start&&m.start<s.end).map(m=>[m.mediaId,m])).values()];if(mons.length!==2)continue;
  const cue=(s.words||[]).find(w=>match[0].toLowerCase().startsWith(w.text.toLowerCase().replace(/[^a-z]/g,''))),at=Math.max(cue?.start??s.start,...mons.map(m=>m.end)),duration=Math.min(2.4,s.end-at);
  if(duration<1.2){warnings.push(s.id+': narrated battle is too short to complete; retained artwork.');continue;}
  if(s.layers.some(l=>['gameplay','chart'].includes(l.role)&&l.start<at+duration&&l.end>at)||s.layers.some(l=>l.role==='subject'&&(l.manual||l.manualFraming||l.instructionLocked)))continue;
  const firstVerb=s.words.find(w=>/^(?:uses?|attacks?|hits?|tackles?|fights?)[,.!?]*$/i.test(w.text)),attacker=firstVerb?mons.filter(m=>m.start<firstVerb.start).at(-1)||mons[0]:mons[0],defender=mons.find(m=>m!==attacker);
  const layers=[];for(const l of s.layers){if(l.role!=='subject'||l.end<=at||l.start>=at+duration){layers.push(l);continue;}if(l.start<at)layers.push({...l,end:at});if(l.end>at+duration)layers.push({...l,id:l.id+'-after-battle',start:at+duration,animation:'none'});}s.layers=layers;
  for(const [i,m] of [attacker,defender].entries())s.layers.push({id:s.id+'-narrated-fighter-'+i,role:'subject',type:'image',mediaId:m.mediaId,x:i?.62:.08,y:.43,width:.30,height:.28,z:20+i,start:at,end:at+duration,animation:'none',exit:'none',fit:'contain'});
  const move=/water/i.test(match[0])?'water-gun':/thunderbolt|flamethrower|tackle/i.test(match[0])?match[0].toLowerCase():'dust-brawl';
  const battle={sceneId:s.id,attackerId:s.id+'-narrated-fighter-0',defenderId:s.id+'-narrated-fighter-1',at,duration,move,reason:'Two named Pokemon and an explicit narrated action; local authored choreography.'};next=applyBattles(next,{model:'Local narrated-action rules',battles:[battle]});
  planned.push(battle);
 }
 if(planned.length)next.battleReport={...next.battleReport,model:'Local narrated-action rules',battles:planned,sounds:planned.flatMap(b=>[{start:b.at+b.duration*.31,cue:'whoosh',priority:12,reason:'Battle attack travel'},{start:b.at+b.duration*.46,cue:'impact',priority:13,reason:'Battle contact'}]),warnings,notice:'Illustrative animation only; does not simulate damage, move legality or outcomes.'};return next;
}
