const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage}=require('electron');
const fs=require('node:fs');const path=require('node:path');
const inferenceKeyPath=path.resolve(__dirname,'../workspace/inference-key.bin');
function inferenceKey(){return fs.existsSync(inferenceKeyPath)?safeStorage.decryptString(fs.readFileSync(inferenceKeyPath)):'';}
const {createProcessingSession}=require('./processing-session.cjs');const processing=createProcessingSession();
let backend,win,busy=false,projectStore,writeProject,storeFactory;
const buildFile=path.resolve(__dirname,'../dist/build-info.json');
function diskBuild(){try{return JSON.parse(fs.readFileSync(buildFile,'utf8')).id;}catch{return undefined;}}
const loadedBuildId=diskBuild();
function runtimeVersion(){const availableBuildId=diskBuild();return {loadedBuildId,availableBuildId,needsRestart:!!loadedBuildId&&!!availableBuildId&&loadedBuildId!==availableBuildId};}
const workspace=process.env.GAMING_EDITOR_HEADLESS_CHECK==='1'&&process.env.GAMING_EDITOR_CHECK_WORKSPACE?path.resolve(process.env.GAMING_EDITOR_CHECK_WORKSPACE):path.resolve(__dirname,'../workspace');
fs.mkdirSync(workspace,{recursive:true});
// Startup probes must not contend with the Chromium cache of an already-open editor.
if(process.env.GAMING_EDITOR_VERIFY_STARTUP==='1'){
 const session=path.join(workspace,'startup-verification-session-'+process.pid);
 fs.mkdirSync(session,{recursive:true});app.setPath('sessionData',session);
}
function log(message){const line=`${new Date().toISOString()} ${message}`;console.log(line);fs.appendFileSync(path.join(workspace,'startup.log'),line+'\n');}
function startupError(error){log(`STARTUP ERROR: ${error.stack||error}`);dialog.showErrorBox('Gaming AI Editor startup failed',`${error.message||error}\n\nDetails: ${path.join(workspace,'startup.log')}`);backend?.close();app.exit(1);}
const isolatedCheck=process.env.GAMING_EDITOR_HEADLESS_CHECK==='1'||process.env.GAMING_EDITOR_VERIFY_STARTUP==='1';
const primaryInstance=isolatedCheck||app.requestSingleInstanceLock();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();win.webContents.send('runtime-version',runtimeVersion());}});
if(!primaryInstance)app.quit();
if(primaryInstance)app.whenReady().then(async()=>{
 log(`Electron ready; app=${app.getAppPath()}`);
 win=new BrowserWindow({show:process.env.GAMING_EDITOR_HEADLESS_CHECK!=='1',title:'Gaming AI Editor',width:1500,height:980,minWidth:1100,minHeight:720,backgroundColor:'#0b1017',webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});
 log(`BrowserWindow created; visible=${win.isVisible()}`);
 win.on('closed',()=>{processing.stop();backend?.localAI.cancel();backend?.webImages.cancel();win=null;});
 win.webContents.on('preload-error',(_,preloadPath,error)=>log(`PRELOAD ERROR ${preloadPath}: ${error.stack||error}`));
 win.webContents.on('render-process-gone',(_,details)=>log(`RENDERER EXIT: ${JSON.stringify(details)}`));
 win.webContents.on('did-fail-load',(_,code,message,url)=>log(`LOAD ERROR ${code}: ${message} (${url})`));
 win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});win.webContents.on('will-navigate',e=>e.preventDefault());
 backend=await (await import('./backend.mjs')).createBackend({workspace,getInferenceKey:inferenceKey,getProviderKeys:storedKeys});
 ({writeProject,createProjectStore:storeFactory}=await import('./project-store.mjs'));projectStore=storeFactory(workspace);
 log('Backend ready (SQLite and local media server); Python is only needed for transcription');
 await win.loadFile(path.join(__dirname,'../dist/index.html'));
 if(process.env.GAMING_EDITOR_HEADLESS_CHECK!=='1'){win.show();win.focus();}
 log(`Application loaded; visible=${win.isVisible()}; minimized=${win.isMinimized()}`);
 if(process.env.GAMING_EDITOR_VERIFY_STARTUP==='1'){
  const ui=await win.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.body.innerText.includes('Build your story')){clearInterval(timer);resolve({title:document.title,text:document.body.innerText,bridge:typeof window.editor});}else if(++n>100){clearInterval(timer);reject(Error('Application UI did not mount'));}},100);})`);
  await new Promise(resolve=>setTimeout(resolve,500));
  const report={pid:process.pid,visible:win.isVisible(),minimized:win.isMinimized(),bounds:win.getBounds(),url:win.webContents.getURL(),...ui};
  fs.writeFileSync(path.join(workspace,'startup-window.png'),(await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(workspace,'startup-verification.json'),JSON.stringify(report,null,2));
  log(`STARTUP VERIFIED: ${JSON.stringify({pid:report.pid,visible:report.visible,bridge:report.bridge})}`);
  if(process.env.GAMING_EDITOR_VERIFY_EXIT==='1')win.close();
 }
}).catch(startupError);
// Edits stay in the current session; only the explicit Save handler writes a project.
async function sessionProject(result){const p=await result;if(p?.scenes&&p?.media){const next={...p,sessionResultId:require('node:crypto').randomUUID()};win?.webContents.send('project-result',next);return next;}return p;}
ipcMain.handle('runtime-version',()=>runtimeVersion());
ipcMain.handle('project-health',(_,p)=>backend.health(p));
ipcMain.handle('project-autosave',(_,p)=>p); // Compatibility with an older renderer: no disk writes.
ipcMain.handle('project-recover',async()=>{const recovered=projectStore.recover(p=>backend.hydrate(p));const p=recovered?await backend.prepareAudio(recovered):null;return p;});
ipcMain.handle('animator-status',()=>backend.retentionStatus());
ipcMain.handle('animator-clear-retention',()=>backend.clearRetention());
ipcMain.handle('animator-import-retention',async()=>{const r=await dialog.showOpenDialog(win,{title:'Import historical viewer retention',filters:[{name:'Retention curve',extensions:['csv','json']}]});return r.canceled?null:backend.importRetention(r.filePaths[0]);});
ipcMain.handle('animator-plan',(_,project)=>sessionProject(job(progress=>backend.animateProject(project,progress,keys()),'Local animation planning')));
ipcMain.handle('google-images-browse',(_,query)=>shell.openExternal('https://www.google.com/search?udm=2&q='+encodeURIComponent(String(query).slice(0,500))));
ipcMain.handle('pokemon-games',()=>backend.pokemonGames.games());
ipcMain.handle('pokeos-archive',(_,options)=>backend.pokemonGames.archive(options));
ipcMain.handle('pokeos-download',(_,candidate)=>job(()=>backend.pokemonGames.download(candidate)));
ipcMain.handle('pokemon-game-logo',(_,id)=>job(async()=>{const game=(await backend.pokemonGames.games()).find(g=>g.id===id);if(!game)throw Error('Unknown Pok?mon game');return Promise.all((game.versions||[game]).map(g=>backend.pokemonGames.logo(g)));}));
ipcMain.handle('pokemon-game-background',(_,id)=>job(async()=>{const game=(await backend.pokemonGames.games()).find(g=>g.id===id);if(!game)throw Error('Unknown Pok?mon game');const m=await backend.pokemonGames.background(game.versions?.[0]||game);if(!m)throw Error('No verified background found for this game');return m;}));
ipcMain.handle('fortnite-browse',async(_,category)=>{const {FORTNITE_CATEGORIES,FORTNITE_SOURCE}=await import('./fortnite-assets.mjs');if(!FORTNITE_CATEGORIES[category])throw Error('Unknown category');await shell.openExternal(FORTNITE_SOURCE);});
ipcMain.handle('fortnite-list',(_,options)=>job(()=>backend.fortniteAssets.list(options),'Fortnite asset search'));
ipcMain.handle('fortnite-download',(_,id)=>job(()=>backend.fortniteAssets.download(id),'Fortnite asset download'));
ipcMain.handle('fortnite-import',async(_,options)=>{const {fortniteMetadata}=await import('./fortnite-assets.mjs');const metadata=fortniteMetadata(options);const r=await dialog.showOpenDialog(win,{title:'Import downloaded Fortnite Wiki assets',properties:['openFile','multiSelections'],filters:[{name:'Fortnite images',extensions:['png','jpg','jpeg','webp','gif','svg']}]});return r.canceled?[]:job(()=>Promise.all(r.filePaths.map(file=>backend.importMedia(file,metadata))));});
ipcMain.handle('minecraft-versions',()=>backend.minecraft.versions());
ipcMain.handle('minecraft-wiki-list',(_,c)=>job(progress=>backend.minecraft.listWiki(c,progress)));
ipcMain.handle('minecraft-wiki-browse',(_,c,o)=>job(()=>backend.minecraft.browseWiki(c,o)));
ipcMain.handle('minecraft-wiki-search',(_,q)=>backend.minecraft.findWiki(q));
ipcMain.handle('minecraft-wiki-import',(_,c)=>job(()=>backend.minecraft.importWiki(c)));
ipcMain.handle('minecraft-wiki-bulk',(_,c)=>job(progress=>backend.minecraft.importCategory(c,progress)));
ipcMain.handle('minecraft-sound-index',(_,v)=>job(progress=>backend.minecraft.indexSounds(v,progress)));
ipcMain.handle('minecraft-sound-status',()=>backend.minecraft.soundStatus());
ipcMain.handle('minecraft-sound-import',(_,id,d)=>job(()=>backend.minecraft.importSound(id,d)));
ipcMain.handle('minecraft-sound-all',(_,o)=>job(progress=>backend.minecraft.importSounds(o,progress)));
ipcMain.handle('minecraft-favorites',(_,v)=>backend.minecraft.favorites(v));
ipcMain.handle('script-import',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Written script',extensions:['txt']}]});return r.canceled?null:fs.readFileSync(r.filePaths[0],'utf8');});
ipcMain.handle('script-update',(_,p,t)=>sessionProject(job(progress=>backend.updateScript(p,t,progress))));
ipcMain.handle('local-ai-key-status',()=>({configured:!!inferenceKey()}));
ipcMain.handle('local-ai-key-save',(_,key)=>{if(typeof key!=='string'||key.length>4096)throw Error('Invalid API key');if(!safeStorage.isEncryptionAvailable())throw Error('Windows credential encryption unavailable');if(key)fs.writeFileSync(inferenceKeyPath,safeStorage.encryptString(key));else if(fs.existsSync(inferenceKeyPath))fs.unlinkSync(inferenceKeyPath);return {configured:!!key};});
ipcMain.handle('local-ai-install',(_,model)=>job(progress=>backend.localAI.install(model,progress),'Model download'));
ipcMain.handle('local-ai-discover',(_,s)=>backend.localAI.discover(s));
ipcMain.handle('local-ai-save',(_,s)=>backend.localAI.save(s));
ipcMain.handle('local-ai-cancel',()=>{processing.stop();backend.localAI.cancel();backend.webImages.cancel();});
ipcMain.handle('library',()=>backend.library());
ipcMain.handle('asset-packs-catalog',()=>backend.packCatalog());
ipcMain.handle('asset-packs-download',(_,id)=>job(progress=>backend.downloadPack(id,progress),'Asset pack download'));
ipcMain.handle('asset-packs-index',()=>backend.indexPacks());
ipcMain.handle('asset-packs-sound',(_,p,id,t)=>sessionProject(backend.placeSound(p,id,t)));
ipcMain.handle('reference-analyze',async()=>{const r=await dialog.showOpenDialog(win,{title:'Choose a reference video (analysis only)',filters:[{name:'Reference video',extensions:['mp4','mov','mkv','webm']}]});return r.canceled?null:job(()=>backend.analyzeReference(r.filePaths[0]));});
ipcMain.handle('reference-apply',(_,p,s)=>sessionProject(backend.applyReferenceStyle(p,s)));
ipcMain.handle('visual-upgrade',(_,p)=>sessionProject(job(async progress=>{const {refineVisualBeats}=await import('./asset-identity.mjs');return backend.enrichVisuals(refineVisualBeats({...p,revisionHistory:[],revisionCursor:0,scenes:p.scenes.map(s=>({...s,manualTemplate:false}))}),progress,keys());})));

const settingsPath=path.join(workspace,'provider-settings.json');
function storedKeys(){if(!fs.existsSync(settingsPath))return {};const data=JSON.parse(fs.readFileSync(settingsPath,'utf8'));return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,safeStorage.decryptString(Buffer.from(v,'base64'))]));}
function keys(){const values=storedKeys();if(backend?.webImages.status().enabled===false)delete values['google-images'];return values;}
ipcMain.handle('provider-settings',()=>Object.fromEntries(Object.entries(storedKeys()).map(([k,v])=>[k,!!v])));
ipcMain.handle('provider-save',(_,provider,key)=>{if(!['pexels','pixabay','google-images'].includes(provider))throw Error('Unknown provider');if(!safeStorage.isEncryptionAvailable())throw Error('Windows credential encryption unavailable');if(typeof key!=='string'||key.length>4096)throw Error('Invalid provider key');const values=storedKeys();values[provider]=key.trim();fs.writeFileSync(settingsPath,JSON.stringify(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,safeStorage.encryptString(v).toString('base64')]))));return true;});

ipcMain.handle('web-images-status',()=>backend.webImages.status());
ipcMain.handle('web-images-configure',(_,s)=>backend.webImages.configure(s));
ipcMain.handle('web-images-test',()=>backend.webImages.test(storedKeys()['google-images']));
ipcMain.handle('web-images-clear',()=>backend.webImages.clear());
ipcMain.handle('web-images-cancel',()=>backend.webImages.cancel());
ipcMain.handle('web-images-favorite',(_,id,v)=>backend.webImages.favorite(String(id),!!v));
ipcMain.handle('web-images-reject',(_,id)=>backend.webImages.reject(String(id)));
ipcMain.handle('web-images-search',(_,q,o)=>{if(typeof q!=='string'||!q.trim()||q.length>1000)throw Error('Enter a search of 1?1000 characters');backend.webImages.beginBudget();return backend.webImages.search(q,storedKeys()['google-images'],o||{});});
ipcMain.handle('web-images-download',(_,c)=>backend.webImages.download(c));
ipcMain.handle('web-images-import-url',(_,u,m)=>backend.webImages.importUrl(u,m));
ipcMain.handle('web-images-apply',(_,p,c,context,mode)=>{if(!['add','replace'].includes(mode))throw Error('Invalid image action');return sessionProject(backend.webImages.apply(p,c,context,mode));});
ipcMain.handle('web-images-source',async(_,u)=>{const parsed=new URL(u);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('Invalid source page');await shell.openExternal(parsed.href);});
ipcMain.handle('revision-import-url',async(_,p,u)=>{if(!p.pendingRevision)throw Error('No pending edit');const pending=p.pendingRevision;const m=await backend.webImages.importUrl(u,{name:pending.target.name,query:pending.queries[0]});return sessionProject(backend.resumeRevision({...p,media:[...p.media,m]},pending.id,{mediaId:m.id,confirmIdentity:true,declareSubject:true}));});

ipcMain.handle('online-search',(_,query,provider)=>backend.onlineSearch(query,provider,keys()[provider.replace(/-video$/,'')]));
ipcMain.handle('online-download',(_,candidate)=>backend.onlineDownload(candidate));
ipcMain.handle('online-library',async()=>{const result=await dialog.showOpenDialog(win,{title:'Choose a permitted online image library manifest',filters:[{name:'Licensed image catalog',extensions:['json']}]});if(result.canceled)return 0;return backend.configureOnlineLibrary(JSON.parse(fs.readFileSync(result.filePaths[0],'utf8')));});
ipcMain.handle('visual-direct',(_,project)=>sessionProject(job(progress=>backend.enrichVisuals(project,progress,keys()),'Visual rebuild')));
const directorPath=path.join(workspace,'director-settings.json');
ipcMain.handle('director-settings',()=>fs.existsSync(directorPath)?JSON.parse(fs.readFileSync(directorPath,'utf8')):{url:'http://127.0.0.1:11434',model:''});
const directorSettings=()=>fs.existsSync(directorPath)?JSON.parse(fs.readFileSync(directorPath,'utf8')):{};
ipcMain.handle('revision-remake',(_,project,request,context)=>sessionProject(job(progress=>backend.remake(project,request,context,keys(),progress),context?.timeRange||context?.scope==='selected'?'Editing selected patch':'Remaking video')));
ipcMain.handle('revision-repair-speech',(_,project)=>sessionProject(job(progress=>backend.repairSpeech(project,{},keys(),progress),'Repairing speech and timing')));
ipcMain.handle('revision-apply',(_,project,request,context)=>sessionProject(job(async progress=>{const next=await backend.revise(project,request,directorSettings(),context,keys(),progress);return backend.validateEditResult(project,next);},'AI changes')));
ipcMain.handle('revision-resume',(_,p,id,s)=>sessionProject(job(()=>backend.resumeRevision(p,id,{...s,providerKey:s.provider?keys()[s.provider]:undefined}))));
ipcMain.handle('asset-selection',(_,p,q,c)=>job(()=>backend.assetSelection(p,q,c,keys())));
ipcMain.handle('asset-replace',(_,p,c,s,q)=>sessionProject(job(()=>backend.replaceAsset(p,c,{...s,key:s.provider?keys()[s.provider]:undefined},q))));
ipcMain.handle('audio-timeline',(_,p,k,i,v)=>sessionProject(backend.editAudio(p,k,i,v)));
ipcMain.handle('layer-operations',(_,p,o,label)=>sessionProject(backend.applyLayerOperations(p,o,label)));
ipcMain.handle('manual-edit',(_,p,c)=>sessionProject(backend.manualEdit(p,c)));
ipcMain.handle('game-music-catalog',()=>backend.gameMusic.catalog());
ipcMain.handle('game-music-minecraft-index',()=>job(()=>backend.gameMusic.indexMinecraft(),'Indexing Minecraft music'));
ipcMain.handle('game-music-download',(_,id)=>job(()=>backend.gameMusic.download(id),'Downloading game music'));
ipcMain.handle('scene-regenerate',(_,p,r,c)=>sessionProject(job(()=>backend.regenerateScene(p,r,c,keys()))));
ipcMain.handle('revision-cancel',(_,p)=>{const next={...p};delete next.pendingRevision;return sessionProject(next);});
ipcMain.handle('revision-upload',async(_,p,license)=>{if(!p.pendingRevision)throw Error('No pending asset request');if(!license?.trim())throw Error('Declare the image rights or license before upload');const selected=await dialog.showOpenDialog(win,{title:'Choose an image for '+p.pendingRevision.target.name,filters:[{name:'Visual asset',extensions:['png','jpg','jpeg','webp','gif','svg','mp4','webm']}]});if(selected.canceled)return p;const target=p.pendingRevision.target.entity;const m=await backend.importMedia(selected.filePaths[0],{license,tags:target?.name||p.pendingRevision.target.name,identity:{franchise:target?.franchise||(target?.type==='pokemon'?'pokemon':null)||(/mario/i.test(p.pendingRevision.target.name)?'mario':'unknown'),subject:target?.id||p.pendingRevision.target.name,source:'User-confirmed upload',confidence:1}});return sessionProject(backend.resumeRevision(p,p.pendingRevision.id,{mediaId:m.id,confirmIdentity:true}));});
ipcMain.handle('revision-history',(_,project,direction)=>{if(!['undo','redo'].includes(direction))throw Error('Invalid history action');return sessionProject(backend.undoRedo(project,direction));});
ipcMain.handle('instructions-regenerate',(_,project,text)=>sessionProject(job(()=>backend.regenerateInstructions(project,text,directorSettings()))));
ipcMain.handle('director-save',async(_,settings)=>{const url=new URL(settings.url);if(!['http:','https:'].includes(url.protocol))throw Error('Invalid model server URL');const response=await fetch(new URL('/api/tags',url),{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Ollama connection failed');const data=await response.json();if(settings.model&&!data.models?.some(m=>m.name===settings.model))throw Error('Selected model is not installed on the Ollama server');fs.writeFileSync(directorPath,JSON.stringify({url:settings.url,model:settings.model}));return data.models||[];});
ipcMain.handle('pokemon-search',(_,query)=>backend.pokemonSearch(query));
ipcMain.handle('pokemon-info',(_,name)=>backend.pokemonInfo(name));
ipcMain.handle('pokemon-cry',(_,name,variant)=>job(()=>backend.pokemonCry(name,variant),'Pokémon cry download'));
ipcMain.handle('pokemon-asset',(_,name,options)=>backend.pokemonAsset(name,options));
ipcMain.handle('import',async(_,metadata)=>{const r=await dialog.showOpenDialog(win,{properties:['openFile','multiSelections'],filters:[{name:'Media',extensions:['wav','mp3','m4a','flac','mp4','mov','mkv','webm','png','jpg','jpeg','webp','gif','svg']}]});return r.canceled?[]:Promise.all(r.filePaths.map(p=>backend.importMedia(p,metadata)));});
ipcMain.handle('update-media',(_,m)=>backend.updateMedia(m));
async function job(fn,label='Processing'){
 if(runtimeVersion().needsRestart)throw Error('This window is running an older editor build. Close it and reopen Launch Gaming AI Editor.cmd before starting another edit so the current fixes are used.');
 const task=processing.start(label);busy=true;backend.localAI.beginJob?.(task.signal);
 const started=Date.now(),jobId=task.id,historyPath=path.join(workspace,'progress-timings.json');let history={};
 try{history=JSON.parse(fs.readFileSync(historyPath,'utf8'));}catch{}
 const prior=Array.isArray(history[label])?history[label].filter(n=>Number.isFinite(n)&&n>0):[];
 const estimatedSeconds=prior.length?prior.reduce((a,b)=>a+b,0)/prior.length:undefined;
 const send=p=>{if(win&&!win.isDestroyed())win.webContents.send('progress',{jobId,label,...p});};
 send({state:'started',stage:'Preparing '+label.toLowerCase(),estimatedSeconds});
 try{const result=await fn(p=>{if(!task.signal.aborted)send({...p,state:'running'});});task.signal.throwIfAborted();if(label!=='Processing'){history[label]=[...prior,(Date.now()-started)/1000].slice(-5);try{fs.writeFileSync(historyPath,JSON.stringify(history));}catch{}}send({state:'completed',stage:label+' complete'});return result;}
 catch(e){send({state:task.signal.aborted?'cancelled':'failed',stage:task.signal.aborted?'Editing stopped by you':e.message});throw task.signal.aborted?(task.signal.reason||e):e;}finally{processing.finish(task);backend.localAI.endJob?.();busy=false;}
}
ipcMain.handle('generate',(_,opts)=>sessionProject(job(progress=>backend.generate({...opts,providerKeys:keys(),director:fs.existsSync(directorPath)?JSON.parse(fs.readFileSync(directorPath,'utf8')):undefined},progress),'Video generation')));
ipcMain.handle('voiceover-clean',(_,opts)=>job(progress=>backend.voiceoverTools.clean(opts,progress),'Voiceover cleanup'));
ipcMain.handle('voiceover-render',(_,id,cuts)=>job(progress=>backend.voiceoverTools.render(id,cuts,progress),'Voiceover cleanup'));
ipcMain.handle('voiceover-use',(_,id)=>backend.voiceoverTools.use(id));
ipcMain.handle('voiceover-export',async(_,id)=>{const result=backend.voiceoverTools.get(id),r=await dialog.showSaveDialog(win,{defaultPath:result.media.name,filters:[{name:'WAV audio',extensions:['wav']}]});if(r.canceled)return null;if([result.source.path,result.source.originalPath].filter(Boolean).some(file=>path.resolve(r.filePath).toLowerCase()===path.resolve(file).toLowerCase()))throw Error('Choose a new filename to keep your original recording');fs.copyFileSync(result.media.path,r.filePath);return {output:r.filePath};});
ipcMain.handle('thumbnail-create',(_,opts)=>job(progress=>backend.thumbnailTools.create(opts,keys(),progress),'Thumbnail creation'));
ipcMain.handle('thumbnail-export',async(_,id)=>{const result=backend.thumbnailTools.get(id),name=(result.plan.headline||'YouTube thumbnail').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80),r=await dialog.showSaveDialog(win,{defaultPath:name+'.jpg',filters:[{name:'JPEG thumbnail',extensions:['jpg','jpeg']}]});if(r.canceled)return null;fs.copyFileSync(result.media.path,r.filePath);return {output:r.filePath};});
ipcMain.handle('render',async(_,p)=>{const r=await dialog.showSaveDialog(win,{defaultPath:p.name+'.mp4',filters:[{name:'MP4',extensions:['mp4']}]});return r.canceled?null:job(progress=>backend.render(p,r.filePath,progress),'Video export');});
ipcMain.handle('save',async(_,p)=>{const r=await dialog.showSaveDialog(win,{defaultPath:p.name+'.gaming.json',filters:[{name:'Gaming project',extensions:['json']}]});if(!r.canceled){const saved={...p};delete saved.sessionResultId;writeProject(r.filePath,saved);}return !r.canceled;});
ipcMain.handle('open',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Gaming project',extensions:['json']}]});if(r.canceled)return null;const raw=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));delete raw.sessionResultId;const p=await backend.prepareAudio(backend.hydrate(raw));return p;});
ipcMain.handle('reveal',(_,p)=>shell.showItemInFolder(p));
app.on('window-all-closed',()=>{backend?.close();app.quit();});
