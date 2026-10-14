const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs'),path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs'),b=await createBackend();
 try{
  const source=await b.prepareAudio(b.hydrate(JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/setup-short-check/source.gaming.json')))));let next,context;
  ipcMain.handle('open',()=>source);ipcMain.handle('library',()=>source.media);
  ipcMain.handle('revision-remake',async(_,p,r,c)=>{context=c;next=await b.remake(p,r,c);return next;});ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,200))'),click=async label=>{await js('[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+').click()');await pause();};
  if(!await js('!!document.querySelector("button")'))throw Error('Desktop did not load');
  await click('Open project');await js(`document.querySelector('[aria-label="Use trained AI for changes"]').click()`);await click('Sceptile reference Short');
  for(let i=0;i<400&&!next;i++)await pause();if(!next)throw Error('Setup remake did not complete');await pause();
  if(context.shortStyle!=='pokemon-setup'||context.useAI!==false)throw Error('Setup style/mode not passed to backend');
  await click('+1s');if(!await js('!!document.querySelector("[data-setup-graphic=ability]")&&getComputedStyle(document.querySelector("[data-captions] span")).color==="rgb(255, 240, 37)"'))throw Error('Actual ability card or yellow captions missing');
  await click('+1s');await click('+1s');if(!await js('!!document.querySelector(`[data-layer*="item"] img`)'))throw Error('Held item missing');
  for(let i=0;i<4;i++)await click('+1s');if(!await js('!!document.querySelector("[data-setup-graphic=stats]")'))throw Error('Actual stat graphic missing');
  await click('Undo');if(await js('!!document.querySelector(`[data-layer*="-setup-"]`)'))throw Error('Undo failed');await click('Redo');if(!await js('!!document.querySelector(`[data-layer*="-setup-"]`)'))throw Error('Redo failed');
  await click('Generate / new edit');if(!await js('document.querySelector(`[aria-label="Shorts editing style"]`).value==="pokemon-setup"&&document.querySelector(`[aria-label="Gameplay phrase 0"]`).value==="Discharge"'))throw Error('Generation style/cue settings missing');
  if(!await js('[...document.querySelectorAll("button")].some(b=>b.textContent==="Remake current video with these clips")'))throw Error('Gameplay remake button missing');
  await js(`{const select=document.querySelector('[aria-label="Video mode"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'youtube-standard');select.dispatchEvent(new Event('change',{bubbles:true}));}`);await pause();if(!await js('document.querySelector(`[aria-label="Shorts editing style"]`).value===""'))throw Error('Standard video mode must not silently force a Shorts preset');
  await js(`{const select=document.querySelector('[aria-label="Shorts editing style"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'pokemon-setup');select.dispatchEvent(new Event('change',{bubbles:true}));}`);await pause();
  await js(`{const select=document.querySelector('[aria-label="AI Quality"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'fast');select.dispatchEvent(new Event('change',{bubbles:true}));}`);await pause();
  next=undefined;await click('Remake current video with these clips');for(let i=0;i<400&&!next;i++)await pause();if(!next?.scenes.some(s=>s.layers.some(l=>l.role==='gameplay')))throw Error('Gameplay cue remake did not make video layers');await pause();if(await js('!!document.querySelector(`[aria-label="Generation settings"]`)'))throw Error('Cue remake did not close generation settings');
  console.log('PASS actual Sceptile reference remake button/backend, ability artwork, item attachment, yellow captions, stat rows, Undo/Redo and gameplay cue controls');win.destroy();
 }finally{b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
