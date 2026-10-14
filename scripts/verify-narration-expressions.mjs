import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
import {cachedRenderBundle} from '../electron/render-bundle-cache.mjs';
import {renderStill,selectComposition} from '@remotion/renderer';
const folder=path.join(root,'workspace/expression-check');fs.mkdirSync(folder,{recursive:true});
const text='Sceptile is better on paper, but actually this strategy fails. Sceptile and Basculegion are good together. They form a great pair. Basculegion is bad. Sceptile uses Leaf Storm on Basculegion. That is a powerful special attack. Lucario uses Close Combat on Basculegion. That is a physical attack. Sceptile uses Thunderbolt on Basculegion. The lightning hits its target.';
const voicePath=path.join(folder,'narration.wav');
if(!fs.existsSync(voicePath))await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $taskSpeaker=New-Object System.Speech.Synthesis.SpeechSynthesizer; $taskSpeaker.Rate=-1; $taskSpeaker.SetOutputToWaveFile('${voicePath.replaceAll("'","''")}'); $taskSpeaker.Speak('${text}'); $taskSpeaker.Dispose()`]);
const backend=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')});
const raw=p=>p.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words.map(w=>[w.text,w.start,w.end])]);
try{
 const file=path.join(folder,'generated.gaming.json');let p;
 if(process.argv.includes('--reuse')&&fs.existsSync(file))p=backend.hydrate(JSON.parse(fs.readFileSync(file,'utf8')));
 else{const voice=await backend.importMedia(voicePath,{assetRole:'narration',license:'Windows SAPI diagnostic narration'});p=await backend.generate({voiceId:voice.id,name:'Expressions and sourced moves',quality:'fast',model:'base.en',pokemon:true,pokemonNames:'Sceptile, Basculegion, Lucario',script:text,shortStyle:'pokemon-dense',videoMode:'youtube-shorts',autoPokemonCries:false,autoReactionGifs:false,localAnimatorEnabled:false},e=>console.log(e.stage));fs.writeFileSync(file,JSON.stringify(p,null,2));}
 p.captionStyle={...p.captionStyle,fontSize:47,bottom:.19};for(const s of p.scenes)s.captionStyle={...s.captionStyle,fontSize:47,bottom:.19};
 const begin=performance.now(),n=await backend.remake(p,'Act out the narration with on paper crumpling, pairs together and physical or special moves.',{useAI:false,preserveCaptions:true,correctNames:true},{},e=>console.log(e.stage)),remakeMs=performance.now()-begin;
 assert.deepEqual(raw(n),raw(p));assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes.map(s=>s.captionStyle),p.scenes.map(s=>s.captionStyle));
 for(const kind of ['paper-crumple','pair','sad-face'])assert.ok(n.expressionReport.events.some(e=>e.kind===kind),'Missing '+kind);
 for(const [name,category,type] of [['leaf-storm','special','grass'],['close-combat','physical','fighting'],['thunderbolt','special','electric']]){const a=n.actionMovieReport.plans.find(a=>a.moveName===name);assert.ok(a,'Missing '+name);assert.equal(a.damageClass,category);assert.equal(a.type,type);}
 assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>l.id.includes('story-thought')));assert.deepEqual(JSON.parse(JSON.stringify(backend.undoRedo(n,'undo').scenes)),JSON.parse(JSON.stringify(p.scenes)));assert.deepEqual(JSON.parse(JSON.stringify(backend.undoRedo(backend.undoRedo(n,'undo'),'redo').scenes)),JSON.parse(JSON.stringify(n.scenes)));
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(n,null,2));
 const samples=n.expressionReport.events.map(e=>({name:e.kind,time:e.kind==='paper-crumple'?Math.min(e.end-.1,e.crumpleAt+.55):e.start+.45}));for(const a of n.actionMovieReport.plans.filter(a=>a.moveName))samples.push({name:a.moveName,time:a.start+a.duration*.4});
 const coldStart=performance.now(),serveUrl=await cachedRenderBundle(root),coldBundleMs=performance.now()-coldStart,warmStart=performance.now();assert.equal(await cachedRenderBundle(root),serveUrl);const warmBundleMs=performance.now()-warmStart,composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:n}});
 for(const sample of samples)await renderStill({serveUrl,composition,inputProps:{project:n},frame:Math.round(sample.time*30),output:path.join(folder,sample.name+'.png'),scale:.5});
 // Render a representative section at the normal export settings. Narration
 // remains one uninterrupted voice track and the source video is untouched.
 const output=await backend.render(n,path.join(folder,'expressions.mp4'),e=>{if(e.percent===undefined)console.log(e.stage);});
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({realWhisper:p.transcriptionInfo,suppliedScriptAligned:p.scriptAlignment,rawNarrationPreserved:true,captionAppearanceUnchanged:true,undoRedo:true,expressions:n.expressionReport,actions:n.actionMovieReport,assets:n.narrationAssetReport,remakeMs,coldBundleMs,warmBundleMs,output:output.output,samples},null,2));console.log('PASS actual generation, remake, sourced expression/move animations, captions, Undo/Redo and export');
}finally{backend.close();}
