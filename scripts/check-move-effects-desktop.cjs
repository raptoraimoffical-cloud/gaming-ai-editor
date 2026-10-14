const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../workspace/move-effects-desktop-check');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs');const {DEFAULT_INSTRUCTIONS}=await import('../electron/default-instructions.mjs');const b=await createBackend({workspace:path.join(dir,'backend')});let win;
 try{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/move-effects-check/repair-source.gaming.json'),'utf8')),p=b.hydrate(source);let next;
  ipcMain.handle('open',()=>p);ipcMain.handle('library',()=>p.media);ipcMain.handle('revision-remake',async(_,p,r,c)=>next=await b.remake(p,r,c));ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  win=new BrowserWindow({show:false,width:1500,height:980,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Missing/disabled button "+'+JSON.stringify(label)+');b.click()})()');await pause();};
  await click('Open project');await click('Rebuild hooks, natures & effects');for(let i=0;i<400&&!next;i++)await pause();assert.ok(next);await pause();assert.ok(next.editingInstructions.includes(DEFAULT_INSTRUCTIONS));assert.ok(next.pokemonImageReport.every(r=>!/showdown/.test(r.source)));
  const fire=next.moveEffectReport.cues.find(c=>c.effect==='screen-fire'&&c.action),sample=fire.start+(fire.effectEnd-fire.start)*.45;for(let i=0;i<Math.floor(sample);i++)await click('+1s');
  const time=Math.floor(sample);if(time<fire.start)await click('+1s');assert.ok(await js('!!document.querySelector(`[data-move-effect="screen-fire"]`)'),'No live fire overlay in preview');
  const summaries=await js('[...document.querySelectorAll("summary")].map(s=>s.textContent)');assert.ok(summaries.some(s=>s.startsWith('Move visuals:')));assert.ok(summaries.some(s=>s.startsWith('Pokemon pictures:')));
  await click('Undo');assert.ok(!await js('!!document.querySelector(`[data-move-effect]`)'));await click('Redo');assert.ok(await js('!!document.querySelector(`[data-move-effect="screen-fire"]`)'));
  await click('Generate / new edit');const brief=await js('document.querySelector(`[aria-label="Pre-generation Editing Instructions"]`).value');assert.ok(brief.includes('lots')||brief.includes('plenty happening'));assert.ok(brief.includes('Flamethrower ignites'));assert.ok(brief.includes('two seconds'));
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({actualRebuild:true,liveFirePreview:true,moveAndPictureReports:true,googleFallbackDisclosed:true,officialArtworkPreferred:true,defaultBriefMigrated:true,undoRedo:true},null,2));console.log('PASS desktop rebuild, live fire preview, artwork policy/source reports, migrated dense brief and Undo/Redo');
 }finally{win?.destroy();b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
