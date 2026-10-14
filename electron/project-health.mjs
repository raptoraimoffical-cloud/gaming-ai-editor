import fs from 'node:fs';
import {validateProject} from './planner.mjs';
import {auditVisuals} from './storyboard.mjs';
import {videoMode} from './video-modes.mjs';
import {speechTimingIssues} from './speech-timing.mjs';
import {visibleLayers} from './layer-visibility.mjs';

// Read-only preflight shared by the editor and the production export path.
export function projectHealth(project,{exists=fs.existsSync}={}){
 const issues=[];
 const add=(severity,code,message,sceneId)=>issues.push({severity,code,message,...(sceneId?{sceneId}:{})});
 try{validateProject(project);}catch(e){add('error','structure',e.message);}
 if(!project||!Array.isArray(project.scenes)||!Array.isArray(project.media))return {ready:false,issues};
 for(const i of speechTimingIssues(project))add(i.review?'warning':'error',i.code,i.message,i.sceneId);
 const media=new Map();
 for(const m of project.media){if(media.has(m.id))add('error','duplicate-media','Duplicate asset ID: '+m.id);media.set(m.id,m);}
 const used=new Set();
 const need=(id,role,sceneId)=>{if(!id)return;used.add(id);const m=media.get(id);if(!m)add('error','missing-asset',role+' asset is missing: '+id,sceneId);else if(!m.path||!exists(m.path))add('error','missing-file',role+' file is missing: '+(m.name||id),sceneId);};
 need(project.voiceId,'Narration');need(project.musicId,'Music');
 if(media.get(project.voiceId)?.kind!=='audio')add('error','voice-kind','Narration must be an audio asset.');
 if(project.musicId&&media.get(project.musicId)?.kind!=='audio')add('error','music-kind','Music must be an audio asset.');
 if(project.musicVolume!==undefined&&(!Number.isFinite(project.musicVolume)||project.musicVolume<0||project.musicVolume>1))add('error','music-volume','Music volume must be between 0 and 1.');
 const clip=project.musicClip;
 if(clip&&(!Number.isFinite(clip.start)||!Number.isFinite(clip.end)||clip.start<0||clip.end<=clip.start||clip.end>project.duration))add('error','music-timing','Music clip must fit inside the video.');
 if(clip&&(clip.sourceOffset!==undefined&&(!Number.isFinite(clip.sourceOffset)||clip.sourceOffset<0||clip.sourceOffset>=(media.get(project.musicId)?.duration??0))||['fadeIn','fadeOut'].some(k=>clip[k]!==undefined&&(!Number.isFinite(clip[k])||clip[k]<0||clip[k]>10))||['loop','duck'].some(k=>clip[k]!==undefined&&typeof clip[k]!=='boolean')))add('error','music-settings','Music offset, fades or loop settings are invalid.');
 for(const [i,s] of (project.soundEffects||[]).entries()){
  need(s.mediaId,'Sound effect');const m=media.get(s.mediaId);
  if(m&&m.kind!=='audio')add('error','sfx-kind','Sound effect '+(i+1)+' must use an audio asset.');
  if(!Number.isFinite(s.start)||s.start<0||s.start>=project.duration||s.end!==undefined&&(!Number.isFinite(s.end)||s.end<=s.start||s.end>project.duration)||!Number.isFinite(s.volume)||s.volume<0||s.volume>1)add('error','sfx-timing','Sound effect '+(i+1)+' has invalid timing or volume.');
 }
 const ids=new Set();let end=0;
 for(const s of project.scenes){
  if(ids.has(s.id))add('error','duplicate-scene','Duplicate scene ID: '+s.id,s.id);ids.add(s.id);
  if(s.start>end+.04)add('error','scene-gap','Uncovered video between '+end.toFixed(2)+'s and '+s.start.toFixed(2)+'s.',s.id);
  if(s.start<end-.04)add('error','scene-overlap','Scenes overlap at '+s.start.toFixed(2)+'s.',s.id);
  end=s.end;
  if(!Array.isArray(s.words))add('error','words','Scene is missing its narration words.',s.id);
  else for(const w of s.words)if(!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.end<w.start||w.start<s.start-.1||w.end>s.end+.1){add('error','word-timing','Caption timestamps fall outside the scene.',s.id);break;}
  if(s.layers){for(const l of visibleLayers(s)){need(l.mediaId,'Visual',s.id);need(l.effectResultMediaId,'Effect result',s.id);if(['image','video'].includes(l.type)&&!l.mediaId)add('error','empty-visual','Visual layer has no asset: '+l.id,s.id);}}
  else{need(s.mediaId,'Visual',s.id);for(const p of s.pokemon||[])need(p.mediaId,'Character',s.id);}
  if(s.end-s.start>12)add('warning','long-shot','Shot lasts over 12 seconds; review its pacing.',s.id);
 }
 if(Number.isFinite(project.duration)&&Math.abs(end-project.duration)>.04)add('error','scene-tail','Scenes do not cover the full video duration.');
 if(project.visualVersion===3){try{const a=auditVisuals(project);for(const message of a.errors)add('error','visual',message);for(const message of a.warnings)add('warning','visual',message);}catch(e){add('error','visual',e.message);}}
 for(const id of used){const m=media.get(id);if(m&&!m.license?.trim())add('warning','rights','Review source rights for '+(m.name||id)+'.');}
 if(project.pendingRevision)add('warning','pending','An asset request is still waiting for selection.');
 if(project.pipelineReport?.fallbackUsed)add('warning','fallback','Generation used a fallback. Review Pipeline evidence.');
 let canvas;try{canvas=videoMode(project);}catch{}
 return {ready:!issues.some(i=>i.severity==='error'),issues,checkedAt:new Date().toISOString(),canvas:canvas?{width:canvas.width,height:canvas.height,label:canvas.label}:undefined};
}
