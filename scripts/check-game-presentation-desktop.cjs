const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../workspace/game-presentation-desktop-check');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs');const b=await createBackend({workspace:path.join(dir,'backend')});
 try{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/game-presentation-check/repair-source.gaming.json'),'utf8')),p=b.hydrate(source);let next,context;
  ipcMain.handle('open',()=>p);ipcMain.handle('library',()=>p.media);ipcMain.handle('revision-remake',async(_,p,r,c)=>{context=c;next=await b.remake(p,r,c);return next;});ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Missing/disabled button "+'+JSON.stringify(label)+');b.click()})()');await pause();};
  await click('Open project');await click('Refresh game visuals & sounds');for(let i=0;i<400&&!next;i++)await pause();assert.ok(next,'Actual remake did not complete');await pause();assert.equal(context.useAI,false);
  await click('+1s');assert.ok(await js('!!document.querySelector(`[data-layer*="presentation-hook"] img`)'),'Logo missing from the intro');assert.ok(await js('!!document.querySelector(`[data-layer*="presentation-pattern"]`)'),'Moving pattern missing from preview');
  const fear=next.reactionGifPlan.find(c=>c.kind==='fear');assert.ok(next.soundEffects.some(f=>f.cue==='chatter'&&f.start===fear.start));
  for(let i=0;i<5;i++)await click('+1s');assert.ok(await js('!!document.querySelector(`[data-layer*="reaction-gif"]`)'),'Actual GIF missing from preview');
  await click('Undo');assert.ok(!await js('!!document.querySelector(`[data-layer*="reaction-gif"]`)'),'Undo did not restore the empty scene');await click('Redo');assert.ok(await js('!!document.querySelector(`[data-layer*="reaction-gif"]`)'),'Redo did not restore the GIF');
  assert.ok(await js('[...document.querySelectorAll("summary")].some(s=>s.textContent.startsWith("Game visuals:"))'),'Presentation report missing');
  await click('Generate / new edit');assert.ok(await js('document.querySelector(`[aria-label="Subtle game patterns"]`).checked&&document.querySelector(`[aria-label="Contextual reaction GIFs"]`).checked'),'Generation defaults missing');
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({actualRemakeButton:true,introLogo:true,movingPattern:true,actualReactionPreview:true,matchingSound:true,undoRedo:true,visibleReport:true,generationControls:true},null,2));console.log('PASS desktop refresh button, intro logo, moving pattern, GIF/chatter, Undo/Redo, report and Generate controls');win.destroy();
 }finally{b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
