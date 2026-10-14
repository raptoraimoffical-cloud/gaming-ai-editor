const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path');const fs=require('node:fs');
const dir=path.join(__dirname,'../workspace/dense-desktop-check');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs');const backend=await createBackend({workspace:path.join(dir,'backend')});
 try{
  const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/dense-short-check/project.gaming.json'),'utf8'));
  delete source.shortStyle;delete source.shortStyleReport;source.editingInstructions='';source.revisionHistory=[];source.revisionCursor=0;
  for(const s of source.scenes){delete s.referenceShortApplied;s.layers=[];s.manualTemplate=false;}
  const p=backend.hydrate(source);let next,context;
  ipcMain.handle('open',()=>p);ipcMain.handle('library',()=>p.media);ipcMain.handle('revision-remake',async(_,project,r,c)=>{context=c;next=await backend.remake(project,r,c);return next;});ipcMain.handle('revision-history',(_,project,d)=>backend.undoRedo(project,d));
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+').click()');await pause();};
  await click('Generate / new edit');if(!await js('document.querySelector(`[aria-label="Shorts editing style"]`).value==="pokemon-dense"'))throw Error('Gold preset is not the default for new edits');await click('Close');
  await click('Open project');await js('document.querySelector(`[aria-label="Use trained AI for changes"]`).click()');await click('Gold reference Short');
  for(let i=0;i<400&&!next;i++)await pause();if(!next)throw Error('Gold reference remake did not complete');await pause();if(context.shortStyle!=='pokemon-dense'||context.useAI!==false)throw Error('New button did not send correct preset/mode');
  await click('+1s');await click('+1s');if(!await js('!!document.querySelector(`[data-layer*="-dense-"]`)'))throw Error('Actual layered graphics missing');if(!await js('getComputedStyle(document.querySelector(`[data-captions] span`)).color==="rgb(255, 255, 255)"'))throw Error('Outlined white captions missing');if(next.scenes[0].layers.filter(l=>l.role==='game-logo').length!==1)throw Error('Duplicate game logos in desktop remake');
  for(let i=0;i<7;i++)await click('+1s');if(!await js('!!document.querySelector(`[data-setup-graphic="percentage-comparison"]`)'))throw Error('Real percentage graphic missing from preview');
  await click('Undo');if(await js('!!document.querySelector(`[data-setup-graphic="percentage-comparison"]`)'))throw Error('Undo did not restore source');await click('Redo');if(!await js('!!document.querySelector(`[data-setup-graphic="percentage-comparison"]`)'))throw Error('Redo did not restore new layers');
  await click('Generate / new edit');if(!await js('document.querySelector(`[aria-label="Shorts editing style"]`).value==="pokemon-dense"&&!!document.querySelector(`[aria-label="Gameplay cue editor"]`)'))throw Error('Gold generation and gameplay controls missing');
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({defaultPreset:true,realRemakeButton:true,actualGraphics:true,whiteCaptions:true,percentageChart:true,undoRedo:true,gameplayCueControls:true},null,2));console.log('PASS real desktop gold preset, remake button, graphic preview, white captions, percentage chart, Undo/Redo and gameplay controls');win.destroy();
 }finally{backend.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
