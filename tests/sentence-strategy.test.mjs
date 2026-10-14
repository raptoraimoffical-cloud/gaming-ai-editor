import test from 'node:test';
import assert from 'node:assert/strict';
import {sentenceImportance,youtubeStrategy} from '../electron/sentence-strategy.mjs';
import {planAttention,applyAttention} from '../electron/attention-director.mjs';
const scene={id:'s',start:0,end:8,text:'Anyway. Pikachu attacks. It wins 75 percent.',words:[{text:'Anyway.',start:0,end:1},{text:'Pikachu',start:2,end:2.5},{text:'attacks.',start:2.5,end:3},{text:'It',start:4,end:4.5},{text:'wins',start:4.5,end:5},{text:'75',start:5,end:5.5},{text:'percent.',start:5.5,end:6}],reaction:{entities:[{id:'pikachu',name:'Pikachu',mediaId:'p',start:2}],metrics:[{value:75,kind:'percentage',start:5}]},layers:[]};
test('sentence analysis keeps connecting speech quiet and resolves action/data pronouns to the subject',()=>{
 const before=structuredClone(scene),phrases=sentenceImportance(scene);assert.equal(phrases[0].visualNeed,'hold');assert.equal(phrases[0].importance,0);assert.equal(phrases[1].visualNeed,'demonstration');assert.deepEqual(phrases[1].keywords,['Pikachu','attacks']);assert.equal(phrases[2].visualNeed,'chart');assert.deepEqual(phrases[2].entityIds,['pikachu']);assert.deepEqual(phrases[2].metricIndexes,[0]);assert.deepEqual(scene,before);
});
test('format strategy uses the right canvas and does not invent word alignment or recommendation weights',()=>{
 for(const [videoMode,format,width] of [['youtube-shorts','vertical',1080],['youtube-standard','horizontal',1920]]){const p={videoMode,format,scenes:[{...scene,words:[]}]};const r=youtubeStrategy(p);assert.equal(r.canvas.width,width);assert.match(r.recommendationBasis,/not knowledge of private ranking weights/);assert.match(r.sentences[0].phrases[0].timing,/alignment unavailable/);}
});
test('important image cues never use a different character and filler slots do not add motion',()=>{
 const s={...structuredClone(scene),text:'Anyway. Pikachu.',words:[{text:'Anyway.',start:0,end:1},{text:'Pikachu.',start:2,end:3}],layers:[{id:'other',role:'subject',type:'image',mediaId:'other',start:0,end:8,x:.1,y:.1,width:.5,height:.5,z:2}]};
 const p={duration:8,format:'vertical',media:[],scenes:[s]};const next=applyAttention(planAttention(p));assert.equal(next.attentionPlan.execution[0].status,'held');assert.equal(next.attentionPlan.execution.find(b=>b.time===2).status,'unfilled');assert.deepEqual(next.scenes[0].layers,s.layers);
});

test('important environment words drive actual background search queries',async()=>{const {acquireContextMedia}=await import('../electron/context-media.mjs');const s={id:'forest',start:0,end:4,text:'The zombie survives in a snowy forest biome.',words:[],reaction:{entities:[{id:'minecraft-zombie',name:'Zombie',type:'object',start:0}],metrics:[]}};const p=planAttention({format:'horizontal',duration:4,media:[],scenes:[s]});const queries=[];await acquireContextMedia(p,{search:async q=>{queries.push(q);return [];},download:async()=>{throw Error('No candidate should be downloaded');}});assert.ok(queries.length);assert.ok(queries.every(q=>q.includes('minecraft')&&q.includes('snowy')&&q.includes('forest')));});
