import test from 'node:test';
import assert from 'node:assert/strict';
import {createInferenceFetch,validateInferenceSettings} from '../electron/inference-provider.mjs';
import {fortniteMetadata} from '../electron/fortnite-assets.mjs';
import {reviseProject,undoRedo} from '../electron/revisions.mjs';
const fixture=()=>({id:'p',name:'Test',voiceId:'v',duration:6,format:'vertical',captionColor:'#fff',musicVolume:.08,media:[{id:'v',kind:'audio'}],scenes:[0,1].map(i=>({id:'s'+i,start:i*3,end:i*3+3,text:'Test',title:'Test',words:[],kind:'story',layers:[{id:'bg'+i,type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:i*3,end:i*3+3,color:'#000000'}]}))});
test('hosted transport sends scene/image inputs, auth and schema; normalizes model output',async()=>{
 let sent;
 const fn=createInferenceFetch(()=>({provider:'hosted',url:'https://provider.example/v1'}),()=> 'test-secret',async(url,init)=>{sent={url,headers:init.headers,body:JSON.parse(init.body)};return Response.json({model:'trained',choices:[{message:{content:'{"ok":true}'}}],usage:{prompt_tokens:3,completion_tokens:4}});});
 const r=await fn('https://provider.example/api/chat',{method:'POST',body:JSON.stringify({model:'trained',format:{type:'object'},messages:[{role:'user',content:'Inspect',images:['aGVsbG8=']}],options:{temperature:0}})});
 assert.equal(sent.url,'https://provider.example/v1/chat/completions');assert.equal(sent.headers.Authorization,'Bearer test-secret');
 assert.equal(sent.body.messages[1].content[1].image_url.url,'data:image/png;base64,aGVsbG8=');assert.equal(sent.body.stream,false);
 assert.equal((await r.json()).message.content,'{"ok":true}');
});
test('hosted failures propagate without fabricated success and plaintext remote key transport is rejected',async()=>{
 assert.throws(()=>validateInferenceSettings({provider:'hosted',url:'http://provider.example/v1'}),/HTTPS/);
 const fn=createInferenceFetch(()=>({provider:'hosted',url:'https://provider.example/v1'}),()=>'',async()=>new Response('',{status:401}));
 assert.equal((await fn('https://provider.example/api/chat',{body:JSON.stringify({messages:[]})})).status,401);
});
test('model receives selected scene/object and edits only that scene with working undo',async()=>{
 const p=fixture(),selection={sceneId:'s1',layerId:'bg1',time:4};let sent;
 const transport=async(_url,init)=>{sent=JSON.parse(init.body);return Response.json({message:{content:JSON.stringify({operations:[{type:'background',sceneIds:['s1'],color:'#00ff00'}]})}});};
 const next=await reviseProject(p,'Make this background bright green.',{model:'trained',provider:'hosted',fetchImpl:transport},fetch,selection);
 assert.deepEqual(JSON.parse(sent.messages.at(-1).content).selection,selection);
 assert.deepEqual(next.scenes[0],p.scenes[0]);assert.equal(next.scenes[1].layers[0].color,'#00ff00');assert.equal(next.revisionHistory.at(-1).interpreter,'Hosted / trained');
 assert.deepEqual(undoRedo(next,'undo').scenes,p.scenes);
});
test('Fortnite imports retain user-supplied license and original source; unrelated hosts are rejected',()=>{
 const m=fortniteMetadata({category:'backgrounds',subject:'Battle island',license:'Permission supplied with downloaded asset',source:'https://fortnite.fandom.com/wiki/File:Background_-_Asset_-_Fortnite.png'});
 assert.equal(m.provider,'fortnite-fandom');assert.equal(m.assetRole,'background');assert.equal(m.identity.franchise,'fortnite');assert.ok(m.attribution.source.startsWith('https://fortnite.fandom.com/'));
 assert.throws(()=>fortniteMetadata({license:'test',source:'https://other.example'}));assert.throws(()=>fortniteMetadata({license:''}));
});
test('precise commands work offline and never call an unavailable model',async()=>{
 const p=fixture();
 const next=await reviseProject(p,'Make this background bright green.',{preferExactCommands:true,connectionError:'Offline',model:'trained',fetchImpl:()=>{throw Error('Unexpected inference');}},fetch,{sceneId:'s1',layerId:'bg1'});
 assert.equal(next.scenes[1].layers[0].color,'#00ff00');assert.deepEqual(next.scenes[0],p.scenes[0]);
 assert.equal(next.revisionHistory.at(-1).interpreter,'Exact command interpreter');
 assert.deepEqual(undoRedo(next,'undo').scenes,p.scenes);
});
