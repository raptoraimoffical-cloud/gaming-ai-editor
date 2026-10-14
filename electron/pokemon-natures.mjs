import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {noMotion,projectGame} from './game-presentation.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./data/pokemon-natures.json',import.meta.url),'utf8'));
const sprites=JSON.parse(fs.readFileSync(new URL('./data/nature-mints/sources.json',import.meta.url),'utf8'));
export const POKEMON_NATURES=catalog.natures;
const token=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
export function natureCues(project){
 if(projectGame(project)!=='pokemon'&&(!project.shortStyle?.startsWith('pokemon-')||projectGame(project)==='minecraft'))return [];
 const cues=[];
 for(const scene of project.scenes){const words=scene.words||[],tokens=words.map(w=>token(w.text));
  for(let i=0;i<words.length;i++)for(let size=1;size<=3&&i+size<=words.length;size++){
   const joined=tokens.slice(i,i+size).join(''),nature=POKEMON_NATURES.find(n=>n.name===joined||joined==='timed'&&n.name==='timid');if(!nature)continue;
   const before=tokens.slice(Math.max(0,i-5),i).join(' '),after=tokens.slice(i+size,i+size+4).join(' ');
   const explicit=/\b(?:nature|mint|natures|mints)\b/.test(before+' '+after),build=/\b(?:run|running|runs|use|using|with|give|make|go)\b/.test(before)&&projectGame(project)==='pokemon'&&/\b(?:evs|speed|attack|defense|build|spread|stats)\b/.test(tokens.slice(Math.max(0,i-8),i+size+8).join(' '));
   if(!explicit&&!build||/\b(?:not|never|isnt|isn't|without)\s*(?:(?:run|use|have|has|give|with)\s*)?$/.test(before)||words[i+size-1].end-words[i].start>1.8)continue;
   cues.push({...nature,kind:'nature',sceneId:scene.id,start:words[i].start,end:Math.min(scene.end,words[i].start+2.6),wordIndex:i,wordCount:size,quote:words.slice(i,i+size).map(w=>w.text).join(' '),corrected:size>1||joined!==nature.name,source:catalog.source});i+=size-1;break;
  }
 }return cues;
}
export function bundledNatureMint(name){
 const nature=POKEMON_NATURES.find(n=>n.name===name);if(!nature)throw Error('Unknown Pokemon nature');
 const group=({'Attack':'adamant','Defense':'bold','Sp. Atk':'modest','Sp. Def':'calm','Speed':'timid'})[nature.increased]||'serious',sprite=sprites.sprites.find(s=>s.group===group),mint=nature.mint;
 return {id:'pokemon-item-'+mint,name:mint.split('-').map(t=>t[0].toUpperCase()+t.slice(1)).join(' '),kind:'image',assetRole:'item',path:fileURLToPath(new URL('./data/nature-mints/'+sprite.filename,import.meta.url)),width:sprite.width,height:sprite.height,transparent:true,pixelArt:true,duration:0,tags:'Pokemon nature mint '+mint.replaceAll('-',' '),license:sprites.notice,identity:{franchise:'pokemon',subject:mint,source:'Bundled original game bag sprite',confidence:1},attribution:{source:sprite.source,page:sprite.page,credit:'Pokemon original rights holders / Bulbagarden Archives',changes:'Unmodified game sprite. Mints of the same boosted stat share an icon.'}};
}
export async function enrichNatures(project,register=m=>m){
 const next=structuredClone(project),cues=natureCues(next);
 for(const cue of cues){const scene=next.scenes.find(s=>s.id===cue.sceneId);if(cue.corrected){scene.words[cue.wordIndex].captionText=cue.title;for(let j=1;j<cue.wordCount;j++)scene.words[cue.wordIndex+j].captionText='';}
  const m=await register(bundledNatureMint(cue.name));if(!next.media.some(a=>a.id===m.id))next.media.push(m);cue.mediaId=m.id;
 }next.naturePlan=cues;next.natureRecognitionReport={known:25,recognized:cues.length,corrected:cues.filter(c=>c.corrected).length,source:catalog.source};return next;
}
export function applyNatureMints(project){
 const next=structuredClone(project),motion=!noMotion(next);
 for(const s of next.scenes){s.layers=(s.layers||[]).filter(l=>!l.natureMint);if(s.manualTemplate)continue;
  for(const [i,c] of (next.naturePlan||[]).filter(c=>c.sceneId===s.id).entries()){
   const actors=s.layers.filter(l=>l.role==='subject'&&l.start<=c.start&&l.end>c.start&&next.media.find(m=>m.id===l.mediaId)?.identity?.franchise!=='minecraft').sort((a,b)=>b.start-a.start),mention=(next.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.start<=c.start).at(-1),actor=actors.find(l=>l.mediaId===mention?.mediaId)||actors.at(-1);
   if(!actor)continue;
   const end=Math.min(c.end,(next.naturePlan||[]).find(n=>n.sceneId===s.id&&n.start>c.start)?.start??s.end),x=Math.max(.04,Math.min(.77,actor.x+actor.width*.70)),y=Math.max(.12,Math.min(.41,actor.y+actor.height*.55)),id=s.id+'-nature-mint-'+i;
   const label=c.title+(c.increased?' | +'+c.increased+' / -'+c.decreased:' | Neutral stats');
   s.layers.push({id,type:'image',role:'nature-mint',natureMint:true,mediaId:c.mediaId,x,y,width:.19,height:.14,z:62,start:c.start,end,fit:'contain',animation:motion?'spring-pop':'none',entranceDuration:.18,exit:'none'}, {id:id+'-label',natureMint:true,type:'text',role:'nature-label',text:label,x:.07,y:.64,width:.86,height:.045,z:63,start:c.start,end,color:'#fff025',fontSize:38,animation:motion?'slide-in-out':'none',direction:'up',entranceDuration:.18,exit:'none'});
  }
 }return next;
}
