import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseGIF,decompressFrames} from 'gifuct-js';
import {BUNDLED_POKEMON,POKEMON_LEXICON,normalizePokemon,pokemonAliases,identifyPokemon,resolveName,pokemonVocabulary} from './pokemon-names.mjs';
import {isBackPokemon} from './game-presentation.mjs';
const API='https://pokeapi.co/api/v2/';
const nameMetadata=new Map(BUNDLED_POKEMON.map(e=>[e.name,e]));
function displayName(name){if(nameMetadata.get(name)?.displayName)return nameMetadata.get(name).displayName;const words=name.split('-').map(w=>w[0].toUpperCase()+w.slice(1));if(name.includes('-mega'))return ['Mega',...words.filter(w=>w!=='Mega')].join(' ');const regional={Alola:'Alolan',Galar:'Galarian',Hisui:'Hisuian',Paldea:'Paldean'};const region=words.find(w=>regional[w]);return region?[regional[region],...words.filter(w=>w!==region)].join(' '):words.join(' ');}
export const RIGHTS={attribution:'PokéAPI / PokeAPI sprites / Pokémon Showdown contributors',repository:'https://github.com/PokeAPI/sprites',licenseUrl:'https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt',notice:'Repository distributed under CC0 1.0; its license identifies image contents as Copyright The Pokémon Company. Source license text is retained in cache. API access does not grant a blanket reuse license for Pokémon artwork.'};
const normalize=normalizePokemon;
export const resolvePokemonName=resolveName;
export const detectMentions=identifyPokemon;
export function createPokemonService(cacheDir,{fetcher=fetch,interval=300}={}){
 cacheDir=path.resolve(cacheDir);
 fs.mkdirSync(cacheDir,{recursive:true});let queue=Promise.resolve();let requests=0;const inflight=new Map(),jsonCache=new Map();let catalogCache,catalogStamp;
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 async function download(url){
  const u=new URL(url);if(!['pokeapi.co','raw.githubusercontent.com'].includes(u.hostname)||u.protocol!=='https:')throw Error('Unapproved Pokémon source');
  const task=queue.then(async()=>{for(let attempt=0;attempt<3;attempt++){
   if(interval)await new Promise(r=>setTimeout(r,interval));requests++;
   try{const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});if(!response.ok){const error=Error(`Pokémon source HTTP ${response.status}`);error.status=response.status;error.retryAfter=response.headers.get('retry-after');throw error;}return Buffer.from(await response.arrayBuffer());}
   catch(e){if(e.status===404||attempt===2)throw e;await new Promise(r=>setTimeout(r,Math.min(10000,Number(e.retryAfter)*1000||500*2**attempt)));}
  }});queue=task.catch(()=>{});return task;
 }
 async function cached(url,ext){const file=path.join(cacheDir,hash(url)+ext);if(fs.existsSync(file))return file;if(inflight.has(url))return inflight.get(url);const task=(async()=>{const prefix='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/';if(url.startsWith(prefix)){const folder=path.resolve(cacheDir,'../asset-packs/pokemon-showdown/files'),candidate=path.resolve(folder,url.slice(prefix.length));if(candidate.startsWith(folder+path.sep)&&fs.existsSync(candidate)){fs.copyFileSync(candidate,file);return file;}}const bytes=await download(url);fs.writeFileSync(file+'.partial',bytes);fs.renameSync(file+'.partial',file);return file;})();inflight.set(url,task);try{return await task;}finally{inflight.delete(url);}}
 async function json(endpoint){const file=await cached(API+endpoint,'.json');const stat=fs.statSync(file),stamp=stat.mtimeMs+':'+stat.size,prior=jsonCache.get(file);if(prior?.stamp===stamp)return prior.value;const value=JSON.parse(fs.readFileSync(file,'utf8'));jsonCache.set(file,{stamp,value});return value;}
 function mergeCatalog(records){const names=new Set(records.map(p=>p.name));return [...new Map([...records.map(p=>({...nameMetadata.get(p.name),...p})),...BUNDLED_POKEMON.filter(p=>!names.has(p.name))].map(p=>[p.name,p])).values()];}
 function localCatalog(){const files=['pokemon?limit=100000','pokemon-form?limit=100000'].map(e=>path.join(cacheDir,hash(API+e)+'.json')),stamp=files.map(f=>{try{const stat=fs.statSync(f);return stat.mtimeMs+':'+stat.size;}catch{return 'missing';}}).join('|');if(catalogCache&&stamp===catalogStamp)return catalogCache;const records=[];for(const endpoint of ['pokemon?limit=100000','pokemon-form?limit=100000']){const file=path.join(cacheDir,hash(API+endpoint)+'.json');try{if(fs.existsSync(file))records.push(...JSON.parse(fs.readFileSync(file,'utf8')).results);}catch{}}catalogStamp=stamp;catalogCache=mergeCatalog([...new Map(records.map(r=>[r.name,r])).values()]);return catalogCache;}
 async function catalog(){try{const [pokemon,forms]=await Promise.all([json('pokemon?limit=100000'),json('pokemon-form?limit=100000')]);return mergeCatalog([...new Map([...pokemon.results,...forms.results].map(p=>[p.name,p])).values()]);}catch{return localCatalog();}}

 async function info(name){
  if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid Pokémon identifier');
  let p,form;try{p=await json(`pokemon/${name}`);}catch(e){if(e.status!==404)throw e;form=await json(`pokemon-form/${name}`);p=await json(`pokemon/${form.pokemon.name}`);}
  const species=await json(`pokemon-species/${p.species.name}`);
  const formEntries=[...species.varieties.map(v=>({name:v.pokemon.name,isDefault:v.is_default})),...p.forms.map(f=>({name:f.name,isDefault:f.name===p.name}))];
  const sprites=form&&!form.is_default?form.sprites:p.sprites;
  const available=[];function walk(value,key=''){if(typeof value==='string'&&value.startsWith('https://'))available.push({key,url:value});else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))walk(v,key?`${key}.${k}`:k);}walk(sprites);
  const dex=species.pokedex_numbers.find(n=>n.pokedex.name==='national')?.entry_number;
  if(!dex)throw Error('National Pokédex number missing');
  return {name,displayName:displayName(name),speciesName:species.name,nationalDex:dex,formId:form?.id||p.id,forms:[...new Map(formEntries.map(f=>[f.name,f])).values()],availableSprites:available,types:(form?.types?.length?form.types:p.types).map(t=>t.type.name),stats:p.stats.map(s=>({name:s.stat.name,value:s.base_stat})),statsSource:API+'pokemon/'+p.name+'/',...RIGHTS};
 }
 async function asset(name,{sourceKey,view='front'}={}){
  if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid Pokémon identifier');
  const suffix=sourceKey?'-'+hash(sourceKey).slice(0,12):view==='back'?'-back':'';
  const manifest=path.join(cacheDir,`asset-${name}${suffix}.json`);if(fs.existsSync(manifest)){const m=JSON.parse(fs.readFileSync(manifest,'utf8'));if(m.cacheVersion===2&&fs.existsSync(m.path)&&(sourceKey||view==='back'||!isBackPokemon(m))){const updated={...m,path:path.resolve(m.path),license:RIGHTS.notice,pokemon:{...m.pokemon,...(m.pokemon.animated?{spriteWidth:fs.readFileSync(m.path).readUInt16LE(6),spriteHeight:fs.readFileSync(m.path).readUInt16LE(8)}:{}),...RIGHTS}};return updated;}}
  const details=await info(name);const front=details.availableSprites.filter(s=>new RegExp('(?:^|\\.)'+(view==='back'?'back':'front')+'_default$').test(s.key));
  const ordered=sourceKey?details.availableSprites.filter(s=>s.key===sourceKey):[...front.filter(s=>s.key.includes('showdown')),...front.filter(s=>s.url.endsWith('.gif')&&!s.key.includes('showdown')),...front.filter(s=>s.key===(view==='back'?'back_default':'front_default')),...front.filter(s=>s.key.includes('official-artwork'))];
  let lastError;for(const sprite of [...new Map(ordered.map(s=>[s.url,s])).values()])try{
   const ext=sprite.url.endsWith('.gif')?'.gif':'.png';const file=await cached(sprite.url,ext);const bytes=fs.readFileSync(file);
   let frames=1,cycleMs=0;if(ext==='.gif'){const decoded=decompressFrames(parseGIF(bytes),true);frames=decoded.length;cycleMs=decoded.reduce((n,f)=>n+f.delay,0);if(!frames)throw Error('Empty GIF');}else if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG');
   const licensePath=await cached('https://raw.githubusercontent.com/PokeAPI/sprites/master/LICENCE.txt','.txt');
   const m={cacheVersion:2,id:`pokemon-${name}${suffix}`,kind:'pokemon',name:details.displayName+(sprite.key.includes('shiny')?' (Shiny)':''),path:file,url:'',tags:name,license:RIGHTS.notice,duration:cycleMs/1000,...(ext==='.png'&&bytes.length>=24?{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),transparent:true}:{}),pokemon:{...details,sourceUrl:sprite.url,sourceKey:sprite.key,animated:frames>1,frameCount:frames,...(ext==='.gif'?{spriteWidth:bytes.readUInt16LE(6),spriteHeight:bytes.readUInt16LE(8)}:{}),cycleMs,licensePath,cachedAt:new Date().toISOString()}};
   fs.writeFileSync(manifest,JSON.stringify(m,null,2));return m;
  }catch(e){lastError=e;}
  throw Error(`No exact-form sprite available for ${name}${lastError?`: ${lastError.message}`:''}`);
 }
 async function search(query){const all=await catalog();const q=normalize(query);return all.filter(p=>normalize(p.name).includes(q)||pokemonAliases(p).some(a=>a.includes(q))).slice(0,60);}
 async function mentions(words,options={}){return detectMentions(words,localCatalog(),options);}
 async function evolution(from,to){const details=await info(from);const species=await json(`pokemon-species/${details.speciesName}`);if(!species.evolution_chain?.url)throw Error('Evolution chain is unavailable');const source=species.evolution_chain.url;if(!source.startsWith(API+'evolution-chain/'))throw Error('Invalid evolution source');const chain=await json(source.slice(API.length));const links=[];function walk(node){for(const child of node.evolves_to||[]){links.push({from:node.species.name,to:child.species.name});walk(child);}}walk(chain.chain);const destination=await info(to);return {from,to,verified:from===details.speciesName&&to===destination.speciesName&&links.some(l=>l.from===details.speciesName&&l.to===destination.speciesName),source};}
 async function family(name){const details=await info(name),species=await json('pokemon-species/'+details.speciesName),source=species.evolution_chain?.url;if(!source?.startsWith(API+'evolution-chain/'))throw Error('Evolution family source unavailable');const data=await json(source.slice(API.length)),members=[];function walk(node,stage){members.push({name:node.species.name,stage});for(const child of node.evolves_to||[])walk(child,stage+1);}walk(data.chain,0);return {members,source};}
 async function cry(name,variant='latest'){
  if(!/^[a-z0-9-]+$/.test(name)||!['latest','legacy'].includes(variant))throw Error('Invalid Pokémon cry selection');
  let p;try{p=await json('pokemon/'+name);}catch(e){if(e.status!==404)throw e;const form=await json('pokemon-form/'+name);p=await json('pokemon/'+form.pokemon.name);}
  let source=p.cries?.[variant],crySpecies=name;
  if(!source&&p.species?.name&&p.species.name!==name){const base=await json('pokemon/'+p.species.name);source=base.cries?.[variant];crySpecies=base.name;}
  if(!source)throw Error('No '+variant+' cry available for '+name);
  if(!source.startsWith('https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/'+variant+'/')||!source.endsWith('.ogg'))throw Error('Unexpected Pokémon cry source');
  let file=await cached(source,'.ogg');const header=fs.readFileSync(file).subarray(0,4);
  if(header.toString()!=='OggS'){if(header.subarray(0,3).toString()!=='ID3'&&!(header[0]===255&&(header[1]&224)===224))throw Error('Invalid cry audio');const mp3=file.replace(/\.ogg$/,'.mp3');if(!fs.existsSync(mp3))fs.copyFileSync(file,mp3);file=mp3;}
  return {id:'pokemon-cry-'+name+'-'+variant,name:displayName(name)+' cry ('+variant+')',path:file,kind:'audio',assetRole:'sound-effect',tags:'Pokémon '+name+' cry '+variant,license:'Pokémon cries retain the original game rights holders’ copyright.',duration:0,cry:{name,variant,source,crySpecies},attribution:{credit:'Pokémon original rights holders / PokéAPI cries',source,licenseUrl:'https://github.com/PokeAPI/cries',changes:'Cached and mixed with narration'}};
 }
 async function itemCatalog(){return (await json('item?limit=100000')).results;}
 async function itemAsset(name){
  if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid item identifier');
  const item=await json('item/'+name),source=item.sprites?.default;
  if(!source)throw Error('No official sprite is available for '+name);
  const file=await cached(source,'.png'),bytes=fs.readFileSync(file);
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid item image');
  return {id:'pokemon-item-'+item.name,name:displayName(item.name),path:file,kind:'image',assetRole:'item',tags:'Pokemon item '+item.name.replaceAll('-',' '),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),transparent:true,pixelArt:true,duration:0,license:RIGHTS.notice,identity:{franchise:'pokemon',subject:item.name,source:'PokéAPI item sprite',confidence:1},attribution:{credit:RIGHTS.attribution,source,licenseUrl:RIGHTS.licenseUrl,changes:'Cached item sprite'}};
 }
 async function learnset(name){if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid Pokemon identifier');const p=await json('pokemon/'+name);return (p.moves||[]).map(m=>m.move.name);}
 async function mechanicCatalog(){const [moves,abilities]=await Promise.all([json('move?limit=100000'),json('ability?limit=100000')]);return [...moves.results.map(m=>({...m,kind:'move'})),...abilities.results.map(m=>({...m,kind:'ability'}))];}
 async function mechanic(kind,name){
  if(!['move','ability'].includes(kind)||!/^[a-z0-9-]+$/.test(name))throw Error('Invalid Pokemon mechanic');
  const data=await json(kind+'/'+name),english=data.effect_entries?.find(e=>e.language.name==='en');
  const description=(english?.short_effect||data.flavor_text_entries?.find(e=>e.language.name==='en')?.flavor_text||'').replace(/\$effect_chance/g,String(data.effect_chance??'')).replace(/\s+/g,' ').trim();
  return {kind,name,title:displayName(name),description,type:data.type?.name,power:data.power,damageClass:data.damage_class?.name,accuracy:data.accuracy,effectChance:data.effect_chance,statChanges:data.stat_changes?.map(s=>({stat:s.stat.name,change:s.change})),target:data.target?.name,learnedByPokemon:data.learned_by_pokemon?.map(p=>p.name),source:'https://pokeapi.co/api/v2/'+kind+'/'+name+'/'};
 }
 return {recognitionStatus:()=>({...POKEMON_LEXICON,source:'Bundled canonical names plus locally cached PokeAPI catalog',networkRequired:false}),transcriptionHints:pokemonVocabulary,localCatalog,family,learnset,mechanicCatalog,mechanic,itemCatalog,itemAsset,catalog,info,asset,cry,search,mentions,evolution,resolve:async query=>resolvePokemonName(query,localCatalog()),get requestCount(){return requests;}};
}
