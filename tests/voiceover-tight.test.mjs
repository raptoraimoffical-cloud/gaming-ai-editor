import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {planVoiceoverCuts,validateRetake,retainedVoiceoverRanges,voiceoverFilter,retakeCandidates,resolveRetakeProposal} from '../electron/voiceover-cuts.mjs';
import {modelChat} from '../electron/inference-trace.mjs';
import {voiceoverLeveling,createVoiceoverTools} from '../electron/voiceover-tools.mjs';
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gaming-tight-audio-'));t.after(()=>{assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});});return dir;}
function wav(file,samples,sr=48000){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(.9999,v))*32767),44+i*2));fs.writeFileSync(file,b);}
function read(file){const b=fs.readFileSync(file);let i=12;while(i<b.length){const n=b.readUInt32LE(i+4);if(b.toString('ascii',i,i+4)==='data')return Array.from({length:n/2},(_,j)=>b.readInt16LE(i+8+j*2)/32767);i+=8+n+(n%2);}throw Error('No WAV samples');}
function ffmpeg(source,filter,out){execFileSync('ffmpeg',['-v','error','-y','-i',source,'-filter_complex',filter,'-map','[out]','-c:a','pcm_s16le',out],{windowsHide:true,stdio:'pipe'});}
test('Tight closes short and long gaps, including recording head/tail, while retaining every spoken span',()=>{
 const words=[{text:'First',start:.3,end:.6},{text:'second',start:.75,end:1.1},{text:'third',start:1.45,end:1.8}],gaps=[{start:0,end:.28},{start:.612,end:.738},{start:1.112,end:1.438},{start:1.812,end:2.5}],cuts=planVoiceoverCuts(words,2.5,gaps,{pacing:'tight',fillers:false});
 assert.equal(cuts.length,4);const ranges=retainedVoiceoverRanges(2.5,cuts);for(const w of words)assert.ok(ranges.some(r=>r.start<=w.start&&r.end>=w.end));assert.ok(cuts.filter(c=>c.start>.3&&c.end<1.5).every(c=>gaps.some(g=>Math.abs((g.end-g.start)-(c.end-c.start)-.012)<1e-6)));assert.equal(cuts[0].start,0);assert.equal(cuts.at(-1).end,2.5);assert.equal(planVoiceoverCuts(words,2.5,gaps,{pacing:'natural',fillers:false}).length,1);
});
test('a deliberate hold is preserved without exempting unrelated later pauses',()=>{
 const words=[{text:'Pause',start:0,end:.2},{text:'here.',start:.2,end:.4},{text:'Next',start:2,end:2.2},{text:'topic.',start:2.2,end:2.4}],cuts=planVoiceoverCuts(words,3.3,[{start:.412,end:1.988},{start:2.412,end:3.3}],{pacing:'tight',fillers:false});assert.equal(cuts.length,1);assert.ok(cuts[0].start>2.4);
});
test('retakes require an actual later replacement and align both edges to the discarded audio',()=>{
 const words=[{text:'Intro',start:0,end:.8},{text:'Then',start:1.12,end:1.18,audioStart:1.0},{text:'Toxic',start:1.18,end:1.3,audioEnd:1.43},{text:'Then',start:1.6,end:1.8},{text:'Toxic',start:1.8,end:2.0},{text:'works.',start:2,end:2.3}],p={firstWord:1,lastWord:2,quote:'Then Toxic',confidence:.97,reason:'Repeated incomplete earlier take',keepFirstWord:3,keepLastWord:5,keepQuote:'Then Toxic works.'},cut=validateRetake(words,p);assert.ok(cut.start<=1.0);assert.ok(cut.end>=1.43);assert.ok(cut.start>words[0].end&&cut.end<words[3].start);
 assert.throws(()=>validateRetake(words,{...p,keepFirstWord:undefined}),/replacement/);assert.throws(()=>validateRetake(words,{...p,firstWord:0,lastWord:0,quote:'Intro'}),/matching replacement/);assert.throws(()=>validateRetake(words,{...p,keepQuote:'invented words'}),/actual transcript/);
});
test('level balancing is constant and peak-limited rather than pumping short fragments',()=>{
 const m=voiceoverLeveling('lavfi.astats.Overall.Peak_level=-7\nlavfi.astats.Overall.RMS_level=-32');assert.equal(m.gainDb,5.5);assert.ok(Math.abs(m.peakDb+m.gainDb+1.5)<1e-9);assert.deepEqual(voiceoverLeveling('no audio'),{gain:1,gainDb:0,measured:false});
});
test('native FFmpeg preserves the full voice spectrum with only a constant volume change',t=>{
 const dir=temp(t),source=path.join(dir,'source.wav'),out=path.join(dir,'leveled.wav'),samples=Array.from({length:96000},(_,i)=>.10*Math.sin(2*Math.PI*240*i/48000)+.06*Math.sin(2*Math.PI*1250*i/48000)+.02*Math.sin(2*Math.PI*4600*i/48000));wav(source,samples);const before=read(source);ffmpeg(source,voiceoverFilter([{start:0,end:2}],{enhance:true,gain:1.6}),out);const after=read(out);assert.equal(after.length,before.length);assert.ok(after.every((v,i)=>Math.abs(v-before[i]*1.6)<.00006));assert.ok(!/afftdn|highpass|loudnorm/.test(voiceoverFilter([{start:0,end:2}],{enhance:true})));
});
test('native breath attenuation has smooth sample ramps and leaves spoken intervals unchanged',t=>{
 const dir=temp(t),source=path.join(dir,'source.wav'),out=path.join(dir,'breath.wav'),samples=Array.from({length:96000},()=>.1);wav(source,samples);ffmpeg(source,voiceoverFilter([{start:0,end:2}],{breaths:[{start:.7,end:1.0}]}),out);const after=read(out);assert.ok(after[24000]>.099);assert.ok(after[40000]<.03);assert.ok(after[60000]>.099);assert.ok(after.slice(33000,49000).every((v,i,a)=>i===0||Math.abs(v-a[i-1])<.0002));
});
test('native aligned cuts remove the entire bad-take tone including an early onset and late tail',t=>{
 const dir=temp(t),source=path.join(dir,'source.wav'),out=path.join(dir,'cut.wav'),samples=Array.from({length:120000},(_,i)=>{const t=i/48000;return t<.9||t>=1.5?.12*Math.sin(2*Math.PI*300*t):t>=1.0&&t<1.4?.25*Math.sin(2*Math.PI*2200*t):0;});wav(source,samples);
 const words=[{text:'Intro',start:0,end:.9},{text:'Then',start:1.12,end:1.18,audioStart:1},{text:'Toxic',start:1.18,end:1.3,audioEnd:1.412},{text:'Then',start:1.5,end:1.8},{text:'Toxic',start:1.8,end:2},{text:'works.',start:2,end:2.5}],cut=validateRetake(words,{firstWord:1,lastWord:2,quote:'Then Toxic',confidence:.97,keepFirstWord:3,keepLastWord:5}),pauses=planVoiceoverCuts(words,2.5,[{start:.912,end:.992},{start:1.42,end:1.488}],{pacing:'tight',fillers:false}),ranges=retainedVoiceoverRanges(2.5,[cut,...pauses]);ffmpeg(source,voiceoverFilter(ranges,{pacing:'tight'}),out);const after=read(out);assert.ok(Math.max(...after.slice(40000,75000).map(Math.abs))<.125);assert.ok(after.length<100000);
});
test('voiceover retake analysis uses the configured provider and asks which replacement is kept',async t=>{
 const dir=temp(t),source=path.join(dir,'source.wav');wav(source,new Array(48000).fill(.01));let calls=0;
 const words=[{text:'Then',start:0,end:.2},{text:'Toxic',start:.2,end:.4},{text:'Then',start:.6,end:.8},{text:'Toxic',start:.8,end:1},{text:'works.',start:1,end:1.2}],tool=createVoiceoverTools({folder:path.join(dir,'work'),root:dir,library:()=>[{id:'v',kind:'audio',name:'source.wav',path:source}],register:m=>m,recognize:async(_m,o)=>{assert.equal(o.allTakes,true);return {segments:[{words}]};},python:()=> 'python',localAI:{begin:async()=>({signal:new AbortController().signal,models:{reasoning:{name:'configured'}}}),check(){},chat:async(_s,_m,_msgs,o)=>{calls++;assert.ok(o.format.properties.removals.items.required.includes('keepQuote'));return {removals:[{firstWord:0,lastWord:1,quote:'Then Toxic',confidence:.97,keepFirstWord:2,keepLastWord:4,keepQuote:'Then Toxic works.'}]};}},run:async(cmd,args)=>{if(cmd==='python')fs.writeFileSync(args.at(-1),JSON.stringify({duration:1.2,gaps:[],breaths:[]}));else if(cmd==='ffmpeg')fs.writeFileSync(args.at(-1),'fixture output');else return JSON.stringify({format:{duration:.8}});return '';}});
 const r=await tool.clean({voiceId:'v',retakes:true,enhance:false,pacing:'tight'});assert.equal(calls,1);assert.equal(r.cuts.filter(c=>c.kind==='retake').length,1);assert.equal(r.transcript,'Then Toxic works.');assert.equal(r.originalTranscript,'Then Toxic Then Toxic works.');
});

