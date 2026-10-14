export function sameAudio(a,b){if(!a||!b)return false;return a.id===b.id||!!(a.contentHash&&b.contentHash&&a.contentHash===b.contentHash)||!!(a.audioFingerprint&&b.audioFingerprint&&a.audioFingerprint===b.audioFingerprint)||!!(a.path&&b.path&&a.path.replaceAll('\\','/').toLowerCase()===b.path.replaceAll('\\','/').toLowerCase())||!!(a.url&&b.url&&a.url===b.url);}
export function audioRouting(project){
 const voice=project.media.find(m=>m.id===project.voiceId),candidate=project.media.find(m=>m.id===project.musicId);
 const music=candidate&&!sameAudio(candidate,voice)&&candidate.assetRole!=='narration'?candidate:undefined,seen=[];
 const effects=(project.soundEffects||[]).filter(f=>{const m=project.media.find(m=>m.id===f.mediaId);if(!m||sameAudio(m,voice)||m.assetRole!=='sound-effect')return false;if(seen.some(s=>sameAudio(s.media,m)&&Math.abs(s.start-f.start)<1/30+.0001))return false;seen.push({media:m,start:f.start});return true;});
 return {voice:project.narrationMuted?undefined:voice,music,effects};
}
export function effectVolumeAt(effect,time,project){let volume=(effect.volumeRanges||[]).filter(r=>time>=r.start&&time<r.end).at(-1)?.volume??effect.volume;const ramp=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};if(effect.fadeIn)volume*=ramp((time-effect.start)/effect.fadeIn);if(effect.fadeOut&&effect.end!==undefined)volume*=ramp((effect.end-time)/effect.fadeOut);if(effect.duck&&project?.scenes.some(s=>s.words?.some(w=>time>=w.start-.08&&time<w.end+.12)))volume*=.6;return volume;}
export function musicVolumeAt(project,time){
 const clip=project.musicClip||{},start=clip.start??0,media=project.media.find(m=>m.id===project.musicId),end=Math.min(clip.end??project.duration,clip.loop===false?start+Math.max(0,(media?.duration??0)-(clip.sourceOffset??0)):project.duration);
 if(time<start||time>=end||(clip.mutedRanges||[]).some(r=>time>=r.start&&time<r.end))return 0;
 const ramp=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);},fadeIn=clip.fadeIn??0,fadeOut=clip.fadeOut??0;
 const fade=(fadeIn?ramp((time-start)/fadeIn):1)*(fadeOut?ramp((end-time)/fadeOut):1);
 let speech=0;if(clip.duck!==false)for(const s of project.scenes)for(const w of s.words||[])speech=Math.max(speech,Math.min(ramp((time-w.start+.12)/.12),ramp((w.end+.2-time)/.12)));
 return Math.max(0,Math.min(1,project.musicVolume??.08))*fade*(1-.4*speech);
}
