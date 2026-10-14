import test from 'node:test';import assert from 'node:assert/strict';
import {creativeSource} from '../electron/creative-sources.mjs';
import {imageBeatFormat,imageBeatRecipes} from '../electron/editorial-images.mjs';

test('incorrect legacy cue indexes are corrected by a unique exact quote and one bad image never cancels valid siblings',()=>{
 const p=project(),s=p.scenes[0],rejected=[];
 const recipes=imageBeatRecipes(s,[{quote:'Eric Rios',wordIndex:5,query:'Eric Rios photo',duration:2,framing:'focus'},{wordIndex:6,query:'Life Orb',duration:2,framing:'side'},{wordIndex:999,query:'wrong timing',duration:2,framing:'side'},{wordIndex:3,query:'Gholdengo',duration:2,framing:'side'},{wordIndex:3,query:'bad framing',duration:2,framing:'invalid'}],rejected);
 const batch=compileRecipeBatch(s,recipes,10);assert.equal(batch.actions.length,3);assert.equal(batch.actions[0].wordIndex,0);assert.equal(batch.rejected.length,0);assert.equal(rejected.length,2);
});
test('one invalid preexisting animation cannot discard other valid pictures at execution time',()=>{
 const p=project(),s=p.scenes[0],valid=compileRecipeBatch(s,[{kind:'stage-image',quote:'Eric Rios',wordIndex:0,propQuery:'Eric Rios',duration:2,framing:'focus'}]).actions[0];
 s.editorialPlan={creativeActions:[{quote:'invented words',wordIndex:0,duration:2,props:[],tracks:[]},valid]};p.creativePropAssets={'s/1/prop-0':'eric'};p.media.push(photo);
 const n=applyCreativeActions(p);assert.ok(n.scenes[0].layers.some(l=>l.role==='creative-stage-prop'&&l.mediaId==='eric'));assert.equal(n.creativeActionReport.skipped.length,1);
});
import {compileCreativeRecipes,creativeRecipeFormat} from '../electron/creative-recipes.mjs';
import {acquireCreativeProps,applyCreativeActions,compileRecipeBatch} from '../electron/creative-actions.mjs';
import {placementFor,propertyAt} from '../electron/layer-motion.mjs';
import {auditVisuals} from '../electron/storyboard.mjs';
const photo={id:'eric',kind:'image',name:'Eric Rios official tournament photograph',path:'photo.webp',width:1200,height:900,decoded:true,provider:'google-images',webAssessment:{accepted:true},identity:{subject:'Eric Rios',franchise:'unknown'},attribution:{source:'https://publisher.example/eric-rios'}};
const mon={id:'gholdengo',kind:'pokemon',name:'Gholdengo',path:'gholdengo.png',width:600,height:600,license:'Pokemon source notice',pokemon:{name:'gholdengo',displayName:'Gholdengo'}};
function project(){const words='Eric Rios explains Gholdengo and its Life Orb build clearly'.split(' ').map((text,i)=>({text,start:i*.7,end:i*.7+.6}));return {id:'fresh',duration:8,format:'vertical',voiceId:'voice',captionStyle:{fontSize:51,bottom:.19},media:[{id:'voice',kind:'audio'},mon],scenes:[{id:'s',start:0,end:8,text:words.map(w=>w.text).join(' '),words,reaction:{entities:[{id:'gholdengo',name:'Gholdengo',type:'pokemon',mediaId:mon.id,start:2.1}]},layers:[{id:'lead',type:'image',role:'subject',mediaId:mon.id,x:.1,y:.18,width:.8,height:.48,z:25,start:0,end:8,animation:'none'}]}]};}
const recipe=(p,framing='side')=>compileCreativeRecipes(p.scenes[0],[{kind:'stage-image',quote:'Eric Rios',wordIndex:0,duration:2.4,propQuery:'Eric Rios player portrait photograph',framing,reason:'Show the actual named person'}]);
test('a named original photo is found despite a different old search query, and is not discarded when no Google key is present',async()=>{
 const p=project();p.scenes[0].editorialPlan={creativeActions:recipe(p,'focus')};let searches=0;const n=await acquireCreativeProps(p,{library:[photo],search:()=>{searches++;throw Error('No key');}});assert.equal(searches,0);assert.equal(Object.values(n.creativePropAssets)[0],photo.id);assert.equal(n.creativeSourceReport[0].status,'resolved');assert.equal(n.creativePropWarnings.length,0);
});
test('native characters and actual item icons qualify by subject, while back sprites, future characters and authored build pictures do not',()=>{
 const p=project(),prop={anchor:'stage',query:'Pokemon Gholdengo official artwork'};assert.equal(creativeSource(p,p.scenes[0],prop,[mon],3).id,mon.id);assert.equal(creativeSource(p,p.scenes[0],prop,[mon],1),undefined);assert.equal(creativeSource(p,p.scenes[0],prop,[{...mon,generatedForProject:true}],3),undefined);assert.equal(creativeSource(p,p.scenes[0],prop,[{...mon,pokemon:{...mon.pokemon,sourceKey:'back_default'}}],3),undefined);
 const orb={id:'orb',name:'Life Orb',kind:'image',path:'orb.png',license:'Source notice',transparent:true,assetRole:'item',identity:{subject:'life-orb',franchise:'pokemon'}};assert.equal(creativeSource(p,p.scenes[0],{anchor:'stage',query:'Pokemon Life Orb item icon'},[orb],5).id,'orb');
});
test('all Google candidates are attempted: an original picture after the old four-candidate cap can be inserted',async()=>{
 const p=project();p.scenes[0].editorialPlan={creativeActions:recipe(p)};let downloaded=0;const n=await acquireCreativeProps(p,{keys:{'google-images':'fixture'},search:async()=>Array.from({length:7},(_,i)=>({id:String(i),name:'Eric Rios photo',webAssessment:{accepted:true}})),download:async c=>{downloaded++;if(Number(c.id)<5)throw Error('Original file unavailable');return {...photo,id:c.id};}});assert.equal(downloaded,6);assert.equal(Object.values(n.creativePropAssets)[0],'5');
});
test('a main photo is large, above the previous subject, and actually visible at its cue without changing words or captions',async()=>{
 const p=project();p.scenes[0].editorialPlan={creativeActions:recipe(p,'focus')};const acquired=await acquireCreativeProps(p,{library:[photo]}),n=applyCreativeActions(acquired),layer=n.scenes[0].layers.find(l=>l.mediaId===photo.id);assert.ok(layer.width>=.85);assert.ok(layer.z>25);assert.ok(n.scenes[0].layers.find(l=>l.id==='lead').excludedRanges.some(r=>r.start===0));assert.ok(placementFor(layer,n.scenes[0].layers,n.media,.5,1080,1920).motion.opacity>.95);assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('side evidence gives the continuing character a smooth, separate lane and restores its original geometry afterward',async()=>{
 const p=project();p.scenes[0].editorialPlan={creativeActions:recipe(p)};const n=applyCreativeActions(await acquireCreativeProps(p,{library:[{...photo,width:900,height:1200}]})),lead=n.scenes[0].layers.find(l=>l.id==='lead'),picture=n.scenes[0].layers.find(l=>l.mediaId===photo.id),a=placementFor(lead,n.scenes[0].layers,n.media,1,1080,1920),b=placementFor(picture,n.scenes[0].layers,n.media,1,1080,1920);assert.ok(a.motion.x+a.width+.02<b.motion.x);assert.equal(propertyAt(lead,'width',3),.8);assert.ok(!n.creativeActionReport.skipped.length);
});
test('source pictures have their own two-second planning slots and do not displace a full actor-action budget',()=>{
 const p=project(),s=p.scenes[0],format=creativeRecipeFormat(6,s);assert.ok(format.required.includes('imageBeats'));assert.ok(imageBeatFormat(s).minItems>=3);const actor=compileRecipeBatch(s,Array.from({length:6},()=>({kind:'reaction',actorId:'gholdengo',quote:'Gholdengo',wordIndex:3,duration:1,reason:'Actual actor'})),6);assert.equal(actor.actions.length,6);const pictures=compileRecipeBatch(s,imageBeatRecipes(s,[{quote:'Eric Rios',wordIndex:0,query:'Eric Rios portrait',duration:2,framing:'focus'},{quote:'Life Orb',wordIndex:6,query:'Pokemon Life Orb item',duration:2,framing:'side'}]),4);assert.equal(pictures.actions.length,2);
});
test('neutral source props retain their validated identity in a creative stage lane without triggering another franchise crash',async()=>{
 const p=project(),source={id:'trophy',kind:'image',name:'Trophy',path:'trophy.png',width:600,height:800,transparent:true,license:'Source notice',assetRole:'narration-prop',identity:{subject:'trophy',franchise:'illustration'}};p.gameSelection='pokemon';p.scenes[0].editorialPlan={creativeActions:compileCreativeRecipes(p.scenes[0],[{kind:'stage-image',quote:'Eric Rios',wordIndex:0,duration:2,propQuery:'gold trophy photograph',reason:'Tournament result',framing:'side'}])};const n=applyCreativeActions(await acquireCreativeProps(p,{library:[source]}));assert.ok(n.creativeActionReport.events.length);assert.deepEqual(auditVisuals(n).errors,[]);
});
