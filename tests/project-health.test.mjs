import test from 'node:test';
import assert from 'node:assert/strict';
import {projectHealth} from '../electron/project-health.mjs';
const fixture=()=>({id:'p',voiceId:'v',format:'vertical',duration:4,musicVolume:.1,media:[{id:'v',kind:'audio',path:'voice.wav',license:'Own recording'}],scenes:[{id:'s',start:0,end:4,text:'Hello',words:[{text:'Hello',start:0,end:1}],layers:[{id:'bg',type:'shape',role:'background',color:'#123456',x:0,y:0,width:1,height:1,z:0,start:0,end:4}]}]});
test('preflight reads the project without changing it and detects missing audio files',()=>{
 const p=fixture(),before=structuredClone(p);assert.equal(projectHealth(p,{exists:()=>true}).ready,true);assert.deepEqual(p,before);
 const report=projectHealth(p,{exists:()=>false});assert.equal(report.ready,false);assert.ok(report.issues.some(i=>i.code==='missing-file'));
 p.soundEffects=[{mediaId:'missing',start:1,volume:.2}];assert.ok(projectHealth(p,{exists:()=>true}).issues.some(i=>i.code==='missing-asset'));
});
test('preflight catches uncovered narration, overlapping scenes, invalid audio and caption timing',()=>{
 const p=fixture();p.scenes[0].start=.5;p.scenes[0].words[0].end=5;p.soundEffects=[{mediaId:'v',start:4,volume:NaN}];p.musicClip={start:2,end:8};
 const codes=projectHealth(p,{exists:()=>true}).issues.map(i=>i.code);for(const code of ['scene-gap','word-timing','sfx-timing','music-timing'])assert.ok(codes.includes(code),code);
 const q=fixture();q.scenes.push({...structuredClone(q.scenes[0]),id:'other',start:3,end:4});assert.ok(projectHealth(q,{exists:()=>true}).issues.some(i=>i.code==='scene-overlap'));
});
test('preflight reports pending selections and source reviews without blocking valid exports',()=>{
 const p=fixture();p.pendingRevision={id:'request'};p.media[0].license='';const r=projectHealth(p,{exists:()=>true});assert.equal(r.ready,true);assert.ok(r.issues.some(i=>i.code==='pending'));assert.ok(r.issues.some(i=>i.code==='rights'));
});
