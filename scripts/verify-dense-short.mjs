import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const dir=path.join(root,'workspace/dense-short-check');fs.mkdirSync(dir,{recursive:true});
const backend=await createBackend({workspace:path.join(dir,'backend')});
try{
 const voice=await backend.importMedia(path.join(dir,'narration.wav'),{license:'Windows SAPI local diagnostic narration',assetRole:'narration'});
 const p=await backend.generate({voiceId:voice.id,name:'Layered reference Short verification',quality:'fast',model:'tiny.en',pokemon:true,videoMode:'youtube-shorts',shortStyle:'pokemon-dense',autoPokemonCries:false,autoSoundEffects:true,autoMinecraftSounds:false,localAnimatorEnabled:false,backgroundMode:'ai'},e=>console.log(e.stage));
 assert.equal(p.shortStyle,'pokemon-dense');assert.equal(p.captionStyle.style,'outlined-phrase');
 assert.ok(p.scenes.flatMap(s=>s.layers).some(l=>l.attachment&&l.attachment.anchor==='head'),'Crown must be a real attached graphic');
 assert.ok(p.scenes.flatMap(s=>s.layers).some(l=>l.role==='game-logo'),'Sourced game logo must survive the style pass');
 const charts=p.scenes.flatMap(s=>s.layers).filter(l=>l.setupGraphic?.kind==='percentage-comparison');assert.ok(charts.some(l=>l.setupGraphic.rows.some(r=>r.value===45)&&l.setupGraphic.rows.some(r=>r.value===12)),'Actual narrated percentages required');
 assert.ok(p.soundEffects.length>=5,'Export must include multiple real sound accents');
 p.musicId=undefined;p.musicVolume=0;
 fs.writeFileSync(path.join(dir,'project.gaming.json'),JSON.stringify(p,null,2));
 const result=await backend.render(p,path.join(dir,'layered-short.mp4'),e=>{if(e.percent===undefined)console.log(e.stage);});
 const samples=p.shortStyleReport.visualCues.filter(e=>['motif','number'].includes(e.kind)).map(e=>({time:Math.min(e.end-.08,e.start+.4),kind:e.kind,quote:e.quote}));
 for(const [i,sample] of samples.entries()){sample.file=path.join(dir,'frame-'+i+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(sample.time),'-i',result.output,'-frames:v','1','-vf','scale=540:960',sample.file]);}
 const silent={...p,musicId:undefined,musicVolume:0,soundEffects:[]};
 const baseline=await backend.render(silent,path.join(dir,'speech-only.mp4'));
 // Binary PCM needs a file, rather than the backend's text subprocess helper.
 const a=path.join(dir,'mixed.pcm'),b=path.join(dir,'speech.pcm');
 for(const [file,out] of [[result.output,a],[baseline.output,b]])await run('ffmpeg',['-v','error','-y','-i',file,'-vn','-ac','1','-ar','16000','-f','f32le',out]);
 const mixed=fs.readFileSync(a),speech=fs.readFileSync(b);let sum=0;const count=Math.min(mixed.length,speech.length)/4;for(let i=0;i<count;i++){const difference=mixed.readFloatLE(i*4)-speech.readFloatLE(i*4);sum+=difference*difference;}const audibleDifferenceRms=Math.sqrt(sum/count);assert.ok(audibleDifferenceRms>.00005,'Rendered soundtrack must differ from speech-only output');
 const revised=await backend.remake(p,'',{useAI:false,shortStyle:'pokemon-dense'});assert.deepEqual(revised.scenes.map(s=>[s.start,s.end,s.words]),p.scenes.map(s=>[s.start,s.end,s.words]));assert.ok(backend.undoRedo(revised,'undo'));
 const report={output:result.output,realGenerate:true,referenceFootageReused:false,artwork:p.media.filter(m=>m.pokemon).map(m=>({name:m.name,source:m.pokemon.sourceUrl})),visualCues:p.shortStyleReport.visualCues,soundEffects:p.soundEffects,charts:charts.map(l=>l.setupGraphic),samples,audibleDifferenceRms,narrationPreservedOnRemake:true,undo:true,limitations:['Diagnostic narration, not a finished creator Short.','Editing rules are based on references; this is not fine-tuned model training.']};
 fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));console.log('PASS actual Generate, attached motif, narrated comparison, rendered sound accents, narration-preserving remake and MP4',result.output);
}finally{backend.close();}
