import test from 'node:test';import assert from 'node:assert/strict';
import {applyInstructions,selectInstructionAsset} from '../electron/editing-instructions.mjs';
import {reviseProject,undoRedo,applyOperations} from '../electron/revisions.mjs';
function fixture(){const p={id:'p',name:'Test',voiceId:'v',duration:12,format:'vertical',captionColor:'#8affcb',musicVolume:.08,media:[{id:'v',kind:'audio'},{id:'char',kind:'pokemon',name:'Charizard',license:'source notice',pokemon:{displayName:'Charizard'}},{id:'mega',kind:'pokemon',name:'Mega Charizard Y',license:'source notice',pokemon:{displayName:'Mega Charizard Y'}},{id:'mario',kind:'image',name:'Mario.png',license:'CC BY'}],soundEffects:[{mediaId:'v',start:4,volume:.12}],scenes:[]};for(let i=0;i<3;i++){const s={id:`s${i+1}`,start:i*4,end:(i+1)*4,words:[],text:'Charizard',title:'Charizard',kind:'story',layers:[]};s.layers=[{id:`b${i}`,type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:s.start,end:s.end,color:'#101722'},{id:`t${i}`,type:'text',x:.07,y:.135,width:.86,height:.06,z:1,start:s.start,end:s.end,text:s.title},{id:`a${i}`,type:'image',x:.1,y:.3,width:.8,height:.4,z:2,start:s.start+.5,end:s.end,mediaId:i===1?'mega':'char'}];p.scenes.push(s);}return p;}
test('instructions change actual styling and warn about unsupported clauses',()=>{const p=applyInstructions(fixture(),'Use dark Pokemon-themed backgrounds. Keep subtitles small and minimal. Use quick transitions but avoid excessive shaking. Add 3D lip sync.');assert.equal(p.captionStyle.fontSize,30);assert.equal(p.scenes[0].layers[0].color.includes('#050812'),true);assert.equal(p.scenes[0].layers[2].entranceDuration,.18);assert.equal(p.instructionReport.warnings.length,1);});
test('relative scale edits exact base form, leaves Mega form and unrelated layers intact',async()=>{const p=fixture(),next=await reviseProject(p,'Make Charizard 30% bigger.');assert.equal(next.scenes[0].layers[2].scale,1.3);assert.equal(next.scenes[2].layers[2].scale,1.3);assert.deepEqual(next.scenes[1],p.scenes[1]);assert.deepEqual(next.scenes[0].layers.slice(0,2),p.scenes[0].layers.slice(0,2));assert.deepEqual(p,fixture());});
test('timestamps, background, title removal, undo redo, saved history',async()=>{let p=fixture();p=await reviseProject(p,"Change Scene 2's background to dark red.");assert.equal(p.scenes[1].layers[0].color,'#350d19');const before=structuredClone(p);p=await reviseProject(p,'Remove the title in Scene 3.');assert.deepEqual(p.scenes[2].layers.map(l=>l.id),['b2','a2']);assert.deepEqual(undoRedo(p,'undo').scenes,before.scenes);const restored=JSON.parse(JSON.stringify(undoRedo(p,'undo')));assert.deepEqual(undoRedo(restored,'redo').scenes,p.scenes);p=await reviseProject(p,'At 0:08, make Charizard bigger.');assert.equal(p.scenes[2].layers.find(l=>l.id==='a2').scale,1.2);assert.equal(p.scenes[0].layers[2].scale,undefined);});
test('unsupported requests, missing target, wrong scene, missing asset fail without edits',async()=>{const p=fixture();for(const text of ['Generate a 3D walking character.','At 0:04, make Charizard bigger.','Remove the title in Scene 99.','Replace the image in Scene 1 with Missing Mario.'])await assert.rejects(reviseProject(p,text));assert.deepEqual(p,fixture());});
test('captions, timing, positioning, replacement, addition, intensity, SFX and text',async()=>{let p=fixture();p=await reviseProject(p,'Make captions smaller throughout the video.');assert.equal(p.scenes[2].captionStyle.fontSize,30);p=await reviseProject(p,'At 0:01, move Charizard to the left.');assert.equal(p.scenes[0].layers[2].x,0);p=await reviseProject(p,'Make the Pokemon appear earlier.');assert.ok(Math.abs(p.scenes[0].layers[2].start-.15)<1e-6);p=await reviseProject(p,'Replace the image in Scene 1 with Mario.');assert.equal(p.scenes[0].layers[2].mediaId,'mario');p=await reviseProject(p,'Add Mario to Scene 3.');assert.equal(p.scenes[2].layers.at(-1).mediaId,'mario');p=await reviseProject(p,'Make Scene 3 more dramatic.');assert.equal(p.scenes[2].layers.at(-1).enter,'spring');p=await reviseProject(p,'Reduce the amount of sound effects.');assert.equal(p.soundEffects[0].volume,.04);p=await reviseProject(p,'Change the title in Scene 2 to Battle report.');assert.equal(p.scenes[1].title,'Battle report');});
test('operations are atomic, bounded, and prevent missing IDs and unknown fields',()=>{const p=fixture();assert.throws(()=>applyOperations(p,{operations:[{type:'background',sceneIds:['s1'],color:'#350d19'},{type:'scale',sceneIds:['s2'],layerIds:['missing'],factor:1.3}]}));assert.throws(()=>applyOperations(p,{operations:[{type:'scale',sceneIds:['s1'],layerIds:['a0'],factor:9}]}));assert.throws(()=>applyOperations(p,{operations:[{type:'remove',sceneIds:['s1'],layerIds:['a0'],volume:.8}]}));assert.deepEqual(p,fixture());});
test('undo preserves unrelated manual edits and refuses conflicting edits',async()=>{const p=await reviseProject(fixture(),"Change Scene 2's background to dark blue.");p.scenes[0].title='Manual title';const undone=undoRedo(p,'undo');assert.equal(undone.scenes[0].title,'Manual title');p.scenes[1].layers[0].color='#ffffff';assert.throws(()=>undoRedo(p,'undo'),/manual edit/);});
test('configured model receives context; validated operations applied; unrelated scenes rejected',async()=>{
 let body;const p=fixture();
 const fetchImpl=async(url,options)=>{
  body=JSON.parse(options.body);
  return {ok:true,json:async()=>({message:{content:JSON.stringify({operations:[{type:'scale',sceneIds:['s1'],layerIds:['a0'],factor:1.3}]})}})};
 };
 const next=await reviseProject(p,'Make Charizard in Scene 1 bigger.',{model:'test',url:'http://localhost:11434'},fetchImpl);
 assert.equal(next.scenes[0].layers[2].scale,1.3);assert.equal(body.format.type,'object');assert.ok(body.messages[1].content.includes('Mega Charizard Y'));
 await assert.rejects(reviseProject(p,'Make Charizard in Scene 2 bigger.',{model:'test'},fetchImpl),/unrelated scene/);
 await assert.rejects(reviseProject(p,'Make Charizard bigger.',{model:'test'},async()=>({ok:false,status:503})),/no edits/);
});

