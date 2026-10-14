import fs from 'node:fs';
import path from 'node:path';
const types={'.svg':'image/svg+xml','.jpeg':'image/jpeg','.jpg':'image/jpeg','.gif':'image/gif','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg','.flac':'audio/flac'};
export function serveMedia(req,res,file) {
 let stat;try{stat=fs.statSync(file);if(!stat.isFile())throw Error('Not a file');}catch{res.writeHead(404);res.end();return;}
 const size=stat.size;let start=0,end=size-1;
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
 if(req.headers.range){
  const match=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
  if(match&&(match[1]||match[2])) {
   if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else start=Math.max(0,size-Number(match[2]));
   if(!size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
   res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
  }
 }
 res.setHeader('Content-Length',Math.max(0,end-start+1));
 if(req.method==='HEAD'||!size){res.end();return;}
 const stream=fs.createReadStream(file,{start,end});
 stream.on('error',()=>{if(!res.headersSent){res.removeHeader('Content-Length');res.removeHeader('Content-Range');res.writeHead(404);res.end();}else res.destroy();});
 res.on('close',()=>stream.destroy());stream.pipe(res);
}
