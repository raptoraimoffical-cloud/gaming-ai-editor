import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createDirectChanges} from '../electron/direct-changes.mjs';
import {createRevisionAssets,assetRequest} from '../electron/revision-assets.mjs';
import {undoRedo} from '../electron/revisions.mjs';
import {createWebImages} from '../electron/web-images.mjs';
import {audioRouting,musicVolumeAt,effectVolumeAt} from '../electron/audio-routing.mjs';
import {quickPatch} from '../electron/quick-patch.mjs';
function fixture(){return {id:'direct',name:'Direct change',format:'vertical',duration:8,voiceId:'voice',media:[{id:'voice',kind:'audio',duration:8},{id:'rotom',name:'Rotom',kind:'image',license:'source',width:700,height:700,pokemon:{name:'rotom',displayName:'Rotom'},identity:{franchise:'pokemon',subject:'rotom'}}],captionColor:'#eeeeee',musicVolume:.08,captionStyle:{fontSize:53,bottom:.19},scenes:[{id:'one',start:0,end:8,words:[{text:'Rotom',start:0,end:1}],text:'Rotom',title:'Rotom',layers:[{id:'lead',type:'image',role:'subject',mediaId:'rotom',x:.2,y:.3,width:.6,height:.4,z:20,start:0,end:8,animation:'none'}],reaction:{entities:[{id:'rotom',name:'Rotom',type:'pokemon',mediaId:'rotom'}]}}]};}
const at=(p,t)=>p.scenes[0].layers.filter(l=>t>=l.start&&t<l.end&&!l.excludedRanges?.some(r=>t>=r.start&&t<r.end));
test('a second range edit changes an already patched locked actor, without redoing speech or other seconds',async()=>{
 const p=fixture(),direct=createDirectChanges({assets:{apply(){throw Error('Do not search or remake');}}});let n=await direct(p,'Make Rotom 20% smaller',{timeRange:{start:2,end:4}});n=await direct(n,'Move Rotom to the left',{timeRange:{start:2.5,end:3.5}});
 assert.equal(at(n,3).length,1);assert.equal(at(n,3)[0].x,.1);assert.equal(at(n,1)[0].x,.2);assert.equal(at(n,4.5)[0].scale,undefined);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(undoRedo(n,'undo').revisionCursor,1);
});
test('literal user-requested Google props are downloaded and positioned; no unrelated scene remake or asset-choice gate',async()=>{
 const p=fixture(),candidate={id:'crown',provider:'google-images',name:'Gold crown transparent PNG',url:'https://images.example/gold-crown.png',width:640,height:480,attribution:{source:'https://images.example/crown',description:'Gold crown'}},asset={...candidate,id:'downloaded',kind:'image',decoded:true,transparent:true,webAssessment:{accepted:true}};let searches=0;
 const assets=createRevisionAssets({library:()=>[],search:async(q,provider)=>{if(provider!=='google-images')return [];searches++;assert.match(q,/crown/i);return [candidate];},download:async()=>asset,pokemonInfo:async()=>{throw Error('Not a species');}}),direct=createDirectChanges({assets});
 const n=await direct(p,'Add an image of a gold crown above Rotom',{timeRange:{start:2,end:4}},{'google-images':'test-key'});
 assert.equal(searches,1);assert.equal(n.pendingRevision,undefined);assert.ok(at(n,3).some(l=>l.mediaId==='downloaded'));assert.ok(!at(n,1).some(l=>l.mediaId==='downloaded'));assert.ok(!at(n,5).some(l=>l.mediaId==='downloaded'));assert.ok(at(n,3).find(l=>l.mediaId==='downloaded').y<.3);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('a failed search keeps its seconds selection and resumes against the full timeline',async()=>{
 const p=fixture(),m={id:'mario',name:'Super Mario',kind:'image',license:'source',width:640,height:640,identity:{franchise:'mario',subject:'mario',source:'User-confirmed library selection'}},assets=createRevisionAssets({library:()=>[],search:async()=>[]}),direct=createDirectChanges({assets});
 const pending=await direct(p,'Add Mario',{timeRange:{start:2,end:4}});assert.deepEqual(pending.scenes,p.scenes);assert.deepEqual(pending.pendingRevision.context.timeRange,{start:2,end:4});
 const n=await assets.resume({...pending,media:[...pending.media,m]},pending.pendingRevision.id,{mediaId:m.id,confirmIdentity:true});assert.equal(n.pendingRevision,undefined);assert.ok(at(n,3).some(l=>l.mediaId==='mario'));assert.ok(!at(n,5).some(l=>l.mediaId==='mario'));
});
test('music replacement and sound insertion run directly, and narration cannot become music',async()=>{
 const p=fixture(),music={id:'song',name:'Pokemon trainer battle',game:'pokemon',kind:'audio',assetRole:'music',duration:3,identity:{franchise:'pokemon'}},pop={id:'pop',name:'Soft pop',kind:'audio',assetRole:'sound-effect',duration:.25};
 const direct=createDirectChanges({assets:{},music:{catalog:()=>[music],download:async()=>music},sound:async()=>pop});const n=await direct(p,'Change music to Pokemon battle music');assert.equal(n.musicId,'song');assert.equal(n.voiceId,'voice');assert.equal(audioRouting(n).voice.id,'voice');
 const patch=await direct(n,'Change music to Pokemon battle music',{timeRange:{start:2,end:5}});assert.equal(musicVolumeAt(patch,3),0);assert.ok(musicVolumeAt(patch,1)>0);const range=patch.soundEffects[0];assert.equal(range.loop,true);assert.ok(effectVolumeAt(range,3,patch)>0);
 const withPop=await direct(p,'Add a pop sound',{timeRange:{start:4,end:4.2}});assert.equal(withPop.soundEffects[0].start,4);assert.equal(withPop.soundEffects[0].end,4.2);assert.deepEqual(undoRedo(patch,'undo').soundEffects,n.soundEffects);
});
test('compound changes apply together as one undoable edit; empty ranges and unsupported requests do not claim success',async()=>{
 const p=fixture(),direct=createDirectChanges({assets:{}});const n=await direct(p,'Make Rotom 20% smaller and move Rotom to the left');assert.equal(n.revisionHistory.length,1);assert.equal(n.scenes[0].layers[0].scale,.8);assert.equal(n.scenes[0].layers[0].x,.1);assert.deepEqual(undoRedo(n,'undo').scenes,p.scenes);
 await assert.rejects(direct(p,'Make Rotom smaller',{timeRange:{start:5,end:1}}));assert.equal(await direct(p,'Invent a 3D voice actor'),null);assert.equal(assetRequest('Add music'),null);assert.equal(assetRequest('Add an image of a crown above Rotom').name,'crown');
});
test('explicit caption changes are limited to the requested seconds, and newly inserted manual audio survives a patch',async()=>{
 const p=fixture(),direct=createDirectChanges({assets:{}}),n=await direct(p,'Make captions smaller',{timeRange:{start:2,end:4}});assert.equal(n.scenes[0].captionStyle,undefined);assert.equal(n.scenes[0].captionStyleRanges[0].style.fontSize,30);assert.deepEqual(n.captionStyle,p.captionStyle);
 const withSound=await quickPatch(p,'Add sound',{timeRange:{start:2,end:4}},{edit:async sub=>({...sub,media:[...sub.media,{id:'fx',kind:'audio',assetRole:'sound-effect',duration:.4}],soundEffects:[{mediaId:'fx',start:2.2,end:2.6,volume:.1,auto:false}]})});assert.equal(withSound.soundEffects.length,1);assert.equal(withSound.soundEffects[0].mediaId,'fx');
});
test('more than 48 distinct Google searches run even when a legacy limit is saved',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-unlimited-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));fs.writeFileSync(path.join(folder,'google-state.json'),JSON.stringify({maxSearches:2,budgetVersion:2}));let calls=0;
 const web=createWebImages(folder,{getKey:()=> 'test-only',fetchImpl:async()=>{calls++;return Response.json({images_results:[]});}});for(let i=0;i<55;i++)await web.search('Pokemon image '+i);assert.equal(calls,55);assert.equal(web.status().sessionSearches,55);assert.equal(web.status().unlimited,true);assert.equal(createWebImages(folder).status().maxSearches,0);
});
