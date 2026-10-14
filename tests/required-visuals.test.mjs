import test from 'node:test';import assert from 'node:assert/strict';
import {needsImageResolution,resolveRevisionImages} from '../electron/revision-image-intent.mjs';
import {namedImageMatch} from '../electron/named-images.mjs';
import {parseSuppliedTeam} from '../electron/supplied-team.mjs';
import {planVisualInstructions,createVisualInstructions,explicitVisualBrief} from '../electron/visual-instructions.mjs';
import {DEFAULT_INSTRUCTIONS} from '../electron/default-instructions.mjs';
import {POKEMON_GOLD_BRIEF,CINEMATIC_POKEMON_BRIEF} from '../electron/gold-reference-policy.mjs';
import {rebuildInstructions} from '../electron/video-rebuild.mjs';
import {validateProject} from '../electron/planner.mjs';
import {createRevisionAssets} from '../electron/revision-assets.mjs';
import {createDirectChanges} from '../electron/direct-changes.mjs';
import {imagePlayback} from '../electron/image-playback.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';

const voice={id:'voice',kind:'audio',duration:44};
const brief='Show a picture of the guy I am talking about when I say his name. Show his full team and items and EVs at the team reveal.\nEric Rios\n\nGholdengo @ Life Orb\nAbility: Good as Gold\nLevel: 50\nEVs: 17 HP / 7 SpA / 22 SpD / 20 Spe\nModest Nature\n- Protect\n- Shadow Ball\n- Nasty Plot\n- Make It Rain\n\nVolcarona @ Rocky Helmet\nAbility: Flame Body\nLevel: 50\nEVs: 13 HP / 30 Def / 23 Spe\nTimid Nature\n- Overheat\n- Struggle Bug\n- Rage Powder\n- Tailwind';
const art=id=>({id,kind:'image',path:id+'.png',width:900,height:900,decoded:true,license:'Source notice'});
function project(){const text='Eric Rios won the tournament. This is the exact team he used. Pause here to copy the build.';return {id:'test',duration:44,format:'vertical',voiceId:'voice',captionStyle:{fontSize:51,bottom:.19},media:[voice],editingInstructions:brief,scenes:[{id:'scene',start:0,end:44,text,words:text.split(' ').map((text,i)=>({text,start:i*.6,end:i*.6+.5})),layers:[{id:'background',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:44},{id:'logo',type:'image',role:'game-logo',mediaId:'logo',x:.2,y:.2,width:.6,height:.3,z:10,start:0,end:44}]}]};}
const state=()=>({models:{reasoning:{name:'controlled-model'}},settings:{url:'http://127.0.0.1:11434'},signal:new AbortController().signal,inferenceEvents:[]});
const proposal=()=>({requirements:[{kind:'image',name:'Eric Rios',type:'person',franchise:'unknown',query:'Eric Rios Pokemon player photo',sceneId:'scene',quote:'Eric Rios',duration:4,members:[]},{kind:'group',name:'Full team',type:'pokemon',franchise:'pokemon',query:'',sceneId:'scene',quote:'This is the exact team',duration:5,members:[]}]});
function stubModel(t,result){const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});globalThis.fetch=async()=>Response.json({message:{content:JSON.stringify(result)}});}

test('general default/reference style guidance is not mistaken for a script-specific picture or team request',()=>{
 const defaults=[DEFAULT_INSTRUCTIONS,POKEMON_GOLD_BRIEF,CINEMATIC_POKEMON_BRIEF].join('\n');assert.equal(explicitVisualBrief(defaults),'');assert.equal(explicitVisualBrief(defaults+'\nShow a photo of Eric Rios.'),'Show a photo of Eric Rios.');
});

test('structured team-only images are not revealed in an unrelated opening scene',async t=>{
 const value=proposal();value.requirements.push({kind:'image',name:'Gholdengo',type:'pokemon',franchise:'pokemon',query:'Gholdengo official artwork',sceneId:'scene',quote:'Eric Rios',duration:4,members:[]});stubModel(t,value);const result=await planVisualInstructions(project(),brief,state());assert.equal(result.filter(r=>r.kind==='image').length,1);assert.ok(result.some(r=>r.kind==='group'&&r.members.length===2));
});