test('using a cleaned recording preserves its original source and re-cleaning uses that original',async t=>{
 const dir=temp(t),source=path.join(dir,'source.wav'),processed=path.join(dir,'old.wav');wav(source,new Array(96000).fill(.01));wav(processed,new Array(48000).fill(.05));const original={id:'original',kind:'audio',name:'Original.wav',path:source},old={id:'old',kind:'audio',name:'Old cleaned.wav',path:processed,voiceoverSourceId:'original'};let seen,saved;
 const tool=createVoiceoverTools({folder:path.join(dir,'work'),root:dir,library:()=>[original,old],register:m=>m,recognize:async m=>{seen=m.id;return {segments:[{words:[{text:'Original.',start:0,end:1.5}]}]};},python:()=> 'python',localAI:{begin:async()=>({signal:new AbortController().signal,models:{}}),check(){}},run:async(cmd,args)=>{if(cmd==='python')fs.writeFileSync(args.at(-1),JSON.stringify({duration:2,gaps:[],breaths:[]}));else if(cmd==='ffmpeg')fs.writeFileSync(args.at(-1),'test');else return JSON.stringify({format:{duration:2}});return '';},importMedia:async p=>({id:'imported',path:p,name:path.basename(p)}),saveMedia:m=>{saved=m;return m;}});
 const r=await tool.clean({voiceId:'old',retakes:false,enhance:false});assert.equal(seen,'original');assert.ok(r.warnings.some(w=>w.includes('original recording')));const used=await tool.use(r.id);assert.equal(used.voiceoverSourceId,'original');assert.equal(used.name,'Original - cleaned.wav');assert.equal(saved.id,used.id);
});

