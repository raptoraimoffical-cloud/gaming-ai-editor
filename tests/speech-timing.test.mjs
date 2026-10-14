import test from 'node:test';
import assert from 'node:assert/strict';
import {speechTimingIssues,captionWordAt,replaceSpeech,restoreSpeechLayers} from '../electron/speech-timing.mjs';
import {projectHealth} from '../electron/project-health.mjs';
import {plan} from '../electron/planner.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
const project=()=>({id:'p',format:'vertical',voiceId:'v',duration:50,captionColor:'#ff0000',captionStyle:{style:'outlined-phrase',fontSize:47},media:[{id:'v',kind:'audio',path:'voice.mp3',license:'Own narration'}],scenes:[{id:'s',start:0,end:50,text:'paralyze',captionStyle:{fontSize:49,bottom:.19},words:[{text:'paralyze',start:0,end:25}],layers:[]}]});
test('old quick baseline cannot export with a stretched word and preview never highlights it for 20 seconds',()=>{
 const p=project();assert.equal(speechTimingIssues(p)[0].code,'stretched-caption');assert.equal(projectHealth(p,{exists:()=>true}).ready,false);
 assert.equal(captionWordAt(p.scenes[0].words,1),0);assert.equal(captionWordAt(p.scenes[0].words,10),-1);
});
test('normal caption timings and the short between-word hold remain unchanged',()=>{
 const words=[{text:'very',start:0,end:.2},{text:'very',start:.4,end:.6},{text:'good',start:.8,end:1}];
 assert.equal(captionWordAt(words,.1),0);assert.equal(captionWordAt(words,.5),1);assert.equal(captionWordAt(words,.85),2);assert.equal(captionWordAt(words,1.15),2);assert.equal(captionWordAt(words,1.5),-1);
});
test('a late stale endpoint cannot suppress a newer spoken word',()=>{
 const words=[{text:'old',start:0,end:30},{text:'new',start:1.5,end:2}];assert.equal(captionWordAt(words,1.6),1);
});
test('speech repair replaces recognition atomically, preserves caption design, and Undo restores the old transcript',()=>{
 const p=project(),before=structuredClone(p);p.originalTranscript=[{text:'paralyze',words:p.scenes[0].words}];
 const segments=[{start:0,end:1,text:'Pokemon attacks.',words:[{text:'Pokemon',start:0,end:.4},{text:'attacks.',start:.4,end:1}]},{start:25,end:26,text:'Rotom wins.',words:[{text:'Rotom',start:25,end:25.4},{text:'wins.',start:25.4,end:26}]}];
 const t={segments,transcription:{timingVerified:true}},next=replaceSpeech(p,t,segments,{used:false},plan);
 assert.deepEqual(next.captionStyle,p.captionStyle);assert.ok(next.scenes.every(s=>s.captionStyle.fontSize===49&&s.captionStyle.bottom===.19));assert.equal(next.voiceId,p.voiceId);assert.equal(next.duration,p.duration);assert.deepEqual(p.scenes,before.scenes);
 next.speechRepairReport={afterWords:4};const edited=recordRevision(p,next,'Repair speech & timing',[],'Recovered speech','Speech');
 const restored=undoRedo(JSON.parse(JSON.stringify(edited)),'undo');assert.deepEqual(restored.scenes,p.scenes);assert.deepEqual(restored.originalTranscript,p.originalTranscript);assert.equal(restored.transcriptionInfo,undefined);
 assert.deepEqual(undoRedo(restored,'redo').originalTranscript,t.segments);
});
test('restored manual attachments target the rebuilt actor and automatic items are regenerated',()=>{
 const p=project();p.media.push({id:'mon',kind:'image',license:'Own art'});p.scenes[0].layers=[{id:'actor',mediaId:'mon',type:'image',start:0,end:50},{id:'hat',manual:true,attachment:{targetId:'actor'},start:0,end:50},{id:'auto',manual:true,autoItem:true,start:0,end:50}];
 const segments=[{start:0,end:1,text:'Pokemon.',words:[{text:'Pokemon.',start:0,end:1}]}];const n=replaceSpeech(p,{segments,transcription:{}},segments,{},plan);
 n.scenes[0].layers=[{id:'new',mediaId:'mon',start:0,end:50}];restoreSpeechLayers(n);
 assert.equal(n.scenes[0].layers.length,2);assert.equal(n.scenes[0].layers[1].attachment.targetId,'new');assert.equal(n.scenes[0].speechRepairLayers,undefined);
});
