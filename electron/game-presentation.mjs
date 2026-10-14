import {selectedGame,sceneGame,gameSegments} from './game-selection.mjs';
// Narration chooses the franchise unless the user chooses it explicitly.
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function projectGame(project){
 return selectedGame(project);
}
export function isBackPokemon(m){return !!m?.pokemon&&/(?:^|[/_. -])back(?:[/_. -]|$)|rear[ -]view/i.test([m.pokemon.sourceKey,m.pokemon.sourceUrl,m.identity?.variant,m.name].filter(Boolean).join(' '));}
export function requestsBackView(scene){return /\b(?:back|rear)[ -](?:sprite|view|facing|side)|\bfrom behind\b|\bback of\b|\b(?:its|their|his|her) back\b|\b[\w-]+['’]s back\b|\b(?:show|look at|looking at|talk about|talking about) (?:the )?back\b/i.test(scene.text||'');}
export const noMotion=p=>/\b(?:no|without|avoid|disable)\s+(?:all\s+)?(?:motion|animations?|movement)\b|\b(?:do not|don['?]?t|never|stop)\s+(?:animate|animating|adding animations)\b|\bkeep (?:the |all )?(?:images|pictures|characters|pokemon) (?:still|static)\b/i.test(p.editingInstructions||'');
export function backgroundTopic(scene,project){
 const mechanic=(project.shortMechanics?.cues||[]).find(c=>c.sceneId===scene.id&&c.kind==='move');
 const text=norm(scene.text||'').replace(/\bmake\s+it\s+rain\b/g,'');
 if(/ice[ -]?beam|snow|hail|blizzard|frozen|freeze/.test(text))return 'ice';
 if(/flam[e]? ?thrower|fire blast|burn|flames?|volcano|lava/.test(text))return 'fire';
 if(/water gun|hydro pump|surf|ocean|rain|river|waterfall/.test(text))return 'water';
 if(/thunderbolt|electric|lightning/.test(text))return 'electric';
 if(/forest|jungle|leaf blade|grass|leaves/.test(text))return 'grass';
 if(mechanic&&['fire','water','electric','ice','grass','psychic','ghost'].includes(mechanic.type))return mechanic.type;
 return 'game';
}
export function patternSVG(game,topic='game'){
 const colors={fire:['#522d27','#241b24'],water:['#153f58','#101f36'],electric:['#3d3a25','#1d2331'],ice:['#2c475b','#172737'],grass:['#284637','#162d2a'],psychic:['#3d2b55','#251c38'],ghost:['#332746','#171d2c']},palette=colors[topic]||[game==='pokemon'?'#173b56':'#23382e','#111e2b'];
 const atmosphere=topic==='water'?'<path d="M-80 1680Q220 1580 520 1680T1320 1680M-80 1790Q220 1690 520 1790T1320 1790" fill="none" stroke="#80d4e5" stroke-width="9" opacity=".12"/>':topic==='grass'?'<path d="M0 2160V1780L80 1620 160 1780 230 1550 310 1760 390 1650 480 1790 600 1530 710 1770 810 1620 930 1790 1060 1550 1200 1760V2160Z" fill="#77bd91" opacity=".08"/>':topic==='electric'?'<path d="M90 250L190 480 140 460 210 640M990 1250L1100 1450 1040 1440 1130 1640" fill="none" stroke="#f3db7e" stroke-width="9" opacity=".12"/>':'';
 const symbol=game==='pokemon'?'<g fill="none" stroke="#b6d6ee" stroke-width="4"><circle cx="70" cy="70" r="40"/><path d="M30 70H110"/><circle cx="70" cy="70" r="12" fill="#132f48"/><circle cx="70" cy="70" r="5"/></g>':'<path d="M34 54L70 34L106 54V94L70 115L34 94Z M34 54L70 75L106 54 M70 75V115" fill="none" stroke="#abcba8" stroke-width="4"/><path d="M37 55L70 37L102 55L70 73Z" fill="#97ba89"/>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2160"><defs><pattern id="game-pattern" width="180" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">'+symbol+'</pattern><radialGradient id="quiet"><stop stop-color="'+palette[0]+'"/><stop offset="1" stop-color="'+palette[1]+'"/></radialGradient></defs><rect width="1200" height="2160" fill="url(#quiet)"/><rect width="1200" height="2160" fill="url(#game-pattern)" opacity=".16"/>'+atmosphere+'</svg>';
}
const imageLayer=l=>['image','video'].includes(l.type)&&!['background','environment-depth'].includes(l.role)&&l.opacity!==0;
// A temporary trophy, attack overlay or reaction may explain a beat, but it
// must never replace the narrated subject when that accent finishes.
const carryable=m=>m?.license&&!['reaction-gif','narration-prop','move-art'].includes(m.assetRole)&&m.identity?.franchise!=='reaction'&&!isBackPokemon(m);
export function applyGamePresentation(project){
 const game=projectGame(project),next={...project,scenes:project.scenes.map(s=>({...s,layers:[...(s.layers||[])]}))},report={version:1,game,patternScenes:[],introImages:[],warnings:[]};
 if(!game)return next;
 const motion=!noMotion(next),preserveBackground=['upload','generate'].includes(next.creationAssets?.backgroundMode);
 let previous,heldTopic='game',heldGame;
 for(const [index,s] of next.scenes.entries()){
  if(s.manualTemplate||s.battlePlan)continue;
  const requestedTopic=backgroundTopic(s,next);
  const local=sceneGame(next,s,heldGame||game),logo=next.media.find(m=>m.assetRole==='logo'&&m.identity?.franchise===local&&(local!=='pokemon'||m.identity?.subject==='pokemon-brand'));
  if(heldGame&&heldGame!==local)previous=undefined;
  if(heldGame!==local)heldTopic='game';
  if(requestedTopic!=='game')heldTopic=requestedTopic;
  else if((s.reaction?.entities||[]).some(e=>!e.inherited&&e.type==='pokemon')&&index>0)heldTopic='game';
  const topic=heldTopic;heldGame=local;
  s.layers=s.layers.filter(l=>!l.id.startsWith(s.id+'-presentation-'));
  const segments=gameSegments(next,s,heldGame||game);
  if(next.gamePatterns!==false&&segments.every(p=>['pokemon','minecraft'].includes(p.game))&&!preserveBackground&&!s.layers.some(l=>l.role==='background'&&(l.manual||l.manualFraming||l.instructionLocked))){
   // Keep gameplay proof intact. A muted explainer pattern serves every other span.
   const clips=s.layers.filter(l=>l.role==='background'&&l.type==='video'&&s.layers.some(g=>g.role==='gameplay'&&g.start===l.start));
   s.layers=s.layers.filter(l=>!['background','environment-depth'].includes(l.role)||l.manual||clips.includes(l));
   const bounds=[...new Set([s.start,s.end,...segments.map(p=>p.start),...clips.flatMap(l=>[l.start,l.end])])].sort((a,b)=>a-b);
   for(let i=0;i<bounds.length-1;i++){const start=bounds[i],end=bounds[i+1];if(end-start<.03||clips.some(l=>l.start<=start&&l.end>=end))continue;
    const activeGame=segments.find(p=>p.start<=start&&p.end>start)?.game||local;
    s.layers.push({id:s.id+'-presentation-pattern-'+i,type:'svg',role:'background',svg:patternSVG(activeGame,topic),x:-.06,y:-.06,width:1.12,height:1.12,z:0,start,end,fit:'cover',animation:'none',enter:'none',exit:'none',easing:'linear',...(motion?{keyframes:[{time:0,x:-.06,y:-.06},{time:next.duration,x:0,y:-.02}]}:{})});
   }
   s.backgroundTheme=local;s.backgroundConcept='Subtle moving '+(local==='pokemon'?'Poke Ball':'Minecraft block')+' pattern ('+topic+' theme)';report.patternScenes.push(s.id);
  }
  const meaningful=s.layers.filter(l=>imageLayer(l)||l.setupGraphic||l.role==='chart'),bounds=[...new Set([s.start,s.end,...(s.reaction?.entities||[]).map(e=>e.start).filter(t=>t>s.start&&t<s.end),...meaningful.flatMap(l=>[Math.max(s.start,l.start),Math.min(s.end,l.end)])])].sort((a,b)=>a-b);
  const candidates=(s.reaction?.entities||[]).filter(e=>e.mediaId).map(e=>next.media.find(m=>m.id===e.mediaId)).filter(carryable);
  for(let i=0;i<bounds.length-1;i++){const start=bounds[i],end=bounds[i+1];if(end-start<.35||meaningful.some(l=>l.start<=start&&l.end>=end))continue;
   const missing=(s.reaction?.entities||[]).find(e=>!e.inherited&&e.type!=='game'&&(e.start??s.start)<=start&&!next.media.some(m=>m.id===e.mediaId));
   const spokenCandidate=(s.reaction?.entities||[]).filter(e=>(e.start??s.start)<=start&&e.mediaId).map(e=>next.media.find(m=>m.id===e.mediaId)).find(carryable);
   const established=meaningful.filter(l=>imageLayer(l)&&['subject','story-picture','supporting-image','game-logo'].includes(l.role)&&l.end<=start&&carryable(next.media.find(m=>m.id===l.mediaId))).at(-1),m=missing?logo:(established&&next.media.find(m=>m.id===established.mediaId))||(!index?logo:undefined)||spokenCandidate||previous||logo;
   if(!m){report.warnings.push(s.id+': no verified related intro image; import a game logo or subject.');continue;}
   const isLogo=m.assetRole==='logo';s.layers.push({id:s.id+'-presentation-hook-'+i,type:m.kind==='video'?'video':'image',role:isLogo?'game-logo':'subject',mediaId:m.id,x:.06,y:isLogo?.28:.13,width:.88,height:isLogo?.28:.53,z:20,start,end,fit:'contain',animation:motion?'scale-reveal':'none',entranceDuration:.16,enter:'none',exit:'none',...(motion?{keyframes:[{time:start,scale:1},{time:end,scale:1.035}]}:{})});
   report.introImages.push({sceneId:s.id,mediaId:m.id,start,end,reason:isLogo?'Game identity for an empty hook':'Related narrated subject carried through connecting speech'});
  }
  previous=candidates.at(-1)||previous;
 }
 return {...next,gamePresentationReport:report};
}