test('AI can select exact repeated/aborted take candidates without retyping names or counting words',()=>{
 const text=['Then','Toxic','makes','things','even','worse.','Then','Toxic','makes','things','even','worse,','dealing','damage.','Except','Toka','packs','have','been','Except\u2026','Except','Tokapex','has','painful','bunker','which','blocks','attacks.'],words=text.map((text,i)=>({text,start:i*.3+(i>=6?.6:0)+(i>=20?.7:0),end:i*.3+.25+(i>=6?.6:0)+(i>=20?.7:0)})),c=retakeCandidates(words);
 assert.ok(c.some(p=>p.firstWord===0&&p.keepFirstWord===6));assert.ok(c.some(p=>p.firstWord===14&&p.keepFirstWord===20));assert.ok(!c.some(p=>p.keepFirstWord===19));assert.ok(!c.some(p=>p.firstWord>0&&p.firstWord<6));for(const p of c)assert.doesNotThrow(()=>validateRetake(words,p));
});
test('small model index mistakes resolve only against exact source quotes and a real replacement',()=>{
 const words='Then Toxic makes things worse Then Toxic makes things worse and keeps going'.split(' ').map((text,i)=>({text,start:i*.3,end:i*.3+.25})),p={firstWord:1,lastWord:5,quote:'Then Toxic makes things worse',keepFirstWord:6,keepLastWord:12,keepQuote:'Then Toxic makes things worse and keeps going',confidence:.98},r=resolveRetakeProposal(words,p);assert.equal(r.firstWord,0);assert.equal(r.lastWord,4);assert.equal(r.keepFirstWord,5);assert.doesNotThrow(()=>validateRetake(words,r));assert.throws(()=>validateRetake(words,resolveRetakeProposal(words,{...p,quote:'invented claim'})),/actual transcript/);
});
test('waveform-confirmed silence closes even when an ASR word accidentally spans the pause',()=>{
 const words=[{text:'Toxic',start:0,end:1.5}],cuts=planVoiceoverCuts(words,1.5,[{start:.5,end:.8,verifiedQuiet:true}],{pacing:'tight',fillers:false});assert.equal(cuts.length,1);assert.ok(cuts[0].end-cuts[0].start>.25);
});

