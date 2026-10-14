import {normalize} from './reactions.mjs';
import {findMechanicImage,sourceMechanicGeometry} from './mechanic-images-policy.mjs';

export function setupCaptionStyle(project){
 const text=(project.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'');
 const requests=[...text.matchAll(/\b(show|enable|add|keep|hide|disable|remove|no|without)\s+(?:the\s+)?(?:captions|subtitles)\b/gi)];
 const enabled=!requests.length||/show|enable|add|keep/i.test(requests.at(-1)[1]);
 return {...project.captionStyle,enabled,minimal:true,fontSize:58,wordsPerGroup:3,bottom:.20,style:'yellow-phrase'};
}
export function planSetupShort(project,base){
 const report=base(project),shots=[],warnings=[...report.warnings,...(project.shortMechanics?.warnings||[])];
 const clipCues=[];
 for(const cue of project.creationAssets?.clips||[]){
  const media=project.media.find(m=>m.id===cue.mediaId),name=normalize(cue.cue||'');
  if(!media||media.kind!=='video'||!media.license||!name){warnings.push('Gameplay cue needs a video, a spoken phrase and source rights.');continue;}
  const sourceStart=Number(cue.start??0),sourceEnd=Number(cue.end??media.duration);
  if(!Number.isFinite(sourceStart)||!Number.isFinite(sourceEnd)||sourceStart<0||sourceEnd<=sourceStart||sourceEnd>media.duration+.05){warnings.push(media.name+': gameplay in/out points are outside the file.');continue;}
  let matched=false;
  for(const scene of project.scenes){const words=scene.words||[];for(let i=0;i<words.length;i++){let phrase='';for(let j=i;j<Math.min(words.length,i+16);j++){phrase=normalize(words.slice(i,j+1).map(w=>w.captionText||w.text).join(' '));if(phrase!==name)continue;const start=words[i].start;clipCues.push({sceneId:scene.id,mediaId:media.id,start,end:Math.min(scene.end,start+sourceEnd-sourceStart),sourceStart,sourceEnd,cue:cue.cue});matched=true;break;}}}
  if(!matched)warnings.push(media.name+': gameplay cue "'+cue.cue+'" was not spoken; the clip was not inserted.');
 }
 if(!clipCues.length)warnings.push('No matched gameplay clips. Artwork and sourced diagrams will be used; upload battle footage with spoken cues for the reference’s gameplay sections.');
 for(const original of report.shots){
  const scene=project.scenes.find(s=>s.id===original.sceneId),mechanics=(project.shortMechanics?.cues||[]).filter(c=>c.sceneId===scene.id);
  const natures=[]; // Real nature mint callouts are composed beside the active actor, not generic cards.
  const clips=clipCues.filter(c=>c.sceneId===scene.id),data=[...mechanics,...natures].sort((a,b)=>a.start-b.start);
  const statsCue=/\bbase (?:stats?|special|attack|defense|speed|hp)\b/i.test(scene.text)?(scene.words||[]).find(w=>/^base[,.!?]*$/i.test(w.text)):undefined;
  const cuts=[...new Set([original.start,original.end,...data.map(c=>c.start),...(scene.reaction?.metrics||[]).map(m=>m.start).filter(Number.isFinite),...clips.flatMap(c=>[c.start,c.end]),...(statsCue?[statsCue.start]:[])])].filter(t=>t>=original.start&&t<=original.end).sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){
   const start=cuts[i],end=cuts[i+1];if(end-start<.03)continue;
   const clip=clips.find(c=>start>=c.start&&start<c.end),mentionedCard=data.filter(c=>c.start<=start).at(-1),card=mentionedCard&&findMechanicImage(project,mentionedCard.kind,mentionedCard.title)?mentionedCard:undefined;
   if(mentionedCard&&!card)warnings.push(scene.id+': no sourced image for '+mentionedCard.title+'; no homemade information card substituted.');
   const subject=project.media.find(m=>m.id===original.subjects.at(-1)?.mediaId);
   const stats=statsCue&&start>=statsCue.start&&subject?.pokemon?.stats?.filter(s=>Number.isFinite(s.value));
   // Narrated percentages and quantities keep their evidence; generic “key points” never qualify.
   const eligible=(scene.reaction?.metrics||[]).filter(m=>Number.isFinite(m.value)&&m.start<=start&&m.source&&m.label!=='Narrated number'),latest=eligible.at(-1),metrics=eligible.filter(m=>m.kind===latest?.kind&&m.label===latest?.label);
   for(const m of eligible)if(m.warning)warnings.push(scene.id+': '+m.warning);
   const activeCard=stats?.length?{kind:'stats',title:'Base stats',rows:stats.map(s=>({label:({'hp':'HP','attack':'Attack','defense':'Defense','special-attack':'Sp. Atk','special-defense':'Sp. Def','speed':'Speed'})[s.name]||s.name,value:s.value})),source:subject.pokemon.statsSource||'https://pokeapi.co/api/v2/pokemon/'+subject.pokemon.name+'/'}:card|| (metrics.length?{kind:'metrics',title:'Narrated values',rows:metrics.slice(0,4).map(m=>({label:m.label,value:m.value})),source:metrics.map(m=>m.source).join('; ')}:undefined);
   shots.push({...original,start,end,clip,card:activeCard,layout:clip?'gameplay-proof':activeCard?'mechanic-explainer':original.subjects.length>1?'partner-comparison':'artwork-explainer',purpose:clip?'Show the user’s battle evidence at “'+clip.cue+'”.':activeCard?'Explain '+activeCard.title+' with sourced information.':original.purpose});
  }
 }
 for(let i=0;i<shots.length;i++){
  const previous=shots[i-1],shot=shots[i];
  shot.continues=!!previous&&!shot.clip&&!previous.clip&&previous.end===shot.start&&JSON.stringify(previous.subjects.map(s=>s.mediaId))===JSON.stringify(shot.subjects.map(s=>s.mediaId));
 }
 return {...report,version:2,shots,warnings:[...new Set(warnings)],clipCues};
}
export function applySetupShort(project,base,{force=false}={}){
 if(!force&&project.shortStyleReport&&project.scenes.every(s=>s.referenceShortApplied===project.shortStyle||s.manualTemplate||s.battlePlan))return project;
 const next=structuredClone(project),report=planSetupShort(next,base),noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
 next.captionStyle=setupCaptionStyle(next);next.captionColor='#fff025';
 for(const scene of next.scenes){
  if(scene.manualTemplate||scene.battlePlan){report.warnings.push(scene.id+': retained authored composition.');continue;}
  scene.captionStyle={...scene.captionStyle,...next.captionStyle};
  const old=scene.layers||[];scene.shortStyleSourceLayers=structuredClone(scene.shortStyleSourceLayers||old);
  const protectedIds=new Set(old.filter(l=>(l.manual||l.manualFraming||l.instructionLocked)&&!l.attachment&&!l.autoItem).map(l=>l.id));
  if(next.creationAssets?.backgroundMode==='generate'){const generated=old.find(l=>l.role==='background'&&l.mediaId);if(generated)protectedIds.add(generated.id);}
  for(const l of old)if(l.parentId&&protectedIds.has(l.parentId))protectedIds.add(l.id);
  // The preset supplies the stage and cast, not permission to discard an
  // already validated model-authored chart, lighting or particle layer.
  const layers=old.filter(l=>protectedIds.has(l.id)||l.id.startsWith(scene.id+'-editorial-'));
  const shots=report.shots.filter(s=>s.sceneId===scene.id);
  for(const [i,shot] of shots.entries()){
   const layer=(suffix,properties)=>({id:scene.id+'-setup-'+i+'-'+suffix,start:shot.start,end:shot.end,enter:'none',exit:'none',animation:'none',...properties});
   if(!layers.some(l=>l.role==='background'&&l.start<=shot.start&&l.end>=shot.end)){
    if(shot.clip){const m=next.media.find(m=>m.id===shot.clip.mediaId),videoStart=shot.clip.sourceStart+shot.start-shot.clip.start;layers.push(layer('bg',{role:'background',type:'video',mediaId:m.id,x:0,y:0,width:1,height:1,z:0,fit:'cover',blur:18,scale:1.08,videoStart,videoEnd:shot.clip.sourceEnd}));}
    else{layers.push(layer('bg',{role:'background',type:'shape',x:0,y:0,width:1,height:1,z:0,color:'#20bdd9'}));layers.push(layer('pattern',{role:'environment-depth',type:'svg',x:0,y:0,width:1,height:1,z:1,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><pattern id="dots" width="62" height="72" patternUnits="userSpaceOnUse"><circle cx="13" cy="18" r="3" fill="white" opacity=".24"/></pattern></defs><path d="M-400 500L1400 40V470L-400 930ZM-400 1600L1400 1140V1570L-400 2030Z" fill="white" opacity=".09"/><rect width="1080" height="1920" fill="url(#dots)"/></svg>'}));if(!noMotion)layers.push(layer('particles',{role:'environment-depth',type:'particles',x:0,y:0,width:1,height:1,z:2,particleCount:22,color:'#ffffff'}));}
   }
   if(shot.clip){const videoStart=shot.clip.sourceStart+shot.start-shot.clip.start;layers.push(layer('footage',{role:'gameplay',type:'video',mediaId:shot.clip.mediaId,x:0,y:.20,width:1,height:.50,z:5,fit:'contain',videoStart,videoEnd:shot.clip.sourceEnd}));}
   if(!shot.clip){for(const [j,subject] of shot.subjects.entries()){
    const m=next.media.find(m=>m.id===subject.mediaId);if(!m||layers.some(l=>l.mediaId===m.id&&l.start<shot.end&&l.end>shot.start))continue;
    const duo=shot.subjects.length>1,panel=shots.some(s=>s.card&&!s.clip),box=duo?{x:j?.5:.02,y:.16,width:.48,height:panel?.30:.50}:{x:.04,y:panel?.08:.16,width:.92,height:panel?.38:.53};
    layers.push(layer('actor-'+j,{role:'subject',type:m.kind==='video'?'video':'image',mediaId:m.id,...box,z:10+j,fit:'contain',animation:noMotion||shot.continues?'none':'scale-reveal',entranceDuration:.22,easing:'linear',...(!noMotion?{keyframes:[{time:shot.cameraStart,scale:1},{time:shot.cameraEnd,scale:1.04}]}:{})}));
   }}
   if(shot.card){const prior=shots[i-1],continued=prior?.card?.title===shot.card.title&&prior?.layout===shot.layout,chart=['stats','metrics'].includes(shot.card.kind),image=!chart&&findMechanicImage(next,shot.card.kind,shot.card.title);
    const content=chart?{type:'group',role:'chart',x:.07,y:shot.clip?.07:.47,width:.86,height:shot.card.kind==='stats'?.26:.24,setupGraphic:{...shot.card,motion:!noMotion}}:image?{type:'image',role:'mechanic-card',sourceMoveCard:true,sourceMechanicKind:shot.card.kind,mediaId:image.id,fit:'contain',...sourceMechanicGeometry(image,shot.card.kind,next)}:undefined;
    if(content)layers.push(layer('card',{...content,z:40,animationStart:continued?prior.start:shot.start,animation:noMotion||continued?'none':'scale-reveal',entranceDuration:.22}));
   }
   for(const [j,c] of shot.callouts.entries()){const m=next.media.find(m=>m.id===c.mediaId);if(m)layers.push(layer('callout-'+j,{type:'image',role:'supporting-image',mediaId:m.id,x:.65,y:.4,width:.26,height:.23,z:30,fit:'contain',animation:noMotion?'none':'scale-reveal',entranceDuration:.2}));}
  }
  // Items stay attached when a held comparison is split by a card or clip cue.
  for(const item of old.filter(l=>l.attachment)){
   const parent=old.find(l=>l.id===item.attachment.targetId);for(const actor of layers.filter(l=>l.role==='subject'&&l.mediaId===parent?.mediaId&&l.start<item.end&&l.end>item.start))layers.push({...item,id:item.id+'-'+actor.id,attachment:{...item.attachment,targetId:actor.id},start:Math.max(item.start,actor.start),end:Math.min(item.end,actor.end)});
  }
  scene.layers=layers;delete scene.transition;delete scene.visualSequence;delete scene.visualSequenceApplied;delete scene.sequenceSourceLayers;scene.referenceShortApplied=next.shortStyle;scene.compositionFamily='setup-explainer';scene.shotPurpose=shots.map(s=>s.purpose).join(' ');scene.visualAssetWarnings=report.warnings.filter(w=>w.startsWith(scene.id+':'));
 }
 next.shortStyleReport={...report,warnings:[...new Set(report.warnings)]};return next;
}
