import {heldStorySources} from './story-props.mjs';
import {noMotion} from './game-presentation.mjs';
import {analyzeReaction} from './reactions.mjs';
const clean=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9 ]/gi,'').toLowerCase().trim();
const roleStory=/\b(?:dad|father|mom|mother|parent|child|kid|baby|brother|sister|family|ancestor|descendant|grandpa|grandfather|grandmother|pre[- ]?evolution)\b/i;
export async function prepareStoryCastCandidates(project,{family,progress=()=>{},check=()=>{}}){
 const p=structuredClone(project),memo=new Map();let previous;
 for(const s of p.scenes){s.reaction=s.reaction||analyzeReaction(s,p,previous);previous=s.reaction;s.storyCastCandidates=[];
  if(!roleStory.test(s.text||''))continue;
  for(const e of s.reaction.entities.filter(e=>e.type==='pokemon'&&e.mediaId&&!e.storyCast).slice(0,3))try{
   const name=p.media.find(m=>m.id===e.mediaId)?.pokemon?.name||e.id;check();progress({stage:'Checking related source characters for the narrated story: '+e.name});if(!memo.has(name))memo.set(name,await family(name));
   for(const relative of memo.get(name).members)s.storyCastCandidates.push({sourceActorId:e.id,species:relative.name,evolutionStage:relative.stage,source:memo.get(name).source,fictionOnly:true});
  }catch(error){check();p.storyCastWarnings=[...(p.storyCastWarnings||[]),s.id+': supporting cast source unavailable: '+error.message];}
 }
 return p;
}
export function supportingCastFormat(scene){if(!scene.storyCastCandidates?.length)return {type:'array',maxItems:0,items:{type:'object'}};const roles=scene.words.map((w,i)=>({word:w.text,index:i})).filter(w=>roleStory.test(w.word)),needsRole=roles.length&&(scene.reaction?.entities.filter(e=>e.mediaId&&!e.storyCast).length||0)===1&&!/\b(?:no|without) (?:a )?(?:baby|child|pre[- ]?evolution)\b/i.test(scene.text);return {type:'array',minItems:needsRole?1:0,maxItems:Math.min(2,roles.length||2),items:{type:'object',additionalProperties:false,required:['id','sourceActorId','species','roleQuote','wordIndex'],properties:{id:{type:'string',pattern:'^story-cast-[a-z0-9-]{1,18}$'},sourceActorId:{enum:[...new Set(scene.storyCastCandidates.map(c=>c.sourceActorId))]},species:{enum:[...new Set(scene.storyCastCandidates.filter(c=>!roles.length||!roles.every(r=>/^(dad|father|mom|mother|parent|grandpa|grandfather|grandmother|ancestor)$/i.test(r.word))||c.evolutionStage===Math.max(...scene.storyCastCandidates.filter(r=>r.sourceActorId===c.sourceActorId).map(r=>r.evolutionStage))).map(c=>c.species))]},roleQuote:roles.length?{enum:roles.map(r=>r.word)}:{type:'string',maxLength:80},wordIndex:roles.length?{enum:roles.map(r=>r.index)}:{type:'integer',minimum:0,maximum:Math.max(0,scene.words.length-1)},x:{type:'number',minimum:.03,maximum:.65},y:{type:'number',minimum:.07,maximum:.5},size:{type:'number',minimum:.24,maximum:.5}}}};}
export function plannedSupportingCast(scene,rows=[]){
 if(!Array.isArray(rows)||rows.length>2)throw Error('Too many supporting story characters');const ids=new Set((scene.reaction?.entities||[]).map(e=>e.id));
 const roleCues=new Set(),cast=rows.filter(c=>{const key=[c.sourceActorId,c.wordIndex,clean(c.roleQuote)].join('/');if(roleCues.has(key))return false;roleCues.add(key);return true;}).map(row=>{const c=Object.fromEntries(Object.entries(row).filter(([k,v])=>!['x','y','size'].includes(k)||v!==null)),candidate=scene.storyCastCandidates?.find(r=>r.sourceActorId===c.sourceActorId&&r.species===c.species),n=clean(c.roleQuote).split(/\s+/).length;
  if(candidate&&/^(dad|father|mom|mother|parent|grandpa|grandfather|grandmother|ancestor)$/i.test(c.roleQuote)&&candidate.evolutionStage<Math.max(...scene.storyCastCandidates.filter(r=>r.sourceActorId===c.sourceActorId).map(r=>r.evolutionStage)))throw Error('An older supporting role needs the mature sourced evolution candidate');
  if(!/^story-cast-[a-z0-9-]{1,18}$/.test(c.id)||ids.has(c.id)||!candidate||!c.roleQuote||!Number.isInteger(c.wordIndex)||clean(scene.words.slice(c.wordIndex,c.wordIndex+n).map(w=>w.text).join(' '))!==clean(c.roleQuote))throw Error('Supporting cast needs a sourced relative and an exact narrated role cue');
  for(const [key,min,max] of [['x',.03,.65],['y',.07,.5],['size',.24,.5]])if(c[key]!==undefined&&(!Number.isFinite(c[key])||c[key]<min||c[key]>max))throw Error('Supporting character is outside the stage');ids.add(c.id);return {...c,start:scene.words[c.wordIndex].start,end:scene.end,source:candidate.source,fictionOnly:true};
 });
 return {cast,scene:{...scene,reaction:{...scene.reaction,entities:[...(scene.reaction?.entities||[]),...cast.map(c=>({id:c.id,name:c.species,type:'pokemon',mediaId:'planned-'+c.id,start:c.start,end:c.end,storyCast:true}))]}}};
}
export async function acquireStoryCast(project,{image,progress=()=>{},check=()=>{}}){
 const p=structuredClone(project);p.storyCastReport=[];
 for(const s of p.scenes)for(const c of s.storyCast||[])try{check();progress({stage:'Finding source artwork for a narrated supporting role: '+c.species});const m=await image(c.species,s,p);if(!m)throw Error('No correct artwork resolved');p.media=[...new Map([...p.media,m].map(m=>[m.id,m])).values()];c.mediaId=m.id;p.storyCastReport.push({sceneId:s.id,id:c.id,species:c.species,roleQuote:c.roleQuote,mediaId:m.id,source:c.source,fictionOnly:true});}catch(e){check();delete c.mediaId;p.storyCastWarnings=[...(p.storyCastWarnings||[]),c.species+': '+e.message];}
 return p;
}
export function applyStoryCast(project){
 const p=structuredClone(project);
 for(const s of p.scenes){s.layers=(s.layers||[]).filter(l=>!l.storyCastActor||l.manual||l.instructionLocked);if(s.manualTemplate||s.deletedLayerIds?.length)continue;
  // The normal subject builder also sees resolved cast entities. Replace its
  // unspoken supporting copies with the explicit role instances, preserving
  // manually edited bodies and actual narrated characters of the same species.
  const unspoken=new Set((s.storyCast||[]).filter(c=>c.mediaId&&!s.reaction?.entities.some(e=>!e.storyCast&&e.mediaId===c.mediaId)).map(c=>c.mediaId)),removed=new Set(s.layers.filter(l=>l.role==='subject'&&unspoken.has(l.mediaId)&&!l.manual&&!l.instructionLocked).map(l=>l.id));
  s.layers=s.layers.filter(l=>!removed.has(l.id)&&!removed.has(l.attachment?.targetId));
  const held=heldStorySources(s,p);s.layers=s.layers.filter(l=>l.manual||l.instructionLocked||!(l.role==='item'&&held.some(m=>m.id===l.mediaId))&&!((s.storyCast||[]).length&&l.engagementEffect&&l.id?.endsWith('-entrance-ring')));
  for(const c of s.storyCast||[]){if(!c.mediaId)continue;const lead=s.reaction?.entities.find(e=>e.id===c.sourceActorId),body=s.layers.find(l=>l.role==='subject'&&!l.storyCastActor&&l.mediaId===lead?.mediaId&&!l.manual&&!l.instructionLocked&&!l.actionMovie&&!l.actorPerformance&&!l.creativeAction);if(body){body.x=.04;body.y=.22;body.width=.44;body.height=p.format==='horizontal'?.58:.40;body.end=s.end;body.keyframes=undefined;body.storyRoleLead=true;}}
  for(const [i,c] of (s.storyCast||[]).entries()){if(!c.mediaId||!p.media.some(m=>m.id===c.mediaId))continue;const size=c.size??.38;
   if(s.layers.some(l=>l.id===s.id+'-'+c.id&&(l.manual||l.instructionLocked)))continue;
   s.layers.push({id:s.id+'-'+c.id,type:'image',role:'subject',storyCastActor:true,storyCastId:c.id,mediaId:c.mediaId,start:c.start,end:c.end,x:c.x??(i?.06:.55),y:c.y??.16,width:size,height:p.format==='horizontal'?.52:.35,z:21+i,fit:'contain',animation:noMotion(p)||p.freezePokemonMotion?'none':'spring-pop',entranceDuration:.18,exit:'none',shadow:true});
  }
 }
 return p;
}
