import {audioRouting,effectVolumeAt,musicVolumeAt} from '../electron/audio-routing.mjs';
import {captionWordColor,CAPTION_PALETTE} from '../electron/caption-palette.mjs';
import {phraseCaptionRange} from '../electron/phrase-captions.mjs';
import {captionWordAt} from '../electron/speech-timing.mjs';
import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, Loop, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Project,Scene} from './types';
import {PokemonGraphics} from './PokemonGraphics';
import {VisualLayers} from './VisualLayers';

const Beat:React.FC<{scene:Scene;project:Project;outgoing?:boolean}> = ({scene,project,outgoing=false})=>{
 const frame=useCurrentFrame(); const {fps}=useVideoConfig();
 const media=project.media.find(m=>m.id===scene.mediaId); const t=scene.start+frame/fps;
 const current=captionWordAt(scene.words,t);
 const caption={...project.captionStyle,...scene.captionStyle,...scene.captionStyleRanges?.filter(r=>t>=r.start&&t<r.end).at(-1)?.style};const count=caption.wordsPerGroup||6;
 const group=Math.floor(Math.max(0,current)/count)*count;
 const outlined=['yellow-phrase','outlined-phrase','contrast-phrase'].includes(caption.style||'');
 const range=outlined?phraseCaptionRange(scene,project,current,count):{start:group,end:group+count};
 const enter=interpolate(frame,[0,12],[24,0],{extrapolateRight:'clamp'});
 return <AbsoluteFill data-scene={scene.id} data-scene-time={t} data-outgoing={outgoing||undefined} style={{background:'#101722',color:'white',fontFamily:'Arial',overflow:'hidden',opacity:scene.transition==='crossfade'?interpolate(frame,[0,Math.min((scene.transitionDuration||.45)*fps,(scene.end-scene.start)*fps/2)],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):1}}>
 {!scene.layers&&media?.kind==='video' && <Loop durationInFrames={Math.max(1,Math.floor(media.duration*fps))}><OffthreadVideo src={media.url} muted style={{width:'100%',height:'100%',objectFit:'cover'}} /></Loop>}
 {!scene.layers&&media?.kind==='image' && <Img src={media.url} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1+frame/1800})`}}/>}
 <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(7,12,20,.15),rgba(7,12,20,.85))'}}/>
 {scene.layers?<VisualLayers scene={scene} project={project}/>:<PokemonGraphics scene={scene} project={project}/>}
 {!scene.layers&&<div style={{position:'absolute',top:'9%',left:'7%',right:'7%',transform:`translateY(${enter}px)`,opacity:interpolate(frame,[0,10],[0,1],{extrapolateRight:'clamp'})}}>
 <div style={{fontSize:22,letterSpacing:5,color:project.captionColor,textTransform:'uppercase',marginBottom:20}}>Gaming • {scene.kind}</div>
 <div style={{fontSize:project.format==='vertical'?64:72,fontWeight:800,lineHeight:1.06,maxWidth:1100}}>{scene.title}</div>
 {!media && <div style={{marginTop:28,width:90,height:6,background:project.captionColor}}/>}
 </div>}
 {!outgoing&&caption.enabled!==false&&current>=0&&<div data-captions style={{zIndex:1000,position:'absolute',bottom:caption.position==='top'?undefined:`${(caption.bottom??.13)*100}%`,top:caption.position==='top'?'6%':undefined,left:'6%',right:'6%',textAlign:'center',fontSize:caption.fontSize??(project.format==='vertical'?46:42),fontWeight:outlined?900:caption.minimal?600:800,lineHeight:1.4,textShadow:outlined?'3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 5px 5px #000':'0 3px 8px black'}}>
 {scene.words.slice(range.start,range.end).map((w,i)=><span key={i} style={{color:captionWordColor({style:caption.style,accent:project.captionColor},w,range.start+i===current||!!w.captionText&&range.start+i<current&&scene.words.slice(range.start+i+1,current+1).every(w=>w.captionText===''),scene,project),background:caption.style==='contrast-phrase'?CAPTION_PALETTE.backing:outlined||caption.minimal?'transparent':'#09111bd9',padding:caption.minimal?'2px 4px':'6px 8px',boxDecorationBreak:'clone',borderRadius:6,WebkitTextStroke:outlined?'1px #000':undefined,paintOrder:'stroke fill'}}>{w.captionText??w.text} </span>)}
 </div>}
 </AbsoluteFill>;
};
export const GamingAudio:React.FC<{project:Project;previewVoiceExternal?:boolean}> = ({project,previewVoiceExternal=false})=>{
 const {fps}=useVideoConfig();const {voice,music,effects}=audioRouting(project);
 return <>
 {voice && !previewVoiceExternal && <Audio pauseWhenBuffering src={voice.url}/>}{music && <Sequence from={Math.round((project.musicClip?.start||0)*fps)} durationInFrames={Math.max(1,Math.round(((project.musicClip?.end||project.duration)-(project.musicClip?.start||0))*fps))}><Audio pauseWhenBuffering src={music.url} trimBefore={Math.round((project.musicClip?.sourceOffset??0)*fps)} loop={project.musicClip?.loop!==false} loopVolumeCurveBehavior="extend" volume={frame=>musicVolumeAt(project,frame/fps+(project.musicClip?.start??0))}/></Sequence>}
 {effects.map((s:any,i:number)=>{const m=project.media.find(m=>m.id===s.mediaId);return m?<Sequence key={`sfx-${i}`} from={Math.round(s.start*fps)} durationInFrames={Math.max(1,Math.round((s.end!==undefined?s.end-s.start:Math.min(m.duration,project.duration-s.start))*fps))}><Audio pauseWhenBuffering src={m.url} trimBefore={Math.round((s.sourceOffset??0)*fps)} loop={s.loop===true} loopVolumeCurveBehavior="extend" volume={frame=>effectVolumeAt(s,frame/fps+s.start,project)}/></Sequence>:null;})}
 </>;
};
export const GamingVideo:React.FC<{project:Project;previewVoiceExternal?:boolean;muteAllAudio?:boolean}> = ({project,previewVoiceExternal=false,muteAllAudio=false})=>{
 const {fps}=useVideoConfig();return <AbsoluteFill style={{background:'#101722'}}>
 {project.scenes.map((s,i)=>s.transition==='crossfade'&&i>0?<Sequence key={'transition-'+s.id} from={Math.round(s.start*fps)} durationInFrames={Math.max(1,Math.min(Math.round((s.transitionDuration||.45)*fps),Math.round((s.end-s.start)*fps/2)))}><Freeze frame={Math.max(0,Math.round((project.scenes[i-1].end-project.scenes[i-1].start)*fps)-1)}><Beat scene={{...project.scenes[i-1],transition:undefined,layers:project.scenes[i-1].layers?.map(l=>({...l,exit:'none'}))}} project={project} outgoing/></Freeze></Sequence>:null)}
 {project.scenes.map(s=><Sequence key={s.id} from={Math.round(s.start*fps)} durationInFrames={Math.max(1,Math.round(s.end*fps)-Math.round(s.start*fps))}><Beat scene={s} project={project}/></Sequence>)}
 {!muteAllAudio&&<GamingAudio project={project} previewVoiceExternal={previewVoiceExternal}/>}
 </AbsoluteFill>;
};
