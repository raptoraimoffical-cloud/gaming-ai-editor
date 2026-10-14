import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
import {visibleLayers} from './layer-visibility.mjs';
import {detectedGames,GAME_OPTIONS} from './game-selection.mjs';
export function storyboardFor(scene,project){
 const assets=(scene.layers||[]).filter(l=>l.mediaId).map(l=>{const m=project.media.find(m=>m.id===l.mediaId),entity=scene.reaction?.entities.find(e=>e.mediaId===l.mediaId);return {layerId:l.id,mediaId:l.mediaId,name:m?.name,role:l.role||'visual',start:l.start,end:l.end,geometry:{x:l.x,y:l.y,width:l.width,height:l.height,scale:l.scale||1,focalPoint:l.focalPoint},identity:assetIdentity(m||{}),relevanceScore:entity?.assetStatus==='missing'?0:entity?.mediaId?1:.85,confidence:entity?.transcriptionCorrected?.75:assetIdentity(m||{}).confidence};});
 return {version:1,interval:{start:scene.start,end:scene.end},meaning:scene.reaction?.reason||scene.text,subjects:scene.reaction?.entities.map(e=>({name:e.name,start:e.start,franchise:franchiseForEntity(e),status:e.assetStatus||e.status})),compositionFamily:scene.compositionFamily||scene.template,backgroundConcept:scene.backgroundConcept||scene.backgroundTheme,assets,foreground:assets.filter(a=>a.role!=='background'),motion:(scene.layers||[]).filter(l=>l.keyframes?.length||l.enter&&l.enter!=='none'||l.animation&&l.animation!=='none'||l.float).map(l=>({layerId:l.id,preset:l.animation||l.enter,exit:l.exit,start:l.start,end:l.end,keyframes:l.keyframes||[],float:!!l.float,reveal:l.reveal})),transitions:{kind:scene.transition||'cut',duration:scene.transition==='crossfade'?(scene.transitionDuration||.45):0,relationship:scene.reaction?.relationship},captionPlacement:scene.captionStyle?.position||'bottom',confidence:assets.length?Math.min(...assets.map(a=>a.confidence)):0,warnings:[...(scene.visualAssetWarnings||[]),...(scene.reaction?.entities.filter(e=>e.warning).map(e=>e.warning)||[]),...(scene.reaction?.relationship?.warning?[scene.reaction.relationship.warning]:[])]};
}
export function refreshStoryboard(project){if(project.visualVersion!==3&&!project.scenes.some(s=>s.storyboard))return project;return {...project,scenes:project.scenes.map(s=>({...s,storyboard:storyboardFor(s,project)}))};}
export function auditVisuals(project){
 const errors=[],warnings=[];
 for(const s of project.scenes){
  const entities=s.reaction?.entities||[];
  const franchises=new Set([...entities.filter(e=>!e.manual).map(franchiseForEntity),...detectedGames(s,project)].filter(f=>f!=='unknown'));
  // An explicitly selected game is authoritative context for its imagery,
  // including explanatory scenes without a spoken species name.
  if(Object.hasOwn(GAME_OPTIONS,project.gameSelection)&&!['auto','multiple','other'].includes(project.gameSelection))franchises.add(project.gameSelection);
  for(const l of visibleLayers(s)){
   if(l.width<=0||l.height<=0||![l.x,l.y,l.width,l.height].every(Number.isFinite))errors.push(`${s.id}: invalid geometry ${l.id}`);
   if(l.role==='placeholder')errors.push(`${s.id}: empty placeholder`);
   if(l.mediaId){
    const m=project.media.find(m=>m.id===l.mediaId);
    if(!m||!m.path)errors.push(`${s.id}: missing media ${l.mediaId}`);
    const identity=assetIdentity(m||{}),f=identity.franchise;
    const e=entities.find(e=>e.mediaId===l.mediaId&&e.type==='object');
    if(e&&identity.subject!==e.id.replace(/^minecraft-/,'')&&!l.manual)errors.push(`${s.id}: mismatched subject ${identity.subject} (layer ${l.id}, expected ${e.id})`);
    const contextualReaction=l.role==='reaction-gif'&&m?.animationInfo?.animated&&(project.reactionGifPlan||[]).some(c=>c.sceneId===s.id&&c.mediaId===m.id&&c.start===l.start&&c.end===l.end&&(s.words||[]).some(w=>w.start===c.start&&w.text===c.quote));
    const contextualProp=['narration-prop','move-art'].includes(m?.assetRole)&&['story-picture','battle-effect','move-effect','expression-effect'].includes(l.role)&&(Object.values(project.narrationAssetPlan||{}).includes(m.id)||m.assetRole==='move-art'&&project.actionMovieReport?.plans?.some(p=>p.effectMediaId===m.id&&p.start<l.end&&p.end>l.start));
    // Generic trophies, crowns and other acquired narration props are supporting
    // illustrations, not characters from a competing game. Keep the exception
    // tied to the actual prop acquisition plan and neutral asset identity.
    const supportingProp=(l.role==='supporting-image'||l.role==='hook-question'&&identity.subject==='question-mark')&&f==='illustration'&&m?.assetRole==='narration-prop'&&Object.values(project.narrationAssetPlan||{}).includes(m.id);
    const creativeProp=['creative-stage-prop','creative-prop'].includes(l.role)&&f==='illustration'&&Object.values(project.creativePropAssets||{}).includes(m.id);
    if(franchises.size&&f!=='unknown'&&!franchises.has(f)&&!l.manual&&!contextualReaction&&!contextualProp&&!supportingProp&&!creativeProp)errors.push(`${s.id}: mismatched franchise ${f} (layer ${l.id}, asset ${m?.name||l.mediaId}, expected ${[...franchises].join('/')})`);
   }
   if(!l.sequenceHidden&&!['background','environment-depth'].includes(l.role)&&((l.x+l.width<=0)||(l.y+l.height<=0)||l.x>=1||l.y>=1||(l.opacity===0&&!l.keyframes?.some(k=>k.opacity>0))))errors.push(`${s.id}: invisible or out-of-frame layer ${l.id}`);
  }
  if(!s.layers?.some(l=>l.role==='background'&&l.x<=0&&l.y<=0&&l.x+l.width>=1&&l.y+l.height>=1))warnings.push(`${s.id}: no full-canvas background`);
 }
 return {errors,warnings};
}
