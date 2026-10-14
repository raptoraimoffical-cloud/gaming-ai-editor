const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 ipcMain.handle('library',()=>[]);
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});
 await win.loadFile(path.join(__dirname,'../dist/index.html'));
 await win.webContents.executeJavaScript(`document.querySelector('.media-sidebar > button').click()`);
 const result=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const dialog=document.querySelector('[role="dialog"]');if(dialog){clearInterval(timer);resolve({text:dialog.innerText,bridge:typeof window.minecraft.browse,options:Array.from(dialog.querySelectorAll('option')).map(o=>o.textContent)});}else if(++n>30){clearInterval(timer);reject(Error('Creation dialog missing'));}},100);})`);
 for(const text of ['Upload images','Optional files','Background','Editing instructions'])if(!result.text.includes(text))throw Error('Missing creation control: '+text);
 if(result.bridge!=='function'||!result.options.includes('Generate with local AI'))throw Error('Missing background or Minecraft API');
 console.log('Creation dialog and Minecraft browse bridge verified');
 win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
