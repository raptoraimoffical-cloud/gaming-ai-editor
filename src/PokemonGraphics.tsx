import React from 'react';
import {Gif} from '@remotion/gif';
import {AbsoluteFill,Img,Sequence,interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Media,Project,Scene,PokemonPlacement} from './types';

const palette:Record<string,string>={fire:'#ffb16c',water:'#73c7ff',grass:'#83e6af',ice:'#a6f0ff',dark:'#b7a5dd',flying:'#aac9ff',electric:'#ffe487',psychic:'#ff9cc5'};
const SpriteCard:React.FC<{asset:Media;placement:PokemonPlacement;scene:Scene;project:Project;index:number;total:number}>=({asset,placement,scene,project,index,total})=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const p=asset.pokemon!;
 const layout=scene.pokemonLayout||'solo';const vertical=project.format==='vertical';const multi=layout!=='solo';const ranking=layout==='ranking';
 const cols=layout==='team'?3:layout==='comparison'?2:layout==='ranking'?1:1;const rows=Math.ceil(total/cols);
 const cardWidth=multi?(vertical?850:1500)/cols:(vertical?820:1080);const cardHeight=multi?(vertical?900:540)/Math.max(1,rows):(vertical?820:530);
 const x=multi?(index%cols-(cols-1)/2)*cardWidth:0;const y=multi?(Math.floor(index/cols)-(rows-1)/2)*cardHeight:0;
 const frozen=project.freezePokemonMotion;const entrance=frozen?1:spring({frame,fps,config:{damping:18,stiffness:130,mass:0.8}});
 const duration=Math.max(1,Math.round((placement.end-placement.start)*fps));const exit=frozen?1:interpolate(frame,[Math.max(0,duration-8),duration],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const float=frozen?0:Math.sin(frame/fps*2.2+index)*8;const color=palette[p.types[0]]||project.captionColor;
 const size=Math.min(cardWidth*0.72,cardHeight*(ranking?0.7:0.6));
 return <div data-pokemon={p.name} style={{position:'absolute',left:'50%',top:vertical?'47%':'49%',width:cardWidth-22,height:cardHeight-22,transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y+float}px)) scale(${entrance*(0.98+0.02*exit)})`,opacity:exit,textAlign:'center',display:'flex',flexDirection:ranking?'row':'column',justifyContent:ranking?'flex-start':'center',gap:ranking?30:0,padding:ranking?'10px 20px 10px 100px':16,alignItems:'center',background:multi?'linear-gradient(160deg,#1b2939ef,#101722e6)':'radial-gradient(ellipse,#24364b70,transparent 65%)',border:multi?`1px solid ${color}55`:'none',borderRadius:24}}>
 {layout==='ranking'&&<div style={{position:'absolute',left:24,top:24,fontSize:30,color,fontWeight:800}}>#{index+1}</div>}
 <div style={{width:size,height:size,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
 {p.animated?<Gif src={asset.url} width={Math.round(size)} height={Math.round(size)} fit="contain" style={{width:size,height:size,imageRendering:'pixelated'}}/>:<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'contain',imageRendering:'pixelated'}}/>}
 </div>
 <div style={{textAlign:ranking?'left':'center',minWidth:0}}><div style={{fontSize:multi?24:38,fontWeight:800,marginTop:ranking?0:14,color:'white'}}>{asset.name}</div>
 <div style={{fontSize:multi?14:20,color,marginTop:10,letterSpacing:1,lineHeight:1.4}}>NATIONAL #{String(p.nationalDex).padStart(3,'0')} · {p.types.join(' / ').toUpperCase()}</div>
 {layout==='comparison'&&<div style={{fontSize:18,color:'#9db0c8',marginTop:14}}>Base stats · {p.stats.slice(0,3).map(s=>`${s.name}: ${s.value}`).join(' • ')}</div>}
 </div>
 </div>;
};
export const PokemonGraphics:React.FC<{scene:Scene;project:Project}>=({scene,project})=>{
 const time=scene.start+useCurrentFrame()/30;const all=scene.pokemon||[];
 const entries=scene.pokemonLayout==='solo'?all.filter(p=>p.start<=time&&time<p.end).slice(-1):all.slice(0,6);
 return <AbsoluteFill>{entries.map((p,i)=>{const asset=project.media.find(m=>m.id===p.mediaId);if(!asset?.pokemon)return null;const start=Math.max(scene.start,p.start),end=Math.min(scene.end,p.end);if(end<=start)return null;
 return <Sequence key={p.mentionId} from={Math.max(0,Math.round(start*30)-Math.round(scene.start*30))} durationInFrames={Math.max(1,Math.round(end*30)-Math.round(start*30))}><SpriteCard asset={asset} placement={{...p,start,end}} scene={scene} project={project} index={i} total={entries.length}/></Sequence>;
 })}</AbsoluteFill>;
};
