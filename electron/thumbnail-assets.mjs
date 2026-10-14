import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const trainers=['red-gen3','acetrainer-gen3','hilbert','lucas','ethan','brendan'];
export function createThumbnailAssetService(folder,{fetchImpl=fetch}={}){
 fs.mkdirSync(folder,{recursive:true});
 return {async trainer(variant,{signal}={}){
  const index=crypto.createHash('sha256').update(variant).digest().readUInt32LE()%trainers.length,errors=[];
  for(const name of [...trainers.slice(index),...trainers.slice(0,index)])try{const url='https://play.pokemonshowdown.com/sprites/trainers/'+name+'.png',file=path.join(folder,name+'.png');if(!fs.existsSync(file)){const r=await fetchImpl(url,{signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(15000)])});if(!r.ok)throw Error('HTTP '+r.status);const data=Buffer.from(await r.arrayBuffer());await sharp(data).metadata();fs.writeFileSync(file,data);}const meta=await sharp(file).metadata();return {id:'trainer-source-'+name,name:'Original trainer sprite '+name,path:file,kind:'image',width:meta.width,height:meta.height,transparent:!!meta.hasAlpha,pixelArt:true,sourceKind:'trainer',identity:{franchise:'pokemon',subject:'trainer',source:url},attribution:{source:url,credit:'Original Pokemon game trainer sprite; hosted by Pokemon Showdown',changes:'Original source file'},license:'Pokemon game artwork; source attribution retained'};}catch(e){signal?.throwIfAborted();errors.push(e.message);}
  throw Error('Original trainer sprites unavailable: '+errors.at(-1));
 }};
}
export async function makeOriginalMysteryFigure(folder,variant){
 const file=path.join(folder,'mystery-'+variant+'.png');
 // An original anonymous illustration is usable offline. It never impersonates
 // a real person or claims to be an official character render.
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="900" viewBox="0 0 480 900"><path fill="#10151d" d="M137 95Q147 30 237 35Q325 29 339 95L357 116H119Z M153 117Q150 255 240 270Q331 248 326 117Z M180 267L145 282 105 320 41 487 74 510 153 373 145 564 174 592 147 792 125 853 214 853 236 615 258 853 356 853 327 799 306 590 337 557 325 359 390 497 436 473 373 313 307 271 281 267 241 301Z"/><path fill="#10151d" d="M153 290L113 294 103 426 143 438Z"/></svg>';
 await sharp(Buffer.from(svg)).png().toFile(file);return {id:'original-mystery-'+variant,name:'Original anonymous trainer illustration',kind:'image',path:file,width:480,height:900,transparent:true,sourceKind:'trainer',generatedForThumbnail:true,identity:{franchise:'illustration',subject:'anonymous-trainer',source:'Local thumbnail compositor'},attribution:{credit:'Original anonymous illustration made by the editor',changes:'Generated locally for this thumbnail'},license:'Original editor illustration'};
}
