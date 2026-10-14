import {mergeRanges,compactLayers,visibleRanges} from './layer-visibility.mjs';
import {clipLayer} from './clip-layer.mjs';
import {selectedGame} from './game-selection.mjs';
import {cinematicDepth,spliceCinematicStage} from './cinematic-scenes.mjs';
export function savedPatchRanges(project) {
 const history=(project.revisionHistory||[]).slice(0,project.revisionCursor??project.revisionHistory?.length??0);
 return mergeRanges(project.quickPatchRanges??history.flatMap(h=>(h.operations||[]).filter(o=>o.type==='quick-patch'))).map(r=>({start:Math.max(0,r.start),end:Math.min(project.duration,r.end)})).filter(r=>r.end>r.start);
}
// Keep the reviewed frames of a local patch when the rest is regenerated.
// The fresh request is applied afterwards, so a new explicit edit takes priority.
export function preserveQuickPatches(original,rebuilt) {
 if((original.gameSelection||'auto')!==(rebuilt.gameSelection||'auto')&&selectedGame(original)!==selectedGame(rebuilt))return {...rebuilt,quickPatchRanges:[]};
 const ranges=savedPatchRanges(original);if(!ranges.length)return rebuilt;
 const next={...rebuilt,media:[...new Map([...rebuilt.media,...original.media].map(m=>[m.id,m])).values()],quickPatchRanges:ranges};
 next.scenes=rebuilt.scenes.map(scene=>{
  const source=original.scenes.find(s=>s.id===scene.id);if(!source)return scene;
  const windows=ranges.map(r=>({start:Math.max(r.start,scene.start),end:Math.min(r.end,scene.end)})).filter(r=>r.end>r.start);
  const added=windows.flatMap((r,ri)=>{
   const layers=(source.layers||[]).filter(l=>visibleRanges(l,r.start,r.end,source.layers).length),ids=new Map(layers.map((l,i)=>[l.id,scene.id+'-saved-patch-'+ri+'-'+i]));
   // A hidden attachment anchor must travel with its visible child.
   for(let changed=true;changed;){changed=false;for(const l of [...layers])for(const id of [l.parentId,l.attachment?.targetId])if(id&&!ids.has(id)){const anchor=source.layers.find(a=>a.id===id);if(anchor){ids.set(id,scene.id+'-saved-patch-'+ri+'-'+ids.size);layers.push(anchor);changed=true;}}}
   return layers.map(l=>{const clipped=clipLayer(l,r.start,r.end);if(clipped.end<=clipped.start){clipped.start=r.start;clipped.end=r.end;clipped.excludedRanges=[r];clipped.mediaOffset=Math.max(0,clipped.mediaOffset??0);}return {...clipped,id:ids.get(l.id),instructionLocked:true,...(l.actorSourceId?{actorSourceId:ids.get(l.actorSourceId)||l.actorSourceId}:{}),...(l.parentId?{parentId:ids.get(l.parentId)}:{}),...(l.attachment?{attachment:{...l.attachment,targetId:ids.get(l.attachment.targetId)||l.attachment.targetId}}:{})};});
  });
  const layers=(scene.layers||[]).map(l=>({...l,excludedRanges:mergeRanges([...(l.excludedRanges||[]),...windows])})).concat(added);
  let stage=scene.cinematicStage;for(const r of windows)stage=spliceCinematicStage(stage,source.cinematicStage,r.start,r.end);
  const result={...scene,layers:compactLayers({...scene,layers}),...(stage?{cinematicStage:stage}:{})};
  if(source.cinematicStage)for(const l of result.layers.filter(l=>l.id.includes('-saved-patch-')))l.cinematicDepthOverride=cinematicDepth(l,layers.map(p=>({...p,instructionLocked:false})));
  return result;
 });
 // Split regenerated cues around protected windows; retain the original source
 // offset rather than restarting a sound when the patch ends.
 const media=new Map(next.media.map(m=>[m.id,m]));
 const outside=(rebuilt.soundEffects||[]).flatMap(f=>{
  const end=f.end??Math.min(rebuilt.duration,f.start+(media.get(f.mediaId)?.duration||0));
  let parts=[{start:f.start,end}];for(const r of ranges)parts=parts.flatMap(p=>r.end<=p.start||r.start>=p.end?[p]:[{start:p.start,end:Math.min(p.end,r.start)},{start:Math.max(p.start,r.end),end:p.end}].filter(p=>p.end>p.start));
  return parts.map(p=>({...f,...p,sourceOffset:(f.sourceOffset??0)+p.start-f.start}));
 });
 const inside=(original.soundEffects||[]).flatMap(f=>ranges.map(r=>({start:Math.max(r.start,f.start),end:Math.min(r.end,f.end??original.duration,f.start+(media.get(f.mediaId)?.duration||0))})).filter(r=>r.end>r.start).map(r=>({...structuredClone(f),...r,sourceOffset:(f.sourceOffset??0)+r.start-f.start})));
 next.soundEffects=[...outside,...inside].sort((a,b)=>a.start-b.start);return next;
}
