const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'workspace/pipeline-audit');
fs.mkdirSync(folder,{recursive:true});app.setPath('sessionData',path.join(folder,'electron-session'));
let voicePath,caseName,generated,saved,exported;
dialog.showOpenDialog=async(_,opts)=>({canceled:false,filePaths:[opts.filters?.[0]?.name==='Gaming project'?path.join(folder,caseName+'.gaming.json'):voicePath]});
dialog.showSaveDialog=async(_,opts)=>({canceled:false,filePath:path.join(folder,caseName+(opts.filters[0].name==='MP4'?'.mp4':'.gaming.json'))});
const handle=ipcMain.handle.bind(ipcMain);ipcMain.handle=(name,fn)=>handle(name,async(...args)=>{const result=await fn(...args);if(name==='generate')generated=result;if(name==='save')saved=args[1];if(name==='render')exported=result;return result;});
// Load the application's real entry point and every production IPC handler.
require('../electron/main.cjs');
app.whenReady().then(async()=>{
 let win;const deadline=Date.now()+120000;while(Date.now()<deadline){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoading()&&await win.webContents.executeJavaScript("!!document.querySelector('header')").catch(()=>false))break;await new Promise(r=>setTimeout(r,200));}
 assert.ok(win?.isVisible(),'Real application must be visible');
 const js=c=>win.webContents.executeJavaScript(c,true);
 const wait=c=>js(`new Promise((resolve,reject)=>{const deadline=Date.now()+600000,t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(Date.now()>deadline){clearInterval(t);reject(Error('Timed out: '+${JSON.stringify(c)}));}},100);})`);
 const button=t=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith(${JSON.stringify(t)}));if(!b||b.disabled)throw Error('Missing/disabled '+${JSON.stringify(t)});b.click();})()`);
 const set=(selector,value)=>js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
 const label=(text,value)=>js(`(()=>{const e=[...document.querySelectorAll('.generation-dialog label')].find(l=>l.firstChild.textContent===${JSON.stringify(text)}).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const results=[];
 for(const c of [{name:'control',voice:'workspace/reaction-tests/B-voice.wav',quality:'fast',instructions:''},{name:'instructed',voice:'workspace/reaction-tests/B-voice.wav',quality:'fast',instructions:'Use a bright green background, make the main character twice as large, and have it slide in from the left.'},{name:'minecraft',voice:'workspace/pipeline-audit/minecraft-voice.wav',quality:'fast',instructions:''},{name:'ultra',voice:'workspace/reaction-tests/B-voice.wav',quality:'ultra',instructions:'Keep captions minimal.'}].filter(c=>!process.env.AUDIT_CASES||process.env.AUDIT_CASES.split(',').includes(c.name))){
  caseName=c.name;voicePath=path.join(root,c.voice);generated=null;exported=null;
  console.log('CASE',c.name);await button('Generate / new edit');await wait("document.querySelector('.generation-dialog')");await button('Import voiceover / footage');await wait("document.querySelector('footer').innerText.includes('Imported')");
  await label('Transcription','tiny.en');await set('[aria-label="AI Quality"]',c.quality);await set('[aria-label="Pre-generation Editing Instructions"]',c.instructions);await button('Generate edit');
  await wait("!document.querySelector('.generation-dialog')&&document.querySelector('.pipeline-evidence')");
  assert.ok(generated);if(c.quality==='fast')assert.equal(generated.pipelineReport.inferenceEvents.length,0,'Fast must not execute AI inference');
  if(c.name==='instructed'){assert.equal(generated.instructionReport.warnings.length,0);assert.equal(generated.scenes[0].layers.find(l=>l.role==='background').color,'#00ff00');}
  if(c.name==='minecraft'){assert.ok(generated.assetSearchLog.some(l=>l.provider==='commons'||l.provider==='local'&&l.inserted));assert.ok(generated.scenes.flatMap(s=>s.layers).some(l=>generated.media.find(m=>m.id===l.mediaId)?.attribution?.source?.includes('commons.wikimedia')));assert.ok(!generated.scenes.flatMap(s=>s.layers).some(l=>generated.media.find(m=>m.id===l.mediaId)?.pokemon));}
  if(c.name==='ultra')assert.ok(generated.pipelineReport.inferenceEvents.some(e=>e.stage==='narration-analysis'&&e.performed));
  await button('Save');await wait("document.querySelector('footer').innerText.includes('Project saved')");await button('Open project');await wait("document.querySelector('footer').innerText.includes('Project reopened')");
  assert.ok(await js("document.querySelector('.pipeline-evidence').innerText.includes('Inference:')"));
  fs.writeFileSync(path.join(folder,c.name+'-desktop.png'),(await win.webContents.capturePage()).toPNG());await button('Export MP4');await wait("document.querySelector('footer').innerText.includes('Export verified:')");assert.ok(exported);
  results.push({name:c.name,visible:win.isVisible(),savedAndReopened:true,exported,pipeline:generated.pipelineReport});
  fs.writeFileSync(path.join(folder,'desktop-verification.json'),JSON.stringify(results,null,2));
 }
 const build=JSON.parse(fs.readFileSync(path.join(root,'dist/build-info.json')));assert.ok(await js(`document.querySelector('.brand').innerText.includes('${build.id}')`));
 console.log('PASS production Electron Generate, Whisper, sourcing, instruction A/B, Ultra, save/reopen, four MP4s; build',build.id);
 win.close();
}).catch(e=>{console.error(e);app.exit(1);});
