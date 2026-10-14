import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';
const b=await createBackend(),folder=path.join(root,'workspace/ai-changes-live');fs.mkdirSync(folder,{recursive:true});
try{
 const model=process.argv[2]||'qwen3:8b',data=await b.localAI.discover();assert.ok(data.models.some(m=>m.name===model),'Model weights must be installed');
 await b.localAI.save({...data.settings,models:{...data.settings.models,editing:model}});
 const p=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/local-animator-check/project.gaming.json'),'utf8'))),scene=p.scenes[0];
 const request='Make the background dark blue and hide captions in this scene. Leave the existing characters, charts and other graphics unchanged.';
 console.log('Running trained editing model',model);
 const next=await b.revise(p,request,{}, {sceneId:scene.id,time:1,useAI:true});
 assert.equal(next.lastEditAI.performed,true);assert.equal(next.lastEditAI.model,model);assert.ok(next.lastEditAI.operations.length>=2);assert.equal(next.scenes[0].captionStyle.enabled,false);
 const bg=next.scenes[0].layers.find(l=>l.role==='background');assert.equal(bg.type,'shape');assert.match(bg.color,/^#[0-9a-f]{6}$/i);
 const before=p.scenes[0].layers.filter(l=>l.role!=='background'),after=next.scenes[0].layers.filter(l=>l.role!=='background');assert.deepEqual(after,before);
 assert.deepEqual(JSON.parse(JSON.stringify(b.undoRedo(next,'undo').scenes)),JSON.parse(JSON.stringify(p.scenes)));
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(next,null,2));console.log('APPLIED TRAINED EDIT',JSON.stringify(next.lastEditAI));
 const output=await b.render(next,path.join(folder,'edited.mp4'));const file=path.join(folder,'edited-frame.png');await run('ffmpeg',['-v','error','-y','-ss','1.1','-i',output.output,'-frames:v','1',file]);const a=PNG.sync.read(fs.readFileSync(file)),base=PNG.sync.read(fs.readFileSync(path.join(root,'workspace/local-animator-check/animated-1.1.png')));let changed=0;
 for(let i=0;i<a.data.length;i+=4)if(Math.abs(a.data[i]-base.data[i])+Math.abs(a.data[i+1]-base.data[i+1])+Math.abs(a.data[i+2]-base.data[i+2])>40)changed++;
 assert.ok(changed>1000);fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({model,request,trace:next.lastEditAI,output,changedPixels:changed,undoVerified:true},null,2));console.log('PASS actual trained AI changes, preserved graphics, Undo and changed exported pixels',changed);
}finally{b.close();}
