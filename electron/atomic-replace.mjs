import fs from 'node:fs';
// Windows scanners can briefly hold a freshly written database or its target.
// Retry the same atomic rename; never truncate the last good database.
export function atomicReplaceSync(source,target,{rename=fs.renameSync,platform=process.platform,pause=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms)}={}){
 for(let attempt=0;;attempt++)try{rename(source,target);return;}catch(e){
  if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt>=5)throw e;
  pause(25*2**attempt);
 }
}
