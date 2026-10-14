import test from 'node:test';import assert from 'node:assert/strict';
import {compileRecipeBatch,applyCreativeActions,clearCreativeActions} from '../electron/creative-actions.mjs';
import {applyNarratedPictureCoverage,clearNarratedPictureCoverage} from '../electron/narrated-picture-coverage.mjs';
import {reviewStoryPlan} from '../electron/story-plan-review.mjs';
import {placementFor} from '../electron/layer-motion.mjs';
import {planQuickStory} from '../electron/quick-story-plan.mjs';
import {freshVisualDraft} from '../electron/fresh-project.mjs';
import {validateAnimationBeat} from '../electron/local-animator.mjs';
import {smoothSequence} from '../electron/shot-director.mjs';
import {atomicReplaceSync} from '../electron/atomic-replace.mjs';
import {suppressRepeatedStoryPictures} from '../electron/final-picture-layout.mjs';
import {visibleRanges} from '../electron/layer-visibility.mjs';
import {stageStoryPicture} from '../electron/story-picture-sequence.mjs';
import {moveContext} from '../electron/move-context.mjs';import {planNarratedActions} from '../electron/action-movie.mjs';import {identifyPokemon} from '../electron/pokemon-names.mjs';

const card={id:'card',name:'Dragon Dance',kind:'image',width:1000,height:400,assetRole:'move-card',moveCard:{name:'Dragon Dance',verified:true,description:'Raises the user Attack and Speed by one stage.'}};
const actor={id:'actor',name:'Tyranitar',kind:'pokemon',width:500,height:500,pokemon:{name:'tyranitar',displayName:'Tyranitar'}};
function fixture(){const text='Tyranitar uses Dragon Dance. Its Attack and Speed increase.',words=text.split(' ').map((text,i)=>({text,start:i*.5,end:i*.5+.45}));return {id:'new',voiceId:'voice',format:'vertical',duration:5,captionStyle:{bottom:.13,fontSize:48},captionColor:'#ffffff',media:[actor,card,{id:'voice',kind:'audio'}],gameSelection:'pokemon',shortMechanics:{cues:[{sceneId:'a',kind:'move',name:'dragon-dance',title:'Dragon Dance',damageClass:'status',start:1,wordIndex:2}]},scenes:[{id:'a',start:0,end:2,text:words.slice(0,4).map(w=>w.text).join(' '),words:words.slice(0,4),reaction:{entities:[{id:'tyranitar',name:'Tyranitar',type:'pokemon',mediaId:actor.id,start:0}]},layers:[lead('a',0,2)]},{id:'b',start:2,end:5,text:words.slice(4).map(w=>w.text).join(' '),words:words.slice(4),reaction:{entities:[]},layers:[lead('b',2,5)]}]};}
const lead=(id,start,end)=>({id:id+'-lead',type:'image',role:'subject',mediaId:'actor',start,end,x:.10,y:.25,width:.80,height:.46,z:20,animation:'none'});
const imageAction=p=>compileRecipeBatch(p.scenes[0],[{kind:'stage-image',wordIndex:2,quote:'Dragon Dance',duration:2.6,propQuery:'Dragon Dance published description',framing:'evidence'}]).actions;
const state=mode=>({mode,settings:{url:'http://localhost:11434'},models:{editing:{name:'trained'}},signal:new AbortController().signal,limitations:[]});
const response=scenes=>({ok:true,json:async()=>({model:'trained',message:{content:JSON.stringify({scenes})},prompt_eval_count:10,eval_count:10,load_duration:0})});
test('a move reveal finishes across sentences with one continuous performance and one entrance',()=>{
 const p=fixture();p.scenes[0].editorialPlan={creativeActions:imageAction(p)};p.creativePropAssets={'a/0/prop-0':'card'};
 const n=applyCreativeActions(p),first=n.scenes[0].layers.find(l=>l.mediaId==='card'),second=n.scenes[1].layers.find(l=>l.mediaId==='card');
 assert.equal(first.start,1);assert.equal(first.end,2);assert.equal(second.start,2);assert.equal(second.end,3.6);assert.equal(second.animationStart,1);assert.equal(second.silentEntrance,true);
 assert.equal(first.sourceMoveCard,true);assert.equal(second.sourceMoveCard,true);
 const a=placementFor(first,n.scenes[0].layers,n.media,1.999,1080,1920),b=placementFor(second,n.scenes[1].layers,n.media,2,1080,1920);assert.ok(Math.abs(a.motion.opacity-b.motion.opacity)<.001);assert.ok(Math.abs(a.motion.x-b.motion.x)<.001);assert.deepEqual(clearCreativeActions(n).scenes.map(s=>s.layers),p.scenes.map(s=>s.layers));
 assert.equal(n.creativeActionReport.events.length,1);assert.equal(n.creativeActionReport.sounds.length,1);assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.deepEqual(n.captionStyle,p.captionStyle);
});
test('no-motion still delivers source photos, and repeated composition does not accumulate them',()=>{
 const p=fixture();p.editingInstructions='No animations. Keep pictures static.';p.scenes[0].editorialPlan={creativeActions:imageAction(p)};p.creativePropAssets={'a/0/prop-0':'card'};
 const n=applyCreativeActions(p);assert.ok(n.scenes.every(s=>s.layers.some(l=>l.mediaId==='card')));assert.ok(n.scenes.flatMap(s=>s.layers.filter(l=>l.mediaId==='card')).every(l=>!l.keyframes&&l.animation==='none'));
 assert.deepEqual(applyCreativeActions(n).scenes.map(s=>s.layers),n.scenes.map(s=>s.layers));
});
test('resolved move evidence cannot vanish merely because it was mentioned at a sentence end',()=>{
 const p=fixture(),n=applyNarratedPictureCoverage(p);assert.equal(n.narratedPictureReport.missing.length,0);assert.equal(n.narratedPictureReport.recovered.length,1);assert.ok(n.scenes[1].layers.some(l=>l.mediaId==='card'&&l.end===3.6));assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));
});
test('source recovery composes repeatedly without resurrecting retired finishing layers',()=>{
 const p=fixture(),once=applyNarratedPictureCoverage(p),twice=applyNarratedPictureCoverage(once);assert.deepEqual(twice.scenes.map(s=>s.layers),once.scenes.map(s=>s.layers));assert.deepEqual(clearNarratedPictureCoverage(twice).scenes.map(s=>s.layers),p.scenes.map(s=>s.layers));assert.ok(!twice.scenes.some(s=>s.creativeActionSourceLayers));
});
test('a readable existing image is continued rather than duplicated at its speech cue',()=>{
 const p=fixture();p.scenes[0].layers.push({...lead('old',1,2),id:'old-card',mediaId:'card',role:'mechanic-card',x:.07,y:.05,width:.86,height:.20});const n=applyNarratedPictureCoverage(p);assert.equal(n.scenes[0].layers.filter(l=>l.mediaId==='card').length,1);assert.equal(n.scenes[1].layers.filter(l=>l.mediaId==='card').length,1);assert.equal(n.scenes[1].layers.find(l=>l.mediaId==='card').silentEntrance,true);
});
test('explicit image restrictions and manual deletions win over automatic recovery',()=>{
 for(const modify of [p=>p.editingInstructions='No additional images',p=>p.scenes[0].deletedLayerIds=['deleted'],p=>p.scenes[0].manualTemplate=true]){const p=fixture();modify(p);const n=applyNarratedPictureCoverage(p);assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>l.mediaId==='card'));}
});
test('missing source files are disclosed and no generated information card is substituted',()=>{
 const p=fixture();p.media=p.media.filter(m=>m.id!=='card');const n=applyNarratedPictureCoverage(p);assert.equal(n.narratedPictureReport.missing[0].name,'Dragon Dance');assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>l.setupGraphic));
});
test('the whole passage is reviewed: several identical early cues do not count as later coverage',()=>{
 const s={...fixture().scenes[0],start:0,end:8,words:Array.from({length:16},(_,i)=>({text:'word'+i,start:i*.5,end:i*.5+.4})),reaction:{entities:[]}};
 const issues=reviewStoryPlan(s,{imageBeats:[]},[{recipeKind:'stage-image',wordIndex:0,duration:1,props:[{framing:'side'}]},{recipeKind:'stage-image',wordIndex:1,duration:1,props:[{framing:'side'}]}]);assert.ok(issues.some(i=>i.end===8));
 assert.deepEqual(reviewStoryPlan({...s,end:4},{imageBeats:[]},[{recipeKind:'stage-image',wordIndex:0,duration:4,props:[{framing:'evidence'}]}]),[]);
});
test('ordinary scripts in every quality mode use the same complete story planner',async()=>{
 for(const mode of ['fast','balanced','high','ultra']){const p=fixture(),s=state(mode);let calls=0;const n=await planQuickStory(p,s,()=>{},async(_,options)=>{calls++;const input=JSON.parse(options.body),context=JSON.parse(input.messages.at(-1).content);return response(context.scenes.map(c=>({id:c.id,motion:'spring-pop',effect:'none',sound:'click',reason:'Demonstrate the narrated setup',subjects:[],ideas:['Show the actual source with the actor','Demonstrate the setup with the actor'],selectedIdea:0,recipes:[],imageBeats:[{wordIndex:0,query:c.id==='a'?'Tyranitar artwork':'Dragon Dance description',duration:3,framing:'evidence',reason:'Actual narration'}]})));});assert.equal(n.editorialReport.sharedStoryPlanner,true);assert.equal(n.editorialReport.quick,mode==='fast');assert.ok(n.editorialReport.scenes.length===2);assert.equal(calls,1);}
});
test('reusing narration clears coverage and performs a fresh authoring pass',()=>{
 const p=applyNarratedPictureCoverage(fixture());assert.ok(p.narratedPictureReport);const n=freshVisualDraft(p);assert.equal(n.narratedPictureReport,undefined);assert.ok(!n.scenes.flatMap(s=>s.layers||[]).some(l=>l.storyPictureOrigin));
});
test('finishing passes preserve complete authored performances instead of adding a competing zoom',()=>{
 for(const flag of ['actionMovie','actorPerformance','creativeAction','narrationEffect']){const p=fixture(),s=p.scenes[0],l=s.layers[0];l[flag]=true;l.keyframes=[{time:0,x:.1,scale:1},{time:1,x:.3,scale:1.1},{time:2,x:.1,scale:1}];
  assert.throws(()=>validateAnimationBeat(s,{sceneId:'a',moments:[{targetId:l.id,action:'drift',quote:'',duration:1,intensity:.04,direction:'left'}]}),/already performed/);assert.deepEqual(smoothSequence(p).scenes[0].layers[0],l);
 }
});
test('a sparse model response is repaired using its missing passage, not accepted as a finished edit',async()=>{
 const p=fixture();p.scenes=p.scenes.slice(1);p.scenes[0].start=0;p.scenes[0].end=5;p.scenes[0].words=Array.from({length:10},(_,i)=>({text:'word'+i,start:i*.5,end:i*.5+.45}));p.scenes[0].text=p.scenes[0].words.map(w=>w.text).join(' ');let calls=0;
 const n=await planQuickStory(p,state('balanced'),()=>{},async()=>{calls++;return response([{id:'b',motion:'none',effect:'none',sound:'click',reason:'Current story',subjects:[],ideas:['Show the narrated evidence','Animate the narrated explanation'],selectedIdea:0,recipes:[],imageBeats:(calls===1?[0]:[0,4,8]).map((wordIndex,i)=>({wordIndex,query:'specific source picture '+i,duration:1.8,framing:'side',reason:'Illustrate this phrase'}))}]);});
 assert.equal(calls,2);assert.equal(n.editorialReport.repairs[0].accepted,true);assert.equal(n.creativePlanningReport.decisions[0].pictures,3);
});
test('temporary Windows file locks retry the same atomic commit without deleting the last good database',()=>{
 const calls=[],delays=[];let attempts=0;atomicReplaceSync('new-database','last-good-database',{platform:'win32',pause:ms=>delays.push(ms),rename:(a,b)=>{calls.push([a,b]);if(++attempts<3)throw Object.assign(Error('Scanner lock'),{code:'EPERM'});}});
 assert.deepEqual(calls,[['new-database','last-good-database'],['new-database','last-good-database'],['new-database','last-good-database']]);assert.deepEqual(delays,[25,50]);
});
test('permanent or unrelated storage errors are surfaced instead of reported as a successful commit',()=>{
 const missing=Object.assign(Error('No source'),{code:'ENOENT'});let calls=0;assert.throws(()=>atomicReplaceSync('new','old',{platform:'win32',pause:()=>assert.fail('No retry for missing input'),rename:()=>{calls++;throw missing;}}),e=>e===missing);assert.equal(calls,1);
 const lock=Object.assign(Error('Persistent lock'),{code:'EBUSY'});let waited=0;assert.throws(()=>atomicReplaceSync('new','old',{platform:'win32',pause:ms=>waited+=ms,rename:()=>{throw lock;}}),e=>e===lock);assert.ok(waited<1000);
});
test('a charging move that raises the user stats does not attack an earlier teammate',()=>{
 const text='Pelipper sets rain. Archaludon uses Electro Shot to raise its Special Attack before releasing electricity.',words=text.split(' ').map((text,i)=>({text,start:i*.4,end:i*.4+.35})),index=words.findIndex(w=>w.text==='Electro'),duration=words.at(-1).end;
 const p={format:'vertical',duration,media:[{id:'pelipper',kind:'pokemon',pokemon:{name:'pelipper'}},{id:'archaludon',kind:'pokemon',pokemon:{name:'archaludon'}}],scenes:[{id:'s',start:0,end:duration,text,words,layers:[]}],pokemonMentions:identifyPokemon(words,undefined,{pokemonContext:true}).map(m=>({...m,mediaId:m.name,status:'ready'}))};
 const c={sceneId:'s',start:words[index].start,name:'electro-shot',title:'Electro Shot',kind:'move',damageClass:'special',type:'electric',wordCount:2};p.shortMechanics={cues:[c]};
 const intent=moveContext(p,c);assert.equal(intent.hasPair,false);assert.equal(intent.defenderId,undefined);assert.equal(intent.showCard,true);assert.equal(intent.showLearners,false);assert.deepEqual(planNarratedActions(p),[]);
});
test('a sourced story insert does not leave an automatic duplicate of the same Pokemon or mechanic visible',()=>{
 const p=fixture(),s=p.scenes[0];s.layers.push({...s.layers[0],id:'planned-photo',storyPictureOrigin:'new-story-picture',role:'creative-stage-prop',start:.5,end:1.5});
 const n=suppressRepeatedStoryPictures(p);assert.deepEqual(visibleRanges(n.scenes[0].layers[1],.5,1.5,n.scenes[0].layers),[]);assert.equal(visibleRanges(n.scenes[0].layers[0],.5,1.5,n.scenes[0].layers).length,1);assert.deepEqual(p.scenes[0].layers[0].excludedRanges,undefined);
 const battle=fixture();battle.scenes[0].layers.push({...battle.scenes[0].layers[0],id:'opponent',actionMovie:true});assert.equal(suppressRepeatedStoryPictures(battle).scenes[0].layers.filter(l=>!l.excludedRanges).length,2);
 const manual=fixture();manual.scenes[0].layers[0].manual=true;manual.scenes[0].layers.push({...manual.scenes[0].layers[0],id:'insert',manual:false,storyPictureOrigin:'new-picture'});const protectedResult=suppressRepeatedStoryPictures(manual);assert.equal(protectedResult.scenes[0].layers[0].excludedRanges,undefined);assert.deepEqual(visibleRanges(protectedResult.scenes[0].layers[1],0,2,protectedResult.scenes[0].layers),[]);
});
test('a planned picture of an existing actor emphasizes that actor without duplicating or moving its established composition',()=>{
 const p=fixture(),before={x:p.scenes[0].layers[0].x,y:p.scenes[0].layers[0].y},delivered=stageStoryPicture(p,{id:'fresh-picture',media:actor,prop:{framing:'focus'},start:.2,end:1.8});
 assert.ok(delivered[0].reusedActor);assert.equal(p.scenes[0].layers.length,1);assert.equal(p.scenes[0].layers[0].excludedRanges,undefined);assert.deepEqual({x:p.scenes[0].layers[0].x,y:p.scenes[0].layers[0].y},before);assert.ok(p.scenes[0].layers[0].keyframes.length>0);
 stageStoryPicture(p,{id:'another-cue',media:actor,prop:{framing:'focus'},start:.2,end:1.8});assert.ok(p.scenes[0].layers[0].keyframes.every((k,i,a)=>!i||k.time>a[i-1].time));
});
