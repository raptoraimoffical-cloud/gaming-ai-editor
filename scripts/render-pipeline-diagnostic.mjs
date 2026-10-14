import fs from 'node:fs';import path from 'node:path';import {createBackend,root} from '../electron/backend.mjs';
const folder=path.join(root,'workspace/pipeline-audit'),b=await createBackend();
try{
 const source=JSON.parse(fs.readFileSync(path.join(folder,'control.gaming.json'),'utf8'));
 const svg=path.join(folder,'movement-character.svg');fs.writeFileSync(svg,'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><path d="M20 70H140V190H20Z" fill="#ff3030"/><path d="M30 10H130V90H30Z" fill="#ff3030"/><path d="M40 40H60V60H40ZM100 40H120V60H100Z" fill="white"/><path d="M20 180H60V240H20ZM100 180H140V240H100Z" fill="#ff3030"/></svg>');
 const art=await b.importMedia(svg,{license:'Original diagnostic fixture'}),duration=source.duration;
 const layer=(id,type,props={})=>({id,type,x:0,y:0,width:1,height:1,z:1,start:0,end:3,animation:'none',enter:'none',exit:'none',...props});
 const scene={id:'motion',start:0,end:3,text:'Renderer diagnostic',words:[],layers:[
 layer('moving-background','svg',{role:'background',z:0,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#101030"/><path d="M0 0V1920M160 0V1920M320 0V1920M480 0V1920M640 0V1920M800 0V1920M960 0V1920" stroke="#2255ff" stroke-width="20"/></svg>',animation:'background-motion',animationAmount:.1}),
 layer('moving-character','image',{mediaId:art.id,role:'subject',x:.12,y:.13,width:.15,height:.2,keyframes:[{time:0,x:.12},{time:3,x:.45}]}),
 layer('independent-layer','shape',{color:'#ff00ff',x:.74,y:.12,width:.1,height:.08,keyframes:[{time:0,y:.12},{time:3,y:.35}]}),
 layer('comparison-a','bar',{color:'#ffff00',value:80,x:.1,y:.55,width:.7,height:.04,start:.3}),
 layer('comparison-b','bar',{color:'#00ff00',value:55,x:.1,y:.64,width:.7,height:.04,start:.3}),
 layer('statistic','ring',{color:'#00ffff',value:75,label:'Stat',x:.32,y:.76,width:.3,height:.17,start:.3})]};
 const next={id:'transition',start:3,end:duration,text:'Crossfade',transition:'crossfade',words:[],layers:[layer('next-background','shape',{role:'background',color:'#eeeeee',z:0,start:3,end:duration})]};
 const project=b.hydrate({...source,id:'renderer-diagnostic',name:'Actual renderer diagnostic',scenes:[scene,next],media:[...source.media,art],soundEffects:[],captionStyle:{enabled:false}});
 fs.writeFileSync(path.join(folder,'renderer-diagnostic.gaming.json'),JSON.stringify(project,null,2));
 await b.render(project,path.join(folder,'renderer-diagnostic.mp4'),()=>{});console.log('Rendered actual motion, background, independent layer, comparison, stat and crossfade MP4');
}finally{b.close();}
