import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import http from 'node:http';
import sharp from 'sharp';

export function isPublicAddress(address){
 const a=address.toLowerCase().replace(/^\[|\]$/g,'');
 if(a.includes(':')){if(a.startsWith('::ffff:'))return isPublicAddress(a.slice(7));return /^2[0-9a-f]{3}:/.test(a)&&!/^2001:(?:db8|0|10|20):/.test(a);}
 if(net.isIP(a)!==4)return false;
 const [x,y]=a.split('.').map(Number);return !(x===0||x===10||x===127||x>=224||x===169&&y===254||x===172&&y>=16&&y<=31||x===192&&(y===168||y===0)||x===100&&y>=64&&y<=127||x===198&&(y===18||y===19)||/^192\.0\.2\.|^198\.51\.100\.|^203\.0\.113\./.test(a));
}
export async function validatePublicUrl(value,{lookup=dns.lookup,signal}={}){
 let u;try{u=new URL(value);}catch{throw Error('Enter a direct public image URL.');}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))throw Error('Only public HTTP(S) image URLs are supported.');
 const host=u.hostname.replace(/^\[|\]$/g,'');if(/(?:^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host))throw Error('Private-network image URLs are blocked.');
 signal?.throwIfAborted();
 const records=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await new Promise((resolve,reject)=>{
  const abort=()=>reject(Error('Image DNS lookup cancelled or timed out.'));signal?.addEventListener('abort',abort,{once:true});
  Promise.resolve().then(()=>lookup(host,{all:true})).then(resolve,reject).finally(()=>signal?.removeEventListener('abort',abort));
 });
 if(!records.length||records.some(r=>!isPublicAddress(r.address)))throw Error('Private-network image URLs are blocked.');
 return {url:u,address:records[0].address,family:records[0].family};
}
// Pin the verified DNS address for the connection, including every redirect.
export async function downloadPublicImage(value,{signal,limit=30e6,lookup=dns.lookup,fetchImpl}={}){
 const timeout=AbortSignal.timeout(25000),abort=signal?AbortSignal.any([signal,timeout]):timeout;
 let next=value;
 for(let redirect=0;redirect<=5;redirect++){
  abort.throwIfAborted();const {url,address,family}=await validatePublicUrl(next,{lookup,signal:abort});abort.throwIfAborted();
  const response=fetchImpl?await fetchImpl(url.href,{redirect:'manual',signal:abort}):await new Promise((resolve,reject)=>{
   const req=(url.protocol==='https:'?https:http).get(url,{signal:abort,headers:{'User-Agent':'GamingAIEditor/0.1'},lookup:(_host,opts,cb)=>cb(null,opts?.all?[{address,family}]:address,family)},resolve);req.on('error',reject);
  });
  const status=response.status??response.statusCode,getHeader=name=>response.headers?.get?response.headers.get(name):response.headers[name];
  if([301,302,303,307,308].includes(status)){response.destroy?.();await response.body?.cancel?.();const location=getHeader('location');if(!location)throw Error('Image redirect has no destination.');next=new URL(location,url).href;continue;}
  if(status!==200){response.destroy?.();await response.body?.cancel?.();throw Object.assign(Error('Original image HTTP '+status),{status});}
  if(Number(getHeader('content-length'))>limit){response.destroy?.();await response.body?.cancel?.();throw Error('Image exceeds the 30 MB download limit.');}
  const chunks=[];let total=0;
  try{for await(const chunk of response.body||response){abort.throwIfAborted();total+=chunk.length;if(total>limit)throw Error('Image exceeds the 30 MB download limit.');chunks.push(Buffer.from(chunk));}}finally{response.destroy?.();}
  return {bytes:Buffer.concat(chunks),finalUrl:url.href};
 }
 throw Error('Too many image redirects.');
}
export async function inspectImageBytes(bytes){
 if(!bytes.length)throw Error('The image file is empty.');
 try{
  const image=sharp(bytes,{animated:true,limitInputPixels:40e6,failOn:'error'}),info=await image.metadata();
  if(!['png','jpeg','gif','webp'].includes(info.format))throw Error('Unsupported image format: use PNG, JPG, GIF or WebP.');
  const width=info.width,height=info.pageHeight||info.height,frames=info.pages||1;
  if(!width||!height||width<16||height<16||width*height*frames>40e6)throw Error('Image dimensions or frame count exceed the supported limits.');
  // stats forces a full decoder pass; a header alone is not validation.
  const stats=await image.stats(),transparent=!!info.hasAlpha&&stats.channels.at(-1).min<255;
  return {width,height,format:info.format,transparent,decoded:true,animationInfo:{animated:frames>1,frameCount:frames,cycleMs:(info.delay||[]).reduce((a,b)=>a+b,0)||0}};
 }catch(e){if(/Unsupported|dimensions/.test(e.message))throw e;throw Error('The original is corrupt or is not a supported image (PNG, JPG, GIF or WebP).');}
}
