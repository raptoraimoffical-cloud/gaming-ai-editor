import {noMotion} from './game-presentation.mjs';
import {shortform} from './engagement-plan.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {placementFor} from './layer-motion.mjs';
import {reservedActorAction} from './planned-action-windows.mjs';
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function clearEngagementImages(project){const next=structuredClone(project);for(const s of next.scenes)s.layers=(s.layers||[]).filter(l=>!l.engagementCoverage||l.manual||l.instructionLocked);delete next.engagementImageReport;return next;}
// Recover a resolved, actually spoken source subject that a sparse composition
// omitted. This pass never searches arbitrary words, shows future characters,
// revives a fighter mid-action, or duplicates the cast already on screen.
export function applyEngagementImages(project){
 const next=clearEngagementImages(project),added=[];if(!shortform(next)||/\b(?:no|without|avoid) (?:extra |additional )?(?:images|pictures|overlays)\b/i.test(next.editingInstructions||''))return next;
 const w=1080,h=1920;
 for(const s of next.scenes){if(s.manualTemplate||s.deletedLayerIds?.length)continue;
  for(const e of s.reaction?.entities||[]){
   if(typeof e.name!=='string'||e.inherited||!e.mediaId||!['pokemon','person','character','object','hardware'].includes(e.type)||e.start<s.start||e.start>=s.end)continue;
   const media=next.media.find(m=>m.id===e.mediaId);if(!media||!['image','pokemon'].includes(media.kind))continue;
   const narrated=(s.words||[]).some((word,i)=>Math.abs(word.start-e.start)<.1&&clean(s.words.slice(i,i+e.name.split(/\s+/).length).map(w=>w.captionText??w.text).join(' '))===clean(e.name))||(next.pokemonMentions||[]).some(m=>m.status==='ready'&&m.mediaId===e.mediaId&&Math.abs(m.start-e.start)<.15);
   if(!narrated)continue;
   const start=e.start,end=Math.min(s.end,start+2.4);if(end-start<.45||reservedActorAction(next,s,e.mediaId,start,end))continue;
   const active=(s.layers||[]).filter(l=>visibleRanges(l,s.start,s.end,s.layers).some(r=>r.start<=start+.05&&r.end>start+.1)&&placementFor(l,s.layers,next.media,start+.12,w,h).motion.opacity>.08);
   if(active.some(l=>l.mediaId===e.mediaId||l.role==='gameplay'))continue;
   const id=s.id+'-engagement-image-'+Math.round(start*1000)+'-'+e.mediaId;if(s.deletedLayerIds?.includes(id))continue;
   const lead=active.find(l=>['subject','narrated-action'].includes(l.role)),box=lead?{x:lead.x+lead.width/2>.5?.035:.675,y:.12,width:.29,height:.24}:{x:.14,y:.20,width:.72,height:.40};
   s.layers.push({id,engagementCoverage:true,type:'image',role:lead?'supporting-image':'subject',mediaId:media.id,start,end,...box,z:lead?45:30,fit:'contain',animation:noMotion(next)?'none':'scale-reveal',entranceDuration:.18,exit:'none',shadow:true});added.push({sceneId:s.id,layerId:id,mediaId:media.id,start,end,reason:'Show the resolved narrated subject that was missing at its actual cue'});
  }
 }
 next.engagementImageReport={added};return next;
}
