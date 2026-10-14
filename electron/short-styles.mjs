import {preferredPokemonImage,pokemonImageMode} from './pokemon-image-policy.mjs';
import {assetIdentity} from './asset-identity.mjs';
import {normalize} from './reactions.mjs';
import {applySetupShort,setupCaptionStyle} from './setup-short.mjs';
import {applyDenseShort} from './dense-short.mjs';
import {isBackPokemon,requestsBackView,applyGamePresentation} from './game-presentation.mjs';

export const SHORT_STYLES={
 'pokemon-dense':{
  name:'Pokemon layered Short (gold references)',
  instructions:'REFERENCE SHORT STYLE: Use a vertical Pokemon strategy, news or story Short based on the three supplied gold references. Plan the hook, context, interaction, evidence and payoff before composing. Keep the main subject visible while adding meaningful supporting Pokemon, game logos, held items, sourced move/ability cards, meaningful narrated numbers and animated percentage comparisons at aligned spoken cues. Use short outlined phrase captions, large artwork, a consistent patterned background, animated actions and their narrated consequences, layered reveals, smooth transitions and deliberate punch-ins at contrast/verdict words. Team explanations can keep up to six related Pokemon visible. Review visual attention about every two seconds; choose a supported reveal, callout, metric or camera emphasis, and hold useful gameplay evidence when appropriate. Accent actual visual changes with quiet varied sounds; do not trigger a sound for every ordinary word or add unrelated images on a timer. Preserve narration and timing, explicit overrides and manual compositions.',
  reference:{filenames:['I-Used-a-Diabolical-Pokemon-Strategy','You-NEED-to-Know-This-About-Pokemon-Champions','Charizard-s-Villain-Arc'],aspect:'9:16',sampleInterval:.5,notice:'Derived from locally inspected supplied videos, transcripts and mixed-audio transient analysis. Transients are not isolated SFX counts; viewer retention is not available.'}
 },
 'pokemon-setup':{
  name:'Pokemon setup Short (Sceptile reference)',
  instructions:'REFERENCE SHORT STYLE: Use a vertical Pokemon battle setup explainer based on the Sceptile reference. Plan hook, problem, ability interaction, build, battle evidence and caveat before composing. Use yellow outlined 1-3 word phrase captions. Alternate meaningful user-supplied gameplay proof with large official artwork on a consistent turquoise patterned explainer background. Use original published move and ability name-and-description images found through Google Images, never redrawn information cards, item attachments, real nature mint images and animated base-stat rows only when those details are discussed. Match gameplay clips to their supplied exact spoken cues and source in/out times. Reveal Pokemon and held items at spoken cues. Keep related partners together, hold evidence while explaining it, and use brief scale/slide entrances and subtle continuous zoom. Accent reveals and transitions with quiet pops, swooshes and relevant move/game sounds. Never insert unrelated footage, generic key-point cards, invented stats or arbitrary two-second picture replacements. Preserve narration and timing. Respect explicit user overrides and manual objects.',
  reference:{filename:'MEGA-SCEPTILE-IS-UNSTOPPABLE-WITH-THE-RIGHT-SETUP',duration:87.121,aspect:'9:16',captionDefault:'yellow-phrase',notice:'Based on inspected frames and word timings of the supplied reference. This preset is editing logic, not fine-tuned model weights or measured viewer retention.'}
 },
 'pokemon-artwork':{
  name:'Pokemon artwork Short (reference)',
  instructions:'REFERENCE SHORT STYLE: Use a vertical 9:16 Pokemon artwork explainer. Use large, transparent official artwork rather than tiny sprites. Keep a real, softly blurred game environment behind the artwork. Reuse scenery across the explanation. Reveal subjects at their spoken cues; stack two related Pokemon vertically for comparisons and evolutions. Hold a useful comparison while discussing it. Use short slide/reveal entrances, restrained continuous zoom and a brief emphasis at narrated details or verdicts. Do not replace pictures just because two seconds elapsed. Do not add automatic headings, key-point cards, captions or charts without actual narrated data. Preserve narration and timing. Respect explicit user overrides and manual objects.',
  reference:{filename:'Pokemon-That-Look-WORSE-When-They-Evolve',duration:71.308,aspect:'9:16',sampleInterval:.25,medianCutCandidateInterval:4.25,captionDefault:'off',notice:'Based on inspected reference frames and word timings. Cut intervals are visual proxies, not attention or retention measurements.'}
 }
};
export function configureShortStyle(project,id=project.shortStyle){
 if(!id)return project;if(!Object.hasOwn(SHORT_STYLES,id))throw Error('Unknown Shorts editing style');
 const profile=SHORT_STYLES[id];
 const captions=/\b(?:enable|show|add|keep)\s+(?:the\s+)?(?:captions|subtitles)\b/i.test(project.editingInstructions||'');
 const editingInstructions=[...(project.editingInstructions||'').split('\n').filter(line=>!line.startsWith('REFERENCE SHORT STYLE:')),profile.instructions].filter(Boolean).join('\n');
 return {...project,shortStyle:id,format:'vertical',videoMode:'youtube-shorts',captionStyle:['pokemon-setup','pokemon-dense'].includes(id)?setupCaptionStyle({...project,editingInstructions}):{...project.captionStyle,style:undefined,enabled:captions},editingInstructions};
}
const visual=m=>m&&['pokemon','image','video'].includes(m.kind)&&(m.license||m.provider==='google-images'&&m.decoded&&m.webAssessment?.autoEligible);
function subjectMedia(entity,scene,project){
 const usable=m=>visual(m)&&!['reaction-gif','narration-prop','move-art'].includes(m.assetRole)&&m.identity?.franchise!=='reaction'&&(!isBackPokemon(m)||requestsBackView(scene));
 const override=project.media.find(m=>m.id===scene.visualOverrides?.[entity.id]);if(usable(override))return override;
 const uploaded=(project.creationAssets?.imageIds||[]).map(id=>project.media.find(m=>m.id===id)).find(m=>usable(m)&&[m.pokemon?.name,assetIdentity(m).subject].some(n=>normalize(n)===normalize(entity.id)||normalize(n)===normalize(entity.name)));
 const current=project.media.find(m=>m.id===entity.mediaId);
 const preferred=entity.type==='pokemon'&&current?preferredPokemonImage(current.pokemon?.name||entity.id,scene,project):undefined;
 return uploaded||(usable(preferred)?preferred:usable(current)?current:isBackPokemon(current)?project.media.find(m=>usable(m)&&m.pokemon?.name===entity.id):undefined);
}
function scenery(scene,project,previous){
 const chosen=project.media.find(m=>m.id===project.creationAssets?.backgroundMediaId);
 if(visual(chosen))return chosen;
 if(project.creationAssets?.backgroundMode==='generate'){
  const l=(scene.layers||[]).find(l=>l.role==='background'&&l.mediaId),m=project.media.find(m=>m.id===l?.mediaId);if(visual(m))return m;
 }
 const pool=project.media.filter(m=>visual(m)&&!m.pokemon&&m.assetRole==='background'&&assetIdentity(m).franchise==='pokemon');
 const setting=/\b(water|lake|beach|ocean|forest|cave|stadium|arena)\b/i.exec(scene.text)?.[1];
 const match=setting&&pool.find(m=>new RegExp('\\b'+setting+'\\b','i').test(m.name+' '+m.tags));
 return match||previous||project.media.find(m=>m.id===scene.gameBackgroundId)||pool[0];
}
// Plan the complete subject sequence before making any layers. Named mentions
// change the cast; connecting sentences retain it. Timers alone never add media.
export function planReferenceShort(project){
 const shots=[],warnings=[];let cast=[],background,anchorEntityId;
 for(const scene of project.scenes){
  background=scenery(scene,project,background);
  const entities=(scene.reaction?.entities||[]).filter(e=>{const m=project.media.find(m=>m.id===e.mediaId);return !e.inherited&&e.type!=='game'&&!['reaction-gif','narration-prop','move-art'].includes(m?.assetRole)&&m?.identity?.franchise!=='reaction'&&!(['pokemon-setup','pokemon-dense'].includes(project.shortStyle)&&project.shortMechanics?.cues.some(c=>normalize(c.title)===normalize(e.name)));}).map(e=>{
   const ws=(scene.words||[]).filter(w=>w.end<=e.start),lastBoundary=ws.findLastIndex(w=>/[.!?]$/.test(w.text)),before=ws.slice(Math.max(lastBoundary+1,ws.length-9)).map(w=>normalize(w.text)).join(' ');
   const target=e.type==='pokemon'&&/\b(?:ohko|one shot|beats?|counters?|handles?|against|outspeeds?|defeats?|dealing with|take on|hits?|attacks?)\b/.test(before);
   return {...e,...(target?{supportUntil:(e.end??e.start)+2.8}:{})};
  });
  const comparison=/\b(evolv\w*|pre[- ]evolution\w*|versus|vs|compared?|both|these two|better than|worse than|dethron\w*)\b/i.test(scene.text)||scene.reaction?.intent==='comparison'||project.shortStyle==='pokemon-setup'&&/\b(partner|alongside|faster than|slower than|in front of|with .* (?:boost|attack)|boost.*(?:on|to))\b/i.test(scene.text);
  const byTime=new Map();for(const e of entities){const time=Math.max(scene.start,Math.min(scene.end-.03,e.start??scene.start));const group=byTime.get(time)||[];group.push(e);byTime.set(time,group);}
  const expiries=[...cast,...entities].map(e=>e.supportUntil).filter(t=>t>scene.start&&t<scene.end),cuts=[...new Set([scene.start,...byTime.keys(),...expiries,scene.end])].sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){
   const start=cuts[i],end=cuts[i+1];if(end-start<.03)continue;
   cast=cast.filter(e=>e.id===anchorEntityId||!e.supportUntil||e.supportUntil>start);
   const incoming=byTime.get(start)||[],characters=incoming.filter(e=>e.type!=='object');
   if(characters.length){const unique=[...new Map([...cast,...characters].map(e=>[e.id,e])).values()];const team=project.shortStyle==='pokemon-dense'&&/\b(team|partners?|alongside|additional|options|together|recommend)\b/i.test(scene.text);
    const support=project.shortStyle==='pokemon-dense'&&cast.length&&(characters.some(e=>e.supportUntil)||/\b(threats?|threatens?|counters?|opponents?|against|handles?|beats?|rock type at)\b/i.test(scene.text)&&(/\b(him|her|it|them|its|his|their)\b/i.test(scene.text)||characters.some(c=>c.id===anchorEntityId)));
    if(team||support){const lead=unique.find(e=>e.id===anchorEntityId)||unique[0];
     // Named supporters get a short illustration window. Keep an explicitly
     // discussed duo/team together, but don't accumulate every old opponent.
     const joint=/\b(?:together|synergy|duo|pair|partners?|alongside|both)\b/i.test(scene.text);
     cast=[lead,...unique.filter(e=>e.id!==lead.id&&(joint||characters.some(c=>c.id===e.id)||start-(e.start??start)<3.2)).slice(-5)];anchorEntityId=lead.id;}
    else{cast=comparison?unique.slice(-2):characters.slice(-2);anchorEntityId=cast[0]?.id;}
   }
   const subjects=cast.map(e=>({entityId:e.id,name:e.name,mediaId:subjectMedia(e,scene,project)?.id}));
   const callouts=incoming.filter(e=>e.type==='object').map(e=>({entityId:e.id,name:e.name,mediaId:subjectMedia(e,scene,project)?.id}));
   if(!subjects.length&&callouts.length)subjects.push(callouts.shift());
   const detail=(scene.words||[]).filter(w=>w.start>=start&&w.start<end&&/^(ears?|tail|cannons?|shell|wings?|eyes?|face|head|better|worse|favorite|favourite|prefer|best)[,.!?]*$/i.test(w.text)).slice(0,2).map(w=>({time:w.start,word:w.text}));
   for(const e of [...subjects,...callouts])if(!e.mediaId)warnings.push(scene.id+': missing actual image for '+e.name);
   shots.push({sceneId:scene.id,start,end,subjects,anchorEntityId,callouts,detail,backgroundId:background?.id,layout:subjects.length>1?'stacked-comparison':'large-subject',purpose:comparison?'Show the related forms together while the narration compares them.':incoming.length?'Reveal the named subject at its spoken cue.':'Retain the established picture while explaining its details.'});
  }
 }
 // Give unchanged actors one camera path across sentence boundaries.
 for(const shot of shots){const same=s=>s.backgroundId===shot.backgroundId&&JSON.stringify(s.subjects.map(e=>e.mediaId))===JSON.stringify(shot.subjects.map(e=>e.mediaId));let i=shots.indexOf(shot),a=i,b=i;while(a>0&&same(shots[a-1]))a--;while(b<shots.length-1&&same(shots[b+1]))b++;shot.cameraStart=shots[a].start;shot.cameraEnd=shots[b].end;shot.cameraDetail=shots.slice(a,b+1).flatMap(s=>s.detail);shot.continues=a<i;}
 return {version:1,profile:project.shortStyle,reference:SHORT_STYLES[project.shortStyle]?.reference,shots,warnings:[...new Set(warnings)]};
}
export function applyReferenceShort(project,{force=false}={}){
 if(!project.shortStyle)return project;
 if(!Object.hasOwn(SHORT_STYLES,project.shortStyle))throw Error('Unknown Shorts editing style');
 if(project.shortStyle==='pokemon-dense')return applyGamePresentation(applyDenseShort(project,planReferenceShort,{force}));
 if(project.shortStyle==='pokemon-setup')return applyGamePresentation(applySetupShort(project,planReferenceShort,{force}));
 if(!force&&project.shortStyleReport&&project.scenes.every(s=>s.referenceShortApplied===project.shortStyle||s.manualTemplate||s.battlePlan))return project;
 const next=structuredClone(project),report=planReferenceShort(next);
 const noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
 const captionOverride=/\b(?:enable|show|add|keep)\s+(?:the\s+)?(?:captions|subtitles)\b/i.test(project.editingInstructions||'');
 next.captionStyle={...next.captionStyle,enabled:captionOverride};
 for(const scene of next.scenes){
  if(scene.manualTemplate||scene.battlePlan){report.warnings.push(scene.id+': retained the manual composition or authored battle.');continue;}
  scene.captionStyle={...scene.captionStyle,enabled:captionOverride};
  const source=scene.shortStyleSourceLayers||scene.layers||[];scene.shortStyleSourceLayers=structuredClone(source);
  const protectedIds=new Set((scene.layers||[]).filter(l=>l.manual||l.manualFraming||l.instructionLocked||l.attachment).map(l=>l.id));
  for(const l of scene.layers||[])if(l.parentId&&protectedIds.has(l.parentId))protectedIds.add(l.id);
  const preserved=(scene.layers||[]).filter(l=>protectedIds.has(l.id)||l.id.startsWith(scene.id+'-editorial-')||['chart','chart-panel','stat-label','stat-value'].includes(l.role)&&scene.reaction?.metrics?.length);
  const layers=[...preserved],shots=report.shots.filter(s=>s.sceneId===scene.id);
  const backgroundId=shots[0]?.backgroundId,m=next.media.find(m=>m.id===backgroundId);
  if(!preserved.some(l=>l.role==='background')){
   if(m)layers.push({id:scene.id+'-reference-bg',role:'background',type:m.kind==='video'?'video':'image',mediaId:m.id,x:0,y:0,width:1,height:1,z:0,start:scene.start,end:scene.end,fit:'cover',blur:8,scale:1.08,animation:'none',enter:'none',exit:'none',...(!noMotion?{keyframes:[{time:0,scale:1.08},{time:project.duration,scale:1.11}],easing:'linear'}:{})});
   else{layers.push({id:scene.id+'-reference-bg',role:'background',type:'shape',color:'#254751',x:0,y:0,width:1,height:1,z:0,start:scene.start,end:scene.end,animation:'none',enter:'none',exit:'none'});report.warnings.push(scene.id+': no matching game scenery; upload a background to match the reference.');}
  }
  for(const [i,shot] of shots.entries()){
   const chart=preserved.some(l=>l.role==='chart');
   for(const [j,subject] of shot.subjects.entries()){
    const media=next.media.find(m=>m.id===subject.mediaId);if(!media||preserved.some(l=>l.mediaId===media.id&&l.start<shot.end&&l.end>shot.start))continue;
    const stacked=shot.subjects.length>1,box=chart?{x:.22,y:.05,width:.56,height:.35}:stacked?{x:.06,y:j===0?.04:.46,width:.88,height:.45}:{x:.03,y:.19,width:.94,height:.59};
    const keyframes=noMotion?undefined:[{time:shot.cameraStart,scale:1},{time:shot.cameraEnd,scale:1.055}];
    const actor={id:scene.id+'-reference-actor-'+i+'-'+j,type:media.kind==='video'?'video':'image',role:'subject',mediaId:media.id,...box,z:10+j,start:shot.start,end:shot.end,fit:'contain',animation:noMotion||shot.continues?'none':'comparison-reveal',direction:j?'right':'left',animationAmount:.055,entranceDuration:.22,enter:'none',exit:'none',easing:'linear',keyframes};
    layers.push(actor);
    for(const cue of shot.cameraDetail){
     const end=Math.min(shot.cameraEnd,cue.time+.5);if(end-cue.time<.12||noMotion)continue;
     // One brief pose emphasis; it never invents anatomy or an alternate image.
     actor.keyframes=actor.keyframes.filter(f=>f.time<cue.time||f.time>end);
     const base=time=>1+.055*(time-shot.cameraStart)/Math.max(.1,shot.cameraEnd-shot.cameraStart),peak=cue.time+(end-cue.time)/2;
     actor.keyframes.push({time:cue.time,scale:base(cue.time)},{time:peak,scale:base(peak)+.045},{time:end,scale:base(end)});actor.keyframes.sort((a,b)=>a.time-b.time);
    }
   }
   for(const [j,callout] of shot.callouts.entries()){
    const media=next.media.find(m=>m.id===callout.mediaId);if(!media)continue;
    layers.push({id:scene.id+'-reference-callout-'+i+'-'+j,type:media.kind==='video'?'video':'image',role:'supporting-image',mediaId:media.id,x:.3,y:.54,width:.4,height:.25,z:30,start:shot.start,end:Math.min(shot.end,shot.start+2),fit:'contain',animation:noMotion?'none':'scale-reveal',enter:'none',exit:'none',entranceDuration:.18});
   }
  }
  scene.layers=layers;delete scene.transition;scene.referenceShortApplied=project.shortStyle;scene.compositionFamily=shots.some(s=>s.subjects.length>1)?'character-comparison':'character-environment';
  scene.shotPurpose=shots.map(s=>s.purpose).join(' ');scene.visualAssetWarnings=report.warnings.filter(w=>w.startsWith(scene.id+':'));
  delete scene.visualSequence;delete scene.visualSequenceApplied;delete scene.sequenceSourceLayers;
 }
 next.shortStyleReport={...report,warnings:[...new Set(report.warnings)]};return applyGamePresentation(next);
}
