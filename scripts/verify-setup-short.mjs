import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const dir=path.join(root,'workspace/setup-short-check');fs.mkdirSync(dir,{recursive:true});
const supplied='C:/Users/Eli/Downloads/YTDown.com_Shorts_Media_H7Ui71vRA5k_MEGA-SCEPTILE-IS-UNSTOPPABLE-WITH-THE-RIGHT-SETUP_001_1080p.mp4';
const clipFile=path.join(dir,'reference-gameplay-proxy.mp4');
await run('ffmpeg',['-v','error','-y','-ss','40','-i',supplied,'-t','3','-vf','crop=1080:920:0:430,scale=960:-2','-an','-r','30',clipFile]);
const backend=await createBackend();
try{
 const original=JSON.parse(fs.readFileSync(path.join(root,'workspace/video-remake-check/source.gaming.json'))),voice=original.media.find(m=>m.id===original.voiceId);
 const scene=(id,start,end,text)=>({id,start,end,title:text,text,kind:'pokemon',words:text.split(' ').map((text,i)=>({text,start:start+i*.26,end:start+(i+1)*.26}))});
 const clip={id:'reference-proof',path:clipFile,name:'User supplied battle reference (verification only)',kind:'video',duration:3,width:960,height:818,license:'User-supplied reference, used for local style verification only'};
 const source={...original,id:'setup-short-check',name:'Sceptile setup reference verification',format:'horizontal',videoMode:'youtube-standard',duration:8,media:[voice,clip],musicId:undefined,soundEffects:[],autoPokemonCries:false,autoSoundEffects:true,localAnimatorEnabled:false,editingInstructions:'',revisionHistory:[],revisionCursor:0,creationAssets:{fileIds:[clip.id],imageIds:[],clips:[{mediaId:clip.id,cue:'Discharge',start:0,end:3}]},scenes:[scene('ability',0,2,'Mega Sceptile gets Lightning Rod.'),scene('move',2,5,'Rotom with Choice Scarf uses Discharge.'),scene('stats',5,8,'Mega Sceptile has 145 base special attack and speed.')]};
 const next=await backend.remake(backend.hydrate(source),'',{useAI:false,shortStyle:'pokemon-setup'},{},e=>console.log(e.stage));
 assert.equal(next.shortStyle,'pokemon-setup');assert.equal(next.captionStyle.style,'yellow-phrase');assert.equal(next.captionStyle.fontSize,58);assert.equal(next.captionStyle.enabled,true);
 assert.ok(next.shortMechanics.cues.some(c=>c.name==='lightning-rod'));assert.ok(next.shortMechanics.cues.some(c=>c.name==='discharge'));
 assert.ok(next.scenes[1].layers.some(l=>l.role==='gameplay'&&l.videoStart===0));assert.ok(next.scenes[1].layers.some(l=>l.attachment&&l.role==='item'));
 const stats=next.scenes[2].layers.find(l=>l.setupGraphic?.kind==='stats');assert.ok(stats.setupGraphic.rows.some(r=>r.label==='Sp. Atk'&&r.value===145));
 assert.deepEqual(next.scenes.map(s=>s.words.map(w=>[w.text,w.start,w.end])),source.scenes.map(s=>s.words.map(w=>[w.text,w.start,w.end])));
 assert.equal(backend.undoRedo(next,'undo').format,'horizontal');
 fs.writeFileSync(path.join(dir,'source.gaming.json'),JSON.stringify(source,null,2));fs.writeFileSync(path.join(dir,'project.gaming.json'),JSON.stringify(next,null,2));
 const result=await backend.render(next,path.join(dir,'setup-reference.mp4'),e=>{if(e.percent===undefined)console.log(e.stage);});
 for(const t of [1.5,3,3.8,6.5,7.2])await run('ffmpeg',['-v','error','-y','-ss',String(t),'-i',result.output,'-frames:v','1','-vf','scale=540:960',path.join(dir,'frame-'+t+'.png')]);
 fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({output:result.output,captionStyle:next.captionStyle,mechanics:next.shortMechanics.cues,shots:next.shortStyleReport.shots,warnings:next.shortStyleReport.warnings,narrationPreserved:true,undo:true},null,2));
 console.log('PASS source-backed mechanics, held item, cue-trimmed gameplay, animated base stats, yellow captions, narration guard and real MP4');
}finally{backend.close();}
