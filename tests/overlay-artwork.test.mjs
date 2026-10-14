import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {measureArtwork,refineAttachmentAnchors} from '../electron/artwork-geometry.mjs';
import {placementFor} from '../electron/layer-motion.mjs';
import {arrangeOverlays,artworkBox} from '../electron/overlay-layout.mjs';
import {applyPerformances} from '../electron/actor-performances.mjs';
import {applyMoveEffects} from '../electron/move-effects.mjs';
import {createSourceMoveCards,applySourceMoveCards} from '../electron/source-move-cards.mjs';
import {createNarrationProps} from '../electron/narration-props.mjs';
import {applyOperations,recordRevision,undoRedo} from '../electron/revisions.mjs';
const words=text=>text.split(' ').map((text,i)=>({text,start:i*.35,end:i*.35+.3}));
const actor={id:'actor',type:'image',role:'subject',mediaId:'art',x:.3,y:.12,width:.4,height:.4,z:10,start:0,end:6,animation:'none',exit:'none'};
const fixture=(text='Charizard uses Flamethrower today.')=>({id:'p',voiceId:'v',duration:6,format:'vertical',topic:'pokemon',gameSelection:'pokemon',captionColor:'#aa55cc',captionStyle:{fontSize:47,bottom:.13},media:[{id:'v',kind:'audio'},{id:'art',kind:'image',width:400,height:600,pokemon:{name:'charizard'}}],scenes:[{id:'s',start:0,end:6,text,words:words(text),layers:[structuredClone(actor)]}]});
async function withFolder(fn){const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-art-'));try{return await fn(folder);}finally{fs.rmSync(folder,{recursive:true,force:true});}}
async function padded(folder,id='body',shape='<rect x="80" y="100" width="200" height="360" fill="red"/>'){
 const file=path.join(folder,id+'.png');await sharp(Buffer.from('<svg width="400" height="600">'+shape+'</svg>')).png().toFile(file);
 return measureArtwork({id,kind:'image',path:file,width:400,height:600});
}
test('alpha measurements ignore transparent margins and refresh when the original file changes',()=>withFolder(async folder=>{
 const m=await padded(folder);assert.ok(Math.abs(m.artworkGeometry.bounds.x-.2)<.015);assert.ok(Math.abs(m.artworkGeometry.bounds.y-1/6)<.015);
 assert.ok(m.artworkGeometry.anchors.neck.x>=0&&m.artworkGeometry.anchors.neck.x<=1);
 const again=await measureArtwork(m);assert.equal(again,m);
 await sharp(Buffer.from('<svg width="400" height="600"><rect x="10" y="10" width="390" height="590" fill="blue"/></svg>')).png().toFile(m.path);
 const changed=await measureArtwork(m);assert.ok(changed.artworkGeometry.bounds.x<.04);assert.notEqual(changed.artworkGeometry.signature,m.artworkGeometry.signature);
}));
test('a padded scarf stays on a visible authored neck through rotation, reflection and scaling',()=>withFolder(async folder=>{
 const m=await padded(folder,'art');m.attachmentAnchors={neck:{x:.4,y:.42}};
 const scarf=await padded(folder,'scarf','<rect x="140" y="240" width="120" height="90" fill="blue"/>');
 const p=fixture(),parent={...actor,flipX:true,keyframes:[{time:0,x:.3,y:.12,scale:1,rotation:0},{time:6,x:.5,y:.2,scale:1.3,rotation:25}]},item={...actor,id:'scarf',mediaId:'scarf',role:'item',attachment:{targetId:'actor',anchor:'neck',x:.5,y:.4,size:.3,autoAnchor:true,contentBounds:true}};
 for(const t of [0,2,4,5.9]){
  const out=placementFor(item,[parent,item],[m,scarf],t,1080,1920),box=artworkBox(item,[parent,item],[m,scarf],t,1080,1920);
  const dot={...item,id:'dot',mediaId:'dot'},at=placementFor(dot,[parent,dot],[m,{id:'dot',width:1,height:1}],t,1080,1920);
  const expectedX=at.motion.x+at.width/2,expectedY=at.motion.y+at.height/2;
  assert.ok(Math.abs(box.x+box.w/2-expectedX)<1e-6);assert.ok(Math.abs(box.y+box.h/2-expectedY)<1e-6);assert.equal(out.motion.rotation,at.motion.rotation);
 }
 assert.deepEqual(p.captionStyle,{fontSize:47,bottom:.13});
}));
test('ground shadows track moving feet and stay flat, including legacy saved shadows',()=>{
 const p=fixture(),parent={...actor,keyframes:[{time:0,x:.3,scale:1,rotation:0},{time:6,x:.55,scale:1.2,rotation:12}]},shadow={...actor,id:'actor-reference-ground',mediaId:undefined,type:'svg',referenceDecoration:true,role:'editorial-depth'};
 const a=placementFor(shadow,[parent,shadow],p.media,1,1080,1920),b=placementFor(shadow,[parent,shadow],p.media,5,1080,1920);assert.ok(b.motion.x+b.width/2>a.motion.x+a.width/2+.09);assert.ok(b.width>a.width);assert.equal(b.motion.rotation,0);
 const parentAt=placementFor(parent,[parent],p.media,5,1080,1920),bottom=parentAt.motion.y+parentAt.height/2+(actor.width*1080/(400/600)/1920)*parentAt.motion.scale*.5*Math.cos(10*Math.PI/180);
 assert.ok(Math.abs(b.motion.y+b.height*.45-bottom)<.002);
});
test('a manual held item and shadow follow a comic actor replacement, then return without duplicates',()=>{
 const p=fixture('Charizard wait what this is impossible.'),item={...actor,id:'scarf',role:'item',mediaId:'scarf',manual:true,attachment:{targetId:'actor',anchor:'neck',x:.5,y:.4,size:.3}},shadow={...actor,id:'actor-reference-ground',type:'svg',referenceDecoration:true,role:'editorial-depth'};p.scenes[0].layers.push(item,shadow);
 const n=applyPerformances(p),event=n.performanceReport.events[0];assert.equal(event.kind,'double-take');const layers=n.scenes[0].layers;
 const before=placementFor(item,layers,n.media,event.start-.01,1080,1920),during=placementFor(item,layers,n.media,event.start+.3,1080,1920);assert.ok(during.motion.opacity>0);assert.notEqual(during.motion.rotation,before.motion.rotation);assert.equal(layers.filter(l=>l.role==='item').length,1);
 assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(n.captionStyle,p.captionStyle);
});
test('items follow a unique visible story actor replacement but do not pick randomly between duplicate characters',()=>{
 const p=fixture(),parent={...actor,excludedRanges:[{start:1,end:4}]},shot={...actor,id:'story-shot',start:1,end:4,x:.6},item={...actor,id:'scarf',role:'item',attachment:{targetId:'actor',anchor:'neck',x:.5,y:.4,size:.3}};
 const moved=placementFor(item,[parent,shot,item],p.media,2,1080,1920);assert.ok(moved.motion.opacity>0);assert.ok(moved.motion.x>.6);
 const ambiguous=placementFor(item,[parent,shot,{...shot,id:'duplicate',x:.1},item],p.media,2,1080,1920);assert.equal(ambiguous.motion.opacity,0);
});
test('automatic cards keep an 18px gutter, preserve motion paths and leave captions and attachments alone',()=>{
 const p=fixture();p.scenes[0].layers.push({id:'card',type:'shape',role:'mechanic-card',x:.2,y:.48,width:.6,height:.13,start:0,end:6,z:40,animation:'none',exit:'none',keyframes:[{time:0,y:.48},{time:6,y:.48}]},{...actor,id:'held',role:'item',manual:true,attachment:{targetId:'actor',anchor:'neck',x:.5,y:.4,size:.3}});
 const before=structuredClone(p),n=arrangeOverlays(p),l=n.scenes[0].layers.find(l=>l.id==='card'),box=artworkBox(l,n.scenes[0].layers,n.media,3,1080,1920),body=artworkBox(actor,n.scenes[0].layers,n.media,3,1080,1920);
 assert.ok(box.y>=body.y+body.h+18/1920-1e-7||box.y+box.h<=body.y-18/1920+1e-7||box.x>=body.x+body.w+18/1080-1e-7||box.x+box.w<=body.x-18/1080+1e-7);
 assert.equal(l.keyframes[0].y,l.y);assert.deepEqual(n.scenes[0].layers.at(-1),before.scenes[0].layers.at(-1));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(p,before);
 assert.deepEqual(arrangeOverlays(n).scenes,n.scenes);
 const saved=recordRevision(p,n,'spacing',[],'spacing','Test');assert.deepEqual(undoRedo(saved,'undo').scenes,p.scenes);
});
test('anchor property edits override automatic landmarks and remain undoable',()=>{
 const p=fixture();p.scenes[0].layers.push({...actor,id:'item',role:'item',attachment:{targetId:'actor',anchor:'neck',x:.5,y:.42,size:.3,autoAnchor:true,contentBounds:true}});
 const n=applyOperations(p,{operations:[{type:'properties',sceneIds:['s'],layerIds:['item'],attachmentX:.27}]}).project;assert.equal(n.scenes[0].layers.at(-1).attachment.autoAnchor,false);assert.equal(n.scenes[0].layers.at(-1).attachment.x,.27);
});
test('trained anatomy coordinates are converted to artwork bounds, cached and reject transparent padding',()=>withFolder(async folder=>{
 const p=fixture(),m=await padded(folder,'art');p.media[1]=m;p.scenes[0].layers.push({...actor,id:'scarf',role:'item',attachment:{targetId:'actor',anchor:'neck',x:.5,y:.42,size:.3,contentBounds:true,autoAnchor:true}});
 const state={models:{vision:{capabilities:['vision']}}};let calls=0;const locate=async()=>{calls++;return {available:true,x:.4,y:.3,confidence:.9};};
 const n=await refineAttachmentAnchors(p,{state,locate});assert.ok(n.media[1].attachmentAnchors.neck.x>.3&&n.media[1].attachmentAnchors.neck.x<.5);
 await refineAttachmentAnchors(p,{state,locate,library:n.media});assert.equal(calls,1);
 const rejected=await refineAttachmentAnchors(p,{state:{...state,models:{vision:{...state.models.vision,digest:'changed-weights'}}},locate:async()=>({available:true,x:.95,y:.05,confidence:1})});assert.ok(!rejected.media[1].attachmentAnchors);
 assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.equal(n.scenes[0].layers.at(-1).attachment.y,n.media[1].attachmentAnchors.neck.y);assert.deepEqual(n.captionStyle,p.captionStyle);
}));
test('Google move cards require verified visible name plus description, preserve attribution and reuse cache',()=>withFolder(async folder=>{
 const p=fixture(),file=path.join(folder,'original.png');await sharp({create:{width:1000,height:400,channels:4,background:'white'}}).png().toFile(file);let searches=0,downloads=0,checks=0;
 const service=createSourceMoveCards(folder,{search:async(q,provider,key,options)=>{searches++;assert.equal(provider,'google-images');assert.equal(options.purpose,'move-card');assert.match(q,/Flamethrower.*description/);return [{id:'tcg',name:'Pokemon Flamethrower trading card'},{id:'wrong',name:'Pokemon Flamethrower guide'},{id:'right',name:'Pokemon Flamethrower move description'}];},download:async c=>{downloads++;return {id:c.id,kind:'image',path:file,decoded:true,width:1000,height:400,attribution:{source:'https://example.org/original',credit:'Source author'}};},verify:async()=>{checks++;return checks===1?{available:true,accepted:true,name:'Fire Blast',description:'A powerful fiery blast attacks the target.'}:{available:true,accepted:true,name:'Flamethrower',description:'The target is scorched with an intense blast of fire.',model:'fixture-vision'};}});
 const n=await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(downloads,2);assert.equal(n.media.at(-1).moveCard.name,'Flamethrower');assert.equal(n.media.at(-1).attribution.credit,'Source author');
 const finished=applySourceMoveCards(applyMoveEffects(n)),card=finished.scenes[0].layers.find(l=>l.sourceMoveCard);assert.equal(card.mediaId,'right');assert.equal(card.type,'image');assert.ok(!card.setupGraphic);assert.ok(card.end-card.start>=2.4-.001);assert.deepEqual(finished.captionStyle,p.captionStyle);assert.deepEqual(finished.scenes[0].words,p.scenes[0].words);
 const again=await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(searches,1);assert.equal(again.media.at(-1).moveCard.verified,true);
 assert.equal(applyMoveEffects(finished).scenes[0].layers.filter(l=>l.role==='move-callout').length,0);
}));
test('missing Google or missing vision skips homemade cards and avoids unnecessary searches',()=>withFolder(async folder=>{
 let calls=0;const service=createSourceMoveCards(folder,{search:async()=>{calls++;return [];},verify:async()=>{throw Error('unused');},download:async()=>{throw Error('unused');}}),p=fixture();
 for(const options of [{},{keys:{'google-images':'fixture'},canVerify:false}]){const n=await service.acquire(p,options);assert.equal(n.media.length,p.media.length);assert.ok(n.sourceMoveCardReport.some(r=>r.status==='unavailable'));assert.ok(!applySourceMoveCards(applyMoveEffects(n)).scenes[0].layers.some(l=>l.setupGraphic?.kind==='move-badge'));}assert.equal(calls,0);
}));
test('a narrated fire attack searches Google for a sourced flame and renders it in the effect',()=>withFolder(async folder=>{
 const p=fixture(),file=path.join(folder,'flame.png');await sharp({create:{width:300,height:500,channels:4,background:'#ef5533'}}).png().toFile(file);let flameSearches=0;
 const service=createNarrationProps(folder,{search:async(q,provider)=>{assert.equal(provider,'google-images');if(/real flame/.test(q)){flameSearches++;return [{id:'flame',name:'Real fire flame transparent PNG'}];}return [];},download:async()=>({id:'flame',kind:'image',path:file,width:300,height:500,decoded:true,transparent:true,attribution:{source:'https://example.org/fire'}})});
 const n=await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(n.narrationAssetPlan.fire,'flame');assert.equal(applyMoveEffects(n).scenes[0].layers.find(l=>l.moveEffect).mediaId,'flame');
 await service.acquire(p,{keys:{'google-images':'fixture'}});assert.equal(flameSearches,1);
}));
