import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const showdownSource='https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/battle-animations.ts';
const pokemonTracks=[['dpp-trainer','Diamond / Pearl trainer battle'],['dpp-rival','Diamond / Pearl rival battle'],['hgss-johto-trainer','HeartGold / SoulSilver Johto trainer'],['hgss-kanto-trainer','HeartGold / SoulSilver Kanto trainer'],['bw-trainer','Black / White trainer battle'],['bw-rival','Black / White rival battle'],['bw-subway-trainer','Black / White Battle Subway'],['bw2-rival','Black 2 / White 2 rival'],['bw2-kanto-gym-leader','Black 2 / White 2 Kanto gym leader'],['xy-trainer','X / Y trainer battle'],['xy-rival','X / Y rival battle'],['oras-trainer','Omega Ruby / Alpha Sapphire trainer'],['oras-rival','Omega Ruby / Alpha Sapphire rival'],['sm-trainer','Sun / Moon trainer battle'],['sm-rival','Sun / Moon rival battle'],['xd-miror-b','XD Miror B'],['colosseum-miror-b','Colosseum Miror B']];
const wesnothTracks=[['battle','Battle','Aleksi Aubry-Carlson'],['battle-epic','Epic battle','Doug Kaufman'],['knolls','Knolls','Timothy Pinkham'],['main_menu','Main menu','Aleksi Aubry-Carlson'],['wanderer','Wanderer','Timothy Pinkham']];
export const GAME_MUSIC=[...pokemonTracks.map(([id,name])=>({id:'pokemon-'+id,name:'Pokemon · '+name,game:'pokemon',url:'https://play.pokemonshowdown.com/audio/'+id+'.mp3',source:showdownSource,credit:'Pokemon game soundtrack · Nintendo / The Pokemon Company / GAME FREAK; hosted by Pokemon Showdown',license:'Copyrighted game soundtrack; availability is not a reuse license',rights:'game-copyright'})),...wesnothTracks.map(([id,name,credit])=>({id:'wesnoth-'+id,name:'Wesnoth · '+name,game:'wesnoth',url:'https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/music/'+id+'.ogg',source:'https://github.com/wesnoth/wesnoth/blob/master/copyrights.csv',credit,license:'GNU GPL v2 or later',rights:'GPL-2.0-or-later'}))];
export function createGameMusic(folder,{fetchImpl=fetch,inspect,register=m=>m}={}){
 fs.mkdirSync(folder,{recursive:true});const pending=new Map();
 function cached(track){try{const m=JSON.parse(fs.readFileSync(path.join(folder,track.id+'.json'),'utf8'));if(m.id==='game-music-'+track.id&&m.originalUrl===track.url&&m.duration>0&&fs.existsSync(m.path))return m;}catch{}}
 const catalog=()=>GAME_MUSIC.map(t=>({...t,installed:!!cached(t)}));
 async function download(id){
  const track=GAME_MUSIC.find(t=>t.id===id);if(!track)throw Error('Choose a track from the game music catalog');const old=cached(track);if(old)return register(old);
  if(pending.has(id))return pending.get(id);
  const task=(async()=>{
   const r=await fetchImpl(track.url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Music download failed: HTTP '+r.status);if(Number(r.headers.get('content-length'))>32*1024*1024||/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Music source returned invalid audio');
   const chunks=[];let bytes=0;for await(const chunk of r.body){bytes+=chunk.length;if(bytes>32*1024*1024)throw Error('Music track exceeds 32 MB');chunks.push(Buffer.from(chunk));}const data=Buffer.concat(chunks);if(data.length<1000)throw Error('Music source returned an empty track');
   const ext=new URL(track.url).pathname.endsWith('.ogg')?'.ogg':'.mp3',file=path.join(folder,track.id+ext),temp=file+'.part';fs.writeFileSync(temp,data);
   try{const details=await inspect(temp);if(!Number.isFinite(details.duration)||details.duration<=0)throw Error('Music audio could not be decoded');fs.renameSync(temp,file);
    const m={...details,id:'game-music-'+track.id,name:track.name,path:file,url:'',kind:'audio',assetRole:'music',tags:track.game+' music soundtrack',provider:'game-music',originalUrl:track.url,license:track.license,usageStatus:track.rights,contentHash:crypto.createHash('sha256').update(data).digest('hex'),identity:{franchise:track.game,subject:track.name,source:track.source,confidence:1},attribution:{source:track.source,credit:track.credit,licenseUrl:track.rights==='GPL-2.0-or-later'?'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html':track.source,changes:'Original audio downloaded; editor timing and volume are nondestructive'}};
    fs.writeFileSync(path.join(folder,track.id+'.json'),JSON.stringify(m,null,2));return register(m);
   }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  })();pending.set(id,task);try{return await task;}finally{pending.delete(id);}
 }
 return {catalog,download};
}
