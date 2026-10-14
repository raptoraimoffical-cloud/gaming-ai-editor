const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 ipcMain.handle('library',()=>[]);
 ipcMain.handle('animator-status',()=>({measured:false,basis:'Editorial heuristics',notice:'No historical audience retention imported. These are heuristics, not predictions.'}));
 ipcMain.handle('animator-import-retention',()=>({measured:true,basis:'User-imported historical audience retention',pointCount:3,areaUnderCurve:70,dips:[{}],notice:'Historical data is not a prediction.'}));
 ipcMain.handle('animator-clear-retention',()=>({measured:false,basis:'Editorial heuristics',notice:'These are heuristics, not predictions.'}));
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});
 await win.loadFile(path.join(__dirname,'../dist/index.html'));
 const click=async label=>{await win.webContents.executeJavaScript(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)});if(!b)throw Error('Missing button');b.click();})()`);await win.webContents.executeJavaScript('new Promise(r=>setTimeout(r,100))');};
 const text=()=>win.webContents.executeJavaScript('document.body.innerText');
 await require('./desktop-fixtures.cjs').navigateWorkbench(win,'Animator');if(!(await text()).includes('heuristics, not predictions'))throw Error('Heuristic disclosure missing');
 if(!await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(b=>b.textContent==='Plan video & create local animations').disabled"))throw Error('Plan should require a project');
 await click('Import retention CSV / JSON');if(!(await text()).includes('3 curve samples'))throw Error('Imported statistics missing');
 await click('Clear retention data');if(!(await text()).includes('Editorial heuristics'))throw Error('Clear failed');
 console.log('PASS desktop local animator tab, import/clear retention, evidence disclosure and project requirement');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
