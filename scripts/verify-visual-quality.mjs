import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
import {auditVisuals,refreshStoryboard} from '../electron/storyboard.mjs';
import {refineVisualBeats} from '../electron/asset-identity.mjs';
const folder=path.join(root,'workspace/visual-quality');
fs.mkdirSync(folder,{recursive:true});
const b=await createBackend({workspace:path.join(folder,'verification-library')});
const evidence={};
try{
 const existing=JSON.parse(fs.readFileSync(path.join(folder,'upgraded.gaming.json'),'utf8'));
 // Reuse only the licensed, cached media already selected in the actual fixture.
 for(const m of existing.media.filter(m=>m.attribution&&!m.pokemon&&m.kind==='image'))b.updateMedia(m);
 const source=path.join(root,'workspace/media/46e0f326-077e-4fb0-b9b1-5de1079a6e86.mp4');
 const narration=path.join(folder,'original-voice.wav');
 if(!fs.existsSync(narration))await run('ffmpeg',['-v','error','-y','-i',source,'-vn','-ac','1','-ar','16000',narration]);
 const imported=await b.importMedia(narration,{license:'User-provided old video audio / regression fixture'});
 let upgraded=await b.generate({voiceId:imported.id,model:'tiny.en',name:'My gaming story - upgraded'},p=>console.log(p.stage));
 upgraded.musicId=undefined;upgraded.soundEffects=[];upgraded=refreshStoryboard(upgraded);
 assert.equal(upgraded.scenes.length,4);
 assert.deepEqual(auditVisuals(upgraded).errors,[]);
 for(const s of upgraded.scenes){
  assert.ok(s.layers.some(l=>l.role==='background'&&l.width===1&&l.height===1));
  assert.ok(!s.layers.some(l=>l.role==='placeholder'||l.role==='title'));
  if(s.end<=7.65)assert.ok(!s.layers.some(l=>upgraded.media.find(m=>m.id===l.mediaId)?.pokemon));
 }
 for(const mob of ['chicken','pig']){
  const s=upgraded.scenes.find(s=>s.reaction.entities.some(e=>e.id==='minecraft-'+mob)),e=s.reaction.entities.find(e=>e.id==='minecraft-'+mob),l=s.layers.find(l=>l.mediaId===e.mediaId);
  assert.ok(l.width>=.8&&l.height>=.6);assert.equal(l.start,e.start);
 }
 fs.writeFileSync(path.join(folder,'upgraded.gaming.json'),JSON.stringify(upgraded,null,2));
 if(!process.argv.includes('--reuse-minecraft'))evidence.minecraft=await b.render(upgraded,path.join(folder,'upgraded.mp4'));
 const voice=path.join(folder,'evolution-voice.wav');
 await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.Rate=-1; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('Wartortle evolves into Blastoise, becoming a powerful final form.'); $speaker.Dispose()`]);
 const m=await b.importMedia(voice,{license:'Windows speech synthesis acceptance fixture'});
 const evolution=await b.generate({voiceId:m.id,model:'tiny.en',name:'Verified Wartortle to Blastoise'},p=>console.log(p.stage));
 console.log(JSON.stringify(evolution.scenes.map(s=>({text:s.text,reaction:s.reaction})),null,2));
 const scene=evolution.scenes.find(s=>s.compositionFamily==='evolution-sequence');
 assert.ok(scene,'Actual Whisper narration must produce an evolution scene');
 assert.equal(scene.reaction.relationship.from,'wartortle');assert.equal(scene.reaction.relationship.to,'blastoise');assert.equal(scene.reaction.relationship.verified,true);
 assert.deepEqual(auditVisuals(evolution).errors,[]);
 for(const name of ['wartortle','blastoise']){
  const asset=evolution.media.find(m=>m.pokemon?.name===name);assert.ok(asset&&fs.existsSync(asset.path));assert.equal(asset.pokemon.animated,true,'Actual animated source required for this acceptance fixture');
 }
 fs.writeFileSync(path.join(folder,'evolution.gaming.json'),JSON.stringify(evolution,null,2));
 evidence.evolution=await b.render(evolution,path.join(folder,'evolution.mp4'));
 evidence.relationship=scene.reaction.relationship;
 evidence.minecraftShots=upgraded.scenes.map(s=>({start:s.start,end:s.end,family:s.compositionFamily,entities:s.reaction.entities}));
 fs.writeFileSync(path.join(folder,'render-verification.json'),JSON.stringify(evidence,null,2));
 console.log('Verified actual voice-to-video evolution and narration-specific Minecraft composition:',evidence);
}finally{b.close();}
