import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {REFERENCE_ACTIVITY} from '../electron/reference-activity.mjs';
import {applyLayeredActivity,clearLayeredActivity,auditLayeredActivity} from '../electron/layered-activity.mjs';
import {applyVisualCadence} from '../electron/visual-cadence.mjs';
import {compileCreativeRecipes,creativeRecipeFormat} from '../electron/creative-recipes.mjs';
import {applyCreativeActions,planCreativeActions,acquireCreativeProps} from '../electron/creative-actions.mjs';
import {stageMechanicLayout} from '../electron/mechanic-layout.mjs';
import {propertyAt} from '../electron/layer-motion.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {createNarrationProps} from '../electron/narration-props.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
import {renderProject} from '../electron/render-project.mjs';

const words=text=>text.split(' ').map((text,i)=>({text,start:i*.4,end:i*.4+.35}));
const actor={id:'hero',role:'subject',type:'image',mediaId:'charizard',start:0,end:10,x:.28,y:.36,width:.44,height:.28,z:10,animation:'none',exit:'none'};
const panel={id:'proof',role:'mechanic-card',sourceMoveCard:true,type:'image',mediaId:'description',start:1,end:8,x:.07,y:.05,width:.86,height:.18,z:40,animation:'none',exit:'none'};
function fixture(text='Charizard puts this clever plan on paper. Then rain and snow arrive.'){
 return {id:'p',name:'Layered activity',voiceId:'v',gameSelection:'pokemon',duration:10,format:'vertical',captionColor:'#bb22dd',captionStyle:{fontSize:51,bottom:.19,style:'contrast-phrase'},editingInstructions:'Keep the lead and source evidence, animate the narrated story.',media:[{id:'v',kind:'audio'},...['charizard','description','paper','crown'].map(id=>({id,kind:'image',width:id==='description'?1000:400,height:id==='description'?400:400,name:id,license:'Fixture source',transparent:true,...(id==='charizard'?{pokemon:{name:id}}:{}),...(id==='paper'||id==='crown'?{assetRole:'narration-prop',identity:{subject:id,source:'Published original artwork'}}:{})}))],scenes:[{id:'s',start:0,end:10,text,words:words(text),reaction:{entities:[{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'charizard',start:0}],metrics:[]},layers:[structuredClone(actor),structuredClone(panel)]}]};
}
const frameSignature=p=>p.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words]);
test('reference grammar encodes all five supplied examples, simultaneous activity, source pictures and deliberate holds',()=>{
 assert.deepEqual(REFERENCE_ACTIVITY.references.map(r=>r.id),['xOPvJql78OA','Nstw1MbZN44','L8vnRyKN2oI','H7Ui71vRA5k','This-Move-Changes']);assert.deepEqual(REFERENCE_ACTIVITY.target.foregroundElements,[2,4]);assert.ok(REFERENCE_ACTIVITY.rules.some(r=>/evidence stay readable/.test(r)));assert.ok(REFERENCE_ACTIVITY.rules.some(r=>/final punchlines can hold/.test(r)));
});
test('the lead reacts beside a source card while the card and captions stay completely still',()=>{
 const p=fixture(),n=applyLayeredActivity(p),l=n.scenes[0].layers.find(l=>l.id==='hero');assert.ok(n.layeredActivityReport.events.some(e=>e.kind==='notice-support'));assert.ok(l.keyframes?.length>=3);assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='proof'),p.scenes[0].layers.find(l=>l.id==='proof'));assert.deepEqual(frameSignature(n),frameSignature(p));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(clearLayeredActivity(n).scenes,p.scenes);assert.deepEqual(applyLayeredActivity(n),n);
 const recorded=recordRevision(p,n,'Layered scene',[],'Layered scene','test');assert.deepEqual(undoRedo(recorded,'undo').scenes,p.scenes);assert.deepEqual(undoRedo(undoRedo(recorded,'undo'),'redo').layeredActivityReport,n.layeredActivityReport);
});
test('independent sourced pictures and actor motion coexist with evidence instead of cancelling the entire scene',()=>{
 const p=fixture('Charizard has a clever plan on paper.');p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[{kind:'stage-image',quote:'clever',wordIndex:3,duration:2,propQuery:'paper sheet transparent PNG',position:{x:.06,y:.4},reason:'Show the stated plan',sound:'pop'},{kind:'reaction',quote:'clever',wordIndex:3,duration:1.2,actorId:'charizard',reason:'The lead approves its own plan',sound:'none'},{kind:'prop-reveal',quote:'plan',wordIndex:4,duration:1.2,actorId:'charizard',propQuery:'gold crown transparent PNG',anchor:'head',reason:'A playful confidence prop'}])};
 p.creativePropAssets={'s/0/prop-0':'paper','s/2/prop-2':'crown'};const n=applyCreativeActions(p);assert.equal(n.creativeActionReport.events.length,3);assert.ok(n.scenes[0].layers.some(l=>l.role==='creative-stage-prop'));assert.ok(n.scenes[0].layers.some(l=>l.creativeAction&&l.role==='subject'));assert.ok(n.scenes[0].layers.some(l=>l.role==='creative-prop'));assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='proof'),panel);assert.ok(auditLayeredActivity(n).samples.some(s=>s.pictures>=4));assert.deepEqual(applyCreativeActions(n).scenes,n.scenes);assert.deepEqual(frameSignature(n),frameSignature(p));
});
test('same-actor actions are scheduled consecutively while an independent prop continues beside them',()=>{
 const p=fixture('Charizard has a clever plan on paper.');p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[{kind:'reaction',quote:'clever',wordIndex:3,duration:2,actorId:'charizard',reason:'A comic reaction'},{kind:'dash',quote:'plan',wordIndex:4,duration:1,actorId:'charizard',reason:'Conflicting move'},{kind:'stage-image',quote:'plan',wordIndex:4,duration:1,propQuery:'paper PNG',reason:'Independent source picture'}])};p.creativePropAssets={'s/2/prop-2':'paper'};
 const n=applyCreativeActions(p);assert.equal(n.creativeActionReport.events.length,3);assert.ok(n.creativeActionReport.events[0].end<=n.creativeActionReport.events[1].start);for(let t=1.2;t<2.6;t+=.04)assert.equal(n.scenes[0].layers.filter(l=>l.role==='subject'&&l.mediaId===actor.mediaId&&l.start<=t&&l.end>t&&!l.excludedRanges?.some(r=>r.start<=t&&r.end>t)).length,1);assert.ok(n.scenes[0].layers.some(l=>l.role==='creative-stage-prop'));
});
test('source cards are staged before motion so the acting character starts in the measured evidence lane',()=>{
 const p=fixture('Charizard has a clever plan on paper.');p.scenes[0].layers[0]={...actor,x:.04,y:.03,width:.9,height:.55};const staged=stageMechanicLayout(p);assert.ok(staged.mechanicLayoutReport.events.length);staged.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(staged.scenes[0],[{kind:'reaction',quote:'clever',wordIndex:3,duration:1,actorId:'charizard',reason:'Confidence beside proof'}])};
 const n=applyCreativeActions(staged),acting=n.scenes[0].layers.find(l=>l.creativeAction&&l.role==='subject');assert.ok(acting);assert.ok(acting.y>=panel.y+panel.height+.02);assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='proof'),panel);
});
test('new recipes begin on the literal prop/action word inside a quoted phrase',()=>{
 const p=fixture('Charizard puts this plan on paper.'),r={kind:'stage-image',quote:'on paper.',wordIndex:4,duration:1.2,propQuery:'paper PNG',reason:'Act out the expression'};p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[r])};p.creativePropAssets={'s/0/prop-0':'paper'};const n=applyCreativeActions(p);assert.equal(n.creativeActionReport.events[0].start,p.scenes[0].words[5].start);assert.equal(n.scenes[0].layers.find(l=>l.role==='creative-stage-prop').start,p.scenes[0].words[5].start);
});
test('a long model quote cannot reveal a crown before crown or launch paper before the fall',()=>{
 const p=fixture('Charizard says on paper the plan wins a crown. Then the plan falls apart.');
 const recipes=[{kind:'stage-image',quote:'on paper the plan wins a crown.',wordIndex:2,duration:1.2,propQuery:'gold crown symbol PNG',reason:'Show confidence'},{kind:'prop-launch',quote:'Then the plan falls apart.',wordIndex:9,duration:.8,actorId:'charizard',propQuery:'paper plan falling apart',reason:'Collapse of the plan'},{kind:'reaction',quote:'Then the plan falls apart.',wordIndex:9,duration:1,actorId:'charizard',reason:'Comic failure'}];
 const a=compileCreativeRecipes(p.scenes[0],recipes);assert.equal(p.scenes[0].words[a[0].cueWordIndex].text,'crown.');assert.equal(p.scenes[0].words[a[1].cueWordIndex].text,'falls');assert.equal(p.scenes[0].words[a[2].cueWordIndex].text,'falls');
 p.scenes[0].editorialPlan={creativeActions:a};p.creativePropAssets={'s/0/prop-0':'crown','s/1/prop-1':'paper'};const n=applyCreativeActions(p);assert.equal(n.creativeActionReport.events.length,3);assert.ok(n.scenes[0].layers.filter(l=>l.role==='creative-prop'||l.role==='creative-stage-prop').every(l=>l.start>=p.scenes[0].words[l.mediaId==='crown'?8:12].start));
 const sound=['pop','whoosh'].map(cue=>({id:'fx-'+cue,kind:'audio',name:cue,tags:cue,assetRole:'sound-effect',license:'Fixture',duration:.15}));assert.ok(automaticSounds(n,sound).soundEffects.some(f=>/Sourced prop leaves/.test(f.reason)));
});
test('weather uses a sourced file behind actors, switches at the actual words, and never makes a substitute image',()=>{
 const p=fixture();p.media.push(...['rain','snow'].map(id=>({id,kind:'image',assetRole:'narration-prop',identity:{subject:id,source:'Published original'},path:id+'.gif',animationInfo:{animated:true}})));const n=applyLayeredActivity(p),weather=n.scenes[0].layers.filter(l=>l.role==='ambient-source');assert.equal(weather.length,2);assert.ok(weather.every(l=>l.type==='image'&&l.z<actor.z&&l.opacity<.3));assert.equal(weather[0].end,weather[1].start);assert.deepEqual(n.captionStyle,p.captionStyle);assert.ok(weather.every(l=>l.start===p.scenes[0].words.find(w=>w.text===l.mediaId).start));
 const missing=applyLayeredActivity(fixture());assert.ok(!missing.scenes[0].layers.some(l=>l.role==='ambient-source'));
});
test('quiet activity checks count actual foreground content, not background, captions, shadows or a lone idle zoom',()=>{
 const p=fixture();p.scenes[0].layers=p.scenes[0].layers.filter(l=>l.id!=='proof');p.scenes[0].layers.push({id:'bg',role:'background',type:'shape',start:0,end:10,x:0,y:0,width:1,height:1,z:0},{id:'shadow',role:'editorial-depth',type:'svg',start:0,end:10,x:.2,y:.6,width:.4,height:.03,z:9});const report=auditLayeredActivity(p);assert.equal(report.meanForegroundPictures,1);assert.equal(report.concurrentFraction,0);assert.ok(report.quietWindows.length);assert.ok(report.quietWindows.every(w=>/not filler/.test(w.reason)));
});
test('readable proof no longer suppresses separate lead focus, and evidence has no timer motion added',()=>{
 const p=fixture();p.scenes[0].words.forEach((w,i)=>{w.start=i*10/p.scenes[0].words.length;w.end=w.start+.8;});const n=applyVisualCadence(p);assert.ok(n.cadenceReport.events.length);assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='proof'),panel);assert.ok(n.cadenceReport.events.some(e=>/stationary readable evidence/.test(e.reason)));
});
test('a scheduled source-prop reveal takes priority over a timer focus and keeps its arrival sound',()=>{
 const p=fixture();p.scenes[0].layers.push({id:'crown',type:'image',role:'creative-stage-prop',mediaId:'crown',x:.05,y:.3,width:.2,height:.2,start:4.16,end:5.36,z:20});p.creativeActionReport={sounds:[{start:4.16,cue:'pop',priority:10,reason:'Narrated creative action: crown'}]};
 const n=applyVisualCadence(p);assert.ok(!n.cadenceReport.events.some(e=>e.start===4));const audio=[{id:'pop',name:'pop',tags:'pop',kind:'audio',duration:.15,assetRole:'sound-effect',license:'Fixture'}];assert.ok(automaticSounds(n,audio).soundEffects.some(f=>f.start===4.16));
});
test('explicit quiet/static/manual/footage choices and a complete attack retain their holds',()=>{
 for(const change of [{editingInstructions:'No animations.'},{freezePokemonMotion:true},{editingInstructions:'Use restrained documentary visuals.'},{autoLayeredActivity:false}]){const p={...fixture(),...change},n=applyLayeredActivity(p);assert.deepEqual(n.scenes,p.scenes);assert.equal(n.layeredActivityReport.disabled,true);}
 for(const role of ['gameplay','narrated-action']){const p=fixture();p.scenes[0].layers.push({id:'action',type:'group',role,start:0,end:10,x:0,y:0,width:1,height:1,z:20});assert.equal(applyLayeredActivity(p).layeredActivityReport.events.length,0);assert.equal(applyVisualCadence(p).cadenceReport.events.length,0);}
 const p=fixture();p.scenes[0].manualTemplate=true;assert.deepEqual(applyLayeredActivity(p).scenes,p.scenes);assert.deepEqual(applyLayeredActivity({...fixture(),gameSelection:'minecraft'}).scenes,fixture().scenes);
});
test('phase sounds follow delivered prop travel and payoff, respect silence and never replay narration',()=>{
 const p=fixture('Charizard has a clever plan.');p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[{kind:'prop-drop',quote:'clever',wordIndex:3,duration:2,actorId:'charizard',anchor:'head',propQuery:'crown PNG',reason:'Confidence collapses',sound:'pop'}])};p.creativePropAssets={'s/0/prop-0':'crown'};const n=applyCreativeActions(p);assert.ok(n.creativeActionReport.sounds.some(s=>s.cue==='whoosh'));assert.ok(n.creativeActionReport.sounds.some(s=>/payoff/.test(s.reason)));const audio=['pop','whoosh','impact','click'].map(cue=>({id:'fx-'+cue,kind:'audio',assetRole:'sound-effect',name:cue,tags:cue,license:'Fixture',duration:.15})),mixed=automaticSounds(n,audio);assert.ok(mixed.soundEffects.length>=3);assert.ok(mixed.soundEffects.every(e=>e.mediaId!=='v'));assert.deepEqual(automaticSounds(mixed,audio).soundEffects,mixed.soundEffects);
});
test('the trained planner receives reference editing grammar without copied plots, plus simultaneous lanes and a usable recipe budget',async()=>{
 const p=fixture(),state={mode:'high',models:{editing:{name:'fixture-trained'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]};let context;
 const n=await planCreativeActions(p,state,()=>{},async(url,o)=>{const b=JSON.parse(o.body);context=JSON.parse(b.messages[1].content);assert.match(b.messages[0].content,/Compose the whole screen/);assert.match(b.messages[0].content,/Independent stage props may overlap/);assert.equal(b.format.properties.recipes.maxItems,6);return Response.json({message:{content:JSON.stringify({ideas:['Paper prop and a confident double take','Crown confidence then a fall'],selectedIdea:0,recipes:[{kind:'stage-image',quote:'paper.',wordIndex:7,duration:1.2,propQuery:'sheet of paper PNG',reason:'Show the expression'},{kind:'reaction',quote:'paper.',wordIndex:7,duration:.8,actorId:'charizard',reason:'Confidence in the theory'}]})}});});
 assert.equal(context.referenceActivity.examples,undefined);assert.equal(context.actionBudget,6);assert.equal(n.scenes[0].editorialPlan.creativeActions.length,2);assert.equal(creativeRecipeFormat(6,p.scenes[0]).properties.recipes.maxItems,6);
});
test('creative actions cannot revive legacy emoji artwork while a published original is available',async()=>{
 const p=fixture('Charizard puts this plan on paper.');p.media.unshift({id:'narration-art-paper-v1',kind:'image',assetRole:'narration-prop',identity:{subject:'paper',source:'Published Twemoji graphic'},transparent:true,width:300,height:300});p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[{kind:'stage-image',quote:'paper.',wordIndex:5,duration:1,propQuery:'paper PNG',reason:'Show the actual phrase'}])};const n=await acquireCreativeProps(p);assert.equal(n.creativePropAssets['s/0/prop-0'],'paper');
 let downloaded=0;const online=await acquireCreativeProps({...p,media:[]},{keys:{'google-images':'fixture'},search:async()=>[{id:'bad',name:'Paper emoji PNG',webAssessment:{accepted:true,autoEligible:true}},{id:'real',name:'White paper photograph',webAssessment:{accepted:true,autoEligible:true}}],download:async c=>{downloaded++;assert.equal(c.id,'real');return {id:'real',kind:'image',provider:'google-images',decoded:true,webAssessment:{accepted:true},width:500,height:500,transparent:true};}});assert.equal(downloaded,1);assert.equal(online.creativePropAssets['s/0/prop-0'],'real');
});
test('Google atmosphere acquisition preserves an actual animated original and permits opacity-backed footage without a cutout',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-atmosphere-'));t.after(()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-atmosphere-'));fs.rmSync(folder,{recursive:true,force:true});});const file=path.join(folder,'rain.png');await sharp({create:{width:400,height:500,channels:4,background:'blue'}}).png().toFile(file);let calls=0;
 const service=createNarrationProps(folder,{search:async(q,provider,key,o)=>{calls++;assert.equal(o.type,'GIF');return [{id:'rain',name:'Rain falling transparent GIF'}];},download:async()=>({id:'rain-original',kind:'image',path:file,decoded:true,width:400,height:500,transparent:false,animationInfo:{animated:true,frameCount:12},attribution:{source:'https://publisher.example/rain',credit:'Original artist'}})});
 const p=fixture('Charizard watches rain falling.'),n=await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(n.narrationAssetPlan.rain,'rain-original');assert.equal(n.media.at(-1).attribution.credit,'Original artist');assert.equal(n.media.at(-1).animationInfo.frameCount,12);await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(calls,1);
});
test('render props discard activity diagnostics while keeping the real sourced layers and their animation',()=>{
 const n=applyLayeredActivity(fixture()),r=renderProject(n);assert.equal(r.layeredActivityReport,undefined);const a=r.scenes[0].layers.find(l=>l.id==='hero');assert.equal(propertyAt(a,'rotation',1.5),propertyAt(n.scenes[0].layers.find(l=>l.id==='hero'),'rotation',1.5));assert.deepEqual(r.captionStyle,n.captionStyle);
});
