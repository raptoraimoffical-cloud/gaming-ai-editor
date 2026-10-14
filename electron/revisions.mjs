import {planEditOperations} from './edit-agent.mjs';
import Ajv from 'ajv';
import {environmentSvg} from './environments.mjs';
import {ANIMATION_PRESETS,propertyAt} from './layer-motion.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {validateProject} from './planner.mjs';

const properties={attachmentX:{type:'number',minimum:0,maximum:1},attachmentY:{type:'number',minimum:0,maximum:1},attachmentSize:{type:'number',minimum:.05,maximum:1},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},mediaId:{type:'string'},text:{type:'string',maxLength:2000},scale:{type:'number',minimum:.1,maximum:4},factor:{type:'number',minimum:.1,maximum:4},x:{type:'number',minimum:-.5,maximum:1.5},y:{type:'number',minimum:-.5,maximum:1.5},fontSize:{type:'number',minimum:16,maximum:100},wordsPerGroup:{type:'integer',minimum:1,maximum:12},minimal:{type:'boolean'},enabled:{type:'boolean'},preset:{enum:[...ANIMATION_PRESETS,'slide','spring','left','right']},environment:{enum:['minecraft-forest','minecraft','battle','platformer','analysis']},at:{type:'number',minimum:0},width:{type:'number',minimum:.01,maximum:2},height:{type:'number',minimum:.01,maximum:2},rotation:{type:'number',minimum:-360,maximum:360},opacity:{type:'number',minimum:0,maximum:1},start:{type:'number',minimum:0},end:{type:'number',minimum:0},z:{type:'integer',minimum:0,maximum:1000},direction:{enum:['left','right','up','down']},animationAmount:{type:'number',minimum:0,maximum:.5},exit:{enum:['none','fade','slide','scale']},fit:{enum:['cover','contain']},shift:{type:'number',minimum:-10,maximum:10},entranceDuration:{type:'number',minimum:.03,maximum:3},exitDuration:{type:'number',minimum:.03,maximum:3},level:{enum:['restrained','normal','dramatic']},volume:{type:'number',minimum:0,maximum:1}};
export const operationSchema={type:'object',additionalProperties:false,required:['operations'],properties:{operations:{type:'array',minItems:1,maxItems:50,items:{type:'object',additionalProperties:false,required:['type','sceneIds'],properties:{type:{enum:['background','scale','position','replace','text','captions','animation','timing','remove','add','intensity','sfx','properties']},sceneIds:{type:'array',minItems:1,uniqueItems:true,items:{type:'string'}},layerIds:{type:'array',uniqueItems:true,items:{type:'string'}},...properties}}}}};
const valid=new Ajv({strict:false}).compile(operationSchema);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Storyboard motion metadata can reference the very same keyframe array as a layer.
// Undo must copy each path independently so restoring metadata cannot also mutate a layer.
const independentClone=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(independentClone):Object.fromEntries(Object.entries(v).map(([k,value])=>[k,independentClone(value)]));
const normalized=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
export const requestClauses=request=>request.replace(/\b(at\s+(?:\d+:)?\d+(?:\.\d+)?(?:\s*(?:seconds?|s))?),\s*(?=(?:make|have|use)\b)/gi,'$1 ').split(/[;\n]+|,\s*(?=(?:make|have|use)\b)|(?<=[.!?])\s+|\s+(?:and|then)\s+(?=(?:change|make|remove|delete|replace|add|move|reduce|hide|show|adjust|set|have|use)\b)/i).map(s=>s.trim()).filter(Boolean);
export function scenesFor(project,request,context={}){
 if(context.timeRange){const {start,end}=context.timeRange;if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>project.duration||end-start<.1)throw Error('Choose a range inside the video.');return project.scenes.filter(s=>s.start<end&&s.end>start);}
 const numbered=[...request.matchAll(/\bscene\s*(\d+)/gi)].map(m=>Number(m[1])-1);
 const range=request.match(/\bscenes\s+(\d+)\s*(?:through|to|-)\s*(\d+)/i);
 if(range)for(let i=Number(range[1])-1;i<Number(range[2]);i++)numbered.push(i);
 const multi=request.match(/\bscenes\s+(\d+)\s*(?:and|,)\s*(\d+)/i);if(multi)numbered.push(Number(multi[1])-1,Number(multi[2])-1);
 if(numbered.length){if(numbered.some(i=>!project.scenes[i]))throw Error('A requested scene does not exist.');return [...new Set(numbered)].map(i=>project.scenes[i]);}
 const time=request.match(/\b(?:at|timestamp)\s*(?:(\d+):)?(\d+(?:\.\d+)?)\b/i);
 if(time){const t=Number(time[1]||0)*60+Number(time[2]);const s=project.scenes.find(s=>t>=s.start&&t<s.end);if(!s)throw Error(`No scene covers ${t}s.`);return [s];}
 const interval=request.match(/\b(?:from|between)\s*(\d+(?:\.\d+)?)\s*(?:to|and|-)\s*(\d+(?:\.\d+)?)\s*(?:seconds|s)?/i);if(interval){const a=Number(interval[1]),b=Number(interval[2]);if(a>=b||a<0||b>project.duration)throw Error('Time range is outside the video');return project.scenes.filter(s=>s.start<b&&s.end>a);}
 if(!/entire|whole|all scenes|every scene|global/i.test(request)&&context.sceneId){const selected=project.scenes.find(s=>s.id===context.sceneId);if(!selected)throw Error('Selected scene no longer exists');return [selected];}
 return project.scenes;
}
function availableAsset(project,name){const target=normalized(name.replace(/[.!]$/,''));const exact=project.media.filter(m=>['pokemon','image','video'].includes(m.kind)&&(m.license||m.provider==='google-images'&&m.decoded)&&[m.name,m.pokemon?.displayName,m.pokemon?.name,...project.scenes.flatMap(s=>s.reaction?.entities.filter(e=>e.mediaId===m.id&&s.layers?.some(l=>l.mediaId===m.id)).map(e=>e.name)||[])].filter(Boolean).some(n=>normalized(n.replace(/\.[a-z0-9]+$/i,''))===target));if(exact.length!==1)throw Error(`Available asset "${name}" ${exact.length?'is ambiguous; use its exact library name':'was not found; import or download it first'}.`);return exact[0];}
export function layerRole(l,s){if(l.role)return l.role;if(l.type==='shape'&&l.x===0&&l.y===0&&l.width===1&&l.height===1)return 'background';if(l.type==='text'&&(l.text===s.title||l.text===s.titleOverride)&&l.y<.22)return 'title';if(l.mediaId)return 'subject';return 'graphic';}
function targetLayers(project,scenes,request,{text=false,context={}}={}){
 const candidates=scenes.flatMap(s=>(s.layers||[]).map(l=>({s,l})));
 if(/\btitle|headline\b/i.test(request))return candidates.filter(({s,l})=>layerRole(l,s)==='title');
 if(context.layerId&&/\b(this|that|selected)\b|\b(picture|object)\b/i.test(request)){const selected=candidates.filter(({l})=>l.id===context.layerId);if(selected.length&&(!text||selected[0].l.type==='text'))return selected;}
 if(text)return candidates.filter(({l})=>l.type==='text'&&l.y<.9);
 const named=project.media.filter(m=>['image','video','pokemon'].includes(m.kind)).flatMap(m=>{
  const aliases=[m.pokemon?.displayName||m.name.replace(/\.[a-z0-9]+$/i,''),m.identity?.subject,...project.scenes.flatMap(s=>s.reaction?.entities.filter(e=>e.mediaId===m.id&&s.layers?.some(l=>l.mediaId===m.id)).map(e=>e.name)||[])].filter(Boolean);
  return [...new Set(aliases)].filter(n=>n.length>2).flatMap(name=>[...request.matchAll(new RegExp('\\b'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[-\s]+/g,'[-\\s]+')+'\\b','gi'))].map(match=>({id:m.id,start:match.index,end:match.index+match[0].length})));
 });
 // Discard a nested base-name match inside an explicitly named alternate form.
 const matches=named.filter(a=>!named.some(b=>b.start<=a.start&&b.end>=a.end&&b.end-b.start>a.end-a.start));
 if(matches.length){const ids=new Set(matches.map(m=>m.id));return candidates.filter(({s,l})=>ids.has(l.mediaId)&&layerRole(l,s)!=='background');}
 const subjects=candidates.filter(({s,l})=>['image','video'].includes(l.type)&&l.mediaId&&layerRole(l,s)!=='background');
 if(!/\b(?:image|sprite|character|asset|element|pok[eé]mon|it)\b|\b(?:images|sprites|characters|assets|elements)\b/i.test(request))throw Error('The requested element was not found. Use its exact available asset name, title, image, or sprite.');
 if(/\b(?:all|every)\b|pok[eé]mon.*(?:appear|earlier)|(?:sprites|images|characters)\b/i.test(request))return subjects;
 if(/\b(?:main|primary)\s+(?:character|subject)\b/i.test(request))return scenes.flatMap(s=>subjects.filter(t=>t.s.id===s.id).slice(0,1));
 if(context.layerId&&/\bit\b/i.test(request))return subjects.filter(t=>t.l.id===context.layerId);
 if(subjects.length===1)return subjects;
 throw Error('Specify a scene and an exact asset or layer name; the target is ambiguous.');
}
const colors={'bright green':'#00ff00',green:'#00ff00','dark red':'#350d19','dark blue':'#0a1835','dark green':'#092b22',red:'#b82b3a',blue:'#2259ab',black:'#050812',white:'#ffffff',purple:'#301744'};
export function interpretLocal(project,request,context={}){
 const operations=[];
 for(const clause of requestClauses(request)){
  const scenes=scenesFor(project,clause,context),sceneIds=scenes.map(s=>s.id);const op={sceneIds};
  if(/\bbackground\b/i.test(clause)&&/minecraft.*forest|forest.*minecraft/i.test(clause)){operations.push({...op,type:'background',environment:'minecraft-forest'});
  }else if(/\b(cinematic|energetic|smoother)\b/i.test(clause)&&! /\b(?:background|captions?|subtitles?|add|insert|replace)\b/i.test(clause)){operations.push({...op,type:'intensity',level:/energetic/i.test(clause)?'dramatic':'restrained'});
  }else if(/\bbackground\b/i.test(clause)){
   const color=clause.match(/#[0-9a-f]{6}/i)?.[0]||Object.entries(colors).find(([name])=>clause.toLowerCase().includes(name))?.[1];
   if(color)operations.push({...op,type:'background',color});
   else {const match=clause.match(/background.*?\b(?:to|with|use)\s+(.+?)[.!]?$/i);if(!match)throw Error('Choose a background hex color or an exact available asset name.');operations.push({...op,type:'background',mediaId:availableAsset(project,match[1]).id});}
  }else if(/caption|subtitle/i.test(clause)){
   const size=clause.match(/(?:size|to)\s*(\d+)\s*(?:px|pixels)/i);const color=clause.match(/#[0-9a-f]{6}/i)?.[0];
   if(!size&&!color&&!/small|large|bigger|hide|disable|show|minimal/i.test(clause))throw Error('Supported captions: smaller/larger, size in px, minimal, hide/show, or hex color.');
   operations.push({...op,type:'captions',...(size?{fontSize:Number(size[1])}:/small|minimal/i.test(clause)?{fontSize:30,wordsPerGroup:3,minimal:true}:/large|bigger/i.test(clause)?{fontSize:58}:{}),...(color?{color}:{}),...(/hide|disable/i.test(clause)?{enabled:false}:/show/i.test(clause)?{enabled:true}:{})});
  }else if(/sound effects?|\bsfx\b/i.test(clause)){
   const vol=clause.match(/(?:to|volume)\s*(\d+(?:\.\d+)?)\s*(%?)/i);const reduce=/reduc|less|quieter|mute|remove/i.test(clause);
   if(!vol&&!reduce)throw Error('Specify SFX volume as a percentage or ask to reduce/mute it.');operations.push({...op,type:'sfx',volume:vol?Number(vol[1])/(vol[2]?100:1):/mute|remove/i.test(clause)?0:.04});
  }else if(/intensity|dramatic|restrained|subtle/i.test(clause)){
   let targets=scenes;if(/ranking/i.test(clause))targets=scenes.filter(s=>s.kind==='ranking'||s.reaction?.intent==='ranking');if(!targets.length)throw Error('No ranking scene was found.');operations.push({type:'intensity',sceneIds:targets.map(s=>s.id),level:/dramatic/i.test(clause)?'dramatic':/restrained|subtle|less/i.test(clause)?'restrained':'normal'});
  }else if(/\b(animation|slide.in|fade|spring|zoom|parallax|reveal|emphasis)\b/i.test(clause)&&!(/caption|background/i.test(clause))){const targets=targetLayers(project,scenes,clause,{context});if(!targets.length)throw Error('Select the image or character to animate');const preset=/slide/i.test(clause)?'slide-in-out':/spring|pop/i.test(clause)?'spring-pop':/mask|wipe/i.test(clause)?'mask-reveal':/parallax/i.test(clause)?'parallax':/zoom/i.test(clause)?'smooth-zoom':/scale|reveal/i.test(clause)?'scale-reveal':/emphasis/i.test(clause)?'emphasis':/none/i.test(clause)?'none':'fade';operations.push({...op,type:'animation',layerIds:targets.map(t=>t.l.id),preset,...(/slide.*from.*left/i.test(clause)?{direction:'left',animationAmount:.5,entranceDuration:.65}:{})});
  }else if(/\badd\b/i.test(clause)){
   const match=clause.match(/\badd\s+(.+?)(?:\s+(?:to|in)\s+scene\b|[.!]?$)/i);if(!match)throw Error('Specify the available asset to add.');operations.push({...op,type:'add',mediaId:availableAsset(project,match[1]).id});
  }else if(/\breplace\b/i.test(clause)){
   const match=clause.match(/\bwith\s+(.+?)[.!]?$/i);if(!match)throw Error('Specify the exact available replacement asset.');const targets=targetLayers(project,scenes,clause.split(/\bwith\b/i)[0],{context});if(!targets.length)throw Error('The asset to replace was not found.');operations.push({...op,type:'replace',layerIds:targets.map(t=>t.l.id),mediaId:availableAsset(project,match[1]).id});
  }else{
   if(!/\b(?:remove|delete|text|title|headline|bigger|larger|large|twice|smaller|scale|size|earlier|later|timing|move|position|animation|entrance|fade|spring|slide|float)\b/i.test(clause))throw Error('Unsupported request. Supported changes include backgrounds, asset size/position/replacement, text, captions, entrances/timing, intensity, and SFX volume.');
   const remove=/\bremove|delete\b/i.test(clause);const text=/\btext|title|headline\b/i.test(clause);const targets=targetLayers(project,scenes,clause,{text,context});if(!targets.length)throw Error('The requested element was not found. Specify its exact name and scene.');const ids=targets.map(t=>t.l.id);const scoped={sceneIds:[...new Set(targets.map(t=>t.s.id))],layerIds:ids};
   if(remove)operations.push({...scoped,type:'remove'});
   else if(text){const match=clause.match(/\bto\s+["']?(.+?)["']?[.!]?$/i);if(!match)throw Error('Specify the new text after "to".');operations.push({...scoped,type:'text',text:match[1]});}
   else if(/bigger|larger|large|twice|smaller|scale|size/i.test(clause)){const pct=clause.match(/(\d+(?:\.\d+)?)\s*%/);operations.push({...scoped,type:'scale',factor:/twice|double/i.test(clause)?2:/smaller/i.test(clause)?1-Number(pct?.[1]||20)/100:1+Number(pct?.[1]||20)/100});}
   else if(/earlier|later|timing/i.test(clause)){const delta=Number(clause.match(/(\d+(?:\.\d+)?)\s*(?:s|seconds)\b/i)?.[1]||.35);operations.push({...scoped,type:'timing',shift:/earlier/i.test(clause)?-delta:delta});}
   else if(/move|position/i.test(clause)){const xy=clause.match(/x\s*=?\s*(-?\d*\.?\d+)\s*[, ]+y\s*=?\s*(-?\d*\.?\d+)/i);if(xy)operations.push({...scoped,type:'position',x:Number(xy[1]),y:Number(xy[2])});else if(/left|right|up|down|center/i.test(clause)){for(const {s,l} of targets)operations.push({type:'position',sceneIds:[s.id],layerIds:[l.id],...(/left/i.test(clause)?{x:l.x-.1}:/right/i.test(clause)?{x:l.x+.1}:/center/i.test(clause)?{x:(1-l.width)/2}:{}),...(/up/i.test(clause)?{y:l.y-.1}:/down/i.test(clause)?{y:l.y+.1}:{})});}else throw Error('Specify left/right/up/down/center or normalized x and y positions.');}
   else if(/animation|entrance|fade|spring|slide|float/i.test(clause)){const preset=clause.match(/\b(none|fade|spring|slide|left|right)\b/i)?.[1]?.toLowerCase();if(!preset)throw Error('Supported animation presets: none, fade, spring, slide, left, right.');operations.push({...scoped,type:'animation',preset});}
   else throw Error('Unsupported request. Supported changes include backgrounds, asset size/position/replacement, text, captions, entrances/timing, intensity, and SFX volume.');
  }
 }
 for(const operation of operations){const time=request.match(/\bat\s*(\d+(?:\.\d+)?)(?![\d:])\s*(?:seconds|s)?/i);if(time&&['scale','position'].includes(operation.type))operation.at=Number(time[1]);}
 return {operations};
}

const allowed={background:['color','mediaId','environment'],scale:['scale','factor','at'],position:['x','y','at'],replace:['mediaId'],text:['text'],captions:['fontSize','wordsPerGroup','minimal','enabled','color'],animation:['preset','entranceDuration','exitDuration','direction','animationAmount','exit'],timing:['shift'],remove:[],add:['mediaId','x','y','scale','start','end'],intensity:['level'],sfx:['volume'],properties:['attachmentX','attachmentY','attachmentSize','x','y','width','height','scale','rotation','opacity','start','end','z','preset','direction','animationAmount','entranceDuration','exitDuration','exit','fit']};
export const OPERATION_FIELDS=allowed;
function timedProperty(layer,key,time,target,end){
 const old=propertyAt(layer,key,time),finish=Math.min(end-.01,time+.3);if(finish<=time)throw Error('No room for a timed transition');
 const frames=(layer.keyframes||[]).map(k=>({...k}));for(const frame of frames)if(frame.time>time)delete frame[key];
 function point(t,value){let frame=frames.find(k=>Math.abs(k.time-t)<1e-7);if(!frame){frame={time:t};frames.push(frame);}frame[key]=value;}
 if(time>layer.start)point(layer.start,propertyAt(layer,key,layer.start));point(time,old);point(finish,target);
 layer.keyframes=frames.filter(k=>Object.keys(k).length>1).sort((a,b)=>a.time-b.time);
}
export function applyOperations(project,command){
 if(!valid(command))throw Error(`Invalid edit operations: ${new Ajv().errorsText(valid.errors)}`);
 const p=structuredClone(project),descriptions=[];
 for(const op of command.operations){
  for(const k of Object.keys(op))if(!['type','sceneIds','layerIds',...allowed[op.type]].includes(k))throw Error(`${k} is not supported for ${op.type}.`);
  if(op.type!=='remove'&&!allowed[op.type].some(k=>op[k]!==undefined))throw Error(`${op.type} requires a supported value.`);
  const scenes=op.sceneIds.map(id=>{const s=p.scenes.find(s=>s.id===id);if(!s)throw Error(`Unknown scene: ${id}`);return s;});
  const asset=op.mediaId?p.media.find(m=>m.id===op.mediaId):undefined;
  if(op.mediaId&&(!asset||!['image','video','pokemon'].includes(asset.kind)||!asset.license&&!(asset.provider==='google-images'&&asset.decoded)))throw Error('Use an existing visual asset with declared rights.');
  const requireLayer=['scale','position','replace','text','animation','timing','remove','properties'].includes(op.type);
  const layers=scenes.flatMap(s=>(s.layers||[]).filter(l=>op.layerIds?.includes(l.id)).map(l=>({s,l})));
  if(requireLayer&&(!op.layerIds?.length||layers.length!==op.layerIds.length))throw Error('A requested layer was not found in the selected scenes.');
  for(const s of scenes){
   if(op.type==='background'){
    const bg=s.layers?.find(l=>layerRole(l,s)==='background');if(!bg)throw Error('This scene has no editable background layer; rebuild visual layers first.');
    if(op.environment){bg.type='svg';bg.svg=environmentSvg(op.environment);bg.opacity=1;bg.manual=true;bg.animation='background-motion';bg.animationAmount=.06;delete bg.mediaId;delete bg.color;s.backgroundConcept=`Original ${op.environment} environment; not a game screenshot`;}
    else if(asset){bg.manual=true;delete bg.svg;bg.type=asset.kind==='video'?'video':'image';bg.mediaId=asset.id;bg.fit='cover';bg.role='background';delete bg.color;}
    else{delete bg.svg;bg.manual=true;bg.animation='none';bg.keyframes=[];bg.enter='none';bg.exit='none';bg.x=0;bg.y=0;bg.width=1;bg.height=1;bg.scale=1;bg.type='shape';bg.color=op.color;bg.opacity=1;bg.role='background';delete bg.mediaId;}
   }
   if(op.type==='captions'){s.captionStyle={...s.captionStyle,...Object.fromEntries(Object.entries(op).filter(([k])=>['fontSize','wordsPerGroup','minimal','enabled'].includes(k)))};if(op.color){s.captionAccent=op.color;s.captionColorManual=true;s.captionStyle={...s.captionStyle,style:'contrast-phrase'};}}
   if(op.type==='add'){if(!s.layers)throw Error('Rebuild visual layers first.');s.layers.push({id:`${s.id}-added-${crypto.randomUUID()}`,type:asset.kind==='video'?'video':'image',role:'subject',manual:true,mediaId:asset.id,x:op.x??.18,y:op.y??.18,width:.64,height:.57,z:Math.max(0,...s.layers.map(l=>l.z))+1,start:op.start??s.start,end:op.end??s.end,fit:'contain',scale:op.scale??1,enter:'fade'});}
   if(op.type==='intensity')for(const l of s.layers||[]){if(layerRole(l,s)==='background'||l.width===1&&l.height===1)continue;l.animation=op.level==='dramatic'?'emphasis':'smooth-zoom';l.animationAmount=op.level==='dramatic'?.16:.10;l.enter=op.level==='dramatic'?'spring':op.level==='restrained'?'fade':'slide';l.float=op.level==='dramatic'&&l.type==='image';l.entranceDuration=op.level==='dramatic'?.55:op.level==='restrained'?.3:.22;l.rotation=0;}
  }
  if(op.type==='sfx'){const fx=p.soundEffects?.filter(f=>scenes.some(s=>f.start>=s.start&&f.start<s.end));if(!fx?.length)throw Error('No sound effects occur in the selected scenes.');fx.forEach(f=>f.volume=op.volume);}
  for(const {s,l} of layers){
   if(op.at!==undefined&&['scale','position'].includes(op.type)){if(op.at<s.start||op.at>=s.end)throw Error('Edit timestamp is outside the target scene');if(op.type==='scale')timedProperty(l,'scale',op.at,op.factor?propertyAt(l,'scale',op.at)*op.factor:op.scale,s.end);else for(const key of ['x','y'])if(op[key]!==undefined)timedProperty(l,key,op.at,op[key],s.end);continue;}
   if(op.type==='properties'){if(['x','y','width','height'].some(k=>op[k]!==undefined&&op[k]!==l[k]))l.manualFraming=true;for(const [key,field] of [['attachmentX','x'],['attachmentY','y'],['attachmentSize','size']])if(op[key]!==undefined){if(!l.attachment)throw Error('This layer is not attached to a character');l.attachment[field]=op[key];if(field!=='size')l.attachment.autoAnchor=false;}const oldStart=l.start;for(const key of ['x','y','width','height','scale','rotation','opacity'])if(op[key]!==undefined){const before=l[key]??(['scale','opacity'].includes(key)?1:0),delta=op[key]-before;l[key]=op[key];if(l.keyframes)l.keyframes=l.keyframes.map(k=>k[key]===undefined?k:{...k,[key]:['opacity','width','height'].includes(key)?op[key]:key==='scale'?k[key]*(op[key]/before):k[key]+delta});}for(const key of ['width','height','start','end','z','direction','animationAmount','entranceDuration','exitDuration','exit','fit'])if(op[key]!==undefined)l[key]=op[key];if(op.start!==undefined&&l.keyframes){const delta=l.start-oldStart;l.keyframes=l.keyframes.map(k=>({...k,time:k.time+delta})).filter(k=>k.time>=s.start&&k.time<=s.end);}if(op.preset)l.animation=op.preset;if(l.start<s.start||l.end>s.end||l.end<=l.start||l.x+l.width<=0||l.y+l.height<=0||l.x>=1||l.y>=1)throw Error('Keep the layer visible and its timing inside the scene');}

   if(op.type==='scale'){if(!['image','video','group'].includes(l.type))throw Error('Scale edits target visual assets or groups.');const factor=op.factor??op.scale/(l.scale??1);l.scale=(l.scale??1)*factor;if(l.keyframes)l.keyframes=l.keyframes.map(k=>k.scale===undefined?k:{...k,scale:k.scale*factor});if(l.scale<.1||l.scale>4||l.keyframes?.some(k=>k.scale!==undefined&&(k.scale<.1||k.scale>4)))throw Error('Resulting scale must be between 0.1 and 4.');}
   if(op.type==='position'&&['x','y'].some(k=>op[k]!==undefined&&op[k]!==l[k]))l.manualFraming=true;
   if(op.type==='position')for(const key of ['x','y'])if(op[key]!==undefined){const delta=op[key]-l[key];l[key]=op[key];if(l.keyframes)l.keyframes=l.keyframes.map(k=>k[key]===undefined?k:{...k,[key]:k[key]+delta});}
   if(op.type==='replace'){l.manual=true;l.mediaId=asset.id;l.type=asset.kind==='video'?'video':'image';}
   if(op.type==='text'){if(l.type!=='text')throw Error('Text edits require a text layer.');const title=layerRole(l,s)==='title';l.text=op.text;if(title){s.title=op.text;s.titleOverride=op.text;}}
   if(op.type==='animation'){if(op.preset){l.animation=op.preset;l.animationStart=l.start;l.enter=['none','fade','spring','slide','left','right'].includes(op.preset)?op.preset:'none';if(op.preset==='none'){l.float=false;l.rotation=0;l.keyframes=(l.keyframes||[]).map(k=>Object.fromEntries(Object.entries(k).filter(([key])=>!['x','y','width','height','scale','scaleX','scaleY','rotation'].includes(key)))).filter(k=>Object.keys(k).length>1);}}if(op.direction)l.direction=op.direction;if(op.animationAmount!==undefined)l.animationAmount=op.animationAmount;if(op.exit)l.exit=op.exit;if(op.entranceDuration)l.entranceDuration=op.entranceDuration;if(op.exitDuration)l.exitDuration=op.exitDuration;}
   if(op.type==='timing'){const start=Math.max(s.start,Math.min(l.end-.03,l.start+op.shift)),delta=start-l.start;l.start=start;if(l.keyframes)l.keyframes=l.keyframes.map(k=>({...k,time:Math.max(s.start,Math.min(s.end,k.time+delta))}));}
   if(op.type==='remove'){const ids=new Set([l.id]);let more=true;while(more){more=false;for(const a of s.layers)if((ids.has(a.parentId)||ids.has(a.attachment?.targetId))&&!ids.has(a.id)){ids.add(a.id);more=true;}}s.layers=s.layers.filter(a=>!ids.has(a.id));}
  }
  descriptions.push(`${op.type}: ${requireLayer?`${layers.length} layer(s) in `:''}${scenes.map(s=>`Scene ${p.scenes.findIndex(a=>a.id===s.id)+1}`).join(', ')}${op.color?' → '+op.color:''}${op.factor?' × '+op.factor:''}${asset?' → '+(asset.pokemon?.displayName||asset.name):''}${op.fontSize?' → '+op.fontSize+'px':''}${op.volume!==undefined?' → volume '+op.volume:''}`);
 }
 validateProject(p);return {project:p,summary:descriptions.join('; ')};
}

function diff(a,b,path=[],out=[]){
 if(equal(a,b))return out;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&(!Array.isArray(a)||a.length===b.length&&a.every((v,i)=>!v?.id||v.id===b[i]?.id))){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],[...path,key],out);}
 else out.push({path,before:a,after:b,beforeExists:a!==undefined,afterExists:b!==undefined});return out;
}
export function recordRevision(before,after,request,operations,summary,interpreter){
 const fields=['visualInstructionPlan','visualInstructionReport','visualInstructionWarnings','shortformEngagementReport','engagementImageReport','cinematicMotion','cinematicReport','cinematicAssetReport','cinematicEnvironmentPlan','fps','referenceLearningReport','pixelEffectReport','sceneBlueprintReport','referenceStageReport','finalPictureLayoutReport','finalInstructionReport','narrationMuted','freshBuildReport','pokemonCorrectionReport','rankPodiumReport','moveCastPlan','moveCastWarnings','explanationCastReport','counterDiagramReport','topic','gameSelection','gameDetectionReport','quickPatchReport','quickPatchRanges','remakeBaseInstructions','lastRemakeInstructions','creativePassId','editVersion','previousCreativePlans','creativeActionReport','autoSoundEffects','autoReactionGifs','freezePokemonMotion','hookReport','cadenceReport','layeredActivityReport','mechanicLayoutReport','creativePlanningReport','creativeSourceReport','creativePropAssets','creativePropWarnings','sourceMoveCardReport','sourceMechanicImagesOnly','overlayLayoutReport','performanceReport','scenes','originalTranscript','transcriptionInfo','scriptAlignment','speechRepairReport','soundEffects','captionStyle','captionColor','musicVolume','musicId','musicClip','battleReport','editingInstructions','editingPreferences','instructionReport','animationPlan','shotPlan','attentionPlan','editorialReport','lastEditAI','visualVersion','pokemonMentions','pokemonWarnings','pokemonRecognitionReport','gamePresentationReport','naturePlan','natureRecognitionReport','captionResearch','engagementReport','pokemonImageReport','moveEffectReport','transitionSoundPlan','referenceFinishReport','storyShotReport','spokenRevealReport','actionMovieReport','expressionReport','narrationAssetPlan','narrationAssetReport','autoStoryShots','reactionGifPlan','reactionGifWarnings','pokemonCryReport','pokemonCryWarnings','autoPokemonCries','soundEffectReport','minecraftSoundLog','shortStyle','shortStyleReport','shortMechanics','format','videoMode'];const patches=[...fields,'publicationWarnings'].flatMap(key=>diff(before[key],after[key],[key])).map(p=>structuredClone(p));if(!patches.length)throw Error('The request would not change the project.');
 const history=(before.revisionHistory||[]).slice(0,before.revisionCursor??before.revisionHistory?.length??0);
 history.push({version:2,id:crypto.randomUUID(),request,summary,interpreter,operations,patches,createdAt:new Date().toISOString()});
 const result={...after,revisionHistory:history.slice(-30),revisionCursor:Math.min(30,history.length)};delete result.editPreviewTime;delete result.editPreviewRevisionId;
 const pictures=(operations||[]).filter(o=>o.type==='add'&&after.media.some(m=>m.id===o.mediaId&&['image','pokemon','video'].includes(m.kind))).map(o=>o.start??after.scenes.find(s=>o.sceneIds.includes(s.id))?.start);
 if(JSON.stringify(before.lastEditAI)!==JSON.stringify(after.lastEditAI))pictures.push(...(after.lastEditAI?.additions||[]).map(a=>a.start));
 if(JSON.stringify(before.visualInstructionReport)!==JSON.stringify(after.visualInstructionReport))pictures.push(...(after.visualInstructionReport?.applied||[]).map(a=>a.start));
 const start=Math.min(...pictures.filter(Number.isFinite));if(Number.isFinite(start)){result.editPreviewTime=Math.min(after.duration-.04,start+.35);result.editPreviewRevisionId=history.at(-1).id;}
 return result;
}
export function undoRedo(project,direction){
 if(!['undo','redo'].includes(direction))throw Error('Invalid history direction.');
 const p=independentClone(project),cursor=p.revisionCursor??p.revisionHistory?.length??0,index=direction==='undo'?cursor-1:cursor,entry=p.revisionHistory?.[index];if(!entry)throw Error(`Nothing to ${direction}.`);
 const patches=direction==='undo'?[...entry.patches].reverse():entry.patches;
 for(const patch of patches){if(!Array.isArray(patch.path)||!['visualInstructionPlan','visualInstructionReport','visualInstructionWarnings','publicationWarnings','shortformEngagementReport','engagementImageReport','cinematicMotion','cinematicReport','cinematicAssetReport','cinematicEnvironmentPlan','fps','referenceLearningReport','pixelEffectReport','sceneBlueprintReport','referenceStageReport','finalPictureLayoutReport','finalInstructionReport','narrationMuted','freshBuildReport','pokemonCorrectionReport','rankPodiumReport','moveCastPlan','moveCastWarnings','explanationCastReport','counterDiagramReport','topic','gameSelection','gameDetectionReport','quickPatchReport','quickPatchRanges','remakeBaseInstructions','lastRemakeInstructions','creativePassId','editVersion','previousCreativePlans','creativeActionReport','autoSoundEffects','autoReactionGifs','freezePokemonMotion','hookReport','cadenceReport','layeredActivityReport','mechanicLayoutReport','creativePlanningReport','creativeSourceReport','creativePropAssets','creativePropWarnings','sourceMoveCardReport','sourceMechanicImagesOnly','overlayLayoutReport','performanceReport','scenes','originalTranscript','transcriptionInfo','scriptAlignment','speechRepairReport','soundEffects','captionStyle','captionColor','musicVolume','musicId','musicClip','battleReport','editingInstructions','editingPreferences','instructionReport','animationPlan','shotPlan','attentionPlan','editorialReport','lastEditAI','visualVersion','pokemonMentions','pokemonWarnings','pokemonRecognitionReport','gamePresentationReport','naturePlan','natureRecognitionReport','captionResearch','engagementReport','pokemonImageReport','moveEffectReport','transitionSoundPlan','referenceFinishReport','storyShotReport','spokenRevealReport','actionMovieReport','expressionReport','narrationAssetPlan','narrationAssetReport','autoStoryShots','reactionGifPlan','reactionGifWarnings','pokemonCryReport','pokemonCryWarnings','autoPokemonCries','soundEffectReport','minecraftSoundLog','shortStyle','shortStyleReport','shortMechanics','format','videoMode'].includes(patch.path[0])||patch.path.some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('Invalid revision history path.');let obj=p;for(const key of patch.path.slice(0,-1)){obj=obj?.[key];if(!obj)throw Error('The edited structure changed manually; cannot safely restore this revision.');}const key=patch.path.at(-1),expected=direction==='undo'?patch.after:patch.before,value=direction==='undo'?patch.before:patch.after,exists=direction==='undo'?patch.beforeExists:patch.afterExists;if(!equal(obj[key],expected))throw Error('This field changed after the AI revision. Undo would overwrite a manual edit; restore it first.');if(exists)obj[key]=structuredClone(value);else delete obj[key];}
 p.revisionCursor=direction==='undo'?cursor-1:cursor+1;validateProject(p);return entry.version===2?p:refreshStoryboard(p);
}

export async function reviseProject(project,request,settings={},fetchImpl=fetch,context={}){
 if(typeof request!=='string'||!request.trim()||request.length>64000)throw Error('Enter a revision request of 1–64000 characters.');
 if(/\b(?:3d.*(?:animation|animated|render|character|model|effect)|lip[- ]?sync|(?:rewrite|re.?record).*narration|generate.*(?:footage|voice))\b/i.test(request))throw Error('Unsupported request: this editor edits existing visual layers and audio levels; it cannot synthesize 3D animation, lip sync, footage, or narration.');
 validateProject(project);let command,trace,interpreter='Built-in command interpreter';
 if(settings.preferExactCommands&&!settings.requireAI){let exact;try{exact=interpretLocal(project,request,context);}catch{}if(exact){const applied=applyOperations(project,exact);return recordRevision(project,refreshStoryboard(applied.project),request,exact.operations,applied.summary,'Exact command interpreter');}}
 if(settings.requireAI&&!settings.model)throw Error('No editing model is connected. Open AI Models, select an AI Changes model and save.');
 if(settings.connectionError)throw Error(settings.connectionError+'; open AI Models settings to reconnect.');
 if(settings.fetchImpl)fetchImpl=settings.fetchImpl;
 if(settings.model){
  let suggestedOperations;try{suggestedOperations=interpretLocal(project,request,context).operations;}catch{}
  const planned=await planEditOperations(project,request,settings,fetchImpl,context,suggestedOperations);command=planned.command;trace=planned.trace;interpreter=(settings.provider==='hosted'?'Hosted':'Ollama')+' / '+settings.model;
 }else command=interpretLocal(project,request,context);
 if(!valid(command))throw Error('The interpreter returned unsupported or invalid operations; no edits were applied.');
 const clauses=requestClauses(request);
 for(const op of command.operations){const inferred=clauses.flatMap(c=>{try{return interpretLocal(project,c,context).operations.filter(o=>o.type===op.type);}catch{return [];}});const scope=inferred.length?[...new Set(inferred.flatMap(o=>o.sceneIds))]:[...new Set(clauses.flatMap(c=>scenesFor(project,c,context).map(s=>s.id)))];if(op.sceneIds.some(id=>!scope.includes(id)))throw Error('The model targeted an unrelated scene; no edits were applied.');}
 if(settings.model){for(const op of command.operations.filter(o=>['scale','position','timing','animation','replace','text','remove','properties'].includes(o.type))){const targetClauses=clauses.filter(c=>op.sceneIds.every(id=>scenesFor(project,c,context).some(s=>s.id===id)));const allowedTargets=new Set(targetClauses.flatMap(c=>{try{return targetLayers(project,op.sceneIds.map(id=>project.scenes.find(s=>s.id===id)),c.split(/\bwith\b/i)[0],{text:/\btext|title|headline\b/i.test(c),context}).map(t=>t.l.id);}catch{return [];}}));if(!allowedTargets.size){for(const scene of project.scenes.filter(s=>op.sceneIds.includes(s.id)))for(const layer of scene.layers||[])if(!layer.instructionLocked&&(!context.layerId||layer.id===context.layerId))allowedTargets.add(layer.id);}if(!op.layerIds?.length||op.layerIds.some(id=>!allowedTargets.has(id)))throw Error('The model did not resolve the requested element unambiguously; no edits were applied. Specify its exact asset name and scene.');}}
 const {project:after,summary}=applyOperations(project,command);return recordRevision(project,refreshStoryboard({...after,...(trace?{lastEditAI:trace}:{})}),request,command.operations,summary,interpreter);
}
