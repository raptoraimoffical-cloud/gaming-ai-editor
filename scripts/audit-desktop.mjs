import {spawn} from 'node:child_process';
import fs from 'node:fs';
const checks=['check-ai-edits-desktop.cjs','check-creation-desktop.cjs','check-combined-guide-desktop.cjs','check-progress-desktop.cjs','check-youtube-modes-desktop.cjs','check-animator-desktop.cjs','check-cries-fortnite-desktop.cjs','check-models-fortnite-desktop.cjs','check-asset-upload-desktop.cjs','check-quality-settings-desktop.cjs','check-health-desktop.cjs','check-production-health.cjs','check-workbench-desktop.cjs'];
if(process.argv.includes('--online'))checks.push('check-asset-revisions-desktop.cjs');
const results=[];
for(const check of checks){
 const start=Date.now();console.log('Checking '+check);
 const result=await new Promise(resolve=>{
  const child=spawn(process.execPath,['scripts/launch.mjs','scripts/'+check],{stdio:['ignore','pipe','pipe'],windowsHide:true});let output='';
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const timeout=setTimeout(()=>{if(process.platform==='win32')spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});else child.kill();},90000);
  child.on('error',e=>{clearTimeout(timeout);resolve({code:1,output:e.message});});child.on('exit',code=>{clearTimeout(timeout);resolve({code,output});});
 });
 results.push({check,passed:result.code===0,seconds:(Date.now()-start)/1000,output:result.output});console.log(result.code===0?'PASS':'FAIL');if(result.code!==0)console.log(result.output);
}
fs.mkdirSync('workspace/feature-audit',{recursive:true});fs.writeFileSync('workspace/feature-audit/desktop.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
console.log(results.filter(r=>r.passed).length+'/'+checks.length+' desktop workflows passed');if(results.some(r=>!r.passed))process.exitCode=1;
