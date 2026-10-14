import {scenesFor} from './revisions.mjs';
import {modelChat} from './inference-trace.mjs';
import {subjectGrounded,spokenNameCue} from './subject-grounding.mjs';

export function needsImageResolution(request){
 return /\b(?:add|show|insert|put|find|use)\b/i.test(request)&&/\b(?:images?|pictures?|photos?|gifs?)\b/i.test(request)&&(/\b(?:person|people|someone|guy|man|woman|dude|creator|streamer|player|thing|subject|character|pokemon|pokémon)\b.*\b(?:talk\w*|mention\w*|discuss\w*|refer\w*|about|abt|meant|name)\b|\b(?:him|her|them|it|that person|this person|the person)\b/i.test(request));
}
export async function resolveRevisionImages(project,request,context,settings,progress=()=>{}){
 if(!settings.model)throw Error('An editing model is needed to identify the pictured person from your narration. Select a connected model in AI Models, or name the person in the request.');
 const scenes=scenesFor(project,request,context),state={settings,signal:settings.signal,models:{},inferenceEvents:[]};
 // Long custom briefs must retain identities at the beginning. Allocate the
 // local model's context for the supplied text instead of silently truncating.
 const inputLength=(project.editingInstructions||'').length+project.scenes.reduce((n,s)=>n+s.text.length+100,0)+scenes.reduce((n,s)=>n+s.words.map(w=>w.text).join(' ').length+100,0);
 state.settings={...settings,contextLength:Math.min(32768,Math.max(settings.contextLength||4096,Math.ceil(inputLength/3)+3600))};
 progress({stage:'Identifying the requested person or subject from the narration'});
 const result=await modelChat(state,{name:settings.model},[{role:'system',content:'Resolve an image editing request against the actual narration. Return the specific pictured subjects, their relevant scene IDs, and literal image query. Infer references such as the guy, dude, creator, streamer, him/her, or the Pokemon from the whole narration and the CURRENT instructions. Informal spellings like im and abt are ordinary language. For at the start / when I say his name, use the first actual spoken name cue, never a later mention. A supplied proper name in current instructions can resolve an ASR spelling error; quote the exact raw spoken words for timing. A named person mentioned in speech can be pictured even if not yet in the media library. Do not search for the words "the person I am talking about". Never invent a name, new fact, subject or media. Quote an exact short raw narration phrase supporting the subject, and use that scene ID. The query should be the actual proper name and relevant context. Do not use emojis or manufactured images. Keep additions in the requested seconds and applicable passages; do not reveal the person before they are discussed. Return error when the reference cannot be resolved. Preserve other requested placement/animation instructions in placement as a short phrase. Return subjects:[{name,query,sceneId,quote,placement}] or error.'},{role:'user',content:JSON.stringify({request,instructions:project.editingInstructions,selection:context,wholeNarration:project.scenes.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end})),editableScenes:scenes.map(s=>({id:s.id,text:s.text,words:s.words.map(w=>w.text),entities:s.reaction?.entities})),media:project.media.filter(m=>['image','pokemon','video'].includes(m.kind)).map(m=>({id:m.id,name:m.name}))})}],{fetchImpl:settings.fetchImpl,stage:'revision-image-resolution',temperature:.1,maxOutputTokens:1200,format:{type:'object',properties:{error:{type:'string'},subjects:{type:'array',minItems:1,maxItems:8,items:{type:'object',required:['name','query','sceneId','quote','placement'],properties:{name:{type:'string'},query:{type:'string'},sceneId:{enum:scenes.map(s=>s.id)},quote:{type:'string'},placement:{type:'string'}}}}}}});
 if(result.error)throw Error(result.error);
 if(!Array.isArray(result.subjects)||!result.subjects.length)throw Error('The pictured subject could not be identified from this narration. Name the person you want shown.');
 const normalize=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const additions=result.subjects.map(subject=>{
  let scene=scenes.find(s=>s.id===subject.sceneId),quote=normalize(subject.quote);const name=normalize(subject.name);
  if(/\b(?:start|opening|beginning|intro|first)\b/i.test(request)){const first=scenes.map(s=>({scene:s,cue:spokenNameCue(s,subject.name)})).filter(v=>v.cue&&v.cue.start>=(context.timeRange?.start??0)&&v.cue.start<(context.timeRange?.end??project.duration)).sort((a,b)=>a.cue.start-b.cue.start)[0];if(first){scene=first.scene;quote=normalize(first.cue.quote);subject={...subject,sceneId:scene.id,quote:first.cue.quote};}}

  if(!scene||!quote||!normalize(scene.text).includes(quote)||!name||subject.query?.length>200||!normalize(subject.query).includes(name))throw Error('The image plan did not resolve a grounded subject and scene. No changes applied.');
  // A subject must be grounded in this recording (including an established
  // entity's canonical spelling), not a plausible model-invented person.
  if(!subjectGrounded(project,subject.name,request))throw Error('The requested person was not grounded in the narration or your instructions. Name them explicitly.');
  const tokens=quote.split(' '),i=scene.words.findIndex((_,i)=>normalize(scene.words.slice(i,i+tokens.length).map(w=>w.text).join(' '))===quote);
  if(i<0)throw Error('The requested image has no valid spoken placement cue.');
  const established=project.scenes.flatMap(s=>s.reaction?.entities||[]).find(e=>normalize(e.name)===name),species=project.media.find(m=>m.pokemon&&[m.pokemon.name,m.pokemon.displayName].some(n=>normalize(n)===name));
  const human=/\b(?:person|people|him|her|guy|man|woman|dude|creator|streamer|player)\b/i.test(request);
  const start=Math.max(scene.words[i].start,context.timeRange?.start??scene.start),hold=Number(request.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(?:seconds?|s)\b/i)?.[1]||4);
  return {...subject,type:species?'pokemon':human?'person':established?.type||'object',franchise:species?'pokemon':human?'unknown':established?.franchise||'unknown',start,end:Math.min(scene.end,context.timeRange?.end??project.duration,start+Math.max(.1,hold))};
 });
 return {additions,trace:{performed:true,model:settings.model,events:state.inferenceEvents,additions:additions.map(s=>({name:s.name,start:s.start,end:s.end,sceneId:s.sceneId}))}};
}
