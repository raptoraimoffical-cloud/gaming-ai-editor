const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
// Reserve only executable authored actor interactions. Missing props, future
// characters and short cues must not suppress a usable simpler performance.
export function reservedActorAction(project,scene,mediaId,start,end){
 return (scene.editorialPlan?.creativeActions||[]).some((a,i)=>{
  const words=scene.words||[],count=clean(a.quote).split(/\s+/).length,index=a.cueWordIndex??a.wordIndex+count-1,cue=words[index];
  if(!cue||clean(words.slice(a.wordIndex,a.wordIndex+count).map(w=>w.text).join(' '))!==clean(a.quote)||!Number.isFinite(a.duration))return false;
  const finish=Math.min(scene.end,cue.start+a.duration);if(finish-cue.start<Math.max(.3,a.duration*.6)||cue.start>=end||finish<=start)return false;
  if((a.props||[]).some(p=>!project.creativePropAssets?.[scene.id+'/'+i+'/'+p.id]))return false;
  const ids=(a.tracks||[]).filter(t=>!(a.props||[]).some(p=>p.id===t.targetId)).map(t=>t.targetId),entities=scene.reaction?.entities||[];
  if(!ids.some(id=>entities.some(e=>e.id===id&&e.mediaId===mediaId)))return false;
  return ids.every(id=>{const e=entities.find(e=>e.id===id);return e&&e.start<=cue.start&&(scene.layers||[]).some(l=>l.role==='subject'&&l.mediaId===e.mediaId&&!l.manual&&!l.manualFraming&&!l.instructionLocked&&l.start<=cue.start&&l.end>=finish);});
 });
}
