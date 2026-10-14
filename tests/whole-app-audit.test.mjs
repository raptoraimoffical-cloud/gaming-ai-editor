import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {quickPatch,patchSubset,applyPatchOperations} from '../electron/quick-patch.mjs';
import {rebuildVideo,rebuildInstructions} from '../electron/video-rebuild.mjs';
import {preserveQuickPatches,savedPatchRanges} from '../electron/saved-patches.mjs';
import {compactLayers,visibleLayers} from '../electron/layer-visibility.mjs';
import {propertyAt,motionFor} from '../electron/layer-motion.mjs';
import {clipLayer} from '../electron/clip-layer.mjs';
import {undoRedo,applyOperations} from '../electron/revisions.mjs';
import {prepareAudio,fingerprintAudio} from '../electron/audio-integrity.mjs';
import {createLocalAI} from '../electron/local-ai.mjs';
import {serveMedia} from '../electron/media-stream.mjs';
import {renderProject} from '../electron/render-project.mjs';
import {projectHealth} from '../electron/project-health.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
const at=(p,t)=>visibleLayers({...p.scenes[0],start:t,end:t+.00001});
function fixture(){return {id:'audit',voiceId:'v',duration:8,format:'vertical',captionColor:'#fff',captionStyle:{fontSize:46},musicVolume:0,media:[{id:'v',kind:'audio',duration:8,path:'v.wav',license:'Own'},{id:'art',kind:'image',path:'art.png',license:'Own'}],scenes:[{id:'s',start:0,end:8,text:'This Pokemon is fast.',words:[{text:'This',start:0,end:.5},{text:'Pokemon',start:.5,end:1},{text:'is',start:1,end:1.4},{text:'fast.',start:1.4,end:2}],layers:[{id:'bg',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:8,color:'#111111'},{id:'lead',type:'image',role:'subject',mediaId:'art',x:.1,y:.2,width:.7,height:.5,z:5,start:0,end:8,keyframes:[{time:0,x:.1},{time:8,x:.2}]}]}]};}
const resize=width=>async p=>{p.scenes[0].layers.find(l=>l.role==='subject').width=width;return p;};
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-whole-audit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}

test('full remake retains reviewed local frames, does not spread their brief globally, and a new explicit change takes priority',async()=>{
 const p=await quickPatch(fixture(),'Make the Pokemon smaller',{timeRange:{start:3,end:4}},{edit:resize(.3)});
 assert.ok(!rebuildInstructions(p,'Make background blue').includes('smaller'));
 p.scenes[0].performanceSourceLayers=[{...p.scenes[0].layers[1],width:.01}];
 let next=await rebuildVideo(p,'',{preserveReviewedPatches:true,preserveCaptions:true,identify:async n=>{assert.equal(n.scenes[0].performanceSourceLayers,undefined);return n;},enrich:async n=>({...n,scenes:n.scenes.map(s=>({...s,layers:structuredClone(fixture().scenes[0].layers)}))}),finalize:async n=>{n.scenes[0].layers[1].width=.8;return n;}});
 assert.equal(at(next,3.5).find(l=>l.role==='subject').width,.3);assert.equal(at(next,2).find(l=>l.role==='subject').width,.8);assert.equal(at(next,5).find(l=>l.role==='subject').width,.8);
 assert.equal(propertyAt(at(next,3.5).find(l=>l.role==='subject'),'x',3.5),propertyAt(at(p,3.5).find(l=>l.role==='subject'),'x',3.5));
 assert.deepEqual(next.scenes[0].words,p.scenes[0].words);assert.deepEqual(next.captionStyle,p.captionStyle);assert.deepEqual(undoRedo(next,'undo').scenes,p.scenes);
 next=await rebuildVideo(p,'Make character half size',{preserveReviewedPatches:true,identify:async n=>n,enrich:async n=>({...n,scenes:n.scenes.map(s=>({...s,layers:structuredClone(fixture().scenes[0].layers)}))}),applyFinalRequest:async n=>applyOperations(n,{operations:[{type:'properties',sceneIds:['s'],layerIds:at(n,3.5).filter(l=>l.role==='subject').map(l=>l.id),width:.15}]}).project});
 assert.equal(at(next,3.5).find(l=>l.role==='subject').width,.15);
 const otherGame=preserveQuickPatches({...p,gameSelection:'pokemon'},{...structuredClone(p),gameSelection:'minecraft',scenes:fixture().scenes});assert.deepEqual(otherGame.quickPatchRanges,[]);assert.equal(at(otherGame,3.5).find(l=>l.role==='subject').width,.7);
});

