import test from 'node:test';import assert from 'node:assert/strict';import {renderExportStreams} from '../electron/export-streams.mjs';
const options={composition:{fps:60},serveUrl:'bundle',inputProps:{project:{fps:60}},temp:'video.mp4',pcm:'mix.wav',hasAudio:true};
test('the exact audio graph completes before graphics start, with unchanged frame quality and one final mux source',async()=>{
 const stages=[],calls=[];await renderExportStreams({...options,select:async o=>{assert.equal(o.id,'GamingAudio');assert.deepEqual(o.inputProps,options.inputProps);return {id:'audio',fps:60};},render:async o=>{calls.push(o);stages.push(o.codec);if(o.codec==='wav'){assert.equal(o.imageFormat,'none');await new Promise(r=>setTimeout(r,5));stages.push('audio complete');}else{assert.ok(stages.includes('audio complete'));assert.equal(o.muted,true);assert.equal(o.inputProps.muteAllAudio,true);assert.equal(o.composition.props.muteAllAudio,true);assert.equal(o.composition.props.project,options.inputProps.project);assert.equal(o.crf,18);assert.equal(o.composition.fps,60);}}});assert.deepEqual(stages,['wav','audio complete','h264']);assert.equal(calls[0].inputProps.project,options.inputProps.project);
});
test('an audio failure stops before expensive video rendering and cannot report a successful export',async()=>{
 const calls=[];await assert.rejects(renderExportStreams({...options,select:async()=>({}),render:async o=>{calls.push(o.codec);throw Error('Audio source unreadable');}}),/Audio source unreadable/);assert.deepEqual(calls,['wav']);
});
test('a silent video skips audio rendering while preserving the same graphics settings',async()=>{
 let called=0;await renderExportStreams({...options,hasAudio:false,select:()=>{throw Error('No audio composition should be selected');},render:async o=>{called++;assert.equal(o.codec,'h264');assert.equal(o.crf,18);assert.equal(o.muted,true);}});assert.equal(called,1);
});
