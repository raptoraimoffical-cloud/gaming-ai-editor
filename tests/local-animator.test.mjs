import test from 'node:test';import assert from 'node:assert/strict';
import {parseRetention,retentionSummary,retentionBrief} from '../electron/retention-planner.mjs';
import {validateAnimationBeat,applyLocalAnimations,planLocalAnimations} from '../electron/local-animator.mjs';
import {propertyAt,motionFor} from '../electron/layer-motion.mjs';
const scene={id:'s',start:0,end:5,text:'Pikachu wins the battle.',words:[{text:'Pikachu',start:0},{text:'wins',start:1},{text:'the',start:1.4},{text:'battle',start:2}],layers:[{id:'sprite',role:'subject',type:'image',mediaId:'pikachu',x:.2,y:.2,width:.4,height:.4,z:2,start:0,end:5}]};
const beat={sceneId:'s',purpose:'Emphasize the actual win',moments:[{targetId:'sprite',action:'orbit',quote:'wins',direction:'right',duration:2,intensity:.08}]};
test('retention import uses explicit units, calculates historical drop-offs and distinguishes missing data',()=>{
 const p=parseRetention('elapsedVideoTimeRatio,audienceWatchRatio\n0,1\n0.5,.7\n1,.6');const s=retentionSummary(p);assert.equal(s.measured,true);assert.equal(s.dips[0].dropPoints,30);assert.equal(s.areaUnderCurve,75);assert.equal(retentionBrief({duration:10,scenes:[scene]},p).riskWindows[0].time,5);
 assert.equal(retentionSummary(null).measured,false);assert.throws(()=>parseRetention('position,retention\n0,100\n.5,70\n.5,60'),/unique/);assert.throws(()=>parseRetention('position,retention\n0,100\n50,70\n100,60'),/valid points/);
});
test('chart reveals begin at the spoken cue rather than at the start of the scene',()=>{
 const chart={...scene.layers[0],type:'line',role:'chart',points:[40,60,90]};
 const p=applyLocalAnimations({scenes:[{...scene,layers:[chart]}],animationPlan:{beats:[{...beat,moments:[{...beat.moments[0],action:'chart-reveal'}]}]}});
 const l=p.scenes[0].layers[0];assert.equal(l.animationStart,1);assert.equal(motionFor(l,.5).reveal,0);assert.ok(motionFor(l,2).reveal>0);
 assert.throws(()=>validateAnimationBeat({...scene,layers:[chart]},beat),/Charts need data reveals/);
});
test('local animation is timed to narration, produces real keyframes and is idempotent',()=>{
 const p={scenes:[scene],animationPlan:{beats:[beat]}},a=applyLocalAnimations(p);assert.equal(a.scenes[0].layers[0].keyframes[0].time,1);assert.notEqual(propertyAt(a.scenes[0].layers[0],'x',1.5),.2);assert.deepEqual(applyLocalAnimations(a),a);assert.equal(scene.layers[0].keyframes,undefined);
 assert.throws(()=>validateAnimationBeat(scene,{...beat,moments:[{...beat.moments[0],quote:'unrelated video'}]}),/narration/);
 assert.throws(()=>validateAnimationBeat({...scene,layers:[{...scene.layers[0],manual:true}]},beat),/locked/);
});
test('animator rejects hosted endpoints and validates model-generated targets before applying motion',async()=>{
 const state={settings:{url:'http://127.0.0.1:11535'},models:{reasoning:{name:'trained'}},signal:new AbortController().signal,limitations:[]};
 const p=await planLocalAnimations({duration:5,media:[{id:'pikachu',name:'Pikachu'}],scenes:[scene]},state,null,()=>{},async()=>Response.json({model:'trained',message:{content:JSON.stringify({overview:'Hook, explanation and win payoff',beats:[beat]})}}));
 assert.equal(p.animationPlan.local,true);assert.equal(p.animationPlan.basis.measured,false);assert.equal(p.scenes[0].localAnimationApplied,true);assert.equal(state.inferenceEvents[0].stage,'local-animation-retention');
 await assert.rejects(planLocalAnimations({},{...state,settings:{url:'https://remote.example',provider:'hosted'}},null),/local model/);
});
test('overlapping trained movements are scheduled without stacking or changing their cue',async()=>{
 const state={settings:{url:'http://localhost:11535'},models:{reasoning:{name:'local'}},signal:new AbortController().signal,limitations:[]};let calls=0;
 const fetchImpl=async()=>{calls++;return Response.json({message:{content:JSON.stringify({overview:'Explain the win',beats:[calls===1?{...beat,moments:[beat.moments[0],{...beat.moments[0],action:'focus'}]}:beat]})}});};
 const p=await planLocalAnimations({duration:5,media:[{id:"pikachu",name:"Pikachu"}],scenes:[scene]},state,null,()=>{},fetchImpl);
 assert.equal(calls,1);assert.equal(p.animationPlan.warnings.length,0);assert.equal(p.animationPlan.beats[0].moments.length,1);assert.equal(p.animationPlan.adjustments.length,1);assert.equal(state.inferenceEvents[0].accepted,true);
});
test('unsupported animation receives one trained correction before applying a valid cue',async()=>{
 const state={settings:{url:'http://localhost:11535'},models:{reasoning:{name:'local'}},signal:new AbortController().signal,limitations:[]};let calls=0;
 const p=await planLocalAnimations({duration:5,media:[{id:'pikachu',name:'Pikachu'}],scenes:[scene]},state,null,()=>{},async()=>{calls++;return Response.json({message:{content:JSON.stringify({overview:'Explain',beats:[calls===1?{...beat,moments:[{...beat.moments[0],action:'chart-reveal'}]}:beat]})}});});
 assert.equal(calls,2);assert.equal(p.animationPlan.warnings.length,0);assert.equal(state.inferenceEvents[0].accepted,false);assert.equal(state.inferenceEvents[1].stage,'local-animation-correction');
});

