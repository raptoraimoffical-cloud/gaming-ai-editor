import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function writeProject(file,project){
 const temp=file+'.'+crypto.randomUUID()+'.saving';
 try{fs.writeFileSync(temp,JSON.stringify(project,null,2));fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
export function createProjectStore(workspace){
 const folder=path.join(workspace,'autosaves');
 return {
  save(project){fs.mkdirSync(folder,{recursive:true});const p={...project};delete p.autosaveWarning;const key=crypto.createHash('sha256').update(String(p.id)).digest('hex').slice(0,24);writeProject(path.join(folder,key+'.gaming.json'),p);return p;},
  recover(hydrate){
   if(!fs.existsSync(folder))return null;
   const files=fs.readdirSync(folder).filter(n=>n.endsWith('.gaming.json')).map(n=>({file:path.join(folder,n),time:fs.statSync(path.join(folder,n)).mtimeMs})).sort((a,b)=>b.time-a.time);
   for(const {file} of files){try{return hydrate(JSON.parse(fs.readFileSync(file,'utf8')));}catch{}}
   return null;
  }
 };
}
