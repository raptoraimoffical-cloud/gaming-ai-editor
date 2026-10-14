import {test} from 'node:test';import assert from 'node:assert/strict';import {validateProject} from '../electron/planner.mjs';
test('projects reject missing sprites and sprite timing outside narration scenes',()=>{
 const p={duration:2,voiceId:'voice',media:[{id:'voice'},{id:'sprite',pokemon:{name:'charizard'}}],scenes:[{start:0,end:2,pokemon:[{mediaId:'sprite',start:0,end:2}]}]};
 assert.equal(validateProject(p),p);assert.throws(()=>validateProject({...p,media:p.media.slice(0,1)}),/asset missing/);
 assert.throws(()=>validateProject({...p,scenes:[{...p.scenes[0],pokemon:[{mediaId:'sprite',start:-1,end:2}]}]}),/timing/);
});
