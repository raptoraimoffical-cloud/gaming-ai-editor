import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {directWithReview} from '../electron/local-ai-pipeline.mjs';
import {auditVisuals} from '../electron/storyboard.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';

const folder=path.join(root,'workspace/franchise-preflight-check');fs.mkdirSync(folder,{recursive:true});
const sourcePath=path.join(root,'workspace/context-check/updated-short.gaming.json'),sourceBytes=fs.readFileSync(sourcePath),source=JSON.parse(sourceBytes);
const art=source.media.find(m=>m.name==='Mega Sceptile');assert.ok(fs.existsSync(art.path));
const labels=['Pokémon','Pokemon Champions','pokemon-showdown'];
const p={id:'franchise-preflight-diagnostic',name:'Franchise validation diagnostic',duration:9,format:'vertical',voiceId:source.voiceId,narrationMuted:true,musicVolume:0,captionStyle:source.captionStyle,captionColor:source.captionColor,media:[art,source.media.find(m=>m.id===source.voiceId)],scenes:labels.map((franchise,i)=>({id:`scene-${i+1}-0`,start:i*3,end:i*3+3,text:'Pokemon source artwork.',words:[{text:'Pokemon',start:i*3,end:i*3+.6},{text:'source',start:i*3+.6,end:i*3+1.2},{text:'artwork.',start:i*3+1.2,end:i*3+1.8}],reaction:{entities:[{type:'game',id:'pokemon-title-'+i,name:'Pokemon',franchise}]},layers:[{id:'bg-'+i,type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:i*3,end:i*3+3,color:'#142638'}, {id:'picture-'+i,type:'image',role:'subject',mediaId:art.id,x:.15,y:.2,width:.7,height:.44,z:20,start:i*3,end:i*3+3,animation:'none',fit:'contain'}]}))};
p.scenes[2].layers.push({...p.scenes[2].layers[1],id:'extra-picture',role:'supporting-image',x:.72,y:.04,width:.24,height:.16});
// This reproduces the original raw-label comparison without invoking a model.
const legacyErrors=p.scenes.flatMap(s=>s.layers.filter(l=>l.mediaId&&s.reaction.entities[0].franchise!=='pokemon').map(()=>s.id+': mismatched franchise pokemon'));
assert.deepEqual(legacyErrors,['scene-1-0: mismatched franchise pokemon','scene-2-0: mismatched franchise pokemon','scene-3-0: mismatched franchise pokemon','scene-3-0: mismatched franchise pokemon']);
const state=()=>({mode:'high',models:{},settings:{url:'http://127.0.0.1:11434'},cfg:{planningPasses:0,alternatives:0,frameSamples:3,reviewPasses:1,maxRevisions:0},signal:new AbortController().signal,started:Date.now(),limitations:[],hardware:{},narrationAnalysis:{available:true}});
const b=await createBackend({workspace:path.join(folder,'backend')}),review=createReviewRenderer({root,folder,scale:.35});
try{
 let rendered=0;
 const result=await directWithReview(p,state(),()=>{},async(project,frame,label)=>{rendered++;return review.render(b.hydrate(project),frame,label);},{check:()=>{}});
 assert.equal(rendered,9);assert.deepEqual(auditVisuals(result).errors,[]);assert.deepEqual(result.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.deepEqual(result.captionStyle,p.captionStyle);
 let attempted=0;
 const recovered=await directWithReview(result,state(),()=>{},async()=>{attempted++;throw Error('Injected optional renderer disconnect');},{check:()=>{}});
 assert.equal(attempted,1);assert.deepEqual(recovered.scenes,result.scenes);assert.ok(recovered.processingReport.limitations.some(l=>l.includes('completed edit retained')));
 const frame=await review.render(b.hydrate(recovered),210,'retained-result');assert.ok(fs.statSync(frame.path).size>1000);assert.deepEqual(fs.readFileSync(sourcePath),sourceBytes);
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({originalReportedErrors:legacyErrors,canonicalAuditErrors:result.processingReport.structuralAudit.errors,actualRenderedReviewFrames:rendered,optionalReviewFailureRetainsResult:true,originalCaptionAppearance:true,originalNarrationTiming:true,retainedFrame:frame.path,originalProjectUnchanged:true,projectSaved:false,limitations:['Synthetic narration muted; cached original source art.','No inference or live image search is needed to validate this deterministic metadata fix.','Renderer failure is explicitly injected after successful production rendering.']},null,2));
 console.log('PASS four exact reported errors reproduced and fixed; nine actual review frames, retained result renders after optional review failure; no project saved');
}finally{await review.close();b.close();}
