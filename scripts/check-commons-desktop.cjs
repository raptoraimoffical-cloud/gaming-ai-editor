const {app,BrowserWindow,ipcMain}=require('electron');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
app.whenReady().then(async()=>{
 const folder=path.join(__dirname,'../workspace/commons-smoke');const backend=await(await import('../electron/backend.mjs')).createBackend({workspace:path.join(folder,'library')});
 ipcMain.handle('library',()=>backend.library());ipcMain.handle('open',()=>backend.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8'))));ipcMain.handle('online-search',(_,q,p)=>backend.onlineSearch(q,p));ipcMain.handle('online-download',(_,c)=>backend.onlineDownload(c));ipcMain.handle('visual-direct',(_,p)=>backend.enrichVisuals(p));
 const win=new BrowserWindow({show:true,width:1500,height:980,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 await win.loadFile(path.join(__dirname,'../dist/index.html'));const js=code=>win.webContents.executeJavaScript(code,true);
 const wait=condition=>js(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${condition}){clearInterval(t);resolve();}else if(++n>200){clearInterval(t);reject(Error('Desktop UI timed out'));}},100);})`);
 await wait("document.querySelector('header button')");await js("Array.from(document.querySelectorAll('header button')).find(b=>b.textContent==='Open project').click()");await wait("document.querySelector('[data-layer] img')?.complete");assert.equal(win.isVisible(),true);
 fs.writeFileSync(path.join(folder,'desktop-preview.png'),(await win.webContents.capturePage()).toPNG());
 await js("Array.from(document.querySelectorAll('header button')).find(b=>b.textContent==='Online media / Settings').click()");await js("Array.from(document.querySelectorAll('section button')).find(b=>b.textContent==='Search / test connection').click()");await wait("document.querySelector('article img')?.complete");
 await js("Array.from(document.querySelectorAll('article button'))[0].click()");await wait("document.querySelector('footer')?.innerText.includes('Cached licensed image inserted')");
 fs.writeFileSync(path.join(folder,'desktop-online-library.png'),(await win.webContents.capturePage()).toPNG());console.log('Verified visible Electron UI, real scene preview, Commons search, cached download and replacement into animated layers.');win.destroy();backend.close();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
