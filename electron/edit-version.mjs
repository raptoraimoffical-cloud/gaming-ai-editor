import crypto from 'node:crypto';import {noMotion} from './game-presentation.mjs';
let sequence=0;const offset=crypto.randomInt(4096);
const approaches=['Build evolving layered tableaux with coordinated cast reveals and independent support actions.','Use purposeful detail closeups and match transitions; let meaningful actor movement lead the cuts.','Use changing spatial formations and clear visual contrast, then flow into the narrated action.','Lead with relevant visual evidence and build the cast around it; use anticipation and a distinct payoff.'];
// A session counter selects presentation families. It retains no projects,
// scripts, audio IDs, previous plans or rendered video content.
export function newEditVersion(){const n=offset+sequence++;return {id:crypto.randomUUID(),layoutFamily:n%4,storyboardApproach:approaches[n%4],mirror:n%2===1,entrance:['slide-in-out','scale-reveal','spring-pop'][n%3],duration:[.18,.22,.26,.30][Math.floor(n/6)%4],backgroundDirection:n%2?1:-1,backgroundTravel:.035+(n%13)*.002,patternPhase:crypto.randomInt(100000),compiled:false};}
export function applyEditVersion(project){
 const version=project.editVersion||newEditVersion();if(version.compiled)return project;
 const next=structuredClone(project),motion=!noMotion(next),positionSpecified=/\b(?:move|place|put|position|align|keep)\b[^.!?\n]{0,65}\b(?:left|right|cent(?:er|re))\b/i.test(next.editingInstructions||''),entranceSpecified=/\b(?:use|with|only|no)\b[^.!?\n]{0,35}\b(?:slide|fade|pop|zoom|entrance)\b/i.test(next.editingInstructions||'');
 for(const s of next.scenes){const locked=s.manualTemplate||s.layers?.some(l=>l.manual||l.manualFraming||l.instructionLocked),evidence=s.layers?.some(l=>['gameplay','chart'].includes(l.role));
  for(const l of s.layers||[]){if(l.manual||l.manualFraming||l.instructionLocked)continue;
   if(version.mirror&&!positionSpecified&&!locked&&!evidence&&!l.parentId&&!l.attachment&&Number.isFinite(l.x)&&Number.isFinite(l.width)){const widthAt=k=>k.width??l.width;l.x=1-l.x-l.width;l.keyframes=l.keyframes?.map(k=>({...k,...(k.x!==undefined?{x:1-k.x-widthAt(k)}:{})}));if(l.direction==='left')l.direction='right';else if(l.direction==='right')l.direction='left';if(l.role==='narrated-action'||l.battleEffect)l.flipX=!l.flipX;}
   if(motion&&!entranceSpecified&&!locked&&!l.parentId&&['subject','supporting-image','game-logo','story-picture'].includes(l.role)&&!l.referenceContinuation&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction&&['spring-pop','scale-reveal','slide-in-out','fade'].includes(l.animation)){l.animation=version.entrance;l.entranceDuration=version.duration;}
   if(motion&&l.role==='background'&&l.id.includes('-presentation-pattern-')){const drift=version.backgroundTravel,initial=version.backgroundDirection>0?-.06+drift:-.06;l.keyframes=[{time:0,x:initial,y:-.04},{time:next.duration,x:initial-version.backgroundDirection*drift,y:-.01}];
    // Quiet game-pattern variation uses the same game artwork, without any
    // script-specific gag, asset substitution or narration retiming.
    const phase=version.patternPhase%73;l.svg=l.svg?.replace('</svg>',`<g opacity="0.025" fill="#ffffff"><circle cx="${phase+80}" cy="${phase+120}" r="36"/><circle cx="${phase+650}" cy="${phase+850}" r="46"/></g></svg>`);}
   if(l.role==='background'&&l.type==='shape'&&/^#[a-f0-9]{6}$/i.test(l.color||'')&&!locked&&!/\b(?:background|backdrop)\b[^.!?\n]{0,35}\b(?:red|blue|green|black|white|purple|orange|yellow|#[a-f0-9]{3,8})\b/i.test(next.editingInstructions||'')){const rgb=[1,3,5].map(at=>parseInt(l.color.slice(at,at+2),16)),delta=(version.mirror?1:-1)*(4+version.patternPhase%9);l.color='#'+rgb.map(v=>Math.max(0,Math.min(255,v+delta)).toString(16).padStart(2,'0')).join('');}
  }
 }
 next.editVersion={...version,compiled:true};return next;
}
