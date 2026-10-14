import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','reaction-tests');fs.mkdirSync(folder,{recursive:true});const b=await createBackend({workspace:path.join(folder,'library')});
const cases=[['A','Mario is one of the most iconic characters in gaming.','character'],['B','Charizard is iconic, but Incineroar dominates VGC.','comparison'],['C','Regieleki has a base Speed of 200.','statistic'],['D','Fortnite takes second place, but Melee takes number one.','ranking'],['E','This player had a 70% win rate.','statistic']];
const evidence=[];
try{for(const [id,narration,intent] of cases){if(process.argv[2]&&id<process.argv[2])continue;
 const voice=path.join(folder,`${id}-voice.wav`);await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.Rate = -1; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('${narration.replaceAll("'","''")}'); $speaker.Dispose()`]);
 const media=await b.importMedia(voice,{license:'Generated Windows speech test fixture'});const project=await b.generate({voiceId:media.id,model:'tiny.en',name:`Narration reaction ${id}`},p=>console.log(id,p.stage));
 const reactions=project.scenes.map(s=>s.reaction);fs.writeFileSync(path.join(folder,`${id}.gaming.json`),JSON.stringify(project,null,2));console.log(id,project.scenes.map(s=>s.text),reactions);
 assert.ok(reactions.some(r=>r.intent===intent),`${id} wrong reaction intent`);
 if(id==='A')assert.ok(reactions.some(r=>r.entities.some(e=>e.id==='mario'&&e.mediaId)),'Mario source image missing');
 if(id==='B')assert.ok(reactions.some(r=>['charizard','incineroar'].every(name=>r.entities.some(e=>e.id===name&&e.mediaId))),'Both exact Pokemon must be present');
 if(id==='C')assert.ok(reactions.some(r=>r.metrics.some(m=>m.label==='speed'&&m.value===200&&m.verified)),'Base Speed not independently verified');
 if(id==='D')assert.ok(reactions.some(r=>r.rankings.some(m=>m.entityId==='fortnite'&&m.rank===2)&&r.rankings.some(m=>m.entityId==='melee'&&m.rank===1)),'Spoken ranking not preserved');
 if(id==='E')assert.ok(project.scenes.some(s=>s.layers.some(l=>l.type==='ring'&&l.value===70)),'70% ring missing');
 const output=path.join(folder,`${id}.mp4`);await b.render(project,output);const scene=project.scenes.find(s=>s.reaction.intent===intent);const cue=Math.max(scene.start,...scene.reaction.entities.map(e=>e.start),...scene.reaction.metrics.map(m=>m.start),...scene.reaction.rankings.map(r=>r.start));const t=Math.min(project.duration-.35,cue+.9);
 const frames=[];for(const [i,at] of [Math.min(t-.1,Math.max(scene.start+.07,cue+.08)),t].entries()){const file=path.join(folder,`${id}-frame-${i}.png`);await run('ffmpeg',['-v','error','-y','-ss',String(at),'-i',output,'-frames:v','1',file]);frames.push(PNG.sync.read(fs.readFileSync(file)));}
 let changed=0,colored=0;for(let y=520;y<1480;y++)for(let x=70;x<1010;x++){const n=(y*1080+x)*4;const rgb=frames[1].data.subarray(n,n+3);if(Math.max(...rgb)-Math.min(...rgb)>30)colored++;if([...rgb].reduce((sum,v,k)=>sum+Math.abs(v-frames[0].data[n+k]),0)>45)changed++;}assert.ok(colored>10000,'Blank main composition');assert.ok(changed>300,'Main composition did not animate');
 evidence.push({id,narration,output,duration:project.duration,reactions,sourceColoredPixels:colored,changedPixels:changed});fs.writeFileSync(path.join(folder,'evidence.json'),JSON.stringify(evidence,null,2));
 }}finally{b.close();}
