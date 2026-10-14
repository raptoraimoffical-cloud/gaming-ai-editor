import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {pokemonTypeCues} from '../electron/pokemon-type-cues.mjs';
import {createSourceMoveCards,applySourceMoveCards,sourceMechanicCues} from '../electron/source-move-cards.mjs';
import {findMechanicImage,isGeneratedMechanicCard} from '../electron/mechanic-images-policy.mjs';
import {sourceMechanicRequest} from '../electron/creative-request.mjs';
import {applyMoveEffects} from '../electron/move-effects.mjs';
import {configureShortStyle,applyReferenceShort} from '../electron/short-styles.mjs';
import {regenerateSelected} from '../electron/scene-regeneration.mjs';
import {recordRevision,undoRedo} from '../electron/revisions.mjs';
import {renderProject} from '../electron/render-project.mjs';
import {createLocalAI} from '../electron/local-ai.mjs';
import {bundledNarrationArt} from '../electron/narration-props.mjs';

const words=text=>text.split(' ').map((text,i)=>({text,start:i*.35,end:i*.35+.3}));
function fixture(text='Charizard uses Flamethrower. It is a Fire-type Pokemon.'){
 return {id:'p',name:'Sourced mechanics',voiceId:'voice',gameSelection:'pokemon',format:'vertical',duration:10,captionColor:'#bb33dd',captionStyle:{enabled:true,fontSize:49,bottom:.21,style:'contrast-phrase'},media:[{id:'voice',kind:'audio'},...bundledNarrationArt(),{id:'charizard',kind:'image',license:'Source notice',pokemon:{name:'charizard'}}],scenes:[{id:'s',start:0,end:10,text,words:words(text),layers:[{id:'actor',type:'image',role:'subject',mediaId:'charizard',start:0,end:10,x:.05,y:.16,width:.9,height:.5,z:10}]}]};
}
function info(kind,name,id='source-'+kind){
 return {id,kind:'image',assetRole:kind+'-card',name,width:1000,height:400,moveCard:{kind,name,description:kind==='type'?'':'A readable game description printed in the original source image.',verified:true,model:'fixture'},attribution:{source:'https://publisher.example/'+id,credit:'Original author',changes:'Unmodified'},identity:{franchise:'pokemon',source:'Published screenshot'}};
}
const card=(kind,title,extra={})=>({id:'old-'+kind,type:'group',role:'mechanic-card',setupGraphic:{kind,title},start:1,end:3,x:.08,y:.47,width:.84,height:.24,z:40,...extra});
function temporary(t){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-source-mechanics-'));t.after(()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-source-mechanics-'));fs.rmSync(folder,{recursive:true,force:true});});return folder;}

