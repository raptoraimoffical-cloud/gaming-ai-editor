import fs from 'node:fs';import path from 'node:path';
import {createBackend,root,run} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','smoke');const b=await createBackend({workspace:path.join(folder,'library')});
try{
 const video=path.join(folder,'test-pattern.mp4');const music=path.join(folder,'test-music.wav');
 await run('ffmpeg',['-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-t','1','-c:v','libx264','-pix_fmt','yuv420p',video]);
 await run('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=220:duration=3',music]);
 const v=await b.importMedia(video,{tags:'Valorant precision',license:'Locally generated test pattern, not gameplay'});
 const m=await b.importMedia(music,{license:'Locally generated test tone'});
 const saved=JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8'));
 const p=b.hydrate({...saved,format:'horizontal',duration:2,media:[...saved.media,v,m],musicId:m.id,scenes:[{...saved.scenes[0],start:0,end:2,mediaId:v.id}]});
 console.log(await b.render(p,path.join(folder,'horizontal-media.mp4'),x=>{if(x.percent>85||x.percent<6)console.log(x);}));
}finally{b.close();}
