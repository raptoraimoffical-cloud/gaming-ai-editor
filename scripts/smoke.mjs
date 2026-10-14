import fs from 'node:fs';import path from 'node:path';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','smoke');fs.mkdirSync(folder,{recursive:true});
const voice=path.join(folder,'voice.wav');
await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('Valorant rewards precision. A great player wins the round with patience and perfect timing.'); $speaker.Dispose()`]);
const backend=await createBackend({workspace:path.join(folder,'library')});try{
 const m=await backend.importMedia(voice,{license:'Generated Windows speech test fixture'});
 const p=await backend.generate({voiceId:m.id,model:'tiny.en',name:'Verified smoke test'},console.log);
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(p,null,2));
 const result=await backend.render(p,path.join(folder,'output.mp4'),p=>{if(p.percent>85||p.percent<6)console.log(p);});
 console.log(JSON.stringify({result,transcript:p.scenes.map(s=>s.text)},null,2));
}finally{backend.close();}
