import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBattles,planBattle,validateBattle} from '../electron/battle-choreography.mjs';
import {validateProject} from '../electron/planner.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
const fixture=()=>({id:'p',format:'vertical',voiceId:'v',duration:6,media:[{id:'v',kind:'audio'},{id:'a',kind:'pokemon',pokemon:{name:'pikachu'}},{id:'b',kind:'pokemon',pokemon:{name:'charizard'}}],scenes:[{id:'s',start:0,end:6,text:'Pikachu and Charizard fight.',words:[],layers:[{id:'a',type:'image',role:'subject',mediaId:'a',x:.1,y:.2,width:.3,height:.4,z:2,start:0,end:6},{id:'b',type:'image',role:'subject',mediaId:'b',x:.6,y:.2,width:.3,height:.4,z:2,start:0,end:6}]}]});
const battle={sceneId:'s',attackerId:'a',defenderId:'b',move:'dust-brawl',at:0,duration:4,reason:'Both requested characters exchange attacks'};
test('battle choreography creates executable paired movement and timed dust without changing narration or media',()=>{
 const p=fixture(),next=applyBattles(p,{model:'trained',battles:[battle]});validateProject(next);assert.deepEqual(next.media,p.media);assert.deepEqual(next.scenes[0].words,p.scenes[0].words);assert.ok(next.scenes[0].layers.filter(l=>l.role==='subject').every(l=>l.keyframes.length>=5));assert.ok(next.scenes[0].layers.some(l=>l.battleEffect==='dust'&&l.end<4));assert.deepEqual(p,fixture());
 const recorded=recordRevision(p,next,'Make them fight',[],'Battle applied','trained');assert.deepEqual(undoRedo(recorded,'undo').scenes,p.scenes);assert.equal(undoRedo(recorded,'undo').battleReport,undefined);
});
test('move projectiles and impacts are timed, unrelated/locked fighters and out-of-range plans are rejected atomically',()=>{
 const p=fixture();for(const move of ['thunderbolt','flamethrower','water-gun','tackle']){const next=applyBattles(p,{battles:[{...battle,move}]});validateProject(next);const impact=next.scenes[0].layers.find(l=>l.battleEffect==='impact');assert.equal(impact.start,battle.at+battle.duration*.46);if(move!=='tackle'){const projectile=next.scenes[0].layers.find(l=>l.battleEffect===move);assert.equal(projectile.easing,'smooth');assert.ok(projectile.keyframes.some(k=>k.time===impact.start));assert.equal(projectile.keyframes.at(-1).opacity,0);}}
 assert.throws(()=>validateBattle(p,{...battle,defenderId:'a'}));assert.throws(()=>applyBattles(p,{battles:[{...battle,duration:9}]}));p.scenes[0].layers[1].instructionLocked=true;assert.throws(()=>validateBattle(p,battle));
});
test('trained battle plans receive exact asset IDs and get one correction for invalid timing',async()=>{
 const state={models:{reasoning:{name:'trained'}},settings:{url:'http://localhost:11535'},signal:new AbortController().signal,inferenceEvents:[]};let calls=0;
 const plan=await planBattle(fixture(),'Make the two Pokemon fight in a dust cloud',['s'],state,async(_,opts)=>{const body=JSON.parse(opts.body);assert.match(body.messages[1].content,/attacker|fighters/);return Response.json({model:'trained',message:{content:JSON.stringify({battles:[{...battle,duration:++calls===1?20:4}]})}});});assert.equal(calls,2);assert.equal(plan.battles[0].duration,4);assert.equal(state.inferenceEvents[0].accepted,false);assert.equal(state.inferenceEvents[1].accepted,true);
});

test('uploaded subject images can fight while known unrelated assets cannot',()=>{const p=fixture();p.media[1]={id:'a',kind:'image',name:'My character'};p.scenes[0].layers[0].manual=true;assert.doesNotThrow(()=>validateBattle(p,battle));p.media[1].identity={franchise:'fortnite'};assert.throws(()=>validateBattle(p,battle));});

test('battle only clears attention motion from its fighters and preserves other scenes and background',()=>{const p=fixture();p.scenes[0].layers.push({id:'bg',type:'shape',role:'background',x:.1,attentionBaseline:{x:0}});p.scenes.push({...structuredClone(p.scenes[0]),id:'other'});const next=applyBattles(p,{battles:[battle]});assert.deepEqual(next.scenes[1],p.scenes[1]);assert.deepEqual(next.scenes[0].layers.find(l=>l.id==='bg'),p.scenes[0].layers.find(l=>l.id==='bg'));});
