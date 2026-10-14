import test from 'node:test';import assert from 'node:assert/strict';
import {narrationAssets,narrationSounds,readPackCatalog,readPackAssets} from '../electron/asset-packs.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {applyAiDirection} from '../electron/ai-director.mjs';
test('large generic catalogs stay outside project props and cannot stand in for franchise characters',()=>{
 const voice={id:'voice',kind:'audio'},generic={id:'pixel',kind:'image',name:'Mario platformer',tags:'Super Mario',license:'CC0',pack:{id:'original'}};
 assert.deepEqual(narrationAssets([voice,generic],'Super Mario jumps',voice),[voice]);
 const own={...generic,id:'own',pack:undefined};assert.deepEqual(narrationAssets([voice,generic,own],'Super Mario jumps',voice),[voice,own]);
});
test('automatic sounds match literal cues, require a sound role and stay sparse',()=>{
 const sound={id:'jump',kind:'audio',assetRole:'sound-effect',license:'CC0',tags:'retro jump.wav'};
 const words=[{text:'jump',start:1},{text:'jump',start:1.2},{text:'Mario',start:3}];
 assert.deepEqual(narrationSounds([sound],[{words}]).map(f=>[f.media.id,f.start]),[['jump',1]]);
 assert.equal(narrationSounds([{...sound,assetRole:undefined}],[{words}]).length,0);
});
test('bulk manifests reject escaping paths, omit corrupt GIFs and label single-frame sprites as static',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-packs-')),workspace=path.join(root,'workspace'),folder=path.join(workspace,'asset-packs/sample');fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(path.join(root,'asset-packs'));
 t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'gaming-packs-'));fs.rmSync(root,{recursive:true,force:true});});
 fs.writeFileSync(path.join(root,'asset-packs/catalog.json'),JSON.stringify({packs:[{id:'sample',name:'Sample'}]}));
 const valid=path.join(folder,'valid.gif'),bad=path.join(folder,'bad.gif'),escape=path.join(root,'outside.png');fs.writeFileSync(valid,Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64'));fs.writeFileSync(bad,'GIF89a');fs.writeFileSync(escape,'outside');
 const asset={id:'static',path:valid,kind:'pokemon',pack:{id:'sample'},license:'Source rights notice',pokemon:{animated:true}};
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({assets:[asset,{...asset,id:'bad',path:bad},{...asset,id:'escape',path:escape}]}));
 const records=readPackAssets(root,workspace);assert.equal(records.length,1);assert.equal(records[0].pokemon.frameCount,1);assert.equal(records[0].pokemon.animated,false);
});
test('compact model geometry merges protected SVG, form identity and exact narration timing',async()=>{
 const layers=[{id:'bg',type:'shape',x:0,y:0,width:1,height:1,z:0,start:0,end:3},{id:'art',type:'svg',svg:'<svg>Verified content</svg>',x:.1,y:.1,width:.4,height:.4,z:1,start:.1,end:3},{id:'label',type:'text',text:'Mega Charizard Y',x:.1,y:.6,width:.7,height:.05,z:2,start:0,end:3},{id:'manual',manual:true,type:'shape',x:.1,y:.8,width:.6,height:.04,z:3,start:0,end:3}];
 const p={id:'p',voiceId:'v',duration:3,format:'vertical',media:[{id:'v',kind:'audio'}],scenes:[{id:'s',start:0,end:3,text:'Mega Charizard Y',words:[],layers}]};
 const fetchImpl=async(_,o)=>{const request=JSON.parse(o.body);assert.ok(!request.messages[1].content.includes('<svg>'));return new Response(JSON.stringify({message:{content:JSON.stringify({scenes:[{id:'s',layers:layers.map(l=>({id:l.id,x:.2,y:l.y,width:l.width,height:l.height}))}]})}}));};
 const r=await applyAiDirection(p,{model:'local',geometryOnly:true,fetchImpl});assert.equal(r.directorStatus,'Ollama: local');assert.equal(r.scenes[0].layers[1].svg,layers[1].svg);assert.equal(r.scenes[0].layers[1].start,.1);assert.equal(r.scenes[0].layers[2].text,'Mega Charizard Y');assert.deepEqual(r.scenes[0].layers[3],layers[3]);
});
