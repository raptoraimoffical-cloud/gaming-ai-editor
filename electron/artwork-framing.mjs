import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
// Remove only transparent padding. Source pixels are never regenerated or
// upscaled; verified attachment landmarks are converted to the cropped frame.
export async function frameArtwork(project,folder,register=m=>m){
 const p=structuredClone(project),ids=new Set(p.scenes.flatMap(s=>(s.layers||[]).filter(l=>l.role==='subject'&&(!l.manual||l.blueprintVisual)).map(l=>l.mediaId))),mapped=new Map();fs.mkdirSync(folder,{recursive:true});
 for(const m of p.media.filter(m=>ids.has(m.id)&&m.transparent&&!m.artworkFraming&&!m.animationInfo?.animated&&!m.pokemon?.animated)){
  const b=m.artworkGeometry?.bounds;if(!b||b.width*b.height>.88||b.width*b.height<.12||!fs.existsSync(m.path))continue;
  const meta=await sharp(m.path).metadata();if(!meta.hasAlpha)continue;const rect={left:Math.max(0,Math.floor(b.x*meta.width)-3),top:Math.max(0,Math.floor(b.y*meta.height)-3)};rect.width=Math.min(meta.width-rect.left,Math.ceil(b.width*meta.width)+6);rect.height=Math.min(meta.height-rect.top,Math.ceil(b.height*meta.height)+6);
  const stat=fs.statSync(m.path),key=crypto.createHash('sha256').update(JSON.stringify([m.path,stat.size,stat.mtimeMs,rect])).digest('hex'),file=path.join(folder,key+'.png');if(!fs.existsSync(file))await sharp(m.path).extract(rect).png().toFile(file);
  const convert=anchors=>anchors&&Object.fromEntries(Object.entries(anchors).map(([k,a])=>[k,{x:((b.x+a.x*b.width)*meta.width-rect.left)/rect.width,y:((b.y+a.y*b.height)*meta.height-rect.top)/rect.height}]));
  const result=await register({...m,id:'framed-'+key.slice(0,24),path:file,width:rect.width,height:rect.height,artworkFraming:{sourceId:m.id,crop:rect,contentHash:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')},...(m.pokemon?{pokemon:{...m.pokemon,spriteWidth:rect.width,spriteHeight:rect.height}}:{}),attachmentAnchors:convert(m.attachmentAnchors),artworkGeometry:{...m.artworkGeometry,signature:key,bounds:{x:0,y:0,width:1,height:1},anchors:convert(m.artworkGeometry.anchors)},attribution:{...m.attribution,changes:'Original pixels cropped to remove transparent padding; no artwork generated'}});mapped.set(m.id,result);p.media.push(result);
 }
 for(const s of p.scenes)for(const l of s.layers||[])if(l.role==='subject'&&(!l.manual||l.blueprintVisual)&&mapped.has(l.mediaId))l.mediaId=mapped.get(l.mediaId).id;
 return p;
}
