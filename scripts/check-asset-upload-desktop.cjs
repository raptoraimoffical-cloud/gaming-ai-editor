const {app,BrowserWindow,ipcMain}=require('electron');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const folder=path.resolve(__dirname,'../workspace/revision-assets-tests/upload-fallback');fs.mkdirSync(folder,{recursive:true});
 const fixture=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../workspace/visual-quality/upgraded.gaming.json'),'utf8'));
 fixture.media=fixture.media.filter(m=>!(/mario/i.test(m.name)||m.identity?.franchise==='mario'));
 const approved=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../workspace/revision-assets-tests/desktop-verification.json'),'utf8')).sharedLibraryAsset;
 const b=await(await import('../electron/backend.mjs')).createBackend({workspace:path.join(folder,'library-'+Date.now()),providerOptions:{fetchImpl:async()=>new Response(JSON.stringify({query:{pages:{}}}),{headers:{'Content-Type':'application/json'}})}});
 let saved=fixture,uploaded,applied;
 ipcMain.handle('library',()=>b.library());ipcMain.handle('open',()=>b.hydrate(saved));ipcMain.handle('save',(_,p)=>{saved=JSON.parse(JSON.stringify(p));fs.writeFileSync(path.join(folder,'saved.gaming.json'),JSON.stringify(saved,null,2));return true;});
 ipcMain.handle('revision-apply',async(_,p,r,c)=>{applied=await b.revise(p,r,{},c);return applied;});
 // The test substitutes a selected fixture path for the native file picker; import and resume are the actual application backend.
 ipcMain.handle('revision-upload',async(_,p,license)=>{assert.ok(license.includes('CC BY-SA'));uploaded=await b.importMedia(approved.path,{license,tags:'Super Mario',identity:{franchise:'mario',subject:'mario',source:'User-confirmed upload',confidence:1},attribution:approved.attribution});return b.resumeRevision(p,p.pendingRevision.id,{mediaId:uploaded.id,confirmIdentity:true});});
 const win=new BrowserWindow({show:true,width:1500,height:980,webPreferences:{backgroundThrottling:false,preload:path.resolve(__dirname,'../electron/preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 await win.loadFile(path.resolve(__dirname,'../dist/index.html'));const js=code=>win.webContents.executeJavaScript(code,true);
 const wait=condition=>js(`new Promise((resolve,reject)=>{const deadline=Date.now()+30000,t=setInterval(()=>{if(${condition}){clearInterval(t);resolve();}else if(Date.now()>deadline){clearInterval(t);reject(Error('Timed out: '+${JSON.stringify(condition)}));}},100);})`);
 const button=text=>js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`);
 const value=(selector,text,type)=>js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${type}.prototype,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await wait("document.querySelector('header')");await button('Open project');await wait("document.querySelectorAll('.scene-list .clip').length===4");
 await value('[aria-label="AI revision request"]','Add Mario with a slide-in animation.','HTMLTextAreaElement');await wait("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Apply Changes').disabled");await button('Apply Changes');await wait("document.querySelector('.pending-request')");
 assert.equal(applied.pendingRevision.candidates.length,0);assert.ok(applied.pendingRevision.searchLog.some(l=>l.provider==='commons'));assert.deepEqual(applied.scenes,fixture.scenes);
 await button('Save');await wait("document.querySelector('footer').innerText.includes('Project saved')");await button('Open project');await wait("document.querySelector('.pending-request')");
 await js("document.querySelector('.pending-request .check-row input').click()");await value('[aria-label="Upload asset rights"]',approved.license+' — '+approved.attribution.credit+' — '+approved.attribution.source,'HTMLInputElement');await wait("!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Upload image & resume').disabled");await button('Upload image & resume');await wait("!document.querySelector('.pending-request')");
 await button('Save');await wait("document.querySelector('footer').innerText.includes('Project saved')");assert.equal(saved.scenes[0].layers.at(-1).mediaId,uploaded.id);assert.equal(saved.scenes[0].layers.at(-1).animation,'slide-in-out');assert.ok(b.library().some(m=>m.id===uploaded.id));assert.equal(saved.revisionHistory.at(-1).request,'Add Mario with a slide-in animation.');
 await button('Open project');await wait("document.querySelector('footer').innerText.includes('Project reopened')");assert.ok(win.isVisible());
 fs.writeFileSync(path.join(folder,'desktop-upload.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({visible:true,controlledEmptyProviderResults:true,realImportResumeBackend:true,nativePickerSubstitutedByFixture:true,pendingSavedReopened:true,originalRequestResumed:true,animation:'slide-in-out',sharedLibrary:true,reopened:true,uploaded},null,2));
 console.log('PASS: real Electron missing-candidate panel retained and reopened the request, then upload + resume applied the original slide-in and registered the file in the shared library.');win.destroy();b.close();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
