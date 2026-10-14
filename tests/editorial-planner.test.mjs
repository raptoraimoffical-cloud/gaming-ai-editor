import test from 'node:test';import assert from 'node:assert/strict';
import {validateEditorialPlan,applyEditorialPlan,planEditorial} from '../electron/editorial-planner.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
const recipe={id:'s',chart:'line',metricIndexes:[0,1,2],motion:'mask-reveal',effect:'particles',sound:'reveal',visualQueries:[],reason:'Show narrated performance trend'};
const scene={id:'s',start:0,end:5,text:'Performance grew from 40 points to 60 points to 90 points over time.',words:[],reaction:{entities:[],metrics:[40,60,90].map((value,i)=>({value,kind:'number',label:'points',start:i*.4,source:'narration'}))},layers:[{id:'bg',role:'background',type:'shape',x:0,y:0,width:1,height:1,z:0,start:0,end:5},{id:'manual',manual:true,type:'shape',x:.1,y:.1,width:.1,height:.1,z:1,start:0,end:5}],editorialPlan:recipe};
test('editorial graph references real metrics and rejects mixed units, invented indexes and unsupported trends',()=>{
 assert.equal(validateEditorialPlan(scene,recipe).chart,'line');assert.throws(()=>validateEditorialPlan(scene,{...recipe,metricIndexes:[0,1,9]}),/unsupported/);
 assert.throws(()=>validateEditorialPlan({...scene,text:'Three different performance results'},recipe),/trend/);
 assert.throws(()=>validateEditorialPlan({...scene,reaction:{...scene.reaction,metrics:scene.reaction.metrics.map((m,i)=>({...m,label:i?'seconds':'points'}))}},recipe),/units/);
 assert.throws(()=>validateEditorialPlan(scene,{...recipe,chart:'ring',metricIndexes:[0]}),/percentage/);
});
test('trained recipes build animated graph layers and effects, preserve manual content, and apply idempotently',()=>{
 const p={format:'vertical',duration:5,media:[],scenes:[scene]},n=applyEditorialPlan(p);const line=n.scenes[0].layers.find(l=>l.type==='line');
 assert.deepEqual(line.points,[40,60,90]);assert.equal(line.start,.8);assert.ok(n.scenes[0].layers.some(l=>l.type==='particles'));
 assert.deepEqual(n.scenes[0].layers.find(l=>l.manual),scene.layers[1]);assert.deepEqual(applyEditorialPlan(n).scenes[0].layers,n.scenes[0].layers);
 const sound=automaticSounds(n,[{id:'recording',kind:'audio',assetRole:'sound-effect',license:'CC0',name:'coin reveal',tags:'coin',duration:.3}]);assert.equal(sound.soundEffects[0].start,.18);
});
test('editorial authoring validates actual model output, traces inference and discloses rejected recipes',async()=>{
 const state={mode:'high',models:{reasoning:{name:'trained'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]};
 const p=await planEditorial({scenes:[{...scene,editorialPlan:undefined}]},state,()=>{},async()=>Response.json({model:'trained',message:{content:JSON.stringify({scenes:[recipe]})},eval_count:90}));
 assert.equal(p.editorialReport.scenes.length,1);assert.equal(state.inferenceEvents[0].stage,'editorial-authoring');assert.equal(state.inferenceEvents[0].performed,true);
 const n=await planEditorial({scenes:[scene]},state,()=>{},async()=>Response.json({message:{content:JSON.stringify({scenes:[{...recipe,metricIndexes:[99]}]})}}));assert.ok(n.editorialReport.warnings.some(w=>/unsupported/.test(w)));
});
test('invalid editorial data receives one real correction pass before fallback',async()=>{
 const state={mode:'high',models:{reasoning:{name:'trained'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]};let calls=0;
 const p=await planEditorial({scenes:[scene]},state,()=>{},async()=>Response.json({model:'trained',message:{content:JSON.stringify({scenes:[calls++?recipe:{...recipe,metricIndexes:[0,1]}]})}}));
 assert.equal(calls,2);assert.equal(p.editorialReport.scenes.length,1);assert.equal(p.editorialReport.corrections[0].accepted,true);assert.equal(state.inferenceEvents[0].accepted,false);assert.equal(state.inferenceEvents[1].stage,'editorial-correction');assert.deepEqual(p.editorialReport.warnings,[]);
});
