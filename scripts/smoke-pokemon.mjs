import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','pokemon-smoke');fs.mkdirSync(folder,{recursive:true});
const voice=path.join(folder,'pokemon-voice.wav');
await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.Rate = -1; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('Charizard takes flight with powerful wings. Mega Charizard Y brings a different form and incredible fire power. Incineroar stands ready for the next battle. Delibird delivers a surprise with its icy moves.'); $speaker.Dispose()`]);
const backend=await createBackend({workspace:path.join(folder,'library')});try{
 const m=await backend.importMedia(voice,{license:'Generated Windows speech test fixture'});
 const p=await backend.generate({voiceId:m.id,model:'tiny.en',name:'Pokémon sprite verification'},console.log);
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(p,null,2));
 console.log(JSON.stringify({transcript:p.scenes.map(s=>s.text),mentions:p.pokemonMentions},null,2));
 assert.deepEqual(p.pokemonMentions.map(m=>m.name),['charizard','charizard-mega-y','incineroar','delibird']);
 assert.ok(p.pokemonMentions.every(m=>m.status==='ready'));
 assert.deepEqual(p.pokemonMentions.map(m=>p.media.find(a=>a.id===m.mediaId).pokemon.formId),[6,10035,727,225]);
 assert.ok(p.media.filter(m=>m.pokemon).every(m=>m.pokemon.animated&&m.pokemon.frameCount>1));
 console.log(await backend.render(p,path.join(folder,'pokemon.mp4'),x=>{if(x.percent>85||x.percent<6)console.log(x);}));
}finally{backend.close();}
