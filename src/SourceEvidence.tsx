import React from 'react';import {Img} from 'remotion';import type {Media} from './types';
// Crop actual publisher pixels, retaining the name and complete effect text.
// Navigation and unrelated page columns do not need to occupy the mobile frame.
export function SourceEvidence({media}:{media:Media}){
 const regions=(media as any).moveCard?.regions as {title:any;effects:any;target?:any}|undefined;if(!regions)return <Img src={media.url} style={{width:'100%',height:'100%',objectFit:'contain'}}/>;
 const mw=media.width||1000,mh=media.height||400,t=regions.title,e=regions.effects,target=regions.target,tw=t.width*mw,th=t.height*mh,ew=e.width*mw,eh=e.height*mh,rw=target?target.width*mw:0,rh=target?target.height*mh:0,w=Math.max(tw,ew,rw)+48,h=th+eh+64+(target?rh+18:0);
 const piece=(r:any,x:number,y:number)=><svg x={x} y={y} width={r.width*mw} height={r.height*mh} viewBox={`${r.x*mw} ${r.y*mh} ${r.width*mw} ${r.height*mh}`} overflow="hidden"><image href={media.url} x="0" y="0" width={mw} height={mh}/></svg>;
 return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{filter:'drop-shadow(0 7px 10px #10142655)'}}><rect width={w} height={h} rx="20" fill="white"/>{piece(t,(w-tw)/2,16)}{piece(e,(w-ew)/2,th+40)}{target&&piece(target,(w-rw)/2,th+eh+58)}</svg>;
}
