const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.setPath('sessionData',path.join(__dirname,'../workspace/feature-audit/preview-session-'+process.pid));
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const {createBackend}=await import('../electron/backend.mjs'),backend=await createBackend();
 try{
  const filename=process.argv[2]||path.join(__dirname,'../workspace/video-remake-check/project.gaming.json');
  const project=await backend.prepareAudio(backend.hydrate(JSON.parse(fs.readFileSync(filename))));
  ipcMain.handle('open',()=>project);ipcMain.handle('library',()=>project.media);
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s);
  await js(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Open project').click()`);
  await js('new Promise(r=>setTimeout(r,500))');
  const url=project.media.find(m=>m.id===project.voiceId).url;
  const report=await js(`new Promise((resolve,reject)=>{
   const voice=[...document.querySelectorAll('audio')].find(a=>a.src===${JSON.stringify(url)});
   if(!voice)return reject(Error('Missing preview narration'));
   const report={rewinds:[],samples:0,maximumVoiceTracks:0,end:0,sameNode:true};let previous=0;
   document.querySelector('[aria-label="Play video"]').click();
   setTimeout(()=>{const until=performance.now()+700;while(performance.now()<until){}},3000);
   const timer=setInterval(()=>{
    report.maximumVoiceTracks=Math.max(report.maximumVoiceTracks,[...document.querySelectorAll('audio')].filter(a=>a.src===voice.src&&!a.paused).length);
    if(!voice.paused){if(voice.currentTime<previous-.08)report.rewinds.push([previous,voice.currentTime]);previous=voice.currentTime;report.samples++;}
   },50);
   setTimeout(()=>{clearInterval(timer);document.querySelector('[aria-label="Pause video"]')?.click();report.end=voice.currentTime;report.sameNode=document.contains(voice);resolve(report);},8500);
  })`);
  if(report.rewinds.length||report.maximumVoiceTracks!==1||report.samples<80||report.end<6||!report.sameNode)throw Error('Unstable preview: '+JSON.stringify(report));
  const controls=await js(`new Promise(resolve=>{const voice=document.querySelector('[data-preview-narration]'),before=voice.currentTime;[...document.querySelectorAll('button')].find(b=>b.textContent===String.fromCharCode(0x2212)+'1s').click();setTimeout(()=>resolve({paused:voice.paused,before,after:voice.currentTime}),250);})`);if(!controls.paused||Math.abs(controls.after-(controls.before-1))>.2)throw Error('Pause/seek failed: '+JSON.stringify(controls));
  console.log('PASS saved project preview: one continuous voice track without backward audio seeks',JSON.stringify(report));win.destroy();
 }finally{backend.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
