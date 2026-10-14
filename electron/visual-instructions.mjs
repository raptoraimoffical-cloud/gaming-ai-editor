import crypto from 'node:crypto';
import {DEFAULT_INSTRUCTIONS} from './default-instructions.mjs';
import {POKEMON_GOLD_BRIEF,CINEMATIC_POKEMON_BRIEF} from './gold-reference-policy.mjs';
import {modelChat} from './inference-trace.mjs';
import {quoteTime} from './local-animator.mjs';
import {scenesFor} from './revisions.mjs';
import {mergeRanges,visibleRanges} from './layer-visibility.mjs';
import {validateProject} from './planner.mjs';
import {subjectGrounded,spokenNameCue} from './subject-grounding.mjs';
import {parseSuppliedTeam} from './supplied-team.mjs';

const normal=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const contains=(text,value)=>value&&(' '+normal(text)+' ').includes(' '+normal(value)+' ');
export function explicitVisualBrief(text=''){
 const brief=text.replace(DEFAULT_INSTRUCTIONS,'').replace(POKEMON_GOLD_BRIEF,'').replace(CINEMATIC_POKEMON_BRIEF,'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'').trim();
 return /\b(?:add|show|display|insert|put|include|find|want|need|use)\b[\s\S]*\b(?:pictures?|photos?|images?|full team|whole team|entire team|team members|team and|items and|evs|ev spreads|effort values)\b/i.test(brief)?brief:'';
}
const memberSchema={type:'object',required:['name','type','franchise','query','item','facts','sourceQuote'],properties:{name:{type:'string'},type:{enum:['pokemon','person','character','object']},franchise:{type:'string'},query:{type:'string'},item:{type:'string'},facts:{type:'array',items:{type:'string'}},sourceQuote:{type:'string'}},additionalProperties:false};
export async function planVisualInstructions(project,text,state,progress=()=>{},context={},fetchImpl=fetch){
 const brief=explicitVisualBrief(text);if(!brief)return [];
 const model=state.models?.reasoning||state.models?.editing||state.models?.planning;if(!model)throw Error('Your explicit picture/team instructions need a connected editing model. They were not applied.');
 const sourceText=project.editingInstructions?.includes(brief)?project.editingInstructions:[brief,project.editingInstructions||''].join('\n'),scenes=scenesFor(project,text,context),format={type:'object',required:['requirements'],properties:{requirements:{type:'array',minItems:1,items:{type:'object',required:['kind','name','type','franchise','query','sceneId','quote','duration','members'],properties:{kind:{enum:['image','group']},name:{type:'string'},type:{enum:['pokemon','person','character','object']},franchise:{type:'string'},query:{type:'string'},sceneId:{enum:scenes.map(s=>s.id)},quote:{type:'string'},duration:{type:'number',minimum:.2,maximum:project.duration},members:{type:'array',items:memberSchema}},additionalProperties:false}}},additionalProperties:false};
 const structuredTeam=parseSuppliedTeam(sourceText);if(structuredTeam.length)format.properties.requirements.items.properties.members.maxItems=0;
 const messages=[{role:'system',content:'Compile the CURRENT explicit visual instructions into mandatory executable requirements. This is separate from editorial style planning. Execute only the CURRENT instructions field; sourceInstructions supplies identities/team facts for references and is not a list of additional requests. Cover every concrete requested picture and supplied group/team; general style guidance is not a requirement. Resolve informal references like the guy I am talking abt to the actual named person using the full current narration and instructions. For a person use type:person, their proper name and a photo query; never a Pokemon logo. For at the start when I say the name use the FIRST exact raw spoken name cue. Image requirements have members:[]. When suppliedTeam is provided, use a group requirement with members:[]; its complete original data is already parsed and will be attached by the executor. Group requirements otherwise show ALL supplied members with actual source images, item icons and the exact supplied EVs/nature/moves/data in facts. Include members even when their names are in instructions but not spoken. Do not invent a team, item, stat, move, EV spread or identity. Each member sourceQuote is the exact specific portion of instructions that describes that member; facts are exact short snippets from that portion. Do not copy another member\'s facts. Use quote as an exact short raw narration cue; use an empty quote only for an explicitly requested opening or instructions-only visual. Choose a readable duration and the correct supplied sceneId. Pictures last briefly; a full team with readable data needs longer. Return every concrete requirement; do not respond with advice or an empty plan.'},{role:'user',content:JSON.stringify({instructions:brief,suppliedTeam:structuredTeam.map(m=>({name:m.name,item:m.item,facts:m.facts})),sourceInstructions:text===project.editingInstructions?'':project.editingInstructions,selection:context,narration:project.scenes.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end,words:s.words.map(w=>w.text)})),editableSceneIds:scenes.map(s=>s.id)})}];
 progress({stage:'Compiling your required pictures, team and supplied data'});
 for(let attempt=0;attempt<2;attempt++){
  const localState={...state,settings:{...state.settings,contextLength:Math.min(32768,Math.max(state.settings.contextLength||4096,Math.ceil((JSON.stringify(messages).length+JSON.stringify(format).length)/3)+4200))}};localState.inferenceEvents=state.inferenceEvents||=[];const result=await modelChat(localState,model,messages,{fetchImpl,stage:'explicit-visual-instructions',temperature:0,maxOutputTokens:3600,format});
  try{
   if(!Array.isArray(result.requirements)||!result.requirements.length)throw Error('The planner omitted your required visuals');
   const requiresTeam=/\b(?:full|whole|entire)\s+team\b|\bteam\b[\s\S]*\b(?:evs|effort values|stat points)\b/i.test(brief);
   if(structuredTeam.length&&requiresTeam&&!result.requirements.some(r=>r.kind==='group')){
    const cue=scenes.flatMap(s=>s.words.filter(w=>/^(?:team|roster|squad|lineup|build)[,.!?]*$/i.test(w.text)).map(w=>({scene:s,word:w}))).sort((a,b)=>a.word.start-b.word.start)[0];
    const target=cue?.scene||scenes[0];result.requirements.push({kind:'group',name:'Full supplied team',type:'pokemon',franchise:'pokemon',query:'',sceneId:target.id,quote:cue?.word.text||'',duration:Math.min(project.duration,5),members:[]});
   }
   if(/\b(?:full|whole|entire)\s+team\b|\bteam\b[\s\S]*\b(?:evs|effort values)\b/i.test(brief)&&!result.requirements.some(r=>r.kind==='group'))throw Error('The planner omitted the requested team/data');
   if(/\b(?:picture|photo|image)\b[\s\S]*\b(?:guy|person|man|woman|creator|streamer|player)\b/i.test(brief)&&!result.requirements.some(r=>r.kind==='image'&&r.type==='person'))throw Error('The planner omitted the requested person picture');
   for(const r of result.requirements){
    const scene=scenes.find(s=>s.id===r.sceneId);if(!scene||!['image','group'].includes(r.kind)||!Number.isFinite(r.duration)||r.duration<.2||r.duration>project.duration)throw Error('Invalid required visual timing');
    if(r.quote)quoteTime(scene,r.quote);else if(!/\b(?:start|opening|beginning|intro|full team|whole team|entire team|display|show|include)\b/i.test(brief))throw Error('Required visual has no narrated cue');
    if(r.kind==='image'&&!subjectGrounded(project,r.name,brief))throw Error('The pictured name is not in your instructions or narration');
    if(r.kind==='group'){
     if(structuredTeam.length)r.members=structuredTeam;
     if(!r.members?.length)throw Error('No supplied members were included in the team');
     for(const m of r.members){if(m.structured)continue;if(!contains(sourceText,m.sourceQuote)||!contains(m.sourceQuote,m.name)||m.item&&!contains(m.sourceQuote,m.item)||!m.facts.every(f=>contains(m.sourceQuote,f)))throw Error('A team member, item or fact is not grounded in its own supplied instructions');const evLine=m.sourceQuote.match(/\bEVs?\s*:\s*([^\n]+)/i)?.[1];if(evLine&&!m.facts.some(f=>contains(f,evLine)))throw Error('The planner omitted supplied EV data for '+m.name);}
     if(new Set(r.members.map(m=>normal(m.name))).size!==r.members.length)throw Error('A team member was duplicated');
    }
   }
   const nameKey=name=>normal(name).split(' ').sort().join(' ');
   return result.requirements.filter(r=>{
    if(r.kind!=='image'||!structuredTeam.some(m=>nameKey(m.name)===nameKey(r.name)))return true;
    const scene=scenes.find(s=>s.id===r.sceneId),cue=spokenNameCue(scene,r.name);
    if(!cue)return false; // Team-data artwork belongs in the group, not an unrelated earlier scene.
    r.quote=cue.quote;return true;
   });
  }catch(e){const event=state.inferenceEvents?.at(-1);if(event){event.accepted=false;event.reason=e.message;}if(state.signal?.aborted||attempt===1)throw Error('Required visual instructions were not applied: '+e.message);messages.push({role:'assistant',content:JSON.stringify(result)},{role:'user',content:'Correct the executable requirements: '+e.message+'. Keep actual source names and exact supplied facts; cover all concrete requests.'});}
 }
}

