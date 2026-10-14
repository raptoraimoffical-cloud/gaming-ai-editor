import {modelChat} from './inference-trace.mjs';
import {clearAttention} from './attention-director.mjs';
import {combatAttacker,combatDefender,combatProjectile,moveArtwork,COMBAT_PHASES} from './combat-motion.mjs';
import {narrationProp} from './narration-props.mjs';
export const BATTLE_MOVES=['dust-brawl','tackle','thunderbolt','flamethrower','water-gun'];
export function fighters(scene,project){return (scene.layers||[]).filter(l=>l.mediaId&&l.role==='subject'&&!l.instructionLocked&&project.media.some(m=>m.id===l.mediaId&&(m.kind==='pokemon'||m.pokemon||m.identity?.franchise==='pokemon'||(l.manual&&m.kind==='image'&&(!m.identity?.franchise||m.identity.franchise==='unknown')))));}
export function validateBattle(project,b){
 const s=project.scenes.find(s=>s.id===b.sceneId),targets=s?fighters(s,project):[];
 const a=targets.find(l=>l.id===b.attackerId),d=targets.find(l=>l.id===b.defenderId);
 if(!s||!a||!d||a.id===d.id)throw Error('Battle needs two different visible, unlocked Pokémon assets in the requested scene.');
 if(!BATTLE_MOVES.includes(b.move)||!Number.isFinite(b.at)||!Number.isFinite(b.duration)||b.duration<1.2||b.duration>6||b.at<Math.max(s.start,a.start,d.start)||b.at+b.duration>Math.min(s.end,a.end,d.end)+.001)throw Error('Battle timing or move is unsupported; both fighters must stay visible for the entire action.');
 return {...b,reason:String(b.reason||'Requested stylized battle').slice(0,800)};
}
export async function planBattle(project,request,sceneIds,state,fetchImpl=fetch){
 const requestedMove=/dust\s*cloud|dust[- ]brawl/i.test(request)?'dust-brawl':BATTLE_MOVES.find(m=>m!=='dust-brawl'&&request.toLowerCase().replace(/[- ]/g,'').includes(m.replace(/-/g,'')));
 const scenes=project.scenes.filter(s=>sceneIds.includes(s.id));if(!scenes.some(s=>fighters(s,project).length>=2))throw Error('Add two Pokémon images or uploaded character images as subject layers in the same scene, then ask them to fight.');
 const model=state.models.reasoning;if(!model)throw Error('Select a trained reasoning model in AI Models to choreograph battles.');
 const schema={type:'object',additionalProperties:false,required:['battles'],properties:{battles:{type:'array',minItems:1,maxItems:scenes.length,items:{type:'object',additionalProperties:false,required:['sceneId','attackerId','defenderId','move','at','duration','reason'],properties:{sceneId:{enum:sceneIds},attackerId:{type:'string'},defenderId:{type:'string'},move:{enum:BATTLE_MOVES},at:{type:'number'},duration:{type:'number',minimum:1.2,maximum:6},reason:{type:'string',maxLength:800}}}}}};
 let rejection;
 for(let attempt=0;attempt<2;attempt++){
  const value=await modelChat(state,model,[{role:'system',content:'Choreograph the requested cartoon Pokémon battle using supplied subject layer IDs, not invented characters. Return executable battles. dust-brawl: both fighters rush together and exchange attacks inside a cartoon dust cloud. tackle: attacker lunges and defender recoils. thunderbolt,flamethrower,water-gun: attacker launches a stylized projectile and defender recoils. Respect named attacker/defender and requested move. These are illustrative animations, not verified game simulation or official move footage. Each scene may have one battle; keep it entirely within both assets visible intervals. Preserve narration and background. Use at at or after the supplied earliest start; duration at most the supplied availableSeconds. Explain why the chosen action matches the request.'},{role:'user',content:JSON.stringify({request,correction:rejection,scenes:scenes.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end,fighters:fighters(s,project).map(l=>({id:l.id,name:project.media.find(m=>m.id===l.mediaId)?.name,start:l.start,end:l.end})),earliestStart:Math.max(s.start,...fighters(s,project).map(l=>l.start)),availableSeconds:Math.min(s.end,...fighters(s,project).map(l=>l.end))-Math.max(s.start,...fighters(s,project).map(l=>l.start))}))})}],{fetchImpl,stage:'battle-choreography',format:schema});
  try{if(!Array.isArray(value.battles)||!value.battles.length||new Set(value.battles.map(b=>b.sceneId)).size!==value.battles.length)throw Error('Return one valid battle per selected scene.');return {model:model.name,battles:value.battles.map(b=>{if(!sceneIds.includes(b.sceneId))throw Error('Battle changed an unselected scene.');if(requestedMove&&b.move!==requestedMove)throw Error('Use the requested move: '+requestedMove);return validateBattle(project,b);})};}catch(e){rejection=e.message;const event=state.inferenceEvents?.at(-1);if(event){event.accepted=false;event.reason=rejection;}}
 }
 throw Error('The model could not create a valid battle: '+rejection+' No changes were applied.');
}
export function applyBattles(project,plan){
 for(const b of plan.battles)validateBattle(project,b);
 const next=structuredClone(project),cleared=clearAttention(project);
 for(const b of plan.battles){const s=next.scenes.find(s=>s.id===b.sceneId),baseline=cleared.scenes.find(s=>s.id===b.sceneId);s.layers=s.layers.map(l=>[b.attackerId,b.defenderId].includes(l.id)?baseline.layers.find(v=>v.id===l.id):l);}
 for(const b of plan.battles){
  const s=next.scenes.find(s=>s.id===b.sceneId),a=s.layers.find(l=>l.id===b.attackerId),d=s.layers.find(l=>l.id===b.defenderId),end=b.at+b.duration;
  s.layers=s.layers.filter(l=>!l.id.startsWith(s.id+'-battle-'));
  const pose=(l,x,side)=>{delete l.parentId;l.x=x;l.y=.43;l.width=.30;l.height=next.format==='horizontal'?.40:.28;l.scale=1;l.flipX=side==='right';l.animation='none';l.enter='none';l.exit='none';l.float=false;l.manual=true;l.easing='smooth';l.keyframes=(l.keyframes||[]).filter(k=>k.time<b.at||k.time>end);};
  pose(a,.08,'left');pose(d,.62,'right');
  const path=(l,points)=>{l.keyframes=[...l.keyframes,...points.map(([fraction,x,y,rotation])=>({time:b.at+fraction*b.duration,x,y,rotation,scale:1}))].sort((a,b)=>a.time-b.time);};
  const effect=(name,x,y,width,height,start,finish,points,mediaId)=>s.layers.push({id:s.id+'-battle-'+name,type:'group',role:'battle-effect',battleEffect:name,battleEffectStart:start,battleEffectEnd:finish,x,y,width,height,z:80,start,end:finish,animation:'none',enter:'none',exit:'none',manual:true,easing:'smooth',mediaId,...(points?{keyframes:points}: {})});
  if(b.move==='dust-brawl'){
   path(a,[[0,.08,.43,0],[.12,.055,.445,-8],[.25,.34,.39,12],[.34,.37,.43,7],[.44,.28,.40,-10],[.55,.42,.46,12],[.65,.30,.39,-9],[.76,.33,.44,4],[.90,.10,.42,-3],[1,.08,.43,0]]);
   path(d,[[0,.62,.43,0],[.12,.65,.445,8],[.25,.36,.39,-12],[.34,.33,.43,-7],[.44,.43,.45,10],[.55,.27,.40,-12],[.65,.42,.44,9],[.76,.36,.41,-4],[.90,.60,.42,3],[1,.62,.43,0]]);
   effect('dust',.18,.30,.64,.46,b.at+b.duration*.22,b.at+b.duration*.86);
   effect('shockwave',.35,.40,.30,.25,b.at+b.duration*.25,b.at+b.duration*.42);
  }else{
   a.keyframes=[...a.keyframes,...combatAttacker({start:b.at,duration:b.duration,x:.08,y:.43,contactX:b.move==='tackle'?.42:.10,physical:b.move==='tackle'})].sort((a,b)=>a.time-b.time);
   d.keyframes=[...d.keyframes,...combatDefender({start:b.at,duration:b.duration,x:.62,y:.43})].sort((a,b)=>a.time-b.time);
   const art=moveArtwork(next,b.move),prop=art||narrationProp(next,{thunderbolt:'lightning',flamethrower:'fire','water-gun':'water'}[b.move]);
   effect('charge',.25,.49,.16,.14,b.at+b.duration*.20,b.at+b.duration*.34);
   if(b.move!=='tackle')effect(art?'move-image':b.move,.29,.50,.26,.16,b.at+b.duration*.31,b.at+b.duration*.52,combatProjectile(b.at,b.duration,0,.50,.50),prop?.id);
   else effect('speed-trail',.20,.48,.40,.18,b.at+b.duration*.31,b.at+b.duration*.46);
   effect('impact',.59,.44,.24,.25,b.at+b.duration*.46,b.at+b.duration*.60);
   effect('shockwave',.57,.44,.28,.25,b.at+b.duration*.47,b.at+b.duration*.69);
  }
  s.battlePlan=b;
 }
 next.battleReport={...plan,phases:COMBAT_PHASES,sounds:plan.battles.flatMap(b=>[{start:b.at+b.duration*COMBAT_PHASES.launch,cue:'whoosh',priority:12,reason:'Battle attack travel'},{start:b.at+b.duration*COMBAT_PHASES.contact,cue:'impact',priority:13,reason:'Battle contact'}]),notice:'Smooth illustrative cutout choreography using sourced art when available; move legality and battle outcomes are not simulated.'};return next;
}
