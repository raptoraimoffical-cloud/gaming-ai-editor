const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path');
app.whenReady().then(async()=>{
 await require('./desktop-fixtures.cjs').registerProjectServices();
 const voice={id:'voice',name:'Narration',kind:'audio',duration:5,path:'voice.wav',url:'',tags:'',license:'Own recording'};let received;
 ipcMain.handle('library',()=>[voice]);
 ipcMain.handle('generate',(_,opts)=>{received=opts;return {id:'mode-check',name:opts.name,voiceId:'voice',format:opts.format,videoMode:opts.videoMode,duration:5,media:[voice],captionColor:'#8affcb',musicVolume:0,scenes:[{id:'s',start:0,end:5,text:'Hello',words:[],layers:[]}]};});
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../electron/preload.cjs'),contextIsolation:true}});await win.loadFile(path.join(__dirname,'../dist/index.html'));
 const js=s=>win.webContents.executeJavaScript(s);const pause=()=>js('new Promise(r=>setTimeout(r,100))');
 for(const [mode,format,dimension] of [['youtube-shorts','vertical','1080×1920'],['youtube-standard','horizontal','1920×1080']]){
  await js("document.querySelector('.media-sidebar > button').click()");await pause();
  await js(`(()=>{const s=document.querySelector('[aria-label="Video mode"]');s.value=${JSON.stringify(mode)};s.dispatchEvent(new Event('change',{bubbles:true}));const voice=document.querySelector('[aria-label="New video voiceover"]');voice.value='voice';voice.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause();
  await js("[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Generate edit')).click()");await pause();
  if(received?.videoMode!==mode||received.format!==format)throw Error('Incorrect generation mode');
  if(!(await js("document.querySelector('.preview-heading').innerText")).includes(dimension))throw Error('Incorrect preview dimensions');
 }
 console.log('PASS YouTube Shorts and standard mode selection, generation options and preview dimensions');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
