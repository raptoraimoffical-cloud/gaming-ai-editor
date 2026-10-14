import {mergeRanges} from './layer-visibility.mjs';
export function clipLayer(layer,start,end) {
 const a=Math.max(start,layer.start),b=Math.min(end,layer.end);
 return {...structuredClone(layer),start:a,end:b,animationStart:layer.animationStart??layer.start,animationEnd:layer.animationEnd??layer.end,animationDuration:layer.animationDuration??layer.end-layer.start,...(['image','video'].includes(layer.type)?{mediaOffset:(layer.mediaOffset??0)+a-layer.start}:{}),...(layer.excludedRanges?{excludedRanges:mergeRanges(layer.excludedRanges.map(r=>({start:Math.max(a,r.start),end:Math.min(b,r.end)})))}:{})};
}
