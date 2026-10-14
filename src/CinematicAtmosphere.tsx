import React,{useId} from 'react';
import type {Scene} from './types';
import {cinematicStageAt} from '../electron/cinematic-scenes.mjs';

// Lighting and weather are inexpensive procedural motion layers. Character,
// item, move and scenery imagery still comes from actual source files.
export function CinematicAtmosphere({scene,time,foreground=false,light=0,color='#fff',focusX=.5,focusY=.42}:{scene:Scene;time:number;foreground?:boolean;light?:number;color?:string;focusX?:number;focusY?:number}){
 const id=useId().replace(/:/g,''),stage=cinematicStageAt(scene,time);
 if(!stage)return null;
 const weather=stage.weather.find(w=>time>=w.start&&time<w.end),age=weather?time-weather.start:0,fade=weather?Math.min(1,age/.22,(weather.end-time)/.22):0;
 const rain=weather?.kind==='rain',snow=weather?.kind==='snow',sun=weather?.kind==='sun',wind=weather?.kind==='wind',sourceWeather=weather?.sourceLayerId&&time<(weather.sourceEnd??weather.end)&&scene.layers?.some(l=>(l.id===weather.sourceLayerId||l.role==='ambient-source'&&l.mediaId===weather.sourceMediaId)&&time>=l.start&&time<l.end&&!(l.excludedRanges||[]).some(r=>time>=r.start&&time<r.end));
 if(foreground)return <svg data-cinematic-atmosphere="foreground" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:55,pointerEvents:'none'}}>
  <defs><radialGradient id={id+'-impact'}><stop stopColor={color} stopOpacity={light}/><stop offset=".5" stopColor={color} stopOpacity={light*.25}/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient></defs>
  {light>0&&<ellipse cx={focusX*1080} cy={focusY*1920} rx="520" ry="420" fill={`url(#${id}-impact)`}/>}
  {(rain||snow)&&!sourceWeather&&<g opacity={Math.max(0,fade)*.45}>{Array.from({length:rain?54:30},(_,i)=>{
   const x=(i*173.7+Math.sin(age*.6+i)*12)%1120-20,y=((i*311.3+age*(rain?960:95))%2070)-80;
   return rain?<path key={i} d={`M${x} ${y}l-9 ${30+i%4*7}`} stroke="#c3e7fa" strokeWidth={1.2+i%3*.6} opacity={.22+i%4*.12}/>:<circle key={i} cx={x+Math.sin(age+i)*14} cy={y} r={2+i%4} fill="#e9faff" opacity={.3+i%4*.15}/>;
  })}</g>}
 </svg>;
 return <svg data-cinematic-atmosphere="depth" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:2,pointerEvents:'none'}}>
  <defs>
   <linearGradient id={id+'-floor'} x2="0" y2="1"><stop stopColor="#091626" stopOpacity="0"/><stop offset="1" stopColor="#091626" stopOpacity=".6"/></linearGradient>
   <radialGradient id={id+'-sky'}><stop stopColor={sun?'#ffe49b':'#b7e1fc'} stopOpacity={sun?.32:.09}/><stop offset="1" stopColor="#a7cce2" stopOpacity="0"/></radialGradient>
   <linearGradient id={id+'-cloud'} x2="0" y2="1"><stop stopColor="#162c47" stopOpacity=".9"/><stop offset="1" stopColor="#162c47" stopOpacity="0"/></linearGradient>
  </defs>
  {scene.layers?.some(l=>l.cinematicDecoration&&l.role==='background'&&l.mediaId)&&<rect width="1080" height="1920" fill="#081627" opacity=".20"/>}
  <rect y="640" width="1080" height="1280" fill={`url(#${id}-floor)`}/>
  <ellipse cx={780+Math.sin(time*.08)*40} cy="260" rx="780" ry="540" fill={`url(#${id}-sky)`} opacity={sun?fade:1}/>
  <g opacity=".08" fill="#d9edff">{Array.from({length:15},(_,i)=><circle key={i} cx={(i*193+time*(5+i%3))%1180-50} cy={210+i%6*115+Math.sin(time*.35+i)*9} r={1+i%3}/>)}</g>
  {(rain||snow)&&<g opacity={Math.max(0,fade)}><rect width="1080" height="1920" fill={rain?'#102642':'#3c637b'} opacity=".19"/><path d={`M-150 0H1230V${240+Math.sin(age*.3)*18}Q900 310 680 265T210 290T-150 265Z`} fill={`url(#${id}-cloud)`}/></g>}
  {sun&&<g opacity={Math.max(0,fade)*.14} fill="#ffe8a3" transform={`rotate(${-8+Math.sin(age*.2)*3} 900 0)`}>{[0,1,2].map(i=><path key={i} d={`M${780+i*100} 0l${-300+i*60} 1500h${180+i*50}L${870+i*100} 0Z`}/>)}</g>}
  {wind&&<g fill="none" stroke="#deedf1" strokeWidth="2" opacity={Math.max(0,fade)*.18}>{[0,1,2,3].map(i=><path key={i} d={`M${-400+(age*280+i*170)%1600} ${240+i*165}q190 -38 340 0t240 -15`}/>)}</g>}
 </svg>;
}
