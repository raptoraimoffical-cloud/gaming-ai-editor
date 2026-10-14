import {STORY_GESTURES,storyGestureRecipe,storySourceProps} from './story-gestures.mjs';
import {modelChat} from './inference-trace.mjs';
import {compileRecipeBatch} from './creative-actions.mjs';

export function normalizePerformanceTiming(recipe){
 const r=structuredClone(recipe),frames=r.actorMotion||[];if(!frames.length)return r;
 const first=Math.min(...frames.map(k=>k.at)),last=Math.max(...frames.map(k=>k.at)),shift=first>0&&last>r.duration?first:0,span=last-shift,factor=span>r.duration?r.duration/span:1,clock=t=>Math.max(0,Math.min(r.duration,(t-shift)*factor));
 // Preserve the authored phase relationships when a provider supplied absolute
 // times. Geometry remains validated; invalid/invented actor bindings are not
 // repaired by guessing a different character.
 if(shift||factor!==1){r.actorMotion=frames.map(k=>({...k,at:clock(k.at)}));r.soundBeats=(r.soundBeats||[]).map(b=>({...b,at:clock(b.at)}));}
 r.attachments=(r.attachments||[]).map(p=>({...p,query:p.query?.replaceAll('_',' ')}));
 return r;
}

// Motion is a separate executable contract. Small local models frequently
// supply storyboard prose while omitting the optional tracks in a large schema.
// Ask for the physical performance only, with the actual resolved role IDs.
export async function completeStoryPerformance(scene,proposal,castPlan,project,state,model,progress,fetchImpl){
 const compiled=compileRecipeBatch(castPlan.scene,proposal.recipes||[],6),invalidMotion=(proposal.recipes||[]).some(r=>r.kind==='perform'&&!compiled.actions.some(a=>a.recipeKind==='perform'&&a.wordIndex===r.wordIndex&&a.recipeActorId===r.actorId));
 if(!castPlan.cast.length&&!invalidMotion)return proposal;
 const roleIds=new Set(castPlan.cast.length?castPlan.cast.map(c=>c.id):castPlan.scene.reaction.entities.filter(e=>e.mediaId).map(e=>e.id));
 if(!invalidMotion&&compiled.actions.some(a=>a.tracks.some(t=>roleIds.has(t.targetId))&&['perform','depart','handoff','chase','dodge','pair-up','taunt'].includes(a.recipeKind)))return proposal;
 const actors=castPlan.scene.reaction.entities.filter(e=>e.mediaId).map(e=>({id:e.id,name:e.name,role:castPlan.cast.find(c=>c.id===e.id)?.roleQuote||'established subject',introducedAt:e.start-scene.start}));
 const minIndex=castPlan.cast.length?Math.min(...castPlan.cast.map(c=>c.wordIndex)):0,wordIndexes=scene.words.map((_,i)=>i).filter(i=>i>=minIndex);
 const propSchema={type:'array',minItems:/\b(?:give|wear|carry|collect|grab|pick up)\b/i.test(project.editingInstructions||'')?1:0,maxItems:3,items:{type:'object',additionalProperties:false,required:['query','anchor','size','optional','wordIndex'],properties:{query:{type:'string',minLength:3,maxLength:100},anchor:{enum:['head','face','neck','hand','near']},size:{enum:['small','medium','large']},optional:{type:'boolean'},wordIndex:{enum:scene.words.map((_,i)=>i)}}}};
 const beat=(payoff=false)=>({type:'object',additionalProperties:false,required:['actorId','wordIndex','duration','reason','gesture','endState','direction','soundBeats'],properties:{actorId:{enum:[...roleIds]},wordIndex:{enum:wordIndexes},duration:{type:'number',minimum:.6,maximum:3},reason:{type:'string',maxLength:100},gesture:{enum:payoff?STORY_GESTURES:STORY_GESTURES.filter(g=>g!=='leave')},endState:{enum:['restore','hold']},direction:{enum:['left','right']},soundBeats:{type:'array',maxItems:3,items:{type:'object',additionalProperties:false,required:['phase','cue'],properties:{phase:{enum:['start','anticipation','contact','payoff']},cue:{enum:['pop','whoosh','boing','click','impact']}}}}}});
 const format={type:'object',additionalProperties:false,required:['props','setup','action','payoff'],properties:{props:propSchema,setup:beat(),action:beat(),payoff:beat(true)}};

 progress({stage:'Authoring the physical story performance with the resolved character roles'});
 const result=await modelChat(state,model,[{role:'system',content:'Direct a physical cartoon story for this exact narration. This call authors ONLY requestedRoleIds; other actors remain visible. Use the actual role labels and full sentence meaning. Return props and three distinct stages: setup establishes the role/costume; action demonstrates the actual interaction, including acquisition of a requested object; payoff shows its narrated consequence. Schedule setup, action and payoff in chronological order at meaningful raw-word cues. Complete the prop interaction before an exit. collect bends/reaches then lifts a carried source prop; reach reaches out; carry walks while holding; react double-takes; celebrate hops; slump deflates; look-back turns back; float rises; recoil responds to contact; leave travels offscreen and stays absent. Keep negation: never returned means remain absent, not return. Do not invent a different event, dialogue or game fact. Each gesture uses a raw-word index at/after that role introduction. Avoid overlapping gestures on the same role. duration is seconds after that cue. Props are literal original source picture queries attached to head/face/neck/hand/near; costume details can be optional. Include the props requested in the actual instructions and narration when useful. Give props their exact raw-word index (costumes use the role introduction). Query a literal object, not a fabricated character pose or emotion overlay. Props persist through following gestures. Add short pop, whoosh, click, impact or boing sound phases phases start, anticipation, contact or payoff; the engine places them at the corresponding physical phase. endState hold retains the final pose; restore returns to normal. leave always remains absent. List source props at the root (including actual requested costume and object), and soundBeats within each stage. Use props:[] only when nothing calls for a source object. Never invent unrelated props. The engine authors the smooth motion; do not output coordinates or keyframes. No stock episode-specific gag is mandatory. Preserve captions and recording.'},{role:'user',content:JSON.stringify({text:scene.text,wholeSentence:scene.wholeText,instructions:project.editingInstructions,requestedRoleIds:[...roleIds],actors,words:scene.words.map((w,wordIndex)=>({wordIndex,text:w.text,at:w.start-scene.start}))})}],{fetchImpl,stage:'story-performance-authoring',temperature:.3,maxOutputTokens:1100,format});

 const proposed=result.setup?[{...result.setup,props:storySourceProps(result.props,actors)},result.action,result.payoff]:result.recipes||[],rejected=[],recipes=proposed.map(r=>r.gesture?storyGestureRecipe(r):normalizePerformanceTiming(r)).map(r=>({...r,propQuery:'',attachments:(r.attachments||[]).map(p=>({...p,owner:'actor'}))})).filter(r=>{
  const c=compileRecipeBatch(castPlan.scene,[r],1),at=scene.words[r.wordIndex]?.start,early=c.actions.some(a=>a.tracks.some(t=>actors.some(e=>e.id===t.targetId&&e.introducedAt+scene.start>at+.02)));
  if(c.rejected.length||early){rejected.push(...c.rejected, ...(early?[{reason:'A story role cannot act before its narrated introduction'}]:[]));return false;}return true;
 }),verified=compileRecipeBatch(castPlan.scene,recipes,3);
 if(!verified.actions.some(a=>a.tracks.some(t=>roleIds.has(t.targetId)))){
  const event=state.inferenceEvents?.at(-1);if(event?.stage==='story-performance-authoring'){event.accepted=false;event.reason='The motion response did not execute the declared supporting role';}
  throw Error('Physical story authoring failed: '+(rejected.map(r=>r.reason).join('; ')||'No supporting role performance'));
 }
 if(rejected.length)state.limitations?.push(...rejected.map(r=>'Story performance omitted independently: '+r.reason));
 // Valid independent actor actions and source beats survive; replace the
 // incomplete physical performance rather than accumulating competing tracks.
 return {...proposal,recipes:[...(proposal.recipes||[]).filter(r=>!['perform','depart'].includes(r.kind)&&!roleIds.has(r.actorId)).slice(0,6-recipes.length),...recipes]};
}
