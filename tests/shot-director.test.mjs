import test from 'node:test';import assert from 'node:assert/strict';
import {planShots,applyShotPlan,smoothSequence,shotCandidates} from '../electron/shot-director.mjs';
import {acquireContextMedia} from '../electron/context-media.mjs';
import {motionFor} from '../electron/layer-motion.mjs';
const background={id:'arena',kind:'image',name:'Pokemon arena screenshot',license:'Own',assetRole:'background',identity:{franchise:'pokemon',subject:'arena'}};
const sprite={id:'pikachu',kind:'pokemon',name:'Pikachu',pokemon:{name:'pikachu'},license:'Source notice'};
const scene={id:'s',start:0,end:4,text:'Pikachu explains the result.',words:[],reaction:{entities:[{id:'pikachu',name:'Pikachu',type:'pokemon',mediaId:'pikachu'}]},layers:[{id:'bg',type:'svg',role:'background',svg:'<svg/>',x:0,y:0,width:1,height:1,z:0,start:0,end:4},{id:'hero',role:'subject',type:'image',mediaId:'pikachu',x:.1,y:.1,width:.8,height:.6,z:4,start:0,end:4,animation:'spring-pop',float:true,keyframes:[{time:0,scale:1},{time:4,scale:1.03}],exit:'fade'}]};
const project={format:'vertical',duration:8,media:[background,sprite],scenes:[scene,{...scene,id:'next',start:4,end:8,layers:scene.layers.map(l=>({...l,start:4,end:8}))}]};
test('context imagery rejects wrong franchises and sprite backgrounds, and respects user background',async()=>{
 const wrong={...background,id:'wrong',identity:{franchise:'minecraft'},width:1280,height:720};let downloads=0;
 const p=await acquireContextMedia({...project,media:[sprite]},{search:async()=>[wrong,{...background,width:1280,height:720}],download:async m=>{downloads++;return m;}});assert.equal(downloads,1);assert.ok(p.media.some(m=>m.id==='arena'));assert.ok(!p.media.some(m=>m.id==='wrong'));
 assert.deepEqual(shotCandidates(scene,project).backgrounds.map(m=>m.id),['arena']);
 assert.deepEqual(shotCandidates(project.scenes[1],{...project,media:[{...background,transparent:true},sprite],scenes:[scene,{...project.scenes[1],reaction:{entities:[]}}]}).backgrounds.map(m=>m.id),['arena']);
 await acquireContextMedia({...project,creationAssets:{backgroundMode:'upload'}},{search:async()=>{throw Error('Must not search');}});
});
test('cohesion holds subject visibility through cuts, removes competing motion and carries camera path',()=>{
 const p=applyShotPlan({...project,shotPlan:{shots:project.scenes.map(s=>({sceneId:s.id,purpose:'Explain using the same setting',backgroundId:'arena',support:[],atmosphere:'depth'}))}});
 const first=p.scenes[0].layers,second=p.scenes[1].layers;assert.equal(first[0].mediaId,'arena');assert.deepEqual(first[0].keyframes,second[0].keyframes);assert.equal(first[1].float,false);assert.equal(first[1].animation,'fade');assert.equal(motionFor(first[1],3.99).opacity,1);assert.equal(p.scenes[1].transitionDuration,.45);assert.ok(first.some(l=>l.type==='particles'));
 const manual={...scene,layers:[{...scene.layers[1],manual:true}]};assert.deepEqual(smoothSequence({...project,scenes:[manual]}).scenes[0].layers,manual.layers);
});
test('whole-video shot inference is validated and unrelated media cannot be inserted',async()=>{
 const state={mode:'high',models:{reasoning:{name:'local'}},settings:{url:'http://localhost:11535'},signal:new AbortController().signal,limitations:[]};let context;
 const fetchImpl=async(_url,opts)=>{context=JSON.parse(JSON.parse(opts.body).messages[1].content);return Response.json({message:{content:JSON.stringify({overview:'Establish the arena then explain the result',shots:project.scenes.map(s=>({sceneId:s.id,purpose:'Explain the result',backgroundId:'arena',support:[],atmosphere:'depth'}))})}});};
 const p=await planShots(project,state,()=>{},fetchImpl);assert.equal(context.wholeVideo.length,2);assert.equal(p.scenes[0].layers[0].mediaId,'arena');assert.equal(state.inferenceEvents[0].stage,'whole-video-shot-direction');
 const bad=await planShots(project,state,()=>{},async()=>Response.json({message:{content:JSON.stringify({overview:'Bad',shots:project.scenes.map(s=>({sceneId:s.id,purpose:'Bad',backgroundId:'unrelated',support:[],atmosphere:'none'}))})}}));assert.match(bad.shotPlan.warnings[0],/Unrelated/);assert.ok(!bad.scenes[0].layers.some(l=>l.mediaId==='unrelated'));
});
