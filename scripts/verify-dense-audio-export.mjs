import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';import {cachedRenderBundle} from '../electron/render-bundle-cache.mjs';import {renderMedia,selectComposition} from '@remotion/renderer';
process.on('unhandledRejection',e=>{process.exitCode=1;console.error('BACKGROUND AUDIO FAILURE:',e);});
const folder=path.join(root,'workspace/dense-audio-export-check');fs.mkdirSync(folder,{recursive:true});const b=await createBackend({workspace:folder});
try{
 const voice=await b.importMedia('C:/Users/Eli/Downloads/1012 (1).MP3'),cry=await b.pokemonCry('pikachu'),duration=voice.duration,words=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/eric-rios-timing.json'),'utf8')).segments.flatMap(s=>s.words);
 const p={id:'dense-audio-diagnostic',voiceId:voice.id,duration,fps:60,format:'vertical',media:[voice,cry],soundEffects:Array.from({length:66},(_,i)=>({mediaId:cry.id,start:i*duration/66,end:Math.min(duration,i*duration/66+.25),volume:.08,duck:true})),scenes:[{id:'audio',start:0,end:duration,text:words.map(w=>w.text).join(' '),words,layers:[]}]};
 const inputProps={project:b.hydrate(p)},serveUrl=await cachedRenderBundle(root),composition=await selectComposition({serveUrl,id:'GamingAudio',inputProps});console.log('Starting full-duration 60 FPS audio-only test with 66 cues');
 await renderMedia({serveUrl,composition,inputProps,codec:'wav',imageFormat:'none',concurrency:2,outputLocation:path.join(folder,'dense-audio.wav')});assert.ok(fs.statSync(path.join(folder,'dense-audio.wav')).size>100000);console.log('PASS dense audio export');
}catch(e){console.error('PRIMARY EXPORT FAILURE:',e.stack||e);process.exitCode=1;}finally{b.close();}
