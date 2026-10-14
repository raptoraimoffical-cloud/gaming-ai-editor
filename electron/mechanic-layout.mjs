import {artworkBox} from './overlay-layout.mjs';
import {visibleRanges} from './layer-visibility.mjs';
import {clipLayer} from './clip-layer.mjs';
export function clearMechanicLayout(project){
 const next=structuredClone(project);for(const s of next.scenes)if(s.mechanicLayoutSourceLayers){const locked=(s.layers||[]).filter(l=>l.manual||l.instructionLocked);s.layers=[...s.mechanicLayoutSourceLayers.filter(l=>!locked.some(m=>m.id===l.id)),...locked];delete s.mechanicLayoutSourceLayers;}
 delete next.mechanicLayoutReport;return next;
}
export function stageMechanicLayout(project){
 const next=clearMechanicLayout(project),events=[],width=next.format==='horizontal'?1920:1080,height=next.format==='horizontal'?1080:1920;
 for(const s of next.scenes){if(s.manualTemplate)continue;
  const cards=(s.layers||[]).filter(l=>l.sourceMoveCard&&l.role!=='type-icon'&&!l.manual&&!l.instructionLocked),caption={...next.captionStyle,...s.captionStyle},bottom=caption.enabled===false?.9:1-(caption.bottom??.13)-Math.max(.06,((caption.fontSize??46)*2.8+20)/height)-.025;
  for(const card of cards){const at=Math.min(card.end-.01,card.start+.25),box=artworkBox(card,s.layers,next.media,at,width,height),top=box.y+box.h+.025,room=bottom-top;if(room<.14)continue;
   const actors=s.layers.filter(l=>l.role==='subject'&&!l.manual&&!l.manualFraming&&!l.instructionLocked&&!l.attachment&&visibleRanges(l,s.start,s.end,s.layers).some(r=>r.start<card.end&&r.end>card.start));
   for(const actor of actors){
    const start=Math.max(actor.start,card.start),end=Math.min(actor.end,card.end),t=Math.min(end-.01,start+.25);if(end-start<.25)continue;
    const a=artworkBox(actor,s.layers,next.media,t,width,height),overlap=a.x<box.x+box.w&&a.x+a.w>box.x&&a.y<box.y+box.h+.025&&a.y+a.h>box.y-.025;
    if(!overlap&&a.y+a.h<=bottom||actor.actionMovie||actor.actorPerformance||actor.creativeAction)continue;
    s.mechanicLayoutSourceLayers??=structuredClone(s.layers);
    const h=Math.min(.34,room),w=Math.min(actors.length>1?.34:.62,actor.width),center=actor.x+actor.width/2,x=Math.max(.03,Math.min(.97-w,center-w/2));
    const copy={...clipLayer(actor,start,end),id:actor.id+'-source-card-'+card.id,actorSourceId:actor.id,mechanicStaged:true,x,y:top,width:w,height:h};
    const dx=x-actor.x,dy=top-actor.y;for(const k of copy.keyframes||[]){if(k.x!==undefined)k.x+=dx;if(k.y!==undefined)k.y+=dy;}
    actor.excludedRanges=[...(actor.excludedRanges||[]),{start,end}];s.layers.push(copy);events.push({sceneId:s.id,actorId:actor.id,cardId:card.id,start,end});
   }
  }
 }
 next.mechanicLayoutReport={events,captionsChanged:false};return next;
}
