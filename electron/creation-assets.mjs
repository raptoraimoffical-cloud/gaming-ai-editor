export function creationMedia(all, voice, options) {
 if (!Array.isArray(options.selectedMediaIds)) return all;
 if(options.backgroundMode==='upload'&&!all.some(m=>m.id===options.backgroundMediaId&&['image','video'].includes(m.kind)))throw Error('Choose an image or video background');
 const ids = new Set([voice.id, ...options.selectedMediaIds, options.backgroundMode==='upload'?options.backgroundMediaId:undefined].filter(Boolean));
 for (const id of ids) if (!all.some(m => m.id === id)) throw Error('A selected file is missing; select it again');
 return all.filter(m => ids.has(m.id));
}

export function applyCreationAssets(project) {
 const setup = project.creationAssets;
 if (!setup) return project;
 const images = setup.imageIds.map(id => project.media.find(m => m.id === id)).filter(Boolean);
 const background = project.media.find(m => m.id === setup.backgroundMediaId);
 const chosen = project.media.filter(m=>(setup.fileIds||[]).includes(m.id));
 const music = chosen.find(m=>m.kind==='audio'&&m.id!==project.voiceId&&m.assetRole==='music'&&m.license);
 return {...project, ...(music?{musicId:music.id}:{}), scenes: project.scenes.map((scene, index) => {
  let layers = [...(scene.layers || [])];
  if (background) {
   layers = layers.filter(l => l.role !== 'background');
   layers.unshift({id:scene.id+'-uploaded-background', role:'background', manual:true, type:background.kind==='video'?'video':'image', mediaId:background.id, x:0,y:0,width:1,height:1,z:0,start:scene.start,end:scene.end,fit:'cover',enter:'none'});
  }
  layers=layers.filter(l=>!l.id.startsWith(scene.id+'-uploaded-subject')||l.instructionLocked);
  const slots=project.shortStyle?0:images.length>1?Math.ceil((scene.end-scene.start)/2):1;
  for(let slot=0;slot<slots;slot++){
   const image=images[(index+slot)%images.length];if(!image||layers.some(l=>l.mediaId===image.id&&l.role!=='background'&&l.instructionLocked))continue;
   if(slot===0)layers=layers.filter(l=>l.role!=='subject'||l.instructionLocked);
   const start=scene.start+(images.length>1?slot*2:0),end=images.length>1?Math.min(scene.end,start+2):scene.end;
   layers.push({id:scene.id+'-uploaded-subject'+(slot?'-'+slot:''),role:'subject',manual:true,type:'image',mediaId:image.id,x:.12,y:.24,width:.76,height:.52,z:10,start,end,fit:'contain',animation:'fade',enter:'fade',exit:'none',entranceDuration:.2});
  }
  return {...scene, layers};
 })};
}
