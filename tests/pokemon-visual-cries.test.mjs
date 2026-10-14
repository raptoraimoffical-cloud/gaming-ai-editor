import test from 'node:test';
import assert from 'node:assert/strict';
import {pokemonVisualEntrances,applyVisualPokemonCries,addVisualPokemonCries} from '../electron/pokemon-visual-cries.mjs';
import {freshVisualDraft} from '../electron/fresh-project.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
const mon={id:'pikachu',kind:'pokemon',name:'Pikachu',pokemon:{name:'pikachu',speciesName:'pikachu'}},cry={id:'pikachu-cry',kind:'audio',duration:2,cry:{name:'pikachu',variant:'latest'}};
const layer=(start,end,extra={})=>({id:'p-'+start,type:'image',role:'subject',mediaId:'pikachu',start,end,opacity:1,...extra});
const project=layers=>({id:'cry-test',voiceId:'voice',duration:12,format:'shorts',gameSelection:'pokemon',media:[mon],soundEffects:[],scenes:[{id:'s',start:0,end:12,words:[],text:'Pokemon',layers}]});
test('every visible Pokemon re-entry receives a real cry, including repeats within six seconds',()=>{
 const p=project([layer(0,1),layer(2,3),layer(4,6)]),n=applyVisualPokemonCries(p,[cry]);
 assert.deepEqual(n.soundEffects.map(c=>c.start),[0,2,4]);assert.equal(n.pokemonCryReport.played,3);assert.ok(n.soundEffects.every(c=>c.mediaId==='pikachu-cry'&&c.cue==='pokemon-cry'));assert.ok(n.soundEffects.every(c=>c.end<=p.duration));
});
test('animation replicas, overlapping layers and scene splits do not retrigger a continuously visible Pokemon',()=>{
 const p=project([layer(0,4),layer(1,2),layer(4,8)]);p.scenes.push({...p.scenes[0],id:'s2',start:8,end:12,layers:[layer(8,12)]});
 assert.equal(pokemonVisualEntrances(p).length,1);assert.equal(applyVisualPokemonCries(p,[cry]).soundEffects.length,1);
});
test('visibility exclusions create actual re-entries and narration-only names create no cry',()=>{
 const p=project([layer(0,8,{excludedRanges:[{start:2,end:4}]})]);p.pokemonMentions=[{name:'charizard',start:9,end:10,status:'ready'}];
 assert.deepEqual(applyVisualPokemonCries(p,[cry]).soundEffects.map(c=>c.start),[0,4]);
 assert.equal(applyVisualPokemonCries({...p,scenes:[{...p.scenes[0],layers:[]}]},[cry]).soundEffects.length,0);
});
test('cries stay in Pokemon segments and remain absent in other games',()=>{
 const p=project([layer(0,12)]);assert.equal(applyVisualPokemonCries({...p,gameSelection:'minecraft'},[cry]).soundEffects.length,0);
 p.gameSelection='multiple';p.scenes[0].text='Pokemon then Minecraft';p.scenes[0].words=[{text:'Pokemon',start:0,end:1},{text:'then',start:2,end:2.5},{text:'Minecraft',start:3,end:4}];
 assert.equal(pokemonVisualEntrances(p)[0].end,3);assert.equal(pokemonVisualEntrances(p).length,1);
});
test('game logos, unavailable images and mystery silhouettes do not leak identity through cries',()=>{
 const p=project([layer(0,3,{silhouette:true}),layer(4,6,{opacity:0}),layer(7,8,{mediaId:'missing'})]);p.media.push({id:'logo',identity:{subject:'pokemon-brand',franchise:'pokemon'},assetRole:'logo'});p.scenes[0].layers.push(layer(9,10,{mediaId:'logo'}));
 assert.equal(pokemonVisualEntrances(p).length,0);
});
test('a Google original identified as a Pokemon also receives its native recorded cry',()=>{
 const p=project([layer(0,5)]);p.media=[{...mon,pokemon:undefined,kind:'image',identity:{subject:'Pikachu',franchise:'pokemon'}}];assert.equal(applyVisualPokemonCries(p,[cry]).soundEffects[0].mediaId,cry.id);
});
test('simultaneous team reveals receive all distinct cries at narration-safe levels',()=>{
 const p=project([]),cries=[];for(let i=0;i<6;i++){p.media.push({...mon,id:'mon'+i,pokemon:{name:'mon'+i}});p.scenes[0].layers.push(layer(1,5,{id:'layer'+i,mediaId:'mon'+i}));cries.push({...cry,id:'cry'+i,cry:{name:'mon'+i,variant:'latest'}});}
 const n=applyVisualPokemonCries(p,cries);assert.equal(n.pokemonCryReport.played,6);assert.ok(n.soundEffects.every(c=>c.end-c.start<=.651&&c.volume<.04));assert.equal(new Set(n.soundEffects.map(c=>c.start)).size,6);
});
test('recorded cry downloads are shared across repeat appearances, and failures are reported instead of invented audio',async()=>{
 const p=project([layer(0,1),layer(2,3),layer(5,8)]);let calls=0;const n=await addVisualPokemonCries(p,{loadCry:async()=>{calls++;return cry;}});assert.equal(calls,1);assert.equal(n.pokemonCryReport.played,3);
 const missing=await addVisualPokemonCries(p,{loadCry:async()=>{throw Error('Offline');}});assert.equal(missing.soundEffects.length,0);assert.equal(missing.pokemonCryReport.unavailable.length,3);assert.equal(missing.pokemonCryWarnings.length,1);
});
test('manual sound deletions stay deleted until the visible entrances change; fresh edits discard old timing',()=>{
 const n=applyVisualPokemonCries(project([layer(0,2)]),[cry]),deleted={...n,soundEffects:[]};assert.equal(applyVisualPokemonCries(deleted,[cry]).soundEffects.length,0);
 const changed={...deleted,scenes:[{...deleted.scenes[0],layers:[layer(3,5)]}]};assert.equal(applyVisualPokemonCries(changed,[cry]).soundEffects[0].start,3);
 const fresh=freshVisualDraft({...n,autoPokemonCries:false});assert.equal(fresh.pokemonCryReport,undefined);assert.equal(fresh.autoPokemonCries,false);assert.equal(fresh.soundEffects.length,0);
});
test('the explicit cry switch removes only automatic cries, preserving manually requested sounds',()=>{
 const p=project([layer(0,2)]);p.autoPokemonCries=false;p.soundEffects=[{mediaId:'manual',start:1,cue:'pokemon-cry',auto:false},{mediaId:cry.id,start:0,cue:'pokemon-cry',auto:true}];const n=applyVisualPokemonCries(p,[cry]);assert.equal(n.soundEffects.length,1);assert.equal(n.soundEffects[0].mediaId,'manual');
});
test('an automatic cry does not suppress a coordinated game sound at that same visual entrance',()=>{
 const p=project([layer(0,2)]),n=applyVisualPokemonCries(p,[cry]);
 const whoosh={id:'sound-pop',kind:'audio',assetRole:'sound-effect',license:'Licensed test sound',duration:.3,tags:'pop',name:'pop'};
 const sounded=automaticSounds(n,[whoosh]);assert.ok(sounded.soundEffects.some(f=>f.cue==='pokemon-cry'));assert.ok(sounded.soundEffects.some(f=>f.cue==='pop'&&f.start===0));
});
