import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {PNG} from 'pngjs';import {createBackend,root,run} from '../electron/backend.mjs';
const dir=path.join(root,'workspace/reference-short-check');fs.mkdirSync(dir,{recursive:true});
const backend=await createBackend();
try{
 const existing=JSON.parse(fs.readFileSync(path.join(root,'workspace/video-remake-check/source.gaming.json')));
 const voice=existing.media.find(m=>m.id===existing.voiceId);
 const source={...existing,id:'reference-short-check',name:'Pokemon artwork Short test',videoMode:'youtube-standard',format:'horizontal',media:[voice],musicId:undefined,soundEffects:[],autoPokemonCries:false,autoSoundEffects:false,localAnimatorEnabled:false,editingInstructions:'',revisionHistory:[],revisionCursor:0,scenes:[{id:'pair',start:0,end:4,title:'Wartortle and Blastoise',kind:'comparison',text:'Wartortle looks better than Blastoise.',words:[{text:'Wartortle',start:0,end:.6},{text:'looks',start:.6,end:1},{text:'better',start:1,end:1.4},{text:'than',start:1.4,end:1.8},{text:'Blastoise.',start:1.8,end:2.5}]},{id:'detail',start:4,end:8,title:'Details',kind:'emphasis',text:'Its ears and tail are adorable.',words:[{text:'Its',start:4,end:4.4},{text:'ears',start:4.4,end:4.9},{text:'and',start:4.9,end:5.2},{text:'tail',start:5.2,end:5.7},{text:'are',start:5.7,end:6},{text:'adorable.',start:6,end:6.6}]}]};
 const next=await backend.remake(backend.hydrate(source),'',{useAI:false,shortStyle:'pokemon-artwork'},{},e=>console.log(e.stage));
 assert.equal(next.format,'vertical');assert.equal(next.captionStyle.enabled,false);assert.equal(next.shortStyle,'pokemon-artwork');
 assert.ok(next.scenes.flatMap(s=>s.layers).filter(l=>l.role==='subject').every(l=>next.media.find(m=>m.id===l.mediaId).pokemon.sourceKey==='other.official-artwork.front_default'));
 assert.ok(next.scenes.every(s=>!s.layers.some(l=>l.type==='text'||l.svg?.includes('KEY POINT'))));
 const pair=next.shortStyleReport.shots.find(s=>s.start===1.8);assert.equal(pair.subjects.length,2);assert.equal(next.shortStyleReport.shots.find(s=>s.start===4).subjects.length,2);
 assert.deepEqual(next.scenes.map(s=>s.words),source.scenes.map(s=>s.words));assert.deepEqual(JSON.parse(JSON.stringify(backend.undoRedo(next,'undo').scenes)),source.scenes);
 const repeated=await backend.remake(next,'Show captions',{useAI:false});assert.equal(repeated.shortStyle,'pokemon-artwork');assert.ok(repeated.scenes.every(s=>s.captionStyle.enabled===true));assert.equal(repeated.editingInstructions.split('REFERENCE SHORT STYLE:').length,2);assert.equal(backend.undoRedo(repeated,'undo').captionStyle.enabled,false);
 fs.writeFileSync(path.join(dir,'source.gaming.json'),JSON.stringify(source,null,2));fs.writeFileSync(path.join(dir,'project.gaming.json'),JSON.stringify(next,null,2));
 const result=await backend.render(next,path.join(dir,'reference-style.mp4'));
 const images=[];for(const t of [1,3,5]){const file=path.join(dir,'frame-'+t+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(t),'-i',result.output,'-frames:v','1',file]);images.push(PNG.sync.read(fs.readFileSync(file)));}
 assert.equal(images[0].width,1080);assert.equal(images[0].height,1920);
 let changed=0;for(let i=0;i<images[0].data.length;i+=4)if(Math.abs(images[0].data[i]-images[1].data[i])+Math.abs(images[0].data[i+1]-images[1].data[i+1])+Math.abs(images[0].data[i+2]-images[1].data[i+2])>60)changed++;
 assert.ok(changed>100000,'The comparison reveal must materially change the rendered frame');
 fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({output:result.output,changedPixels:changed,officialArtwork:true,continuousComparison:true,undo:true,warnings:next.shortStyleReport.warnings},null,2));
 console.log('PASS actual reference-style remake, official artwork, word-timed comparison, held detail, vertical MP4 and Undo',changed);
}finally{backend.close();}