test('repeated patches compact retired layers and range gates while retaining Undo and persistent protection past 30 revisions',async t=>{
 t.mock.method(Date,'now',()=>123456789); // Consecutive edits can finish within one millisecond.
 let p=fixture();for(let i=0;i<35;i++)p=await quickPatch(p,'Resize '+i,{timeRange:{start:3,end:4}},{edit:resize(.2+i/100)});
 assert.equal(p.revisionHistory.length,30);assert.equal(p.scenes[0].layers.length,3);assert.deepEqual(p.quickPatchRanges,[{start:3,end:4}]);
 assert.equal(at(p,3.5).filter(l=>l.role==='subject').length,1);assert.equal(at(p,3.5).find(l=>l.role==='subject').width,.54);
 assert.equal(undoRedo(p,'undo').scenes[0].layers.length,3);assert.equal(p.scenes[0].layers.find(l=>l.id==='lead').excludedRanges.length,1);
 const legacy={...p};delete legacy.quickPatchRanges;assert.deepEqual(savedPatchRanges(legacy),[{start:3,end:4}]);legacy.revisionCursor=0;assert.deepEqual(savedPatchRanges(legacy),[]);
 await assert.rejects(quickPatch(p,'Do nothing',{timeRange:{start:3.2,end:3.8}},{edit:async sub=>sub}),/did not change/);
});

test('a patch past a gameplay loop retains original trims, loop period and inherited media time for videos and GIFs',async()=>{
 const p=fixture();p.media.push({id:'clip',kind:'video',duration:15});p.scenes[0].layers[1]={...p.scenes[0].layers[1],type:'video',mediaId:'clip',videoStart:10,videoEnd:12};
 const n=await quickPatch(p,'Resize footage',{timeRange:{start:5,end:7}},{edit:resize(.4)}),l=at(n,6).find(l=>l.role==='subject');
 assert.equal(l.videoStart,10);assert.equal(l.videoEnd,12);assert.equal(l.mediaOffset,5);assert.equal((6-l.start+l.mediaOffset)%2,6%2);
 const sub=patchSubset(n,{start:6,end:6.8}),again=sub.scenes[0].layers.find(l=>l.role==='subject');assert.equal(again.mediaOffset,6);
});

test('clipping preserves preset zoom, floating, exit opacity and slide phase instead of fading at patch boundaries',()=>{
 for(const animation of ['fade','slide-in-out','smooth-zoom','emphasis','parallax']){const l={...fixture().scenes[0].layers[1],animation,exit:'fade',float:true};const clipped=clipLayer(l,3,4);for(const time of [3,3.5,3.9])assert.deepEqual(motionFor(clipped,time),motionFor(l,time),animation+' at '+time);}
});

test('an explicitly requested entrance animation starts in the selected patch, rather than finishing before it',async()=>{
 const p=await quickPatch(fixture(),'Spring pop here',{timeRange:{start:3,end:4}},{edit:async sub=>applyPatchOperations(sub,{operations:[{type:'animation',sceneIds:['s'],layerIds:['lead'],preset:'spring-pop'}]})});
 const l=at(p,3.1).find(l=>l.role==='subject');assert.equal(l.animationStart,3);assert.equal(l.animationEnd,4);assert.ok(motionFor(l,3.1).opacity<1);assert.ok(motionFor(l,3.1).scale<1);
});

