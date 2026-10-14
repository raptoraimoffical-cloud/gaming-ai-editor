import {videoMode,videoFPS} from '../electron/video-modes.mjs';
import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {GamingVideo,GamingAudio} from './Composition';
const defaultProps={project:{id:'',name:'',voiceId:'',format:'vertical' as const,duration:1,scenes:[],media:[],captionColor:'#8affcb',musicVolume:0.08}};
const Root=()=> <><Composition id="GamingVideo" component={GamingVideo} width={1080} height={1920} fps={30} durationInFrames={30} defaultProps={defaultProps} calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(props.project.duration*videoFPS(props.project))),fps:videoFPS(props.project),width:videoMode(props.project).width,height:videoMode(props.project).height})}/><Composition id="GamingAudio" component={GamingAudio} width={16} height={16} fps={30} durationInFrames={30} defaultProps={defaultProps} calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(props.project.duration*videoFPS(props.project))),fps:videoFPS(props.project)})}/></>;
registerRoot(Root);
