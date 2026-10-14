import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {createBackend,root} from '../electron/backend.mjs';
import {cachedRenderBundle} from '../electron/render-bundle-cache.mjs';import {renderStill,selectComposition} from '@remotion/renderer';
import {applyPerformances} from '../electron/actor-performances.mjs';
import {applyReferenceProps} from '../electron/reference-props.mjs';import {bundledNarrationArt} from '../electron/narration-props.mjs';
const folder=path.join(root,'workspace/quick-patch-check');fs.mkdirSync(folder,{recursive:true});const b=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')});
try{
 const source=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8'))),before=structuredClone(source);
 const start=3,end=4,layer=source.scenes[0].layers.find(l=>l.role==='subject');
 const begin=performance.now(),next=await b.remake(source,'Make the character smaller',{scope:'patch',sceneId:source.scenes[0].id,layerId:layer.id,timeRange:{start,end},useAI:false,preserveCaptions:true},{},e=>console.log(e.stage));
 const seconds=(performance.now()-begin)/1000;assert.deepEqual(source,before);assert.deepEqual(next.scenes.slice(1),before.scenes.slice(1));assert.deepEqual(next.captionStyle,before.captionStyle);assert.deepEqual(next.scenes[0].words,before.scenes[0].words);
 assert.ok(next.scenes[0].layers.some(l=>l.id.includes('-patch-')));assert.equal(JSON.stringify(b.undoRedo(next,'undo').scenes),JSON.stringify(before.scenes));assert.equal(JSON.stringify(b.undoRedo(b.undoRedo(next,'undo'),'redo').scenes),JSON.stringify(next.scenes));
 fs.writeFileSync(path.join(folder,'patch.gaming.json'),JSON.stringify(next,null,2));
 const creative=await b.remake(source,'Match the gold reference style with more creative character reactions.',{scope:'patch',timeRange:{start:4.6,end:8.7},useAI:false,preserveCaptions:true},{},e=>console.log(e.stage));
 assert.deepEqual(creative.scenes[0],source.scenes[0]);assert.deepEqual(creative.scenes[1].words,source.scenes[1].words);fs.writeFileSync(path.join(folder,'creative-patch.gaming.json'),JSON.stringify(creative,null,2));
 const serveUrl=await cachedRenderBundle(root),composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:source}});
 const pixels=file=>sharp(file).raw().toBuffer();
 for(const [name,time] of [['before-boundary',2.9],['inside',3.5],['after-boundary',4.1]]){
  for(const [label,project] of [['old',source],['new',next]])await renderStill({serveUrl,composition:{...composition,props:{...composition.props,project}},inputProps:{project},frame:Math.round(time*composition.fps),output:path.join(folder,label+'-'+name+'.png')});
  const identical=(await pixels(path.join(folder,'old-'+name+'.png'))).equals(await pixels(path.join(folder,'new-'+name+'.png')));assert.equal(identical,name!=='inside');
 }
 // Demonstrate narrated setup -> doubt -> payoff with real cached front artwork.
 const comicProject=structuredClone(source);comicProject.duration=10;comicProject.gameSelection='pokemon';comicProject.shortStyle='pokemon-dense';comicProject.soundEffects=[];comicProject.musicId=undefined;
 const text='Mega Sceptile looks ridiculous but it worked. A diabolical secret weapon.';
 comicProject.scenes=[{id:'comic',start:0,end:10,text,title:'Setup and payoff',words:text.split(' ').map((text,i)=>({text,start:i*.65,end:i*.65+.5})),layers:[{id:'background',type:'shape',role:'background',color:'#183642',x:0,y:0,width:1,height:1,z:0,start:0,end:10,animation:'none'},{...layer,id:'lead',start:0,end:10,keyframes:undefined,animation:'none'}]}];comicProject.pokemonMentions=[{name:'sceptile-mega',mediaId:layer.mediaId,status:'ready',start:0,end:1.1}];
 const acted=applyPerformances(comicProject);assert.ok(acted.performanceReport.events.length>=2);fs.writeFileSync(path.join(folder,'performances.gaming.json'),JSON.stringify(acted,null,2));
 const pc=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:acted}});
 for(const [name,t] of [['doubt',2.1],['payoff',4.75],['swagger',6.15]])await renderStill({serveUrl,composition:pc,inputProps:{project:acted},frame:Math.round(t*pc.fps),output:path.join(folder,name+'.png')});
 const phone=structuredClone(comicProject);phone.media.push(...bundledNarrationArt().filter(m=>!phone.media.some(a=>a.id===m.id)));const logo=phone.media.find(m=>m.assetRole==='logo');assert.ok(logo);
 phone.scenes=[{...phone.scenes[0],text:'Pokemon Champions is on mobile devices.',words:['Pokemon','Champions','is','on','mobile','devices.'].map((text,i)=>({text,start:i*.4,end:i*.4+.3})),layers:[phone.scenes[0].layers[0],{...layer,id:'brand',mediaId:logo.id,role:'game-logo',start:0,end:10,x:.24,y:.2,width:.52,height:.25,keyframes:undefined,animation:'none'}]}];
 const device=b.hydrate(applyReferenceProps(phone));assert.ok(device.scenes[0].layers.some(l=>l.mediaId==='narration-art-phone-v2'));const dc=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:device}});await renderStill({serveUrl,composition:dc,inputProps:{project:device},frame:Math.round(2.1*dc.fps),output:path.join(folder,'phone-hook.png')});
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({directPatchSeconds:seconds,creativePatchSeconds:creative.quickPatchReport.seconds,outsidePixelsIdentical:true,insidePixelsChanged:true,captionsAndNarrationPreserved:true,undoRedo:true,performedBeats:acted.performanceReport.events},null,2));console.log('PASS direct patch '+seconds.toFixed(3)+'s; outside frames identical; creative range remake and actual character performances rendered.');
}finally{b.close();}
