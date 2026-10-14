import {analyzeReaction} from '../electron/reactions.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {directVisuals} from '../electron/visual-director.mjs';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','pokemon-smoke');const b=await createBackend({workspace:path.join(folder,'library')});
try{
 const original=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8')));
 // Disable ALL card movement to prove exported pixel changes come from original GIF frames.
 const sprites=original.media.filter(m=>m.pokemon);let p={...original,name:'GIF animation diagnostic',duration:6,freezePokemonMotion:true,scenes:sprites.map((m,i)=>({id:`probe-${i}`,start:i*1.5,end:(i+1)*1.5,text:m.name,title:m.name,kind:'story',words:[],pokemonLayout:'solo',pokemon:[{mentionId:`probe-${i}`,mediaId:m.id,start:i*1.5,end:(i+1)*1.5}]}))};
 const reaction=process.argv.includes('--reaction');const layers=process.argv.includes('--layers')||reaction;if(reaction)p={...p,scenes:p.scenes.map(s=>({...s,pokemonMode:'manual',reaction:analyzeReaction({...s,pokemonMode:'manual'},p)}))};if(layers)p=directVisuals(p);
 const output=path.join(folder,reaction?'reaction-animation-proof.mp4':layers?'layer-animation-proof.mp4':'animation-proof.mp4');await b.render(p,output);
 const evidence=[];
 for(let i=0;i<sprites.length;i++){
  const images=[];for(const [j,t] of [i*1.5+.3,i*1.5+.8].entries()){
   const f=path.join(folder,`animation-${i}-${j}.png`);await run('ffmpeg',['-v','error','-y','-ss',String(t),'-i',output,'-vf','crop=540:540:270:590','-frames:v','1','-update','1',f]);images.push(PNG.sync.read(fs.readFileSync(f)));
  }
  let colored=0,changed=0,totalDifference=0;const [a,c]=images;
  for(let n=0;n<a.data.length;n+=4){const rgb=[a.data[n],a.data[n+1],a.data[n+2]];if(Math.max(...rgb)-Math.min(...rgb)>45)colored++;let delta=0;for(let k=0;k<3;k++)delta+=Math.abs(a.data[n+k]-c.data[n+k]);if(delta>30)changed++;totalDifference+=delta;}
  assert.ok(colored>1000,`${sprites[i].name} did not appear in the exported sprite region`);
  assert.ok(changed>300,`${sprites[i].name} appears frozen despite disabling card movement`);
  evidence.push({name:sprites[i].pokemon.name,formId:sprites[i].pokemon.formId,source:sprites[i].pokemon.sourceUrl,gifFrames:sprites[i].pokemon.frameCount,sourceColoredPixels:colored,changedPixels:changed,meanChannelDifference:totalDifference/(a.width*a.height*3)});
 }
 fs.writeFileSync(path.join(folder,reaction?'reaction-animation-verification.json':layers?'layer-animation-verification.json':'animation-verification.json'),JSON.stringify({output,cardMotionDisabled:true,evidence},null,2));console.log(JSON.stringify(evidence,null,2));
}finally{b.close();}
