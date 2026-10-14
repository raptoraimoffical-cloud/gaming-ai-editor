import {interpretLocal,applyOperations,requestClauses} from './revisions.mjs';
// Layout/style passes must not overwrite concrete instructions after the
// planner has read them. Apply explicit values last, without re-scaling every
// asset or treating general editorial guidance as a literal image query.
export function applyFinalInstructions(project,text=project.editingInstructions||''){
 let next=project;const applied=[];
 const firstScene=text.search(/^##\s*SCENE\s+\d+/mi),globalText=firstScene>=0?text.slice(0,firstScene):text;
 for(const clause of requestClauses(globalText)){
  if(/^REFERENCE SHORT STYLE:/i.test(clause)||/\b(?:do not|don't|never|preserve|unchanged)\b/i.test(clause))continue;
  if(!/^(?:please\s+)?(?:use|set|change|make|move|put|hide|disable|show|reduce|remove|delete|replace|double)\b/i.test(clause))continue;
  // Do not interpret contextual narration/conditional plans as global edits.
  if(/\b(?:when|whenever|if|as mentioned|as narrated|at spoken|in context)\b/i.test(clause))continue;
  if(!/\b(?:background|backdrop|captions?|subtitles?|smaller|larger|bigger|twice|double|left|right|font|volume)\b/i.test(clause))continue;
  try{const command=interpretLocal(next,clause,{});if(!command.operations.every(o=>['background','position','scale','captions','sfx'].includes(o.type)))continue;next=applyOperations(next,command).project;applied.push({request:clause,operations:command.operations});}catch{}
 }
 return {...next,finalInstructionReport:{applied}};
}
