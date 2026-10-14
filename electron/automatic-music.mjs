import crypto from 'node:crypto';
import {projectGame} from './game-presentation.mjs';
const regions=[['hoenn',/\b(?:emerald|ruby|sapphire|hoenn|oras|omega ruby|alpha sapphire)\b/i,/\boras\b/],['kanto',/\b(?:fire\s*red|leaf\s*green|kanto|let'?s go|pokemon (?:red|blue|yellow))\b/i,/kanto/],['johto',/\b(?:johto|heart\s*gold|soul\s*silver|pokemon (?:gold|silver|crystal))\b/i,/johto/],['sinnoh',/\b(?:sinnoh|diamond|pearl|platinum)\b/i,/\bdpp\b/],['unova',/\b(?:unova|pokemon black|pokemon white|black (?:and|&) white|black 2|white 2)\b/i,/\bbw2?\b/],['kalos',/\b(?:kalos|pokemon x|pokemon y|x (?:and|&) y)\b/i,/\bxy\b/],['alola',/\b(?:alola|pokemon sun|pokemon moon|ultra sun|ultra moon)\b/i,/\bsm\b/]];
const quiet=p=>p.musicAutoDisabled||p.musicVolume===0||/\b(?:no|without|remove|mute|disable|avoid)\s+(?:all |the |background )?(?:music|soundtrack)\b|\b(?:do not|don't|never)\s+(?:add|use|play)\s+(?:background )?music\b/i.test(p.editingInstructions||'');
export function automaticMusicChoice(project,catalog){
 if(quiet(project))return {disabled:true,reason:'Explicit music mute/removal'};
 const current=project.media.find(m=>m.id===project.musicId);
 if(project.musicId&&project.musicId!=='generated-music-v1'&&project.automaticMusicReport?.mediaId!==project.musicId)return {preserve:true,reason:'Preserve selected or imported music'};
 const game=projectGame(project);if(!['pokemon','minecraft'].includes(game))return {preserve:!!current,reason:'Keep the current general soundtrack'};
 const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,''),narration=normalize(project.scenes.map(s=>s.text).join(' ')),brief=normalize((project.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'')),region=game==='pokemon'?regions.find(([,re])=>re.test(narration))||regions.find(([,re])=>re.test(brief)):undefined;
 const tracks=catalog.filter(t=>t.game===game),matching=region?tracks.filter(t=>region[2].test(t.id)):tracks.filter(t=>/trainer|rival/.test(t.id));
 const pool=matching.length?matching:tracks;if(!pool.length)return {game,region:region?.[0],reason:'No matching soundtrack available',candidates:[]};
 const seed=crypto.createHash('sha256').update(String(project.creativePassId||project.id||'new')).digest().readUInt32LE(0),start=seed%pool.length;
 return {game,region:region?.[0]||'general',reason:region?'Narrated game/region matched to an available soundtrack':'Narration-compatible game soundtrack, varied per fresh edit',candidates:[...pool.slice(start),...pool.slice(0,start)].map(t=>t.id)};
}
export async function ensureAutomaticMusic(project,{catalog,download,progress=()=>{},check=()=>{}}){
 const choice=automaticMusicChoice(project,catalog());if(choice.disabled||choice.preserve||!choice.candidates?.length)return project;
 if(project.automaticMusicReport?.region===choice.region&&project.musicId===project.automaticMusicReport.mediaId&&project.media.some(m=>m.id===project.musicId))return project;
 const failures=[];for(const id of choice.candidates.slice(0,2))try{check();progress({stage:'Choosing '+choice.region+' '+choice.game+' music'});const media=await download(id);check();return {...project,media:[...new Map([...project.media,media].map(m=>[m.id,m])).values()],musicId:media.id,musicVolume:project.musicVolume??.08,musicClip:{start:0,end:project.duration,sourceOffset:0,fadeIn:.35,fadeOut:.6,loop:true,duck:true},automaticMusicReport:{...choice,candidates:undefined,trackId:id,mediaId:media.id,trackName:media.name,failures}};}catch(e){check();failures.push(id+': '+e.message);}
 return {...project,automaticMusicReport:{...choice,candidates:undefined,failures},gameAssetWarnings:[...(project.gameAssetWarnings||[]),'Game soundtrack unavailable; current bed retained. '+failures.join('; ')]};
}
