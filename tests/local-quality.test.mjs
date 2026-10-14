import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {PNG} from 'pngjs';
import {assessProject,inspectScene,repairGeometry,applyReviewChanges} from '../electron/quality-review.mjs';
import {directWithReview} from '../electron/local-ai-pipeline.mjs';
import {applyAiDirection} from '../electron/ai-director.mjs';
import {QUALITY_MODES,createLocalAI} from '../electron/local-ai.mjs';
import {rankAsset,resolveSubject} from '../electron/asset-relevance.mjs';
import {generateDecorativeBackground,validateBackgroundSettings} from '../electron/local-backgrounds.mjs';
function folder(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-quality-'));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-quality-'));fs.rmSync(dir,{recursive:true,force:true});});return dir;}
function fixture(){
 const layers=[{id:'bg',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:3,color:'#101722',enter:'none',exit:'none'},{id:'subject',type:'image',role:'subject',mediaId:'art',x:.72,y:.2,width:.4,height:.4,z:1,start:.1,end:3,scale:1,animation:'none',exit:'none'},{id:'label',type:'text',role:'label',text:'Verified 200',x:.1,y:.1,width:.7,height:.05,z:2,start:0,end:3,animation:'none',exit:'none'},{id:'bar',type:'bar',value:80,x:.1,y:.8,width:.7,height:.03,z:3,start:0,end:3,animation:'none',exit:'none'}];
 return {id:'test',duration:5,format:'vertical',voiceId:'voice',media:[{id:'voice',kind:'audio'},{id:'art',path:'art.png',kind:'image',name:'own test art',license:'CC0'}],editingInstructions:'Clean typography; minimal captions',scenes:[{id:'one',start:0,end:3,text:'Verified 200',words:[],layers},{id:'two',start:3,end:5,text:'Unrelated',words:[],layers:[{...layers[0],id:'bg2',start:3,end:5}]}]};
}
function state(models={}){return {mode:'high',cfg:{...QUALITY_MODES.high},models,settings:{url:'http://127.0.0.1:11434',processingPreference:'cpu'},signal:new AbortController().signal,started:Date.now(),limitations:[],hardware:{}};}
const response=v=>new Response(JSON.stringify({message:{content:JSON.stringify(v)}}),{headers:{'Content-Type':'application/json'}});
function preview(dir,calls){const file=path.join(dir,'fixture.png'),png=new PNG({width:8,height:8});png.data.fill(255);fs.writeFileSync(file,PNG.sync.write(png));return async(p,frame,label)=>{calls.push({project:p,frame,label});return {path:file};};}
test('geometry repairs preserve facts, assets, timings, styles and unrelated scenes; real review callbacks rerun affected scenes',async t=>{
 const p=fixture(),dir=folder(t),calls=[];const result=await directWithReview(p,state(),()=>{},preview(dir,calls),{folder:dir,check:()=>{}});
 assert.equal(result.scenes[0].layers[1].x,.6);assert.deepEqual(result.scenes[1],p.scenes[1]);assert.equal(result.scenes[0].layers[2].text,'Verified 200');assert.equal(result.scenes[0].layers[3].value,80);assert.equal(result.scenes[0].layers[1].start,.1);assert.equal(p.scenes[0].layers[1].x,.72);
 assert.equal(result.processingReport.corrections.filter(c=>c.accepted).length,1);assert.equal(calls.filter(c=>c.label.startsWith('correction')).length,3);assert.equal(calls.filter(c=>c.label.startsWith('baseline')).length,6);assert.ok(result.processingReport.limitations.some(l=>l.includes('No installed semantic')));
});
test('manual layers and content cannot be silently rewritten by geometry/vision review',()=>{const p=fixture(),s=p.scenes[0];s.layers[1].manual=true;assert.equal(repairGeometry(s,p,inspectScene(s,p)).layers[1].x,.72);assert.throws(()=>applyReviewChanges(s,[{layerId:'subject',values:{x:.4}}]),/manually/);assert.throws(()=>applyReviewChanges(s,[{layerId:'label',values:{text:'Fake 999'}}]),/facts/);assert.throws(()=>applyReviewChanges(s,[{layerId:'label',values:{start:1}}]),/timing/);});
test('failed or inconclusive vision reinspection retains the original best scene',async t=>{
 const p=fixture(),dir=folder(t),calls=[];let inspected=0;
 const fetchImpl=async()=>{inspected++;if(inspected>3)throw Error('Review model unavailable');return response({issues:[],changes:[]});};
 const result=await directWithReview(p,state({vision:{name:'test-vision',capabilities:['vision']}}),()=>{},preview(dir,calls),{folder:dir,check:()=>{},fetchImpl});
 assert.equal(result.scenes[0].layers[1].x,.72);assert.equal(result.processingReport.corrections[0].accepted,false);assert.ok(result.processingReport.limitations.some(l=>l.includes('Vision inspection failed')));
});
test('vision changes are accepted only after rendered-frame observations improve; no identical repeat prompts',async t=>{
 const p=fixture();p.scenes[0].layers[1].x=.4;const dir=folder(t),calls=[];let inspected=0;
 const fetchImpl=async(_url,o)=>{const body=JSON.parse(o.body);assert.equal(body.keep_alive,120);assert.equal(body.options.num_gpu,0);assert.ok(body.messages[0].images[0]);inspected++;return response(inspected<=3?{issues:[{code:'caption-overlap',layerId:'subject',message:'Caption overlaps the figure'}],changes:[{layerId:'subject',values:{y:.4}}]}:{issues:[],changes:[]});};
 const result=await directWithReview(p,state({vision:{name:'test-vision',capabilities:['vision']}}),()=>{},preview(dir,calls),{folder:dir,check:()=>{},fetchImpl});
 assert.equal(result.scenes[0].layers[1].y,.4);assert.equal(result.processingReport.corrections.filter(c=>c.accepted).length,1);assert.equal(inspected,9);
});
test('wrong-character vision findings are retained for asset review, never hidden by geometric movement',async t=>{
 const p=fixture(),dir=folder(t),calls=[];const result=await directWithReview(p,state({vision:{name:'test-vision',capabilities:['vision']}}),()=>{},preview(dir,calls),{folder:dir,check:()=>{},fetchImpl:async()=>response({issues:[{code:'wrong-subject',layerId:'subject',message:'Wrong character'}],changes:[{layerId:'subject',values:{x:.4}}]})});
 assert.deepEqual(result.scenes,p.scenes);assert.equal(result.processingReport.corrections.length,0);
});
test('alternative model layouts are compared, invalid factual changes rejected, and repeat generation plans again',async t=>{
 const p=fixture(),dir=folder(t);let planned=0;const s=state({reasoning:{name:'test-text'},planning:{name:'test-text'}});s.cfg.frameSamples=0;
 const fetchImpl=async(_url,o)=>{const b=JSON.parse(o.body);if(b.format==='json')return response({visualBrief:'Preserve 200 and exact media; compare safe layouts'});planned++;const scenes=structuredClone(p.scenes);scenes[0].layers[1].x=planned===1?.5:.6;if(planned===2)scenes[0].layers[2].text='Fake 999';return response({scenes:scenes.map(s=>({id:s.id,layers:s.layers}))});};
 // The second scene needs four layers to meet the existing director schema.
 p.scenes[1].layers=structuredClone(p.scenes[0].layers).map(l=>({...l,id:l.id+'2',start:3,end:5}));
 const result=await directWithReview(p,s,()=>{},()=>{throw Error('No frame review in this test');},{folder:dir,check:()=>{},fetchImpl});
 assert.equal(result.scenes[0].layers[1].x,.5);assert.equal(result.scenes[0].layers[2].text,'Verified 200');assert.equal(result.processingReport.alternatives.length,4);assert.match(result.processingReport.alternatives[2].status,/fallback/);
 const before=planned,again=await directWithReview(p,{...s,limitations:[]},()=>{},()=>{}, {folder:dir,check:()=>{},fetchImpl});assert.equal(planned-before,3);assert.equal(again.processingReport.cacheHits,0);assert.notEqual(again.creativePassId,result.creativePassId);assert.notDeepEqual(again.scenes[0].layers,result.scenes[0].layers);assert.equal(fs.existsSync(path.join(dir,'ai-cache')),false);assert.equal(fs.existsSync(path.join(dir,'processing',p.id,'planned.gaming.json')),false);assert.equal(fs.existsSync(path.join(dir,'processing',p.id,'complete.gaming.json')),false);
});
test('cancellation interrupts model direction instead of reporting a successful fallback',async()=>{const p=fixture(),c=new AbortController();c.abort();await assert.rejects(applyAiDirection(p,{model:'test',signal:c.signal,fetchImpl:async()=>{throw Error('aborted');}}),/cancelled/);});
test('optional image generation is off by default, requires declared output rights and rejects exact character prompts',async t=>{
 const dir=folder(t),p=fixture();assert.equal(await generateDecorativeBackground(p,state(),{folder:dir,register:()=>{},fetchImpl:()=>{throw Error('No default image call');}}),p);
 assert.throws(()=>validateBackgroundSettings({enabled:true,url:'http://127.0.0.1:7860',prompt:'Abstract arena'}),/permission/);
 const s=state();s.settings.imageGeneration={enabled:true,url:'http://127.0.0.1:7860',prompt:'Super Mario official artwork',license:'Declared test rights'};
 await assert.rejects(generateDecorativeBackground(p,s,{folder:dir,register:()=>{}}),/exact characters/);
});
test('configured decorative PNG is cached, registered in shared library and does not replace real footage',async t=>{
 const dir=folder(t),p=fixture(),s=state();s.settings.imageGeneration={enabled:true,url:'http://127.0.0.1:7860',prompt:'Abstract blue arena lighting',license:'Test model output rights'};let generated=0,registered=[];
 const png=new PNG({width:16,height:16});png.data.fill(128);const fetchImpl=async url=>url.pathname.endsWith('options')?new Response(JSON.stringify({sd_model_checkpoint:'controlled-fixture'})): (generated++,new Response(JSON.stringify({images:[PNG.sync.write(png).toString('base64')]})));
 const run=()=>generateDecorativeBackground(p,s,{folder:dir,register:m=>(registered.push(m),m),fetchImpl});
 const a=await run(),b=await run();assert.equal(generated,1);assert.equal(registered.length,2);assert.equal(b.backgroundGeneration.cached,true);assert.equal(a.scenes[0].layers[0].type,'image');assert.match(a.scenes[0].backgroundConcept,/not official/);assert.equal(a.media.at(-1).license,'Test model output rights');
 p.scenes[0].layers[0].mediaId='art';const c=await run();assert.equal(c.scenes[0].layers[0].mediaId,'art');
});
test('candidate vision inspection reads actual image bytes, preserves licensing separately and rejects invalid responses',async t=>{
 const dir=folder(t),calls=[],proxy=path.join(dir,'candidate.png');const png=new PNG({width:8,height:8});png.data.fill(255);fs.writeFileSync(proxy,PNG.sync.write(png));
 const ai=createLocalAI(dir,{fetchImpl:async(_url,o)=>{calls.push(JSON.parse(o.body));return response(calls.length===1?{accepted:false,reason:'Unrelated person, not Super Mario'}:{accepted:'yes',reason:'Unsupported response'});}});
 const s=state({vision:{name:'controlled-test-model',capabilities:['vision']}}),entity=resolveSubject('Mario');
 const rejected=await ai.evaluateAsset(s,entity,proxy);assert.equal(rejected.accepted,false);assert.match(rejected.reason,/Unrelated/);assert.equal(calls[0].messages[0].images[0],fs.readFileSync(proxy).toString('base64'));assert.match(calls[0].messages[0].content,/does not verify licensing/);
 const invalid=await ai.evaluateAsset(s,entity,proxy);assert.equal(invalid.accepted,false);assert.match(invalid.reason,/Invalid asset inspection/);
});
test('rejected visual candidate stays rejected on cached reuse until explicitly confirmed by the user',()=>{
 const entity=resolveSubject('Mario'),m={name:'Super Mario Nintendo character',kind:'image',license:'CC BY',width:1600,height:1600,identity:{franchise:'mario',subject:'mario',source:'Catalog declaration'},assetReview:{subject:'mario',accepted:false,reason:'Wrong subject'}};
 assert.equal(rankAsset(entity,m).accepted,false);assert.equal(rankAsset(entity,{...m,identity:{...m.identity,source:'User-confirmed candidate'}}).accepted,true);
});
test('invalid advanced budgets and non-image model roles fail before persisting settings',async t=>{
 const dir=folder(t),ai=createLocalAI(dir,{fetchImpl:async url=>url.pathname.endsWith('tags')?new Response(JSON.stringify({models:[{name:'text-only',size:100}]})):new Response(JSON.stringify({models:[],capabilities:['completion']}))});
 await assert.rejects(ai.save({url:'http://127.0.0.1:11434',reviewPasses:99}),/reviewPasses/);await assert.rejects(ai.save({url:'http://127.0.0.1:11434',models:{review:'text-only'}}),/image-capable/);assert.ok(!fs.existsSync(path.join(dir,'local-ai-settings.json')));
});
test('semantic alternative selection compares rendered candidate frames and retains the least-defective valid layout',async t=>{
 const p=fixture();p.scenes[0].layers[1].x=.4;p.scenes[1].layers=structuredClone(p.scenes[0].layers).map(l=>({...l,id:l.id+'2',start:3,end:5}));
 const dir=folder(t),calls=[],s=state({reasoning:{name:'controlled-text'},planning:{name:'controlled-text'},vision:{name:'controlled-vision',capabilities:['vision']}});let planned=0;
 const fetchImpl=async(_url,o)=>{const b=JSON.parse(o.body);if(b.messages[0].images){const content=b.messages[0].content,layers=JSON.parse(content.slice(content.indexOf('Layers: ')+8)),subject=layers.find(l=>l.role==='subject');return response({issues:subject.x===.4?[{code:'caption-overlap',layerId:subject.id,message:'Visible overlap'}]:[],changes:[]});}
  if(b.format==='json')return response({visualBrief:'Compare safe readable layouts'});planned++;const scenes=structuredClone(p.scenes);for(const scene of scenes)scene.layers.find(l=>l.role==='subject').x=planned===1?.3:planned===2?.5:.4;return response({scenes:scenes.map(scene=>({id:scene.id,layers:scene.layers}))});};
 const result=await directWithReview(p,s,()=>{},preview(dir,calls),{folder:dir,check:()=>{},fetchImpl});assert.equal(result.scenes[0].layers[1].x,.3);assert.ok(result.processingReport.alternatives.some(a=>a.frameEvaluation?.issues.length===0));assert.ok(result.processingReport.alternatives.some(a=>a.frameEvaluation?.issues.length>0));assert.ok(calls.some(c=>c.label.startsWith('alternative')));assert.equal(result.processingReport.corrections.length,0);
});
