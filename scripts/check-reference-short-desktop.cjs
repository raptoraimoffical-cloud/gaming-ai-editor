const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs'),path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();const {createBackend}=await import('../electron/backend.mjs'),b=await createBackend();
 try{
  const source=await b.prepareAudio(b.hydrate(JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/reference-short-check/source.gaming.json')))));let next,context;
  ipcMain.handle('open',()=>source);ipcMain.handle('library',()=>source.media);
  ipcMain.handle('revision-remake',async(_,p,r,c)=>{context=c;next=await b.remake(p,r,c);return next;});ipcMain.handle('revision-history',(_,p,d)=>b.undoRedo(p,d));
  const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
  const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,200))'),click=async label=>{await js('[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(label)+').click()');await pause();};
  await click('Open project');await js(`document.querySelector('[aria-label="Use trained AI for changes"]').click()`);await click('Reference Pokemon Short');
  for(let i=0;i<400&&!next;i++)await pause();if(!next)throw Error('Reference remake did not complete');await pause();
  if(context.shortStyle!=='pokemon-artwork'||context.useAI!==false)throw Error('Reference style/mode not passed to backend');
  if(next.videoMode!=='youtube-shorts'||next.captionStyle.enabled!==false)throw Error('Wrong canvas or caption default');
  for(let i=0;i<3;i++)await click('+1s');if(!await js('document.querySelectorAll(`[data-layer*="reference-actor"] img`).length===2&&!document.querySelector("[data-captions]")'))throw Error('Actual stacked images or caption defaults are incorrect');
  await click('Undo');if(await js('!!document.querySelector(`[data-layer*="reference-actor"]`)'))throw Error('Undo did not restore the source');await click('Redo');if(!await js('document.querySelectorAll(`[data-layer*="reference-actor"] img`).length===2'))throw Error('Redo failed');
  await click('Generate / new edit');await js(`{const select=document.querySelector('[aria-label="Shorts editing style"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'pokemon-artwork');select.dispatchEvent(new Event('change',{bubbles:true}));}`);await pause();if(!await js('document.querySelector(`[aria-label="Shorts editing style"]`).value==="pokemon-artwork"'))throw Error('Generation preset missing');
  console.log('PASS Reference Pokemon Short button, actual backend artwork preview, vertical canvas, captions off, Undo/Redo and generation preset');win.destroy();
 }finally{b.close();app.quit();}
}).catch(e=>{console.error(e);app.exit(1);});
