import React from 'react';
import {Img} from 'remotion';
export function NarrationEffect({src,resultSrc,progress,crumple}:{src:string;resultSrc?:string;progress:number;crumple:number}){
 const t=Math.max(0,Math.min(1,crumple)),settle=Math.min(1,Math.max(0,progress)*8);
 const ball=Math.max(0,Math.min(1,(t-.3)/.4));
 return <div data-narration-effect="paper-crumple" style={{width:'100%',height:'100%',perspective:700,transform:`translateY(${t*8}%) scale(${settle})`,opacity:Math.min(1,(1-progress)*7)}}>
  <Img src={src} style={{position:'absolute',width:'100%',height:'100%',objectFit:'contain',opacity:resultSrc?1-ball:1,transform:`rotateX(${t*65}deg) rotateY(${-t*48}deg) rotate(${t*22}deg) scale(${1-t*.5})`}}/>
  {resultSrc&&<Img src={resultSrc} style={{position:'absolute',width:'100%',height:'100%',objectFit:'contain',opacity:ball,transform:`rotate(${t*26}deg) scale(${.72-t*.12})`}}/>}
 </div>;
}
