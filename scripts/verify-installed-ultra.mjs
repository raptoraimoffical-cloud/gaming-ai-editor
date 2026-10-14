import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace/installed-ultra-tests');fs.mkdirSync(folder,{recursive:true});
const b=await createBackend();
try{
 const discovered=await b.localAI.discover();assert.ok(discovered.models.some(m=>m.name==='qwen3.5:4b'));assert.ok(discovered.models.some(m=>m.name==='qwen3.5:2b-q4_K_M'&&m.capabilities.includes('vision')));
 const voice=await b.importMedia(path.join(root,'workspace/reaction-tests/B-voice.wav'),{license:'Windows speech acceptance fixture'});
 let last;const progress=p=>{if(p.stage!==last){console.log(p.stage);last=p.stage;}};
 const project=await b.generate({voiceId:voice.id,quality:'ultra',model:'tiny.en',name:'Installed Ultra local model acceptance',editingInstructions:'Clean gaming comparison. Preserve exact Pokemon forms and timestamps. Keep captions minimal.'},progress);
 fs.writeFileSync(path.join(folder,'ultra.gaming.json'),JSON.stringify(project,null,2));
 assert.ok(project.processingReport.frameReview.some(f=>!f.failed&&typeof f.inspection==='object'),'At least one actual image inspection must succeed');
 assert.ok(project.processingReport.stages.includes('understood'),'Real reasoning must succeed');
 assert.ok(project.processingReport.alternatives.some(a=>a.status?.startsWith('Ollama:')),'At least one real local layout proposal must pass validation');
 const exported=await b.render(project,path.join(folder,'ultra.mp4'),progress);
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({installedModels:discovered.models,exported,processing:project.processingReport,projectMedia:project.media.length,libraryAssets:b.library().length},null,2));
 console.log('PASS actual installed reasoning + rendered frame vision + Ultra MP4',exported);
}finally{b.close();}
