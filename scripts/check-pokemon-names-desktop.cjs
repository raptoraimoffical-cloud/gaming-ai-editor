const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../workspace/pokemon-names-desktop-check');
fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const {createBackend}=await import('../electron/backend.mjs');const backend=await createBackend({workspace:path.join(dir,'backend')});
 try{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/pokemon-name-check/repair-source.gaming.json'),'utf8'));
  source.revisionHistory=[];source.revisionCursor=0;source.pokemonNameHints='Mimikyu, Landorus, Kingambit';
  const p=backend.hydrate(source);let next,request,context;
  ipcMain.handle('open',()=>p);ipcMain.handle('library',()=>p.media);
  ipcMain.handle('revision-apply',async(_,project,r,c)=>{request=r;context=c;next=await backend.revise(project,r,c,{useAI:false});return next;});
  ipcMain.handle('revision-history',(_,project,d)=>backend.undoRedo(project,d));
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});
  await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Button missing or disabled: "+'+JSON.stringify(label)+');b.click()})()');await pause();};
  await click('Open project');await click('Recognize names & remake');
  for(let i=0;i<400&&!next;i++)await pause();assert.ok(next,'Actual repair did not complete');await pause();
  assert.equal(request,'Recognize Pokemon names');assert.equal(context.useAI,false);
  for(const name of ['mimikyu-disguised','landorus-incarnate','kingambit','corviknight','froslass','politoed'])assert.ok(next.pokemonMentions.some(m=>m.name===name&&m.status==='ready'),name);
  assert.deepEqual(next.scenes.map(s=>s.words.map(w=>[w.text,w.start,w.end])),p.scenes.map(s=>s.words.map(w=>[w.text,w.start,w.end])));
  assert.ok(await js('[...document.querySelectorAll("summary")].some(s=>/Pokemon names: 6 recognized, 2 spelling corrections/.test(s.textContent))'),'Recognition report not shown');
  for(let i=0;i<6;i++)await click('+1s');
  assert.ok(await js('!!document.querySelector(`[data-layer] img`)'),'Real artwork missing in preview');
  assert.ok(await js('[...document.querySelectorAll(`[data-captions] span`)].some(s=>/Kingambit|Corviknight/.test(s.textContent))'),'Corrected caption missing');
  await click('Undo');assert.ok(!await js('!!document.querySelector(`[data-layer] img`)'),'Undo did not restore empty layers');
  await click('Redo');assert.ok(await js('!!document.querySelector(`[data-layer] img`)'),'Redo did not restore artwork');
  await click('Generate / new edit');assert.equal(await js('document.querySelector(`[aria-label="Expected Pokemon names"]`).value'),'Mimikyu, Landorus, Kingambit');
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({actualRepairButton:true,allSixNames:true,report:true,realArtwork:true,correctedCaptions:true,unchangedOriginalWordsAndTiming:true,undoRedo:true,savedVocabularyControl:true},null,2));
  console.log('PASS desktop recognition repair, report, real artwork, captions, Undo/Redo and saved vocabulary control');win.destroy();
 }finally{backend.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
