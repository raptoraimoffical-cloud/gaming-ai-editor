import {validateProject} from './planner.mjs';
import {environmentSvg} from './environments.mjs';

export function selectInstructionAsset(media,score,preferences={}){const matches=media.filter(m=>score(m)>=1);return preferences.preferImages?matches.find(m=>m.kind==='image')||matches[0]:matches[0];}

export function parseInstructions(text='') {
 const preferences={},applied=[],warnings=[];
 if(/^REFERENCE SHORT STYLE:/m.test(text))applied.push('Reference Shorts director');
 // A local request such as a small joke caption or restrained card colors
 // must not restyle every caption/animation in the entire video.
 const firstScene=text.search(/^##\s*SCENE\s+\d+/mi),globalText=firstScene>=0?text.slice(0,firstScene):text;
 const clauses=globalText.replace(/^REFERENCE SHORT STYLE:.*$/gm,'').split(/[\n.;,]+|\s+and\s+(?=(?:make|have|use|slide|keep|animate)\b)/i).map(s=>s.trim()).filter(Boolean);
 for(const clause of clauses){let recognized=false;
  const rule=(test,key,value,description)=>{if(test.test(clause)){preferences[key]=value;applied.push(description);recognized=true;}};
  if(/background/i.test(clause)){
   const colors={'bright green':'#00ff00','dark green':'#092b22',green:'#00ff00',red:'#ff3030',blue:'#2259ab',black:'#050812',white:'#ffffff',purple:'#7028b0'};
   const color=clause.match(/#[0-9a-f]{6}\b/i)?.[0]||Object.entries(colors).find(([name])=>new RegExp('\\b'+name+'\\b','i').test(clause))?.[1];
   if(color){preferences.backgroundColor=color;applied.push('Explicit background color '+color);recognized=true;}
  }
  rule(/(?:main|primary)?\s*(?:character|subject).*?(?:twice|double|2\s*(?:x|times)).*?(?:large|size)|double.*(?:main character|subject)/i,'mainCharacterScale',2,'Main character at twice its original size');
  rule(/slide\s*[- ]?in.*(?:from\s+)?(?:the\s+)?left/i,'slideLeft',true,'Main character slides in from the left');
  rule(/dark.*(?:background|theme)|(?:background|theme).*dark/i,'dark',true,'Dark backgrounds');
  rule(/pok[eé]mon.*(?:background|theme)|(?:background|theme).*pok[eé]mon/i,'pokemonTheme',true,'Battle-themed background accents');
  rule(/(?:small|minimal).*?(?:subtitle|caption)|(?:subtitle|caption).*?(?:small|minimal)/i,'minimalCaptions',true,'Small captions, three words per group');
  rule(/(?:quick|fast).*transition/i,'quick',true,'Short visual entrances and exits');
  rule(/(?:avoid|no|without).*shak/i,'noShake',true,'Restrained motion without rotation or floating');
  rule(/dramatic.*rank|rank.*dramatic/i,'dramaticRankings',true,'Staggered spring ranking reveals');
  rule(/\bdocumentary\b/i,'documentary',true,'Restrained documentary typography and motion');
  rule(/\bprofessional(?:ly)?\b/i,'professional',true,'Polished composition without disabling requested motion');
  rule(/animat.*character|character.*animat|when.*mention/i,'mentionedEntrances',true,'Character entrances use narration mention timestamps');
  rule(/more images|fewer text|prefer.*(?:image|footage)|visual.*first/i,'preferImages',true,'Prioritize relevant available assets over decorative text');
  rule(/minecraft.*forest|forest.*minecraft/i,'forest',true,'Original Minecraft forest environment in Minecraft scenes');
  rule(/(?:show|use).*minecraft.*mobs/i,'mobs',true,'Exact Minecraft mobs resolved at their narration cues');
  rule(/larger|bigger.*character|large.*character/i,'largeSubjects',true,'Larger characters with matching keyframe scales');
  rule(/smooth.*animat|smoother|cinematic/i,'cinematic',true,'Smooth zooms and layered background motion');
  rule(/energetic|dynamic|punchy/i,'energetic',true,'Visible spring entrances and emphasis movement');
  rule(/colorful|colourful/i,'colorful',true,'Colorful topic-aware environment');
  rule(/high.quality.*gaming|youtube short/i,'shortStyle',true,'Subject-first gaming Short compositions');
  if(!recognized||/\b(3d|lip.?sync|deepfake|shak(?:e|ing)|cinematic camera|shorten.*narration|rewrite.*voice)\b/i.test(clause)&&!/(avoid|no|without).*shak/i.test(clause))warnings.push(`Not fully supported: "${clause}". Use the supported styling controls or a configured model; narration duration and audio content are preserved.`);
 }
 return {preferences,applied:[...new Set(applied)],warnings};
}

export function applyInstructions(project,text=project.editingInstructions||'') {
 const result=parseInstructions(text),p=structuredClone(project),prefs=result.preferences;
 p.editingInstructions=text;p.instructionReport=result;p.editingPreferences=prefs;
 if(prefs.minimalCaptions)p.captionStyle={...p.captionStyle,fontSize:30,wordsPerGroup:3,minimal:true};
 p.scenes=p.scenes.map(s=>{
  const next={...s,layers:s.layers?.map(l=>({...l,...(l.keyframes?{keyframes:l.keyframes.map(k=>({...k}))}:{})}))};
  if(prefs.minimalCaptions)next.captionStyle={...next.captionStyle,fontSize:30,wordsPerGroup:3,minimal:true};
  const main=(next.layers||[]).find(l=>l.role==='subject'&&['image','video'].includes(l.type)&&l.mediaId);
  for(const l of next.layers||[]){
   const background=l.role==='background'||l.x===0&&l.y===0&&l.width===1&&l.height===1&&l.type==='shape';
   const decoration=l.type==='svg'&&l.width===1&&l.height===1;
   const asset=['image','video'].includes(l.type)&&l.mediaId;
   if(background&&prefs.backgroundColor){l.type='shape';l.color=prefs.backgroundColor;delete l.svg;delete l.mediaId;l.opacity=1;l.animation='none';l.enter='none';l.exit='none';l.keyframes=[];l.x=0;l.y=0;l.width=1;l.height=1;l.scale=1;next.backgroundConcept='Requested solid background '+prefs.backgroundColor;}
   if(background&&prefs.forest&&next.reaction?.entities.some(e=>/minecraft/i.test(e.id))){l.type='svg';l.svg=environmentSvg('minecraft-forest');delete l.mediaId;delete l.color;l.opacity=1;l.animation='background-motion';l.animationAmount=.07;next.backgroundConcept='Original Minecraft forest environment; not a game screenshot';}
   if(background&&(prefs.cinematic||prefs.energetic||prefs.colorful)){l.animation='background-motion';l.animationAmount=prefs.energetic?.09:.06;}
   if(prefs.colorful&&background&&l.type==='shape'){l.type='svg';l.svg=environmentSvg(next.backgroundTheme||'battle');delete l.color;}
   if(asset&&!background&&prefs.largeSubjects){l.scale=(l.scale||1)*1.12;if(l.keyframes)l.keyframes=l.keyframes.map(k=>k.scale===undefined?k:{...k,scale:k.scale*1.12});}
   const authoredMotion=l.actionMovie||l.actorPerformance||l.creativeAction||l.blueprintVisual||l.keyframes?.length>1;
   if(asset&&!background&&prefs.cinematic&&!authoredMotion){l.animation='smooth-zoom';l.animationAmount=.14;l.entranceDuration=.6;l.easing='smooth';}
   if(asset&&!background&&prefs.energetic&&!authoredMotion){l.animation='emphasis';l.animationAmount=.14;l.enter='spring';}
   if(background&&prefs.dark){if(l.type==='svg'||l.type==='image'||l.type==='video')l.opacity=.35;l.color=prefs.pokemonTheme?'radial-gradient(ellipse at 80% 15%,#182242,#050812 85%)':'radial-gradient(ellipse at 80% 15%,#182331,#050910 85%)';}
   if(decoration&&!background&&prefs.pokemonTheme&&s.pokemon?.length){l.svg='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><circle cx="540" cy="1050" r="420" fill="none" stroke="#789ad9" stroke-width="3" opacity=".14"/><path d="M120 1050H960" stroke="#789ad9" opacity=".14"/><circle cx="540" cy="1050" r="65" fill="none" stroke="#789ad9" opacity=".14"/></svg>';}
   if(prefs.documentary&&!background&&!decoration){l.enter=asset?'left':'fade';l.float=false;l.rotation=0;}
   if(prefs.quick){l.entranceDuration=.18;l.exitDuration=.12;}
   if(prefs.noShake){l.float=false;l.rotation=0;if(l.keyframes)l.keyframes=l.keyframes.map(k=>({...k,rotation:0}));}
   if(prefs.mentionedEntrances&&asset&&l.role!=='background'&&!authoredMotion){const entity=s.reaction?.entities.find(e=>e.mediaId===l.mediaId);if(entity)l.start=Math.max(s.start,Math.min(entity.start,l.end-.03));l.enter='spring';l.animation='spring-pop';l.entranceDuration=.5;}
   if(prefs.dramaticRankings&&s.reaction?.intent==='ranking'&&!background&&!decoration){l.enter='spring';l.entranceDuration=.55;l.exit='scale';}
   if(l===main&&(prefs.mainCharacterScale||prefs.slideLeft)){
    if(!l.instructionBase)l.instructionBase={scale:l.scale??1,keyframeScales:(l.keyframes||[]).map(k=>({time:k.time,scale:k.scale}))};
    if(prefs.mainCharacterScale){l.scale=l.instructionBase.scale*prefs.mainCharacterScale;for(const k of l.keyframes||[]){const original=l.instructionBase.keyframeScales.find(a=>a.time===k.time);if(original?.scale!==undefined)k.scale=original.scale*prefs.mainCharacterScale;}}
    if(prefs.slideLeft){l.animation='slide-in-out';l.direction='left';l.enter='none';l.animationAmount=Math.max(.25,l.x+l.width*(l.scale||1));l.entranceDuration=.65;l.float=false;}
    l.instructionLocked=true;
   }
  }
  if(prefs.preferImages&&next.layers?.some(l=>['image','video'].includes(l.type)))next.layers=next.layers.filter(l=>!(l.type==='text'&&l.y>=.22&&l.y<.26));
  return next;
 });
 if(prefs.preferImages)for(const [i,s] of p.scenes.entries())if(!s.layers?.some(l=>['image','video'].includes(l.type)))p.instructionReport.warnings.push(`Scene ${i+1}: no relevant permitted visual is available; the topic graphic is retained. Import a relevant image or replace the scene asset.`);
 validateProject(p);return p;
}
