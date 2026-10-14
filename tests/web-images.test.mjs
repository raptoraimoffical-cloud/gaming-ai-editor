import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import sharp from 'sharp';
import {createWebImages} from '../electron/web-images.mjs';
import {imageSearchIntent,assessWebCandidate} from '../electron/web-image-queries.mjs';
import {inspectImageBytes,isPublicAddress,downloadPublicImage} from '../electron/web-image-download.mjs';
import {googleImageCandidates,searchGoogleImages} from '../electron/google-images.mjs';
import {createRevisionAssets,assetRequest} from '../electron/revision-assets.mjs';
import {undoRedo} from '../electron/revisions.mjs';
const pig={title:'Minecraft Pig game render',original:'https://minecraft.wiki/images/Pig.png',link:'https://minecraft.wiki/w/File:Pig.png',source:'Minecraft Wiki',original_width:726,original_height:673};
const publicLookup=async()=>[{address:'1.1.1.1',family:4}];
function fixture(){return {id:'web',duration:4,name:'Image edit',voiceId:'v',format:'vertical',captionColor:'#fff',musicVolume:0,media:[{id:'v',kind:'audio'}],scenes:[{id:'s',start:0,end:4,text:'Minecraft pig',words:[],layers:[{id:'bg',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:4}]}]};}
test('seven gaming searches produce specific franchise, entity and visual queries',()=>{
 const cases=[['Minecraft pig transparent PNG',/Minecraft pig mob render transparent png -real -toy/],['Minecraft diamond pickaxe PNG',/diamond pickaxe item png/],['Mario official character PNG',/Super Mario Nintendo official character.*-cosplay/],['Fortnite Peely skin PNG',/Fortnite Peely skin render/],['Pokemon Charizard artwork',/Pokemon Charizard official artwork/],['Pikachu animated GIF',/Pokemon Pikachu animated sprite gif/],['Minecraft Nether background',/Minecraft nether biome gameplay screenshot/]];
 for(const [q,expected] of cases)assert.match(imageSearchIntent(q).query,expected);
});
test('Google parses missing optional metadata without inventing licenses or using thumbnails',()=>{
 const [c]=googleImageCandidates({images_results:[{original:pig.original,thumbnail:'https://example.com/t.jpg'}]});assert.equal(c.url,pig.original);assert.equal(c.license,'');assert.equal(c.attribution.licenseUrl,'');assert.equal(c.width,0);
});
test('SerpApi request parameters and invalid key/quota errors never expose the key',async()=>{
 let sent;await searchGoogleImages('Minecraft pig','test-secret',{fetchImpl:async u=>{sent=new URL(u);return Response.json({images_results:[pig]});}});for(const [k,v] of Object.entries({engine:'google_images',hl:'en',gl:'us',q:'Minecraft pig'}))assert.equal(sent.searchParams.get(k),v);
 await assert.rejects(searchGoogleImages('pig',''),e=>e.code==='MISSING_KEY');
 for(const [status,code] of [[401,'INVALID_KEY'],[429,'QUOTA']])await assert.rejects(searchGoogleImages('pig','test-secret',{fetchImpl:async()=>new Response('',{status})}),e=>e.code===code&&!e.message.includes('test-secret'));
 await assert.rejects(searchGoogleImages('pig','test-secret',{fetchImpl:async()=>{throw Error('secret test-secret URL');}}),e=>!e.message.includes('test-secret'));
});
test('merchandise, wrong franchise, wrong subject and title-only matches cannot be automatic',()=>{
 const intent=imageSearchIntent('Minecraft pig'),[c]=googleImageCandidates({images_results:[pig]});assert.equal(assessWebCandidate(c,intent).autoEligible,true);
 for(const change of [{name:'Minecraft Pig plush toy'},{name:'Real farm pig',url:'https://photo.example/pig.jpg',attribution:{source:'https://photo.example/pig'}},{name:'Minecraft creeper',url:'https://minecraft.wiki/images/Creeper.png',attribution:{source:'https://minecraft.wiki/w/File:Creeper.png'}},{url:'https://random.example/photo.png'}])assert.equal(assessWebCandidate({...c,...change},intent).autoEligible,false);
 const mario=imageSearchIntent('Mario');assert.equal(assessWebCandidate({...c,name:'Mario cosplay costume'},mario).accepted,false);
});
test('decoder checks real alpha, refuses HTML, SVG, corrupt/truncated headers and tiny files',async()=>{
 const opaque=await sharp({create:{width:128,height:128,channels:4,background:'#ff0000ff'}}).png().toBuffer(),alpha=await sharp({create:{width:128,height:128,channels:4,background:'#ff000080'}}).png().toBuffer();
 assert.equal((await inspectImageBytes(opaque)).transparent,false);assert.equal((await inspectImageBytes(alpha)).transparent,true);
 for(const bytes of [Buffer.from('<html>image.png</html>'),Buffer.from('<svg width="200" height="200"></svg>'),alpha.subarray(0,30)])await assert.rejects(inspectImageBytes(bytes));
});
test('decoder preserves GIF and WebP animation metadata instead of freezing frame one',async()=>{
 const raw=Buffer.concat([Buffer.alloc(32*32*4,255),Buffer.alloc(32*32*4,80)]);
 for(const format of ['gif','webp']){const bytes=await sharp(raw,{raw:{width:32,height:64,channels:4,pageHeight:32}})[format]({delay:[100,120],loop:0}).toBuffer();const info=await inspectImageBytes(bytes);assert.equal(info.height,32);assert.equal(info.animationInfo.animated,true);assert.equal(info.animationInfo.frameCount,2);assert.equal(info.animationInfo.cycleMs,220);}
});
test('private, reserved and mapped addresses and DNS/redirect targets are blocked',async()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','172.31.1.1','192.168.1.2','169.254.169.254','100.64.0.1','0.0.0.0','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('8.8.8.8'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
 let calls=0;await assert.rejects(downloadPublicImage('https://publisher.example/pig.png',{lookup:async()=>[{address:'172.20.0.2',family:4}],fetchImpl:async()=>{calls++;}}),/Private/);assert.equal(calls,0);
 await assert.rejects(downloadPublicImage('https://public.example/a',{lookup:publicLookup,fetchImpl:async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private.png'}})}),/Private/);
 await assert.rejects(downloadPublicImage('https://public.example/a',{lookup:publicLookup,fetchImpl:async()=>new Response(Buffer.alloc(500),{headers:{'content-length':'500'}}),limit:100}),/limit/);
});
test('cached/inflight Google queries use one credit, downloads validate originals and content hashes deduplicate',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'google-test-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));let searches=0,downloads=0;const bytes=await sharp({create:{width:128,height:128,channels:4,background:'#ff000080'}}).png().toBuffer();
 const service=createWebImages(folder,{getKey:()=> 'test-secret',lookup:publicLookup,fetchImpl:async()=>{searches++;return Response.json({images_results:[pig,{...pig,original:'https://minecraft.wiki/images/Another_Pig.png'}]});},imageFetch:async u=>{downloads++;assert.ok(!String(u).includes('thumbnail'));return new Response(bytes);}});
 const [a,b]=await Promise.all([service.search('Minecraft pig'),service.search('Minecraft pig')]);assert.equal(searches,1);assert.equal(a[0].id,b[0].id);
 const first=await service.download({...a[0],url:'https://127.0.0.1/forged'}),second=await service.download(a[1]);assert.equal(first.originalUrl,pig.original);assert.equal(first.path,second.path);assert.equal(first.id,second.id);assert.equal(first.license,'');assert.equal(first.transparent,true);assert.equal(first.decoded,true);
 await service.download(a[0]);assert.equal(downloads,2);await service.search('Minecraft pig');assert.equal(searches,1);
 service.configure({maxSearches:1});await service.search('Mario');assert.equal(service.status().unlimited,true);service.reject(a[0].id);assert.equal((await service.search('Minecraft pig')).length,1);service.clear();assert.ok(fs.existsSync(first.path));
});
test('quota/account checks sanitize secrets; enable toggle and cancelled searches work',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'google-status-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const service=createWebImages(folder,{getKey:()=> 'test-secret',fetchImpl:async u=>Response.json({api_key:'test-secret',email:'private@example.com',total_searches_left:50})});
 const state=await service.test();assert.equal(state.quota.total_searches_left,50);assert.ok(!JSON.stringify(state).includes('test-secret'));assert.ok(!JSON.stringify(state).includes('private@example.com'));service.configure({enabled:false});await assert.rejects(service.search('pig'),/disabled/);
});
test('broken originals and unsupported bytes fail without writing pretend image files',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'google-broken-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 for(const response of [()=>new Response('Not found',{status:404}),()=>new Response('<html>fake image</html>')]){const s=createWebImages(folder,{lookup:publicLookup,imageFetch:async()=>response()});await assert.rejects(s.importUrl('https://minecraft.wiki/images/Bad.png'));}
 assert.equal(fs.readdirSync(folder).filter(f=>f.startsWith('google-content-')).length,0);
});
test('search cancellation aborts pending transport and original downloads retry transient failures',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'google-cancel-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const cancel=createWebImages(folder,{fetchImpl:async(_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted')),{once:true}))});
 const pending=cancel.search('Minecraft pig','test-secret');const cancelled=assert.rejects(pending,e=>e.code==='CANCELLED');cancel.cancel();await cancelled;
 let attempts=0;const bytes=await sharp({create:{width:128,height:128,channels:4,background:'#ff000080'}}).png().toBuffer();
 const retry=createWebImages(folder,{lookup:publicLookup,imageFetch:async()=>{attempts++;return attempts===1?new Response('retry',{status:503}):new Response(bytes);}});
 const asset=await retry.importUrl('https://minecraft.wiki/images/Pig.png',{name:'Minecraft pig'});assert.equal(attempts,2);assert.equal(asset.decoded,true);
});
test('AI Changes downloads a verified Google original, edits selected scene, supports second result and Undo',async()=>{
 const [candidate]=googleImageCandidates({images_results:[pig]}),asset={...candidate,id:'downloaded',decoded:true,transparent:true,path:'pig.png',webAssessment:{accepted:true},kind:'image'};
 let downloads=0;const api=createRevisionAssets({library:()=>[],search:async(q,p)=>p==='google-images'?[candidate]:[],download:async()=>{downloads++;return asset;}});
 const next=await api.apply(fixture(),'Replace that picture with a better Minecraft pig PNG.',{sceneId:'s',layerId:'bg'},{'google-images':'test'});assert.equal(next.scenes[0].layers.find(l=>l.id==='bg').mediaId,'downloaded');assert.equal(downloads,1);assert.equal(next.pendingRevision,undefined);assert.deepEqual(undoRedo(next,'undo').scenes,fixture().scenes);
 const pending={...fixture(),pendingRevision:{id:'pending',request:'Add Minecraft pig.',target:{name:'Minecraft pig',kind:'add',animation:'spring-pop'},context:{sceneId:'s'},queries:['Minecraft pig'],searchLog:[],candidates:[{...candidate,id:'1'},{...candidate,id:'2',origin:'provider'}]}};
 const selected=await api.apply(pending,'Use the second search result.',{}, {'google-images':'test'});assert.equal(selected.pendingRevision,undefined);assert.equal(selected.scenes[0].layers.at(-1).mediaId,'downloaded');
 assert.equal(assetRequest('Find a Charizard GIF.').animated,true);assert.equal(assetRequest('Use a transparent PNG.').preferWeb,true);
});
