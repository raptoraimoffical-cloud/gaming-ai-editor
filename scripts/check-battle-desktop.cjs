const {app,BrowserWindow,ipcMain}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const {applyBattles}=await import('../electron/battle-choreography.mjs'),{recordRevision,undoRedo}=await import('../electron/revisions.mjs');
 const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'../workspace/battle-check/project.gaming.json'))),plan=saved.battleReport;
 const source=undoRedo(saved,'undo');for(const m of source.media){if(m.path&&fs.existsSync(m.path)){const mime=m.kind==='audio'?'audio/wav':/gif$/i.test(m.path)?'image/gif':'image/png';m.url='data:'+mime+';base64,'+fs.readFileSync(m.path).toString('base64');}}
 let received;ipcMain.handle('library',()=>source.media);ipcMain.handle('open',()=>source);ipcMain.handle('revision-apply',(_,p,r,c)=>{received={r,c};return recordRevision(p,applyBattles(p,plan),r,[],'Battle choreographed','Trained battle director: '+plan.model);});ipcMain.handle('revision-history',(_,p,d)=>undoRedo(p,d));
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
 const js=s=>win.webContents.executeJavaScript(s),pause=()=>js('new Promise(r=>setTimeout(r,250))');const click=async t=>{await js('[...document.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(t)+').click()');await pause();};
 await click('Open project');await js(`(()=>{const t=document.querySelector('[aria-label="AI revision request"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(t,"Make these two Pokemon fight in a cartoon dust cloud");t.dispatchEvent(new Event("input",{bubbles:true}));})()`);await pause();await click('Apply Changes');
 if(!received?.c.useAI||!received.r.includes('fight'))throw Error('Request did not reach AI revision bridge');
 for(let i=0;i<3;i++)await click('+1s');
 if(!await js(`!!document.querySelector('[data-layer="s-battle-dust"] svg circle')`))throw Error('Animated dust cloud missing from desktop preview');
 await click('Undo');if(await js(`!!document.querySelector('[data-layer="s-battle-dust"]')`))throw Error('Undo did not remove cloud');await click('Redo');if(!await js(`!!document.querySelector('[data-layer="s-battle-dust"] svg circle')`))throw Error('Redo did not restore cloud');
 console.log('PASS desktop battle request, SVG preview, Undo and Redo');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
