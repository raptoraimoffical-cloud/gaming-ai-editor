import fs from 'node:fs';
import path from 'node:path';
import {planMoveEffects} from './move-effects.mjs';
import {noMotion} from './game-presentation.mjs';
import {pokemonTypeCues} from './pokemon-type-cues.mjs';
import {battleMoveCues} from './combat-motion.mjs';
import {moveContext} from './move-context.mjs';
import {isGeneratedMechanicCard,mechanicImageKind,mechanicImageRole,findMechanicImage,sourceMechanicGeometry} from './mechanic-images-policy.mjs';
const norm=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
const slug=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').toLowerCase().replace(/^-|-$/g,'');
export function sourceMechanicCues(project){
 const cues=[...planMoveEffects(project).map(c=>({...c,kind:'move'})),...battleMoveCues(project),...(project.shortMechanics?.cues||[]).filter(c=>['move','ability'].includes(c.kind)),...pokemonTypeCues(project)];
 // Older saves and selective editor paths may already contain a generated
 // panel, even when their semantic plan is absent. Source those too.
 for(const s of project.scenes)for(const l of s.layers||[])if(isGeneratedMechanicCard(l)&&l.setupGraphic.title){
  const kind=mechanicImageKind(l.setupGraphic.kind),title=l.setupGraphic.title;
  if(!cues.some(c=>c.sceneId===s.id&&c.kind===kind&&norm(c.title)===norm(title)&&Math.abs(c.start-l.start)<.1))cues.push({...l.setupGraphic,kind,name:slug(title),title,sceneId:s.id,start:l.start,end:l.end,existingLayer:true});
 }
 return [...new Map(cues.filter(c=>c.name&&Number.isFinite(c.start)).map(c=>[[c.sceneId,c.kind,c.name,c.start.toFixed(2)].join('/'),c])).values()].sort((a,b)=>a.start-b.start);
}
const matching=(m,c)=>findMechanicImage({media:[m]},c.kind,c.title)===m;
export function createSourceMoveCards(folder,{register=m=>m,search,download,verify,capture}={}){
 fs.mkdirSync(folder,{recursive:true});const pending=new Map(),inspections=new Map();
 async function acquire(project,{library=[],keys={},progress=()=>{},check=()=>{},state,canVerify=true}={}){
  const next={...project,media:[...project.media],sourceMoveCardReport:[]},pool=[...next.media,...library];
  const mechanics=sourceMechanicCues(project);
  for(const move of [...new Map(mechanics.map(c=>[c.kind+'/'+c.name,c])).values()]){
   if(move.kind==='move'&&!moveContext(project,move).showCard&&!mechanics.some(c=>c.kind==='move'&&c.name===move.name&&moveContext(project,c).showCard))continue;
   const kind=move.kind,role=mechanicImageRole(kind),icon=kind==='type';
   check();const usable=pool.filter(m=>matching(m,move)&&typeof m.path==='string'&&fs.existsSync(m.path));let selected=usable.find(m=>m.provider!=='published-page'),fallback=usable.find(m=>m.provider==='published-page');
   const record=path.join(folder,(kind==='move'?'':kind+'-')+slug(move.name)+'-v1.json');
   if(!selected)try{const m=JSON.parse(fs.readFileSync(record,'utf8'));if(matching(m,move)&&fs.existsSync(m.path)){if(m.provider==='published-page')fallback=await register(m);else selected=await register(m);}}catch{}
   if(!selected&&keys['google-images']&&search&&download&&verify&&canVerify){
    const choose=async()=>{
     progress({stage:'Finding sourced '+kind+' '+(icon?'icon':'name and description image')+': '+move.title});
     const queries=icon?['Pokemon "'+move.title+'" type official game icon badge','Pokemon "'+move.title+'" type game label transparent']:['Pokemon "'+move.title+'" '+kind+' in game description info screen','Pokemon "'+move.title+'" '+kind+' summary description screenshot','Pokemon "'+move.title+'" '+kind+' name description -"trading card" -merch','Pokemon "'+move.title+'" '+kind+' description competitive'];
     const tried=new Set();for(const query of queries){const results=await search(query,'google-images',keys['google-images'],{exactQuery:true,purpose:role});
     for(const c of results){
      check();if(tried.has(c.id))continue;tried.add(c.id);const text=[c.name,c.attribution?.description].join(' ');
      if(/trading card|tcg|merch|shirt|wallpaper/i.test(text))continue;
      try{const image=await download(c);if(!image.decoded||image.width<(icon?96:480)||image.height<(icon?32:160)||image.animationInfo?.animated)continue;
       const stat=fs.statSync(image.path),key=JSON.stringify([kind,move.name,c.id,image.path,stat.size,stat.mtimeMs,state?.settings?.url,state?.models?.vision?.digest||state?.models?.vision?.name]);
       let inspection=inspections.get(key);if(!inspection){inspection=await verify(state,move,image.path);if(inspection?.available&&typeof inspection.name==='string'&&(icon||typeof inspection.description==='string')){if(inspections.size>=512)inspections.delete(inspections.keys().next().value);inspections.set(key,inspection);}}check();
       const visibleName=icon?norm(inspection?.name).replace(/type$/,''):norm(inspection?.name);
       if(!inspection?.available||!inspection.accepted||visibleName!==norm(move.title)||!icon&&(typeof inspection.description!=='string'||inspection.description.trim().length<20)){next.sourceMoveCardReport.push({kind,move:move.name,rejected:c.id,reason:inspection?.reason||'Image name and readable description could not be verified'});continue;}
       const m=await register({...image,assetRole:role,moveCard:{kind,name:move.title,description:inspection.description||'',verified:true,model:inspection.model},identity:{franchise:'pokemon',subject:move.name,source:image.attribution?.source||image.originalUrl,confidence:.9}});
       fs.writeFileSync(record,JSON.stringify(m));return m;
      }catch(e){check();next.sourceMoveCardReport.push({move:move.name,warning:e.message});}
     }}
    };
    const id=kind+'/'+move.name;let task=pending.get(id);if(!task){task=choose();pending.set(id,task);}try{selected=await task;}catch(e){check();next.sourceMoveCardReport.push({move:move.name,warning:e.message});}finally{if(pending.get(id)===task)pending.delete(id);}
   }
   if(!selected&&fallback?.captureVersion===5)selected=fallback;
   if(!selected&&capture&&!icon)try{check();progress({stage:'Capturing the published '+kind+' reference: '+move.title});selected=await capture(move);check();if(selected)fs.writeFileSync(record,JSON.stringify(selected));}catch(e){check();next.sourceMoveCardReport.push({kind,move:move.name,warning:'Published reference: '+e.message});}
   selected??=fallback;
   if(selected){next.media=next.media.filter(m=>m.id!==selected.id).concat(selected);next.sourceMoveCardReport.push({kind,move:move.name,mediaId:selected.id,source:selected.provider==='published-page'?'Unchanged published page excerpt':'verified sourced image'});}
   else next.sourceMoveCardReport.push({kind,move:move.name,status:'unavailable',reason:!canVerify?'A vision model is unavailable to verify the sourced image; no invented graphic substituted':!keys['google-images']?'Google Images is not configured; no invented description graphic substituted':'No matching '+(icon?'game type icon':'readable name-and-description image')+' verified; no invented graphic substituted'});
  }
  return next;
 }
 return {acquire};
}
export function applySourceMoveCards(project){
 const next=structuredClone(project),allCues=sourceMechanicCues(next);next.sourceMechanicImagesOnly=true;
 const combat=(next.actionMovieReport?.plans||[]).filter(p=>p.moveName);
 // Carry the same sourced evidence through a sentence cut while the attack
 // finishes. It cannot appear before the actual narrated move name.
 for(const p of combat)for(const s of next.scenes.filter(s=>s.end>p.spokenAt&&s.start<p.end))if(!allCues.some(c=>c.sceneId===s.id&&c.kind==='move'&&c.name===p.moveName))allCues.push({kind:'move',sceneId:s.id,name:p.moveName,title:p.moveName.replaceAll('-',' '),start:Math.max(s.start,p.spokenAt),end:p.end,combatContinuation:true});
 for(const s of next.scenes){
  for(const l of s.layers||[]){if(!isGeneratedMechanicCard(l))continue;
   const kind=mechanicImageKind(l.setupGraphic.kind),m=findMechanicImage(next,kind,l.setupGraphic.title);if(!m){l.unavailableSourceCard=true;continue;}
   l.type='image';l.mediaId=m.id;l.sourceMoveCard=true;l.sourceMechanicKind=kind;l.role=kind==='type'?'type-icon':'mechanic-card';l.fit='contain';
   if(!l.instructionLocked&&!s.manualTemplate)Object.assign(l,sourceMechanicGeometry(m,kind,next));
   if(l.autoMoveEffect){const nextCue=allCues.find(c=>c.sceneId===s.id&&c.start>l.start+.02);l.end=Math.min(s.end,nextCue?.start??s.end,Math.max(l.end,l.start+2.4));}
   delete l.setupGraphic;
  }
  s.layers=(s.layers||[]).filter(l=>!l.unavailableSourceCard);
  s.layers=s.layers.filter(l=>!l.sourceMoveCard||l.manual||l.instructionLocked||l.sourceMechanicKind!=='move'||moveContext(next,{kind:'move',name:slug(next.media.find(m=>m.id===l.mediaId)?.moveCard?.name||next.media.find(m=>m.id===l.mediaId)?.effectMoveName),title:next.media.find(m=>m.id===l.mediaId)?.moveCard?.name||'',start:l.start}).showCard);
  if(s.manualTemplate)continue;
  const cues=allCues.filter(c=>c.sceneId===s.id).sort((a,b)=>a.start-b.start);
  for(const [i,c] of cues.entries()){
   if(c.kind==='move'&&!moveContext(next,c).showCard)continue;
   const m=findMechanicImage(next,c.kind,c.title)||(c.kind==='move'?next.media.find(m=>m.kind==='image'&&m.assetRole==='move-art'&&m.effectMoveName===c.name&&m.moveArtLayout==='reference'&&m.moveArtInspection?.accepted):undefined);
   if(!m||s.layers.some(l=>l.sourceMoveCard&&l.mediaId===m.id&&l.start<=c.start+.02&&l.end>c.start))continue;
   const action=combat.find(p=>p.moveName===c.name&&p.spokenAt<=c.start+.02&&p.end>c.start),end=Math.min(s.end,cues[i+1]?.start??s.end,c.combatContinuation?(action?.end??c.end):Math.max(c.start+2.6,c.end??0,action?.end??0));if(end-c.start<.3)continue;
   const baseId=s.id+'-source-'+c.kind+'-'+slug(c.name)+'-'+Math.round(c.start*1000);let id=baseId,suffix=1;while(s.layers.some(l=>l.id===id))id=baseId+'-'+suffix++;
   s.layers.push({id,type:'image',role:c.kind==='type'?'type-icon':'mechanic-card',sourceMoveCard:true,sourceMechanicKind:c.kind,mediaId:m.id,fit:'contain',...sourceMechanicGeometry(m,c.kind,next),z:70,start:c.start,end,referenceContinuation:!!c.combatContinuation,animation:noMotion(next)||c.combatContinuation?'none':'slide-in-out',direction:'left',entranceDuration:.18,exit:'none'});
  }
  for(const l of s.layers.filter(l=>l.sourceMoveCard&&l.sourceMechanicKind==='move'&&!l.manual&&!l.instructionLocked)){const m=next.media.find(m=>m.id===l.mediaId),name=slug(m?.moveCard?.name||m?.effectMoveName),action=combat.find(p=>p.moveName===name&&p.spokenAt>=l.start-.02&&p.spokenAt<l.end);if(action){const other=allCues.filter(c=>c.sceneId===s.id&&c.start>l.start+.02&&c.name!==name).sort((a,b)=>a.start-b.start)[0];l.end=Math.min(s.end,other?.start??s.end,Math.max(l.end,action.end));}}
 }
 return next;
}