test('invisible obsolete files do not block export, but visible effect results do and attached anchors survive compaction',()=>{
 const p=fixture();p.visualVersion=3;p.media.push({id:'old',kind:'image',path:'deleted.png',license:'Own'});p.scenes[0].layers.push({...p.scenes[0].layers[1],id:'old-layer',mediaId:'old',excludedRanges:[{start:0,end:8}]});
 assert.equal(projectHealth(p,{exists:file=>file!=='deleted.png'}).ready,true);
 const child={...p.scenes[0].layers[1],id:'attachment',attachment:{targetId:'old-layer',anchor:'center',x:.5,y:.5,size:.2}};p.scenes[0].layers.push(child);assert.ok(compactLayers(p.scenes[0]).some(l=>l.id==='old-layer'));
 p.scenes[0].layers[1].effectResultMediaId='missing-result';assert.ok(projectHealth(p,{exists:()=>true}).issues.some(i=>i.code==='missing-asset'));
});

test('retained patch sound portions keep source offsets and never overlap regenerated cues',()=>{
 const p=fixture();p.quickPatchRanges=[{start:3,end:4}];p.media.push({id:'sound',kind:'audio',assetRole:'sound-effect',duration:8});p.soundEffects=[{mediaId:'sound',start:2,end:6,volume:.1}];
 const n=preserveQuickPatches(p,{...structuredClone(p),soundEffects:[{mediaId:'sound',start:0,end:8,volume:.3}]});
 assert.deepEqual(n.soundEffects.map(f=>[f.start,f.end,f.sourceOffset,f.volume]),[[0,3,0,.3],[3,4,1,.1],[4,8,4,.3]]);
});

test('Explicit model-free setup makes no inference/network calls',async t=>{
 const folder=temp(t);fs.writeFileSync(path.join(folder,'local-ai-settings.json'),JSON.stringify({url:'http://127.0.0.1:65530',models:{reasoning:'unused'}}));let calls=0;
 const ai=createLocalAI(folder,{fetchImpl:async()=>{calls++;throw Error('Offline');}}),state=await ai.begin('fast',{useAI:false});
 assert.equal(calls,0);assert.deepEqual(state.models,{});assert.equal(state.cfg.planningPasses,0);assert.equal(state.settings.models.reasoning,'unused');ai.cancel();assert.throws(()=>ai.check(),/stopped/);
});

test('trained model capabilities are reused only for the same endpoint and actual weight digest',async t=>{
 let shows=0,digest='weights-a';const ai=createLocalAI(temp(t),{fetchImpl:async url=>{if(url.pathname==='/api/tags')return Response.json({models:[{name:'model',digest,size:1000}]});if(url.pathname==='/api/ps')return Response.json({models:[]});shows++;return Response.json({capabilities:['completion','vision']});}});
 assert.deepEqual((await ai.discover()).models[0].capabilities,['completion','vision']);await ai.discover();assert.equal(shows,1);
 digest='weights-b';await ai.discover();assert.equal(shows,2);await ai.discover({url:'http://127.0.0.1:11435'});assert.equal(shows,3);
});

test('audio validation limits process concurrency, coalesces aliases and retries failed fingerprints',async t=>{
 const folder=temp(t),media=Array.from({length:10},(_,i)=>{const file=path.join(folder,i+'.wav');fs.writeFileSync(file,'different'+i);return {id:'audio'+i,kind:'audio',path:file};});
 let active=0,max=0,calls=0;const run=async()=>{calls++;max=Math.max(max,++active);await new Promise(r=>setTimeout(r,10));active--;return 'SHA256='+('a'.repeat(64));};
 await prepareAudio({voiceId:media[0].id,media:[...media,{...media[0],id:'alias'}],soundEffects:[...media.map(m=>({mediaId:m.id})),{mediaId:'alias'}]},run);assert.equal(calls,10);assert.ok(max<=4);
 const file=path.join(folder,'retry.wav');fs.writeFileSync(file,'retry');const m={id:'retry',kind:'audio',path:file};let attempts=0;const flaky=async()=>{if(++attempts===1)throw Error('Transient');return 'SHA256='+('b'.repeat(64));};
 await assert.rejects(fingerprintAudio(m,flaky),/Transient/);assert.equal((await fingerprintAudio(m,flaky)).audioFingerprint,'b'.repeat(64));assert.equal(attempts,2);
 const broken=media.map((m,i)=>{const file=path.join(folder,'bad'+i+'.wav');fs.writeFileSync(file,'bad'+i);return {...m,path:file};});let started=0,running=0;
 await assert.rejects(prepareAudio({voiceId:broken[0].id,media:broken,soundEffects:broken.map(m=>({mediaId:m.id}))},async(_cmd,args)=>{started++;if(args[3].endsWith('bad0.wav'))throw Error('Bad audio');running++;await new Promise(r=>setTimeout(r,10));running--;return 'SHA256='+('c'.repeat(64));}),/Bad audio/);assert.ok(started<=4);assert.equal(running,0);
});

