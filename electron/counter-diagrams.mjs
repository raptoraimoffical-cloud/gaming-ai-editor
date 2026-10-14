import {noMotion} from './game-presentation.mjs';
import {mergeRanges} from './layer-visibility.mjs';
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const editable=l=>!l.manual&&!l.manualFraming&&!l.instructionLocked;
export function counterRelations(project){
 const words=project.scenes.flatMap(s=>s.words||[]),mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.mediaId).sort((a,b)=>a.start-b.start),edges=[];
 for(const [i,w] of words.entries()){
  if(!/^(?:counters?|countering|checks?|beats?|threatens?)$/.test(clean(w.text)))continue;
  const boundary=words.filter(a=>a.end<=w.start&&/[.!?;]$/.test(a.text)).at(-1)?.end??0,previous=words.slice(Math.max(0,i-4),i).map(a=>clean(a.text)).join(' ');if(/\b(?:not|never|cant|cannot|doesnt|without)\b/.test(previous))continue;
  const from=mentions.filter(m=>m.end<=w.start+.03&&m.start>=boundary&&w.start-m.end<6).at(-1),sentenceEnd=words.slice(i).find(a=>/[.!?;]$/.test(a.text))?.end??w.start+4,to=mentions.find(m=>m.start>w.start&&m.start<sentenceEnd&&m.start-w.start<4&&m.mediaId!==from?.mediaId);if(!from||!to)continue;
  edges.push({from:from.mediaId,to:to.mediaId,start:to.end,quote:words.filter(a=>a.start>=from.start&&a.end<=to.end+.03).map(a=>a.text).join(' ')});
 }
 return edges;
}
export function clearCounterDiagrams(project){
 const next=structuredClone(project);for(const s of next.scenes){if((s.layers||[]).some(l=>l.counterDiagram&&!editable(l)))continue;s.layers=(s.layers||[]).filter(l=>!l.counterDiagram||!editable(l));for(const l of s.layers)if(l.counterDiagramRanges&&!s.layers.some(a=>a.counterDiagram&&!editable(a)&&a.start<l.end&&a.end>l.start)){l.excludedRanges=(l.excludedRanges||[]).filter(r=>!l.counterDiagramRanges.some(a=>a.start===r.start&&a.end===r.end));delete l.counterDiagramRanges;}}delete next.counterDiagramReport;return next;
}
export function applyCounterDiagrams(project){
 const next=clearCounterDiagrams(project),edges=counterRelations(next),events=[];if(next.autoLayeredActivity===false||/\b(?:no|without|avoid)\s+(?:counter\s+)?(?:arrows|diagrams)\b/i.test(next.editingInstructions||''))return next;
 // Keep linked claims together, but never invent the direction of a cycle.
 const groups=[];for(const e of edges){let g=groups.at(-1);if(!g||e.start-g.at(-1).start>12){g=[];groups.push(g);}g.push(e);}
 for(const [index,g] of groups.entries()){
  const actors=[...new Set(g.flatMap(e=>[e.from,e.to]))];if(actors.length<2||actors.length>4)continue;
  const begin=g[0].start,finish=Math.min(next.duration,g.at(-1).start+3.4,groups[index+1]?.[0].start??next.duration);
  for(const s of next.scenes.filter(s=>s.start<finish&&s.end>begin)){
   if(s.manualTemplate||s.battlePlan||s.layers.some(l=>l.counterDiagram&&!editable(l)&&l.start<finish&&l.end>begin))continue;const start=Math.max(s.start,begin),end=Math.min(s.end,finish),blocked=mergeRanges((s.layers||[]).filter(l=>['gameplay','narrated-action','mechanic-card','moveset-card','chart'].includes(l.role)&&l.start<end&&l.end>start).map(l=>({start:Math.max(start,l.start),end:Math.min(end,l.end)})));
   let spans=[{start,end}];for(const b of blocked)spans=spans.flatMap(r=>r.end<=b.start||r.start>=b.end?[r]:[...(r.start<b.start?[{start:r.start,end:b.start}]:[]),...(r.end>b.end?[{start:b.end,end:r.end}]:[])]);spans=spans.filter(r=>r.end-r.start>=.45);if(!spans.length)continue;
   const IDs=new Map(),centers=actors.length===2?[[.25,.41],[.75,.41]]:actors.length===3?[[.5,.265],[.21,.57],[.79,.57]]:[[.25,.28],[.75,.28],[.25,.57],[.75,.57]];
   for(const [j,mediaId] of actors.entries()){
    const mention=(next.pokemonMentions||[]).find(m=>m.mediaId===mediaId&&m.status==='ready'),activeStart=Math.max(start,mention?.start??start),source=s.layers.find(l=>l.mediaId===mediaId&&l.role==='subject'&&editable(l)),width=actors.length===2?.46:.38,height=actors.length===2?.30:.26,id=s.id+'-counter-cast-'+index+'-'+j;
    const ranges=spans.filter(r=>r.end>activeStart).map(r=>({start:Math.max(r.start,activeStart),end:r.end}));if(!ranges.length)continue;
    for(const old of s.layers.filter(l=>l.mediaId===mediaId&&['subject','supporting-image'].includes(l.role)&&editable(l))){old.excludedRanges=[...(old.excludedRanges||[]),...ranges];old.counterDiagramRanges=[...(old.counterDiagramRanges||[]),...ranges];}
    const [cx,cy]=centers[j],x=cx-width/2,y=cy-height/2;
    s.layers.push({id,counterDiagram:true,type:'image',role:'subject',mediaId,start:activeStart,end,width,height,x,y,z:32,fit:'contain',animation:noMotion(next)?'none':'slide-in-out',direction:j%2?'right':'left',entranceDuration:.22,exit:'fade',exitDuration:.18,easing:'smooth',excludedRanges:blocked,referenceContinuation:activeStart===s.start&&begin<s.start});IDs.set(mediaId,id);
   }
   const visibleEdges=g.filter(e=>IDs.has(e.from)&&IDs.has(e.to)&&e.start<end).map(e=>({...e,from:IDs.get(e.from),to:IDs.get(e.to)}));if(!visibleEdges.length)continue;
   s.layers.push({id:s.id+'-counter-arrows-'+index,counterDiagram:true,type:'group',role:'relationship-diagram',relationEdges:visibleEdges,x:0,y:0,width:1,height:1,z:31,start,end,animation:'none',exit:'none',excludedRanges:blocked});
   for(const e of visibleEdges.filter(e=>e.start>=s.start&&e.start<s.end))events.push({sceneId:s.id,start:e.start,end:Math.min(end,e.start+.4),cue:'whoosh',priority:8,reason:'Arrow reveals the narrated counter relationship'});
  }
 }
 next.counterDiagramReport={edges,events,source:'Explicit narrated relationships; no damage or type matchup inferred'};return next;
}
