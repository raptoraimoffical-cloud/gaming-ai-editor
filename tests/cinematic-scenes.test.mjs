import test from 'node:test';import assert from 'node:assert/strict';
import {applyCinematicScenes,clearCinematicScenes,cinematicDepth,cameraAt,cinematicTransform,activationAt,shutterBlur,cinematicStageAt,spliceCinematicStage} from '../electron/cinematic-scenes.mjs';
import {acquireCinematicEnvironments} from '../electron/cinematic-assets.mjs';
import {freshVisualDraft} from '../electron/fresh-project.mjs';
import {renderProject} from '../electron/render-project.mjs';
import {manualEdit} from '../electron/manual-editor.mjs';
import {undoRedo} from '../electron/revisions.mjs';
import {quickPatch} from '../electron/quick-patch.mjs';
import {preserveQuickPatches} from '../electron/saved-patches.mjs';
import {combatAttacker} from '../electron/combat-motion.mjs';

const actor=(id,start=0,end=8)=>({id,type:'image',role:'subject',mediaId:id,x:id==='a'?.06:.55,y:.28,width:.38,height:.35,z:30,start,end,animation:'none',exit:'none',fit:'contain'});
function fixture(){return {id:'p',name:'Cinematic fixture',duration:8,format:'vertical',gameSelection:'pokemon',voiceId:'voice',captionColor:'#fff',musicVolume:.08,captionStyle:{fontSize:53,bottom:.15,style:'outlined-phrase'},media:[{id:'voice',kind:'audio',duration:8},...['a','b','helmet','card'].map(id=>({id,kind:'image',width:300,height:300,path:id+'.png'}))],scenes:[{id:'s',start:0,end:8,text:'Rain falls then wind blows.',words:[{text:'Rain',start:1.5,end:2},{text:'falls',start:2,end:2.3},{text:'then',start:4,end:4.2},{text:'wind',start:4.2,end:4.5},{text:'blows.',start:4.5,end:5}],layers:[actor('a'),actor('b'),{id:'bg',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:8,color:'#142638',animation:'none'}, {id:'helmet',type:'image',role:'item',mediaId:'helmet',autoItem:true,manual:true,attachment:{targetId:'a',anchor:'head',x:.5,y:.2,size:.3},x:.5,y:.2,width:.1,height:.1,z:40,start:2,end:7,animation:'fade',exit:'none'}, {id:'card',type:'image',role:'mechanic-card',mediaId:'card',x:.12,y:.06,width:.76,height:.15,z:71,start:0,end:8,animation:'none',exit:'none'}]}],actionMovieReport:{plans:[{start:2,end:4,duration:2,attackerIds:['a'],defenderId:'b',outcome:'normal',color:'#fa8'}]}};}
const captions=p=>JSON.stringify([p.voiceId,p.duration,p.captionStyle,p.captionColor,p.scenes.map(s=>s.words)]);