test('render payload omits editor snapshots and unused files without changing caption, animation or audio data',()=>{
 const p=fixture();p.revisionHistory=[{patches:[{after:'x'.repeat(100000)}]}];p.originalTranscript={segments:['x'.repeat(100000)]};p.scenes[0].performanceSourceLayers=structuredClone(p.scenes[0].layers);p.scenes[0].storyboard={big:'x'.repeat(10000)};p.media.push({id:'unused',path:'unused.png',kind:'image'});p.pokemonMentions=[{start:0,end:1,name:'Pikachu'}];p.naturePlan=[{sceneId:'s',name:'timid'}];const before=JSON.stringify(p),n=renderProject(p);
 assert.equal(JSON.stringify(p),before);assert.ok(JSON.stringify(n).length<before.length/20);assert.equal(n.revisionHistory,undefined);assert.equal(n.scenes[0].performanceSourceLayers,undefined);assert.deepEqual(n.scenes[0].layers,p.scenes[0].layers);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(n.pokemonMentions,p.pokemonMentions);assert.deepEqual(n.naturePlan,p.naturePlan);assert.equal(n.media.length,2);
});

test('AI review reuses one Chromium instance and metadata, renders each changed candidate and closes on failure',async t=>{
 let opens=0,closes=0,builds=0,selections=0;const captured=[],browser={close:async()=>{closes++;}};
 const renderer=createReviewRenderer({root:'unused',folder:temp(t),scale:.25,open:async(_,options)=>{assert.equal(options.forceDeviceScaleFactor,.25);opens++;return browser;},build:async()=>{builds++;return 'bundle';},select:async o=>{selections++;assert.equal(o.puppeteerInstance,browser);return {props:o.inputProps};},still:async o=>{assert.equal(o.puppeteerInstance,browser);assert.equal(o.composition.props.project,o.inputProps.project);captured.push(o.composition.props.project.scenes[0].layers[1].width);if(captured.length===3)throw Error('Render failed');}});
 const p=fixture();try{await renderer.render(p,30,'a');p.scenes[0].layers[1].width=.5;await renderer.render(p,31,'b');await assert.rejects(renderer.render(p,32,'c'),/Render failed/);}finally{await renderer.close();}
 assert.deepEqual(captured,[.7,.5,.5]);assert.equal(opens,1);assert.equal(builds,1);assert.equal(selections,1);assert.equal(closes,1);
});

test('media server handles suffix and open ranges, HEAD, empty files and missing files without process failures',async t=>{
 const folder=temp(t),file=path.join(folder,'media.webm');fs.writeFileSync(file,'0123456789');const empty=path.join(folder,'empty.wav');fs.writeFileSync(empty,'');
 const server=http.createServer((req,res)=>serveMedia(req,res,req.url==='/empty'?empty:req.url==='/missing'?path.join(folder,'gone.wav'):file));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const url='http://127.0.0.1:'+server.address().port;
 let r=await fetch(url,{headers:{Range:'bytes=-3'}});assert.equal(r.status,206);assert.equal(await r.text(),'789');assert.equal(r.headers.get('content-type'),'video/webm');
 r=await fetch(url,{headers:{Range:'bytes=2-'}});assert.equal(await r.text(),'23456789');
 r=await fetch(url,{headers:{Range:'bytes=99-'}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */10');
 r=await fetch(url,{method:'HEAD'});assert.equal(r.headers.get('content-length'),'10');assert.equal(await r.text(),'');
 assert.equal(await(await fetch(url+'/empty')).text(),'');assert.equal((await fetch(url+'/empty',{headers:{Range:'bytes=0-'}})).status,416);assert.equal((await fetch(url+'/missing')).status,404);
});
