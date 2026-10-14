// A long held caption often means Whisper skipped speech, not a frozen player.
// These checks also cover saved projects created before bounded transcription.
export function speechTimingIssues(project){
 const words=(project.scenes||[]).flatMap(s=>(s.words||[]).map(w=>({...w,sceneId:s.id}))),issues=[];
 for(const w of words){
  if(!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.end<w.start)issues.push({code:'invalid-speech-timing',sceneId:w.sceneId,start:w.start,message:'Invalid caption timing. Use Repair speech & timing in AI Changes.'});
  else if(w.end-w.start>2.5)issues.push({code:'stretched-caption',sceneId:w.sceneId,start:w.start,message:'The word "'+w.text+'" spans '+(w.end-w.start).toFixed(1)+' seconds. Use Repair speech & timing to recover the missing narration and visuals.'});
 }
 const collapsed=words.filter(w=>w.end-w.start<.015);
 if(collapsed.some(w=>collapsed.filter(o=>Math.abs(o.start-w.start)<.3).length>=3))issues.push({code:'collapsed-caption',message:'Several spoken words share a collapsed timestamp. Use Repair speech & timing.'});
 // Gaps alone can be intentional silence. Report for review, without claiming
 // speech is missing; the repair path checks the actual audio with VAD.
 for(let i=1;i<words.length;i++)if(words[i].start-words[i-1].end>8)issues.push({code:'caption-gap',sceneId:words[i-1].sceneId,start:words[i-1].end,review:true,message:'No recognized words for '+(words[i].start-words[i-1].end).toFixed(1)+' seconds. If narration continues there, use Repair speech & timing.'});
 return issues;
}

export function captionWordAt(words,time){
 let active=-1,recent=-1;
 for(let i=0;i<words.length;i++){
  const w=words[i],end=Math.min(w.end,w.start+2.5);
  if(time>=w.start&&time<end)active=i;
  if(time>=w.start&&time<=end+.3)recent=i;
 }
 return active>=0?active:recent;
}

export function replaceSpeech(project,transcribed,segments,alignment,plan){
 const next={...structuredClone(project),originalTranscript:transcribed.segments,transcriptionInfo:transcribed.transcription,scriptAlignment:alignment,
  scenes:plan(segments,project.media,project.duration)};
 // Keep caption design when new words change scene boundaries.
 for(const scene of next.scenes){
  const previous=project.scenes.find(s=>scene.start>=s.start&&scene.start<s.end)||project.scenes.at(-1);
  for(const key of Object.keys(previous||{}).filter(k=>k.startsWith('caption')))scene[key]=structuredClone(previous[key]);
  // Carry intentional manual layers by absolute time, clipping to new scenes.
  const all=project.scenes.flatMap(s=>s.layers||[]),manual=all.filter(l=>l.manual&&!l.autoItem);
  const ids=new Map(manual.map(l=>[l.id,l.id+'-speech-'+scene.id]));
  scene.speechRepairLayers=manual.filter(l=>l.start<scene.end&&l.end>scene.start).map(l=>({...structuredClone(l),id:ids.get(l.id),parentId:l.parentId?ids.get(l.parentId):undefined,
   ...(l.attachment?{attachment:{...l.attachment,targetId:ids.get(l.attachment.targetId)||l.attachment.targetId},speechRepairTarget:all.find(a=>a.id===l.attachment.targetId)?.mediaId}:{}),animationStart:l.animationStart??l.start,exit:l.end>scene.end?'none':l.exit,start:Math.max(l.start,scene.start),end:Math.min(l.end,scene.end)}));
 }
 for(const key of ['pokemonMentions','pokemonWarnings','pokemonRecognitionReport','shortMechanics','naturePlan','natureRecognitionReport','reactionGifPlan','animationPlan','shotPlan','attentionPlan','editorialReport','processingReport'])delete next[key];
 return next;
}

export function restoreSpeechLayers(project){
 for(const scene of project.scenes){
  if(scene.speechRepairLayers?.length){
   for(const l of scene.speechRepairLayers){
    if(l.attachment&&!scene.speechRepairLayers.some(a=>a.id===l.attachment.targetId)){
     const target=scene.layers?.find(a=>a.mediaId===l.speechRepairTarget&&!a.attachment&&a.start<=l.start&&a.end>l.start);
     if(target){l.attachment.targetId=target.id;l.end=Math.min(l.end,target.end);}else delete l.attachment;
    }
    delete l.speechRepairTarget;
   }
   scene.layers=[...(scene.layers||[]),...scene.speechRepairLayers];
  }
  delete scene.speechRepairLayers;
 }
 return project;
}
