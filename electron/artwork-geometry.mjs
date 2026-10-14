import fs from 'node:fs';
import sharp from 'sharp';
import crypto from 'node:crypto';

// Coordinates inspected on the exact published file, guarded by its content
// hash. A different pose/image must use its own anatomy, never these landmarks.
const calibrated={
 'dcfb9373f0007252d462779c72cc6cb661db1628a0bd1b72ff90b47e277c1151':{head:{x:.76,y:.18},neck:{x:.77,y:.365},feet:{x:.79,y:.813},groundWidth:.42},
 'b6d5b8ee9fb05dc6f53294b2cae660dec770b92762cdb19d16bcbd679e1ba43a':{head:{x:.465,y:.185},face:{x:.405,y:.220},neck:{x:.49,y:.31},hand:{x:.72,y:.53},feet:{x:.50,y:.82},groundWidth:.55},
 '26464ae195ee24cafda22ae74f99b141509053ab66f77b809b8d399b06549815':{head:{x:.46,y:.055},face:{x:.387,y:.104},neck:{x:.507,y:.226},hand:{x:.73,y:.529},feet:{x:.50,y:.93},groundWidth:.55}
};

const pending=new Map(),cache=new Map(),anchorAttempts=new Map();
// Work on a small alpha mask once per file revision, never on the render thread.
export async function measureArtwork(media){
 if(!['image','pokemon'].includes(media.kind)||media.spriteSheet||!media.path||/\.svg$/i.test(media.path))return media;
 let stat;try{stat=fs.statSync(media.path);}catch{return media;}
 const key=media.path+':'+stat.size+':'+stat.mtimeMs;
 if(media.attachmentAnchorSignature&&media.attachmentAnchorSignature!==key){media={...media};delete media.attachmentAnchors;delete media.attachmentAnchorSignature;}
 if(media.artworkGeometry?.signature===key&&media.artworkGeometry.version===6)return media;
 if(cache.has(key))return {...media,...cache.get(key)};
 if(!pending.has(key))pending.set(key,(async()=>{
  const {data,info}=await sharp(media.path,{animated:false}).resize(192,192,{fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  const solid=(x,y)=>data[(y*info.width+x)*info.channels+info.channels-1]>=48;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(solid(x,y)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)return {};
  const bounds={x:left/info.width,y:top/info.height,width:(right-left+1)/info.width,height:(bottom-top+1)/info.height};
  const snap=(x,y)=>{const tx=left+x*(right-left),ty=top+y*(bottom-top);let best,score=Infinity;
   for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++)if(solid(px,py)){const d=(px-tx)**2+(py-ty)**2;if(d<score){score=d;best={x:(px+.5-left)/(right-left+1),y:(py+.5-top)/(bottom-top+1)};}}
   return best;
  };
  // Silhouette landmarks are fallbacks; authored/anatomical anchors take priority.
  const profile=/\/other\/official-artwork\//.test(media.pokemon?.sourceUrl||media.identity?.source||'')?calibrated[crypto.createHash('sha256').update(fs.readFileSync(media.path)).digest('hex')]:undefined;
  const anchors={head:snap(.5,.23),face:snap(.5,.32),neck:snap(.5,.42),hand:snap(.66,.60),feet:snap(.5,.98)},verifiedAnchors={};
  const preserveFramed=media.artworkFraming?.contentHash===crypto.createHash('sha256').update(fs.readFileSync(media.path)).digest('hex'),prior=media.artworkGeometry;
  for(const part of Object.keys(anchors))if(profile?.[part]){anchors[part]={x:(profile[part].x-bounds.x)/bounds.width,y:(profile[part].y-bounds.y)/bounds.height};verifiedAnchors[part]=true;}
  else if(preserveFramed&&prior?.verifiedAnchors?.[part]&&prior.anchors?.[part]){const a=prior.anchors[part],b=prior.bounds;anchors[part]={x:(b.x+a.x*b.width-bounds.x)/bounds.width,y:(b.y+a.y*b.height-bounds.y)/bounds.height};verifiedAnchors[part]=true;}
  return {artworkGeometry:{version:6,signature:key,bounds,anchors,verifiedAnchors,...(profile?{groundWidth:profile.groundWidth}:{})}};
 })());
 try{const geometry=await pending.get(key);cache.set(key,geometry);if(cache.size>512)cache.delete(cache.keys().next().value);return {...media,...geometry};}catch{return media;}finally{pending.delete(key);}
}
export async function measureProjectArtwork(project,register=m=>m){
 const media=[];for(const m of project.media){const measured=await measureArtwork(m);media.push(measured===m?m:await register(measured));}
 return {...project,media};
}
export async function refineAttachmentAnchors(project,{state,locate,library=[],register=m=>m,progress=()=>{}}={}){
 if(!locate||!state?.models?.vision?.capabilities?.includes('vision'))return syncAttachmentAnchors(project);
 const next={...project,media:[...project.media]},requested=new Map();
 for(const s of next.scenes)for(const l of s.layers||[]){
  if(!l.attachment?.autoAnchor||l.instructionLocked||l.attachment.anchor==='ground')continue;
  const actor=s.layers.find(a=>a.id===l.attachment.targetId);if(actor?.mediaId)requested.set(actor.mediaId+':'+l.attachment.anchor,{mediaId:actor.mediaId,anchor:l.attachment.anchor});
 }
 for(const {mediaId,anchor} of requested.values()){
  const i=next.media.findIndex(m=>m.id===mediaId),m=next.media[i],b=m?.artworkGeometry?.bounds;if(!b)continue;
  const prior=library.find(c=>c.id===m.id&&c.artworkGeometry?.signature===m.artworkGeometry.signature&&c.attachmentAnchors?.[anchor]);
  if(m.attachmentAnchors?.[anchor]||m.artworkGeometry.verifiedAnchors?.[anchor])continue;
  if(prior){next.media[i]={...m,attachmentAnchorSignature:prior.attachmentAnchorSignature,attachmentAnchors:{...m.attachmentAnchors,[anchor]:prior.attachmentAnchors[anchor]}};continue;}
  const attemptKey=[m.artworkGeometry.signature,anchor,state.settings?.url,state.models.vision.name,state.models.vision.digest,state.models.reasoning?.name,state.models.reasoning?.digest].join(':');
  let point=anchorAttempts.get(attemptKey);
  if(!point){progress({stage:'Locating '+anchor+' on '+m.name});point=await locate(state,m,anchor);anchorAttempts.set(attemptKey,point||{available:false});if(anchorAttempts.size>512)anchorAttempts.delete(anchorAttempts.keys().next().value);}
  if(!point?.available||point.confidence<.8||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<b.x||point.y<b.y||point.x>b.x+b.width||point.y>b.y+b.height)continue;
  // Reject a vision coordinate on empty padding rather than moving an item off
  // the character. Keep the silhouette fallback when the anatomy is uncertain.
  try{const x=Math.min(m.width-1,Math.floor(point.x*m.width)),y=Math.min(m.height-1,Math.floor(point.y*m.height)),pixel=await sharp(m.path).extract({left:x,top:y,width:1,height:1}).ensureAlpha().raw().toBuffer();if(pixel.at(-1)<48)continue;}catch{continue;}
  next.media[i]=await register({...m,attachmentAnchorSignature:m.artworkGeometry.signature,attachmentAnchors:{...m.attachmentAnchors,[anchor]:{x:(point.x-b.x)/b.width,y:(point.y-b.y)/b.height}}});
 }
 return syncAttachmentAnchors(next);
}
export function syncAttachmentAnchors(project){
 return {...project,scenes:project.scenes.map(s=>({...s,layers:s.layers?.map(l=>{
  if(!l.attachment?.autoAnchor)return l;
  const parent=s.layers.find(p=>p.id===l.attachment.targetId),m=project.media.find(m=>m.id===parent?.mediaId),point=m?.attachmentAnchors?.[l.attachment.anchor]||m?.artworkGeometry?.anchors?.[l.attachment.anchor];
  return point?{...l,attachment:{...l.attachment,x:point.x,y:point.y}}:l;
 })}))};
}
