import {applySetupShort} from './setup-short.mjs';
import {narrationProp} from './narration-props.mjs';
import {significantMetric,metricDisplay} from './number-salience.mjs';

// Every accent has spoken evidence. No random assets or timer-only insertions.
const motifs=[
 ['crown',/^(king|queen|crowned|kingpin)$/i,'reveal'],
 ['trophy',/^(won|winner|victory|champion)$/i,'victory'],
 ['target',/^(accuracy|accurate|aim)$/i,'click'],
 ['rain',/^(rain|raining)$/i,'whoosh'],
 ['snow',/^(snow|snowing)$/i,'whoosh'],
 ['blocked',/^(failed|fails|failure|blocked)$/i,'impact']
];
const norm=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const signature=card=>card?JSON.stringify([card.kind,card.title,card.rows,card.description]):'';
export function denseCues(project){
 const events=[];
 for(const scene of project.scenes){
  if(scene.manualTemplate||scene.battlePlan)continue;
  for(const w of scene.words||[]){const token=norm(w.captionText||w.text),found=motifs.find(([,re])=>re.test(token));if(found)events.push({sceneId:scene.id,start:w.start,end:Math.min(scene.end,w.start+1.6),kind:'motif',motif:found[0],cue:found[2],quote:w.text,source:'narration'});}
  for(const m of scene.reaction?.metrics||[]){if(!significantMetric(scene,m)||!Number.isFinite(m.start)||m.start<scene.start||m.start>=scene.end||!m.source||m.kind==='base-stat'||m.kind==='percentage'&&m.value>100)continue;events.push({sceneId:scene.id,start:m.start,end:Math.min(scene.end,m.start+2.4),kind:'number',metric:m,cue:'reveal',quote:String(m.value),source:m.source});}
  for(const e of scene.reaction?.entities||[]){if(e.type!=='game'||e.inherited||!e.mediaId)continue;events.push({sceneId:scene.id,start:e.start??scene.start,end:Math.min(scene.end,(e.start??scene.start)+2.4),kind:'logo',mediaId:e.mediaId,cue:'reveal',quote:e.name,source:'named entity'});}
  for(const e of scene.gameLogos||[]){events.push({sceneId:scene.id,start:e.start,end:Math.min(scene.end,e.start+2.4),kind:'logo',mediaId:e.mediaId,cue:'reveal',quote:e.name,source:'named game'});}
 }
 const selected=[];
 for(const e of events.sort((a,b)=>a.start-b.start)){if(e.start<0||e.end-e.start<.15||selected.some(p=>p.sceneId===e.sceneId&&p.kind===e.kind&&p.motif===e.motif&&p.mediaId===e.mediaId&&p.quote===e.quote&&Math.abs(p.start-e.start)<1.4))continue;selected.push(e);}
 return selected;
}
export function applyDenseShort(project,base,{force=false}={}){
 if(!force&&project.shortStyleReport?.densityVersion===1&&project.scenes.every(s=>s.referenceShortApplied===project.shortStyle||s.manualTemplate||s.battlePlan))return project;
 const next=applySetupShort(project,base,{force}),events=denseCues(next),noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
 next.captionStyle={...next.captionStyle,style:'outlined-phrase',fontSize:52,bottom:.23};next.captionColor='#ffffff';
 const report=next.shortStyleReport;
 for(const scene of next.scenes){
  if(scene.manualTemplate||scene.battlePlan)continue;
  scene.captionStyle={...scene.captionStyle,...next.captionStyle};
  // The earlier game-logo pass marks generated logos instructionLocked. Replace
  // those here; preserving them and adding another logo duplicates the visual.
  scene.layers=scene.layers.filter(l=>!(l.role==='game-logo'&&!l.manual&&!l.manualFraming&&l.id.startsWith(scene.id+'-game-logo-')));
  const layers=scene.layers,shots=report.shots.filter(s=>s.sceneId===scene.id);
  // A team is a team, not six images placed in the same two slots.
  for(const shot of shots){const actors=layers.filter(l=>l.role==='subject'&&l.start===shot.start);if(actors.length>2)for(const [i,l] of actors.entries())Object.assign(l,{x:.04+(i%3)*.32,y:.09+Math.floor(i/3)*.24,width:.29,height:.24});}
  for(const bg of layers.filter(l=>l.role==='background'&&l.type==='shape'&&!l.manual)){bg.color='#253342';}
  for(const pattern of layers.filter(l=>l.type==='svg'&&l.role==='environment-depth'&&!l.manual))pattern.svg='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><pattern id="dense-checks" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="100" height="100" fill="#526475"/><rect x="100" y="100" width="100" height="100" fill="#526475"/></pattern></defs><rect width="1080" height="1920" fill="url(#dense-checks)" opacity=".38"/></svg>';
  const sceneEvents=events.filter(e=>e.sceneId===scene.id);
  for(const [i,e] of sceneEvents.entries()){
   const active=layers.filter(l=>l.role==='subject'&&l.start<=e.start&&l.end>e.start),actor=active.at(-1),shot=shots.find(s=>s.start<=e.start&&s.end>e.start),id=scene.id+'-dense-'+i;
   const layer={id,role:'supporting-image',type:'svg',start:e.start,end:e.end,x:.66,y:.08,width:.28,height:.16,z:45,enter:'none',exit:'none',animation:noMotion?'none':'scale-reveal',entranceDuration:.16};
   if(e.kind==='motif'){
    const sourced=narrationProp(next,e.motif);
    if(!sourced){report.warnings.push(scene.id+': no sourced '+e.motif+' picture; no homemade icon substituted.');continue;}
    layer.type='image';layer.mediaId=sourced.id;layer.fit='contain';
    if(e.motif==='crown'&&actor){layer.attachment={targetId:actor.id,anchor:'head',x:.5,y:.09,size:.32};layer.end=Math.min(layer.end,actor.end);}
    else for(const prior of layers.filter(l=>l.id.startsWith(scene.id+'-dense-')&&l.role==='supporting-image'&&!l.attachment&&l.start<e.start&&l.end>e.start))prior.end=e.start;
    layers.push(layer);
   }else if(e.kind==='logo'){
    if(layers.some(l=>l.role==='game-logo'&&l.mediaId===e.mediaId&&l.start<e.end&&l.end>e.start))continue;
    const m=next.media.find(m=>m.id===e.mediaId);if(m){layers.push({...layer,type:'image',mediaId:m.id,role:'game-logo',x:.64,y:.02,width:.32,height:.14,fit:'contain'});}
   }else if(e.kind==='number'){
    const m=e.metric;
    if(m.kind==='percentage'){
     const previous=(scene.reaction?.metrics||[]).filter(p=>p.kind==='percentage'&&p.label===m.label&&p.start<=m.start&&p.source&&Number.isFinite(p.value));
     // Replace the setup metrics panel with a genuine before/after graphic.
     const current=layers.filter(l=>l.setupGraphic?.kind==='metrics'&&l.start<=e.start&&l.end>e.start);
     for(const card of current){card.setupGraphic={kind:'percentage-comparison',title:m.label||'Narrated percentage',rows:previous.slice(-2).map((p,j,a)=>({label:a.length>1?(j?'After':'Before'):'Narrated',value:p.value})),source:'narration',motion:!noMotion};}
     if(!current.length)layers.push({...layer,type:'group',role:'chart',x:.08,y:.48,width:.84,height:.24,setupGraphic:{kind:'percentage-comparison',title:m.label||'Narrated percentage',rows:previous.slice(-2).map((p,j,a)=>({label:a.length>1?(j?'After':'Before'):'Narrated',value:p.value})),source:'narration',motion:!noMotion}});
    }else if(!shot?.card){layers.push({...layer,type:'text',role:'narrated-value',text:metricDisplay(scene,m),x:.06,y:.49,width:.88,height:.15,fontSize:76,color:'#ffffff',fontWeight:900});}
   }
  }
  // Emphasis is timed to actual contrast/verdict words in a held explanation.
  let last=-Infinity;
  for(const w of scene.words||[]){if(!/^(but|instead|however|then|never|dropped|boosts?|stronger|weaker|wins?|loses?)$/i.test(norm(w.text))||w.start-last<1.25)continue;
   const actors=layers.filter(l=>l.role==='subject'&&l.start<=w.start&&l.end>w.start),end=Math.min(scene.end,w.start+.5);if(noMotion||!actors.length||end-w.start<.2)continue;
   // Split actor spans share camera keyframes: apply emphasis across the hold.
   for(const actor of actors){const peers=layers.filter(l=>l.role==='subject'&&l.mediaId===actor.mediaId&&l.keyframes?.[0]?.time===actor.keyframes?.[0]?.time);for(const l of peers){const keys=l.keyframes||[],before=keys.filter(k=>k.time<w.start),after=keys.filter(k=>k.time>end);l.keyframes=[...before,{time:w.start,scale:1.025},{time:(w.start+end)/2,scale:1.09},{time:end,scale:1.035},...after].sort((a,b)=>a.time-b.time);}}
   events.push({sceneId:scene.id,start:w.start,end,kind:'emphasis',cue:'impact',quote:w.text,source:'narration'});last=w.start;
  }
  scene.compositionFamily='dense-explainer';
 }
 // The sound planner consumes these actual visual decisions, not keyword spam.
 const beats=[];let lastSubjects='',lastCard='',lastClip='';
 for(const shot of report.shots){const scene=next.scenes.find(s=>s.id===shot.sceneId);if(scene.manualTemplate||scene.battlePlan)continue;const subjects=shot.subjects.map(s=>s.mediaId).filter(Boolean).join('|'),card=signature(shot.card),clip=shot.clip?.mediaId||'';
  if(subjects&&subjects!==lastSubjects&&!shot.clip)beats.push({start:shot.start,cue:'whoosh',kind:'subject',reason:'Planned subject reveal'});
  if(card&&card!==lastCard)beats.push({start:shot.start,cue:'reveal',kind:'card',reason:'Planned '+shot.card.title+' graphic change'});
  if(clip&&clip!==lastClip)beats.push({start:shot.start,cue:'click',kind:'gameplay',reason:'Cut to matched gameplay evidence'});
  lastSubjects=subjects;lastCard=card;lastClip=clip;
 }
 for(const e of events){if(!next.scenes.find(s=>s.id===e.sceneId)?.layers.some(l=>!l.manual&&(l.id.startsWith(e.sceneId+'-dense-')&&l.start===e.start||e.kind==='emphasis'||e.kind==='number'&&l.setupGraphic&&l.start===e.start)))continue;beats.push({start:e.start,cue:e.cue,kind:e.kind,quote:e.quote,reason:'Planned '+e.kind+' at “'+e.quote+'”'});}
 next.shortStyleReport={...report,densityVersion:1,visualCues:events,soundBeats:beats.sort((a,b)=>a.start-b.start),reviewInterval:2,notice:'Timing rules derived from inspected supplied references. No measured audience retention or model fine-tuning.'};
 return next;
}
