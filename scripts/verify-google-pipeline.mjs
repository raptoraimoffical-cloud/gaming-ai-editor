import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
import {PNG} from 'pngjs';
// API transport is deliberately simulated when no paid key is available.
// Originals below are real Minecraft Wiki files, fetched by the production downloader.
const folder=path.join(root,'workspace/google-pipeline-check');fs.mkdirSync(folder,{recursive:true});
const originals={pig:'Temperate_Pig_JE3.png?a2e09',chicken:'Chicken_JE2_BE2.png?30245',creeper:'Creeper_JE3_BE1.png?40005'};
const queries=[];const diagnosticDb=path.join(folder,'backend','library.sqlite');if(fs.existsSync(diagnosticDb))fs.unlinkSync(diagnosticDb);
const backend=await createBackend({workspace:path.join(folder,'backend'),minecraftOptions:{fetchImpl:async()=>Response.json({query:{pages:{},search:[],categorymembers:[]}})},providerOptions:{fetchImpl:async value=>{
 const u=new URL(value);if(u.hostname!=='serpapi.com')return Response.json({query:{pages:{}}});
 const q=u.searchParams.get('q');queries.push(q);const subject=Object.keys(originals).find(n=>new RegExp('\\b'+n+'\\b','i').test(q));
 if(!subject&&/gameplay|screenshot/i.test(q))return Response.json({images_results:[{title:'Minecraft Plains gameplay environment screenshot',original:'https://minecraft.wiki/images/Plains.png?38132',thumbnail:'https://minecraft.wiki/images/Plains.png?38132',link:'https://minecraft.wiki/w/File:Plains.png',source:'Minecraft Wiki',original_width:1920,original_height:1080}]});
 return Response.json({images_results:subject?[{title:'Minecraft '+subject+' original game render',original:'https://minecraft.wiki/images/'+originals[subject],thumbnail:'https://minecraft.wiki/images/'+originals[subject],link:'https://minecraft.wiki/w/File:'+originals[subject].split('?')[0],source:'Minecraft Wiki',original_width:726,original_height:673}]:[]});
}}});
try{
 backend.webImages.clear();backend.webImages.beginBudget();const [pig]=await backend.onlineSearch('Minecraft pig transparent PNG','google-images','diagnostic-api-double');
 assert.ok(pig.webAssessment.autoEligible);const actual=await backend.onlineDownload(pig);assert.ok(actual.decoded&&actual.transparent);assert.ok(actual.width>=320);console.log('PASS Minecraft pig real original, decoded alpha, local cache',actual.width,actual.height);
 const voicePath=path.join(folder,'narration.wav');if(!fs.existsSync(voicePath))throw Error('Create the diagnostic narration.wav using Windows SAPI before running this script.');
 const voice=await backend.importMedia(voicePath,{license:'Local diagnostic narration'});
 const project=await backend.generate({name:'Google original images pipeline diagnostic',voiceId:voice.id,model:'tiny.en',device:'cpu',quality:'fast',pokemon:false,videoMode:'youtube-shorts',format:'vertical',script:'Minecraft chickens are useless. Minecraft pigs are everywhere. Minecraft creepers are terrifying.',autoSoundEffects:false,autoPokemonCries:false,autoMinecraftSounds:false,localAnimatorEnabled:false,providerKeys:{'google-images':'diagnostic-api-double'},editingInstructions:'Show the Minecraft mobs when mentioned. Use spring entrances and minimal captions.'},e=>console.log(e.stage));
 const images=project.media.filter(m=>m.provider==='google-images');assert.ok(images.length>=3,'Generation must retrieve three real original game images');
 for(const name of Object.keys(originals))assert.ok(images.some(m=>m.originalUrl.toLowerCase().includes(name)),name+' missing');
 const shots=project.scenes.flatMap(s=>(s.layers||[]).filter(l=>l.role==='subject'&&images.some(m=>m.id===l.mediaId)).map(l=>({sceneId:s.id,name:images.find(m=>m.id===l.mediaId).name,start:l.start,end:l.end,layer:l.id})));
 assert.ok(shots.length>=3);assert.ok(project.scenes.every(s=>s.layers.some(l=>l.role==='background'&&images.some(m=>m.id===l.mediaId&&m.originalUrl.includes('Plains')))),'Real game scenery must be inserted');fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(project,null,2));
 let last=0;const exported=await backend.render(project,path.join(folder,'three-real-game-images.mp4'),e=>{if(Date.now()-last>5000){console.log(e.stage);last=Date.now();}});
 const frames=[];for(const [i,shot] of shots.slice(0,3).entries()){const time=Math.min(shot.end-.15,shot.start+.8),file=path.join(folder,'frame-'+i+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(time),'-i',exported.output,'-frames:v','1',file]);const image=PNG.sync.read(fs.readFileSync(file));assert.equal(image.width,1080);assert.equal(image.height,1920);frames.push({file,time,name:shot.name});}
 const [a,b]=frames.slice(0,2).map(f=>PNG.sync.read(fs.readFileSync(f.file)).data);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>50)changed++;assert.ok(changed>20000,'Different subjects must visibly change exported frames');
 const selectedScene=project.scenes.find(s=>s.layers?.some(l=>images.some(m=>m.id===l.mediaId))),layer=selectedScene.layers.find(l=>images.some(m=>m.id===l.mediaId));
 const revised=await backend.revise(project,'Replace that picture with a better Minecraft pig PNG.',{},{sceneId:selectedScene.id,layerId:layer.id,useAI:false},{'google-images':'diagnostic-api-double'});assert.ok(!revised.pendingRevision);assert.equal(revised.scenes.find(s=>s.id===selectedScene.id).layers.find(l=>l.id===layer.id).mediaId,actual.id);
 const report={serpApiTransport:'SIMULATED RESPONSE: no live Google search asserted',originalDownloads:'REAL public Minecraft Wiki originals',queries,images:images.map(m=>({name:m.name,originalUrl:m.originalUrl,width:m.width,height:m.height,transparent:m.transparent,format:m.format,contentHash:m.contentHash})),frames,changedPixels:changed,output:exported.output,aiChangesReplacement:true};
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log('PASS actual Generate → API adapter (simulated response) → real originals → Remotion → MP4; selected AI Changes replacement',exported.output);
}finally{backend.close();}
