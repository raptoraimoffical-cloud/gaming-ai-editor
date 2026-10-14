import test from 'node:test';
import {bundledNarrationArt} from '../electron/narration-props.mjs';
import assert from 'node:assert/strict';
import {BUNDLED_POKEMON,identifyPokemon} from '../electron/pokemon-names.mjs';
import {applyStoryShots,enforceSpokenReveals} from '../electron/story-shots.mjs';
import {applyActionMovie,clearActionMovie,planNarratedActions} from '../electron/action-movie.mjs';
import {reactionCues} from '../electron/reaction-gifs.mjs';
import {rebuildVideo} from '../electron/video-rebuild.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
import {propertyAt} from '../electron/layer-motion.mjs';
import {analyzeReaction,entityAssetScore} from '../electron/reactions.mjs';
import {planReferenceShort} from '../electron/short-styles.mjs';
const words=text=>text.split(' ').map((text,i)=>({text,start:i*.4,end:i*.4+.3}));
const identify=text=>identifyPokemon(words(text),BUNDLED_POKEMON,{pokemonContext:true});
const layer=(id,start,end)=>({id:'actor-'+id,mediaId:id,type:'image',role:'subject',x:.1,y:.2,width:.7,height:.4,z:10,start,end,animation:'scale-reveal',exit:'none'});
function fixture(){return {id:'p',name:'Story',format:'vertical',duration:12,voiceId:'v',captionColor:'#aaccff',captionStyle:{fontSize:47,bottom:.19},media:[...bundledNarrationArt(),{id:'v',kind:'audio'},...['sceptile','basculegion'].map(id=>({id,kind:'image',license:'Source',pokemon:{name:id}}))],pokemonMentions:[{mediaId:'sceptile',name:'sceptile-mega',spoken:'Mega Sceptile',status:'ready',start:0,end:.8},{mediaId:'basculegion',name:'basculegion-male',spoken:'Basculegion',status:'ready',start:5,end:5.7}],scenes:[{id:'a',start:0,end:6,text:'Mega Sceptile can one shot Basculegion.',words:[{text:'Mega',start:0,end:.3},{text:'Sceptile',start:.3,end:.8},{text:'can',start:3,end:3.3},{text:'one',start:3.4,end:3.7},{text:'shot',start:3.7,end:4},{text:'Basculegion.',start:5,end:5.7}],layers:[layer('sceptile',0,6),layer('basculegion',5,6)]},{id:'b',start:6,end:12,text:'The opponent faints. That is the strategy.',words:words('The opponent faints. That is the strategy.').map(w=>({...w,start:w.start+6,end:w.end+6})),layers:[{...layer('sceptile',6,12),referenceContinuation:true},{...layer('basculegion',6,12),referenceContinuation:true}]}]};}
test('Mega split/spelling variants recover the exact form without eating sentence words',()=>{
 const m=identify('Mega Setile and basky legion. Megga Salmence and Mega Gardeviour. Mega meta gross is strong.');
 assert.deepEqual(m.map(m=>[m.spoken,m.name,m.status]),[['Mega Setile','sceptile-mega','identified'],['basky legion.','basculegion-male','identified'],['Megga Salmence','salamence-mega','identified'],['Mega Gardeviour.','gardevoir-mega','identified'],['Mega meta gross','metagross-mega','identified']]);
 assert.equal(m[0].end,.7);assert.ok(Math.abs(m[1].start-1.2)<1e-8);
 assert.deepEqual(identify('The mega sale is great and a small thing is quick.'),[]);
});
test('ambiguous Mega forms stay reviewable and ordinary speed/attack words stay outside names',()=>{
 assert.deepEqual(identify('Mega Charzard X and Mega Charzard').map(m=>[m.name,m.status]),[['charizard-mega-x','identified'],['charizard','unresolved']]);
 assert.deepEqual(identify('Mega Setile speed and basky legion attack').map(m=>m.spoken),['Mega Setile','basky legion']);
 assert.equal(identify('P K Chuth is a Pokemon.')[0].name,'pikachu');
 assert.equal(identify('Mega Sceptile one shots Bascule Jun.')[1].name,'basculegion-male');
});
test('final spoken-reveal guard removes early teasers and clamps new characters but permits established carry',()=>{
 const p=fixture();p.scenes[0].layers[1].start=0;p.scenes[0].layers.push({...layer('basculegion',0,1),id:'teaser',role:'hook-teaser'});
 const n=enforceSpokenReveals(p);assert.ok(!n.scenes[0].layers.some(l=>l.role==='hook-teaser'));assert.equal(n.scenes[0].layers.find(l=>l.mediaId==='basculegion').start,5);assert.equal(n.scenes[1].layers.find(l=>l.mediaId==='basculegion').start,6);assert.deepEqual(p.scenes[0].layers[1].start,0);
});
test('unspecified one-shot is a continuous physical contact/faint sequence after the defender name, across sentence cuts',()=>{
 const p=fixture(),n=applyActionMovie(p),plan=n.actionMovieReport.plans[0];assert.equal(plan.start,5.7);assert.equal(plan.outcome,'faint');assert.ok(Math.abs(plan.end-7.8)<1e-8);
 for(const s of n.scenes){const defender=s.layers.find(l=>l.actionMovie&&l.mediaId==='basculegion');assert.ok(defender);assert.ok(defender.start>=5.7);assert.equal(propertyAt(defender,'opacity',plan.end),0);}
 assert.ok(n.scenes.flatMap(s=>s.layers).some(l=>l.battleEffect==='contact-hit'));assert.ok(n.scenes.flatMap(s=>s.layers).some(l=>l.battleEffect==='faint-stars'));
 assert.ok(!n.scenes[1].layers.some(l=>l.role==='subject'&&l.mediaId==='basculegion'&&l.start<12));
 assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(applyActionMovie(n),n);assert.deepEqual(clearActionMovie(n).scenes,p.scenes);
 const revision=recordRevision(p,n,'Animate story',[],'Applied story','Test');assert.deepEqual(undoRedo(revision,'undo').scenes,p.scenes);assert.deepEqual(undoRedo(undoRedo(revision,'undo'),'redo').actionMovieReport,n.actionMovieReport);
});
test('negated, ambiguous, incomplete and manual/gameplay actions cannot fabricate an attack',()=>{
 for(const term of ['not','never',"can't",'cannot']){const p=fixture();p.scenes[0].words.splice(3,0,{text:term,start:3.3,end:3.4});assert.equal(planNarratedActions(p).length,0);}
 for(const protect of ['manual','gameplay','chart','no-motion','unresolved','short']){const p=fixture();if(protect==='manual')p.scenes[0].layers[0].manual=true;if(['chart','gameplay'].includes(protect))p.scenes[1].layers.push({role:protect,start:6,end:12});if(protect==='no-motion')p.editingInstructions='No animations.';if(protect==='unresolved')p.pokemonMentions[1].status='unresolved';if(protect==='short')p.duration=6.4;assert.equal(applyActionMovie(p).actionMovieReport?.plans.length||0,0,protect);}
});
test('a beam claim recoils without inventing a KO, and an explicit pronoun can use one established opponent',()=>{
 const p=fixture();p.scenes[0].words[3].text='shoots';p.scenes[0].words[4].text='a beam at';assert.equal(planNarratedActions(p)[0].outcome,'recoil');
 p.scenes[0].words[3].text='one';p.scenes[0].words[4].text='shot';p.scenes[0].words[5].text='it.';p.pokemonMentions[1].start=1;p.pokemonMentions[1].end=1.5;p.pokemonMentions.push({...p.pokemonMentions[0],start:2,end:2.7});assert.equal(planNarratedActions(p)[0].defenderId,'basculegion');
});
test('quiet narration gets actual literal pictures and two-second focus beats; words/caption settings remain unchanged',()=>{
 const p=fixture();p.pokemonMentions=p.pokemonMentions.slice(0,1);p.scenes[0].text='Mega Sceptile is small and has a plan.';p.scenes[0].words=words(p.scenes[0].text);p.scenes[0].layers=p.scenes[0].layers.slice(0,1);p.scenes[1].layers=p.scenes[1].layers.slice(0,1);
 const n=applyStoryShots(p);assert.ok(n.storyShotReport.events.some(e=>e.kind==='small'&&e.quote==='small'));assert.ok(n.scenes.flatMap(s=>s.layers).some(l=>l.storyShot&&l.type==='image'&&l.mediaId?.startsWith('narration-art-')));assert.ok(n.storyShotReport.events.length>=4);assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>l.id.includes('story-thought')));assert.ok(!JSON.stringify(n.scenes).includes('KEY POINT'));assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(applyStoryShots(n),n);
 const actor=n.scenes[0].layers.find(l=>l.role==='subject');assert.ok(propertyAt(actor,'scale',1.9)<.6,'Small narration must visibly shrink the character');
});
test('reaction clips and descriptive adjectives cannot become permanent characters or a carried lead',()=>{
 const p=fixture();p.shortStyle='pokemon-dense';const gif={id:'fast',name:'Sonic fast reaction',tags:'fast',kind:'image',assetRole:'reaction-gif',license:'Source',identity:{franchise:'reaction',subject:'fast'}};p.media.push(gif,{...gif,id:'stock-fast',assetRole:'subject',identity:{subject:'fast'}});
 p.scenes[0].text='Mega Sceptile is fast.';p.scenes[0].words=words(p.scenes[0].text);p.scenes[0].reaction=analyzeReaction(p.scenes[0],p);assert.ok(!p.scenes[0].reaction.entities.some(e=>e.name==='fast'));assert.equal(entityAssetScore({name:'fast',type:'character',identity:['fast']},gif),0);
 p.scenes[0].reaction.entities.push({id:'fast',name:'fast',type:'character',mediaId:'fast',start:3});assert.ok(planReferenceShort(p).shots.every(s=>!s.subjects.some(e=>e.mediaId==='fast')));
});
test('one-shot and one-hit idioms do not fabricate a number card, and ordinary counts stay in captions',()=>{
 const p=fixture();for(const text of ['Mega Sceptile can one shot Basculegion.','Mega Sceptile can one -shot Basculegion.','Mega Sceptile gets a one hit knockout.']){const s={...p.scenes[0],text,words:words(text)};assert.equal(analyzeReaction(s,p).metrics.length,0);}
 const s={...p.scenes[0],text:'Mega Sceptile wins one match.',words:words('Mega Sceptile wins one match.')};assert.equal(analyzeReaction(s,p).metrics.length,0);
});
test('charts, narrated evidence, complete actions, manual scenes and opted-out density hold their useful pictures',()=>{
 for(const protect of ['chart','manual','specific','disabled','restrained']){const p=fixture();for(const s of p.scenes){if(protect==='chart')s.layers.push({role:'chart',start:s.start,end:s.end});if(protect==='manual')s.manualTemplate=true;if(protect==='specific')s.text='Explain its accuracy and damage calculation.';}if(protect==='disabled')p.autoStoryShots=false;if(protect==='restrained')p.editingInstructions='Use restrained documentary effects.';assert.equal(applyStoryShots(p).storyShotReport?.events.length||0,0,protect);}
 const n=applyStoryShots(applyActionMovie(fixture()));assert.ok(!n.storyShotReport.events.some(e=>e.start>=5.7&&e.start<7.8));
});
test('fast, slow and strong GIF cues occur at actual spoken words with explicit negation guards',()=>{
 const p=fixture();p.scenes=[{id:'s',start:0,end:12,text:'Fast then slow then strong.',words:[{text:'fast',start:1,end:1.3},{text:'slow',start:4,end:4.3},{text:'strong',start:7,end:7.3}],layers:[]}];assert.deepEqual(reactionCues(p).map(c=>[c.id,c.start]),[['fast',1],['slow',4],['strong',7]]);p.scenes[0].words.unshift({text:'not',start:.7,end:1});assert.ok(!reactionCues(p).some(c=>c.id==='fast'));
});
test('name correction remake keeps caption appearance and source words while allowing corrected display spelling',async()=>{
 const p=fixture();p.scenes[0].words[1].text='Setile';p.scenes[0].words[1].captionText='Setile';p.scenes[0].text='Mega Setile can one shot Basculegion.';
 const n=await rebuildVideo(p,'',{preserveCaptions:true,preserveCaptionText:false,identify:async n=>n,enrich:async n=>({...n,captionColor:'#fff',captionStyle:{fontSize:60},scenes:n.scenes.map(s=>({...s,layers:[],words:s.words.map(w=>w.text==='Setile'?{...w,captionText:'Sceptile'}:w)}))})});
 assert.equal(n.scenes[0].words[1].captionText,'Sceptile');assert.equal(n.scenes[0].words[1].text,'Setile');assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(n.captionColor,p.captionColor);assert.match(n.revisionHistory.at(-1).summary,/corrected recognized names/);
});
