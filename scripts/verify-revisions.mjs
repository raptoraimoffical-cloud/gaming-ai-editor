import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';
import {applyInstructions} from '../electron/editing-instructions.mjs';
import {layerRole} from '../electron/revisions.mjs';
import {directVisuals} from '../electron/visual-director.mjs';
const folder=path.join(root,'workspace','revision-tests');fs.mkdirSync(folder,{recursive:true});
const b=await createBackend({workspace:path.join(root,'workspace','reaction-tests','library')});
const instructions='Use dark Pokemon-themed backgrounds. Animate characters onto the screen when they are mentioned. Keep subtitles small and minimal. Use quick transitions but avoid excessive shaking.';
const write=(name,p)=>fs.writeFileSync(path.join(folder,name+'.gaming.json'),JSON.stringify(p,null,2));
const frame=async(video,name,time)=>{const file=path.join(folder,name+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(time),'-i',path.join(folder,video+'.mp4'),'-frames:v','1',file]);return PNG.sync.read(fs.readFileSync(file));};
function changed(a,b,rect){let n=0;for(let y=rect[1];y<rect[3];y++)for(let x=rect[0];x<rect[2];x++){const i=(y*a.width+x)*4;if([0,1,2].reduce((sum,k)=>sum+Math.abs(a.data[i+k]-b.data[i+k]),0)>35)n++;}return n;}
try{
 const voice=path.join(folder,'voice.wav');await run('powershell',['-NoProfile','-Command',`Add-Type -AssemblyName System.Speech; $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speaker.Rate = -2; $speaker.SetOutputToWaveFile('${voice.replaceAll("'","''")}'); $speaker.Speak('Charizard is iconic. Incineroar stands ready for battle. Regieleki has a base Speed of 200.'); $speaker.Dispose()`]);
 const imported=await b.importMedia(voice,{license:'Generated Windows speech verification fixture'});
 const generated=process.argv.includes('--resume')?b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'instructed.gaming.json'),'utf8'))):await b.generate({voiceId:imported.id,model:'tiny.en',name:'Instruction and revision acceptance',editingInstructions:instructions},p=>console.log(p.stage));
 assert.equal(generated.scenes.length,3);assert.equal(generated.captionStyle.fontSize,30);assert.ok(generated.scenes[0].layers[0].color.includes('#050812'));assert.ok(generated.scenes[2].reaction.metrics.some(m=>m.verified&&m.value===200));
 // Freeze card transforms for reproducible source-sprite bounds; source GIFs still animate frame-by-frame.
 generated.freezePokemonMotion=true;write('instructed',generated);
 const baseline=applyInstructions(directVisuals({...generated,captionStyle:undefined,editingInstructions:'',scenes:generated.scenes.map(s=>({...s,layers:undefined,captionStyle:undefined}))}), '');write('baseline',baseline);
 if(!process.argv.includes('--resume'))await b.render(baseline,path.join(folder,'baseline.mp4'),p=>{if(p.percent===100)console.log(p.stage,'baseline');});
 if(!process.argv.includes('--resume'))await b.render(generated,path.join(folder,'instructed.mp4'),p=>{if(p.percent===100)console.log(p.stage,'instructed');});
 let revised=await b.revise(generated,'Make Charizard 30% bigger.');const scaled=revised.scenes[0].layers.find(l=>l.mediaId===revised.scenes[0].reaction.entities[0].mediaId);assert.equal(scaled.scale,1.3);assert.deepEqual(revised.scenes.slice(1),generated.scenes.slice(1));
 revised=await b.revise(revised,"Change Scene 2's background to dark red.");assert.equal(revised.scenes[1].layers[0].color,'#350d19');
 const beforeRemoval=structuredClone(revised),title=revised.scenes[2].layers.find(l=>layerRole(l,revised.scenes[2])==='title');assert.ok(title);
 revised=await b.revise(revised,'Remove the title in Scene 3.');assert.deepEqual(revised.scenes[2].layers,beforeRemoval.scenes[2].layers.filter(l=>l.id!==title.id));assert.deepEqual(b.undoRedo(revised,'undo').scenes,beforeRemoval.scenes);assert.deepEqual(b.undoRedo(b.undoRedo(revised,'undo'),'redo').scenes,revised.scenes);
 await assert.rejects(b.revise(revised,'Make a 3D cinematic walking animation.'),/Unsupported|ambiguous|not found/);
 write('revised',revised);const reopened=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'revised.gaming.json'),'utf8')));assert.equal(reopened.editingInstructions,instructions);assert.equal(JSON.stringify(reopened.scenes),JSON.stringify(revised.scenes));assert.equal(reopened.revisionHistory.length,3);assert.equal(JSON.stringify(b.undoRedo(reopened,'undo').scenes),JSON.stringify(beforeRemoval.scenes));
 if(!process.argv.includes('--frames-only'))await b.render(reopened,path.join(folder,'revised.mp4'),p=>{if(p.percent===100)console.log(p.stage,'revised');});
 const live={...reopened,freezePokemonMotion:false};write('revised-live',live);
 if(!process.argv.includes('--frames-only'))await b.render(live,path.join(folder,'revised-live.mp4'),p=>{if(p.percent===100)console.log(p.stage,'revised-live');});
 const evidence={duration:generated.duration,instructions,checks:[],exports:['baseline.mp4','instructed.mp4','revised.mp4','revised-live.mp4']};
 for(let i=0;i<3;i++){const s=generated.scenes[i],t=Math.min(s.end-.2,Math.max(s.start+.9,...s.reaction.entities.map(e=>e.start+.9),...(s.reaction.metrics?.map(m=>m.start+.9)||[])));const base=await frame('baseline',`baseline-scene-${i+1}`,t),original=await frame('instructed',`instructed-scene-${i+1}`,t),updated=await frame('revised',`revised-scene-${i+1}`,t);
  const instructionPixels=changed(base,original,[15,50,1065,1850]);assert.ok(instructionPixels>10000,'Instruction effects missing from export');
  const area=i===0?[120,620,970,1400]:i===1?[25,400,1055,1500]:[70,220,1010,430];const editedPixels=changed(original,updated,area);assert.ok(editedPixels>1500,'Revision missing from exported frames');
  if(i===0){function spriteBounds(png){let minX=1080,maxX=0,minY=1920,maxY=0,count=0;for(let y=480;y<1510;y++)for(let x=0;x<1080;x++){const k=(y*1080+x)*4,r=png.data[k],g=png.data[k+1],blue=png.data[k+2];if(r>110&&r>g*1.35&&g>40&&r>blue*1.7){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}}return {width:maxX-minX+1,height:maxY-minY+1,count};}const a=spriteBounds(original),z=spriteBounds(updated);assert.ok(z.width>a.width*1.18&&z.height>a.height*1.18,`Sprite bounds did not grow: ${JSON.stringify({a,z})}`);evidence.spriteBounds={before:a,after:z};}
  if(i===1){const k=(600*1080+40)*4;assert.ok(updated.data[k]>updated.data[k+1]*2&&updated.data[k]>updated.data[k+2]*1.3,'Dark red background pixels missing');}
  evidence.checks.push({scene:i+1,time:t,instructionPixels,editedPixels});
 }
 const liveA=await frame('revised-live','live-animation-a',.9),liveB=await frame('revised-live','live-animation-b',1.1);evidence.liveAnimationChangedPixels=changed(liveA,liveB,[100,640,980,1490]);assert.ok(evidence.liveAnimationChangedPixels>1000,'Live export sprite did not animate');
 fs.writeFileSync(path.join(folder,'evidence.json'),JSON.stringify(evidence,null,2));
 fs.writeFileSync(path.join(folder,'review.html'),`<!doctype html><meta charset="utf-8"><title>Editing revisions verification</title><style>body{background:#101523;color:white;font:16px Arial}main{display:flex;gap:20px}article{width:300px}img,video{width:100%}</style><h1>Actual MP4s and decoded frames</h1><p>Diagnostic versions hold layer transforms fixed to measure changes; source GIFs keep animating. The live export includes all entrances, exits and chart animation.</p><video controls src="revised-live.mp4" style="width:300px"></video><main>${['baseline','instructed','revised'].map(n=>`<article><h2>${n}</h2><video controls src="${n}.mp4"></video>${[1,2,3].map(i=>`<img src="${n}-scene-${i}.png">`).join('')}</article>`).join('')}</main>`);
 console.log('Verified instruction-conditioned generation, scale pixel bounds, red background, title removal, undo/redo, saved history, and unsupported requests',evidence);
}finally{b.close();}
