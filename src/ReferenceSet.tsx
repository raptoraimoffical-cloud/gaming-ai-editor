import React,{useId} from 'react';
import {referencePatternMotion} from '../electron/reference-pattern-motion.mjs';
export function ReferenceSet({data,time}:{data:any;time:number}){
 const id=useId().replace(/[^a-z0-9]/gi,''),m=referencePatternMotion(time,data.motion),w=data.width||1080,h=data.height||1920;return <div style={{position:'absolute',inset:0,overflow:'hidden',background:`radial-gradient(ellipse at 55% 38%,${data.colors[0]},${data.colors[1]} 88%)`}}>
 <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{position:'absolute',inset:0}}><defs>
 <pattern id={id+'checks'} width={m.tile} height={m.tile} patternUnits="userSpaceOnUse" patternTransform={`rotate(-9) translate(${m.checkX} ${m.checkY})`}><rect width="115" height="115" fill="#ccdfec"/><rect x="115" y="115" width="115" height="115" fill="#ccdfec"/></pattern>
 <pattern id={id+'balls'} width={m.tile} height={m.tile} patternUnits="userSpaceOnUse" patternTransform={`rotate(-9) translate(${m.ballX} ${m.ballY})`}><g fill="none" stroke="#dcebf5" strokeWidth="4"><circle cx="115" cy="115" r="32"/><path d="M83 115h64"/><circle cx="115" cy="115" r="10" fill={data.colors[1]}/><circle cx="115" cy="115" r="4"/></g></pattern>
 </defs><rect width={w} height={h} fill={'url(#'+id+'checks)'} opacity={data.intensity??.26}/><rect width={w} height={h} fill={'url(#'+id+'balls)'} opacity=".24"/></svg>
 {data.floor&&<div style={{position:'absolute',left:'-30%',right:'-30%',top:'58%',height:'56%',opacity:.20,transform:'perspective(600px) rotateX(62deg)',transformOrigin:'50% 0',backgroundImage:'linear-gradient(#c8dbee42 1px,transparent 1px),linear-gradient(90deg,#c8dbee42 1px,transparent 1px)',backgroundSize:'100px 100px'}}/>}
 <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,#10152480,transparent 50%,#10152410)'}}/>
 </div>;
}
