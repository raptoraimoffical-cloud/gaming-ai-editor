import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createPokemonService,detectMentions} from '../electron/pokemon.mjs';
import {PNG} from 'pngjs';
const catalog=['charizard','charizard-mega-x','charizard-mega-y','incineroar','delibird','ninetales','ninetales-alola','pikachu','pikachu-rock-star'].map(name=>({name}));
const words=text=>text.split(' ').map((text,i)=>({text,start:i*.3,end:(i+1)*.3}));
test('a form without its own recorded cry falls back to its verified species audio and retains the requested form',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'pokemon-form-cry-')),source='https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/6.ogg',calls=[];
 const service=createPokemonService(folder,{interval:0,fetcher:async url=>{calls.push(url);if(url.endsWith('pokemon/charizard-mega-x'))return Response.json({species:{name:'charizard'},cries:{}});if(url.endsWith('pokemon/charizard'))return Response.json({name:'charizard',cries:{latest:source}});if(url===source)return new Response(Buffer.from('OggSfixture'));throw Error('Unexpected source');}});
 try{const cry=await service.cry('charizard-mega-x');assert.equal(cry.cry.name,'charizard-mega-x');assert.equal(cry.cry.crySpecies,'charizard');assert.equal(cry.cry.source,source);assert.equal(calls.length,3);await service.cry('charizard-mega-x');assert.equal(calls.length,3);}finally{for(const file of fs.readdirSync(folder))fs.unlinkSync(path.join(folder,file));fs.rmdirSync(folder);}
});
test('exact forms and timestamp-preserving Whisper corrections',()=>{
 const m=detectMentions(words('Charizard Mega Charizard why inciner roar deli bird Alolan Ninetales'),catalog);
 assert.deepEqual(m.map(a=>a.name),['charizard','charizard-mega-y','incineroar','delibird','ninetales-alola']);assert.equal(m[1].start,.3);assert.ok(m[1].corrected);assert.ok(m.every(a=>a.status==='identified'));
});
test('ambiguous Mega does not silently resolve to base; unknowns do not match',()=>{
 const [m]=detectMentions(words('Mega Charizard wins'),catalog);assert.equal(m.status,'unresolved');assert.deepEqual(detectMentions(words('a gaming video about football'),catalog),[]);
});
test('actual tiny Whisper output identifies split Incineroar and misspelled Delibird',()=>{
 assert.deepEqual(detectMentions(words('In Cineror stands ready Dellybird delivers a surprise'),catalog).map(m=>m.name),['incineroar','delibird']);
});
test('concurrent metadata requests are deduplicated and survive offline reuse',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-pokemon-'));let calls=0;
 const fetcher=async()=>{calls++;return new Response(JSON.stringify({results:[{name:'charizard',url:'https://pokeapi.co/api/v2/pokemon/6/'}]}));};
 const s=createPokemonService(dir,{fetcher,interval:0});await Promise.all([s.catalog(),s.catalog()]);assert.equal(calls,2);
 const offline=createPokemonService(dir,{fetcher:async()=>{throw Error('offline');},interval:0});assert.equal((await offline.catalog())[0].name,'charizard');assert.equal(offline.requestCount,0);
 fs.rmSync(dir,{recursive:true,force:true});
});
test('unavailable animated source falls back to exact-form static and identifies it honestly',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-pokemon-'));const image=new PNG({width:1,height:1});image.data.set([255,0,0,255]);const png=PNG.sync.write(image);
 const fetcher=async url=>{
  if(url.endsWith('/pokemon/test-mega'))return new Response(JSON.stringify({id:10001,name:'test-mega',species:{name:'test'},forms:[{name:'test-mega'}],types:[{type:{name:'fire'}}],stats:[],sprites:{front_default:'https://raw.githubusercontent.com/PokeAPI/sprites/master/test-mega.png',other:{showdown:{front_default:'https://raw.githubusercontent.com/PokeAPI/sprites/master/test-mega.gif'}}}}));
  if(url.endsWith('/pokemon-species/test'))return new Response(JSON.stringify({name:'test',pokedex_numbers:[{entry_number:123,pokedex:{name:'national'}}],varieties:[{is_default:false,pokemon:{name:'test-mega'}}]}));
  if(url.endsWith('.gif'))return new Response('',{status:404});if(url.endsWith('.png'))return new Response(png);return new Response('Source license fixture');
 };
 const s=createPokemonService(dir,{fetcher,interval:0});const m=await s.asset('test-mega');assert.equal(m.pokemon.animated,false);assert.equal(m.pokemon.frameCount,1);assert.equal(m.pokemon.formId,10001);assert.ok(m.pokemon.sourceUrl.endsWith('test-mega.png'));
 const offline=createPokemonService(dir,{fetcher:async()=>{throw Error('offline');},interval:0});assert.equal((await offline.asset('test-mega')).pokemon.animated,false);assert.equal(offline.requestCount,0);
 fs.rmSync(dir,{recursive:true,force:true});
});
test('429 requests are retried and missing forms never fall back to base',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-pokemon-'));let calls=0;
 const s=createPokemonService(dir,{interval:0,fetcher:async()=>{calls++;return calls===1?new Response('',{status:429,headers:{'retry-after':'0.001'}}):new Response(JSON.stringify({results:[]}));}});await s.catalog();assert.equal(calls,3);
 const missing=createPokemonService(dir,{interval:0,fetcher:async()=>new Response('',{status:404})});await assert.rejects(()=>missing.asset('charizard-mega-z'),/404/);
 fs.rmSync(dir,{recursive:true,force:true});
});
