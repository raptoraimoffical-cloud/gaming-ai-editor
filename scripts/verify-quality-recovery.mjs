import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import {createBackend,root,run,python} from '../electron/backend.mjs';
import {inspectScene} from '../electron/quality-review.mjs';

const folder=path.join(root,'workspace/quality-recovery-tests');fs.mkdirSync(folder,{recursive:true});
const backend=await createBackend({workspace:path.join(folder,'library-'+Date.now())});
try{
 const source=JSON.parse(fs.readFileSync(path.join(root,'workspace/editor-rebuild-tests/modes/fast.gaming.json'),'utf8'));
 let project=backend.hydrate({...source,id:'quality-recovery-'+Date.now(),name:'Actual rendered review acceptance'});
 const png=new PNG({width:64,height:64});for(let i=0;i<png.data.length;i+=4){png.data[i]=255;png.data[i+1]=96;png.data[i+2]=0;png.data[i+3]=255;}
 const square=path.join(folder,'original-orange-test-layer.png');fs.writeFileSync(square,PNG.sync.write(png));
 const asset=await backend.importMedia(square,{license:'CC0 original acceptance graphic'});project.media.push(asset);
 const scene=project.scenes[0];scene.layers.push({id:'review-test-layer',type:'image',role:'subject',mediaId:asset.id,x:.8,y:.25,width:.35,height:.18,z:100,start:scene.start,end:scene.end,animation:'none',exit:'none',fit:'fill'});
 const before=structuredClone(project);assert.ok(inspectScene(scene,project).some(f=>f.layerId==='review-test-layer'));
 const state=await backend.localAI.begin('high');state.cfg.frameSamples=1;
 const serveUrl=await bundle({entryPoint:path.join(root,'src/remotion.tsx')});
 const corrected=await backend.localAI.direct(project,state,p=>console.log(p.stage),async(p,frame,label)=>{
  const composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:p}}),file=path.join(folder,label+'-'+frame+'.png');
  await renderStill({composition,serveUrl,inputProps:{project:p},output:file,frame});return {path:file};
 });
 assert.equal(corrected.scenes[0].layers.at(-1).x,.65);assert.ok(!inspectScene(corrected.scenes[0],corrected).some(f=>f.layerId==='review-test-layer'));
 assert.deepEqual(corrected.scenes.slice(1),before.scenes.slice(1));assert.equal(corrected.voiceId,before.voiceId);assert.equal(corrected.duration,before.duration);
 assert.ok(corrected.processingReport.corrections.some(c=>c.accepted));
 fs.writeFileSync(path.join(folder,'before.gaming.json'),JSON.stringify(before,null,2));fs.writeFileSync(path.join(folder,'corrected.gaming.json'),JSON.stringify(corrected,null,2));
 await backend.render(before,path.join(folder,'before.mp4'),p=>{if(p.percent===100)console.log(p.stage);});
 const output=await backend.render(corrected,path.join(folder,'corrected.mp4'),p=>{if(p.percent===100)console.log(p.stage);});
 const probe=JSON.parse(await run(python(),['-c',`import cv2,json,numpy as np
results=[]
for name in ['before','corrected']:
 cap=cv2.VideoCapture(r'${folder}'+r'/'+name+'.mp4');cap.set(cv2.CAP_PROP_POS_MSEC,750);ok,frame=cap.read();assert ok
 rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB);mask=(rgb[:,:,0]>235)&(rgb[:,:,1]>75)&(rgb[:,:,1]<120)&(rgb[:,:,2]<20);n,labels,stats,centroids=cv2.connectedComponentsWithStats(mask.astype('uint8'))
 regions=sorted(stats[1:],key=lambda s:int(s[4]),reverse=True);assert len(regions)>0;x,y,w,h,area=map(int,regions[0]);results.append(dict(name=name,x=x,y=y,width=w,height=h,area=area));cv2.imwrite(r'${folder}'+r'/'+name+'-decoded.png',frame);cap.release()
assert results[1]['x']<results[0]['x']-140,results
assert results[1]['width']>results[0]['width']+140,results
print(json.dumps(results))`]));
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({actualVoiceReused:true,realRemotionFrameReview:true,semanticModelConfigured:!!state.models.vision,unchangedScenesPreserved:true,output,pixelProbe:probe,processing:corrected.processingReport},null,2));
 console.log('PASS: actual frame review corrected clipping, preserved other scenes/audio, exported both MP4s; encoded orange layer moved left and regained >140 pixels of previously clipped width.');
}finally{backend.close();}
