import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProjectStore,writeProject} from '../electron/project-store.mjs';
test('recovery is atomic, preserves edits and skips corrupt snapshots',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'editor-recovery-'));try{
  const store=createProjectStore(folder);assert.equal(store.recover(p=>p),null);const p={id:'../unsafe',name:'Edited',scenes:[{color:'blue'}]};store.save(p);const recovered=store.recover(p=>p);assert.deepEqual(recovered,p);
  fs.writeFileSync(path.join(folder,'autosaves','broken.gaming.json'),'{');assert.deepEqual(store.recover(p=>p),p);
  const file=path.join(folder,'saved.json');writeProject(file,p);writeProject(file,{...p,name:'New'});assert.equal(JSON.parse(fs.readFileSync(file)).name,'New');assert.equal(fs.readdirSync(folder).some(f=>f.endsWith('.saving')),false);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