export function createVisualInstructions({assets,memberImage,itemImage,check=()=>{},plan=planVisualInstructions}){
 return async function execute(project,text,state,keys={},progress=()=>{},context={}){
  const requirements=context.requirements||await plan(project,text,state,progress,context);if(!requirements.length)return project;
  let next=structuredClone(project),pending;const report={model:(state.models?.reasoning||state.models?.editing||state.models?.planning)?.name||'Supplied scene blueprint',requested:requirements.length,applied:[],missing:[]};
  for(const [index,r] of requirements.entries()){
   check();const scene=next.scenes.find(s=>s.id===r.sceneId),start=Math.max(r.quote?quoteTime(scene,r.quote):scene.start,context.timeRange?.start??0),end=Math.min(next.duration,context.timeRange?.end??next.duration,start+r.duration);
   if(end-start<.1)throw Error('The requested image falls outside the selected seconds');
   if(r.kind==='image'){
    progress({stage:'Adding required picture: '+r.name});
    const imageIntent={...r,start,end:Math.min(scene.end,end)},clean={...next};delete clean.pendingRevision;const edited=await assets.apply(clean,'Add an image of '+r.query+' at '+start+' seconds',{sceneId:scene.id,onlineFirst:true,imageIntent,...(context.timeRange?{timeRange:context.timeRange}:{})},keys,{});
    if(edited.pendingRevision){report.missing.push({name:r.name,reason:edited.pendingRevision.reason});pending||=edited.pendingRevision;continue;}
    const added=edited.scenes.flatMap(s=>(s.layers||[]).filter(l=>l.mediaId&&!next.scenes.find(before=>before.id===s.id)?.layers?.some(before=>before.id===l.id)&&visibleRanges(l,start,end,s.layers).length));
    if(!added.length)throw Error('The requested picture of '+r.name+' did not reach the timeline');
    next=edited;report.applied.push({kind:'image',name:r.name,start,end:Math.min(scene.end,end),layerIds:added.map(l=>l.id)});continue;
   }
   const resolved=[];
   // Source requests are independent, but bounded workers avoid flooding the
   // downloader/model. This limits concurrency, not the number of images.
   let cursor=0;await Promise.all(Array.from({length:Math.min(3,r.members.length)},async()=>{while(cursor<r.members.length){const i=cursor++,m=r.members[i];check();progress({stage:'Loading required team member '+(i+1)+'/'+r.members.length+': '+m.name});try{const image=await memberImage(m,next,scene,keys,progress,state),item=m.item?await itemImage(m.item,keys,progress,state):null;if(!image?.id)throw Error('No actual source image was returned for '+m.name);if(m.item&&!item?.id)throw Error('No actual item icon was returned for '+m.item);resolved[i]={...m,image,item};}catch(e){check();report.missing.push({name:m.name,reason:e.message});}}}));
   if(resolved.filter(Boolean).length!==r.members.length)continue;
   const id='required-group-'+crypto.randomUUID(),pages=Math.ceil(resolved.length/6),span=(end-start)/pages;
   if(span<2)throw Error('The selected seconds are too short to show all supplied team members readably');
   for(const m of resolved)for(const asset of [m.image,m.item].filter(Boolean))if(!next.media.some(a=>a.id===asset.id))next.media.push(asset);
   const inserted=[];
   for(const s of next.scenes.filter(s=>s.start<end&&s.end>start)){
    for(const l of s.layers||[])if(!l.manual&&['subject','game-logo','supporting-image','story-picture','mechanic-card','moveset-card'].includes(l.role))l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),{start:Math.max(l.start,start),end:Math.min(l.end,end)}]);
    const add=(type,role,values)=>{const layer={id:id+'-'+s.id+'-'+inserted.length,type,role,manual:true,instructionLocked:true,x:.04,y:.12,width:.92,height:.65,z:120,start:Math.max(start,s.start),end:Math.min(end,s.end),animation:'fade',entranceDuration:.18,exit:'fade',fit:'contain',...values};if(layer.end>layer.start){(s.layers||=[]).push(layer);inserted.push(layer.id);}};
    add('shape','instruction-panel',{color:'#0d1728'});
    add('text','instruction-title',{x:.06,y:.074,width:.88,height:.035,fontSize:42,text:r.name,color:'#ffffff'});
    for(let page=0;page<pages;page++)for(const [slot,m] of resolved.slice(page*6,page*6+6).entries()){
     const a=Math.max(s.start,start+page*span),b=Math.min(s.end,start+(page+1)*span);if(b<=a)continue;
     const x=.055+(slot%2)*.465,y=.135+Math.floor(slot/2)*.215,w=.435,timing={start:a,end:b,animation:a>start+page*span?'none':'fade'};
     add('shape','instruction-member',{...timing,x,y,width:w,height:.2,color:'#193049'});
     add('image','story-picture',{...timing,mediaId:m.image.id,x:x+.012,y:y+.042,width:.125,height:.105});
     add('text','instruction-name',{...timing,x:x+.012,y:y+.008,width:w-.024,height:.032,fontSize:28,text:m.name,color:'#ffffff'});
     if(m.item){add('image','item',{...timing,mediaId:m.item.id,x:x+.055,y:y+.146,width:.03,height:.023});add('text','instruction-fact',{...timing,x:x+.012,y:y+.174,width:.137,height:.026,fontSize:20,text:m.item.name,color:'#c9e5ff'});}
     const lines=m.facts.flatMap(f=>{const result=[];for(const word of f.split(/\s+/)){const last=result.at(-1);if(last&&(last+' '+word).length<=25)result[result.length-1]+=' '+word;else result.push(word);}return result;});
     const row=Math.min(.016,.15/Math.max(1,lines.length)),fontSize=Math.min(25,Math.floor(row*1920/1.12));
     if(fontSize<18)throw Error('The supplied build has too much data to fit readably; use a longer detailed passage');
     lines.forEach((fact,i)=>add('text','instruction-fact',{...timing,x:x+.155,y:y+.047+i*row,width:w-.17,height:row,fontSize,text:fact,color:'#e3f1ff'}));
    }
   }
   report.applied.push({kind:'group',name:r.name,members:resolved.map(m=>({name:m.name,mediaId:m.image.id,itemId:m.item?.id,facts:m.facts})),start,end,layerIds:inserted});
  }
  validateProject(next);next.visualInstructionReport=report;if(pending)next.pendingRevision=pending;
  // A partial edit must describe the missing requirement, never claim that
  // an unresolved request was applied successfully.
  if(report.missing.length)next.visualInstructionWarnings=report.missing.map(m=>'Required image missing: '+m.name+' — '+m.reason);
  return next;
 };
}