test('type mentions use local Pokemon context and actual word times, without decorating ordinary words',()=>{
 const p=fixture('Charizard is Fire-type. Electric Pokemon resist Water. It is weak to Rock and Ground types. The room is dark and a normal bug is small.');
 const cues=pokemonTypeCues(p);assert.deepEqual(cues.map(c=>c.name),['fire','electric','water','rock','ground']);
 for(const c of cues)assert.equal(c.start,p.scenes[0].words[c.wordIndex].start);
 assert.deepEqual(pokemonTypeCues({...p,gameSelection:'minecraft'}),[]);
 assert.deepEqual(pokemonTypeCues(fixture('It is a normal day. Put out the fire. Watch the small bug.')),[]);
 assert.deepEqual(pokemonTypeCues(fixture('It resists Water and Fire types.')).map(c=>c.name),['water','fire']);
});
test('Google type-icon sourcing verifies the requested icon, preserves original files and credits, and reuses approved cache',async t=>{
 const folder=temporary(t),file=path.join(folder,'original-icon.png');await sharp({create:{width:240,height:80,channels:4,background:'white'}}).png().toFile(file);
 let searches=0,checks=0;const p=fixture('Charizard is a Fire type.'),service=createSourceMoveCards(folder,{
  search:async(q,provider,key,o)=>{searches++;assert.equal(provider,'google-images');assert.equal(o.purpose,'type-card');assert.match(q,/Fire.*type.*game.*(?:icon|label)/);return [{id:'wrong',name:'Water type icon'},{id:'right',name:'Fire type game badge'}];},
  download:async c=>({...info('type','Fire',c.id),path:file,width:240,height:80,decoded:true,originalUrl:'https://publisher.example/icon.png'}),
  verify:async(state,cue)=>{checks++;assert.equal(cue.kind,'type');return {available:true,accepted:true,name:checks===1?'Water':'Fire type',description:'',model:'fixture-vision'};}
 });
 const acquired=await service.acquire(p,{keys:{'google-images':'fixture'}}),n=applySourceMoveCards(acquired),icon=n.scenes[0].layers.find(l=>l.role==='type-icon');
 assert.equal(icon.mediaId,'right');assert.equal(icon.start,p.scenes[0].words[3].start);assert.equal(icon.type,'image');assert.ok(icon.width<=.25&&!icon.setupGraphic);
 const media=n.media.find(m=>m.id==='right');assert.equal(media.path,file);assert.equal(media.attribution.credit,'Original author');assert.equal(media.attribution.changes,'Unmodified');assert.equal(media.moveCard.description,'');
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(applySourceMoveCards(n),n);
 await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(searches,1);assert.equal(checks,2);
});
test('every automatic mechanic panel is replaced or removed; stale opt-out and instruction locks cannot enable homemade cards',()=>{
 const p=fixture('This Pokemon has information.');p.sourceMechanicImagesOnly=false;
 p.scenes[0].layers.push(card('move','Flamethrower'),card('move-badge','Protect',{id:'badge',instructionLocked:true}),card('ability','Lightning Rod'),card('type','Fire'),card('nature','Timid'),card('stats','Base stats',{id:'stats',role:'chart',setupGraphic:{kind:'stats',title:'Base stats',rows:[{label:'Attack',value:84}]}}),card('ability','Manual note',{id:'manual',manual:true}));
 p.media.push(info('move','Flamethrower'),info('ability','Lightning Rod'),info('type','Fire'));
 const n=applySourceMoveCards(p);assert.equal(n.sourceMechanicImagesOnly,true);
 for(const kind of ['move','ability','type']){const l=n.scenes[0].layers.find(l=>l.id==='old-'+kind);assert.equal(l.type,'image');assert.equal(l.mediaId,'source-'+kind);assert.ok(!l.setupGraphic);}
 assert.ok(!n.scenes[0].layers.some(l=>['badge','old-nature'].includes(l.id)));assert.ok(!n.scenes[0].layers.some(isGeneratedMechanicCard));
 assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='stats'),p.scenes[0].layers.find(l=>l.id==='stats'));assert.deepEqual(n.scenes[0].layers.find(l=>l.id==='manual'),p.scenes[0].layers.find(l=>l.id==='manual'));
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
 const saved=recordRevision(p,n,'Source images',[],'Source images','test');assert.deepEqual(undoRedo(saved,'undo').scenes,p.scenes);assert.equal(undoRedo(saved,'undo').sourceMechanicImagesOnly,false);assert.equal(undoRedo(undoRedo(saved,'undo'),'redo').sourceMechanicImagesOnly,true);
});
test('legacy render payload suppresses automatic homemade mechanics while retaining actual charts and authored manual objects',()=>{
 const p=fixture('This Pokemon has information.');p.scenes[0].layers.push(card('ability','Lightning Rod',{instructionLocked:true}),card('stats','Base stats',{id:'stats'}),card('ability','My own note',{id:'manual',manual:true}));
 const signature=JSON.stringify(p),n=renderProject(p);assert.equal(JSON.stringify(p),signature);assert.ok(!n.scenes[0].layers.some(isGeneratedMechanicCard));assert.ok(n.scenes[0].layers.some(l=>l.id==='stats'));assert.ok(n.scenes[0].layers.some(l=>l.id==='manual'));
});
test('missing source images never create automatic move badges, ability cards or type graphics, while attacks keep working',()=>{
 const p=fixture(),n=applySourceMoveCards(applyMoveEffects(p));assert.ok(n.scenes[0].layers.some(l=>l.moveEffect==='screen-fire'));assert.ok(n.scenes[0].layers.some(l=>l.id==='actor'));assert.ok(!n.scenes[0].layers.some(isGeneratedMechanicCard));assert.ok(!n.scenes[0].layers.some(l=>l.sourceMoveCard));
});
test('approved source move imagery is timed to narration and not duplicated by repeated presentation passes',()=>{
 const p=fixture('Charizard uses Flamethrower.'),m=info('move','Flamethrower');p.media.push(m);
 const n=applySourceMoveCards(applyMoveEffects(p)),cards=n.scenes[0].layers.filter(l=>l.sourceMoveCard);assert.equal(cards.length,1);assert.equal(cards[0].start,.7);assert.ok(cards[0].end-cards[0].start>=2.4);assert.ok(!cards[0].setupGraphic);
 assert.deepEqual(applySourceMoveCards(applyMoveEffects(n)),n);
});
test('reference setup uses published ability imagery and refuses to invent a panel when that image is absent',()=>{
 const p=fixture('Charizard has the ability Lightning Rod.');p.scenes[0].reaction={entities:[{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'charizard',start:0}],metrics:[]};p.shortMechanics={cues:[{kind:'ability',name:'lightning-rod',title:'Lightning Rod',sceneId:'s',start:1.4,end:10}]};
 const missing=applyReferenceShort(configureShortStyle(p,'pokemon-setup'));assert.ok(!missing.scenes[0].layers.some(isGeneratedMechanicCard));assert.match(missing.shortStyleReport.warnings.join(' '),/no sourced image/);
 p.media.push(info('ability','Lightning Rod'));const n=applyReferenceShort(configureShortStyle(p,'pokemon-setup'));assert.ok(n.scenes[0].layers.some(l=>l.sourceMoveCard&&l.mediaId==='source-ability'&&l.type==='image'));assert.ok(!n.scenes[0].layers.some(isGeneratedMechanicCard));
});
test('selective regeneration cannot reintroduce homemade cards and preserves unrelated scenes, speech and Undo',async()=>{
 const p=fixture('This Pokemon has information.');p.duration=12;p.scenes[0].end=6;p.scenes[0].layers[0].end=6;p.scenes.push({...structuredClone(p.scenes[0]),id:'untouched',start:6,end:12,words:[],text:'Unrelated.',layers:[]});p.media.push(info('ability','Lightning Rod'));
 const n=await regenerateSelected(p,'Regenerate this scene.',{sceneId:'s'},async subset=>{subset.scenes[0].layers=[card('ability','Lightning Rod')];return subset;});
 assert.ok(n.scenes[0].layers.some(l=>l.type==='image'&&l.mediaId==='source-ability'));assert.ok(!n.scenes[0].layers.some(isGeneratedMechanicCard));assert.deepEqual(n.scenes[1],p.scenes[1]);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(undoRedo(n,'undo').scenes,p.scenes);
});
test('cached approvals must match the actual requested mechanic, not just a cache filename or a procedural source claim',async t=>{
 const folder=temporary(t),file=path.join(folder,'original.png');await sharp({create:{width:1000,height:400,channels:4,background:'white'}}).png().toFile(file);
 const wrong={...info('move','Fire Blast'),path:file};fs.writeFileSync(path.join(folder,'flamethrower-v1.json'),JSON.stringify(wrong));let queries=0;
 const p=fixture('Charizard uses Flamethrower.');p.media.push({...info('move','Flamethrower'),path:file,identity:{source:'Original programmatic illustration'}});assert.equal(findMechanicImage(p,'move','Flamethrower'),undefined);
 const service=createSourceMoveCards(folder,{search:async()=>{queries++;return [];},download:async()=>{throw Error('unused');},verify:async()=>{throw Error('unused');}}),n=await service.acquire(p,{keys:{'google-images':'fixture'}});
 assert.ok(queries>0);assert.ok(n.sourceMoveCardReport.some(r=>r.status==='unavailable'));assert.ok(!n.media.some(m=>m.moveCard?.name==='Fire Blast'));
});
test('older automatic panels without semantic plans are still sourced and duplicate move cues are coalesced',()=>{
 const p=fixture('This Pokemon has information.');p.scenes[0].layers.push(card('ability','Lightning Rod'));assert.ok(sourceMechanicCues(p).some(c=>c.kind==='ability'&&c.title==='Lightning Rod'));
 const q=fixture('Charizard uses Flamethrower.');q.shortMechanics={cues:[{kind:'move',name:'flamethrower',title:'Flamethrower',sceneId:'s',start:.7,end:10}]};assert.equal(sourceMechanicCues(q).filter(c=>c.kind==='move').length,1);
});
test('adding an earlier type cue to a legacy source-card project keeps unique layer IDs and the later move image',()=>{
 const p=fixture('Fire-type Charizard uses Flamethrower.');p.media.push(info('type','Fire'),info('move','Flamethrower'));p.scenes[0].layers.push({id:'s-source-mechanic-0',type:'image',role:'mechanic-card',sourceMoveCard:true,mediaId:'source-move',x:.07,y:.05,width:.86,height:.2,z:70,start:1.05,end:3.65});
 const n=applySourceMoveCards(p),cards=n.scenes[0].layers.filter(l=>l.sourceMoveCard);assert.equal(cards.length,2);assert.equal(new Set(n.scenes[0].layers.map(l=>l.id)).size,n.scenes[0].layers.length);assert.ok(cards.some(l=>l.role==='type-icon'&&l.start===0));assert.ok(cards.some(l=>l.id==='s-source-mechanic-0'));assert.deepEqual(applySourceMoveCards(n),n);
});
test('sourced mechanic requests accept both orders and common ability spelling, without hijacking unrelated image edits',()=>{
 for(const request of ['Use images for the moves abilitys types etc instead of making your own.','Always use Google screenshots of move descriptions.','Replace ability cards with sourced images.','Use official type icons and pictures.'])assert.equal(sourceMechanicRequest(request),true,request);
 for(const request of ['Move this image to the left.','Make Charizard faster.','Use my uploaded background.'])assert.equal(sourceMechanicRequest(request),false,request);
});
test('trained vision receives the original type icon with no invented description requirement',async t=>{
 const folder=temporary(t),file=path.join(folder,'type.png');await sharp({create:{width:240,height:80,channels:4,background:'white'}}).png().toFile(file);let prompt;
 const ai=createLocalAI(folder,{fetchImpl:async(url,options)=>{const body=JSON.parse(options.body);prompt=body.messages[0].content;assert.ok(body.messages[0].images[0]);return Response.json({message:{content:JSON.stringify({accepted:true,name:'Fire',description:'',reason:'Requested type badge is visible'})}});}});
 const n=await ai.evaluateMoveCard({models:{vision:{name:'fixture-vision',capabilities:['vision']}},settings:{url:'http://localhost:11434'},signal:new AbortController().signal},{kind:'type',title:'Fire'},file);
 assert.equal(n.accepted,true);assert.equal(n.description,'');assert.match(prompt,/description is not required/);assert.match(prompt,/Reject a different type/);
});
test('missing literal props never fall back to homemade crown or weather illustrations',()=>{
 const p=fixture('Charizard was the king. Rain and snow.'),q=structuredClone(p);q.media=q.media.filter(m=>m.assetRole!=='narration-prop');q.scenes[0].reaction={entities:[{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'charizard',start:0}],metrics:[]};
 const n=applyReferenceShort(configureShortStyle(q,'pokemon-dense'));assert.ok(!n.scenes[0].layers.some(l=>l.role==='supporting-image'&&l.type==='svg'));assert.match(n.shortStyleReport.warnings.join(' '),/no homemade icon/);
});
