import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';import {composeReaction} from '../electron/subject-visuals.mjs';import {refreshStoryboard} from '../electron/storyboard.mjs';
const folder=path.join(root,'workspace/visual-quality');const b=await createBackend({workspace:path.join(folder,'verification-library')});
try{
 const original=JSON.parse(fs.readFileSync(path.join(folder,'evolution.gaming.json'),'utf8'));
 const horizontal=refreshStoryboard({...original,format:'horizontal',scenes:original.scenes.map(s=>composeReaction({...s,captionStyle:undefined},{...original,format:'horizontal'}))});
 const h=process.argv.includes('--reuse-horizontal')?{output:path.join(folder,'evolution-horizontal.mp4'),width:1920,height:1080}:await b.render(horizontal,path.join(folder,'evolution-horizontal.mp4'));
 fs.writeFileSync(path.join(folder,'evolution-horizontal.gaming.json'),JSON.stringify(horizontal,null,2));
 const horizontalFrame=path.join(folder,'evolution-horizontal.png');await run('ffmpeg',['-v','error','-y','-ss','2.5','-i',h.output,'-frames:v','1',horizontalFrame]);
 const hp=PNG.sync.read(fs.readFileSync(horizontalFrame)),corners=[40,1840].map(x=>Array.from(hp.data.subarray((40*1920+x)*4,(40*1920+x)*4+3)));
 assert.ok(corners.every(rgb=>rgb[1]>80&&rgb[2]>80),'The real horizontal environment has empty dark side margins');
 // Disable every programmed transform and remove captions. Only the GIF's native frames can change.
 const scene=original.scenes[0],subject=scene.layers.find(l=>l.mediaId==='pokemon-blastoise'),bg=scene.layers[0];
 const frozen={...original,duration:1.3,musicId:undefined,soundEffects:[],freezePokemonMotion:true,scenes:[{...scene,id:'native-gif',start:0,end:1.3,words:[],text:'',pokemon:[],reaction:{entities:[{id:'blastoise',type:'pokemon',name:'Blastoise',mediaId:'pokemon-blastoise'}]},layers:[{...bg,start:0,end:1.3,keyframes:[]},{...subject,start:0,end:1.3,keyframes:[],reveal:undefined,enter:'none',exit:undefined,scale:1}]}]};
 const gif=await b.render(frozen,path.join(folder,'native-gif-animation.mp4'));
 const frames=[];for(const t of [.3,.5,.8]){const file=path.join(folder,`native-gif-${t}.png`);await run('ffmpeg',['-v','error','-y','-ss',String(t),'-i',gif.output,'-frames:v','1',file]);frames.push(PNG.sync.read(fs.readFileSync(file)));}
 const differences=frames.slice(1).map(frame=>{let changed=0;for(let y=250;y<1500;y++)for(let x=120;x<960;x++){const i=(y*1080+x)*4;if([0,1,2].reduce((n,c)=>n+Math.abs(frame.data[i+c]-frames[0].data[i+c]),0)>60)changed++;}return changed;});
 assert.ok(Math.max(...differences)>1000,'Native sprite animation is frozen in the actual MP4');
 fs.writeFileSync(path.join(folder,'animation-verification.json'),JSON.stringify({horizontal:h,horizontalEdgePixels:corners,nativeGif:gif,allProgrammedMotionDisabled:true,captionsRemoved:true,changedSubjectPixels:differences,nativeFrameCount:original.media.find(m=>m.id==='pokemon-blastoise').pokemon.frameCount},null,2));
 console.log('Verified horizontal export and native GIF animation in actual MP4:',differences);
}finally{b.close();}
