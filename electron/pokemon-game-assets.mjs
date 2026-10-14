import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const notice='Pokémon game artwork and trademarks belong to their original rights holders. Source archive is attribution, not a royalty-free license.';
const source='https://www.pokeos.com/archive/assets/champions';
export function gameMentions(scene,games){
 const text=normal(scene.text),matches=[];
 for(const game of games){for(const alias of game.aliases){const q=normal(alias);const re=new RegExp('(?:^| )'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?= |$)','g');let m;while((m=re.exec(text))){const index=m.index+(m[0].startsWith(' ')?1:0);let cursor=0,start=scene.start;for(const word of scene.words||[]){if(cursor+normal(word.text).length>index){start=word.start;break;}cursor+=normal(word.text).length+1;}matches.push({game,index,length:q.length,start});}}}
 matches.sort((a,b)=>a.index-b.index||b.length-a.length);
 return matches.filter((m,i)=>!matches.slice(0,i).some(p=>m.index>=p.index&&m.index<p.index+p.length)).map(m=>({game:m.game,start:m.start}));
}
export function addGameLogoLayers(project){
 return {...project,scenes:project.scenes.map(scene=>{
  const layers=(scene.layers||[]).filter(l=>l.role!=='game-logo'||l.manual);
  const mentions=scene.gameLogos||[];
  for(const [i,mention] of mentions.entries()){
   const next=mentions.find(m=>m.start>mention.start+.01),end=Math.min(scene.end,next?.start??mention.start+3.2);
   if(end-mention.start<.05)continue;
   const peers=mentions.filter(m=>Math.abs(m.start-mention.start)<.01),slot=peers.indexOf(mention),vertical=project.format!=='horizontal';
   layers.push({id:scene.id+'-game-logo-'+i,type:'image',role:'game-logo',mediaId:mention.mediaId,x:peers.length>1?.06+slot*.47:.16,y:vertical?.065:.04,width:peers.length>1?.41:.68,height:vertical?.14:.21,z:70,start:mention.start,end,fit:'contain',animation:'spring-pop',animationAmount:.06,enter:'fade',exit:'fade',entranceDuration:.28,exitDuration:.18,instructionLocked:true});
  }
  return {...scene,layers};
 })};
}
export function createPokemonGameAssets(folder,{register,inspect,fetchImpl=fetch}){
 fs.mkdirSync(folder,{recursive:true});const verified=new Map();
 async function request(url){const r=await fetchImpl(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'GamingAIEditor/0.1 asset attribution client'}});if(!r.ok)throw Error('Pokémon asset source HTTP '+r.status);return r;}
 async function cachedJSON(name,url){const file=path.join(folder,name+'.json');if(fs.existsSync(file)&&Date.now()-fs.statSync(file).mtimeMs<86400000)return JSON.parse(fs.readFileSync(file));const d=await(await request(url)).json();fs.writeFileSync(file,JSON.stringify(d));return d;}
 async function games(){const data=await cachedJSON('games','https://api.pokeos.com/api/general/game_catalog');const rows=data.flatMap(g=>{
  const title=g.version_group_name?.[9];if(!title||!Array.isArray(g.games))return [];
  const versions=g.games.map(v=>{const n=v.name?.[9]||title;const name=/^pok[eé]mon/i.test(n)?n:'Pokémon '+n;return {id:'pokemon-game-'+v.id,code:g.version_group_code,name,versionId:v.id,aliases:[name],source:'https://www.pokeos.com/db/games/'+g.version_group_code};});
  if(versions.length>1)versions.unshift({id:'pokemon-group-'+g.version_group_id,code:g.version_group_code,name:title,aliases:[title],versions:[...versions],source:'https://www.pokeos.com/db/games/'+g.version_group_code});return versions;
 });return [{id:'pokemon-showdown',code:'showdown',name:'Pokémon Showdown',aliases:['Pokémon Showdown','Showdown'],source:'https://pokemonshowdown.com/'},...rows];}
 async function archive({query='',offset=0,kind='all'}={}){if(!Number.isInteger(offset)||offset<0)throw Error('Invalid archive page');const entries=await cachedJSON('champions','https://api.pokeos.com/api/poke/game/assets?versionGroupCode=champions');if(!Array.isArray(entries))throw Error('Invalid Pokéos archive response');const species=await cachedJSON('species','https://pokeapi.co/api/v2/pokemon-species?limit=2000');const names=new Map((species.results||[]).map(s=>[s.url.split('/').filter(Boolean).at(-1),s.name]));const files=entries.filter(e=>typeof e.path==='string'&&e.path.startsWith('./games/champions/')&&!e.path.includes('..')).map(e=>{const filename=path.basename(e.path),speciesName=names.get(String(e.pokemon_species_id))||String(e.pokemon_species_id),variant=/shiny/.test(e.path)?'shiny':'default';const c={id:'pokeos-champions-'+e.id,name:'Champions '+speciesName+' '+filename,url:'https://s3.pokeos.com/pokeos-uploads/assets/pokemon/'+e.path.slice(2),kind:'image',provider:'pokeos',assetRole:'character',pixelArt:!/render/.test(e.path),tags:'Pokémon Champions game asset species '+e.pokemon_species_id+' '+filename+' '+variant,license:notice,identity:{franchise:'pokemon',subject:'species-'+e.pokemon_species_id,variant,source:'Pokéos Champions archive',confidence:1},attribution:{credit:'Pokéos / Pokémon original rights holders',source,licenseUrl:source,changes:'Scaled and animated by Gaming AI Editor'},archive:{speciesId:String(e.pokemon_species_id),variant}};verified.set(c.id,c);return c;}).filter(c=>(kind==='all'||c.archive.variant===kind)&&(c.name+' '+c.tags).toLowerCase().includes(query.toLowerCase()));return {files:files.slice(offset,offset+60),total:files.length,source};}
 async function download(candidate){const c=verified.get(candidate.id);if(!c)throw Error('Refresh the source catalog before importing');const u=new URL(c.url);if(u.protocol!=='https:'||!['s3.pokeos.com','champions.pokemon.com','pokemonshowdown.com','archives.bulbagarden.net'].includes(u.hostname))throw Error('Unexpected Pokémon asset host');const ext=path.extname(u.pathname)||'.png',file=path.join(folder,crypto.createHash('sha256').update(c.url).digest('hex').slice(0,24)+ext);if(!fs.existsSync(file)){const r=await request(c.url);if(!r.headers.get('content-type')?.startsWith('image/'))throw Error('Source did not return an image');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>30e6||bytes.length<24)throw Error('Invalid or oversized source image');fs.writeFileSync(file,bytes);}return register({...c,...await inspect(file,'image'),path:file,originalUrl:c.url,duration:0});}
 async function logo(game){
  let url,origin=game.source;
  if(game.code==='showdown')url='https://pokemonshowdown.com/images/pokemonshowdownbeta@2x.png';
  else if(game.code==='champions'){url='https://champions.pokemon.com/_images/global/shared/pkmncp_logo-2x.png';origin='https://champions.pokemon.com/en-us/';}
  else {const titles=[game.name+' logo.png',game.name+' Version logo.png',game.name+' logo EN.png',game.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')+' Logo EN.png'].map(t=>'File:'+t).join('|');const api='https://archives.bulbagarden.net/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles,prop:'imageinfo',iiprop:'url|size',redirects:'1'});const data=await cachedJSON('logo-variants-v2-'+game.id,api);const page=Object.values(data.query?.pages||{}).find(p=>p.imageinfo?.[0]);if(!page)throw Error('No exact English logo found for '+game.name);url=page.imageinfo[0].url;origin=page.imageinfo[0].descriptionurl;}
  const c={id:'logo-'+game.id,name:game.name+' logo',url,kind:'image',assetRole:'logo',provider:'pokemon-game-assets',tags:game.name+' game logo '+game.code,license:notice,identity:{franchise:'pokemon',subject:game.id,variant:'English game logo',source:origin,confidence:1},attribution:{credit:game.code==='showdown'?'Pokémon Showdown / original rights holders':'Pokémon original rights holders',source:origin,licenseUrl:origin,changes:'Scaled and animated'},game:{id:game.id,code:game.code,name:game.name}};verified.set(c.id,c);return download(c);
 }
 async function background(game){let url,origin;
  if(game.code==='champions'){url='https://champions.pokemon.com/_images/home/overview/game-screenshot-1-2x.png';origin='https://champions.pokemon.com/en-us/';}
  else if(game.code==='showdown'){url='https://pokemonshowdown.com/images/screenshot-desktop.png';origin=game.source;}
  else {const api='https://archives.bulbagarden.net/w/api.php?'+new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:game.name+' screenshot',gsrnamespace:'6',gsrlimit:'10',prop:'imageinfo',iiprop:'url|size'});const d=await cachedJSON('background-'+game.id,api);const token=normal(game.name).replace(/^pokemon /,'');const page=Object.values(d.query?.pages||{}).find(p=>p.imageinfo?.[0]?.width>=640&&p.imageinfo[0].height>=350&&normal(p.title).includes(token)&&!/(logo|map|chart|concept|sprite)/i.test(p.title));if(!page)return null;url=page.imageinfo[0].url;origin=page.imageinfo[0].descriptionurl;}
  const c={id:'background-'+game.id,name:game.name+' screenshot background',url,kind:'image',assetRole:'background',provider:'pokemon-game-assets',tags:game.name+' gameplay screenshot background environment',license:notice,identity:{franchise:'pokemon',subject:game.id,variant:'Original source screenshot',source:origin,confidence:1},attribution:{credit:'Original game rights holders / source archive',source:origin,licenseUrl:origin,changes:'Cropped and animated'},game:{id:game.id,code:game.code,name:game.name}};verified.set(c.id,c);return download(c);
 }
 async function attach(project,progress=()=>{}){if(!/pok[eé]mon|showdown/i.test(project.scenes.map(s=>s.text).join(' ')))return project;const catalogue=await games(),media=new Map(project.media.map(m=>[m.id,m])),scenes=[],warnings=[];
  for(const original of project.scenes){const scene={...original,gameLogos:[],gameBackgroundId:undefined};for(const mention of gameMentions(scene,catalogue)){for(const game of mention.game.versions||[mention.game]){progress({stage:'Loading exact game logo: '+game.name});try{const m=await logo(game);media.set(m.id,m);scene.gameLogos.push({mediaId:m.id,start:mention.start,name:game.name});const bg=await background(game);if(bg){media.set(bg.id,bg);scene.gameBackgroundId=scene.gameBackgroundId||bg.id;}}catch(e){warnings.push(game.name+': '+e.message);}}}scenes.push(scene);}return {...project,media:[...media.values()],scenes,gameAssetWarnings:warnings};}
 function brandLogo(){const p=new URL('./data/pokemon-logo.png',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('./data/pokemon-logo-source.json',import.meta.url),'utf8'));return register({id:'pokemon-brand-logo',name:'Pokemon logo',path:fileURLToPath(p),kind:'image',assetRole:'logo',width:960,height:353,transparent:true,duration:0,license:meta.license,identity:{franchise:'pokemon',subject:'pokemon-brand',source:meta.source,confidence:1},attribution:meta});}
 return {games,archive,download,logo,background,attach,brandLogo};
}
