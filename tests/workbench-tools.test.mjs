import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
import {planVoiceoverCuts,validateRetake,retainedVoiceoverRanges,voiceoverFilter} from '../electron/voiceover-cuts.mjs';
import {composeThumbnail,validateThumbnailPlan,THUMBNAIL_FORMATS,createThumbnailTools} from '../electron/thumbnail-tools.mjs';
import {createVoiceoverTools} from '../electron/voiceover-tools.mjs';
const words=text=>text.split(' ').map((text,i)=>({text,start:i*.5,end:i*.5+.4}));
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-workbench-'));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});});return dir;}
test('voiceover cleanup removes hesitations and quiet spacing without deleting adjacent speech or normal words',()=>{
 const ws=words('This um Pokemon is like a tank'),cuts=planVoiceoverCuts(ws,6,[{start:3.6,end:6}],{pacing:'natural'});assert.equal(cuts.filter(c=>c.kind==='filler').length,1);assert.equal(cuts.find(c=>c.kind==='filler').quote,'um');assert.ok(cuts.find(c=>c.kind==='filler').start>=ws[0].end);assert.ok(cuts.find(c=>c.kind==='filler').end<=ws[2].start);assert.ok(!cuts.some(c=>c.quote==='like'));assert.ok(cuts.some(c=>c.kind==='pause'));assert.ok(retainedVoiceoverRanges(6,cuts).some(r=>r.start<=ws[2].start&&r.end>=ws[2].end));
});
test('deliberate pause-to-copy instructions preserve the information hold',()=>{
 const ws=words('Pause here if you want to copy the build');const gap={start:ws.at(-1).end+.1,end:7};assert.deepEqual(planVoiceoverCuts(ws,7,[gap],{pacing:'tight'}),[]);
});
test('retake boundaries require an exact confident transcript span and a retained completed take',()=>{
 const ws=words('He went no he won the final');const cut=validateRetake(ws,{firstWord:0,lastWord:2,quote:'He went no',reason:'Abandoned earlier phrasing',confidence:.96,keepFirstWord:3,keepLastWord:6,keepQuote:'he won the final'});assert.equal(cut.kind,'retake');assert.ok(cut.end<ws[3].start);assert.throws(()=>validateRetake(ws,{firstWord:0,lastWord:2,quote:'He lost',confidence:.99}),/actual transcript/);assert.throws(()=>validateRetake(ws,{firstWord:3,lastWord:6,quote:'he won the final',confidence:.99}),/completed take/);assert.throws(()=>validateRetake(ws,{firstWord:0,lastWord:2,quote:'He went no',confidence:.5}),/uncertain/);assert.throws(()=>validateRetake(ws,{firstWord:0,lastWord:2,quote:'He went no'}),/uncertain/);
});
test('restoring a cut preserves its source interval and all enabled cuts merge consistently',()=>{
 const cuts=[{start:1,end:2,enabled:true},{start:1.8,end:3,enabled:true},{start:4,end:5,enabled:false}];assert.deepEqual(retainedVoiceoverRanges(6,cuts),[{start:0,end:1},{start:3,end:6}]);assert.throws(()=>retainedVoiceoverRanges(6,[{start:0,end:6}]),/entire/);assert.throws(()=>retainedVoiceoverRanges(6,[{start:NaN,end:3}]),/Invalid/);
});
test('audio cut rendering smooths joins while breath gain applies only to the original gap times',()=>{
 const filter=voiceoverFilter([{start:0,end:1},{start:2,end:3}],{breaths:[{start:.7,end:.9}],enhance:true,gain:1.25});assert.match(filter,/acrossfade=d=0.008/);assert.match(filter,/val\(ch\)/);assert.match(filter,/cos\(PI\*clip/);assert.match(filter,/atrim=start=2.00000:end=3.00000/);assert.match(filter,/volume=1.2500000/);assert.ok(!/afftdn|highpass|loudnorm/.test(filter));assert.ok(!voiceoverFilter([{start:0,end:2}],{enhance:false}).includes('loudnorm'));
});
test('source recording files remain untouched, and a cleanup session can re-render restored cuts',async t=>{
 const folder=temp(t),source=path.join(folder,'original.wav');fs.writeFileSync(source,'original audio bytes');let filter;
 const localAI={begin:async()=>({models:{},signal:new AbortController().signal}),check(){}},tool=createVoiceoverTools({folder:path.join(folder,'work'),root:folder,library:()=>[{id:'voice',name:'original.wav',kind:'audio',path:source}],recognize:async()=>({segments:[{words:words('Hello um there')}]}),localAI,python:()=> 'python',register:m=>({...m,url:'http://local/'+m.id}),importMedia:async p=>({path:p}),run:async(cmd,args)=>{if(cmd==='python')fs.writeFileSync(args.at(-1),JSON.stringify({duration:3,gaps:[{start:1.7,end:3}],breaths:[]}));else if(cmd==='ffmpeg'){if(args.includes('null'))return 'lavfi.astats.Overall.Peak_level=-6\nlavfi.astats.Overall.RMS_level=-24';if(args.includes('-/filter_complex'))filter=fs.readFileSync(args[args.indexOf('-/filter_complex')+1],'utf8');fs.writeFileSync(args.at(-1),'cleaned output');}else return JSON.stringify({format:{duration:2.2}});return '';}});
 const first=await tool.clean({voiceId:'voice',retakes:false});assert.equal(fs.readFileSync(source,'utf8'),'original audio bytes');assert.ok(first.cuts.length>0);const second=await tool.render(first.analysisId,[]);assert.ok(second.cuts.every(c=>!c.enabled));assert.match(filter,/atrim=start=0.00000:end=3.00000/);assert.equal(fs.readFileSync(source,'utf8'),'original audio bytes');assert.deepEqual(await tool.use(second.id),{path:second.media.path});assert.throws(()=>tool.get('old-session'),/no longer open/);
});
test('a failed transcription does not manufacture a cleaned result or erase an empty recording',async t=>{
 const folder=temp(t),source=path.join(folder,'original.wav');fs.writeFileSync(source,'source');const tool=createVoiceoverTools({folder,root:folder,library:()=>[{id:'v',kind:'audio',path:source}],recognize:async()=>({segments:[]}),localAI:{begin:async()=>({models:{},signal:new AbortController().signal})}});await assert.rejects(tool.clean({voiceId:'v',retakes:false}),/No spoken words/);assert.equal(fs.readFileSync(source,'utf8'),'source');
});
const plan={headline:'A REAL STRATEGY',layout:'hero',palette:'electric',assets:[],reason:'One clear focus'};
test('thumbnail composition validates supported formats and rejects invented asset field types',()=>{
 assert.equal(THUMBNAIL_FORMATS.shorts.width/THUMBNAIL_FORMATS.shorts.height,9/16);assert.equal(THUMBNAIL_FORMATS.regular.width/THUMBNAIL_FORMATS.regular.height,16/9);assert.deepEqual(validateThumbnailPlan(plan),plan);assert.throws(()=>validateThumbnailPlan({...plan,layout:'unsupported'}),/invalid composition/);assert.throws(()=>validateThumbnailPlan({...plan,assets:[{name:'a',query:'a',type:'invented'}]}),/invalid/);
});
test('actual source artwork renders both full-resolution YouTube formats with contained geometry',async t=>{
 const folder=temp(t),art=path.join(folder,'source.png');await sharp({create:{width:300,height:400,channels:4,background:{r:30,g:200,b:110,alpha:1}}}).png().toFile(art);
 for(const format of ['shorts','regular']){const output=path.join(folder,format+'.jpg'),geometry=await composeThumbnail({...plan,headline:'THIS IS A LONG BUT COMPLETE HEADLINE WITH THREE READABLE LINES'},[{id:'source',path:art,role:'subject'}],format,output),meta=await sharp(output).metadata();assert.equal(meta.width,THUMBNAIL_FORMATS[format].width);assert.equal(meta.height,THUMBNAIL_FORMATS[format].height);assert.equal(meta.format,'jpeg');assert.ok(fs.statSync(output).size>10000);assert.ok(geometry.positions.every(p=>p.left>=0&&p.top>=0&&p.left+p.width<=meta.width&&p.top+p.height<=meta.height));}
 await assert.rejects(composeThumbnail(plan,[],'regular',path.join(folder,'empty.jpg')),/No relevant source/);
});
test('a six-character thumbnail keeps the whole requested team above the headline',async t=>{
 const folder=temp(t),art=path.join(folder,'source.png');await sharp({create:{width:50,height:75,channels:4,background:'#459ed5'}}).png().toFile(art);
 const media=Array.from({length:6},(_,i)=>({id:'team-'+i,path:art,role:'subject'})),geometry=await composeThumbnail({...plan,layout:'team'},media,'shorts',path.join(folder,'team.jpg'));
 assert.equal(geometry.positions.length,6);assert.ok(geometry.positions.every(p=>p.top+p.height<geometry.height*.7));
});
test('thumbnail model protocol requests a fresh plan, explicit headline text, real images and an in-memory result',async t=>{
 const folder=temp(t),source=path.join(folder,'art.png');await sharp({create:{width:200,height:300,channels:4,background:'#20b5c8'}}).png().toFile(source);let calls=0;const state={settings:{url:'http://localhost:11434'},models:{reasoning:{name:'trained'}},signal:new AbortController().signal};
 // Use a local protocol fixture instead of making an external network call.
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({model:'trained',message:{content:JSON.stringify({...plan,assets:[{name:'Named subject',query:'Named subject original photo',type:'person'}]})},eval_count:20,prompt_eval_count:40,load_duration:0})};};t.after(()=>globalThis.fetch=originalFetch);
 const tool=createThumbnailTools({folder,library:()=>[],localAI:{begin:async()=>({...state,inferenceEvents:[]}),check(){}},resolve:async()=>({id:'photo',name:'Named subject',path:source}),register:m=>({...m,url:'http://local/'+m.id})});
 const first=await tool.create({format:'regular',instructions:'A clear portrait thumbnail',headline:'EXACT USER TEXT'}),second=await tool.create({format:'shorts',instructions:'A fresh source-based portrait'});assert.equal(calls,2);assert.notEqual(first.id,second.id);assert.notEqual(first.media.path,second.media.path);assert.equal(first.plan.headline,'EXACT USER TEXT');assert.equal(first.sources[0].id,'photo');assert.ok(first.inference.some(e=>e.performed&&e.accepted));assert.equal(fs.readdirSync(folder).filter(n=>n.endsWith('.gaming.json')).length,0);assert.throws(()=>tool.get('no-longer-open'),/no longer open/);
});
