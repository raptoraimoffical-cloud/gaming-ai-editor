import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {measureProjectArtwork,refineAttachmentAnchors} from '../electron/artwork-geometry.mjs';
import {applyReferenceFinish} from '../electron/reference-finish.mjs';
import {arrangeOverlays} from '../electron/overlay-layout.mjs';
import {directItems} from '../electron/item-director.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
const folder=path.join(root,'workspace/overlay-artwork-check'),workspace=path.join(folder,'backend');fs.mkdirSync(workspace,{recursive:true});
const settings=path.join(root,'workspace/local-ai-settings.json');if(fs.existsSync(settings))fs.copyFileSync(settings,path.join(workspace,'local-ai-settings.json'));
const b=await createBackend({workspace}),review=createReviewRenderer({root,folder,scale:.5});
try{
 const source=JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8'));
 const itemSource=JSON.parse(fs.readFileSync(path.join(root,'workspace/item-direction-check/project.gaming.json'),'utf8'));
 const hero=source.media.find(m=>m.name==='Mega Sceptile'),scarf=itemSource.media.find(m=>m.id==='pokemon-item-choice-scarf');
 const text='Mega Sceptile wears a Choice Scarf. Wait what this is a secret weapon.';
 const p=b.hydrate({...source,id:'overlay-artwork-diagnostic',duration:6,pokemonMentions:[],soundEffects:[],shortStyle:'pokemon-setup',revisionHistory:[],quickPatchRanges:undefined,media:[...source.media,scarf],scenes:[{...source.scenes[0],id:'diagnostic',start:0,end:6,text,words:text.split(' ').map((text,i)=>({text,start:i*.35,end:i*.35+.3})),layers:[...source.scenes[0].layers.filter(l=>['background','environment-depth'].includes(l.role)).map(l=>({...l,start:0,end:6})),{id:'hero',type:'image',role:'subject',mediaId:hero.id,start:0,end:6,x:.14,y:.09,width:.72,height:.5,z:10,fit:'contain',animation:'none',exit:'none',keyframes:[{time:0,x:.14,scale:1},{time:6,x:.24,scale:1.08}]},{id:'slightly-overlapping-card',type:'shape',role:'mechanic-card',start:0,end:6,x:.1,y:.40,width:.8,height:.14,z:40,color:'#174064',animation:'none',exit:'none'}]}]});
 let measured=await measureProjectArtwork(p);measured=applyReferenceFinish(measured);
 let next=await directItems(measured,{catalog:[{name:'choice-scarf'}],itemAsset:async()=>scarf});next=await measureProjectArtwork(next);
 let anchorInspection;const state=await b.localAI.begin('high');next=await refineAttachmentAnchors(next,{state,locate:async(...args)=>anchorInspection=await b.localAI.locateAttachment(...args),progress:p=>console.log(p.stage)});next=arrangeOverlays(next);
 assert.deepEqual(next.captionStyle,p.captionStyle);assert.deepEqual(next.scenes[0].words,p.scenes[0].words);
 const item=next.scenes[0].layers.find(l=>l.role==='item');assert.equal(item.attachment.anchor,'neck');
 for(const t of [2.5,4.5])await review.render(next,Math.round(t*30),'attached-'+t);
 const report={anchorInspection,trainedVisionModel:state.models.vision?.name,anatomicalAnchor:next.media.find(m=>m.id===hero.id).attachmentAnchors?.neck,silhouette:next.media.find(m=>m.id===hero.id).artworkGeometry,layout:next.overlayLayoutReport,captionsUnchanged:true,frames:[2.5,4.5]};
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(next,null,2));fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({inspection:anchorInspection,model:report.trainedVisionModel,neck:report.anatomicalAnchor,adjustments:report.layout.adjustments.length,unresolved:report.layout.unresolved.length,frames:2}));
}finally{await review.close();b.close();}
