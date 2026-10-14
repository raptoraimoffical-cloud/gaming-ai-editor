import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {applyEditorialPlan} from '../electron/editorial-planner.mjs';
import {planAttention,applyAttention} from '../electron/attention-director.mjs';
const folder=path.join(root,'workspace/attention-check');fs.mkdirSync(folder,{recursive:true});const b=await createBackend();
try{
 const original=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/local-animator-check/project.gaming.json'),'utf8')));
 let planned=planAttention(original);assert.deepEqual(planned.scenes,original.scenes);let inference=[];if(process.argv.includes('--ai')){const state=await b.localAI.begin('high');state.settings={...state.settings,contextLength:4096};const models=await b.localAI.discover();state.models.reasoning=models.models.find(m=>m.name==='qwen3.5:4b')||state.models.reasoning;planned=await b.localAI.author(planned,state,p=>console.log(p.stage));fs.writeFileSync(path.join(folder,'model-evidence.json'),JSON.stringify({report:planned.editorialReport,inference:state.inferenceEvents},null,2));assert.ok(planned.editorialReport.scenes.length===original.scenes.length,JSON.stringify(planned.editorialReport));inference=state.inferenceEvents;planned=applyEditorialPlan(planned);}const next=applyAttention(planned);
 assert.deepEqual(next.media,original.media);assert.deepEqual(next.scenes.map(s=>s.words),original.scenes.map(s=>s.words));assert.ok(next.attentionPlan.execution.some(b=>b.status==='applied'));
 const health=b.health(next);assert.equal(health.ready,true,JSON.stringify(health.issues));let stage;const output=await b.render(next,path.join(folder,'planned.mp4'),p=>{if(p.stage!==stage){console.log(p.stage);stage=p.stage;}});
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(next,null,2));fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({output,inference,plan:next.attentionPlan,narrationPreserved:true,noInventedMedia:true},null,2));console.log('PASS rendered attention plan',next.attentionPlan.execution.map(b=>({time:b.time,status:b.status,target:b.targetId})));
}finally{b.close();}
