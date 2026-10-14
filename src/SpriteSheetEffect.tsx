import React from 'react';
import {Img} from 'remotion';
import type {Media} from './types';
export function SpriteSheetEffect({media,time,width,height,tile=false,tint,motion=true}:{media:Media;time:number;width:number;height:number;tile?:boolean;tint?:string;motion?:boolean}){
 const s=media.spriteSheet!;const count=s.frames,raw=Math.floor(Math.max(0,time)*s.fps),frame=motion?(s.loop?raw%count:Math.min(count-1,raw)):Math.min(count-1,Math.floor(count*.35)),x=frame%s.columns*s.frameWidth,y=Math.floor(frame/s.columns)*s.frameHeight,b=s.bounds||{x:0,y:0,width:s.frameWidth,height:s.frameHeight};
 const id=React.useId().replace(/:/g,'')+'-sheet';const cell=tile?s.frameWidth:b.width,ch=tile?s.frameHeight:b.height;
 const crop=<svg width={cell} height={ch} viewBox={`${x+(tile?0:b.x)} ${y+(tile?0:b.y)} ${cell} ${ch}`} overflow="hidden"><image href={media.url} width={media.width} height={media.height} style={{imageRendering:'pixelated'}}/></svg>;
 return <><Img src={media.url} style={{position:'absolute',width:1,height:1,opacity:0}}/><svg width="100%" height="100%" viewBox={tile?`0 0 ${width} ${height}`:`0 0 ${cell} ${ch}`} style={{position:'absolute',inset:0,imageRendering:'pixelated',filter:tint==='gold'?`url(#${id}-gold)`:undefined}}>
  {tint==='gold'&&<defs><filter id={id+'-gold'} colorInterpolationFilters="sRGB"><feColorMatrix values="0 0 0 0 1 0 0 0 0 .72 0 0 0 0 .10 0 0 0 1 0"/><feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent=".5" offset="0"/></feComponentTransfer></filter></defs>}
  {tile?<><defs><pattern id={id} width={s.displayTile||256} height={s.displayTile||256} patternUnits="userSpaceOnUse" viewBox={`0 0 ${cell} ${ch}`}>{crop}</pattern></defs><rect width={width} height={height} fill={`url(#${id})`}/></>:crop}
 </svg></>;
}
