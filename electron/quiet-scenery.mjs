import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
// Cache only a deterministic source-image derivative, never an authored scene.
// Bake the deliberate background crop/blur once instead of rasterizing a large
// blurred image for every 60 FPS frame. Keep overscan for the slow camera drift.
export async function quietScenery(asset,folder){
 if(asset.quietScenery&&fs.existsSync(asset.path))return asset;
 const stat=fs.statSync(asset.path),key=crypto.createHash('sha256').update(JSON.stringify([asset.path,stat.size,stat.mtimeMs,'arena-top-v1'])).digest('hex'),file=path.join(folder,key+'.png');fs.mkdirSync(folder,{recursive:true});
 if(!fs.existsSync(file)){const info=await sharp(asset.path).metadata(),height=Math.max(1,Math.round(info.height*.44)),width=Math.min(info.width,Math.round(height*1200/2160)),left=Math.max(0,Math.round((info.width-width)/2)),top=Math.min(info.height-height,Math.round(info.height*.02));await sharp(asset.path).extract({left,top,width,height}).resize(1200,2160,{fit:'cover'}).blur(24).png().toFile(file);}
 return {...asset,id:'quiet-arena-'+key.slice(0,24),path:file,width:1200,height:2160,assetRole:'background',quietScenery:true,attribution:{...asset.attribution,changes:'Original arena image cropped and blurred once for quiet scenery; reused as source material, not as an edit'}};
}
