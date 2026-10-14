const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const folder=path.join(__dirname,'../workspace/speech-timing-check');fs.mkdirSync(folder,{recursive:true});
app.setPath('userData',path.join(folder,'desktop-session'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const {createBackend}=await import('../electron/backend.mjs'),{speechTimingIssues}=await import('../electron/speech-timing.mjs');
 const backend=await createBackend({workspace:path.join(__dirname,'../workspace/move-effects-check/backend')});let win;
 try{
  const filename=process.argv[2]||path.join(__dirname,'../workspace/autosaves/05c901297093b79ba811cbbc.gaming.json');
  const project=await backend.prepareAudio(backend.hydrate(JSON.parse(fs.readFileSync(filename,'utf8'))));
  assert.ok(speechTimingIssues(project).some(i=>i.code==='stretched-caption'),'Fixture must reproduce the reported broken transcription');
  let repaired,repairError;
  ipcMain.handle('open',()=>project);ipcMain.handle('library',()=>project.media);
  ipcMain.handle('revision-repair-speech',async(_,p)=>{try{return repaired=await backend.repairSpeech(p,{}, {},e=>console.log(e.stage));}catch(e){repairError=e;throw e;}});
  ipcMain.handle('revision-history',(_,p,d)=>backend.undoRedo(p,d));
  win=new BrowserWindow({show:false,width:1500,height:980,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});
  win.webContents.on('console-message',event=>{if(event.level==='error')console.error('Renderer:',event.message);});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),wait=ms=>js('new Promise(r=>setTimeout(r,'+ms+'))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Missing enabled button: "+'+JSON.stringify(label)+');b.click();})()');await wait(100);};
  const css=()=>js('(()=>{const c=document.querySelector("[data-captions]");if(!c)throw Error("Caption missing");const s=getComputedStyle(c);return {fontSize:s.fontSize,bottom:s.bottom,lineHeight:s.lineHeight,shadow:s.textShadow}})()');
  await click('Open project');await click('+1s');const beforeCSS=await css();await click('Repair speech & timing');
  for(let i=0;i<1800&&!repaired&&!repairError;i++)await wait(100);
  if(repairError)throw repairError;assert.ok(repaired,'Repair did not complete');await wait(300);
  assert.equal(repaired.voiceId,project.voiceId);assert.equal(repaired.duration,project.duration);assert.deepEqual(repaired.captionStyle,project.captionStyle);assert.deepEqual(await css(),beforeCSS);
  assert.ok(!speechTimingIssues(repaired).some(i=>!i.review));
  const words=repaired.scenes.flatMap(s=>s.words);assert.ok(words.length>300,'Missing half the speech still');
  assert.ok(words.some(w=>w.start>75&&w.start<80),'Missing late narration');
  fs.writeFileSync(path.join(folder,'repaired.gaming.json'),JSON.stringify(repaired,null,2));
  await click('Undo');assert.ok(await js('document.querySelector(".ai-changes").textContent.includes("Undone")'));
  await click('Redo');assert.ok(!await js('document.querySelector(".ai-changes").textContent.includes("Undone")'));
  // Continuous playback covers the second half that was missing in the user's edit.
  const playback=await js(`new Promise((resolve,reject)=>{
   const voice=document.querySelector('[data-preview-narration]');
   const report={samples:[],rewinds:[],maximumVoiceTracks:0};let previous=voice.currentTime;
   document.querySelector('[aria-label="Play video"]').click();
   setTimeout(()=>{const until=performance.now()+700;while(performance.now()<until){}},3000);
   const timer=setInterval(()=>{
    const scene=document.querySelector('.video-stage [data-scene]:not([data-outgoing])');
    const picture=Number(scene?.getAttribute('data-scene-time'));
    const caption=scene?.querySelector('[data-captions]')?.textContent||'';
    const layers=[...scene?.querySelectorAll('[data-layer]')||[]].map(l=>l.getAttribute('data-layer'));
    if(!voice.paused){if(voice.currentTime<previous-.08)report.rewinds.push([previous,voice.currentTime]);previous=voice.currentTime;}
    report.maximumVoiceTracks=Math.max(report.maximumVoiceTracks,[...document.querySelectorAll('audio')].filter(a=>a.src===voice.src&&!a.paused).length);
    report.samples.push({voice:voice.currentTime,picture,caption,layers,paused:voice.paused});
    if(voice.ended||voice.currentTime>=${repaired.duration}-.2){clearInterval(timer);report.end=voice.currentTime;resolve(report);}
   },250);
   setTimeout(()=>{clearInterval(timer);report.end=voice.currentTime;report.timeout=true;resolve(report);},${Math.ceil((repaired.duration+12)*1000)});
  })`);
  assert.ok(!playback.timeout,'Playback stopped before the end');assert.ok(playback.end>86);assert.deepEqual(playback.rewinds,[]);assert.equal(playback.maximumVoiceTracks,1);
  const late=playback.samples.filter(s=>s.voice>40&&s.voice<85);
  assert.ok(late.length>100);assert.ok(new Set(late.map(s=>s.caption).filter(Boolean)).size>40,'Captions stuck in second half');
  assert.ok(new Set(late.map(s=>s.layers.join(','))).size>12,'Visuals stuck in second half');
  assert.ok(late.filter(s=>Math.abs(s.voice-s.picture)>.5).length<5,'Picture clock stopped following narration');
  const report={source:path.basename(filename),actualRepairButton:true,beforeWords:project.scenes.reduce((n,s)=>n+s.words.length,0),afterWords:words.length,
   maximumWordSeconds:Math.max(...words.map(w=>w.end-w.start)),captionAppearanceUnchanged:true,undoRedo:true,transcription:repaired.transcriptionInfo,
   secondHalfCaptionChanges:new Set(late.map(s=>s.caption).filter(Boolean)).size,secondHalfVisualChanges:new Set(late.map(s=>s.layers.join(','))).size,playback};
  fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));
  console.log('PASS actual repair button and full preview:',JSON.stringify({...report,playback:{end:playback.end,rewinds:playback.rewinds,maximumVoiceTracks:playback.maximumVoiceTracks}}));
 }finally{win?.destroy();backend.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
