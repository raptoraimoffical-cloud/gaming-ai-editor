import {applyEditorialPlan} from './editorial-planner.mjs';
import {composeReaction} from './reactive-visuals.mjs';
import {decorateTemplate,templateFor} from './templates.mjs';
export function directVisuals(project){
 return applyEditorialPlan({...project,scenes:project.scenes.map(scene=>{
  if(scene.reaction&&!scene.manualTemplate)return composeReaction(scene,project);
  const template=templateFor(scene);const layers=[];const add=(type,props)=>layers.push({id:`${scene.id}-layer-${layers.length}`,type,x:.07,y:.1,width:.86,height:.1,z:layers.length,start:scene.start,end:scene.end,enter:'slide',...props});
  const background=project.media.find(m=>m.id===scene.mediaId);
  if(background)add(background.kind==='video'?'video':'image',{mediaId:background.id,x:0,y:0,width:1,height:1,fit:'cover',opacity:.32,keyframes:[{time:scene.start,scale:1},{time:scene.end,scale:1.12}]});
  add('shape',{x:.04,y:.04,width:.92,height:.025,color:project.captionColor,opacity:.65});
  add('text',{text:scene.kind.toUpperCase(),y:.085,height:.025,color:project.captionColor});
  add('text',{text:scene.title,y:.13,height:.06});
  const placements=scene.pokemon||[];const count=placements.length;
  placements.forEach((p,i)=>{
   const m=project.media.find(m=>m.id===p.mediaId);const columns=count===1?1:count>2?3:2;const x=.055+(i%columns)*(.89/columns),y=.31+Math.floor(i/columns)*.25,w=.89/columns-.02;
   add('shape',{x,y,width:w,height:count>2?.235:.34,color:'#15263b',start:p.start,end:p.end});
   add('image',{mediaId:p.mediaId,x,y:y+.02,width:w,height:count>2?.16:.25,start:p.start,end:p.end,enter:count===2?(i?'right':'left'):'spring',float:true});
   add('text',{text:m?.pokemon?.displayName||m?.name,x:x+.01,y:y+(count>2?.185:.28),width:w-.02,height:.035,start:p.start,end:p.end});
   if(count===2){const attack=m?.pokemon?.stats.find(s=>s.name==='attack')?.value||0;add('text',{text:`BASE ATTACK  ${attack}`,x,y:.72,width:w,height:.023,start:p.start,end:p.end,color:project.captionColor});add('bar',{x,y:.76,width:w,height:.016,value:attack/180*100,start:p.start,end:p.end});}
  });
  if(count===2)add('text',{text:'VS',x:.465,y:.66,width:.09,height:.04,color:project.captionColor});
  const specialized=(scene.visualMediaIds?.length||0)>0&&['hardware-comparison','split-screen','gaming-ranking','top-five','image-collage'].includes(template);
  if(!count&&background&&!specialized){add(background.kind==='video'?'video':'image',{mediaId:background.id,x:.09,y:.32,width:.82,height:.43,fit:'contain',enter:'spring',keyframes:[{time:scene.start,scale:.95},{time:scene.end,scale:1.03}]});}
  if(!count&&!background&&!specialized&&template!=='timeline'){add('shape',{x:.07,y:.45,width:.86,height:.15,color:'#101e32',opacity:.85});add('text',{text:scene.text.split(' ').slice(0,12).join(' '),x:.1,y:.48,width:.8,height:.032,color:project.captionColor});}
  decorateTemplate(scene,project,add);
  if(background?.attribution)add('text',{text:background.attribution.credit,x:.07,y:.94,width:.86,height:.014,color:'#ccd5e0'});
  return {...scene,layers,template};
 })});
}
