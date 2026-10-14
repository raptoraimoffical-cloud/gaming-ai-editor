// Review the proposed performance before spending time downloading its props.
// Speech cues and deliberate demonstrations determine coverage, not captions.
export function reviewStoryPlan(scene,proposal,actions){
 const events=actions.map(a=>({at:scene.words[a.cueWordIndex??a.wordIndex]?.start,hold:a.recipeKind==='stage-image'?a.props?.[0]?.framing==='evidence':true,end:(scene.words[a.cueWordIndex??a.wordIndex]?.start??0)+a.duration})).filter(e=>Number.isFinite(e.at));
 for(const e of scene.reaction?.entities||[])if(!e.inherited&&e.mediaId&&e.start>=scene.start&&e.start<scene.end)events.push({at:e.start});
 const times=[scene.start,...events.map(e=>e.at),scene.end].sort((a,b)=>a-b),issues=[];
 if(scene.storyCastCandidates?.length&&!actions.some(a=>['perform','depart','handoff','chase','dodge','pair-up','taunt'].includes(a.recipeKind)))issues.push({start:scene.start,end:scene.end,reason:'The narrated role/story needs an implemented character interaction or physical setup/action/payoff; source reveals alone do not act out the premise'});
 if(scene.start===0&&!events.some(e=>e.at<=1))issues.push({start:0,end:Math.min(scene.end,2),reason:'No relevant foreground hook in the first second'});
 for(let i=1;i<times.length;i++){
  const a=times[i-1],b=times[i];if(b-a<=2.25)continue;
  // Silence is not permission to cut a useful sheet or invent narration.
  if(!scene.words.some(w=>w.start>=a&&w.start<b)||events.some(e=>e.hold&&e.at<=a+.02&&e.end>=b-.05))continue;
  issues.push({start:a,end:b,reason:'Narrated passage has no new picture, focus, performance or deliberate evidence hold'});
 }
 if(Array.isArray(proposal.imageBeats)&&proposal.imageBeats.length&&!actions.some(a=>a.recipeKind==='stage-image'))issues.push({start:scene.start,end:scene.end,reason:'None of the planned source pictures has a valid spoken cue'});
 return issues;
}