test('cinematic finish derives synchronized camera, weather and real-icon activation without rewriting speech or captions',()=>{
 const p=fixture(),before=captions(p),n=applyCinematicScenes(p);assert.equal(captions(n),before);assert.equal(p.scenes[0].cinematicStage,undefined);assert.equal(n.cinematicReport.cameraBeats,1);assert.equal(n.cinematicReport.activations,1);
 assert.deepEqual(n.scenes[0].cinematicStage.weather.map(w=>[w.kind,w.start,w.end]),[['rain',1.5,4.2],['wind',4.2,8]]);assert.equal(n.scenes[0].cinematicStage.camera[0].contact,2+2*.46);assert.deepEqual(applyCinematicScenes(n),n);
});
test('fighters, projectiles, grounded shadows and attachments share the world; published evidence and manual framing stay steady',()=>{
 const p=fixture(),s=p.scenes[0];assert.equal(cinematicDepth(s.layers[0],s.layers),1);assert.equal(cinematicDepth(s.layers[3],s.layers),1);assert.equal(cinematicDepth(s.layers[4],s.layers),0);
 assert.equal(cinematicDepth({battleEffect:'impact'},s.layers),1);assert.equal(cinematicDepth({role:'editorial-depth',attachment:{targetId:'a'}},s.layers),1);assert.equal(cinematicDepth({role:'background'},s.layers),.22);assert.equal(cinematicDepth({...s.layers[0],manual:true},s.layers),0);
 assert.equal(cinematicDepth({id:'manual-hat',role:'item',manual:true,attachment:{targetId:'a'}},s.layers),1);
});
test('camera settles at action boundaries, tracks current artwork, flashes only at contact and ignores stale targets',()=>{
 const p=applyCinematicScenes(fixture()),s=p.scenes[0],e=s.cinematicStage.camera[0];assert.equal(cameraAt(s,p,e.start).scale,1);assert.equal(cameraAt(s,p,e.end).scale,1);assert.equal(cameraAt(s,p,e.contact-.2).light,0);assert.ok(cameraAt(s,p,e.contact).light>.2);
 for(let t=e.start;t<e.end;t+=.01){const c=cameraAt(s,p,t);assert.ok(c.scale<=1.045);assert.ok(Math.abs(c.x)<=.021);assert.ok(Math.abs(c.y)<=.014);assert.ok(Number.isFinite(c.rotation));}
 const c=cameraAt(s,p,3);assert.notEqual(cinematicTransform(c,1,1080,1920),cinematicTransform(c,.22,1080,1920));s.layers=s.layers.filter(l=>!['a','b'].includes(l.mediaId));assert.equal(cameraAt(s,p,e.contact).scale,1);
});
test('source icons have a short eased activation and return exactly to their attachment without accumulating offsets',()=>{
 const p=applyCinematicScenes(fixture()),item=p.scenes[0].layers.find(l=>l.id==='helmet'),a=activationAt(item,2),mid=activationAt(item,2.25),end=activationAt(item,2.6);assert.ok(a.scale<1&&a.rotation<0&&a.y<0);assert.ok(mid.glow>0);assert.deepEqual(end,{x:0,y:0,rotation:0,scale:1,glow:0});assert.equal(item.attachment.targetId,'a');assert.equal(item.keyframes,undefined);
});
test('weather does not trigger on negated narration, ordinary move damage does not invent weather',()=>{
 const p=fixture();p.scenes[0].words=[{text:'No',start:0,end:.2},{text:'rain',start:.2,end:.5},{text:'Flamethrower',start:2,end:2.5}];const n=applyCinematicScenes(p);assert.deepEqual(n.scenes[0].cinematicStage.weather,[]);
});
test('same-cast sentences match cut; new casts settle the camera and get one coordinated whoosh',()=>{
 const p=fixture();p.scenes.push({...structuredClone(p.scenes[0]),id:'next',start:8,end:10,words:[],layers:[actor('a',8,10)],autoTransition:true,transition:'crossfade'});p.duration=10;
 let n=applyCinematicScenes(p);assert.equal(n.scenes[1].transition,undefined);assert.equal(n.scenes[1].cinematicStage.transition,undefined);assert.equal(n.transitionSoundPlan.length,0);
 p.scenes[1].layers[0].mediaId='new';n=applyCinematicScenes(p);assert.equal(n.scenes[1].cinematicStage.transition,'settle');assert.equal(n.transitionSoundPlan[0].start,8);assert.equal(cameraAt(n.scenes[1],n,8.38).scale,1);
});
test('fast actor motion gets bounded directional shutter blur; evidence and idle art do not',()=>{
 const l={...actor('a'),role:'narrated-action',actionMovie:true,easing:'smooth',keyframes:combatAttacker({start:0,duration:2,x:.06,y:.28,physical:true,contactX:.35})};
 const moving=shutterBlur(l,[l],[],.8,1080,1920);assert.ok(moving.x>0);assert.ok(moving.x<=2.8);assert.deepEqual(shutterBlur({...l,role:'mechanic-card'},[l],[],.8,1080,1920),{x:0,y:0});assert.deepEqual(shutterBlur({...l,actionMovie:false},[l],[],.8,1080,1920),{x:0,y:0});
});
test('cinematic additions can be deleted, manually edited or disabled and Undo restores the delivered scene',()=>{
 const p=applyCinematicScenes(fixture()),id='s-cinematic-depth';const removed=manualEdit(p,{type:'delete',sceneId:'s',layerId:id});assert.ok(!applyCinematicScenes(removed).scenes[0].layers.some(l=>l.id===id));
 const edited=manualEdit(p,{type:'properties',sceneId:'s',layerId:id,values:{opacity:.3}});assert.equal(applyCinematicScenes(edited).scenes[0].layers.find(l=>l.id===id).opacity,.3);
 const disabled=manualEdit(p,{type:'cinematic',enabled:false});assert.equal(cameraAt(disabled.scenes[0],disabled,2.92).scale,1);assert.deepEqual(undoRedo(disabled,'undo').scenes,p.scenes);assert.deepEqual(clearCinematicScenes(p).scenes[0].layers,fixture().scenes[0].layers);
});
test('fresh versions discard cinematic timeline and scene decisions; render payload keeps executable staging only',()=>{
 const p=applyCinematicScenes({...fixture(),cinematicEnvironmentPlan:{s:'old'},cinematicAssetReport:{acquired:['old']}}),fresh=freshVisualDraft(p);assert.equal(fresh.cinematicEnvironmentPlan,undefined);assert.equal(fresh.cinematicReport,undefined);assert.equal(fresh.scenes[0].cinematicStage,undefined);
 const rendered=renderProject(p);assert.deepEqual(rendered.scenes[0].cinematicStage,p.scenes[0].cinematicStage);assert.equal(rendered.cinematicReport,undefined);assert.equal(rendered.cinematicAssetReport,undefined);
});
test('source scenery uses existing Google originals, rejects unsuitable bytes, preserves source attribution and leaves custom backgrounds alone',async()=>{
 const p=fixture(),calls=[],source={id:'arena',name:'Pokemon empty battle arena background',kind:'image',path:'arena.jpg',decoded:true,width:1200,height:800,transparent:false,webAssessment:{accepted:true},attribution:{source:'https://example.com/arena'},originalUrl:'https://example.com/arena.jpg'};
 const options={keys:{'google-images':'test-key'},search:async(q,provider,key,o)=>{calls.push({q,provider,o});return [{id:'bad',webAssessment:{accepted:true}},{id:'arena',webAssessment:{accepted:true}}];},download:async c=>c.id==='bad'?{...source,decoded:false}:source,register:m=>m};
 const n=await acquireCinematicEnvironments(p,options);assert.equal(calls[0].provider,'google-images');assert.equal(calls[0].o.purpose,'background');assert.equal(n.cinematicEnvironmentPlan.s,'arena');assert.equal(n.media.at(-1).attribution.source,source.attribution.source);assert.ok(applyCinematicScenes(n).scenes[0].layers.some(l=>l.id==='s-cinematic-environment'));
 calls.length=0;const custom=await acquireCinematicEnvironments({...p,creationAssets:{backgroundMode:'upload'}},options);assert.equal(calls.length,0);assert.deepEqual(custom.cinematicEnvironmentPlan,{});
 const offline=await acquireCinematicEnvironments(p,{library:n.media});assert.equal(offline.cinematicEnvironmentPlan.s,'arena');
});
test('visual review rejects a scenery candidate rather than publishing its stage',async()=>{
 const n=await acquireCinematicEnvironments(fixture(),{keys:{'google-images':'test'},search:async()=>[{webAssessment:{accepted:true}}],download:async()=>({kind:'image',decoded:true,width:1000,height:800,transparent:false,webAssessment:{accepted:true}}),verify:async()=>({accepted:false})});assert.deepEqual(n.cinematicEnvironmentPlan,{});assert.ok(n.cinematicAssetReport.warnings.length);
});
test('camera windows splice locally with absolute phase clocks and retain untouched shots',()=>{
 const p=applyCinematicScenes(fixture()),base=p.scenes[0].cinematicStage,patch={version:1,camera:[],weather:[{kind:'snow',start:3,end:4}],ambient:true};const stage=spliceCinematicStage(base,patch,3,4);
 assert.deepEqual(cinematicStageAt({cinematicStage:stage},2).camera,base.camera);assert.deepEqual(cinematicStageAt({cinematicStage:stage},2).weather,base.weather);assert.equal(cinematicStageAt({cinematicStage:stage},3.5).weather[0].kind,'snow');assert.deepEqual(cinematicStageAt({cinematicStage:stage},4.5),stage);
 const next=spliceCinematicStage(stage,{...patch,weather:[]},3.3,3.7);assert.equal(cinematicStageAt({cinematicStage:next},3.2).weather[0].kind,'snow');assert.equal(cinematicStageAt({cinematicStage:next},3.5).weather.length,0);assert.equal(cinematicStageAt({cinematicStage:next},3.8).weather[0].kind,'snow');
});
test('quick patch updates the camera/weather inside its range; later preserved patches retain world affinity',async()=>{
 const p=applyCinematicScenes(fixture()),n=await quickPatch(p,'change weather',{timeRange:{start:3,end:4}},{edit:async sub=>{sub.scenes[0].cinematicStage={version:1,camera:[],weather:[{kind:'snow',start:3,end:4}],ambient:true};sub.scenes[0].layers[0].x=.15;return sub;}});
 assert.equal(cameraAt(n.scenes[0],n,2.5).scale,cameraAt(p.scenes[0],p,2.5).scale);assert.equal(cameraAt(n.scenes[0],n,3.5).scale,1);assert.deepEqual(cinematicStageAt(n.scenes[0],4.5).camera,p.scenes[0].cinematicStage.camera);
 const preserved=preserveQuickPatches(n,p);assert.equal(cinematicStageAt(preserved.scenes[0],3.5).weather[0].kind,'snow');assert.ok(preserved.scenes[0].layers.some(l=>l.id.includes('-saved-patch-')&&l.cinematicDepthOverride===1));
});
test('motion opt-outs, manual templates and actual gameplay receive no automatic cinematic stage',()=>{
 for(const modify of [p=>p.editingInstructions='No animations',p=>p.cinematicMotion=false,p=>p.freezePokemonMotion=true,p=>p.scenes[0].manualTemplate=true,p=>p.scenes[0].layers.push({...actor('clip'),role:'gameplay'})]){const p=fixture();modify(p);assert.equal(applyCinematicScenes(p).scenes[0].cinematicStage,undefined);}
});
test('an existing animated source weather layer keeps its identity through stage and patch timing',()=>{
 const p=fixture();p.media.push({id:'source-rain',kind:'image',path:'rain.gif',animationInfo:{animated:true},identity:{subject:'rain'}});p.scenes[0].layers.push({id:'rain-original',type:'image',role:'ambient-source',mediaId:'source-rain',start:1.5,end:4,x:0,y:0,width:1,height:1,z:5});
 const n=applyCinematicScenes(p),w=n.scenes[0].cinematicStage.weather[0];assert.equal(w.sourceLayerId,'rain-original');assert.equal(w.sourceMediaId,'source-rain');assert.equal(w.sourceEnd,4);assert.equal(w.start,1.5);
});
test('opaque gameplay screenshots cannot pass the empty-scenery fallback without visual review',async()=>{
 const p=fixture(),options={keys:{'google-images':'test'},search:async()=>[{name:'Pokemon battle arena screenshot',webAssessment:{accepted:true}}],download:async()=>({id:'busy',kind:'image',name:'Pokemon battle arena screenshot',decoded:true,width:1200,height:800,transparent:false,webAssessment:{accepted:true}})};
 assert.deepEqual((await acquireCinematicEnvironments(p,options)).cinematicEnvironmentPlan,{});assert.equal((await acquireCinematicEnvironments(p,{...options,verify:async()=>({accepted:true})})).cinematicEnvironmentPlan.s,'busy');
});
