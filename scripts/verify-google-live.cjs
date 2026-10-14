const {app,safeStorage}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.setPath('userData',path.resolve(__dirname,'../workspace/google-live-check/electron-profile'));
app.whenReady().then(async()=>{
 const {createBackend,run}=await import('../electron/backend.mjs');const {imageSearchIntent}=await import('../electron/web-image-queries.mjs');
 const folder=path.resolve(__dirname,'../workspace/google-live-check');fs.mkdirSync(folder,{recursive:true});const keyFile=path.resolve(__dirname,'../workspace/provider-settings.json');let key='';
 if(fs.existsSync(keyFile)&&safeStorage.isEncryptionAvailable()){const encrypted=JSON.parse(fs.readFileSync(keyFile,'utf8'))['google-images'];if(encrypted)key=safeStorage.decryptString(Buffer.from(encrypted,'base64'));}
 const queries=['Minecraft pig transparent PNG','Minecraft diamond pickaxe PNG','Mario official character PNG','Fortnite Peely skin PNG','Pokemon Charizard artwork','Pikachu animated GIF','Minecraft Nether background'];
 const backend=await createBackend({workspace:folder,getProviderKeys:()=>({'google-images':key})});const report={liveSerpApi:true,keyConfigured:!!key,tests:[],testedAt:new Date().toISOString()},selected=[];
 try{
  for(const query of queries){const item={requested:query,query:imageSearchIntent(query).query};if(!key){item.status='NOT RUN: SerpApi key not configured';report.tests.push(item);continue;}
   try{const candidates=await backend.onlineSearch(query,'google-images',key);item.results=candidates.length;item.candidates=candidates.slice(0,6).map(c=>({name:c.name,original:c.url,source:c.attribution.source,assessment:c.webAssessment}));
    for(const c of candidates.filter(c=>c.webAssessment.autoEligible).slice(0,3)){try{const asset=await backend.onlineDownload(c);if(!asset.webAssessment.accepted)continue;item.asset={path:asset.path,originalUrl:asset.originalUrl,contentHash:asset.contentHash,width:asset.width,height:asset.height,transparent:asset.transparent,animation:asset.animationInfo};selected.push({asset,query,item});break;}catch(e){item.downloadError=e.message;}}
    item.status=item.asset?'Real original downloaded and decoded; documented source identity':'Needs manual identity approval or a working original';
   }catch(e){item.status='FAILED';item.error=e.message;}report.tests.push(item);
  }
  if(selected.length){
   const duration=selected.length*2,voiceFile=path.join(folder,'silence.wav');await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','anullsrc=r=8000:cl=mono','-t',String(duration),voiceFile]);const voice=await backend.importMedia(voiceFile,{license:'Diagnostic silence'});
   let project={id:'live-google-images',name:'Live Google originals verification',voiceId:voice.id,duration,format:'vertical',captionColor:'#fff',musicVolume:0,media:[voice],scenes:selected.map(({query},i)=>({id:'scene-'+i,start:i*2,end:(i+1)*2,text:query,words:[],layers:[{id:'background-'+i,type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:i*2,end:(i+1)*2,color:'#173149'}]}))};
   for(const [i,{asset,item}] of selected.entries()){project=await backend.webImages.apply(project,asset,{sceneId:'scene-'+i},'add');item.insertedIntoScene='scene-'+i;}
   fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(project,null,2));
   if(selected.length>=3){const output=path.join(folder,'live-google-images.mp4');await backend.render(project,output);report.output=output;report.frames=[];for(const [i,{query}] of selected.entries()){const file=path.join(folder,'frame-'+i+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(i*2+.8),'-i',output,'-frames:v','1',file]);report.frames.push({query,file});}report.frameInspection='Frames extracted. Human visual identity inspection remains required.';}
  }
  fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log(key?'Live Google Images report saved; inspect each result before claiming identity verification.':'Live Google Images tests NOT RUN: no configured SerpApi key. Seven exact queries recorded.');
 }finally{backend.close();app.quit();}
}).catch(e=>{console.error('Google Images verification failed: '+e.message);app.exit(1);});
