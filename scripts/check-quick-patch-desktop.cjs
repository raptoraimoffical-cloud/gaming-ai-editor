const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../workspace/quick-patch-check/desktop');fs.mkdirSync(dir,{recursive:true});app.setPath('userData',path.join(dir,'user-data'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs');const b=await createBackend({workspace:path.join(__dirname,'../workspace/move-effects-check/backend')});let win;
 try{
  const source=b.hydrate(JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/context-check/updated-short.gaming.json'),'utf8')));let next,context,calls=0;
  ipcMain.handle('open',()=>source);ipcMain.handle('library',()=>source.media);ipcMain.handle('revision-remake',async(_,p,r,c)=>{context=c;next=await b.remake(p,r,c);calls++;return next;});ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  win=new BrowserWindow({show:false,width:1600,height:1080,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});win.webContents.on('console-message',(_,level,message)=>{if(level>=2)console.log(message)});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,150))');
  const click=async label=>{await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+');if(!b||b.disabled)throw Error("Button unavailable: "+'+JSON.stringify(label)+');b.click()})()');await pause();};
  const select=async(label,value)=>{await js('(()=>{const e=document.querySelector('+JSON.stringify('select[aria-label="'+label+'"]')+');if(!e)throw Error("Missing select");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}))})()');await pause();};
  const input=async(label,value,textarea=false)=>{await js('(()=>{const e=document.querySelector('+JSON.stringify((textarea?'textarea':'input')+'[aria-label="'+label+'"]')+');Object.getOwnPropertyDescriptor('+(textarea?'HTMLTextAreaElement':'HTMLInputElement')+'.prototype,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}))})()');await pause();};
  const css=()=>js('(()=>{const c=document.querySelector("[data-captions]"),s=getComputedStyle(c);return {fontSize:s.fontSize,bottom:s.bottom,shadow:s.textShadow,text:c.textContent}})()');
  await click('Open project');await click('+1s');await click('+1s');await click('+1s');const before=await css();
  assert.ok(await js('!!document.querySelector(`select[aria-label="Video game"] option[value=multiple]`)'));
  await select('AI edit scope','patch');await input('Patch start','3');await input('Patch end','4');await input('AI revision request','Make the character smaller',true);
  await js('(()=>{const c=document.querySelector(`input[aria-label="Use trained AI for changes"]`);if(c.checked)c.click()})()');await pause();await click('Quick remake selected patch');for(let i=0;i<200&&!next;i++)await pause();assert.ok(next);await pause();
  assert.deepEqual(context.timeRange,{start:3,end:4});assert.equal(context.useAI,false);assert.ok(next.quickPatchReport);assert.deepEqual(next.scenes.slice(1),source.scenes.slice(1));assert.deepEqual(await css(),before);
  assert.ok(await js('!!document.querySelector(`[data-layer*="-patch-"]`)'),'Patch is actually rendered');
  await click('Undo');assert.equal(await js('!!document.querySelector(`[data-layer*="-patch-"]`)'),false);await click('Redo');assert.equal(await js('!!document.querySelector(`[data-layer*="-patch-"]`)'),true);
  await select('Video game','pokemon');await click('Apply game selection & remake');for(let i=0;i<300&&calls<2;i++)await pause();assert.equal(calls,2);assert.equal(next.gameSelection,'pokemon');assert.equal(next.gameDetectionReport.detected,'pokemon');assert.equal(context.preserveCaptions,true);
  await click('Generate / new edit');assert.ok(await js('!!document.querySelector(`select[aria-label="Game to edit"]`)'));await select('Game to edit','multiple');assert.equal(await js('document.querySelector(`select[aria-label="Shorts editing style"]`).disabled'),true);
  fs.writeFileSync(path.join(dir,'controls.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({actualRangeButton:true,renderedPatch:true,captionAppearancePreserved:true,undoRedo:true,gameChoicePersisted:true,multipleGamesDoesNotForcePokemon:true},null,2));console.log('PASS actual patch controls, rendered changes, captions, Undo/Redo, persisted game choice and generation selector');
 }finally{win?.destroy();b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
