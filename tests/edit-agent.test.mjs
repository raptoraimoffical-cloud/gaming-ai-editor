import test from 'node:test';import assert from 'node:assert/strict';
import {reviseProject,undoRedo} from '../electron/revisions.mjs';
const fixture=()=>({id:'p',name:'Edit',format:'vertical',voiceId:'v',duration:4,media:[{id:'v',kind:'audio',license:'Own'}],scenes:[{id:'s',start:0,end:4,text:'Explain why this result matters.',words:[],layers:[{id:'bg',role:'background',type:'shape',x:0,y:0,width:1,height:1,z:0,start:0,end:4,color:'#000000'}]}]});
test('AI mode performs inference even for a precise command, applies changes and preserves Undo',async()=>{
 let calls=0,input;const p=fixture();const next=await reviseProject(p,'Make this background green.',{model:'trained',requireAI:true,preferExactCommands:true},async(_u,o)=>{calls++;input=JSON.parse(JSON.parse(o.body).messages[1].content);return Response.json({model:'trained',message:{content:JSON.stringify({operations:[{type:'background',sceneIds:['s'],color:'#00ff00'}]})}});},{sceneId:'s',layerId:'bg'});
 assert.equal(calls,1);assert.equal(input.wholeNarration[0].text,p.scenes[0].text);assert.equal(next.scenes[0].layers[0].color,'#00ff00');assert.equal(next.lastEditAI.performed,true);assert.equal(next.lastEditAI.operations.length,1);assert.deepEqual(undoRedo(next,'undo').scenes,p.scenes);
});
test('invalid model operations are corrected once and no-op responses are not reported as edits',async()=>{
 const p=fixture();let calls=0;const next=await reviseProject(p,'Make this background green.',{model:'trained',requireAI:true},async()=>{calls++;return Response.json({message:{content:JSON.stringify({operations:[{type:'background',sceneIds:[calls===1?'missing':'s'],color:'#00ff00'}]})}});},{sceneId:'s'});
 assert.equal(calls,2);assert.equal(next.lastEditAI.events[0].accepted,false);assert.equal(next.lastEditAI.events[1].accepted,true);
 await assert.rejects(reviseProject(p,'Keep this layer width the same.',{model:'trained',requireAI:true},async()=>Response.json({message:{content:JSON.stringify({operations:[{type:'properties',sceneIds:['s'],layerIds:['bg'],width:1}]})}})),/did not change/);
 await assert.rejects(reviseProject(p,'Make it green.',{requireAI:true,preferExactCommands:true}),/No editing model/);
});

test('a model cannot silently omit requested edits or apply the wrong color',async()=>{let calls=0;const p=fixture();const next=await reviseProject(p,'Make this background green and hide captions.',{model:'trained',requireAI:true},async()=>{calls++;return Response.json({message:{content:JSON.stringify({operations:calls===1?[{type:'background',sceneIds:['s'],color:'#ff0000'}]:[{type:'background',sceneIds:['s'],color:'#00ff00'},{type:'captions',sceneIds:['s'],enabled:false}]})}});},{sceneId:'s'});assert.equal(calls,2);assert.equal(next.scenes[0].layers[0].color,'#00ff00');assert.equal(next.scenes[0].captionStyle.enabled,false);assert.equal(next.lastEditAI.events[0].accepted,false);});
