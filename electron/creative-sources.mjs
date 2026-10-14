import {isBackPokemon} from './game-presentation.mjs';
import {spokenNameCue} from './subject-grounding.mjs';
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bmoustache\b/g,'mustache').replace(/[^a-z0-9]+/g,' ').trim();
const phrase=(hay,name)=>name&&(' '+hay+' ').includes(' '+name+' ');
const generic=new Set(['pokemon','picture','image','photo','portrait','artwork','official','transparent','png','gif','animated','background','character','item','move','ability','icon','description','real','of','the','a']);
function groupEstablished(project,name,at){
 const key=s=>norm(s).split(' ').sort().join(' ');
 return (project.visualInstructionPlan||[]).some(g=>{if(g.kind!=='group'||!g.members?.some(m=>key(m.name)===key(name)))return false;const scene=project.scenes.find(s=>s.id===g.sceneId);if(!scene)return false;const tokens=norm(g.quote).split(' '),index=g.quote?scene.words.findIndex((_,i)=>norm(scene.words.slice(i,i+tokens.length).map(w=>w.text).join(' '))===norm(g.quote)):0;return index>=0&&(scene.words[index]?.start??scene.start)<=at+.02;});
}
export function creativeCueAllowed(project,prop,pool,at){
 const query=norm(prop.query),names=[...project.scenes.flatMap(s=>[...(s.reaction?.entities||[]),...(s.aiSubjects||[])].filter(e=>['pokemon','person','character'].includes(e.type)).map(e=>e.name)),...pool.filter(m=>m.assetRole!=='narration-prop'&&(m.pokemon||m.sourceMatch)).map(m=>m.pokemon?.displayName||m.sourceMatch?.name||m.identity?.subject)];
 for(const name of names.filter(Boolean)){if(!phrase(query,norm(name))||groupEstablished(project,name,at))continue;const first=project.scenes.map(s=>spokenNameCue(s,name)?.start).filter(Number.isFinite).sort((a,b)=>a-b)[0];if(first!==undefined&&at<first-.05)return false;}
 return true;
}
export function creativeSource(project,scene,prop,pool,at){
 const query=norm(prop.query.replace(/(?:^|\s)-\S+/g,'')),animated=/\bgif\b/i.test(prop.query),stage=prop.anchor==='stage';
 if(!creativeCueAllowed(project,prop,pool,at))return undefined;
 const current=project.scenes.filter(s=>s.start<=at).flatMap(s=>s.reaction?.entities||[]).filter(e=>(e.start??0)<=at+.02);
 const ranked=[];
 for(const media of pool){
  if(!['image','pokemon','video'].includes(media.kind)||media.generatedForProject||media.assetRole==='build-sheet'||media.assetRole==='background'||media.assetRole==='logo')continue;
  if(!stage&&!media.transparent&&!media.pokemon)continue;
  if(isBackPokemon(media)&&!/\b(?:back|rear)\b/i.test(prop.query))continue;
  if(animated&&media.animationInfo?.animated!==true&&media.kind!=='video')continue;
  if(media.provider==='google-images'&&(!media.decoded||media.webAssessment?.accepted===false||media.assetReview?.accepted===false))continue;
  if(!media.pokemon&&!media.license&&!media.attribution?.source&&!/^User-confirmed/.test(media.identity?.source||''))continue;
  const names=[media.pokemon?.displayName,media.pokemon?.name,media.identity?.subject,media.sourceMatch?.name,media.moveCard?.name,media.nature?.name,media.name].map(norm).filter(n=>n&&n.split(' ').some(w=>!generic.has(w)));
  let match=names.filter(n=>phrase(query,n)).sort((a,b)=>b.length-a.length)[0];
  // The current canonical Mega/form remains authoritative when the narrator
  // subsequently calls it by its ordinary species name.
  const established=current.find(e=>e.mediaId===media.id&&phrase(query,norm(e.name)));
  if(!match&&established)match=norm(established.name);
  if(!match)continue;
  if(media.pokemon){
   const spoken=current.some(e=>e.mediaId===media.id)||(project.pokemonMentions||[]).some(m=>m.mediaId===media.id&&m.start<=at+.02)||groupEstablished(project,media.pokemon.displayName||media.name,at);
   if(!spoken)continue;
  }
  const score=match.split(' ').length*10+match.length+(established?20:0)+(media.creativeQuery===prop.query?100:0);
  ranked.push({media,score});
 }
 return ranked.sort((a,b)=>b.score-a.score)[0]?.media;
}
