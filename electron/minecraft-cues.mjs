// Match actions in phrases, not the presence of a noun such as "block".
import {sceneGameAt,selectedGame} from './game-selection.mjs';
export function minecraftSoundCues(project){
 const events=[];
 for(const scene of project.scenes){const ws=scene.words||[];
  for(let i=0;i<ws.length;i++){
   const word=ws[i].text.toLowerCase().replace(/[^a-z]/g,''),phrase=ws.slice(Math.max(0,i-3),Math.min(ws.length,i+6)).map(w=>w.text).join(' ').toLowerCase();
   if(/\b(?:not|never|dont|don't|without)\s+(?:\w+\s+)?(?:break|breaking|mine|mining|destroy|eat|eating)\b/.test(phrase))continue;
   let event;
   if(/^(break|breaks|breaking|broke|broken|mine|mines|mining|destroy|destroys|destroying)$/.test(word)&&/\b(block|blocks|stone|dirt|grass|wood|planks?|glass|sand|ore|ores|log|logs|gravel|netherrack)\b/.test(phrase)){
    const clause=ws.slice(i+1,Math.min(ws.length,i+6)).map(w=>w.text).join(' ').toLowerCase().split(/\b(?:then|and|but|while|break\w*|mine|mining|destroy\w*)\b|[.;!?]/)[0];
    const material=/\bglass\b/.test(clause)?'glass':/\b(?:wood|planks?|logs?)\b/.test(clause)?'wood':/\b(?:sand|gravel)\b/.test(clause)?'sand':/\b(?:dirt|grass)\b/.test(clause)?'grass':'stone';event='block.'+material+'.break';
   }else if(/^(eat|eating|eats)$/.test(word))event='entity.generic.eat';
   else if(/^(explode|explodes|exploding|explosion)$/.test(word))event='entity.generic.explode';
   else if(word==='chest'&&/\bopen\w*\b/.test(phrase))event='block.chest.open';
   else if(word==='creeper'&&/\b(?:hiss\w*|prim\w*|about to explode)\b/.test(phrase))event='entity.creeper.primed';
   else if(word==='villager'&&/\b(?:talk\w*|says?|hmm|trade|trading)\b/.test(phrase))event='entity.villager.ambient';
   else if(word==='level'&&/\blevel up\b/.test(phrase))event='entity.player.levelup';
   if(event&&!events.some(e=>Math.abs(e.start-ws[i].start)<.9))events.push({event,start:ws[i].start,sceneId:scene.id,quote:phrase});
  }
 }
 return events;
}
export async function addMinecraftCues(project,{service,progress=()=>{},check=()=>{}}){
 const enabled=project.autoMinecraftSounds!==false&&project.autoSoundEffects!==false&&!/\b(?:no|without|disable|remove)\s+(?:the\s+|automatic\s+)?(?:sound effects?|sfx)\b/i.test(project.editingInstructions||'');
 const next={...project,media:[...project.media],soundEffects:(project.soundEffects||[]).filter(f=>f.cue!=='minecraft-action'||!f.auto),minecraftSoundLog:[]};
 if(!enabled||project.topic!=='minecraft'&&project.gameSelection!=='minecraft'&&!/\bminecraft\b/i.test(project.scenes.map(s=>s.text).join(' ')))return next;
 const cues=minecraftSoundCues(project).filter(c=>!project.gameSelection&&project.topic==='minecraft'||sceneGameAt(project,project.scenes.find(s=>s.id===c.sceneId),c.start,project.topic||selectedGame(project))==='minecraft');if(!cues.length)return next;
 let catalog=service.soundStatus();
 if(!catalog)try{check();progress({stage:'Indexing official Minecraft sounds for narrated actions'});const versions=await service.versions();catalog=await service.indexSounds(versions.latest.release,progress);}catch(e){next.minecraftSoundLog.push({error:'Minecraft sound index unavailable: '+e.message});return next;}
 for(const cue of cues){check();const f=catalog.files.find(f=>f.events.includes(cue.event));if(!f){next.minecraftSoundLog.push({...cue,error:'Exact event missing from selected version'});continue;}
  try{progress({stage:'Matching Minecraft action sound: '+cue.event});const m=await service.importSound(f.id,true);if(!next.media.some(a=>a.id===m.id))next.media.push(m);next.soundEffects.push({mediaId:m.id,start:cue.start,end:Math.min(project.duration,cue.start+Math.min(1.5,m.duration)),volume:.13,auto:true,cue:'minecraft-action',reason:cue.event});next.minecraftSoundLog.push({...cue,mediaId:m.id});}catch(e){check();next.minecraftSoundLog.push({...cue,error:e.message});}
 }
 return next;
}
