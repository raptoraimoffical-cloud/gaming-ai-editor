import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','commons-smoke');fs.mkdirSync(folder,{recursive:true});
const voice=path.join(folder,'voice.wav');
await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.Rate = -1; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('The Nintendo Game Boy made portable gaming iconic. Its physical design remains instantly recognizable. Now compare Charizard with Incineroar. Their base attack statistics come directly from the Pokemon database. Mega Charizard Y brings a distinct form. Delibird delivers a surprise with its icy moves.'); $speaker.Dispose()`]);
const backend=await createBackend({workspace:path.join(folder,'library')});try{
 const m=await backend.importMedia(voice,{license:'Generated Windows speech test fixture'});
 let p=await backend.generate({voiceId:m.id,model:'tiny.en',name:'Gaming visual engine verification'},console.log);
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(p,null,2));console.log(p.scenes.map(s=>s.text));console.log(p.pokemonMentions);
 assert.ok(p.media.some(m=>m.attribution?.source.includes('commons.wikimedia.org')),'Commons image was automatically downloaded');
 assert.ok(p.scenes.every(s=>s.layers.length>=4));
 assert.ok(p.pokemonMentions.some(m=>m.name==='charizard'&&m.status==='ready'));
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(p,null,2));
 console.log(await backend.render(p,path.join(folder,'gaming.mp4'),x=>{if(x.percent>85||x.percent<6)console.log(x);}));
 for(const t of [2,10,16])await run('ffmpeg',['-y','-ss',String(t),'-i',path.join(folder,'gaming.mp4'),'-frames:v','1',path.join(folder,`frame-${t}.png`)]);
 console.log(JSON.stringify({duration:p.duration,scenes:p.scenes.map(s=>({text:s.text,layers:s.layers.length})),attribution:p.media.filter(m=>m.attribution).map(m=>m.attribution)},null,2));
}finally{backend.close();}
