import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {visualPlanningInput,mergeVisualDirection,modelIdleSeconds} from '../electron/ai-performance.mjs';import {applyAiDirection} from '../electron/ai-director.mjs';import {propertyAt} from '../electron/layer-motion.mjs';import {byId} from '../electron/indexed-assets.mjs';import {measureArtwork} from '../electron/artwork-geometry.mjs';import {createInferenceFetch} from '../electron/inference-provider.mjs';import {inspectScene,assessProject,compareAssessments} from '../electron/quality-review.mjs';import {discoverNamedPeople} from '../electron/person-mentions.mjs';import {referenceStyleModelStatus,predictSceneStyle,sceneStyleGuidance} from '../electron/reference-style-model.mjs';import {createBackend} from '../electron/backend.mjs';
const fixture=()=>({id:'audit',voiceId:'v',duration:4,format:'vertical',captionColor:'#fff',captionStyle:{fontSize:70},media:[{id:'v',kind:'audio',path:'v.wav'},{id:'m',kind:'image',path:'m.png',name:'Charizard',width:500,height:500,pokemon:{name:'charizard',displayName:'Charizard'}}],scenes:[{id:'s',start:0,end:4,text:'Charizard uses Flamethrower.',words:[{text:'Charizard',start:0,end:.4},{text:'uses',start:.4,end:.7},{text:'Flamethrower.',start:.7,end:1}],reaction:{entities:[{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'m',start:0}],metrics:[]},layers:[{id:'hero',type:'image',role:'subject',mediaId:'m',x:.1,y:.2,width:.4,height:.4,z:5,start:0,end:2.7,sourceMoveCard:true,attachment:{targetId:'stable',x:.5,y:.5,size:.2},blueprintEffect:{kind:'setup'},keyframes:[{time:0,width:.4,height:.4},{time:2,width:.5,height:.5}]}]}]});
test('one-layer scenes and temporary subjects accept genuine AI geometry without dropping bindings or animation metadata',async()=>{
 const p=fixture();delete p.scenes[0].layers[0].attachment;const n=await applyAiDirection(p,{model:'controlled',fetchImpl:async()=>Response.json({message:{content:JSON.stringify({scenes:[{id:'s',layers:[{id:'hero',x:.1,y:.2,width:.6,height:.6}]}]})}})});assert.match(n.directorStatus,/Ollama/);const l=n.scenes[0].layers[0];assert.equal(l.end,2.7);assert.equal(l.mediaId,'m');assert.equal(l.sourceMoveCard,true);assert.deepEqual(l.blueprintEffect,p.scenes[0].layers[0].blueprintEffect);assert.ok(Math.abs(propertyAt(l,'width',2)-.75)<1e-10);assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('echoed original keyframes follow a requested resize and manual directions remain immutable',()=>{
 const l=fixture().scenes[0].layers[0],n=mergeVisualDirection(l,{...l,width:.6,height:.6});assert.ok(Math.abs(n.keyframes[1].width-.75)<1e-10);assert.deepEqual(n.attachment,l.attachment);assert.equal(mergeVisualDirection({...l,manual:true},{width:.9}).width,.4);
});
test('dense scenes above the old sixty-layer cap retain supplied numeric facts during AI layout changes',async()=>{
 const p=fixture();p.scenes[0].layers=Array.from({length:65},(_,i)=>({id:'fact-'+i,type:'text',role:'label',text:'1129 competitors / 23 SP',x:.1,y:.1,width:.4,height:.04,fontSize:48,z:i,start:0,end:4}));
 const n=await applyAiDirection(p,{model:'controlled',fetchImpl:async()=>Response.json({message:{content:JSON.stringify({scenes:[{id:'s',layers:p.scenes[0].layers.map(l=>({id:l.id,x:.2,y:l.y,width:l.width,height:l.height}))}]})}})});
 assert.match(n.directorStatus,/Ollama/);assert.equal(n.scenes[0].layers.length,65);assert.ok(n.scenes[0].layers.every(l=>l.text==='1129 competitors / 23 SP'&&l.x===.2));
});
test('a model cannot alter source descriptions or replace a layer with a duplicate',async()=>{
 const p=fixture();p.scenes[0].layers.push({...p.scenes[0].layers[0],id:'other'});
 for(const layers of [[{...p.scenes[0].layers[0],text:'invented damage 999'},p.scenes[0].layers[1]],[p.scenes[0].layers[0],p.scenes[0].layers[0]]]){
  const n=await applyAiDirection(p,{model:'controlled',fetchImpl:async()=>Response.json({message:{content:JSON.stringify({scenes:[{id:'s',layers}]})}})});assert.match(n.directorStatus,/fallback/);assert.deepEqual(n.scenes,p.scenes);
 }
});
test('visual planning omits history, SVG payloads and unused assets while retaining facts, instructions and caption placement',()=>{
 const p=fixture();p.editingInstructions='Keep every supplied fact.';p.revisionHistory=[{data:'x'.repeat(100000)}];p.scenes[0].oldSourceLayers=[{svg:'x'.repeat(100000)}];p.scenes[0].layers[0].svg='x'.repeat(100000);p.media.push({id:'unused',name:'Unrelated'});const n=visualPlanningInput(p,'Current story');assert.ok(JSON.stringify(n).length<2500);assert.equal(n.editingInstructions,p.editingInstructions);assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(n.media.length,1);assert.equal(n.scenes[0].layers[0].end,2.7);assert.deepEqual(n.scenes[0].layers[0].blueprintEffect,p.scenes[0].layers[0].blueprintEffect);
});
test('indexed lookups preserve first-match behavior and observe replacements, mutation, removal and new IDs',()=>{
 const a=[{id:'a',x:1},{id:'b',x:2},{id:'b',x:3}];assert.equal(byId(a,'b'),a[1]);a[1]={id:'b',x:4};assert.equal(byId(a,'b').x,4);a[1].id='c';assert.equal(byId(a,'c'),a[1]);assert.equal(byId(a,'b'),a[2]);a.pop();assert.equal(byId(a,'b'),undefined);a.push({id:'d'});assert.equal(byId(a,'d'),a[2]);
});
test('sprite sheets are not mistaken for one large padded character silhouette',async()=>{
 const m={id:'rain',kind:'image',path:'missing.png',spriteSheet:{frames:16}};assert.equal(await measureArtwork(m),m);
});
test('warm reuse honors explicit zero, and hosted requests honor the caller output budget',async()=>{
 assert.equal(modelIdleSeconds({}),120);assert.equal(modelIdleSeconds({keepAliveSeconds:0}),0);let body;const request=createInferenceFetch(()=>({provider:'hosted',url:'https://example.org/v1',hostedMaxTokens:4000}),()=>'',async(_,o)=>{body=JSON.parse(o.body);return Response.json({choices:[{message:{content:'{}'}}]});});await request('https://example.org/api/chat',{body:JSON.stringify({model:'test',messages:[],options:{num_predict:300}})});assert.equal(body.max_tokens,300);
});
test('readability uses actual font size and ordinary pronouns never become named-person searches',()=>{
 const p=fixture(),s=p.scenes[0];s.layers=[{id:'label',type:'text',role:'label',text:'Label',x:.1,y:.1,width:.5,height:.01,fontSize:48,start:0,end:4,z:5}];assert.equal(inspectScene(s,p).some(f=>f.code==='small-text'),false);assert.deepEqual(discoverNamedPeople({...s,text:'This player won the whole thing.'},p),[]);
});
test('trained local scene choice generalizes to new species and structural defects always outrank style preferences',()=>{
 const p=fixture(),s=p.scenes[0];s.text='Charizard is number one.';const hint=sceneStyleGuidance(s,p);assert.equal(hint.kind,'rank');assert.ok(referenceStyleModelStatus().evaluation.sceneChoiceAccuracy>=.85);assert.equal(predictSceneStyle('pokemon won first place')[0].kind,'rank');assert.ok(compareAssessments({errors:['bad'],findings:[],warnings:[],referenceStyle:{score:100}},{errors:[],findings:[],warnings:[],referenceStyle:{score:0}})>0);
});
test('unchanged asset-pack indexing performs no whole-database rewrite',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-db-audit-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const b=await createBackend({workspace:folder});try{const before=b.storageStats();b.indexPacks();assert.equal(b.storageStats().writes,before.writes);assert.equal(fs.readdirSync(folder).some(f=>f.endsWith('.saving')),false);}finally{b.close();}
});
