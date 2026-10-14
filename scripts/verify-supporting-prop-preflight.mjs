import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {createBackend,root} from '../electron/backend.mjs';
import {createNarrationProps} from '../electron/narration-props.mjs';
import {configureShortStyle,applyReferenceShort} from '../electron/short-styles.mjs';
import {directWithReview} from '../electron/local-ai-pipeline.mjs';
import {auditVisuals} from '../electron/storyboard.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';

const folder=path.join(root,'workspace/supporting-prop-check');fs.mkdirSync(folder,{recursive:true});
const recording='C:/Users/Eli/Downloads/1012 (1).MP3',hash=crypto.createHash('sha256').update(fs.readFileSync(recording)).digest('hex');
const segment=JSON.parse(fs.readFileSync(path.join(root,'workspace/transcripts/44a2da16e53954dabb0a4b76b7833f032fe61fe1572b8cb70a3eefd145b8c130.json'),'utf8')).segments[0];
const b=await createBackend({workspace:path.join(folder,'backend')}),review=createReviewRenderer({root,folder,scale:.5});
try{
 const voice=await b.importMedia(recording),logo=b.updateMedia({id:'pokemon-brand-logo',name:'Pokemon logo',kind:'image',assetRole:'logo',path:path.join(root,'electron/data/pokemon-logo.png'),width:914,height:336,transparent:true,license:'Pokemon logo belongs to its original rights holders.',identity:{franchise:'pokemon',subject:'pokemon',source:'Published Pokemon brand artwork'}});
 let p={id:'supporting-prop-diagnostic',name:'Supporting trophy validation — actual narration excerpt',visualVersion:3,voiceId:voice.id,duration:8.3,format:'vertical',gameSelection:'pokemon',musicVolume:0,media:[voice,logo],captionStyle:{fontSize:51,bottom:.19},editingInstructions:'',scenes:[{id:'scene-0-0',start:0,end:8.3,text:segment.text,words:segment.words,reaction:{entities:[{id:'pokemon',name:'Pokemon',type:'game',franchise:'pokemon',mediaId:logo.id,start:2.28}],metrics:[]}}]};
 const props=createNarrationProps(path.join(folder,'props'),{register:m=>b.updateMedia(m)});p=await props.acquire(p);p=applyReferenceShort(configureShortStyle(p,'pokemon-dense'));
 const trophy=p.media.find(m=>m.name==='Trophy.png'),layer=p.scenes[0].layers.find(l=>l.mediaId===trophy?.id);assert.ok(layer);assert.equal(layer.id,'scene-0-0-dense-1');assert.equal(layer.role,'supporting-image');
 const reported='scene-0-0: mismatched franchise illustration (layer '+layer.id+', asset Trophy.png, expected pokemon)';assert.deepEqual(auditVisuals(p).errors,[]);assert.ok(!p.scenes[0].layers.some(l=>l.mediaId===trophy.id&&l.role==='subject'));
 const state={mode:'high',models:{},cfg:{planningPasses:0,alternatives:0,frameSamples:1,reviewPasses:1,maxRevisions:0},settings:{url:'http://127.0.0.1:11434'},limitations:[],hardware:{},started:Date.now(),signal:new AbortController().signal,narrationAnalysis:{available:true,visualBrief:'Actual tournament opening'}};let frames=0;
 const finished=await directWithReview(p,state,()=>{},(project,frame,label)=>{frames++;return review.render(b.hydrate(project),frame,label);},{check:()=>{}});assert.equal(frames,3);assert.deepEqual(finished.processingReport.structuralAudit.errors,[]);assert.deepEqual(finished.captionStyle,p.captionStyle);assert.deepEqual(finished.scenes[0].words,segment.words);assert.ok(finished.scenes[0].layers.some(l=>l.mediaId===trophy.id));
 const image=await review.render(b.hydrate(finished),Math.round((layer.start+.8)*30),'trophy-visible');
 console.log('Production preflight passed with actual Trophy.png at '+layer.start+'s; exporting the 8.3-second recorded opening excerpt');
 const output=path.join(folder,'verified-trophy-excerpt.mp4'),result=await b.render(finished,output,p=>{if(p.percent===undefined||p.percent===100)console.log(p.stage);});assert.equal(result.width,1080);assert.equal(result.height,1920);assert.ok(Math.abs(result.duration-8.3)<.1);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(recording)).digest('hex'),hash);
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({originalReportedError:reported,trophyLayerRetained:true,acquiredNeutralPropPlan:true,actualRenderedReviewFrames:frames,structuralErrors:finished.processingReport.structuralAudit.errors,originalNarrationFileUnchanged:true,wordTimingUnchanged:true,captionAppearanceUnchanged:true,projectSaved:false,preview:image.path,export:result,limitations:['This is the original recording\'s 8.3-second opening excerpt, not the full video.','No model inference or online search is needed to verify this deterministic validation fix.']},null,2));console.log('PASS production preflight, actual review frames and verified MP4 export with the original trophy layer; no project saved');
}finally{await review.close();b.close();}
