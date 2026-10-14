import test from 'node:test';import assert from 'node:assert/strict';
import {quickPatch,patchSubset,patchRange} from '../electron/quick-patch.mjs';
import {undoRedo} from '../electron/revisions.mjs';
import {propertyAt} from '../electron/layer-motion.mjs';
import {gameProfile,selectedGame,sceneGame,sceneGameAt,gameSegments} from '../electron/game-selection.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {applyPerformances,planPerformances,clearPerformances} from '../electron/actor-performances.mjs';
import {validateEditorialPlan} from '../electron/editorial-planner.mjs';
import {effectVolumeAt} from '../electron/audio-routing.mjs';
import {applyReferenceProps} from '../electron/reference-props.mjs';import {bundledNarrationArt} from '../electron/narration-props.mjs';
const visible=(layers,t)=>layers.filter(l=>t>=l.start&&t<l.end&&!(l.excludedRanges||[]).some(r=>t>=r.start&&t<r.end));
function fixture(){const layers=[{id:'lead',type:'image',role:'subject',mediaId:'mon',x:.15,y:.2,width:.7,height:.48,z:20,start:0,end:8,animation:'smooth-zoom',keyframes:[{time:0,x:.15},{time:8,x:.2}]},{id:'item',type:'image',role:'item',mediaId:'hat',x:0,y:0,width:.15,height:.1,z:30,start:0,end:8,attachment:{targetId:'lead',anchor:'head',x:.5,y:.1,size:.2}}];return {id:'p',name:'test',format:'vertical',duration:16,voiceId:'voice',captionColor:'#eeeeee',captionStyle:{fontSize:53,bottom:.19},musicVolume:.1,gameSelection:'pokemon',media:[{id:'voice',kind:'audio',duration:16},{id:'mon',kind:'image',license:'source',identity:{franchise:'pokemon'}},{id:'hat',kind:'image',license:'source'},{id:'click',kind:'audio',duration:1,license:'source',assetRole:'sound-effect'}],scenes:[{id:'s1',start:0,end:8,text:'Sceptile looks ridiculous but it worked.',title:'Sceptile',words:['Sceptile','looks','ridiculous','but','it','worked.'].map((text,i)=>({text,start:i,end:i+.75})),layers},{id:'s2',start:8,end:16,text:'Then this Pokemon wins.',title:'End',words:[],layers:[]}],soundEffects:[{mediaId:'click',auto:true,start:1,end:2,volume:.1},{mediaId:'click',auto:true,start:2.9,end:3.8,volume:.1},{mediaId:'click',auto:true,start:4.7,end:5.7,volume:.1},{mediaId:'click',start:3,end:4,volume:.13}]};}
test('time-range patch preserves actual outside motion, narration, captions, audio boundaries and Undo/Redo',async()=>{
 const p=fixture(),input=structuredClone(p),stages=[];let observed;
 const next=await quickPatch(p,'Make the Pokemon smaller',{timeRange:{start:3,end:5}},{progress:e=>stages.push(e),edit:async sub=>{observed=structuredClone(sub);sub.scenes[0].layers.find(l=>l.id==='lead').width=.4;return sub;}});
 assert.deepEqual(p,input);assert.equal(observed.scenes.length,1);assert.equal(observed.scenes[0].start,3);assert.equal(observed.scenes[0].end,5);
 assert.deepEqual(next.scenes[1],p.scenes[1]);assert.deepEqual(next.scenes[0].words,p.scenes[0].words);assert.deepEqual(next.captionStyle,p.captionStyle);
 for(const t of [0,2.999,5,7.9])assert.deepEqual(visible(next.scenes[0].layers,t).map(l=>[l.id,l.width,propertyAt(l,'x',t)]),visible(p.scenes[0].layers,t).map(l=>[l.id,l.width,propertyAt(l,'x',t)]));
 const inside=visible(next.scenes[0].layers,4),actor=inside.find(l=>l.role==='subject'),item=inside.find(l=>l.role==='item');assert.equal(actor.width,.4);assert.equal(item.attachment.targetId,actor.id);assert.equal(inside.length,2);
 assert.ok(next.soundEffects.some(f=>f.start===4.7&&f.end===5.7),'Cross-boundary tail retained');assert.ok(next.soundEffects.some(f=>!f.auto&&f.start===3));assert.equal(stages.at(-1).percent,100);
 const restored=undoRedo(next,'undo');assert.deepEqual(restored.scenes,p.scenes);assert.deepEqual(undoRedo(restored,'redo').scenes,next.scenes);
});
test('range validation and failed scoped model cannot change original narration',async()=>{
 const p=fixture(),input=structuredClone(p);assert.throws(()=>patchRange(p,{timeRange:{start:5,end:2}}));assert.throws(()=>patchRange(p,{timeRange:{start:0,end:99}}));
 await assert.rejects(quickPatch(p,'Do something',{sceneId:'s1'},{edit:async sub=>{sub.scenes[0].words[0].text='wrong';return sub;}}),/narration/);assert.deepEqual(p,input);
 await assert.rejects(quickPatch(p,'nothing',{sceneId:'s1'},{edit:async sub=>sub}),/did not change/);
});
test('a second overlapping patch does not resurrect the first patch or create duplicate layers',async()=>{
 let p=fixture();const edit=width=>async sub=>{for(const l of sub.scenes[0].layers)if(l.role==='subject')l.width=width;return sub;};
 p=await quickPatch(p,'smaller',{timeRange:{start:2,end:6}},{edit:edit(.5)});p=await quickPatch(p,'smaller again',{timeRange:{start:3,end:4}},{edit:edit(.3)});
 assert.equal(visible(p.scenes[0].layers,3.5).filter(l=>l.role==='subject').length,1);assert.equal(visible(p.scenes[0].layers,3.5).find(l=>l.role==='subject').width,.3);assert.equal(visible(p.scenes[0].layers,4.5).find(l=>l.role==='subject').width,.5);assert.equal(visible(p.scenes[0].layers,7).find(l=>l.role==='subject').width,.7);
});
test('Auto, manual game and Multiple games choose scene palettes without imposing Pokemon presets',()=>{
 const p=fixture();p.gameSelection='auto';p.scenes[0].text='Pokemon';p.scenes[1].text='Minecraft';assert.equal(selectedGame(p),'multiple');
 let mixed=gameProfile({...p,shortStyle:'pokemon-dense'},'multiple');assert.equal(mixed.shortStyle,undefined);assert.equal(sceneGame(mixed,mixed.scenes[0]),'pokemon');assert.equal(sceneGame(mixed,mixed.scenes[1]),'minecraft');
 const manual=gameProfile(p,'fortnite');assert.equal(selectedGame(manual),'fortnite');assert.equal(sceneGame(manual,p.scenes[0]),'fortnite');assert.throws(()=>gameProfile(p,'imaginary-option'));
 const minecraft=gameProfile({...p,scenes:[p.scenes[1]],shortStyle:'pokemon-dense'},'auto');assert.equal(selectedGame(minecraft),'minecraft');assert.equal(minecraft.shortStyle,undefined);
});
test('mixed-game cue selection uses local game sounds at the actual event time',()=>{
 const p=fixture();p.gameSelection='multiple';p.scenes[0].text='Pokemon';p.scenes[0].layers=[];p.scenes[0].words=[{text:'click',start:1,end:1.5}];p.scenes[1].text='Minecraft';p.scenes[1].words=[{text:'click',start:9,end:9.5}];p.soundEffects=[];
 const library=['pokemon','minecraft'].map(game=>({id:game,kind:'audio',assetRole:'sound-effect',name:game+' menu click',tags:'menu click',license:'source',duration:.2,identity:{franchise:game}}));
 const next=automaticSounds(p,library);assert.equal(next.soundEffects.find(f=>f.start===1).mediaId,'pokemon');assert.equal(next.soundEffects.find(f=>f.start===9).mediaId,'minecraft');
});
test('multiple games can switch theme and sound palette at a spoken game cue inside one scene',()=>{
 const p=fixture();p.gameSelection='multiple';p.scenes[0].text='Pokemon then Minecraft';p.scenes[0].words=[{text:'Pokemon',start:0,end:.5},{text:'then',start:2,end:2.5},{text:'Minecraft',start:3,end:3.5}];
 assert.equal(sceneGameAt(p,p.scenes[0],2),'pokemon');assert.equal(sceneGameAt(p,p.scenes[0],4),'minecraft');assert.deepEqual(gameSegments(p,p.scenes[0]).map(s=>[s.start,s.game]),[[0,'pokemon'],[3,'minecraft']]);
});
test('comic performances follow multiword setup and payoff, preserve actor props and captions, and respect evidence',()=>{
 const p=fixture();p.scenes[0].text='Sceptile looks ridiculous but it worked.';assert.deepEqual(planPerformances(p).map(e=>[e.kind,e.start]),[['doubt',2],['payoff',5]]);
 const next=applyPerformances(p);assert.equal(next.performanceReport.events.length,2);assert.deepEqual(next.scenes[0].words,p.scenes[0].words);assert.deepEqual(next.captionStyle,p.captionStyle);
 const active=visible(next.scenes[0].layers,2.3);assert.equal(active.filter(l=>l.role==='subject').length,1);assert.equal(active.find(l=>l.role==='item').attachment.targetId,active.find(l=>l.role==='subject').id);assert.ok(active.find(l=>l.role==='subject').keyframes.some(k=>k.rotation!==0));
 assert.deepEqual(applyPerformances(next),next);assert.equal(visible(next.scenes[0].layers,7).find(l=>l.role==='subject').id,'lead');
 const evidence=structuredClone(p);evidence.scenes[0].layers.push({...p.scenes[0].layers[0],id:'proof',role:'gameplay'});assert.equal(applyPerformances(evidence).performanceReport.events.length,0);
 assert.equal(planPerformances({...p,editingInstructions:'No humor'}).length,0);assert.equal(planPerformances({...p,gameSelection:'minecraft'}).length,0);
});
test('trained comic proposals require exact word cues and an established actor',()=>{
 const scene=fixture().scenes[0];scene.reaction={metrics:[],entities:[{id:'sceptile',mediaId:'mon',type:'pokemon'}]};const plan={chart:'none',metricIndexes:[],motion:'none',effect:'none',sound:'none',visualQueries:[],performances:[{kind:'doubt',wordIndex:1,quote:'looks ridiculous',actorId:'mon',reason:'Narrated uncertainty'}]};
 assert.equal(validateEditorialPlan(scene,plan).performances.length,1);assert.throws(()=>validateEditorialPlan(scene,{...plan,performances:[{...plan.performances[0],wordIndex:4}]}),/cue/);assert.throws(()=>validateEditorialPlan(scene,{...plan,performances:[{...plan.performances[0],actorId:'unspoken-character'}]}),/cue/);
});
test('patch SFX volume applies to crossing manual and automatic audio only inside the selected interval',async()=>{
 const p=fixture();const n=await quickPatch(p,'Mute SFX',{timeRange:{start:3.2,end:3.6}},{edit:async sub=>({...sub,patchAudioOnly:true,soundEffects:sub.soundEffects.map(f=>({...f,volume:0}))})});
 for(const effect of n.soundEffects.filter(f=>f.start===3||f.start===2.9)){assert.equal(effectVolumeAt(effect,3.1),effect.volume);assert.equal(effectVolumeAt(effect,3.4),0);assert.equal(effectVolumeAt(effect,3.7),effect.volume);}
 assert.deepEqual(n.scenes[1],p.scenes[1]);assert.deepEqual(undoRedo(n,'undo').soundEffects,p.soundEffects);
});
test('sourced phone holds the game logo at the spoken device cue without duplicating it or changing captions',()=>{
 const p=fixture();p.media.push(...bundledNarrationArt(),{id:'logo',kind:'image',assetRole:'logo',identity:{franchise:'pokemon'},license:'source'});p.scenes[0].layers=[{...p.scenes[0].layers[0],id:'logo-original',role:'game-logo',mediaId:'logo',x:.25,y:.2,width:.5,height:.2}];p.scenes[0].words=[{text:'Pokemon',start:0,end:.3},{text:'on',start:.3,end:.6},{text:'mobile',start:1,end:1.3},{text:'devices.',start:1.3,end:1.6}];
 const n=applyReferenceProps(p),layers=visible(n.scenes[0].layers,1.5);assert.ok(layers.some(l=>l.mediaId==='narration-art-phone-v2'));assert.equal(layers.filter(l=>l.mediaId==='logo').length,1);assert.ok(layers.find(l=>l.mediaId==='logo').attachment);assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(applyReferenceProps(n),n);
});
test('a manual edit to a performed actor survives cleanup without resurrecting its original duplicate',()=>{
 const p=applyPerformances(fixture()),actor=p.scenes[0].layers.find(l=>l.actorPerformance&&l.role==='subject');actor.width=.45;actor.manualFraming=true;
 const cleared=clearPerformances(p),active=visible(cleared.scenes[0].layers,2.2).filter(l=>l.role==='subject');assert.equal(active.length,1);assert.equal(active[0].width,.45);
});
test('resizing a video in a patch advances its source time instead of restarting footage at the patch',async()=>{
 const p=fixture();p.media.push({id:'footage',kind:'video',duration:30});p.scenes[0].layers=[{...p.scenes[0].layers[0],type:'video',role:'gameplay',mediaId:'footage',videoStart:10,videoEnd:18}];
 const n=await quickPatch(p,'Resize gameplay',{timeRange:{start:3,end:5}},{edit:async sub=>{sub.scenes[0].layers[0].width=.5;return sub;}});
 assert.equal(visible(n.scenes[0].layers,4)[0].videoStart,10);assert.equal(visible(n.scenes[0].layers,4)[0].mediaOffset,3);assert.equal(visible(n.scenes[0].layers,6)[0].videoStart,10);
});
