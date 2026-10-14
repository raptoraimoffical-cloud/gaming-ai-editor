import path from 'node:path';import fs from 'node:fs';import net from 'node:net';import {spawn,execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'workspace/story-model-service');fs.mkdirSync(folder,{recursive:true});
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const output=fs.openSync(path.join(folder,'server.log'),'a'),server=spawn(path.join(root,'.runtime/ollama/ollama.exe'),['serve'],{windowsHide:true,stdio:['ignore',output,output],env:{...process.env,OLLAMA_HOST:'127.0.0.1:'+port,OLLAMA_MODELS:path.join(root,'.runtime/ollama-models'),OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_NUM_PARALLEL:'1',OLLAMA_KEEP_ALIVE:'0'}});fs.closeSync(output);
let check;
try{
 const url='http://127.0.0.1:'+port;let ready=false;
 for(let i=0;i<80;i++){try{ready=(await fetch(url+'/api/version',{signal:AbortSignal.timeout(500)})).ok;}catch{}if(ready)break;if(server.exitCode!==null)throw Error('Diagnostic model service exited');await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw Error('Diagnostic model service did not start');
 console.log('Fresh trained checks using an isolated CPU model service');
 const script=process.env.GAMING_MODEL_CHECK_SCRIPT||'scripts/verify-general-story-quality.mjs';
 check=spawn(process.execPath,[path.join(root,script),'--export',...process.argv.slice(2)],{windowsHide:true,stdio:'inherit',cwd:root,env:{...process.env,GAMING_MODEL_CHECK_URL:url}});
 const code=await new Promise((resolve,reject)=>{check.on('exit',resolve);check.on('error',reject);});process.exitCode=code||0;
}finally{if(check?.exitCode===null)check.kill();if(server.exitCode===null)try{execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{server.kill();}}
