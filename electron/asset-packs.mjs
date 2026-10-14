import fs from 'node:fs';import path from 'node:path';import {parseGIF} from 'gifuct-js';
export function readPackCatalog(root,workspace){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'asset-packs/catalog.json')));
 return {...catalog,packs:catalog.packs.map(p=>{const file=path.join(workspace,'asset-packs',p.id,'manifest.json');let manifest;try{manifest=JSON.parse(fs.readFileSync(file));}catch{}return {...p,installed:!!manifest,count:manifest?.assets.length||0,failures:manifest?.failures?.length||0};})};
}
export function readPackAssets(root,workspace){
 const assets=[];
 for(const pack of readPackCatalog(root,workspace).packs){if(!pack.installed)continue;
  const folder=path.resolve(workspace,'asset-packs',pack.id),file=path.join(folder,'manifest.json'),manifest=JSON.parse(fs.readFileSync(file));
  for(const original of manifest.assets){const m=structuredClone(original);m.pack={...m.pack,name:pack.name};const relative=path.relative(folder,m.path);
   if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.existsSync(m.path)||m.pack?.id!==pack.id||!m.license)continue;
   if(m.pokemon){try{const gif=parseGIF(fs.readFileSync(m.path)),frames=gif.frames.filter(f=>f.image);if(!frames.length)continue;m.pokemon.frameCount=frames.length;m.pokemon.cycleMs=frames.reduce((sum,f)=>sum+Math.max(20,(f.gce?.delay||10)*10),0);m.pokemon.animated=frames.length>1;m.duration=m.pokemon.cycleMs/1000;}catch{continue;}}
   assets.push(m);
  }
 }
 return assets;
}
export function narrationAssets(library,text,voice){
 const tokens=new Set(text.toLowerCase().match(/[a-z0-9]+/g)||[]);
 // Original generic packs are browsable/manual choices, never exact franchise matches.
 return [voice,...library.filter(m=>m.id!==voice.id&&m.kind!=='audio'&&m.kind!=='pokemon'&&!m.pack&&m.license&&(m.name+' '+m.tags).toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>3&&tokens.has(t)).length>=2).slice(0,120)];
}
export function narrationSounds(library,scenes){
 const cues=['coin','jump','explosion','laser','powerup','hit','victory','levelup'];const result=[];
 for(const scene of scenes)for(const word of scene.words){const cue=cues.find(c=>new RegExp('\\b'+c+'(?:s|ed|ing)?\\b','i').test(word.text));if(!cue||result.length>=8||result.some(f=>Math.abs(f.start-word.start)<1.5))continue;
  const m=library.find(m=>m.assetRole==='sound-effect'&&m.license&&new RegExp('(?:^|[^a-z])'+cue+'(?:[^a-z]|$)','i').test(m.tags));if(m)result.push({media:m,start:word.start,volume:.08});
 }
 return result;
}