test('rhetorical pronoun lists with different claims are never treated as repeated failed takes',()=>{
 const words=["You're","trapped,","you're","poisoned,","and","your","attacks","are","blocked."].map((text,i)=>({text,start:i*.4,end:i*.4+.2}));assert.deepEqual(retakeCandidates(words),[]);assert.throws(()=>validateRetake(words,{firstWord:0,lastWord:1,quote:"You're trapped,",keepFirstWord:2,keepLastWord:8,keepQuote:"you're poisoned, and your attacks are blocked.",confidence:.99}),/matching replacement/);
});

test('a unique contrast sentence is not treated as a correction merely for sharing two opening words',()=>{
 const words="trying to knock you out trying to ruin your life".split(' ').map((text,i)=>({text,start:i*.3,end:i*.3+.25}));assert.throws(()=>validateRetake(words,{firstWord:0,lastWord:4,quote:'trying to knock you out',keepFirstWord:5,keepLastWord:9,confidence:.99}),/matching replacement/);
});

test('retake inference reduces temporary batch memory without dropping transcript context or changing models',async()=>{
 const messages=[{role:'user',content:'The full unchanged transcript'}],state={settings:{url:'http://localhost',contextLength:8192},signal:new AbortController().signal};let payload;
 await modelChat(state,{name:'same-trained-model'},messages,{stage:'voiceover-retakes',maxOutputTokens:2000,fetchImpl:async(_url,o)=>{payload=JSON.parse(o.body);return Response.json({model:'same-trained-model',message:{content:'{}'}});}});assert.equal(payload.options.num_batch,128);assert.equal(payload.options.num_ctx,8192);assert.equal(payload.options.num_predict,2000);assert.equal(payload.model,'same-trained-model');assert.deepEqual(payload.messages,messages);
});

test('a good-take ASR timestamp overlapping the old tail cannot leave a loud discarded-word fragment',()=>{
 const words=[{text:'Intro',start:0,end:.8,speechOffset:.8},{text:'Then',start:1,end:1.1,speechOnset:1},{text:'Toxic',start:1.1,end:1.3,speechOffset:1.47},{text:'Then',start:1.31,end:1.9,speechOnset:1.75},{text:'Toxic',start:1.9,end:2.1},{text:'works.',start:2.1,end:2.4}],cut=validateRetake(words,{firstWord:1,lastWord:2,quote:'Then Toxic',keepFirstWord:3,keepLastWord:5,confidence:.99});assert.ok(cut.end>=1.60);assert.ok(cut.end<1.75);assert.ok(cut.end>words[3].start);
});
