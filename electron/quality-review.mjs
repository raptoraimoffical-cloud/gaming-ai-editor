import {referenceStyleAssessment} from './reference-style-model.mjs';
import {validateProject} from './planner.mjs';
import {auditVisuals} from './storyboard.mjs';
import {motionFor} from './layer-motion.mjs';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const editable=new Set(['fontSize','x','y','width','height','scale','rotation','opacity','entranceDuration','exitDuration','animation','animationAmount','direction']);
const animations=new Set(['none','fade','slide-in-out','spring-pop','scale-reveal','smooth-zoom','parallax','mask-reveal','emphasis','reposition','comparison-reveal','ranking-reveal','background-motion']);
export function sampleTimes(scene){
 const span=scene.end-scene.start,settled=Math.min(scene.end-1/30,scene.start+Math.min(.8,span*.3));
 return [...new Set([settled,scene.start+span*.55,scene.end-Math.min(.35,span*.15)].map(t=>Math.max(scene.start,Math.min(scene.end-1/30,t))))];
}
// Geometry findings are measurable proxies, never an aesthetic/identity score.
export function inspectScene(scene,project){
 const findings=[],pixelHeight=project.format==='horizontal'?1080:1920;
 for(const l of scene.layers||[]){
  if(l.parentId||['background','environment-depth','transition-flash','particles'].includes(l.role)||l.type==='particles')continue;
  const times=sampleTimes(scene).filter(t=>t>=l.start&&t<l.end),bounds=times.map(t=>{const m=motionFor(l,t);const w=l.width*m.scale,h=l.height*m.scale;return {x:m.x+m.dx+(l.width-w)/2,y:m.y+m.dy+(l.height-h)/2,w,h,opacity:m.opacity};}).filter(b=>b.opacity>.5);
  if(!bounds.length)continue;
  // Text needs safe areas. Foreground images can intentionally crop at the edge.
  const margin=l.type==='text'?.04:0;
  if(bounds.some(b=>b.x<margin-.01||b.y<margin-.01||b.x+b.w>1-margin+.01||b.y+b.h>1-margin+.01))findings.push({sceneId:scene.id,layerId:l.id,code:l.type==='text'?'text-safe-area':'subject-clipping',message:'Settled layer bounds extend outside '+(margin?'the text safe area.':'the canvas.'),measured:true});
  if(l.type==='text'&&l.role!=='disclosure'&&(l.fontSize??l.height*pixelHeight*.6)<20)findings.push({sceneId:scene.id,layerId:l.id,code:'small-text',message:'Text size is below 20 output pixels.',measured:true});
 }
 return findings;
}
export function assessProject(project){
 let errors=[];try{validateProject(project);}catch(e){errors.push(e.message);}
 const audit=auditVisuals(project);errors.push(...audit.errors);
 return {errors,warnings:audit.warnings,referenceStyle:referenceStyleAssessment(project),findings:project.scenes.flatMap(s=>inspectScene(s,project))};
}
export function compareAssessments(a,b){return a.errors.length-b.errors.length||a.findings.length-b.findings.length||a.warnings.length-b.warnings.length||(b.referenceStyle?.score??0)-(a.referenceStyle?.score??0); }
export function repairGeometry(scene,project,findings){
 const next=structuredClone(scene);
 for(const l of next.layers||[]){
  if(l.manual||l.instructionLocked||l.parentId||!findings.some(f=>f.layerId===l.id&&['subject-clipping','text-safe-area'].includes(f.code)))continue;
  const margin=l.type==='text'?.04:0,allowed=1-2*margin;
  const oldScale=l.scale??1,maxScale=Math.max(oldScale,...(l.keyframes||[]).map(k=>k.scale??oldScale));
  if(maxScale<=0)continue;
  const factor=Math.min(1,allowed/(l.width*maxScale),allowed/(l.height*maxScale));
  if(factor<1){l.scale=oldScale*factor;for(const k of l.keyframes||[])if(k.scale!==undefined)k.scale*=factor;}
  const scale=maxScale*factor,dx=(l.width-l.width*scale)/2,dy=(l.height-l.height*scale)/2;
  const x=clamp(l.x,margin-dx,1-margin-l.width*scale-dx),y=clamp(l.y,margin-dy,1-margin-l.height*scale-dy);
  const shiftX=x-l.x,shiftY=y-l.y;l.x=x;l.y=y;
  for(const k of l.keyframes||[]){if(k.x!==undefined)k.x+=shiftX;if(k.y!==undefined)k.y+=shiftY;}
 }
 return next;
}
export function applyReviewChanges(scene,changes){
 if(!Array.isArray(changes)||changes.length>20)throw Error('Review changes must be a bounded layer edit list');
 const next=structuredClone(scene);
 for(const c of changes){
  const l=next.layers?.find(l=>l.id===c.layerId);if(!l||l.manual||l.instructionLocked)throw Error('Review cannot change a missing or manually edited layer');
  if(!c.values||Object.keys(c.values).some(k=>!editable.has(k)))throw Error('Review may change supported geometry/motion only; facts, assets and timing are preserved');
  for(const [k,v] of Object.entries(c.values)){
   if(k==='animation'){if(!animations.has(v))throw Error('Unsupported review animation');}
   else if(k==='direction'){if(!['left','right','up','down'].includes(v))throw Error('Unsupported review direction');}
   else if(!Number.isFinite(v)||Math.abs(v)>3||['fontSize','width','height','scale'].includes(k)&&v<=0||k==='opacity'&&(v<0||v>1))throw Error('Invalid review geometry');
   l[k]=v;
   // A base property edit must also update its animated control points.
   if(['x','y','scale','rotation','opacity'].includes(k))for(const keyframe of l.keyframes||[])if(keyframe[k]!==undefined)keyframe[k]=v;
  }
 }
 return next;
}
export function replaceScene(project,scene){return {...project,scenes:project.scenes.map(s=>s.id===scene.id?scene:s)};}
export function parseVisionReview(value,scene){
 if(!value||!Array.isArray(value.issues)||value.issues.length>30)throw Error('Vision response must contain an issues list');
 const codes=new Set(['wrong-subject','wrong-form','irrelevant-media','clipping','unreadable-text','caption-overlap','animation-visibility']);
 const issues=value.issues.map(issue=>{
  if(typeof issue==='string')return {sceneId:scene.id,code:'observation',message:issue.slice(0,1000),measured:false};
  if(!issue||!codes.has(issue.code)||typeof issue.message!=='string'||issue.layerId&&!scene.layers?.some(l=>l.id===issue.layerId))throw Error('Invalid vision issue');
  return {...issue,sceneId:scene.id,message:issue.message.slice(0,1000),measured:false};
 });
 return {issues,changes:Array.isArray(value.changes)?value.changes:[]};
}
