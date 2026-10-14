import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
import {applyNarrativeHook,planNarrativeHook} from '../electron/narrative-hook.mjs';
import {applyVisualCadence} from '../electron/visual-cadence.mjs';
import {applyCreativeActions,validateCreativeActions,planCreativeActions,acquireCreativeProps} from '../electron/creative-actions.mjs';
import {placementFor} from '../electron/layer-motion.mjs';
import {visibleRanges} from '../electron/layer-visibility.mjs';
import {planNarratedActions} from '../electron/action-movie.mjs';
import {planMoveEffects} from '../electron/move-effects.mjs';
import {enrichShortMechanics} from '../electron/short-mechanics.mjs';
import {createSourceMoveCards,applySourceMoveCards} from '../electron/source-move-cards.mjs';
import {stageMechanicLayout} from '../electron/mechanic-layout.mjs';
import {artworkBox,arrangeOverlays} from '../electron/overlay-layout.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {createWebImages} from '../electron/web-images.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
import {renderProject} from '../electron/render-project.mjs';
import {creativeRequest} from '../electron/creative-request.mjs';
import {compileCreativeRecipes} from '../electron/creative-recipes.mjs';
import {latestBrief,applyLatestSwitches} from '../electron/instruction-priority.mjs';
const words=text=>text.split(' ').map((text,i)=>({text,start:i*.3,end:i*.3+.26}));
const actor=(id,x)=>({id:'actor-'+id,type:'image',role:'subject',mediaId:id,x,y:.18,width:.36,height:.35,z:10,start:0,end:10,animation:'none',exit:'none'});
function fixture(text='Rotom checks Charizard with Shadow Ball.'){
 const w=words(text);return {id:'creative-fixture',name:'Creative',voiceId:'v',format:'vertical',duration:10,gameSelection:'pokemon',captionColor:'#ffffff',captionStyle:{fontSize:52,bottom:.20},editingInstructions:'Use creative relevant visual storytelling.',media:[{id:'v',kind:'audio'},...['rotom','charizard','gift'].map(id=>({id,name:id,kind:'image',width:400,height:400,license:'Fixture',pokemon:id==='gift'?undefined:{name:id,types:[id==='rotom'?'electric':'fire']}}))],pokemonMentions:['rotom','charizard'].map(id=>{const i=w.findIndex(w=>w.text.toLowerCase().replace(/[^a-z]/g,'')===id);return {mediaId:id,name:id,status:'ready',start:w[i]?.start??0,end:w[i]?.end??.3};}),scenes:[{id:'s',start:0,end:10,text,words:w,reaction:{entities:['rotom','charizard'].map(id=>({id,name:id,type:'pokemon',mediaId:id})),metrics:[]},layers:[actor('rotom',.08),actor('charizard',.57)]}]};
}
const center=p=>({x:p.motion.x+p.width/2,y:p.motion.y+p.height/2});
test('creative AI Changes are routed to trained planning while exact manual properties and AI opt-out remain direct',()=>{
 for(const request of ['Give it way more creativity','Animate the narration','More images and sound effects','Put a new image every two seconds','Show Pokemon checking the opponent with a move','Find move description images from Google','Make a Wolfey style intro','Use a mystery hook with silhouettes'])assert.equal(creativeRequest(request),true,request);
 for(const request of ['Make the background red','Move this layer left','Set volume to 20 percent','Hide captions','Put Choice Scarf on Rotom'])assert.equal(creativeRequest(request),false,request);
 assert.equal(creativeRequest('More images and animations',{useAI:false}),false);
});
test('unnamed Pokemon hook gets anonymous silhouettes and question marks, then releases the actual spoken reveal',()=>{
 const p=fixture('These Pokemon are absolutely incredibly terrifying. Rotom checks Charizard with Shadow Ball.'),n=applyNarrativeHook(p);assert.equal(n.hookReport.kind,'mystery');
 const silhouettes=n.scenes[0].layers.filter(l=>l.silhouette);assert.equal(silhouettes.length,2);assert.equal(n.scenes[0].layers.filter(l=>l.role==='hook-question').length,2);
 assert.ok(silhouettes.every(l=>l.start<n.pokemonMentions.find(m=>m.mediaId===l.mediaId).start));assert.ok(silhouettes.every(l=>l.end<=n.pokemonMentions[0].start));assert.equal(n.scenes[0].layers.filter(l=>l.type==='text').map(l=>l.text).join(''), '??');
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(applyNarrativeHook(n),n);const saved=recordRevision(p,n,'Mystery hook',[],'Hook','Test');assert.deepEqual(undoRedo(saved,'undo').scenes,p.scenes);assert.ok(!undoRedo(saved,'undo').hookReport);
 assert.ok(!renderProject(n).scenes[0].hookSourceLayers);assert.ok(renderProject(n).scenes[0].layers.some(l=>l.silhouette));
});
test('opening claims choose distinct relevant hooks, and manual/no-intro instructions are respected',()=>{
 assert.equal(planNarrativeHook(fixture('Why is Rotom so useful?')).kind,'question');assert.equal(planNarrativeHook(fixture('Rotom threatens Charizard.')).kind,'challenge');assert.equal(planNarrativeHook(fixture('Rotom and Charizard work together.')).kind,'comparison');
 const p=fixture('These Pokemon are absolutely incredibly terrifying. Rotom appears.'),manual=structuredClone(p);manual.scenes[0].layers[0].manual=true;assert.ok(!applyNarrativeHook(manual).scenes[0].layers.some(l=>l.silhouette));p.editingInstructions+=' No mystery intro';assert.ok(!applyNarrativeHook(p).hookReport);
});
test('checks/counters/threats use the named move class and correct attacker; negation and learning do not invent an attack',()=>{
 for(const verb of ['checks','counters','threatens']){const p=fixture('Rotom '+verb+' Charizard with Shadow Ball.'),cue=planMoveEffects(p)[0],plan=planNarratedActions(p)[0];assert.ok(cue.action,verb);assert.equal(plan.attackerId,'rotom');assert.equal(plan.defenderId,'charizard');assert.equal(plan.moveName,'shadow-ball');assert.equal(plan.damageClass,'special');assert.equal(plan.type,'ghost');assert.ok(plan.start>=p.pokemonMentions[1].end);assert.equal(plan.outcome,'recoil');}
 assert.equal(planNarratedActions(fixture('Rotom cannot check Charizard with Shadow Ball.')).length,0);assert.equal(planMoveEffects(fixture('Rotom learns Shadow Ball.'))[0].action,false);
 assert.ok(planNarratedActions(fixture('Rotom checks Charizard.')).length);
});
test('split and misheard move names resolve against actual catalog data without turning Plus conjunction into an ability',async()=>{
 const p=fixture('Rotom uses sword stance. Plus it has good synergy.'),service={mechanicCatalog:async()=>[{name:'swords-dance',kind:'move'},{name:'plus',kind:'ability'}],mechanic:async(kind,name)=>({kind,name,title:'Swords Dance',damageClass:'status',source:'https://example.org/data'})};
 const n=await enrichShortMechanics(p,service);assert.equal(n.shortMechanics.cues.length,1);assert.equal(n.shortMechanics.cues[0].name,'swords-dance');assert.equal(n.shortMechanics.cues[0].corrected,true);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
 assert.equal(planMoveEffects(fixture('Rotom uses Shadowball.'))[0].name,'shadow-ball');assert.equal(planMoveEffects(fixture('Rotom uses Thunder bolt.'))[0].name,'thunderbolt');
});
test('standalone sourced props animate without a named actor; multiple distinct beats survive and facts/captions remain intact',()=>{
 const p=fixture('This idea looks good on paper but collapses later with a twist.');p.scenes[0].reaction.entities=[];p.scenes[0].layers=[];
 const action=(i,quote)=>({quote,wordIndex:i,duration:.7,reason:'Visual metaphor',props:[{id:'gift-'+i,query:'wrapped gift transparent PNG',attachTo:'stage',anchor:'stage',position:{x:.3,y:.2},size:.25}],tracks:[{targetId:'gift-'+i,keyframes:[{at:0,scale:1},{at:.3,scale:1.4,rotation:15},{at:.7,scale:.3,opacity:0}]}],sound:'boing'});
 p.scenes[0].editorialPlan={creativeActions:[action(1,'idea'),action(5,'paper'),action(10,'a')]};p.creativePropAssets={'s/0/gift-1':'gift','s/1/gift-5':'gift','s/2/gift-10':'gift'};
 const n=applyCreativeActions(p);assert.equal(n.creativeActionReport.events.length,3);const props=n.scenes[0].layers.filter(l=>l.role==='creative-stage-prop');assert.equal(props.length,3);assert.ok(props.every(l=>!l.attachment&&l.mediaId==='gift'));assert.ok(props[0].keyframes[1].scale>props[0].keyframes[0].scale);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(n.captionStyle,p.captionStyle);
});
test('sourced prop handoff travels continuously between measured hands and remains attached to its recipient',()=>{
 const p=fixture('Rotom gives Charizard a gift.'),a={quote:'gift.',wordIndex:4,duration:2,reason:'Share the useful tool',props:[{id:'gift',query:'wrapped gift transparent PNG',attachTo:'rotom',anchor:'hand',size:.2}],tracks:[{targetId:'gift',handoffAt:.4,handoffTo:'charizard',handoffAnchor:'hand',keyframes:[{at:0,scale:1},{at:1.5,scale:1}]}]};p.scenes[0].editorialPlan={creativeActions:[a]};p.creativePropAssets={'s/0/gift':'gift'};
 const n=applyCreativeActions(p),ls=n.scenes[0].layers,held=ls.find(l=>l.id==='s-creative-0-gift'),flight=ls.find(l=>l.id.endsWith('-handoff')),received=ls.find(l=>l.id.endsWith('-received'));assert.ok(flight&&received);assert.equal(received.attachment.targetId,'actor-charizard');
 const before=center(placementFor(held,ls,n.media,held.end,1080,1920)),depart=center(placementFor(flight,ls,n.media,flight.start,1080,1920));assert.ok(Math.abs(before.x-depart.x)<.0001&&Math.abs(before.y-depart.y)<.0001);
 const arrive=center(placementFor(flight,ls,n.media,flight.end,1080,1920)),caught=center(placementFor(received,ls,n.media,received.start,1080,1920));assert.ok(Math.abs(arrive.x-caught.x)<.0001&&Math.abs(arrive.y-caught.y)<.0001);assert.equal(n.creativeActionReport.events[0].handoffs.length,1);assert.ok(n.creativeActionReport.sounds.some(s=>s.reason.includes('caught')));assert.deepEqual(applyCreativeActions(n).scenes,n.scenes);
 assert.throws(()=>validateCreativeActions(p.scenes[0],[{...a,tracks:[{...a.tracks[0],handoffTo:'unknown'}]}]),/handoff/);
});
test('creative author expands an existing small action using surrounding narration, alternatives and a separate creative sampling setting',async()=>{
 const p=fixture('Rotom reveals a clever hidden plan.'),existing={quote:'clever',wordIndex:3,duration:.7,reason:'Old wobble',props:[],tracks:[{targetId:'rotom',keyframes:[{at:0,dx:0},{at:.6,dx:.02}]}]};p.scenes[0].editorialPlan={creativeActions:[existing]};
 const state={mode:'high',models:{editing:{name:'trained-editor'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]};let calls=0;
 const n=await planCreativeActions(p,state,()=>{},async(_u,o)=>{const b=JSON.parse(o.body),context=JSON.parse(b.messages[1].content);assert.equal(b.options.temperature,.6);assert.equal(context.scene.existingActions.length,1);assert.equal(context.story.hook,true);calls++;return Response.json({message:{content:JSON.stringify({ideas:['Open a real gift box','Pull a curtain aside','Drop a decoy'],selectedIdea:0,actions:[{...existing,reason:'Expose the hidden plan',props:[{id:'gift',query:'gift box transparent PNG',attachTo:'stage',anchor:'stage',position:{x:.5,y:.2},size:.2}],tracks:[{targetId:'gift',keyframes:[{at:0,scale:.2},{at:.6,scale:1.2}]}]}]})}});});
 assert.equal(calls,1);assert.equal(n.creativePlanningReport.decisions[0].ideas.length,3);assert.equal(n.scenes[0].editorialPlan.creativeActions[0].props[0].id,'gift');
});
test('quiet intervals receive actual motion and sound cues about every two seconds; readable evidence and no-motion directives hold',()=>{
 const p=fixture('Rotom explains this important plan.');p.scenes[0].words.forEach((w,i)=>{w.start=i*2;w.end=i*2+1.5;});const n=applyVisualCadence(p);assert.deepEqual(n.cadenceReport.events.map(e=>e.start),[2,4,6,8]);assert.ok(n.scenes[0].layers[0].keyframes.some(k=>k.scale>1));assert.deepEqual(applyVisualCadence(n),n);
 p.scenes[0].layers.push({id:'evidence',type:'shape',role:'chart',x:0,y:0,width:.1,height:.1,z:30,start:0,end:10});const beside=applyVisualCadence(p);assert.ok(beside.cadenceReport.events.length>0);assert.deepEqual(beside.scenes[0].layers.find(l=>l.id==='evidence'),p.scenes[0].layers.find(l=>l.id==='evidence'));p.editingInstructions+=' No animation';assert.ok(!applyVisualCadence(p).cadenceReport);
});
test('real Google ability descriptions render as images and strict mode never draws an invented fallback',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-source-ability-'));t.after(()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-source-ability-'));fs.rmSync(folder,{recursive:true,force:true});});const file=path.join(folder,'description.png');await sharp({create:{width:1100,height:400,channels:4,background:'white'}}).png().toFile(file);
 const p=fixture(),cue={kind:'ability',name:'lightning-rod',title:'Lightning Rod',description:'Draws in Electric moves and raises Special Attack.',sceneId:'s',start:1,end:10};p.shortMechanics={cues:[cue]};p.scenes[0].layers.push({id:'ability',type:'group',role:'mechanic-card',setupGraphic:{kind:'ability',title:'Lightning Rod'},x:.1,y:.5,width:.8,height:.2,z:50,start:1,end:3});
 const service=createSourceMoveCards(folder,{search:async(q,provider)=>q.includes('Lightning Rod')?[{id:'real',name:'Information screenshot'}]:[],download:async()=>({id:'real',kind:'image',path:file,decoded:true,width:1100,height:400,attribution:{credit:'Actual source',source:'https://example.org/ability'}}),verify:async()=>({available:true,accepted:true,name:'Lightning Rod',description:cue.description})});
 const acquired=await service.acquire(p,{keys:{'google-images':'fixture'}}),n=applySourceMoveCards(acquired,{requireImages:true}),card=n.scenes[0].layers.find(l=>l.id==='ability');assert.equal(card.type,'image');assert.equal(card.mediaId,'real');assert.ok(!card.setupGraphic);assert.equal(n.media.find(m=>m.id==='real').assetRole,'ability-card');assert.equal(n.media.find(m=>m.id==='real').attribution.credit,'Actual source');
 const missing=applySourceMoveCards(p,{requireImages:true});assert.ok(!missing.scenes[0].layers.some(l=>l.setupGraphic?.kind==='ability'));assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('description cards and automatic actors get separate lanes while attached props follow the moved actor',()=>{
 const p=fixture();p.scenes[0].layers[0]={...actor('rotom',.1),y:.03,width:.8,height:.6};p.scenes[0].layers[1].end=.5;p.media.push({id:'description',kind:'image',width:1100,height:400});p.scenes[0].layers.push({id:'description',sourceMoveCard:true,type:'image',role:'mechanic-card',mediaId:'description',x:.07,y:.05,width:.86,height:.19,z:60,start:1,end:4},{id:'held',type:'image',role:'item',mediaId:'gift',x:0,y:0,width:.1,height:.1,z:12,start:0,end:10,attachment:{targetId:'actor-rotom',anchor:'hand',x:.6,y:.6,size:.2}});
 const n=stageMechanicLayout(p),s=n.scenes[0],copy=s.layers.find(l=>l.mechanicStaged);assert.ok(copy);const a=artworkBox(copy,s.layers,n.media,2,1080,1920),c=artworkBox(s.layers.find(l=>l.id==='description'),s.layers,n.media,2,1080,1920);assert.ok(a.y>=c.y+c.h+.02);assert.ok(placementFor(s.layers.find(l=>l.id==='held'),s.layers,n.media,2,1080,1920).motion.opacity>.9);assert.deepEqual(stageMechanicLayout(n).scenes,n.scenes);assert.deepEqual(n.captionStyle,p.captionStyle);
});
test('overlay gutters include a keyframe peak that the old three time samples missed',()=>{
 const p=fixture();p.scenes[0].layers=[{id:'fixed',manual:true,type:'shape',role:'supporting-image',x:.55,y:.1,width:.2,height:.15,z:2,start:0,end:10},{id:'moving',type:'image',role:'supporting-image',mediaId:'gift',x:.2,y:.1,width:.2,height:.15,z:3,start:0,end:10,keyframes:[{time:0,x:.2},{time:1.4,x:.5},{time:2,x:.2},{time:10,x:.2}]}];
 const n=arrangeOverlays(p);assert.ok(n.overlayLayoutReport.adjustments.some(a=>a.layerId==='moving'));assert.deepEqual(n.scenes[0].layers[0],p.scenes[0].layers[0]);assert.deepEqual(n.captionStyle,p.captionStyle);
});
test('visual pops, game clicks and handoff swooshes reach actual sound clips without replaying narration',()=>{
 const base=fixture('Rotom explains this important plan.');base.scenes[0].words.forEach((w,i)=>{w.start=i*2;w.end=i*2+1.5;});const p=applyVisualCadence(base),sounds=['pop','whoosh','click'].map(cue=>({id:'sound-'+cue,name:'Pokemon '+cue,kind:'audio',assetRole:'sound-effect',identity:{franchise:'pokemon'},tags:cue,license:'Fixture',duration:.18}));p.hookReport={events:[{start:.1,cue:'pop',priority:10,reason:'Hook reveal'},{start:.36,cue:'click',priority:10,reason:'Question appears'}]};p.creativeActionReport={sounds:[{start:1,cue:'whoosh',priority:11,reason:'Animated prop handoff'}]};
 const n=automaticSounds(p,sounds);assert.ok(n.soundEffects.length>=7);assert.ok(n.soundEffects.some(c=>c.cue==='whoosh'));assert.ok(n.soundEffects.some(c=>c.mediaId==='sound-click'));assert.ok(n.soundEffects.every(c=>c.mediaId!=='v'));assert.deepEqual(automaticSounds(n,sounds).soundEffects,n.soundEffects);
});
test('Google generations are unlimited, including legacy saved limits',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-image-budget-'));t.after(()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-image-budget-'));fs.rmSync(folder,{recursive:true,force:true});});fs.writeFileSync(path.join(folder,'google-state.json'),JSON.stringify({maxSearches:2,budgetVersion:2}));const service=createWebImages(folder,{getKey:()=>''});assert.equal(service.status().maxSearches,0);assert.equal(service.configure({maxSearches:48}).unlimited,true);assert.equal(service.configure({maxSearches:2}).maxSearches,0);assert.equal(createWebImages(folder,{getKey:()=>''}).status().maxSearches,0);
});
test('an unavailable preferred editor uses a real configured model and reports the model that actually authored the idea',async()=>{
 const p=fixture('Rotom reveals a clever plan.'),state={mode:'high',models:{editing:{name:'unavailable'},reasoning:{name:'working'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]},calls=[];
 const n=await planCreativeActions(p,state,()=>{},async(_u,o)=>{const b=JSON.parse(o.body);calls.push(b.model);if(b.model==='unavailable')throw Error('Editor unavailable');return Response.json({model:'working',message:{content:JSON.stringify({ideas:['Actor peeks around a prop','Actor signals its surprise'],selectedIdea:1,actions:[{quote:'clever',wordIndex:3,duration:.8,reason:'Signal the reveal',props:[],tracks:[{targetId:'rotom',keyframes:[{at:0,rotation:0},{at:.4,rotation:-8},{at:.8,rotation:0}]}]}]})}});});
 assert.deepEqual(calls,['unavailable','working']);assert.equal(n.creativePlanningReport.model,'working');assert.equal(n.creativePlanningReport.actions,1);assert.ok(n.creativePlanningReport.warnings.some(w=>w.includes('preferred')));assert.ok(state.inferenceEvents.some(e=>e.model==='working'&&e.performed&&e.accepted));
});
test('Google stage reactions keep actual opaque GIF frames and respect explicit GIF and silent-action instructions',async()=>{
 const p=fixture('Rotom finds this scary.'),a={quote:'scary.',wordIndex:3,duration:1,reason:'A fitting moving reaction',props:[{id:'reaction',query:'dog teeth chattering gif',attachTo:'stage',anchor:'stage',position:{x:.6,y:.12},size:.25}],tracks:[{targetId:'reaction',keyframes:[{at:0,scale:.7},{at:.8,scale:1}]}],sound:'none'};p.scenes[0].editorialPlan={creativeActions:[a]};let searches=0;
 const options={keys:{'google-images':'fixture'},search:async(_q,provider,_key,opts)=>{searches++;assert.equal(provider,'google-images');assert.equal(opts.type,'GIF');return [{id:'gif',name:'Dog teeth chattering',webAssessment:{accepted:true,autoEligible:true}}];},download:async()=>({id:'gif',kind:'image',decoded:true,transparent:false,width:500,height:300,animationInfo:{animated:true,frames:40},attribution:{source:'https://example.org/reaction.gif'}})};
 const acquired=await acquireCreativeProps(p,options),n=applyCreativeActions(acquired);assert.equal(n.media.find(m=>m.id==='gif').animationInfo.frames,40);assert.ok(n.scenes[0].layers.some(l=>l.mediaId==='gif'));assert.equal(n.creativeActionReport.sounds.length,0);
 const blocked=await acquireCreativeProps({...p,autoReactionGifs:false},options);assert.equal(searches,1);assert.equal(applyCreativeActions(blocked).creativeActionReport.events.length,0);
});
test('compact model recipes compile to real prop transfer and actor motion without model-generated coordinates',async()=>{
 const p=fixture('Rotom gives Charizard a gift.'),state={mode:'high',models:{editing:{name:'trained'}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal,limitations:[]};
 const n=await planCreativeActions(p,state,()=>{},async(_u,o)=>{const b=JSON.parse(o.body);assert.equal(b.format.required.includes('recipes'),true);assert.ok(b.options.num_predict>=1800);return Response.json({message:{content:JSON.stringify({ideas:['Pass a shared gift','Bounce the tool into a hand'],selectedIdea:0,recipes:[{kind:'handoff',quote:'gift.',wordIndex:4,duration:2,actorId:'rotom',targetId:'charizard',propQuery:'wrapped gift transparent PNG',anchor:'hand',reason:'Show sharing, not a duplicate gift'}]})}});});
 n.creativePropAssets={'s/0/prop-0':'gift'};const done=applyCreativeActions(n);assert.equal(done.creativeActionReport.events[0].handoffs.length,1);assert.ok(done.scenes[0].layers.some(l=>l.id.endsWith('-received')&&l.attachment.targetId==='actor-charizard'));assert.deepEqual(done.scenes[0].words,p.scenes[0].words);
 for(const kind of ['stage-image','prop-reveal','prop-drop','prop-launch','prop-crumple','approach','dash','size-contrast','reaction']){const actions=compileCreativeRecipes(p.scenes[0],[{kind,quote:'gift.',wordIndex:4,duration:1.8,actorId:'rotom',targetId:kind==='approach'?'charizard':undefined,propQuery:'wrapped gift transparent PNG'}]);assert.equal(validateCreativeActions(p.scenes[0],actions).length,1,kind);}
 assert.throws(()=>compileCreativeRecipes(p.scenes[0],[{kind:'handoff',actorId:'rotom',targetId:'invented',propQuery:'gift'}]),/unknown/);
});
test('new requests override obsolete quiet/silent preferences without disturbing caption rules or treating negation as permission',()=>{
 const old='Keep captions unchanged. No animation. Use minimal effects and no sound effects.';
 const next=latestBrief(old,'Add many animations, more effects and frequent sound effects.');assert.match(next,/Keep captions unchanged/);assert.ok(!/no animation|minimal effects|no sound effects/i.test(next));
 const changed=applyLatestSwitches({autoSoundEffects:false,autoReactionGifs:false,freezePokemonMotion:true},'Add more animations, frequent sound effects and more GIFs.');assert.equal(changed.autoSoundEffects,true);assert.equal(changed.autoReactionGifs,true);assert.equal(changed.freezePokemonMotion,false);
 assert.deepEqual(applyLatestSwitches({autoSoundEffects:false},"Don't add more sound effects"),{autoSoundEffects:false});assert.equal(latestBrief(old,'No more animations'),old);
});
