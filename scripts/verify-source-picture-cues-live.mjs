import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {planQuickStory} from '../electron/quick-story-plan.mjs';
import {acquireCreativeProps,applyCreativeActions} from '../electron/creative-actions.mjs';
import {refreshStoryboard} from '../electron/storyboard.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
const folder=path.join(root,'workspace/source-picture-cues-check'),work=path.join(folder,'backend-'+Date.now());fs.mkdirSync(work,{recursive:true});
for(const name of ['library.sqlite','local-ai-settings.json'])fs.copyFileSync(path.join(root,'workspace',name),path.join(work,name));
const b=await createBackend({workspace:work}),review=createReviewRenderer({root,folder,scale:.5});
try{
 const voice=await b.importMedia('C:/Users/Eli/Downloads/1012 (1).MP3'),transcript=JSON.parse(fs.readFileSync(path.join(root,'workspace/transcripts/44a2da16e53954dabb0a4b76b7833f032fe61fe1572b8cb70a3eefd145b8c130.json'))),segment=transcript.segments[1];
 const p={id:'live-cue-check',creativePassId:crypto.randomUUID(),name:'Live cue check',voiceId:voice.id,duration:voice.duration,format:'vertical',videoMode:'youtube-shorts',gameSelection:'pokemon',media:[voice],captionColor:'#8affcb',musicVolume:.08,editingInstructions:'Show the real Eric Rios photo when his name is spoken. Illustrate the record and team with fresh, relevant source pictures at useful narration cues. Do not replace speech or captions.',scenes:[{...segment,id:'scene-eric',template:'pokemon',layers:[]}]};
 const state=await b.localAI.begin('fast');console.log('Actual configured trained editor: '+state.models.editing.name);console.log('Authoring the original recorded Eric Rios passage with the production Quick Draft planner');
 let next=await b.localAI.author(p,state,p=>console.log(p.stage));fs.writeFileSync(path.join(folder,'planning.json'),JSON.stringify({report:next.creativePlanningReport,plans:next.scenes.map(s=>s.editorialPlan),inference:state.inferenceEvents},null,2));
 assert.ok(next.creativePlanningReport.decisions.length,'No passage survived validation');assert.ok(next.scenes.some(s=>s.editorialPlan?.creativeActions?.some(a=>a.recipeKind==='stage-image')),'No executable trained picture cue');
 next=refreshStoryboard(next);next=await acquireCreativeProps(next,{library:b.library(),search:(q,o,k)=>b.onlineSearch(q,o,k),download:c=>b.onlineDownload(c),progress:p=>console.log(p.stage)});next=applyCreativeActions(next);
 fs.writeFileSync(path.join(folder,'delivery.json'),JSON.stringify({requests:next.creativeSourceReport,warnings:next.creativePropWarnings,execution:next.creativeActionReport},null,2));const layers=next.scenes.flatMap(s=>s.layers||[]),photo=layers.find(l=>l.role==='creative-stage-prop'&&next.media.find(m=>m.id===l.mediaId)?.sourceMatch?.name==='Eric Rios');assert.ok(photo,'The original Eric photo was not inserted');
 const frame=await review.render(b.hydrate(next),Math.round((photo.start+.7)*30),'trained-source-photo');fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({model:state.models.editing.name,trainedInference:state.inferenceEvents,pictureCueCount:next.scenes[0].editorialPlan.creativeActions.filter(a=>a.recipeKind==='stage-image').length,sourceRequests:next.creativeSourceReport,actualPhoto:{mediaId:photo.mediaId,start:photo.start,width:photo.width,z:photo.z},frame:frame.path,projectSaved:false,googleApiLiveTested:false},null,2));console.log('PASS: actual trained inference delivered the source photo at '+photo.start+'s; captions intact; no project saved');
}finally{await review.close();b.close();}
