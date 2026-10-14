import fs from 'node:fs';import path from 'node:path';
import {clipLayer} from './clip-layer.mjs';
const clean=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function movesetCues(project){
 const cues=[];
 for(const s of project.scenes)for(const w of s.words||[]){if(!/^(moveset|movesets|coverage|movepool)$/i.test(w.text.replace(/[^a-z]/gi,'')))continue;
  const mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.start<=w.start&&w.start-m.end<20),latest=mentions.at(-1);
  const entities=(s.reaction?.entities||[]).filter(e=>e.type==='pokemon'&&e.start<=w.start).sort((a,b)=>b.start-a.start),mediaId=entities[0]?.mediaId||latest?.mediaId,m=project.media.find(m=>m.id===mediaId);
  if(!m?.pokemon)continue;cues.push({sceneId:s.id,start:w.start,end:Math.min(s.end,w.start+3),name:m.pokemon.name,title:m.pokemon.displayName||m.name,mediaId,quote:w.text});
 }return cues;
}
export function createSourceMovesets(folder,{search,download,register=m=>m,verify,learnset}={}){
 fs.mkdirSync(folder,{recursive:true});
 async function acquire(project,{keys={},state,progress=()=>{},check=()=>{}}={}){
  const next={...project,media:[...project.media],movesetPlan:[],movesetWarnings:[]};
  for(const cue of movesetCues(project)){
   check();const key=clean(cue.name+' '+project.gameSelection).replaceAll(' ','-'),record=path.join(folder,key+'.json');let selected;
   try{const cached=JSON.parse(fs.readFileSync(record,'utf8'));if(cached.moveset?.verified&&fs.existsSync(cached.path))selected=await register(cached);}catch{}
   if(!selected&&keys['google-images']&&search&&download&&verify&&state?.models?.vision?.capabilities?.includes('vision'))try{
    progress({stage:'Finding a real moveset image: '+cue.title});const query='Pokemon "'+cue.title+'" competitive moveset moves';
    const candidates=await search(query,'google-images',keys['google-images'],{exactQuery:true,purpose:'move-card'}),allowed=new Set((await learnset(cue.name)).map(clean));
    for(const c of candidates.filter(c=>c.webAssessment?.autoEligible&&clean(c.name).includes(clean(cue.title))&&/moveset|move set|moves|competitive|build/i.test(c.name)).slice(0,4))try{
     check();const m=await download(c);if(!m.decoded||m.width<480||m.height<200)continue;
     const found=await verify(state,cue,m.path);check();const moves=(found.moves||[]).map(clean);
     if(!found.available||!found.accepted||clean(found.pokemon)!==clean(cue.title)||moves.length<2||moves.length>4||moves.some(n=>!allowed.has(n)))continue;
     selected=await register({...m,assetRole:'moveset-card',moveset:{pokemon:cue.name,moves:found.moves,verified:true,model:found.model},identity:{franchise:'pokemon',subject:cue.name,source:m.attribution?.source,confidence:.9}});fs.writeFileSync(record,JSON.stringify(selected));break;
    }catch(e){check();next.movesetWarnings.push(e.message);}
   }catch(e){check();next.movesetWarnings.push(e.message);}
   if(selected){if(!next.media.some(m=>m.id===selected.id))next.media.push(selected);next.movesetPlan.push({...cue,imageId:selected.id,moves:selected.moveset.moves,source:selected.attribution?.source});}
   else next.movesetWarnings.push(cue.title+': no verified sourced moveset image; no best-move claims invented.');
  }
  return next;
 }
 return {acquire};
}
export function clearSourceMovesets(project){const next=structuredClone(project);for(const s of next.scenes){if(s.movesetSourceLayers){const locked=(s.layers||[]).filter(l=>l.manual||l.instructionLocked);s.layers=[...s.movesetSourceLayers.filter(l=>!locked.some(k=>k.id===l.id)),...locked];delete s.movesetSourceLayers;}else s.layers=(s.layers||[]).filter(l=>!l.sourceMoveset);}return next;}
export function applySourceMovesets(project){
 const next=clearSourceMovesets(project);
 for(const s of next.scenes){if(s.manualTemplate||s.battlePlan)continue;
  for(const [i,c] of (next.movesetPlan||[]).filter(c=>c.sceneId===s.id).entries()){
   const end=Math.min(s.end,c.end),actor=(s.layers||[]).find(l=>l.role==='subject'&&l.mediaId===c.mediaId&&l.start<=c.start&&l.end>=end&&!l.manual&&!l.instructionLocked);
   if(!actor||end-c.start<.5||s.layers.some(l=>l.start<end&&l.end>c.start&&['chart','gameplay','narrated-action'].includes(l.role)))continue;
   s.movesetSourceLayers??=structuredClone(s.layers);
   actor.excludedRanges=[...(actor.excludedRanges||[]),{start:c.start,end}];
   s.layers.push({...clipLayer(actor,c.start,end),id:s.id+'-moveset-hero-'+i,sourceMoveset:true,actorSourceId:actor.id,x:.35,y:.075,width:.3,height:.21,keyframes:undefined,animation:'none',exit:'none'});
   s.layers.push({id:s.id+'-moveset-card-'+i,sourceMoveset:true,type:'image',role:'moveset-card',mediaId:c.imageId,start:c.start,end,x:.055,y:.32,width:.89,height:.38,z:45,fit:'contain',animation:'scale-reveal',entranceDuration:.2,exit:'none'});
  }
 }
 return next;
}
