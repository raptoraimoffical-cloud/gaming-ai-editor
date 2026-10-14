// Half-open timeline intervals, shared by patch cleanup and export preflight.
export function mergeRanges(ranges) {
 const result=[];
 for(const r of ranges.filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).map(r=>({...r})).sort((a,b)=>a.start-b.start)) {
  const last=result.at(-1);
  if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else result.push(r);
 }
 return result;
}
export function visibleRanges(layer,start=layer.start,end=layer.end,layers=[],seen=new Set()) {
 if(seen.has(layer.id))return [];
 let ranges=[{start:Math.max(start,layer.start),end:Math.min(end,layer.end)}].filter(r=>r.end>r.start);
 for(const gate of mergeRanges(layer.excludedRanges||[]))ranges=ranges.flatMap(r=>gate.end<=r.start||gate.start>=r.end?[r]:[{start:r.start,end:Math.min(r.end,gate.start)},{start:Math.max(r.start,gate.end),end:r.end}].filter(r=>r.end>r.start));
 if(layer.parentId){const parent=layers.find(l=>l.id===layer.parentId);if(!parent)return [];const chain=new Set(seen).add(layer.id),parentRanges=visibleRanges(parent,start,end,layers,chain);ranges=ranges.flatMap(r=>parentRanges.map(p=>({start:Math.max(r.start,p.start),end:Math.min(r.end,p.end)})).filter(r=>r.end>r.start));}
 return ranges;
}
export const visibleLayers=scene=>(scene.layers||[]).filter(l=>visibleRanges(l,scene.start,scene.end,scene.layers).length);
export function compactLayers(scene) {
 const layers=scene.layers||[],keep=new Set(visibleLayers(scene).map(l=>l.id));
 // Invisible anchors can still supply geometry to visible attached images.
 for(let changed=true;changed;){changed=false;for(const l of layers)if(keep.has(l.id))for(const id of [l.parentId,l.attachment?.targetId])if(id&&!keep.has(id)){keep.add(id);changed=true;}}
 return layers.filter(l=>keep.has(l.id)).map(l=>l.excludedRanges?.length?{...l,excludedRanges:mergeRanges(l.excludedRanges.map(r=>({start:Math.max(l.start,r.start),end:Math.min(l.end,r.end)})))}:l);
}
