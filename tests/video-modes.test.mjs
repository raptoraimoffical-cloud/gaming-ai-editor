import test from 'node:test';import assert from 'node:assert/strict';
import {videoMode,modeOptions} from '../electron/video-modes.mjs';
import {planLocalAnimations} from '../electron/local-animator.mjs';
test('YouTube modes resolve the correct canvas and preserve legacy projects',()=>{
 assert.deepEqual(modeOptions({videoMode:'youtube-shorts'}),{videoMode:'youtube-shorts',format:'vertical'});
 const standard=videoMode({videoMode:'youtube-standard',format:'horizontal'});assert.equal(standard.width,1920);assert.equal(standard.height,1080);
 const shorts=videoMode({videoMode:'youtube-shorts'});assert.equal(shorts.width,1080);assert.equal(shorts.height,1920);
 assert.equal(videoMode({format:'horizontal'}).aspect,'16:9');assert.equal(videoMode({format:'vertical'}).aspect,'9:16');
 assert.throws(()=>videoMode({videoMode:'youtube-standard',format:'vertical'}),/do not match/);assert.throws(()=>videoMode({videoMode:'unsupported'}),/Unknown/);
});
test('local animation planning receives mode-specific pacing without changing narration',async()=>{
 let prompt;const state={settings:{url:'http://localhost:11535'},models:{reasoning:{name:'local'}},signal:new AbortController().signal,limitations:[]};
 const scenes=[{id:'s',start:0,end:5,text:'Keep this narration.',layers:[]}];
 const result=await planLocalAnimations({videoMode:'youtube-standard',format:'horizontal',duration:5,media:[],scenes},state,null,()=>{},async(_url,options)=>{prompt=JSON.parse(JSON.parse(options.body).messages[1].content);return Response.json({message:{content:JSON.stringify({overview:'Context and payoff',beats:[{sceneId:'s',purpose:'Explain',moments:[]}]})}});});
 assert.equal(prompt.videoMode.id,'youtube-standard');assert.match(prompt.videoMode.planning,/wide canvas/);assert.equal(result.scenes[0].text,scenes[0].text);assert.equal(result.duration,5);
});
