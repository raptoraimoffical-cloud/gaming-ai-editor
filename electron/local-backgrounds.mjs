import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PNG} from 'pngjs';
import {ENTITIES} from './reactions.mjs';
import {refreshStoryboard} from './storyboard.mjs';

export function validateBackgroundSettings(settings){
 if(!settings?.enabled)return;
 const u=new URL(settings.url||'http://127.0.0.1:7860');
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Use an image-generation endpoint without embedded credentials');
 if(!settings.license?.trim())throw Error('Declare permission to reuse the installed image model outputs');
 if(!settings.prompt?.trim()||settings.prompt.length>2000)throw Error('Write a decorative background concept of at most 2000 characters');
}
export async function generateDecorativeBackground(project,state,{folder,register,fetchImpl=fetch,progress=()=>{},force=false}){
 const s=state.settings.imageGeneration;if(!s?.enabled)return project;validateBackgroundSettings(s);
 const exactNames=[...ENTITIES.filter(e=>e.type==='character').flatMap(e=>e.aliases),...project.media.filter(m=>m.pokemon).flatMap(m=>[m.pokemon.name,m.pokemon.displayName]),'pokemon','pokémon'];
 if(exactNames.some(name=>new RegExp('\\b'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(s.prompt)))throw Error('Decorative generation cannot supply exact characters. Use the asset library for characters and forms.');
 const endpoint=new URL(s.url||'http://127.0.0.1:7860'),signal=AbortSignal.any([state.signal,AbortSignal.timeout(180000)]);
 progress({stage:'Checking configured decorative image model'});
 const settingsResponse=await fetchImpl(new URL('/sdapi/v1/options',endpoint),{signal});if(!settingsResponse.ok)throw Error('Image backend is unavailable (HTTP '+settingsResponse.status+')');
 const installed=await settingsResponse.json(),checkpoint=installed.sd_model_checkpoint||'server default';
 const prompt='Original decorative background, no recognizable characters, no logos, no text. '+s.prompt;
 const key=crypto.createHash('sha256').update(JSON.stringify({endpoint:endpoint.href,checkpoint,prompt,format:project.format,license:s.license})).digest('hex');
 const cache=path.join(folder,'generated-backgrounds');fs.mkdirSync(cache,{recursive:true});const image=path.join(cache,key+'.png');
 let reused=fs.existsSync(image);
 if(!reused){
  progress({stage:'Generating one decorative background with the configured local model'});
  const response=await fetchImpl(new URL('/sdapi/v1/txt2img',endpoint),{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({prompt,negative_prompt:'characters, official character artwork, gameplay screenshot, logos, trademarks, words, letters, watermark',width:project.format==='horizontal'?768:512,height:project.format==='horizontal'?512:768,steps:20,batch_size:1,n_iter:1,seed:1337,send_images:true,save_images:false})});
  if(!response.ok)throw Error('Background generation failed (HTTP '+response.status+')');const data=await response.json(),base64=data.images?.[0]?.replace(/^data:image\/png;base64,/, '');
  if(typeof base64!=='string'||base64.length>40000000)throw Error('Image backend returned no supported PNG');const buffer=Buffer.from(base64,'base64');
  if(!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Image backend did not return PNG data');
  const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);if(!width||!height||width*height>16777216)throw Error('Generated image dimensions are unsafe or empty');PNG.sync.read(buffer);fs.writeFileSync(image,buffer);
 }
 if(state.signal.aborted)throw Error('Processing cancelled');
 const png=PNG.sync.read(fs.readFileSync(image));
 const media=register({id:'generated-bg-'+key.slice(0,20),name:'Generated decorative background',path:image,kind:'image',tags:'Original decorative background; not gameplay or character artwork',license:s.license,duration:0,width:png.width,height:png.height,transparent:false,identity:{franchise:'unknown',subject:'decorative-background',variant:'generated decorative image; not official media',source:'Configured local image model',confidence:1},attribution:{credit:'Generated locally using '+checkpoint,source:endpoint.href,licenseUrl:'',changes:'Resized and animated as a decorative background'},generation:{checkpoint,prompt,seed:1337,cached:reused}});
 const scenes=project.scenes.map(scene=>{
  // Retain real backgrounds, explicit forest concepts and manually chosen assets.
  const bg=scene.layers?.find(l=>l.role==='background');if(!bg||(!force&&(bg.mediaId||/minecraft|forest|woodland/i.test(scene.backgroundConcept||scene.backgroundTheme||''))))return scene;
  return {...scene,backgroundConcept:'Generated decorative background; not official game imagery',layers:scene.layers.map(l=>{if(l.id!==bg.id)return l;const next={...l,type:'image',mediaId:media.id,fit:'cover'};delete next.svg;return next;})};
 });
 return refreshStoryboard({...project,media:[...project.media.filter(m=>m.id!==media.id),media],scenes,backgroundGeneration:{checkpoint,cached:reused,mediaId:media.id,decorativeOnly:true}});
}
