import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
export function createBackgroundCutouts(folder,{python,root}={}){
 fs.mkdirSync(folder,{recursive:true});let child,pending='',counter=0;const waiting=new Map(),inflight=new Map();
 function start(){if(child)return;child=spawn(python,[path.join(root,'python','remove_background.py')],{windowsHide:true,env:{...process.env,U2NET_HOME:path.join(root,'.runtime','models','segmentation')}});
  child.stdout.on('data',d=>{pending+=d;let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);try{const result=JSON.parse(line),job=waiting.get(result.id);if(job){waiting.delete(result.id);result.ok?job.resolve(result):job.reject(Error(result.error));}}catch{}}});
  child.stderr.on('data',()=>{});const fail=error=>{for(const job of waiting.values())job.reject(error);waiting.clear();child=undefined;pending='';};child.on('error',fail);child.on('exit',()=>fail(Error('Background removal worker stopped')));
 }
 async function cutout(media){
  if(media.transparent)return media;
  const signature=crypto.createHash('sha256').update('isnet-general-use:v1:original-rgb:').update(fs.readFileSync(media.path)).digest('hex'),output=path.join(folder,signature+'.png');
  if(inflight.has(signature))return inflight.get(signature);
  const task=(async()=>{let cached=fs.existsSync(output);if(cached)try{await sharp(output).metadata();}catch{cached=false;}
   if(!cached){start();const id=++counter;await new Promise((resolve,reject)=>{waiting.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,input:media.path,output})+'\n');});}
   const dims=await sharp(output).metadata();return {...media,id:media.id+'-cutout-'+signature.slice(0,12),path:output,url:'',width:dims.width,height:dims.height,transparent:true,decoded:true,cutout:{model:'isnet-general-use',sourceMediaId:media.id,originalPath:media.path,contentHash:signature},attribution:{...media.attribution,changes:[media.attribution?.changes,'Background removed by local IS-Net; source RGB and resolution preserved'].filter(Boolean).join('; ')}};
  })();inflight.set(signature,task);try{return await task;}finally{inflight.delete(signature);}
 }
 return {cutout,close(){child?.kill();child=undefined;}};
}
