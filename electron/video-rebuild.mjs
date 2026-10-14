import {applyInstructions,parseInstructions} from './editing-instructions.mjs';
import {applyReferenceShort} from './short-styles.mjs';
import {applyCreationAssets} from './creation-assets.mjs';
import {planAttention,applyAttention,clearAttention} from './attention-director.mjs';
import {audioRouting} from './audio-routing.mjs';
import {recordRevision} from './revisions.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {validateProject} from './planner.mjs';
import {preserveQuickPatches} from './saved-patches.mjs';
import crypto from 'node:crypto';
import {latestBrief,applyLatestSwitches} from './instruction-priority.mjs';
import {freshVisualDraft} from './fresh-project.mjs';
import {applyEditVersion} from './edit-version.mjs';
export function rebuildInstructions(project,draft='',{fresh=false}={}){
 if(fresh){
  const requests=(project.revisionHistory||[]).flatMap(h=>[h.request,/^Remake video:\s*(.*)$/s.exec(h.request||'')?.[1]]).filter(Boolean);
  const base=project.remakeBaseInstructions&&project.editingInstructions===project.lastRemakeInstructions?project.remakeBaseInstructions:(project.editingInstructions||'').split('\n').filter(l=>!requests.includes(l.trim())).join('\n');
  return [...new Set([latestBrief(base,draft),draft.trim()].filter(Boolean))].join('\n');
 }
 const history=(project.revisionHistory||[]).slice(0,project.revisionCursor??project.revisionHistory?.length??0).filter(h=>!(h.operations||[]).some(o=>o.type==='quick-patch')).map(h=>h.request).filter(r=>r&&!/^Remake video/i.test(r));
 return [...new Set([project.editingInstructions||'',...history,draft.trim()].filter(Boolean))].join('\n');
}
function restoreCaptions(original, next, preserveText=true) {
 const restore=(from,to)=>{for(const key of new Set([...Object.keys(from),...Object.keys(to)].filter(k=>k.startsWith('caption')))){if(Object.hasOwn(from,key))to[key]=structuredClone(from[key]);else delete to[key];}};
 restore(original,next);
 for(const scene of next.scenes){const before=original.scenes.find(s=>s.id===scene.id);if(!before)continue;restore(before,scene);
  if(preserveText)for(const [i,w] of scene.words.entries()){if(Object.hasOwn(before.words[i],'captionText'))w.captionText=before.words[i].captionText;else delete w.captionText;}
  if(preserveText&&scene.reaction){if(Object.hasOwn(before.reaction||{},'emphasis'))scene.reaction.emphasis=structuredClone(before.reaction.emphasis);else delete scene.reaction.emphasis;}
 }
 return next;
}
export async function rebuildVideo(project,draft,{configure,identify,author,enrich,animate,items,finalize,prepareAudio,applyRequest,applyFinalRequest,profile,preserveCaptions=false,preserveCaptionText=true,preserveReviewedPatches=false,progress=()=>{}}={}){
 validateProject(project);if(project.pendingRevision)throw Error('Finish or cancel the pending image request before remaking the video.');
 const cleared=applyLatestSwitches(clearAttention(structuredClone(project)),draft),prepared=configure?await configure(cleared):cleared,instructions=rebuildInstructions(prepared,draft,{fresh:!preserveReviewedPatches});
 let next={...prepared,remakeBaseInstructions:latestBrief(rebuildInstructions(prepared,'',{fresh:true}),draft),lastRemakeInstructions:instructions,creativePassId:crypto.randomUUID(),editingInstructions:instructions,editingPreferences:parseInstructions(instructions).preferences};
 if(!preserveReviewedPatches)delete next.quickPatchRanges;
 if(!preserveReviewedPatches)next=freshVisualDraft(next,{newPass:false});
 for(const key of ['animationPlan','shotPlan','attentionPlan','editorialReport','processingReport','lastEditAI','creativeActionReport','hookReport','cadenceReport','layeredActivityReport','mechanicLayoutReport','creativePropAssets','creativePropWarnings','movesetPlan','movesetWarnings'])delete next[key];
 next.scenes=next.scenes.map(s=>{const copy={...s,layers:undefined,manualTemplate:false,visualInstructions:instructions};for(const key of ['localAnimationApplied','editorialPlan','editorialPlanApplied','battlePlan','visualSequence','visualSequenceApplied','sequenceSourceLayers','visualAssetWarnings','itemDirection','shotPlanApplied','shortStyleSourceLayers','referenceShortApplied','actionMovieSourceLayers','expressionSourceLayers','performanceSourceLayers','creativeActionSourceLayers','hookSourceLayers','mechanicLayoutSourceLayers','movesetSourceLayers'])delete copy[key];if(!preserveReviewedPatches)for(const key of ['visualOverrides','visualMediaIds','titleOverride','pokemonMode','pokemonLayout','aiPlan'])delete copy[key];return copy;});
 progress({stage:'Identifying the actual narrated subjects'});next=await identify(next);
 next=planAttention(next,profile);if(author)next=await author(next);
 progress({stage:'Finding subject images and rebuilding every scene'});next=await enrich(next);
 next=applyCreationAssets(applyInstructions(next,instructions));
 if(['pokemon-setup','pokemon-dense'].includes(next.shortStyle))next=applyReferenceShort(next,{force:true});
 if(animate)next=await animate(next);
 if(applyRequest)next=await applyRequest(next,draft.trim());
 next=applyAttention(planAttention(next,profile));if(items)next=await items(next);
 if(finalize)next=await finalize(next);
 if(preserveReviewedPatches)next=preserveQuickPatches(project,next);
 if(applyFinalRequest)next=await applyFinalRequest(next,draft.trim());
 if(!preserveReviewedPatches)next=applyEditVersion(next);
 if(prepareAudio)next=await prepareAudio(next);
 const audio=audioRouting(next);next={...next,musicId:audio.music?.id,soundEffects:audio.effects};
 if(preserveCaptions)next=restoreCaptions(project,next,preserveCaptionText);
 // A visual remake has no authority to rewrite words, cut speech or shift time.
 if(next.voiceId!==project.voiceId||next.duration!==project.duration||JSON.stringify(next.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words.map(w=>[w.text,w.start,w.end])]))!==JSON.stringify(project.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words.map(w=>[w.text,w.start,w.end])])))throw Error('Rebuild changed narration or timing; the original project was retained.');
 next=refreshStoryboard(next);validateProject(next);
 const missing=next.scenes.flatMap(s=>s.visualAssetWarnings||[]);
 return recordRevision(project,next,'Remake video'+(draft.trim()?': '+draft.trim():''),[{type:'rebuild-video',sceneIds:project.scenes.map(s=>s.id)}],'Remade '+next.scenes.length+' scene(s) with narrated subject images and current AI Changes.'+(preserveCaptions?(preserveCaptionText?' Kept caption text, timing and appearance unchanged.':' Kept caption timing and appearance; corrected recognized names.'):'')+' Removed '+((project.soundEffects||[]).length-audio.effects.length)+' unsafe/duplicate audio cue(s).'+(missing.length?' Missing images: '+[...new Set(missing)].join('; '):''),'Video rebuild pipeline');
}
