import test from 'node:test';
import assert from 'node:assert/strict';
import {planAttention,applyAttention,clearAttention} from '../electron/attention-director.mjs';
const fixture=()=>({duration:8,editingInstructions:'Keep relevant visuals.',media:[{id:'hero',name:'Hero'}],scenes:[{id:'s',start:0,end:8,text:'Hero explains the result.',words:[{text:'Hero',start:0,end:1},{text:'explains',start:2,end:3},{text:'the',start:4,end:5},{text:'result',start:6,end:7}],reaction:{entities:[{id:'hero',name:'Hero',mediaId:'hero',start:0,end:8}],metrics:[]},layers:[{id:'hero-layer',type:'image',role:'subject',mediaId:'hero',x:.2,y:.2,width:.4,height:.5,z:2,start:0,end:8}]}]});
test('attention is planned across the full video before applying a two-second sequence',()=>{
 const p=fixture(),before=structuredClone(p),planned=planAttention(p);assert.deepEqual(p,before);assert.deepEqual(planned.attentionPlan.beats.map(b=>b.time),[0,2,4,6]);assert.deepEqual(planned.scenes,p.scenes);
 const next=applyAttention(planned);assert.equal(next.attentionPlan.execution.length,4);assert.equal(next.attentionPlan.execution.filter(b=>b.status==='applied').length,4);assert.ok(next.scenes[0].layers.some(l=>l.id==='s-sequence-1'&&l.start===2));assert.deepEqual(next.scenes[0].words,p.scenes[0].words);assert.deepEqual(applyAttention(next),next);
});
test('attention preserves locked/manual visuals and honors no-motion requests without inventing assets',()=>{
 const p=fixture();p.editingInstructions='No animations';const next=applyAttention(planAttention(p));assert.ok(next.scenes[0].layers[0].keyframes.every(k=>k.scale===undefined));assert.ok(next.scenes[0].layers.filter(l=>l.svg).every(l=>l.animation==='none'));
 p.scenes[0].layers[0].manual=true;const protectedEdit=applyAttention(planAttention(p));assert.deepEqual(protectedEdit.scenes,p.scenes);assert.ok(protectedEdit.attentionPlan.execution.every(b=>b.status==='unfilled'));assert.deepEqual(protectedEdit.media,p.media);
});
test('measured retention is historical context and narrated data gives charts priority',()=>{
 const p=fixture();p.scenes[0].reaction.metrics=[{value:75,kind:'percentage',start:2}];p.scenes[0].layers.push({id:'chart',type:'ring',role:'chart',x:.1,y:.1,width:.6,height:.6,z:3,start:0,end:8});const profile={points:[{position:0,retention:100},{position:.25,retention:80},{position:1,retention:60}]};
 const result=applyAttention(planAttention(p,profile));assert.equal(result.attentionPlan.measured,true);assert.equal(result.attentionPlan.execution.find(b=>b.time===2).targetId,'chart');assert.match(result.attentionPlan.notice,/not a prediction/);
});

test('a fresh trained animation pass starts without stale attention keyframes',()=>{const p=fixture(),result=applyAttention(planAttention(p));assert.ok(result.scenes[0].sequenceSourceLayers);const cleared=clearAttention(result);assert.deepEqual(JSON.parse(JSON.stringify(cleared.scenes)),JSON.parse(JSON.stringify(p.scenes)));assert.equal(cleared.scenes[0].layers[0].attentionBaseline,undefined);});

test('empty trained plans cannot suppress actual two-second visual changes',()=>{const p=fixture();p.scenes[0].localAnimationApplied=true;p.animationPlan={beats:[{sceneId:'s',purpose:'Hold context for reading',moments:[]}]};const next=applyAttention(planAttention(p));assert.ok(next.scenes[0].layers.some(l=>l.id==='s-sequence-1'));assert.ok(next.attentionPlan.execution.some(b=>b.status==='applied'));});
test('attention keeps data charts still when no trained reveal was authored',()=>{const p=fixture();p.scenes[0].reaction.entities=[];p.scenes[0].text='The value is 75 percent.';p.scenes[0].reaction.metrics=[{value:75,kind:'percentage',start:2}];p.scenes[0].layers=[{id:'chart',role:'chart',type:'ring',x:.1,y:.1,width:.5,height:.5,start:0,end:8}];const next=applyAttention(planAttention(p));assert.equal(next.scenes[0].layers[0].keyframes,undefined);assert.ok(next.attentionPlan.execution.some(b=>b.status==='held'));});
