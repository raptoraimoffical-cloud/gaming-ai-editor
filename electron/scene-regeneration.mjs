import {scenesFor,recordRevision} from './revisions.mjs';
import {applyInstructions,parseInstructions} from './editing-instructions.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {applySourceMoveCards} from './source-move-cards.mjs';
import {freshVisualDraft} from './fresh-project.mjs';
export async function regenerateSelected(project,request,context,enrich,keys={}){
 const range=request.match(/\b(?:from|between)\s*(\d+(?:\.\d+)?)\s*(?:to|and|-)\s*(\d+(?:\.\d+)?)\s*(?:seconds|s)?/i);
 const targets=scenesFor(project,request,context),ids=new Set(targets.map(s=>s.id));
 const instructions=(project.editingInstructions||'')+'\n'+request.replace(/\b(?:redo|regenerate|rebuild)\s*(?:this |the )?(?:scene|visuals?)(?:\s+(?:from|between)\s*[\d.]+\s*(?:to|and|-)\s*[\d.]+\s*(?:seconds|s)?)?[,:.]?\s*/i,'');
 const expanded=[];const regenerateIds=new Set();
 for(const s of project.scenes){if(!ids.has(s.id)){expanded.push(s);continue;}
  const cuts=range?[s.start,...[Number(range[1]),Number(range[2])].filter(t=>t>s.start&&t<s.end),s.end]:[s.start,s.end];
  for(let i=0;i<cuts.length-1;i++){const start=cuts[i],end=cuts[i+1],inside=!range||start>=Number(range[1])&&end<=Number(range[2]);const id=cuts.length===2?s.id:s.id+'-range-'+i;
   const part=cuts.length===2?structuredClone(s):{...structuredClone(s),id,start,end,words:s.words.filter(w=>w.end>start&&w.start<end),layers:s.layers?.filter(l=>l.end>start&&l.start<end).map(l=>({...l,start:Math.max(start,l.start),end:Math.min(end,l.end)})),pokemon:s.pokemon?.filter(p=>p.end>start&&p.start<end).map(p=>({...p,start:Math.max(start,p.start),end:Math.min(end,p.end)}))};
   if(cuts.length>2)part.text=part.words.map(w=>w.text).join(' ');
   if(inside){regenerateIds.add(id);part.layers=undefined;part.manualTemplate=false;part.visualInstructions=instructions;for(const key of Object.keys(part))if(key.endsWith('SourceLayers'))delete part[key];}expanded.push(part);
  }
 }
 const subset=freshVisualDraft({...project,scenes:expanded.filter(s=>regenerateIds.has(s.id)),editingInstructions:instructions,editingPreferences:parseInstructions(instructions).preferences});
 let rebuilt=await enrich(subset,()=>{},keys);rebuilt=applyInstructions(rebuilt,instructions);
 rebuilt=refreshStoryboard(applySourceMoveCards(rebuilt));const map=new Map(rebuilt.scenes.map(s=>[s.id,s]));const after={...project,sourceMechanicImagesOnly:true,sourceMoveCardReport:[...(project.sourceMoveCardReport||[]),...(rebuilt.sourceMoveCardReport||[])],...(rebuilt.editorialReport?{editorialReport:{...rebuilt.editorialReport,scenes:[...(project.editorialReport?.scenes||[]).filter(s=>!regenerateIds.has(s.id)),...rebuilt.editorialReport.scenes]}}:{}),media:[...new Map([...project.media,...rebuilt.media].map(m=>[m.id,m])).values()],scenes:expanded.map(s=>map.get(s.id)||s)};
 // No transcription, narration, music, or unrelated scene changes.
 return recordRevision(project,after,request,[{type:'regenerate-scenes',sceneIds:[...regenerateIds]}],`Regenerated ${regenerateIds.size} scene segment(s); voiceover and narration timing preserved`,'Selective visual planner');
}
