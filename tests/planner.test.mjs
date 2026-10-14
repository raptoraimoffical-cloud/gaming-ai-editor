import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plan,validateProject} from '../electron/planner.mjs';
test('matching requires declared rights and multiple relevant keywords',()=>{
 const segments=[{start:0,end:3,text:'Valorant clutch',words:[{start:0,end:1,text:'Valorant'},{start:1,end:3,text:'clutch'}]}];
 assert.equal(plan(segments,[{id:'a',name:'Valorant clutch',kind:'video',tags:'',license:''}],3)[0].mediaId,undefined);
 assert.equal(plan(segments,[{id:'a',name:'clip',kind:'video',tags:'Valorant clutch',license:'own'}],3)[0].mediaId,'a');
});
test('timing covers narration and invalid projects fail',()=>{
 const scenes=plan([{start:1,end:2,text:'hello',words:[]}],[],4);assert.equal(scenes[0].start,0);assert.equal(scenes[0].end,4);
 assert.throws(()=>validateProject({duration:4,media:[],scenes}));
});
