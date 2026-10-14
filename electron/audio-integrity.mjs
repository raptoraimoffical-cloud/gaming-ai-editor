import fs from 'node:fs';import crypto from 'node:crypto';
const cache=new Map(),pending=new Map();
const identityKey=(file,stat)=>file+'|'+stat.size+'|'+stat.mtimeMs+'|'+stat.ctimeMs;
export function audioIdentity(media){
 if(media.kind!=='audio'||!media.path||!fs.existsSync(media.path))return media;
 const stat=fs.statSync(media.path),key=identityKey(media.path,stat);
 let identity=cache.get(key);if(!identity){identity={contentHash:crypto.createHash('sha256').update(fs.readFileSync(media.path)).digest('hex')};cache.set(key,identity);}
 return {...media,...identity};
}
export async function fingerprintAudio(media,run){
 let next=audioIdentity(media);if(next.kind!=='audio'||!next.contentHash)return next;
 const stat=fs.statSync(media.path),key=identityKey(media.path,stat),identity=cache.get(key);
 if(!identity.audioFingerprint){
  let task=pending.get(key);
  if(!task){task=(async()=>{const out=await run('ffmpeg',['-v','error','-i',media.path,'-map','0:a:0','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le','-f','hash','-hash','sha256','-']);const value=out.trim().match(/^SHA256=([a-f0-9]{64})$/i)?.[1];if(!value)throw Error('Audio identity check failed');identity.audioFingerprint=value;})();pending.set(key,task);task.finally(()=>{if(pending.get(key)===task)pending.delete(key);}).catch(()=>{});}
  await task;
 }
 return {...next,...identity};
}
export async function prepareAudio(project,run){
 const ids=new Set([project.voiceId,project.musicId,...(project.soundEffects||[]).map(f=>f.mediaId)]);
 const media=[...project.media],jobs=media.map((m,i)=>({m,i})).filter(({m})=>ids.has(m.id)&&m.kind==='audio');let index=0,failed=false;
 const results=await Promise.allSettled(Array.from({length:Math.min(4,jobs.length)},async()=>{try{while(!failed&&index<jobs.length){const {m,i}=jobs[index++];media[i]=await fingerprintAudio(m,run);}}catch(e){failed=true;throw e;}}));
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
 return {...project,media};
}
