import {videoMode} from './video-modes.mjs';
import {beatWords} from './reactions.mjs';
const games=['Valorant','Counter-Strike','Fortnite','Minecraft','Apex Legends','League of Legends','Overwatch','Rocket League','Call of Duty','Dota'];
const stopwords=new Set('the and this that with from into your their they player great round video game gaming wins has have was were for are but not you timing'.split(' '));
export function plan(segments,media,duration){
 return beatWords(segments).flatMap((s,index)=>{
  const words=s.words || []; const chunks=[];
  for(let i=0;i<words.length;i+=32)chunks.push(words.slice(i,i+32));
  if(!chunks.length)chunks.push([]);
  return chunks.map((ws,j)=>{
   const text=ws.length?ws.map(w=>w.text).join(' '):s.text;
   const game=games.find(g=>text.toLowerCase().includes(g.toLowerCase()));
   const tokens=[...new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(t=>!stopwords.has(t));
   const candidates=media.filter(m=>['video','image'].includes(m.kind)&&m.license.trim()).map(m=>{const indexed=new Set((m.tags+' '+m.name).toLowerCase().match(/[a-z0-9]{3,}/g)||[]);return {m,score:tokens.filter(t=>indexed.has(t)).length};}).sort((a,b)=>b.score-a.score);
   const best=candidates[0]; const start=j===0?s.start:ws[0].start;
   const end=j===chunks.length-1?s.end:chunks[j+1][0].start;
   const kind=/\b(top|rank|best|number)\b/i.test(text)?'ranking':/\b(vs|versus|compared|better)\b/i.test(text)?'comparison':/\d/.test(text)?'statistic':'story';
   return {id:`scene-${index}-${j}`,start,end,text,title:game||text.split(/[.!?]/)[0].split(' ').slice(0,9).join(' '),kind,words:ws,mediaId:best?.score>=2?best.m.id:undefined,match:best?.score>=2?`Matched ${best.score} indexed keywords`:'No confident media match — typography scene'};
  });
 }).map((s,i,all)=>({...s,start:i===0?0:s.start,end:i===all.length-1?duration:all[i+1].start}));
}
export function validateProject(p){
 if(!p || !Array.isArray(p.media)||!Array.isArray(p.scenes)||!Number.isFinite(p.duration)||p.duration<=0)throw Error('Invalid project');
 videoMode(p);
 if(!p.media.some(m=>m.id===p.voiceId))throw Error('Voiceover missing');
 if(!p.scenes.length)throw Error('No speech scenes. Try a clearer voiceover.');
 for(const f of p.soundEffects||[])if(f.volumeRanges&&(!Array.isArray(f.volumeRanges)||f.volumeRanges.some(r=>![r.start,r.end,r.volume].every(Number.isFinite)||r.start<0||r.end<=r.start||r.end>p.duration+.01||r.volume<0||r.volume>1)))throw Error('Invalid patch audio volume range');
 if(p.editingInstructions!==undefined&&(typeof p.editingInstructions!=='string'||p.editingInstructions.length>64000))throw Error('Editing Instructions must be text of at most 64000 characters');
 for(const s of p.scenes)for(const r of s.captionStyleRanges||[])if(![r.start,r.end].every(Number.isFinite)||r.start<s.start||r.end>s.end||r.end<=r.start||!r.style||typeof r.style!=='object')throw Error('Invalid caption style range');
 for(const r of p.musicClip?.mutedRanges||[])if(![r.start,r.end].every(Number.isFinite)||r.start<0||r.end>p.duration||r.end<=r.start)throw Error('Invalid music mute range');
 for(const style of [p.captionStyle,...p.scenes.map(s=>s.captionStyle),...p.scenes.flatMap(s=>(s.captionStyleRanges||[]).map(r=>r.style))].filter(Boolean)){if(style.fontSize!==undefined&&(!Number.isFinite(style.fontSize)||style.fontSize<16||style.fontSize>100)||style.wordsPerGroup!==undefined&&(!Number.isInteger(style.wordsPerGroup)||style.wordsPerGroup<1||style.wordsPerGroup>12)||['minimal','enabled'].some(k=>style[k]!==undefined&&typeof style[k]!=='boolean'))throw Error('Invalid caption styling');}
 for(const s of p.scenes)for(const l of s.layers||[])for(const key of ['entranceDuration','exitDuration'])if(l[key]!==undefined&&(!Number.isFinite(l[key])||l[key]<.03||l[key]>3))throw Error('Invalid animation duration');
 for(const s of p.scenes)for(const l of s.layers||[]){
  if(l.mediaOffset!==undefined&&(!Number.isFinite(l.mediaOffset)||l.mediaOffset<0))throw Error('Invalid visual source offset');
  if(l.excludedRanges&&(!Array.isArray(l.excludedRanges)||l.excludedRanges.some(r=>![r.start,r.end].every(Number.isFinite)||r.start<0||r.end<=r.start||r.end>p.duration+.01)))throw Error('Invalid patch visibility range');
  if(l.videoStart!==undefined||l.videoEnd!==undefined){const m=p.media.find(m=>m.id===l.mediaId),a=l.videoStart??0,b=l.videoEnd??m?.duration;if(l.type!=='video'||!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a||b>(m?.duration??0)+.05)throw Error('Invalid gameplay source timing');}
  if(l.setupGraphic&&(!['move','ability','type','nature','stats','metrics','percentage-comparison','electric-flow','move-badge'].includes(l.setupGraphic.kind)||typeof l.setupGraphic.title!=='string'||l.setupGraphic.rows?.some(r=>typeof r.label!=='string'||!Number.isFinite(r.value))))throw Error('Invalid setup graphic');
 }
 for(const s of p.scenes)if(!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>p.duration+0.1)throw Error('Invalid scene timing');
 for(const s of p.scenes)for(const sprite of s.pokemon||[]){if(!Number.isFinite(sprite.start)||!Number.isFinite(sprite.end)||sprite.start<s.start-0.01||sprite.end>s.end+0.01||sprite.end<=sprite.start)throw Error('Invalid Pokémon sprite timing');if(!p.media.some(m=>m.id===sprite.mediaId&&m.pokemon))throw Error('Pokémon sprite asset missing');}
 for(const s of p.scenes)for(const l of s.layers||[]){if(!['image','video','text','shape','bar','svg','particles','group','ring','line'].includes(l.type)||![l.x,l.y,l.width,l.height,l.z,l.start,l.end].every(Number.isFinite)||l.width<=0||l.height<=0||l.start<s.start-.01||l.end>s.end+.01||l.end<=l.start)throw Error('Invalid visual layer');if(l.mediaId&&!p.media.some(m=>m.id===l.mediaId))throw Error('Visual layer asset missing');if(['scale','scaleX','scaleY','rotation','opacity','value','particleCount'].some(k=>l[k]!==undefined&&!Number.isFinite(l[k])))throw Error('Invalid layer transform');if(l.points&&(!Array.isArray(l.points)||l.points.length<2||l.points.some(p=>!Number.isFinite(p))))throw Error('Invalid chart points');if(l.keyframes&&(!Array.isArray(l.keyframes)||l.keyframes.some((k,i,a)=>!Number.isFinite(k.time)||(i>0&&k.time<=a[i-1].time)||['x','y','width','height','scale','scaleX','scaleY','rotation','opacity'].some(f=>k[f]!==undefined&&(!Number.isFinite(k[f])||['width','height'].includes(f)&&k[f]<=0)))))throw Error('Invalid layer keyframes');}
 for(const s of p.scenes){const ids=new Set();for(const l of s.layers||[]){if(ids.has(l.id))throw Error('Duplicate layer ID');ids.add(l.id);let current=l;const seen=new Set();while(current.parentId){if(seen.has(current.id))throw Error('Cyclic layer parents');seen.add(current.id);current=s.layers.find(a=>a.id===current.parentId);if(!current)throw Error('Missing layer parent');}}}
 if(p.quickPatchRanges&&(!Array.isArray(p.quickPatchRanges)||p.quickPatchRanges.some(r=>![r.start,r.end].every(Number.isFinite)||r.start<0||r.end<=r.start||r.end>p.duration+.01)))throw Error('Invalid saved patch range');
 for(const f of p.soundEffects||[])if(f.sourceOffset!==undefined&&(!Number.isFinite(f.sourceOffset)||f.sourceOffset<0))throw Error('Invalid sound source offset');
 return p;
}
