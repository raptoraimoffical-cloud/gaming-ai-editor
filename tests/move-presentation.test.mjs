import test from 'node:test';import assert from 'node:assert/strict';
import {applyMoveEffects,planMoveEffects,applySmoothTransitions} from '../electron/move-effects.mjs';
import {DEFAULT_INSTRUCTIONS,LEGACY_INSTRUCTIONS,upgradeDefaultInstructions} from '../electron/default-instructions.mjs';
import {acquirePokemonImage,pokemonImageMode,preferredPokemonImage} from '../electron/pokemon-image-policy.mjs';
import {applyGamePresentation,backgroundTopic,noMotion} from '../electron/game-presentation.mjs';import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {validateProject} from '../electron/planner.mjs';import {recordRevision,undoRedo} from '../electron/revisions.mjs';import {enrichShortMechanics} from '../electron/short-mechanics.mjs';
const words=(text,offset=0)=>text.split(' ').map((text,i)=>({text,start:offset+i*.4,end:offset+(i+1)*.4}));
const art={id:'art',kind:'pokemon',name:'Charizard',license:'Source notice',pokemon:{name:'charizard',sourceKey:'other.official-artwork.front_default'},identity:{franchise:'pokemon',subject:'charizard'}};
const sprite={...art,id:'sprite',pokemon:{name:'charizard',sourceKey:'other.showdown.front_default'}};
function fixture(text='Charizard uses Flamethrower on this target.') {return {id:'fx',name:'Moves',voiceId:'voice',duration:8,format:'vertical',captionColor:'#fff025',musicVolume:0,editingInstructions:DEFAULT_INSTRUCTIONS,shortStyle:'pokemon-dense',media:[{id:'voice',kind:'audio'},art,sprite,{id:'flamethrower-info',kind:'image',assetRole:'move-card',width:1000,height:400,moveCard:{name:'Flamethrower',description:'The target is scorched with an intense blast of fire.',verified:true},attribution:{source:'https://publisher.example/flamethrower',credit:'Source author'}}],pokemonMentions:[{name:'charizard',status:'ready',mediaId:'art',start:0,end:.4}],scenes:[{id:'a',start:0,end:4,text,words:words(text),layers:[{id:'actor',type:'image',role:'subject',mediaId:'art',x:.04,y:.15,width:.92,height:.53,z:10,start:0,end:4,animation:'scale-reveal'}]},{id:'b',start:4,end:8,text:'Pikachu follows up.',words:words('Pikachu follows up.',4),layers:[{id:'other',type:'image',role:'subject',mediaId:'sprite',x:.04,y:.15,width:.92,height:.53,z:10,start:4,end:8,animation:'scale-reveal'}]}]};}
test('the denser default brief upgrades the exact old default without disabling motion or forcing Showdown',()=>{
 assert.match(DEFAULT_INSTRUCTIONS,/Understand the subjects, relationships, actions/);assert.match(DEFAULT_INSTRUCTIONS,/two seconds/);assert.equal(noMotion(fixture()),false);assert.equal(pokemonImageMode(fixture().scenes[0],fixture()),'artwork');assert.equal(upgradeDefaultInstructions(LEGACY_INSTRUCTIONS+'\nREFERENCE SHORT STYLE: preset'),DEFAULT_INSTRUCTIONS+'\n\nREFERENCE SHORT STYLE: preset');assert.equal(upgradeDefaultInstructions('Use my own clean style.'),'Use my own clean style.');
});
test('a single Pokemon using Flamethrower gets an actual full-canvas fire effect and sourced move image, independently of battle choreography',()=>{
 const p=fixture(),n=applyMoveEffects(p),s=n.scenes[0],fire=s.layers.find(l=>l.moveEffect==='screen-fire');assert.ok(fire);assert.equal(fire.start,.8);assert.equal(fire.end,3.3);assert.equal(fire.width,1);assert.equal(fire.height,1);assert.ok(s.layers.some(l=>l.sourceMoveCard&&l.type==='image'&&l.mediaId==='flamethrower-info'&&!l.setupGraphic));assert.ok(n.moveEffectReport.sounds.some(c=>c.cue==='fire'));assert.deepEqual(s.words,p.scenes[0].words);assert.deepEqual(applyMoveEffects(n),n);validateProject(n);const saved=recordRevision(p,n,'Move effects',[],'Fire','Test');assert.deepEqual(undoRedo(saved,'undo').scenes,p.scenes);assert.equal(undoRedo(undoRedo(saved,'undo'),'redo').moveEffectReport.cues[0].effect,'screen-fire');
});
test('explaining, negating or learning a move shows the title without pretending the Pokemon performed it',()=>{
 for(const text of ['Charizard does not use Flamethrower.','Charizard can learn Flamethrower.','The move Flamethrower is strong.']){const n=applyMoveEffects(fixture(text));assert.ok(n.scenes[0].layers.some(l=>l.sourceMoveCard&&l.mediaId==='flamethrower-info'));assert.ok(!n.scenes[0].layers.some(l=>l.moveEffect));}
});
test('split Flam thrower and Flamthrower are repaired for captions while raw narration and timestamps survive',()=>{
 for(const name of ['Flam thrower','Flamthrower']){const p=fixture('Charizard uses '+name+' today.'),n=applyMoveEffects(p);assert.ok(n.scenes[0].layers.some(l=>l.moveEffect==='screen-fire'));assert.equal(n.scenes[0].words[2].captionText,'Flamethrower');assert.deepEqual(n.scenes[0].words.map(w=>[w.text,w.start,w.end]),p.scenes[0].words.map(w=>[w.text,w.start,w.end]));}
});
test('water, ice and electric attacks receive distinct source-backed effects; existing move cards are not duplicated',()=>{
 for(const [move,effect] of [['Water Gun','water-splash'],['Ice Beam','ice-freeze'],['Thunderbolt','electric-storm']]){const n=applyMoveEffects(fixture('Charizard uses '+move+' on the target.'));assert.ok(n.scenes[0].layers.some(l=>l.moveEffect===effect));}
 const p=fixture();p.scenes[0].layers.push({id:'card',type:'group',role:'mechanic-card',setupGraphic:{kind:'move',title:'Flamethrower'},start:.8,end:4,x:.1,y:.5,width:.8,height:.25,z:40});assert.ok(!applyMoveEffects(p).scenes[0].layers.some(l=>l.sourceMoveCard&&l.mediaId==='flamethrower-info'));
});
test('an attack consequence continues smoothly across a sentence cut without restarting its animation',()=>{
 const p=fixture();p.scenes[0].words=words('Charizard uses Flamethrower.',2.4);p.scenes[0].text='Charizard uses Flamethrower.';const n=applyMoveEffects(p),first=n.scenes[0].layers.find(l=>l.moveEffect),carried=n.scenes[1].layers.find(l=>l.moveEffect);assert.equal(first.start,3.2);assert.equal(first.end,4);assert.equal(carried.start,4);assert.equal(carried.end,5.7);assert.equal(carried.moveEffectStart,3.2);assert.equal(carried.moveEffectEnd,5.7);assert.deepEqual(applyMoveEffects(n),n);validateProject(n);
});
test('manual compositions, gameplay evidence, no motion and restrained instructions are protected',()=>{
 let p=fixture();p.scenes[0].manualTemplate=true;assert.equal(applyMoveEffects(p).scenes[0].layers.length,1);
 for(const text of ['No animations.','Use restrained effects.','No effects.']){p=fixture();p.editingInstructions=text;assert.ok(!applyMoveEffects(p).scenes[0].layers.some(l=>l.moveEffect));}
 p=fixture();p.scenes[0].layers.push({id:'gameplay',role:'gameplay',type:'video',start:0,end:4});assert.ok(!applyMoveEffects(p).scenes[0].layers.some(l=>l.moveEffect));
});
test('crossfades and their swooshes survive replanning with single locked narration and no duplicated cues',()=>{
 const p=fixture(),n=applySmoothTransitions(applyMoveEffects(p));assert.equal(n.scenes[1].transition,'crossfade');assert.equal(n.scenes[1].transitionDuration,.2);assert.equal(n.transitionSoundPlan[0].start,4);assert.deepEqual(applySmoothTransitions(n),n);assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));
 const pool=['fire','whoosh','pop'].map(cue=>({id:cue,kind:'audio',assetRole:'sound-effect',name:cue,license:'Original audio',duration:.4})),sounded=automaticSounds(n,pool);assert.ok(sounded.soundEffects.some(f=>f.cue==='fire'&&f.start===.8));assert.ok(sounded.soundEffects.some(f=>f.cue==='whoosh'&&f.start===4));assert.equal(automaticSounds({...n,autoSoundEffects:false},pool).soundEffects.length,0);
});
test('moving backgrounds change to the narrated move/weather/environment topic while preserving uploads',()=>{
 const p=fixture(),n=applyGamePresentation(p),bg=n.scenes[0].layers.find(l=>l.role==='background');assert.equal(backgroundTopic(p.scenes[0],p),'fire');assert.match(bg.svg,/#522d27/);assert.ok(bg.keyframes[0].x!==bg.keyframes[1].x);p.scenes[0].text='Pokemon near an ocean.';assert.match(applyGamePresentation(p).scenes[0].layers.find(l=>l.role==='background').svg,/#153f58/);
 p.creationAssets={backgroundMode:'upload'};assert.ok(!applyGamePresentation(p).scenes[0].layers.some(l=>l.id.includes('presentation-pattern')));
});
test('artwork is preferred over old Showdown cache; Showdown/model/back discussion selects the matching context',()=>{
 const p=fixture();assert.equal(preferredPokemonImage('charizard',p.scenes[0],p).id,'art');p.scenes[0].text='Charizard on Showdown.';assert.equal(pokemonImageMode(p.scenes[0],p),'showdown');assert.equal(preferredPokemonImage('charizard',p.scenes[0],p).id,'sprite');p.scenes[0].text='Charizard 3D model looks different.';assert.equal(pokemonImageMode(p.scenes[0],p),'model');p.scenes[0].text='Show the back of Charizard.';assert.equal(pokemonImageMode(p.scenes[0],p),'back');
});
test('configured Google search runs before artwork fallback and accepts decoded exact-source originals with correct metadata',async()=>{
 const p=fixture(),calls=[],candidate={id:'google',name:'Charizard artwork',url:'https://pokemon.com/charizard.png',webAssessment:{autoEligible:true}},media={id:'downloaded',kind:'image',provider:'google-images',decoded:true,transparent:true,width:640,height:640,originalUrl:candidate.url,webAssessment:{accepted:true,autoEligible:true,confidence:.94},rightsNotice:'Unverified reuse rights'};
 const result=await acquirePokemonImage({name:'charizard'},p.scenes[0],p,{key:'configured-test-only',pool:p.media,search:async(q,provider)=>{calls.push(provider);return [candidate];},download:async()=>media,service:{info:async()=>({name:'charizard',stats:[]})},asset:async()=>{calls.push('fallback');return art;}});assert.deepEqual(calls,['google-images']);assert.equal(result.media.pokemon.name,'charizard');assert.equal(result.media.pokemon.sourceKey,'google-artwork');assert.equal(result.media.license,undefined);assert.equal(result.log.source,'google-images');
 const fallback=await acquirePokemonImage({name:'charizard'},p.scenes[0],p,{pool:[],key:'',asset:async(name,opts)=>{calls.push(opts.sourceKey);return art;}});assert.equal(fallback.log.source,'other.official-artwork.front_default');assert.ok(fallback.log.attempts.some(a=>a.status==='not-configured'));
});
test('unsafe, tiny, nontransparent and undocumented Google results fall back; no automatic Showdown request occurs',async()=>{
 const p=fixture(),calls=[];const n=await acquirePokemonImage({name:'charizard'},p.scenes[0],p,{pool:[],key:'test-only',search:async()=>[{id:'wrong',name:'Charizard plush',webAssessment:{autoEligible:false}}],asset:async(name,opts)=>{calls.push(opts.sourceKey);return art;}});assert.equal(n.media.id,'art');assert.deepEqual(calls,['other.official-artwork.front_default']);
});
test('offline core move metadata keeps actual move explanations available outside the reference styles',async()=>{
 const p=fixture();delete p.shortStyle;const n=await enrichShortMechanics(p,{mechanicCatalog:async()=>{throw Error('Offline');},mechanic:async()=>{throw Error('Offline');}});assert.equal(n.shortMechanics.cues[0].name,'flamethrower');assert.equal(n.shortMechanics.cues[0].power,90);assert.match(n.shortMechanics.cues[0].source,/pokeapi/);
});
