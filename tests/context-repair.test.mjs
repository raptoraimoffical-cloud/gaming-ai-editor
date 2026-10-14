import test from 'node:test';import assert from 'node:assert/strict';
import {moveContext} from '../electron/move-context.mjs';
import {applyExplanationCast,acquireMoveCast} from '../electron/explanation-cast.mjs';
import {applyActionMovie} from '../electron/action-movie.mjs';
import {planMoveEffects,applyMoveEffects,CORE_MOVES} from '../electron/move-effects.mjs';
import {applySourceMoveCards} from '../electron/source-move-cards.mjs';
import {identifyPokemon,BUNDLED_POKEMON} from '../electron/pokemon-names.mjs';
import {createMissingPokemonRepair,missingPokemonRequest,correctionTime} from '../electron/missing-pokemon.mjs';
import {createDirectChanges} from '../electron/direct-changes.mjs';
import {analyzeReaction} from '../electron/reactions.mjs';
import {denseCues} from '../electron/dense-short.mjs';
import {rankCues,applyRankPodiums} from '../electron/rank-podiums.mjs';
import {freshVisualDraft} from '../electron/fresh-project.mjs';
import {manualEdit} from '../electron/manual-editor.mjs';
import {undoRedo} from '../electron/revisions.mjs';
import {audioRouting} from '../electron/audio-routing.mjs';
import {pruneOrphanEffects,activeEffectOwner} from '../electron/effect-owners.mjs';
import {visibleRanges} from '../electron/layer-visibility.mjs';
import {pokemonImageMode} from '../electron/pokemon-image-policy.mjs';
import {matchMechanic} from '../electron/mechanic-name.mjs';
const media=name=>({id:name,name,kind:'image',width:600,height:600,pokemon:{name,displayName:name},license:'Original source'});
function fixture(text){const words=text.split(/\s+/).map((text,i)=>({text,start:i*.3,end:i*.3+.25})),duration=Math.max(8,words.at(-1).end+3);const p={id:'context-test',name:'Context',voiceId:'voice',format:'vertical',duration,captionStyle:{fontSize:53,bottom:.19},media:[{id:'voice',kind:'audio',duration},...['charizard','blastoise','sneasler','kingambit','basculegion'].map(media)],scenes:[{id:'s',start:0,end:duration,text,words,layers:[]}]};p.pokemonMentions=identifyPokemon(words,BUNDLED_POKEMON,{pokemonContext:true}).map(m=>({...m,status:'ready',mediaId:m.name}));p.scenes[0].layers=p.pokemonMentions.filter(m=>p.media.some(a=>a.id===m.mediaId)).map((m,i)=>({id:'actor-'+i,type:'image',role:'subject',mediaId:m.mediaId,x:.05+i*.4,y:.27,width:.4,height:.4,z:20,start:m.start,end:duration,animation:'none'}));return p;}
const cue=(p,name)=>planMoveEffects(p).find(c=>c.name===name);
test('general move explanations get sourced learners while named battles reject old and newly acquired galleries',async()=>{
 for(const [text,name,general] of [['Close Combat is one of the best moves.','close-combat',true],['Close Combat is one of the best moves that Charizard can learn.','close-combat',true],['Charizard uses Flamethrower on Blastoise.','flamethrower',false],['Charizard and Blastoise are interesting. If Charizard uses Flamethrower, Blastoise is not really affected.','flamethrower',false]]){
  const p=fixture(text),c=cue(p,name);assert.equal(moveContext(p,c).showLearners,general,text);p.media.push({id:'card',kind:'image',assetRole:'move-card',width:900,height:300,moveCard:{name:c.title,description:'Actual source description',verified:true}});p.shortMechanics={cues:[{...c,kind:'move',learnedByPokemon:['charizard','blastoise'],source:'https://pokeapi.co/'}]};let loads=0;const acquired=await acquireMoveCast(p,{usage:{load:async()=>{loads++;return {rows:[]};}},resolve:async n=>n,image:async n=>media(n)});assert.equal(acquired.moveCastPlan.length,general?1:0);if(!general)assert.equal(loads,0);
  p.moveCastPlan=[{sceneId:'s',move:name,title:c.title,start:c.start,end:p.duration,examples:[{mediaId:'charizard'},{mediaId:'blastoise'}]}];assert.equal(applyExplanationCast(applySourceMoveCards(p)).scenes[0].layers.some(l=>l.explanationCast),general);
 }
});
test('unaffected matchup animates the correct attacker and steady defender without fire damage, contact impacts or learner cards',()=>{
 const p=fixture("Charizard and Blastoise are interesting. If Charizard uses Flamethrower, Blastoise isn't really affected."),c=cue(p,'flamethrower');assert.equal(moveContext(p,c).outcome,'ineffective');p.media.push({id:'card',kind:'image',assetRole:'move-card',moveCard:{name:'Flamethrower',description:'Source description',verified:true}});
 const n=applySourceMoveCards(applyActionMovie(applyMoveEffects(p))),plan=n.actionMovieReport.plans[0];assert.equal(plan.attackerId,'charizard');assert.equal(plan.defenderId,'blastoise');assert.equal(plan.outcome,'ineffective');assert.ok(n.scenes[0].layers.some(l=>l.battleEffect==='flamethrower'));assert.ok(!n.scenes[0].layers.some(l=>l.moveEffect==='screen-fire'||['impact','shockwave','contact-hit'].includes(l.battleEffect)||l.sourceMoveCard));assert.ok(!n.actionMovieReport.sounds.some(s=>s.cue==='impact'));assert.ok(n.scenes[0].layers.find(l=>l.id.includes('-defender')).keyframes.every(k=>!k.rotation));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('ordinary counts stay in captions, meaningful effectiveness is labeled, and rank one stages one editable podium',()=>{
 const p=fixture('Every time one Pokemon gets knocked out a new one comes.');p.scenes[0].reaction=analyzeReaction(p.scenes[0],p);assert.equal(p.scenes[0].reaction.metrics.length,0);assert.ok(!denseCues(p).some(c=>c.kind==='number'));
 const q=fixture('Sneasler threatens Kingambit with four times super effective Close Combat.');q.scenes[0].reaction=analyzeReaction(q.scenes[0],q);assert.ok(q.scenes[0].reaction.metrics.some(m=>m.value===4));
 const rank=fixture('Charizard is the number one Pokemon.'),n=applyRankPodiums(rank);assert.equal(rankCues(rank).length,1);assert.equal(n.scenes[0].layers.filter(l=>l.role==='ranking-podium').length,1);assert.equal(n.scenes[0].layers.find(l=>l.role==='rank-number').text,'1');assert.deepEqual(applyRankPodiums(n),n);assert.deepEqual(n.scenes[0].words,rank.scenes[0].words);
});
test('timestamped missing Pokemon repair recognizes real ASR misspellings and adds an image without a model/remake or caption changes',async()=>{
 const p=fixture('Kingambit is here. Sneezler threatens it with Close Combat.'),at=p.scenes[0].words.find(w=>w.text==='Sneezler').start;p.pokemonMentions=p.pokemonMentions.filter(m=>m.name!=='sneasler');p.scenes[0].layers=p.scenes[0].layers.filter(l=>l.mediaId!=='sneasler');let found;
 const repair=createMissingPokemonRepair({recognize:w=>identifyPokemon(w,BUNDLED_POKEMON,{pokemonContext:true}),image:async name=>{found=name;return media(name);}}),direct=createDirectChanges({assets:{apply(){throw Error('No generic image route');}},repairPokemon:repair}),n=await direct(p,'You missed a Pokemon at '+at+' seconds',{});assert.equal(found,'sneasler');assert.ok(n.scenes[0].layers.some(l=>l.mediaId==='sneasler'&&l.start===at&&l.manual));assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(undoRedo(n,'undo').scenes,p.scenes);assert.equal(missingPokemonRequest('You missed Pikachu at 9 seconds'),true);assert.equal(correctionTime('at 0:09.5'),9.5);await assert.rejects(()=>repair(p,'You missed a Pokemon at 99 seconds',{}),/inside/);assert.ok(!p.scenes[0].layers.some(l=>l.mediaId==='sneasler'));
});
test('Snyzler, Sneezler and Gengambit are recognized as Pokemon without changing raw speech and Last er Specs is a move alias',()=>{
 const p=fixture('Pokemon Sneezler Snyzler Gengambit.'),names=identifyPokemon(p.scenes[0].words);assert.deepEqual(names.map(m=>m.name),['sneasler','sneasler','kingambit']);const q=fixture('Basculegion uses Laster Specs.');assert.equal(matchMechanic(q.scenes[0].words,2,[{name:'last-respects',kind:'move',title:'Last Respects'}]).entry.name,'last-respects');
});
test('fresh drafts discard old timelines, source snapshots, visibility, clips, effects and plans while retaining source files and captions',()=>{
 const p=fixture('Charizard appears.');p.soundEffects=[{mediaId:'old',start:2,auto:true}];p.moveCastPlan=[{old:true}];p.scenes[0].creativeActionSourceLayers=structuredClone(p.scenes[0].layers);p.scenes[0].performanceSourceLayers=structuredClone(p.scenes[0].layers);p.scenes[0].visualSequence=[{time:2,mediaId:'old'}];p.scenes[0].reaction={entities:[{mediaId:'old'}]};p.scenes[0].deletedLayerIds=['old'];p.narrationMuted=true;p.quickPatchRanges=[{start:1,end:2}];
 const a=freshVisualDraft(p),b=freshVisualDraft(p);assert.notEqual(a.creativePassId,b.creativePassId);assert.equal(a.scenes[0].layers,undefined);assert.equal(a.scenes[0].creativeActionSourceLayers,undefined);assert.equal(a.scenes[0].performanceSourceLayers,undefined);assert.equal(a.scenes[0].reaction,undefined);assert.equal(a.moveCastPlan,undefined);assert.equal(a.quickPatchRanges,undefined);assert.equal(a.scenes[0].deletedLayerIds,undefined);assert.equal(a.narrationMuted,undefined);assert.deepEqual(a.soundEffects,[]);assert.deepEqual(a.media,p.media);assert.deepEqual(a.captionStyle,p.captionStyle);assert.deepEqual(a.scenes[0].words,p.scenes[0].words);
});
test('all visual types and dependent empty effects can be deleted; captions and narration delete and Undo independently',()=>{
 const p=fixture('Charizard appears.'),s=p.scenes[0];s.layers.push({id:'ring',type:'svg',role:'reveal-effect',effectOwnerId:s.layers[0].id,engagementEffect:true,start:0,end:1,x:0,y:0,width:1,height:1,z:20});s.creativeActionSourceLayers=structuredClone(s.layers);const n=manualEdit(p,{type:'delete',sceneId:'s',layerId:s.layers[0].id});assert.equal(n.scenes[0].layers.length,0);assert.equal(n.scenes[0].creativeActionSourceLayers.length,0);assert.deepEqual(undoRedo(n,'undo').scenes,p.scenes);
 for(const type of ['svg','shape','group','text','video','image']){const q=fixture('Charizard appears.');q.scenes[0].layers[0].type=type;assert.equal(manualEdit(q,{type:'delete',sceneId:'s',layerId:q.scenes[0].layers[0].id}).scenes[0].layers.length,0);}
 const c=manualEdit(p,{type:'captions',sceneId:'s',enabled:false});assert.equal(c.scenes[0].captionStyle.enabled,false);assert.deepEqual(c.scenes[0].words,p.scenes[0].words);const v=manualEdit(c,{type:'audio',kind:'voice',values:{remove:true}});assert.equal(audioRouting(v).voice,undefined);assert.equal(v.voiceId,p.voiceId);assert.ok(audioRouting(undoRedo(v,'undo')).voice);assert.deepEqual(undoRedo(undoRedo(v,'undo'),'undo').scenes,p.scenes);
});
test('orphaned legacy pop rings vanish and owned effects do not appear while their image is hidden',()=>{
 const p=fixture('Charizard appears.'),s=p.scenes[0];s.layers.push({id:'gone-entrance-ring',type:'svg',engagementEffect:true,start:0,end:1});assert.ok(!pruneOrphanEffects(p).scenes[0].layers.some(l=>l.id==='gone-entrance-ring'));const actor=s.layers[0];actor.excludedRanges=[{start:.4,end:1}];const ring={id:'ring',effectOwnerId:actor.id,start:0,end:1};assert.ok(activeEffectOwner(ring,s.layers,.2));assert.equal(activeEffectOwner(ring,s.layers,.5),undefined);
 const old=fixture('Charizard appears.');delete old.scenes[0].layers;assert.equal(pruneOrphanEffects(old).scenes[0].layers,undefined);
});
test('an unfinished image search does not block a different timestamped repair, and a failed new request leaves the original intact',async()=>{
 const p=fixture('Sneasler appears.'),request='You missed Sneasler at 1 second';p.pendingRevision={id:'old',request:'Add another image',candidates:[]};const direct=createDirectChanges({assets:{apply(){throw Error('Old asset choice must not intercept');}},repairPokemon:async clean=>{assert.equal(clean.pendingRevision,undefined);return {...clean,pokemonCorrectionReport:{name:'sneasler'}};}});assert.equal((await direct(p,request)).pendingRevision,undefined);assert.equal(p.pendingRevision.id,'old');const failed=createDirectChanges({assets:{},repairPokemon:async()=>{throw Error('No matching image');}});await assert.rejects(()=>failed(p,request),/No matching image/);assert.equal(p.pendingRevision.id,'old');
});
test('older conditional default briefs do not force Showdown artwork, but actual sprite/model requests still work',()=>{
 const p=fixture('Charizard attacks.');for(const instructions of ['Use Showdown sprites only when discussing Showdown, sprites, or the model.','Try not to use Showdown sprites; use official images.','Avoid sprites. Never use Showdown sprites.']){p.editingInstructions=instructions;assert.equal(pokemonImageMode(p.scenes[0],p),'artwork');}p.editingInstructions='Use Showdown sprites.';assert.equal(pokemonImageMode(p.scenes[0],p),'showdown');p.editingInstructions='Use 3d model renders.';assert.equal(pokemonImageMode(p.scenes[0],p),'model');
});
test('a new matchup clause does not inherit the previous move failing, and threatening as an adjective does not cause an attack',()=>{
 const p=fixture('Charizard uses Flamethrower. Blastoise is not affected, and now Charizard is staring down Close Combat again.'),c=cue(p,'close-combat');assert.equal(moveContext(p,c).outcome,undefined);assert.equal(moveContext(p,c).attackerId,'blastoise');assert.equal(moveContext(p,c).defenderId,'charizard');assert.equal(moveContext(p,c).showLearners,false);
 const q=fixture('Charizard and Blastoise look threatening.');assert.equal(applyActionMovie(q).actionMovieReport.plans.length,0);
 const r=fixture('Charizard uses Flamethrower on Blastoise. Thunderbolt, also nothing.');assert.equal(moveContext(r,cue(r,'thunderbolt')).outcome,'ineffective');
});
