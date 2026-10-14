import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {propertyAt,placementFor} from '../electron/layer-motion.mjs';
import {combatAttacker,combatDefender,COMBAT_PHASES} from '../electron/combat-motion.mjs';
import {applyActionMovie} from '../electron/action-movie.mjs';
import {applyBattles} from '../electron/battle-choreography.mjs';
import {createNarrationProps,bundledNarrationArt} from '../electron/narration-props.mjs';
import {applySourceMoveCards,sourceMechanicCues} from '../electron/source-move-cards.mjs';
import {applyMoveEffects} from '../electron/move-effects.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {validateProject} from '../electron/planner.mjs';
import {applyOperations} from '../electron/revisions.mjs';

const actor=(id,start,end)=>({id:'actor-'+id,type:'image',role:'subject',mediaId:id,x:id==='lucario'?.06:.55,y:.30,width:.39,height:.34,z:30,start,end,animation:'none',exit:'none'});
function fixture(){return {id:'p',gameSelection:'pokemon',voiceId:'voice',format:'vertical',duration:9,captionStyle:{fontSize:52,bottom:.23},media:[{id:'voice',kind:'audio'},...bundledNarrationArt(),{id:'lucario',kind:'image',pokemon:{name:'lucario',types:['fighting']}},{id:'rotom',kind:'image',pokemon:{name:'rotom',types:['electric']}}],pokemonMentions:[{mediaId:'lucario',status:'ready',name:'lucario',start:0,end:.6},{mediaId:'rotom',status:'ready',name:'rotom',start:4.9,end:5.5}],scenes:[{id:'a',start:0,end:6,text:'Lucario hits Rotom with Close Combat.',words:[{text:'Lucario',start:0,end:.6},{text:'hits',start:4,end:4.3},{text:'Rotom',start:4.9,end:5.5},{text:'with',start:5.5,end:5.6},{text:'Close',start:5.6,end:5.75},{text:'Combat.',start:5.75,end:5.95}],layers:[actor('lucario',0,6),actor('rotom',4.9,6)]},{id:'b',start:6,end:9,text:'The opponent recoils.',words:[{text:'The',start:6,end:6.1},{text:'opponent',start:6.1,end:6.3},{text:'recoils.',start:6.3,end:6.6}],layers:[actor('lucario',6,9),actor('rotom',6,9)]}]};}
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function temporary(t){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'smooth-combat-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));return folder;}

test('smooth motion has continuous velocity on uneven keys, no overshoot and exact held/end poses',()=>{
 const l={easing:'smooth',keyframes:[{time:0,x:0},{time:.3,x:.02},{time:.9,x:.40},{time:1.2,x:.5},{time:1.4,x:.5},{time:2,x:.2}]},eps=1e-6;
 for(let i=1;i<l.keyframes.length-1;i++){const k=l.keyframes[i],v0=(propertyAt(l,'x',k.time)-propertyAt(l,'x',k.time-eps))/eps,v1=(propertyAt(l,'x',k.time+eps)-propertyAt(l,'x',k.time))/eps;near(v0,v1,1e-4);}
 for(let i=1;i<l.keyframes.length;i++){const a=l.keyframes[i-1],b=l.keyframes[i];for(let j=0;j<=100;j++){const v=propertyAt(l,'x',a.time+(b.time-a.time)*j/100);assert.ok(v>=Math.min(a.x,b.x)-1e-10&&v<=Math.max(a.x,b.x)+1e-10);}}
 assert.equal(propertyAt(l,'x',-1),0);assert.equal(propertyAt(l,'x',3),.2);assert.equal(propertyAt(l,'x',1.3),.5);
 const legacy={...l,easing:'linear'};near(propertyAt(legacy,'x',.6),.21);
});
test('attack winds back, accelerates along an arc, contacts then recovers; victim waits for contact',()=>{
 const l={easing:'smooth',keyframes:combatAttacker({start:2,duration:3,x:.05,y:.35,physical:true,contactX:.35})},at=f=>2+3*f;
 assert.ok(propertyAt(l,'x',at(.25))<.05);assert.ok(propertyAt(l,'y',at(.39))<.35);near(propertyAt(l,'x',at(.46)),.35);near(propertyAt(l,'x',5),.05);
 const speed=f=>(propertyAt(l,'x',at(f+.001))-propertyAt(l,'x',at(f-.001)))/.006;assert.ok(speed(.38)>speed(.32));
 const d={easing:'smooth',keyframes:combatDefender({start:2,duration:3,x:.54,y:.35})};near(propertyAt(d,'x',at(.45)),.54);assert.ok(propertyAt(d,'x',at(.49))>.54);near(propertyAt(d,'rotation',5),0);
});
test('animated dimensions are validated and fitted attachments follow resized actors',()=>{
 const p=fixture(),l=p.scenes[0].layers[0];l.easing='smooth';l.keyframes=[{time:0,width:.5,height:.4},{time:2,width:.3,height:.2}];validateProject(p);
 near(placementFor(l,[l],p.media,0,1080,1920).width,.5);near(placementFor(l,[l],p.media,2,1080,1920).height,.2);near(placementFor(l,[l],p.media,2,1080,1920,30,true).width,l.width);
 l.keyframes[1].width=-1;assert.throws(()=>validateProject(p),/keyframes/);
});
test('attachments and ground shadows follow the active combat replacement including squash/stretch',()=>{
 const p=fixture(),original=p.scenes[0].layers[0];original.end=1;
 const active={...original,id:'combat',actorSourceId:original.id,role:'narrated-action',start:1,end:4,x:.30,scaleX:1.1,scaleY:.95};
 const child={...actor('rotom',0,4),id:'item',width:.1,height:.1,attachment:{targetId:original.id,anchor:'head',x:.7,y:.2,size:.2}};
 const layers=[original,active,child],expected=placementFor({...child,attachment:{...child.attachment,targetId:active.id}},layers,p.media,2,1080,1920),actual=placementFor(child,layers,p.media,2,1080,1920);
 assert.deepEqual(actual,expected);assert.ok(actual.motion.opacity>0);
 const ground={...child,id:'ground',attachment:{targetId:original.id,anchor:'ground',x:.5,y:1,size:.72}};assert.equal(placementFor(ground,[...layers,ground],p.media,2,1080,1920).motion.scaleX,1);
});
test('manual resizing and disabling motion override automatic framing and deformation keys',()=>{
 const p=applyActionMovie(fixture()),s=p.scenes[0],l=s.layers.find(l=>l.role==='narrated-action');
 const n=applyOperations(p,{operations:[{type:'properties',sceneIds:[s.id],layerIds:[l.id],width:.3,height:.25}]}).project,changed=n.scenes[0].layers.find(k=>k.id===l.id);
 for(const time of [l.start,l.start+.1,l.end-.01]){near(placementFor(changed,n.scenes[0].layers,n.media,time,1080,1920).width,.3);near(propertyAt(changed,'height',time),.25);}
 const off=applyOperations(n,{operations:[{type:'animation',sceneIds:[s.id],layerIds:[l.id],preset:'none'}]}).project.scenes[0].layers.find(k=>k.id===l.id);assert.ok(off.keyframes.every(k=>k.scaleX===undefined&&k.scaleY===undefined&&k.width===undefined&&k.height===undefined));
});
test('narrated attacks preserve starting and recovered geometry and share one absolute curve across cuts',()=>{
 const p=fixture(),n=applyActionMovie(p),plan=n.actionMovieReport.plans[0];assert.ok(plan);validateProject(n);
 const a=n.scenes[0].layers.find(l=>l.role==='narrated-action'&&l.mediaId==='lucario'),b=n.scenes[1].layers.find(l=>l.role==='narrated-action'&&l.mediaId==='lucario');
 near(propertyAt(a,'x',plan.start),p.scenes[0].layers[0].x);near(propertyAt(a,'width',plan.start),p.scenes[0].layers[0].width);near(propertyAt(b,'x',plan.end),p.scenes[1].layers[0].x);
 assert.deepEqual(a.keyframes,b.keyframes);near(propertyAt(a,'x',6),propertyAt(b,'x',6));
 for(const s of n.scenes){assert.equal(new Set(s.layers.map(l=>l.id)).size,s.layers.length);for(const l of s.layers)assert.ok(l.start>=s.start&&l.end<=s.end);}
 const impacts=n.scenes.flatMap(s=>s.layers).filter(l=>l.battleEffect==='impact');assert.ok(impacts.some(l=>l.battleEffectStart===plan.start+plan.duration*COMBAT_PHASES.contact));
 assert.ok(n.scenes.flatMap(s=>s.layers).some(l=>l.battleEffect==='charge'));assert.ok(n.scenes.flatMap(s=>s.layers).some(l=>l.battleEffect==='shockwave'));
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.deepEqual(applyActionMovie(n),n);
});
test('explicitly requested sourced move description stays readable through the full attack and sentence cut without duplicating',()=>{
 const p=fixture();p.editingInstructions='Show sourced move description cards';p.media.push({id:'description',kind:'image',assetRole:'move-card',width:1000,height:400,moveCard:{name:'Close Combat',description:'The user fights the target up close without guarding itself.',verified:true}});
 const n=applySourceMoveCards(applyActionMovie(applyMoveEffects(p))),plan=n.actionMovieReport.plans[0];
 for(const s of n.scenes){const cards=s.layers.filter(l=>l.sourceMoveCard);assert.equal(cards.length,1);assert.equal(cards[0].end,Math.min(plan.end,s.end));assert.ok(cards[0].start>=plan.spokenAt);assert.equal(cards[0].mediaId,'description');}
 assert.equal(n.scenes[1].layers.find(l=>l.sourceMoveCard).animation,'none');assert.deepEqual(applySourceMoveCards(n),n);
});
test('an explicitly requested checked gameplay move picture stays intact rather than becoming a projectile',()=>{
 const p=fixture();p.editingInstructions='Show sourced move info images';p.scenes[0].words[4].text='Thunderbolt.';p.scenes[0].words.pop();p.scenes[0].text='Lucario hits Rotom with Thunderbolt.';p.media.push({id:'move-picture',kind:'image',assetRole:'move-art',effectMoveName:'thunderbolt',moveArtLayout:'reference',moveArtInspection:{accepted:true},width:1280,height:720});
 const n=applySourceMoveCards(applyActionMovie(applyMoveEffects(p)));assert.ok(n.scenes[0].layers.some(l=>l.sourceMoveCard&&l.mediaId==='move-picture'));assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>(l.battleEffect||l.moveEffect)&&l.mediaId==='move-picture'));assert.equal(n.actionMovieReport.plans[0].realMoveAsset,false);
 p.media[ p.media.length-1].moveArtInspection.accepted=false;assert.ok(!applySourceMoveCards(p).scenes[0].layers.some(l=>l.sourceMoveCard));
});
test('explicit battles animate supplied move artwork and source requested move images even when narration never names the move',()=>{
 const p=fixture();p.scenes=[{...p.scenes[0],end:9,words:[],text:'Fight!',layers:[actor('lucario',0,9),actor('rotom',0,9)]}];p.media.push({id:'art',kind:'image',assetRole:'move-art',effectMoveName:'flamethrower',transparent:true});
 const n=applyBattles(p,{battles:[{sceneId:'a',attackerId:'actor-lucario',defenderId:'actor-rotom',at:1,duration:3,move:'flamethrower'}]});validateProject(n);assert.ok(n.scenes[0].layers.some(l=>l.battleEffect==='move-image'&&l.mediaId==='art'));assert.ok(sourceMechanicCues(n).some(c=>c.name==='flamethrower'&&c.start===1));assert.equal(n.battleReport.sounds[1].start,1+3*.46);
});
test('move search accepts a verified real screenshot intact, caches it, and rejects unverified ones',async t=>{
 const folder=temporary(t),file=bundledNarrationArt()[0].path,p=fixture();let searched=0,verified=0,cutouts=0;
 const svc=createNarrationProps(folder,{search:async(q,provider,key,o)=>{assert.equal(provider,'google-images');searched++;return o.purpose==='move-reference'?[{id:'photo',name:'Pokemon Close Combat move attack animation screenshot'}]:[];},download:async()=>({id:'photo',kind:'image',path:file,width:1280,height:720,decoded:true,transparent:false,originalUrl:'https://publisher.example/actual.png',attribution:{source:'https://publisher.example/actual.png',credit:'Original artist'}}),cutout:async()=>{cutouts++;throw Error('Must stay intact');},verifyMove:async()=>{verified++;return {available:true,accepted:true,reason:'Correct move shown',model:'fixture-vision'};}});
 const state={models:{vision:{capabilities:['vision']}}},a=await svc.acquire(p,{keys:{'google-images':'fixture'},state}),queries=searched,b=await svc.acquire(p,{keys:{'google-images':'fixture'},state});
 const m=a.media.find(m=>m.id==='photo');assert.ok(m);assert.equal(m.moveArtLayout,'reference');assert.equal(m.path,file);assert.equal(m.attribution.credit,'Original artist');assert.equal(cutouts,0);assert.equal(verified,1);assert.equal(searched,queries);assert.deepEqual(b.media,a.media);
});
test('travel and contact sounds follow actual combat phases instead of the former early timings',()=>{
 const p=applyActionMovie(fixture()),pool=['whoosh','impact'].map(cue=>({id:'sound-'+cue,kind:'audio',assetRole:'sound-effect',name:cue,tags:cue,license:'Source',duration:.2})),n=automaticSounds(p,pool),plan=p.actionMovieReport.plans[0];
 assert.ok(n.soundEffects.some(f=>f.reason==='Narrated physical attack travel'&&f.start===plan.start+plan.duration*.31));assert.ok(n.soundEffects.some(f=>f.reason==='Narrated action contact'&&f.start===plan.start+plan.duration*.46));
});
