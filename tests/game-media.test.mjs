import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {gameMentions,addGameLogoLayers,createPokemonGameAssets} from '../electron/pokemon-game-assets.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {googleImageCandidates,searchGoogleImages} from '../electron/google-images.mjs';
import {createAudioBed} from '../electron/audio-bed.mjs';
import {createPokemonService} from '../electron/pokemon.mjs';
import {createFortniteAssets} from '../electron/fortnite-assets.mjs';
test('cry source uses the selected recording, caches it, and detects MP3 data behind an ogg URL',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-cry-'));let calls=0;
 try{const service=createPokemonService(dir,{interval:0,fetcher:async url=>{calls++;return url.includes('pokeapi.co')?Response.json({cries:{latest:'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg'}}):new Response(Buffer.from([255,251,148,196,0,0,0,0]));}});
 const m=await service.cry('pikachu');assert.equal(path.extname(m.path),'.mp3');assert.equal(m.assetRole,'sound-effect');await service.cry('pikachu');assert.equal(calls,2);await assert.rejects(service.cry('pikachu','legacy'),/No legacy cry/);
 const p={duration:3,media:[{...m,duration:.8}],soundEffects:[{mediaId:m.id,start:0,auto:true,cue:'pokemon-cry'}],scenes:[{start:0,end:3,words:[],layers:[]}]};assert.equal(automaticSounds(p,[]).soundEffects[0].mediaId,m.id);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Fortnite category thumbnails retain source metadata and allow only listed imports',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fortnite-wiki-'));
 try{const service=createFortniteAssets(dir,{register:m=>m,inspect:async()=>({}),fetchImpl:async url=>url.includes('categorymembers')?Response.json({query:{categorymembers:[{ns:6,pageid:1}]}}):Response.json({query:{pages:{1:{pageid:1,title:'File:Background - Asset - Fortnite.png',imageinfo:[{url:'https://static.wikia.nocookie.net/fortnite/images/a/aa/Background.png/revision/latest',descriptionurl:'https://fortnite.fandom.com/wiki/File:Background.png',width:512,height:512}]}}}})});
 const page=await service.list();assert.equal(page.files.length,1);assert.equal(page.files[0].assetRole,'background');assert.match(page.files[0].attribution.source,/fortnite.fandom.com/);await assert.rejects(service.download('unknown'),/Browse/);await assert.rejects(service.list({category:'Category:Unrelated'}),/Choose/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const games=[{id:'champions',name:'Pokémon Champions',aliases:['Pokémon Champions']},{id:'showdown',name:'Pokémon Showdown',aliases:['Pokémon Showdown','Showdown']}];
test('game name logos resolve exactly and use the spoken word timestamp without duplicate alias matches',()=>{
 const words='Now Pokemon Champions wins then Pokemon Showdown appears'.split(' ').map((text,i)=>({text,start:i*.4,end:i*.4+.35}));const s={id:'s',start:0,end:4,text:words.map(w=>w.text).join(' '),words};const m=gameMentions(s,games);
 assert.equal(m.length,2);assert.equal(m[0].start,.4);assert.equal(m[1].start,2);assert.deepEqual(gameMentions({...s,text:'World champions celebrate',words:[]},games),[]);
 const p=addGameLogoLayers({format:'vertical',scenes:[{...s,layers:[],gameLogos:m.map(x=>({mediaId:x.game.id,start:x.start}))}]});
 assert.equal(p.scenes[0].layers[0].start,.4);assert.equal(p.scenes[0].layers[0].end,2);assert.equal(p.scenes[0].layers[1].role,'game-logo');assert.equal(addGameLogoLayers(p).scenes[0].layers.length,2);
});
test('automatic effects exist in a single scene, are sparse and retain manual effects and prefer installed recordings',()=>{
 const pool=['whoosh','impact','victory','reveal'].map(cue=>({id:'generated-'+cue,kind:'audio',assetRole:'sound-effect',license:'Original',duration:.3,tags:cue}));pool.push({...pool[1],id:'installed-impact'});
 const p={duration:6,media:[],soundEffects:[{mediaId:'manual',start:5,volume:.1}],scenes:[{start:0,end:6,layers:[{role:'game-logo',start:0}],words:[{text:'attack',start:2},{text:'wins',start:4}]}]};
 const next=automaticSounds(p,pool);assert.equal(next.soundEffectReport.automatic,3);assert.equal(next.soundEffects[1].mediaId,'installed-impact');assert.ok(next.soundEffects.some(f=>f.mediaId==='manual'));assert.equal(automaticSounds(next,pool).soundEffects.length,next.soundEffects.length);
 assert.deepEqual(automaticSounds({...p,autoSoundEffects:false},pool).soundEffects,p.soundEffects);
});
test('built-in effect files have real nonzero PCM samples and explicit sound roles',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'editor-sounds-'));try{const audio=createAudioBed(folder);const effects=audio.filter(m=>m.assetRole==='sound-effect');assert.ok(effects.length>=5);for(const m of effects){const bytes=fs.readFileSync(m.path);assert.equal(bytes.subarray(0,4).toString(),'RIFF');let energy=0;for(let i=44;i<bytes.length;i+=2)energy+=Math.abs(bytes.readInt16LE(i));assert.ok(energy>0);}}finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('Google images keep original publisher links and never claim reuse rights; missing provider key is explicit',async()=>{
 const [c]=googleImageCandidates({images_results:[{title:'Real game screenshot',original:'https://publisher.example/screen.png',link:'https://publisher.example/game',original_width:1920,original_height:1080}]});assert.equal(c.attribution.source,'https://publisher.example/game');assert.equal(c.usageStatus,'requires-user-rights');assert.equal(c.width,1920);await assert.rejects(searchGoogleImages('game',''),/SerpAPI/);
});
test('game catalogue groups are serializable and retain individual titles; forged archive downloads are rejected',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'editor-games-'));try{const service=createPokemonGameAssets(folder,{register:m=>m,inspect:async()=>({}),fetchImpl:async()=>Response.json([{version_group_id:25,version_group_code:'sv',version_group_name:{9:'Pokémon Scarlet & Violet'},games:[{id:1,name:{9:'Scarlet'}},{id:2,name:{9:'Violet'}}]}])});const catalog=await service.games();assert.doesNotThrow(()=>JSON.stringify(catalog));assert.equal(catalog.find(g=>g.versions).versions.length,2);await assert.rejects(service.download({id:'forged',url:'https://other.example/image.png'}),/catalog/);}finally{fs.rmSync(folder,{recursive:true,force:true});}
});
