import React,{useEffect,useRef} from 'react';
import type {PlayerRef} from '@remotion/player';

// Narration owns the preview clock. A slow visual frame catches up to speech;
// it must never rewind speech to compensate for decoding or layout work.
export function PreviewNarration({src,player,duration,onError,fps=30}:{src:string;player:React.RefObject<PlayerRef|null>;duration:number;fps?:number;onError:(error:string)=>void}){
 const audio=useRef<HTMLAudioElement>(null),report=useRef(onError);report.current=onError;
 useEffect(()=>{
  const video=player.current,voice=audio.current;if(!video||!voice)return;
  let internalSeek=false,waiting=false,disposed=false;voice.currentTime=Math.max(0,Math.min(duration,video.getCurrentFrame()/fps));
  const seekPicture=()=>{const frame=Math.min(Math.ceil(duration*fps)-1,Math.round(voice.currentTime*fps));if(Math.abs(video.getCurrentFrame()-frame)>2){internalSeek=true;video.seekTo(frame);internalSeek=false;}};
  const play=()=>{if(waiting||disposed)return;voice.volume=video.getVolume();voice.muted=video.isMuted();void voice.play().catch(e=>{if(disposed||e.name==='AbortError')return;video.pause();report.current('Preview narration could not play: '+e.message);});};
  const pause=()=>{voice.pause();};
  const seek=(e:{detail:{frame:number}})=>{if(internalSeek)return;voice.currentTime=Math.max(0,Math.min(duration,e.detail.frame/fps));};
  const volume=(e:{detail:{volume:number}})=>{voice.volume=e.detail.volume;};
  const mute=(e:{detail:{isMuted:boolean}})=>{voice.muted=e.detail.isMuted;};
  const rate=(e:{detail:{playbackRate:number}})=>{voice.playbackRate=e.detail.playbackRate;};
  const buffer=()=>{waiting=true;voice.pause();};
  const resume=()=>{waiting=false;seekPicture();if(video.isPlaying())play();};
  const ended=()=>{video.pause();seekPicture();};
  const failed=()=>{video.pause();report.current('Preview narration failed to load. Reopen the project or check the source file.');};
  video.addEventListener('play',play);video.addEventListener('pause',pause);video.addEventListener('seeked',seek);
  video.addEventListener('volumechange',volume);video.addEventListener('mutechange',mute);video.addEventListener('ratechange',rate);
  video.addEventListener('waiting',buffer);video.addEventListener('resume',resume);
  voice.addEventListener('ended',ended);voice.addEventListener('error',failed);
  const timer=setInterval(()=>{if(video.isPlaying()&&!voice.paused&&!waiting)seekPicture();},50);
  return()=>{disposed=true;clearInterval(timer);voice.pause();video.removeEventListener('play',play);video.removeEventListener('pause',pause);video.removeEventListener('seeked',seek);video.removeEventListener('volumechange',volume);video.removeEventListener('mutechange',mute);video.removeEventListener('ratechange',rate);video.removeEventListener('waiting',buffer);video.removeEventListener('resume',resume);voice.removeEventListener('ended',ended);voice.removeEventListener('error',failed);};
 },[src,player,duration,fps]);
 return <audio ref={audio} src={src} preload="auto" data-preview-narration hidden/>;
}
