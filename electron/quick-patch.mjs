import {validateProject} from './planner.mjs';
import {recordRevision,applyOperations} from './revisions.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {clipLayer} from './clip-layer.mjs';
import {compactLayers,mergeRanges} from './layer-visibility.mjs';
import {savedPatchRanges} from './saved-patches.mjs';
import {spliceCinematicStage,cinematicDepth} from './cinematic-scenes.mjs';
import crypto from 'node:crypto';
const clone=structuredClone;
const overlaps=(l,a,b)=>l.start<b&&l.end>a;
export function applyPatchOperations(project,command) {
 const next=applyOperations(project,command).project;
 for(const op of command.operations)for(const s of next.scenes.filter(s=>op.sceneIds.includes(s.id)))for(const l of s.layers||[]){
  if(op.layerIds?.length&&!op.layerIds.includes(l.id))continue;
  if(op.type==='animation'||op.type==='properties'&&op.preset){l.animationStart=l.start;l.animationEnd=l.end;l.animationDuration=l.end-l.start;}
  else if(op.type==='properties'&&op.exit!==undefined)l.animationEnd=l.end;
 }
 return {...next,patchAudioOnly:command.operations.every(o=>o.type==='sfx')};
}
export function patchRange(project,context={}){
 if(context.timeRange){const {start,end}=context.timeRange;if(![start,end].every(Number.isFinite)||start<0||end>project.duration||end-start<.1)throw Error('Select a patch of at least 0.1 seconds inside the video.');return {start,end};}
 const s=project.scenes.find(s=>s.id===context.sceneId);if(!s)throw Error('Select a scene or enter a patch time range.');return {start:s.start,end:s.end};
}
const scopedKeys=['animationPlan','attentionPlan','shotPlan','shortStyleReport','storyShotReport','actionMovieReport','expressionReport','engagementReport','moveEffectReport','referenceFinishReport','transitionSoundPlan','editorialReport','processingReport','lastEditAI','creativeActionReport','hookReport','cadenceReport','layeredActivityReport','mechanicLayoutReport','creativePropAssets','creativePropWarnings','movesetPlan','movesetWarnings','gamePresentationReport'];
export function patchSubset(project,range){
 const {start,end}=range,next=clone(project);for(const key of scopedKeys)delete next[key];next.revisionHistory=[];next.revisionCursor=0;
 const targets=project.scenes.filter(s=>overlaps(s,start,end));next.contextReaction=project.scenes[project.scenes.indexOf(targets[0])-1]?.reaction;
 next.scenes=targets.map(s=>{
  const a=Math.max(s.start,start),b=Math.min(s.end,end),part={...clone(s),start:a,end:b};
  part.words=part.words.filter(w=>overlaps(w,a,b));part.text=part.words.map(w=>w.text).join(' ');
  if(part.captionStyleRanges)part.captionStyleRanges=part.captionStyleRanges.filter(r=>overlaps(r,a,b)).map(r=>({...r,start:Math.max(a,r.start),end:Math.min(b,r.end)}));
  part.pokemon=(part.pokemon||[]).filter(l=>overlaps(l,a,b)).map(l=>({...l,start:Math.max(a,l.start),end:Math.min(b,l.end)}));
  part.layers=compactLayers({...part,layers:(part.layers||[]).filter(l=>overlaps(l,a,b)).map(l=>clipLayer(l,a,b))});
  for(const k of ['storyShotMotionSource','sequenceSourceLayers','shortStyleSourceLayers','actionMovieSourceLayers','expressionSourceLayers','performanceSourceLayers','creativeActionSourceLayers','hookSourceLayers','mechanicLayoutSourceLayers','movesetSourceLayers'])delete part[k];return part;
 });
 next.pokemonMentions=(next.pokemonMentions||[]).filter(m=>m.start<end);next.soundEffects=(next.soundEffects||[]).filter(f=>overlaps({...f,end:f.end??f.start+(project.media.find(m=>m.id===f.mediaId)?.duration||0)},start,end));
 next.reactionGifPlan=(next.reactionGifPlan||[]).filter(c=>targets.some(s=>s.id===c.sceneId)&&overlaps(c,start,end));return next;
}
export async function quickPatch(project,request,context,{edit,progress=()=>{}}){
 validateProject(project);if(project.pendingRevision)throw Error('Finish or cancel the pending asset request first.');if(!request.trim())throw Error('Describe what to change in the selected patch.');
 const begin=Date.now(),patchId=crypto.randomUUID(),range=patchRange(project,context),subset=patchSubset(project,range),before=clone(project);
 progress({stage:`Editing only ${range.start.toFixed(1)}–${range.end.toFixed(1)}s; reusing narration and cached assets`,percent:8});
 const narrationSignature=p=>JSON.stringify([p.voiceId,p.duration,p.scenes.map(s=>[s.id,s.start,s.end,s.words.map(w=>[w.text,w.start,w.end])])]),signature=narrationSignature(subset);
 const edited=await edit(subset,range);if(edited.pendingRevision)return {...project,pendingRevision:{...edited.pendingRevision,context:{...edited.pendingRevision.context,...context,timeRange:range}}};
 // A scoped model receives a shortened scene, but it cannot cut/rewrite speech.
 if(narrationSignature(edited)!==signature)throw Error('Patch attempted to change narration or timing; original retained.');
 validateProject(edited);const replacements=new Map(edited.scenes.map(s=>[s.id,s]));
 const next={...before,media:[...new Map([...edited.media,...before.media].map(m=>[m.id,m])).values()]};let changed=0;
 next.scenes=before.scenes.map(s=>{
  const patch=replacements.get(s.id);if(!patch)return s;
  const a=patch.start,b=patch.end,original=s.layers||[],same=l=>original.some(o=>o.id===l.id&&JSON.stringify(clipLayer(o,l.start,l.end))===JSON.stringify(l));
  const keep=new Set((patch.layers||[]).filter(same).map(l=>l.id));let removed;
  do{removed=false;for(const l of patch.layers||[])if(keep.has(l.id)&&[l.parentId,l.attachment?.targetId,...(l.relationEdges||[]).flatMap(e=>[e.from,e.to])].filter(Boolean).some(id=>!keep.has(id))){keep.delete(l.id);removed=true;}}while(removed);
  const incoming=(patch.layers||[]).filter(l=>!keep.has(l.id));
  const ids=new Map(incoming.map((l,i)=>[l.id,s.id+'-patch-'+patchId+'-'+i]));
  const added=incoming.map(l=>({...l,id:ids.get(l.id),...(patch.cinematicStage?{cinematicDepthOverride:cinematicDepth(l,patch.layers||[])}:{}),instructionLocked:true,...(l.actorSourceId?{actorSourceId:ids.get(l.actorSourceId)||l.actorSourceId}:{}),...(l.parentId?{parentId:ids.get(l.parentId)||l.parentId}:{}),...(l.attachment?{attachment:{...l.attachment,targetId:ids.get(l.attachment.targetId)||l.attachment.targetId}}:{}),...(l.relationEdges?{relationEdges:l.relationEdges.map(e=>({...e,from:ids.get(e.from)||e.from,to:ids.get(e.to)||e.to}))}:{})}));
  const layers=original.map(l=>keep.has(l.id)||!overlaps(l,a,b)?l:{...l,excludedRanges:[...(l.excludedRanges||[]),{start:a,end:b}]}).concat(added);
  const compacted=compactLayers({...s,layers}),captionChanged=JSON.stringify(s.captionStyle)!==JSON.stringify(patch.captionStyle);
  const stageChanged=JSON.stringify(s.cinematicStage)!==JSON.stringify(patch.cinematicStage);
  if(JSON.stringify(compacted)!==JSON.stringify(compactLayers(s))||captionChanged||stageChanged)changed++;
  return {...s,layers:compacted,...(stageChanged?{cinematicStage:spliceCinematicStage(s.cinematicStage,patch.cinematicStage,a,b)}:{}),...(captionChanged?{captionStyleRanges:[...(s.captionStyleRanges||[]),{start:a,end:b,style:patch.captionStyle||{}}]}:{})};
 });
 const contained=f=>{const end=f.end??f.start+(project.media.find(m=>m.id===f.mediaId)?.duration||0);return f.start>=range.start&&end<=range.end;};
 const audioOnly=edited.patchAudioOnly===true;
 const outside=(before.soundEffects||[]).filter(f=>audioOnly||!f.auto||!contained(f)).map(f=>{
  if(!audioOnly)return f;const changed=(edited.soundEffects||[]).find(e=>e.mediaId===f.mediaId&&e.start===f.start);if(!changed||changed.volume===f.volume)return f;
  const end=Math.min(range.end,f.end??f.start+(project.media.find(m=>m.id===f.mediaId)?.duration||0));return {...f,volumeRanges:[...(f.volumeRanges||[]),{start:Math.max(range.start,f.start),end,volume:changed.volume}]};
 });
 const existing=f=>(before.soundEffects||[]).some(o=>contained(o)&&JSON.stringify(o)===JSON.stringify(f));
 const sounds=audioOnly?[]:(edited.soundEffects||[]).filter(f=>f.start>=range.start&&f.start<range.end&&!outside.some(o=>JSON.stringify(o)===JSON.stringify(f))&&(f.auto||!(before.soundEffects||[]).some(o=>JSON.stringify(o)===JSON.stringify(f)))&&(existing(f)||!f.auto||!outside.some(o=>Math.abs(o.start-f.start)<.35))).map(f=>existing(f)?f:{...f,end:Math.min(range.end,f.end??f.start+(edited.media.find(m=>m.id===f.mediaId)?.duration||0))});
 next.soundEffects=[...outside,...sounds].sort((a,b)=>a.start-b.start);
 if(!changed&&JSON.stringify(next.soundEffects)===JSON.stringify([...(before.soundEffects||[])].sort((a,b)=>a.start-b.start)))throw Error('That request did not change this patch. Describe a specific object, action or effect.');
 next.quickPatchReport={...range,seconds:(Date.now()-begin)/1000,scenes:replacements.size,request,captionAppearancePreserved:true,narrationReused:true,performance:edited.performanceReport};
 next.quickPatchRanges=mergeRanges([...savedPatchRanges(before),range]);
 // Keep full-project metadata and captions; patch provenance lives separately.
 validateProject(next);progress({stage:'Patch applied; the rest of the video is preserved',percent:100});
 const reviewed=refreshStoryboard({...next,scenes:next.scenes.filter(s=>replacements.has(s.id))}),reviewedMap=new Map(reviewed.scenes.map(s=>[s.id,s]));next.scenes=next.scenes.map(s=>reviewedMap.get(s.id)||s);
 return recordRevision(project,next,'Quick patch '+range.start.toFixed(1)+'–'+range.end.toFixed(1)+'s: '+request,[{type:'quick-patch',...range}],`Edited ${replacements.size} scene segment(s) in ${(Date.now()-begin)/1000}s. Narration, captions and visuals outside the range are preserved.`,'Scoped remake');
}