test('the exact failed wording and informal person references enter subject resolution',()=>{
 for(const request of ['add a picture of the guy im talking abt at the start when i say his name','Show a photo of that dude I mentioned','Add an image of the creator I am discussing','put a picture of the woman I am talking about','Show images of him at the start'])assert.equal(needsImageResolution(request),true,request);
 assert.equal(needsImageResolution('Add a Flamethrower move picture'),false);
});
test('static Google WebP photos use a still-image renderer, while real GIF/WebP animation remains frame-driven',()=>{
 assert.equal(imagePlayback({path:'photo.webp',animationInfo:{animated:false,frames:1}}),'still');assert.equal(imagePlayback({path:'photo.webp'}),'still');assert.equal(imagePlayback({path:'single.gif',animationInfo:{animated:false}}),'still');assert.equal(imagePlayback({path:'motion.webp',animationInfo:{animated:true}}),'animated');assert.equal(imagePlayback({path:'motion.gif',animationInfo:{animated:true}}),'gif');assert.equal(imagePlayback({path:'old-sprite.gif'}),'gif');
});
test('the exact failed request resolves Eric Rios at his first name cue and adds a visible original photo instead of searching for the word guy',async()=>{
 const p=project();p.media.push(art('logo'));let queried=[];
 const settings={model:'controlled-model',url:'http://127.0.0.1:11434',fetchImpl:async()=>Response.json({message:{content:JSON.stringify({subjects:[{name:'Eric Rios',query:'Eric Rios photo',sceneId:'scene',quote:'Eric Rios',placement:''}]})}})};
 const assets=createRevisionAssets({library:()=>[],search:async(q,provider)=>{queried.push(q);return provider==='google-images'?[{...art('eric'),id:'candidate',provider,name:'Eric Rios official tournament photo',url:'https://publisher.example/eric.jpg',attribution:{source:'https://publisher.example/eric-rios',description:'Eric Rios official tournament photo'},usageStatus:'requires-user-rights'}]:[];},download:async c=>({...c,...art('photo'),provider:'google-images',name:c.name,webAssessment:{accepted:true},usageStatus:'unverified'})});
 const direct=createDirectChanges({assets,resolveImages:(p,r,c)=>needsImageResolution(r)?resolveRevisionImages(p,r,c,settings):null});
 const n=await direct(p,'add a picture of the guy im talking abt at the start when i say his name',{scope:'whole'},{'google-images':'controlled-key'});
 assert.ok(queried.length);assert.ok(queried.every(q=>!/guy|official artwork/i.test(q)));const picture=n.scenes[0].layers.find(l=>l.mediaId==='photo');assert.equal(picture.start,0);assert.equal(picture.end,4);assert.equal(picture.width,.68);assert.equal(picture.role,'story-picture');assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(n.voiceId,p.voiceId);
});
test('quick drafts may use decoded original named photos while unrelated pictures and merchandise still fail matching',()=>{
 const entity={name:'Eric Rios',type:'person'};assert.equal(namedImageMatch(entity,{name:'Eric Rios portrait',selection:{accepted:true,score:.69}}),true);assert.equal(namedImageMatch(entity,{name:'Someone Else portrait',selection:{accepted:true,score:.69}}),false);assert.equal(namedImageMatch(entity,{name:'Eric Rios toy figurine',selection:{accepted:true}}),false);
});
test('supplied teams preserve each member, item and all stat values instead of inventing or swapping sets',()=>{
 const members=parseSuppliedTeam(brief);assert.equal(members.length,2);assert.equal(members[0].name,'Gholdengo');assert.equal(members[0].item,'Life Orb');assert.ok(members[0].facts.includes('EVs: 17 HP / 7 SpA / 22 SpD / 20 Spe'));assert.equal(members[1].item,'Rocky Helmet');assert.ok(members[1].facts.includes('- Rage Powder'));
 const markdown='All Pokémon are Level 50. Label them "SP".\n**GARCHOMP — MEGA Z**\nHeld Item: Garchompite Z\nBase Ability: Rough Skin\nMega Ability: Levitate\nNature / Stat Alignment: Modest\nStat Points:\n4 Def / 30 SpA / 32 Spe\nMoves:\n- Dragon Pulse\n- Earth Power\n- Power Gem\n- Protect\n';const [mega]=parseSuppliedTeam(markdown);assert.equal(mega.name,'GARCHOMP — MEGA Z');assert.ok(mega.facts.includes('SP: 4 Def / 30 SpA / 32 Spe'));assert.ok(mega.facts.includes('Mega Ability: Levitate'));assert.ok(mega.facts.includes('Level 50'));assert.ok(mega.facts.includes('Protect'));
});
test('creation requirements execute real image, item and complete build layers even when members were supplied only in instructions',async t=>{
 stubModel(t,proposal());const p=project();p.media.push(art('logo'));const requested=[];
 const assets=createRevisionAssets({library:()=>[{...art('eric'),name:'Eric Rios photo',identity:{subject:'Eric Rios',source:'User-confirmed source'}}],search:async()=>[],download:async()=>{throw Error('Use verified cached photo');}});
 const execute=createVisualInstructions({assets,memberImage:async m=>{requested.push(m.name);return art(m.name);},itemImage:async name=>({...art(name),name})});const n=await execute(p,brief,state());
 assert.equal(n.visualInstructionReport.applied.length,2);assert.deepEqual(requested.sort(),['Gholdengo','Volcarona']);assert.equal(n.visualInstructionReport.applied[1].members.length,2);assert.equal(n.scenes[0].layers.filter(l=>l.role==='item').length,2);assert.ok(n.scenes[0].layers.some(l=>l.text==='- Make It Rain'));assert.ok(n.scenes[0].layers.some(l=>l.text==='EVs: 13 HP / 30 Def / 23'));
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.equal(n.voiceId,p.voiceId);validateProject(n);
 n.publicationWarnings=['The original recording is incomplete'];const logged=recordRevision(p,n,brief,[],'Required visuals applied','Required visual execution'),undone=undoRedo(logged,'undo');assert.deepEqual(undone.scenes,p.scenes);assert.equal(undone.visualInstructionReport,undefined);assert.equal(undone.publicationWarnings,undefined);const restored=undoRedo(undone,'redo');assert.deepEqual(restored.scenes,n.scenes);assert.deepEqual(restored.visualInstructionReport,n.visualInstructionReport);assert.deepEqual(restored.publicationWarnings,n.publicationWarnings);
});
test('a model cannot silently omit the team or required person and metadata-only edits are rejected',async t=>{
 const value=proposal();value.requirements.pop();stubModel(t,value);const p=project();p.editingInstructions='Show a picture of the guy and his full team.';await assert.rejects(planVisualInstructions(p,p.editingInstructions,state()),/omitted the requested team/);
});
test('a structured supplied team is still executed when the actual model omits that requirement',async t=>{
 const value=proposal();value.requirements.pop();stubModel(t,value);const result=await planVisualInstructions(project(),brief,state());const group=result.find(r=>r.kind==='group');assert.ok(group);assert.equal(group.members.length,2);assert.equal(group.quote,'team');assert.ok(group.members[0].facts.includes('EVs: 17 HP / 7 SpA / 22 SpD / 20 Spe'));
});
test('long creation and remake briefs retain their opening and complete build data rather than chopping off the first 12000 characters',()=>{
 const p=project();p.media.push(art('logo'));p.editingInstructions='OPENING: Show Eric Rios.\n'+('Preserve the actual recording and purposeful motion.\n'.repeat(280))+'FULL BUILD: Life Orb, 17 HP / 7 SpA / 22 SpD / 20 Spe';assert.ok(p.editingInstructions.length>12000);validateProject(p);for(const fresh of [true,false]){const instructions=rebuildInstructions(p,'Add the specified full team.',{fresh});assert.ok(instructions.startsWith('OPENING: Show Eric Rios.'));assert.ok(instructions.includes('17 HP / 7 SpA / 22 SpD / 20 Spe'));}
});
test('a missing online image remains a visible unresolved request instead of reporting a fake successful addition',async t=>{
 const value=proposal();value.requirements.pop();stubModel(t,value);const p=project();p.editingInstructions='Show a picture of Eric Rios.';p.media.push(art('logo'));const assets=createRevisionAssets({library:()=>[],search:async()=>[],download:()=>{throw Error('No original image returned');}});const execute=createVisualInstructions({assets,memberImage:()=>{},itemImage:()=>{}}),n=await execute(p,p.editingInstructions,state());assert.equal(n.visualInstructionReport.applied.length,0);assert.equal(n.visualInstructionReport.missing.length,1);assert.ok(n.pendingRevision);assert.ok(n.visualInstructionWarnings[0].includes('Eric Rios'));
});
test('already compiled supplied requirements execute without requiring an installed model just to label the report',async()=>{
 const p=project();p.media.push(art('logo'));const assets=createRevisionAssets({library:()=>[{...art('eric'),name:'Eric Rios photo',identity:{subject:'Eric Rios',source:'User-confirmed source'}}],search:async()=>[],download:async()=>{throw Error('Use verified cached photo');}});
 const execute=createVisualInstructions({assets,memberImage:async m=>art(m.name),itemImage:async name=>({...art(name),name}),plan:()=>{throw Error('The supplied plan must not be planned again');}}),requirements=proposal().requirements;requirements[1].members=parseSuppliedTeam(brief);
 const n=await execute(p,brief,{models:{}},{},()=>{},{requirements});assert.equal(n.visualInstructionReport.applied.length,2);assert.equal(n.visualInstructionReport.model,'Supplied scene blueprint');assert.equal(n.visualInstructionReport.missing.length,0);validateProject(n);
});