test('model errors and wrong-form operations are rejected without substitute edits',async()=>{
 const p=fixture();
 await assert.rejects(reviseProject(p,'Make Charizard bigger.',{model:'test'},async()=>({ok:true,json:async()=>({message:{content:JSON.stringify({error:'Please specify a target'})}})})),/specify/);
 await assert.rejects(reviseProject(p,'Make Charizard bigger.',{model:'test'},async()=>({ok:true,json:async()=>({message:{content:JSON.stringify({operations:[{type:'scale',sceneIds:['s2'],layerIds:['a1'],factor:1.3}]})}})})),/unambiguously|unrelated/);
});

test('multiple requests are applied atomically with independent scene scopes',async()=>{
 const p=fixture(),next=await reviseProject(p,"Make Charizard 30% bigger. Change Scene 2's background to dark red. Remove the title in Scene 3.");
 assert.equal(next.scenes[0].layers[2].scale,1.3);assert.equal(next.scenes[1].layers[0].color,'#350d19');assert.deepEqual(next.scenes[2].layers.map(l=>l.id),['b2','a2']);assert.equal(next.revisionHistory.length,1);
 assert.deepEqual(undoRedo(next,'undo').scenes,p.scenes);
});

test('unknown named element is never replaced by a sole unrelated sprite',async()=>{
 const p=fixture();await assert.rejects(reviseProject(p,'Remove the hat in Scene 1.'),/not found/);await assert.rejects(reviseProject(p,'Make Sonic in Scene 1 bigger.'),/not found/);
 const next=await reviseProject(p,"Make Charizard 30% bigger and change Scene 2's background to dark blue.");assert.equal(next.scenes[0].layers[2].scale,1.3);assert.equal(next.scenes[1].layers[0].color,'#0a1835');
});

test('image preference changes selection only among confident relevant assets',()=>{
 const video={id:'v',kind:'video',tags:'Mario'},image={id:'i',kind:'image',tags:'Mario'},wrong={id:'wrong',kind:'image',tags:'Luigi'},score=m=>m.tags==='Mario'?1:0;
 assert.equal(selectInstructionAsset([video,wrong,image],score).id,'v');assert.equal(selectInstructionAsset([video,wrong,image],score,{preferImages:true}).id,'i');assert.equal(selectInstructionAsset([wrong,video],score,{preferImages:true}).id,'v');
});

test('two explicitly named forms can both be edited without nested base-name confusion',async()=>{
 const p=fixture(),next=await reviseProject(p,'Make Charizard and Mega Charizard Y 30% bigger.');assert.equal(next.scenes[0].layers[2].scale,1.3);assert.equal(next.scenes[1].layers[2].scale,1.3);
 const onlyMega=await reviseProject(p,'Make Mega Charizard Y 30% bigger.');assert.equal(onlyMega.scenes[0].layers[2].scale,undefined);assert.equal(onlyMega.scenes[1].layers[2].scale,1.3);
});

test('known entity alias selects an existing Commons asset without inventing a download',async()=>{
 const p=fixture();p.media.find(m=>m.id==='mario').name='Supermario Kungsbacka.jpg';p.scenes[0].layers[2].mediaId='mario';p.scenes[0].reaction={entities:[{id:'mario',name:'Mario',mediaId:'mario'}]};
 const next=await reviseProject(p,'Replace the image in Scene 3 with Mario.');assert.equal(next.scenes[2].layers[2].mediaId,'mario');assert.deepEqual(next.media,p.media);
});

test('explicit show and no-animation edits override inherited automated keyframes',async()=>{const {applyOperations}=await import('../electron/revisions.mjs');const {motionFor}=await import('../electron/layer-motion.mjs');const p=fixture(),l=p.scenes[0].layers[2];l.keyframes=[{time:0,opacity:0,x:.1,scale:1},{time:2,opacity:0,x:.4,scale:1.4}];l.float=true;const next=applyOperations(p,{operations:[{type:'properties',sceneIds:['s1'],layerIds:[l.id],opacity:1},{type:'animation',sceneIds:['s1'],layerIds:[l.id],preset:'none'}]}).project;const changed=next.scenes[0].layers.find(v=>v.id===l.id);assert.equal(motionFor(changed,1).opacity,1);assert.equal(changed.float,false);assert.ok(changed.keyframes.every(k=>k.x===undefined&&k.scale===undefined));});
