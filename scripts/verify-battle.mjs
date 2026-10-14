import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace/battle-check');fs.mkdirSync(folder,{recursive:true});const b=await createBackend();
try{
 const voiceFile=path.join(folder,'voice.wav');await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-t','6',voiceFile]);const voice=await b.importMedia(voiceFile,{license:'Original diagnostic silence'}),pikachu=await b.pokemonAsset('pikachu'),charizard=await b.pokemonAsset('charizard');
 const layer=(id,m,x)=>({id,mediaId:m.id,type:'image',role:'subject',x,y:.43,width:.3,height:.28,z:2,start:0,end:6,animation:'none',enter:'none',exit:'none'});
 const p={id:'battle-check',name:'Cartoon battle check',format:'vertical',duration:6,voiceId:voice.id,media:[voice,pikachu,charizard],captionStyle:{enabled:false},captionColor:'#8affcb',musicVolume:0,scenes:[{id:'s',start:0,end:6,text:'Pikachu and Charizard fight.',words:[],layers:[{id:'bg',type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:0,end:6,color:'#15273e'},layer('pikachu',pikachu,.08),layer('charizard',charizard,.62)]}]};
 console.log('Requesting real trained battle choreography');const next=await b.revise(p,'Make Pikachu and Charizard fight each other in a cartoon dust cloud.',{}, {sceneId:'s',useAI:true});assert.equal(next.battleReport.battles[0].move,'dust-brawl');assert.deepEqual(next.media,p.media);assert.deepEqual(JSON.parse(JSON.stringify(b.undoRedo(next,'undo').scenes)),p.scenes);
 let stage;const output=await b.render(next,path.join(folder,'battle.mp4'),p=>{if(p.stage!==stage){stage=p.stage;console.log(stage);}});const beat=next.battleReport.battles[0],times=[beat.at+beat.duration*.1,beat.at+beat.duration*.5];const frames=[];
 for(const [i,time] of times.entries()){const file=path.join(folder,'frame-'+i+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(time),'-i',output.output,'-frames:v','1',file]);frames.push(PNG.sync.read(fs.readFileSync(file)));}
 let changed=0;for(let i=0;i<frames[0].data.length;i+=4)if(Math.abs(frames[0].data[i]-frames[1].data[i])+Math.abs(frames[0].data[i+1]-frames[1].data[i+1])+Math.abs(frames[0].data[i+2]-frames[1].data[i+2])>50)changed++;assert.ok(changed>10000,'Fighters and dust cloud must visibly change rendered pixels');
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(next,null,2));fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({output,battle:next.battleReport,changedPixels:changed,undoVerified:true},null,2));console.log('PASS trained battle, actual animated dust cloud, unchanged media and Undo',changed);
}finally{b.close();}
