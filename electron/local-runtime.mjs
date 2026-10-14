import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
let starting;
export async function ensureLocalRuntime(url){
 if(new URL(url).origin!=='http://127.0.0.1:11535')return;
 const root=path.resolve(import.meta.dirname,'..'),exe=path.join(root,'.runtime/ollama/ollama.exe');
 if(!fs.existsSync(exe))return;
 async function alive(){try{return (await fetch(url+'/api/version',{signal:AbortSignal.timeout(800)})).ok;}catch{return false;}}
 if(await alive())return;
 if(!starting)starting=(async()=>{
  const logs=path.join(root,'workspace/local-models');fs.mkdirSync(logs,{recursive:true});
  const out=fs.openSync(path.join(logs,'server-out.log'),'a'),err=fs.openSync(path.join(logs,'server-error.log'),'a');
  const child=spawn(exe,['serve'],{windowsHide:true,detached:true,stdio:['ignore',out,err],env:{...process.env,OLLAMA_HOST:'127.0.0.1:11535',OLLAMA_MODELS:path.join(root,'.runtime/ollama-models'),OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_KEEP_ALIVE:'120s',OLLAMA_CONTEXT_LENGTH:'4096'}});
  let error;child.on('error',e=>{error=e;});child.unref();fs.closeSync(out);fs.closeSync(err);
  for(let i=0;i<40;i++){if(error)throw error;if(await alive())return;await new Promise(r=>setTimeout(r,250));}
  throw Error('Project-local model server did not start; see workspace/local-models/server-error.log');
 })().finally(()=>{starting=undefined;});
 return starting;
}
