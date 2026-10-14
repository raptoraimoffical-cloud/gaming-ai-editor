const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.whenReady().then(async()=>{
 const backend=await (await import('../electron/backend.mjs')).createBackend({workspace:path.join(__dirname,'../workspace/smoke/library')});
 const win=new BrowserWindow({show:false,width:1500,height:980,webPreferences:{preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 const {ipcMain}=require('electron');ipcMain.handle('library',()=>backend.library());
 const projectFile=path.join(__dirname,'../workspace/smoke/project.gaming.json');
 ipcMain.handle('open',()=>fs.existsSync(projectFile)?backend.hydrate(JSON.parse(fs.readFileSync(projectFile,'utf8'))):null);
 await win.loadFile(path.join(__dirname,'../dist/index.html'));
 const result=await win.webContents.executeJavaScript(`({title:document.title,text:document.body.innerText,bridge:typeof window.editor})`);
 if(!result.text.includes('Build your story')||result.bridge!=='object')throw Error('Desktop UI failed');
 fs.writeFileSync(path.join(__dirname,'../workspace/desktop.png'),(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(result));
 if(fs.existsSync(projectFile)){
  await win.webContents.executeJavaScript(`document.querySelector('header button').click()`);
  const loaded=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(document.body.innerText.includes('Verified smoke test')){clearInterval(timer);resolve(document.body.innerText);}else if(++count>50){clearInterval(timer);reject(Error('Project did not reopen'));}},100);})`);
  if(!loaded.includes('Scene timeline'))throw Error('Timeline missing');
  const preview=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{const el=document.querySelector('.preview');if(el && el.innerText.includes('GAMING')){clearInterval(timer);resolve({text:el.innerText,width:el.clientWidth,height:el.clientHeight});}else if(++count>50){clearInterval(timer);reject(Error('Remotion preview did not paint'));}},100);})`);
  console.log('Preview painted',JSON.stringify(preview));
  await win.webContents.executeJavaScript(`new Promise(resolve=>{requestAnimationFrame(()=>requestAnimationFrame(resolve));})`);
  win.showInactive();
  win.webContents.invalidate();
  await win.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(resolve,500))`);
  console.log('Player bounds',await win.webContents.executeJavaScript(`Array.from(document.querySelector('.preview').children).map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))`));
  fs.writeFileSync(path.join(__dirname,'../workspace/project-preview.png'),(await win.webContents.capturePage()).toPNG());
  console.log('Saved project reopened in desktop preview');
 }
 win.destroy();backend.close();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
