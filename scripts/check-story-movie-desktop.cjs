const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../workspace/story-movie-check/desktop');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const {createBackend}=await import('../electron/backend.mjs');const b=await createBackend({workspace:path.join(__dirname,'../workspace/move-effects-check/backend')});let win;
 try{
  const {clearActionMovie}=await import('../electron/action-movie.mjs');
  const p=clearActionMovie(b.hydrate(JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/story-movie-check/repair-source.gaming.json'),'utf8'))));let next,context;
  ipcMain.handle('open',()=>p);ipcMain.handle('library',()=>p.media);ipcMain.handle('revision-remake',async(_,p,r,c)=>{context=c;next=await b.remake(p,r,c);return next;});ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  win=new BrowserWindow({show:false,width:1500,height:980,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Button unavailable: "+'+JSON.stringify(label)+');b.click()})()');await pause();};
  const css=()=>js('(()=>{const c=document.querySelector("[data-captions]");if(!c)throw Error("Caption missing");const s=getComputedStyle(c);return {fontSize:s.fontSize,bottom:s.bottom,lineHeight:s.lineHeight,shadow:s.textShadow}})()');
  await click('Open project');await click('+1s');await click('+1s');const before=await css();await click('Animate story & fix names');
  for(let i=0;i<400&&!next;i++)await pause();assert.ok(next);await pause();
  assert.equal(context.correctNames,true);assert.equal(context.preserveCaptions,true);assert.equal(context.useAI,false);assert.deepEqual(next.captionStyle,p.captionStyle);assert.deepEqual(await css(),before);assert.ok(next.actionMovieReport.plans.length);assert.ok(next.storyShotReport.events.length);assert.ok(next.pokemonRecognitionReport.corrected);
  assert.ok(await js('document.querySelector("[data-captions]").textContent.includes("Sceptile")'),'Corrected displayed name missing');
  const plan=next.actionMovieReport.plans[0],target=plan.start+plan.duration*.4;
  // One-second stepping exercises the real editor Player at the authored action.
  for(let t=2;t<Math.ceil(target);t++)await click('+1s');await pause();assert.ok(await js('!!document.querySelector(`[data-layer*="-action-"]`)'),'Actual animated actor layer missing');
  await click('Undo');assert.ok(await js('!document.querySelector(`[data-layer*="-action-"]`)'));await click('Redo');assert.ok(await js('!!document.querySelector(`[data-layer*="-action-"]`)'));
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({actualButton:true,captionAppearanceUnchanged:true,correctedDisplayedNames:true,actualAnimatedActorPreview:true,undoRedo:true},null,2));console.log('PASS actual Animate story button, caption appearance, name spelling, animated actor preview and Undo/Redo');
 }finally{win?.destroy();b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