test('narration cues require complete tokens and select the repeated quote inside the target interval',()=>{
 const s={...scene,text:'The winner wins. Pikachu wins again.',words:[{text:'The',start:0},{text:'winner',start:.3},{text:'wins.',start:1},{text:'Pikachu',start:2},{text:'wins',start:3},{text:'again.',start:4}],layers:[{...scene.layers[0],start:2}]};
 const cue={...beat,moments:[{...beat.moments[0],quote:'wins'}]};assert.equal(validateAnimationBeat(s,cue).moments[0].start,3);
 assert.throws(()=>validateAnimationBeat(s,{...cue,moments:[{...cue.moments[0],quote:'he'}]}),/narration/);
 assert.throws(()=>validateAnimationBeat(s,{...cue,moments:[{...cue.moments[0],quote:'winner wins'}]}),/visible/);
});
test('no-motion instructions prevent model-authored animation from changing existing layers',()=>{const p={editingInstructions:'No animations',scenes:[scene],animationPlan:{beats:[beat]}};const next=applyLocalAnimations(p);assert.deepEqual(next.scenes,p.scenes);assert.match(next.animationPlan.suppressed,/No-motion/);});

test('animation rejects invented spoken timing when no word alignment is available',()=>{const s={...scene,words:[]};assert.throws(()=>validateAnimationBeat(s,beat),/Word timestamps/);assert.equal(validateAnimationBeat(s,{...beat,moments:[{...beat.moments[0],quote:''}]}).moments[0].start,0);});
test('per-scene corrections retain their own accepted inference evidence',async()=>{const second={...scene,id:'next',layers:[{...scene.layers[0],id:'second'}]},state={settings:{url:'http://localhost:11535'},models:{reasoning:{name:'local'}},signal:new AbortController().signal,limitations:[]};let calls=0;
 const nextBeat={...beat,sceneId:'next',moments:[{...beat.moments[0],targetId:'second'}]};
 const p=await planLocalAnimations({duration:5,media:[],scenes:[scene,second]},state,null,()=>{},async()=>{calls++;const beats=calls===1?[beat,nextBeat].map(b=>({...b,moments:b.moments.map(m=>({...m,action:'chart-reveal'}))})):[calls===2?beat:nextBeat];return Response.json({message:{content:JSON.stringify({overview:'Explain',beats})}});});
 assert.equal(p.animationPlan.beats.length,2);assert.deepEqual(state.inferenceEvents.map(e=>e.accepted),[false,true,true]);});
