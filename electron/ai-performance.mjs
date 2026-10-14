// Retention is idle time, not a smaller model, context, image or review budget.
// An explicit zero remains authoritative; hosted providers ignore this option.
export const modelIdleSeconds=settings=>settings?.keepAliveSeconds??120;
const layerFields=['fontSize','id','type','role','mediaId','text','x','y','width','height','z','start','end','scale','scaleX','scaleY','rotation','opacity','animation','animationAmount','direction','entranceDuration','exitDuration','exit','easing','keyframes','manual','instructionLocked','parentId','attachment','value','points','labels','sourceMoveCard','sourceMechanicKind','effectOwnerId','blueprintEffect'];
export function visualPlanningInput(project,qualityContext){
 const used=new Set(project.scenes.flatMap(s=>(s.layers||[]).map(l=>l.mediaId)));
 return {creativePassId:project.creativePassId,editingInstructions:project.editingInstructions,qualityContext,format:project.format,captionStyle:project.captionStyle,captionColor:project.captionColor,
  scenes:project.scenes.map(s=>({id:s.id,start:s.start,end:s.end,text:s.text,captionStyle:s.captionStyle,captionStyleRanges:s.captionStyleRanges,entities:s.reaction?.entities?.map(e=>({id:e.id,name:e.name,type:e.type,mediaId:e.mediaId,start:e.start})),layers:(s.layers||[]).map(l=>Object.fromEntries(layerFields.filter(k=>l[k]!==undefined).map(k=>[k,l[k]])))})),
  media:project.media.filter(m=>used.has(m.id)).map(m=>({id:m.id,name:m.name,kind:m.kind,width:m.width,height:m.height,transparent:m.transparent,pokemon:m.pokemon?{name:m.pokemon.name,displayName:m.pokemon.displayName,stats:m.pokemon.stats}:undefined}))};
}
export const editableDirectionFields=new Set(['fontSize','x','y','width','height','z','scale','scaleX','scaleY','rotation','opacity','animation','animationAmount','direction','entranceDuration','exitDuration','exit','easing','keyframes']);
export function mergeVisualDirection(prior,proposal){
 if(prior.manual||prior.instructionLocked)return prior;
 const changed=Object.fromEntries(Object.entries(proposal).filter(([key])=>editableDirectionFields.has(key))),next={...prior,...changed,keyframes:(proposal.keyframes||prior.keyframes)?.map(k=>({...k}))};
 if(!proposal.keyframes||JSON.stringify(proposal.keyframes)===JSON.stringify(prior.keyframes))for(const key of ['x','y','width','height'])if(next[key]!==prior[key])for(const k of next.keyframes||[])if(k[key]!==undefined)k[key]=['width','height'].includes(key)?k[key]*next[key]/prior[key]:k[key]+next[key]-prior[key];
 return next;
}
