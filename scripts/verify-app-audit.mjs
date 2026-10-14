import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createBackend,root,run} from '../electron/backend.mjs';
import {quickPatch} from '../electron/quick-patch.mjs';
import {renderProject} from '../electron/render-project.mjs';
import {cachedRenderBundle} from '../electron/render-bundle-cache.mjs';
import {renderStill,selectComposition} from '@remotion/renderer';
const folder=path.join(root,'workspace/feature-audit/render');fs.mkdirSync(folder,{recursive:true});
const backend=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')});
const pixels=file=>sharp(file).raw().toBuffer();
try {
 const original=backend.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8')));
 const source=await backend.remake(original,'Make the character smaller',{timeRange:{start:3,end:4},useAI:false,preserveCaptions:true});
 const begin=performance.now(),remade=await backend.remake(source,'',{useAI:false,preserveCaptions:true},{},p=>console.log(p.stage));
 const remakeSeconds=(performance.now()-begin)/1000;
 assert.deepEqual(remade.scenes.flatMap(s=>s.words),source.scenes.flatMap(s=>s.words));assert.deepEqual(remade.captionStyle,source.captionStyle);
 const serveUrl=await cachedRenderBundle(root),composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:source}});
 const still=async(p,name,time,c=composition)=>{const file=path.join(folder,name+'.png');await renderStill({serveUrl,composition:{...c,props:{...c.props,project:p}},inputProps:{project:p},frame:Math.round(time*30),output:file,scale:.25});return pixels(file);};
 assert.ok(!(await still(source,'local-patch',3.5)).equals(await still(remade,'fresh-full-remake',3.5)),'A whole remake reused old reviewed patch pixels');assert.equal(remade.quickPatchRanges,undefined);
 const reduced=renderProject(original);
 for(const time of [0.5,3.5,11.5])assert.ok((await still(original,'full-props-'+time,time)).equals(await still(reduced,'lean-props-'+time,time)),'Render payload changed pixels at '+time);
 console.log('PASS real full remake replaces old patch pixels and reduced props retain captions and imagery.');
 const movie=path.join(folder,'loop-source.mp4'),gif=path.join(folder,'loop-source.gif'),voice=path.join(folder,'voice.wav');
 await run('ffmpeg',['-y','-v','error','-f','lavfi','-i','testsrc2=size=180x320:rate=30:duration=4','-c:v','libx264','-pix_fmt','yuv420p',movie]);
 await run('ffmpeg',['-y','-v','error','-i',movie,'-vf','fps=10,scale=90:160',gif]);
 await run('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=440:duration=4','-c:a','pcm_s16le',voice]);
 const v=await backend.importMedia(voice,{license:'Generated diagnostic tone'}),m=await backend.importMedia(movie,{license:'Generated diagnostic test pattern'}),g={...await backend.importMedia(gif,{license:'Generated diagnostic test pattern'}),id:'audit GIF /#?%'};
 let fixture=backend.hydrate({id:'audit-loop',name:'Audit playback fixture',voiceId:v.id,format:'vertical',duration:4,captionColor:'#ffffff',musicVolume:0,media:[v,m,g],scenes:[{id:'s',start:0,end:4,text:'Playback test',words:[{text:'Playback',start:0,end:.5},{text:'test',start:.5,end:1}],layers:[{id:'clip',type:'video',role:'gameplay',mediaId:m.id,x:0,y:0,width:1,height:1,z:1,start:0,end:4,videoStart:.5,videoEnd:1.5}]}]});
 const fc=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:fixture}}),frames=[2.4,2.5,2.8,3.1,3.7,3.8];
 for(const kind of ['video','gif']){
  const source=structuredClone(fixture);if(kind==='gif'){source.scenes[0].layers[0].type='image';source.scenes[0].layers[0].mediaId=g.id;delete source.scenes[0].layers[0].videoStart;delete source.scenes[0].layers[0].videoEnd;}
  const patched=await quickPatch(source,'Raise layer',{timeRange:{start:2.5,end:3.75}},{edit:async p=>{p.scenes[0].layers[0].z++;return p;}});
  for(const time of frames)assert.ok((await still(source,kind+'-original-'+time,time,fc)).equals(await still(patched,kind+'-patched-'+time,time,fc)),kind+' restarted or changed source time at '+time);
  if(kind==='video')fixture=patched;
 }
 console.log('PASS actual video and GIF patch frames match before, within and after multiple loop boundaries.');
 const exported=await backend.render(fixture,path.join(folder,'verified-audit.mp4'),p=>{if(p.percent===undefined||p.percent===100)console.log(p.stage);});
 const report={checkedAt:new Date().toISOString(),realRemakeSeconds:remakeSeconds,originalRenderBytes:Buffer.byteLength(JSON.stringify(original)),optimizedRenderBytes:Buffer.byteLength(JSON.stringify(reduced)),freshRemakeReplacedPatch:true,renderPayloadPixelsPreserved:true,loopFramesPreserved:true,export:exported};
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log('PASS export, ffprobe validation and attribution output',JSON.stringify(report));
}finally{backend.close();}
