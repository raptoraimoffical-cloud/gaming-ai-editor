import {visibleRanges} from './layer-visibility.mjs';
const roles=new Set(['subject','narrated-action','supporting-image','game-logo']);
export function effectOwners(layer,layers){const exact=layers.find(l=>l.id===layer.effectOwnerId);return [exact,...layers.filter(l=>l.id!==layer.id&&l.id!==exact?.id&&roles.has(l.role)&&(l.actorSourceId===layer.effectOwnerId||layer.effectOwnerMediaId&&l.mediaId===layer.effectOwnerMediaId))].filter(Boolean);}
export function activeEffectOwner(layer,layers,time){return effectOwners(layer,layers).find(l=>visibleRanges(l,l.start,l.end,layers).some(r=>time>=r.start&&time<r.end));}
export function pruneOrphanEffects(project){const next={...project,scenes:project.scenes.map(s=>({...s,...(Array.isArray(s.layers)?{layers:s.layers.map(l=>({...l}))}:{})}))};for(const s of next.scenes){
 if(!Array.isArray(s.layers))continue;
 const removed=new Set(s.deletedLayerIds||[]);s.layers=(s.layers||[]).filter(l=>!removed.has(l.id)&&!removed.has(l.actorSourceId)&&!removed.has(l.effectOwnerId));
 for(const l of s.layers||[])if(l.engagementEffect&&l.id.endsWith('-entrance-ring')&&!l.effectOwnerId){const id=l.id.replace(/-entrance-ring$/,'');l.effectOwnerId=id;l.effectOwnerMediaId=s.layers.find(a=>a.id===id)?.mediaId;}
 s.layers=(s.layers||[]).filter(l=>!l.effectOwnerId||effectOwners(l,s.layers).some(o=>visibleRanges(o,l.start,l.end,s.layers).length));
 }return next;}
