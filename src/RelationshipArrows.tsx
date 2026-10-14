import React from 'react';
import type {Project,VisualLayer} from './types';
import {artworkBox} from '../electron/overlay-layout.mjs';
export function RelationshipArrows({layer,layers,project,time,width,height}:{layer:VisualLayer;layers:VisualLayer[];project:Project;time:number;width:number;height:number}){
 return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{overflow:'visible',pointerEvents:'none'}}>{layer.relationEdges?.map((edge,i)=>{
  if(time<edge.start)return null;const from=layers.find(l=>l.id===edge.from),to=layers.find(l=>l.id===edge.to);if(!from||!to)return null;
  const a=artworkBox(from,layers,project.media,time,width,height),b=artworkBox(to,layers,project.media,time,width,height);if(a.opacity<.15||b.opacity<.15)return null;
  const ax=(a.x+a.w/2)*width,ay=(a.y+a.h/2)*height,bx=(b.x+b.w/2)*width,by=(b.y+b.h/2)*height,dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy);if(d<10)return null;
  const ux=dx/d,uy=dy/d,bound=(box:{w:number;h:number})=>Math.min(Math.abs(ux)>.01?box.w*width/2/Math.abs(ux):Infinity,Math.abs(uy)>.01?box.h*height/2/Math.abs(uy):Infinity)+12,ra=bound(a),rb=bound(b);if(ra+rb>d-25)return null;
  const x1=ax+ux*ra,y1=ay+uy*ra,x2=bx-ux*rb,y2=by-uy*rb,curve=45,cx=(x1+x2)/2-uy*curve,cy=(y1+y2)/2+ux*curve,progress=project.freezePokemonMotion?1:Math.max(0,Math.min(1,(time-edge.start)/.28)),marker=layer.id+'-arrow-'+i;
  return <g key={marker} opacity={progress}><defs><marker id={marker} markerWidth="24" markerHeight="24" viewBox="0 0 10 10" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10Z" fill={layer.color||"#ffe169"}/></marker></defs><path d={`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke="#17213e" strokeWidth="13" strokeLinecap="round"/><path d={`M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={layer.color||"#ffe169"} strokeWidth="7" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress} markerEnd={progress>.95?`url(#${marker})`:undefined}/></g>;
 })}</svg>;
}
