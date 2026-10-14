import {planAttention,applyAttention} from '../electron/attention-director.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';import {parseRetention} from '../electron/retention-planner.mjs';
const folder=path.join(root,'workspace/local-animator-check');fs.mkdirSync(folder,{recursive:true});const b=await createBackend();
try{
 const source=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/editorial-ai-check/project.gaming.json'),'utf8')));
 source.id='local-animator-check';source.editingInstructions='Create narration-related subject motion and animated chart explanations. Use an orbit or focus on Pikachu and a chart reveal for the trend. Plan a clear visual hook and payoff; avoid unrelated decoration.';
 const state=await b.localAI.begin('high'),profile=parseRetention('position,retention\n0,100\n0.3,82\n0.6,55\n1,45');
 let p=await b.localAI.animate(source,state,profile,event=>console.log(event.stage));
 assert.equal(p.shotPlan?.shots.length,source.scenes.length,JSON.stringify(p.shotPlan));assert.equal(p.shotPlan.warnings.length,0,JSON.stringify(p.shotPlan));
 assert.ok(p.animationPlan.beats.reduce((n,b)=>n+b.moments.length,0)>0,JSON.stringify(p.animationPlan));assert.equal(p.animationPlan.beats.length,source.scenes.length,JSON.stringify(p.animationPlan));assert.equal(p.animationPlan.warnings.length,0,JSON.stringify(p.animationPlan));assert.equal(p.animationPlan.local,true);assert.equal(p.animationPlan.basis.measured,true);
 const authored=structuredClone(p.scenes);p=applyAttention(planAttention(p,profile));assert.deepEqual(p.scenes,authored,'Attention must preserve every model-authored motion and hold');
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(p,null,2));console.log('ACTUAL LOCAL PLAN',JSON.stringify(p.animationPlan));
 const animated=await b.render(p,path.join(folder,'animated.mp4')),baseline=await b.render(source,path.join(folder,'baseline.mp4'));
 let changed=0;for(const time of [.5,1.1,1.8,4.2,4.8]){
  const frames=[];for(const [name,result] of [['animated',animated],['baseline',baseline]]){const file=path.join(folder,name+'-'+time+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(time),'-i',result.output,'-frames:v','1',file]);frames.push(PNG.sync.read(fs.readFileSync(file)));}
  for(let i=0;i<frames[0].data.length;i+=4)if(Math.abs(frames[0].data[i]-frames[1].data[i])+Math.abs(frames[0].data[i+1]-frames[1].data[i+1])+Math.abs(frames[0].data[i+2]-frames[1].data[i+2])>40)changed++;
 }
 assert.ok(changed>1000,'Local AI animation must change actual rendered pixels against the unanimated baseline');
 const evidence={animated,baseline,changedPixels:changed,animationPlan:p.animationPlan,inference:state.inferenceEvents,retentionData:'Illustrative test curve, not actual channel analytics'};fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(evidence,null,2));console.log('PASS local trained animation, historical-curve planning and changed encoded pixels',changed);
}finally{b.close();}
