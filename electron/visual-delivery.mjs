import {visibleRanges,mergeRanges} from './layer-visibility.mjs';
import {placementFor} from './layer-motion.mjs';
import {blueprintRequirements,readSceneBlueprints} from './scene-blueprint.mjs';
const normal=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const excluded=new Set(['background','environment-depth','shadow','pixel-effect','game-logo','blueprint-background']);
export function auditVisualDelivery(project){
 const assets=new Map(project.media.map(m=>[m.id,m])),entries=project.scenes.flatMap(s=>(s.layers||[]).filter(l=>l.mediaId&&['image','pokemon','video'].includes(assets.get(l.mediaId)?.kind)&&!excluded.has(l.role)&&assets.get(l.mediaId)?.assetRole!=='logo').flatMap(l=>visibleRanges(l,s.start,s.end,s.layers).map(r=>({s,l,...r}))));
 const canonical=id=>assets.get(id)?.artworkFraming?.sourceId||id;
 const activeAt=t=>entries.filter(e=>{if(e.start>t||e.end<=t)return false;const p=placementFor(e.l,e.s.layers,project.media,t,1080,1920,project.fps||30,!!project.freezePokemonMotion);return p.motion.opacity>.12&&p.width*p.height>.0005;});
 const reports=project.visualInstructionReport?.applied||[],expected=project.visualInstructionPlan?.length?project.visualInstructionPlan:blueprintRequirements(project),missing=[],satisfied=[];
 for(const r of expected){
  const delivered=reports.find(a=>a.kind===r.kind&&(normal(a.name)===normal(r.name)||r.kind==='group'&&r.members?.every(m=>a.members?.some(n=>normal(m.name)===normal(n.name)))));
  if(!delivered){missing.push({kind:r.kind,name:r.name,reason:'The requested visual has no delivered timeline result'});continue;}
  if(r.kind==='image'){
   const mediaIds=new Set(project.scenes.flatMap(s=>(s.layers||[]).filter(l=>delivered.layerIds?.includes(l.id)).map(l=>canonical(l.mediaId))));
   const visible=entries.some(e=>mediaIds.has(canonical(e.l.mediaId))&&e.end>delivered.start&&e.start<delivered.end&&activeAt(Math.min(e.end-.02,Math.max(e.start+.2,delivered.start+.2))).some(a=>a.l.id===e.l.id&&a.l.width*a.l.height>.02));
   if(!visible)missing.push({kind:r.kind,name:r.name,reason:'The requested photo was acquired but is not visibly on screen at its cue'});else satisfied.push({kind:r.kind,name:r.name});
  }else{
   const members=delivered.members||[],pages=Math.ceil(members.length/6),at=[.25,.5,.75,...Array.from({length:pages},(_,i)=>(i+.5)/pages)].map(f=>delivered.start+(delivered.end-delivered.start)*f),shown=at.map(t=>{const visible=new Set(activeAt(t).map(e=>canonical(e.l.mediaId))),texts=normal(project.scenes.flatMap(s=>(s.layers||[]).filter(l=>l.type==='text'&&visibleRanges(l,t,t+.001,s.layers).length&&(l.opacity??1)>.12).map(l=>l.text||'')).join(' '));return new Set(members.filter(m=>{const required=r.members.find(n=>normal(n.name)===normal(m.name));return required&&visible.has(canonical(m.mediaId))&&(!required.item||m.itemId&&visible.has(canonical(m.itemId)))&&(required.facts||[]).every(f=>texts.includes(normal(f)));}).map(m=>m.name));}),complete=members.length===(r.members||[]).length&&(members.length<=6?shown.some(set=>set.size===members.length):members.every(m=>shown.some(set=>set.has(m.name))));
   if(!complete)missing.push({kind:r.kind,name:r.name,reason:'The complete supplied team and items are never visible together during its requested hold'});else satisfied.push({kind:r.kind,name:r.name,members:members.length});
  }
 }
 const blueprints=readSceneBlueprints(project.editingInstructions||'');for(const b of blueprints)if(!project.sceneBlueprintReport?.applied?.some(a=>a.id===b.id))missing.push({kind:'scene',name:b.title,reason:project.sceneBlueprintReport?.missing?.find(m=>m.id===b.id)?.reason||'The supplied scene instruction was not executed'});
 for(const r of project.sceneBlueprintReport?.missing||[])if(!r.id)missing.push({kind:'source',name:r.title||r.kind||'Scene source',reason:r.reason});
 const logoOnly=[];for(let t=0;t<project.duration;t+=.25){const s=project.scenes.find(s=>s.start<=t&&s.end>t);if(!s||activeAt(t+.03).length)continue;
  const realData=(s.layers||[]).some(l=>(['bar','ring'].includes(l.type)&&Number.isFinite(l.value)||l.type==='line'&&l.points?.length>1&&l.points.every(Number.isFinite)||l.blueprintEffect?.kind==='counter'&&l.blueprintEffect.values?.length)&&(l.opacity??1)>.12&&visibleRanges(l,t,t+.001,s.layers).length);if(realData)continue;
  const logos=(s.layers||[]).filter(l=>l.role==='game-logo'||assets.get(l.mediaId)?.assetRole==='logo');if(logos.some(l=>visibleRanges(l,t,Math.min(project.duration,t+.25),s.layers).length))logoOnly.push({start:t,end:Math.min(project.duration,t+.25)});}
 const logoOnlySpans=mergeRanges(logoOnly).filter(r=>r.end-r.start>2.25),distinctSourceImages=new Set(entries.filter(e=>{const p=placementFor(e.l,e.s.layers,project.media,(e.start+e.end)/2,1080,1920,project.fps||30,!!project.freezePokemonMotion);return p.motion.opacity>.12&&p.width*p.height>.0005;}).map(e=>canonical(e.l.mediaId))).size;
 return {version:1,requested:expected.length+blueprints.length,satisfied,missing,logoOnlySpans,distinctSourceImages,complete:missing.length===0,notice:'Checks delivered timeline visibility and instruction coverage; not a prediction of viewer retention or creative quality.'};
}
