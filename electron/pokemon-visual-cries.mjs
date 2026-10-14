import {visibleRanges} from './layer-visibility.mjs';
import {gameSegments,selectedGame} from './game-selection.mjs';
import {resolveName,BUNDLED_POKEMON} from './pokemon-names.mjs';

function visualName(asset){
 if(asset?.pokemon?.name)return asset.pokemon.name;
 if(asset?.identity?.franchise!=='pokemon'||!asset.identity.subject||['item','logo','move-art','mechanic-card','sound-effect'].includes(asset.assetRole))return;
 try{return resolveName(asset.identity.subject,BUNDLED_POKEMON);}catch{}
}

// Follow the finished visual timeline, not ASR mentions. Split animation layers
// and scene boundaries representing a continuously visible character are one
// entrance; disappearance followed by a return is a new entrance.
export function pokemonVisualEntrances(project){
 const media=new Map(project.media.map(m=>[m.id,m])),byName=new Map();
 for(const scene of project.scenes){
  const pokemonSegments=gameSegments(project,scene,selectedGame(project)).filter(s=>s.game==='pokemon');
  for(const layer of scene.layers||[]){
   const asset=media.get(layer.mediaId),name=visualName(asset);
   if(!name||!['image','video'].includes(layer.type)||layer.silhouette||layer.opacity===0&&!(layer.keyframes||[]).some(k=>k.opacity>0))continue;
   for(const r of visibleRanges(layer,scene.start,scene.end,scene.layers))for(const segment of pokemonSegments){
    const start=Math.max(r.start,segment.start),end=Math.min(r.end,segment.end);
    if(end-start<=.04)continue;
    const ranges=byName.get(name)||[];ranges.push({name,speciesName:asset.pokemon?.speciesName,start,end,layerId:layer.id,sceneId:scene.id});byName.set(name,ranges);
   }
  }
 }
 const entrances=[];
 for(const ranges of byName.values()){
  const merged=[];
  for(const r of ranges.sort((a,b)=>a.start-b.start)){
   const last=merged.at(-1);
   if(last&&r.start<=last.end+.08)last.end=Math.max(last.end,r.end);else merged.push({...r});
  }
  entrances.push(...merged);
 }
 return entrances.sort((a,b)=>a.start-b.start||a.name.localeCompare(b.name));
}
export function applyVisualPokemonCries(project,assets){
 const effects=(project.soundEffects||[]).filter(f=>f.cue!=='pokemon-cry'||!f.auto),media=new Map(project.media.map(m=>[m.id,m]));
 const enabled=project.autoPokemonCries!==false&&!/\b(?:no|without|disable|remove)\s+(?:pokemon\s+)?cr(?:y|ies)\b/i.test(project.editingInstructions||'');
 const entrances=enabled?pokemonVisualEntrances(project):[],cues=[],unavailable=[];
 const entranceSignature=JSON.stringify(entrances.map(e=>[e.name,e.start,e.end]));
 // A manual sound deletion or timing edit remains a manual edit. Recompute
 // only when the actual Pokemon appearances change or missing cries arrive.
 if(project.pokemonCryReport?.enabled===enabled&&project.pokemonCryReport.entranceSignature===entranceSignature&&!(project.pokemonCryReport.unavailable||[]).length)return project;
 for(const e of entrances){
  const cry=assets.find(m=>m.cry?.name===e.name&&m.cry.variant==='latest'&&m.duration>0);
  if(!cry){unavailable.push({...e,reason:'Recorded cry unavailable'});continue;}
  // Team reveals each get their real cry, with a small stagger and lower mix
  // level. Never stack six full-volume cries over the original voiceover.
  const simultaneous=entrances.filter(other=>Math.abs(other.start-e.start)<.08),index=simultaneous.indexOf(e),start=Math.min(e.end-.05,e.start+index*.09),duration=Math.min(cry.duration,e.end-start,simultaneous.length>1?.65:1.25);
  if(duration<=.04)continue;
  media.set(cry.id,cry);
  const volume=.075/Math.sqrt(simultaneous.length),end=Math.min(project.duration,start+duration);
  effects.push({mediaId:cry.id,start,end,volume,auto:true,cue:'pokemon-cry',reason:'Visible Pokémon entrance: '+e.name,volumeRanges:[{start:Math.max(start,end-.09),end,volume:volume*.35}]});
  cues.push({...e,start,end,mediaId:cry.id,visualStart:e.start});
 }
 return {...project,media:[...media.values()],soundEffects:effects.sort((a,b)=>a.start-b.start),pokemonCryReport:{enabled,entranceSignature,entrances:entrances.length,played:cues.length,cues,unavailable}};
}
export async function addVisualPokemonCries(project,{library=[],loadCry,progress=()=>{},check=()=>{}}){
 if(project.autoPokemonCries===false)return applyVisualPokemonCries(project,[]);
 const entrances=pokemonVisualEntrances(project),assets=[...library,...project.media],names=[...new Set(entrances.map(e=>e.name))],warnings=[];
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,names.length)},async()=>{
  while(cursor<names.length){const name=names[cursor++];check();if(assets.some(m=>m.cry?.name===name&&m.cry.variant==='latest'&&m.duration>0))continue;
   try{progress({stage:'Caching entrance cry: '+name});assets.push(await loadCry(name));}catch(e){check();warnings.push(name+': '+e.message);}
  }
 }));
 return {...applyVisualPokemonCries(project,assets),pokemonCryWarnings:warnings};
}
