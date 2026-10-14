import {extractAudioScript,readSceneBlueprints} from './scene-blueprint.mjs';
import {parseSuppliedTeam} from './supplied-team.mjs';
import {DEFAULT_INSTRUCTIONS,upgradeDefaultInstructions} from './default-instructions.mjs';

// A pasted production guide is both a visual brief and a quoted transcript.
// Never feed its shot directions/team data to speech alignment as spoken words.
export function resolveCreationBrief(options={}){
 const instructions=String(options.editingInstructions||''),script=String(options.script||''),scriptNarration=extractAudioScript(script);
 const combined=readSceneBlueprints(script).length>0||!!scriptNarration&&(parseSuppliedTeam(script).length>0||/^#{1,3}\s*\d*\.?\s*(?:YOUR TASK|VIDEO FORMAT|VISUAL STYLE|EDITING|ASSET)/mi.test(script));
 let editingInstructions=instructions;
 if(combined&&!instructions.includes(script))editingInstructions=script+(instructions.trim()&&instructions!==DEFAULT_INSTRUCTIONS?'\n\n'+instructions:'');
 const narration=combined?scriptNarration:script||extractAudioScript(editingInstructions);
 editingInstructions=upgradeDefaultInstructions(editingInstructions);
 return {...options,script:narration,editingInstructions,creationBriefReport:{combinedGuideDetected:combined,visualNotesSource:combined?'Optional script and Editing Instructions':'Editing Instructions',sceneInstructions:readSceneBlueprints(editingInstructions).length,suppliedTeamMembers:parseSuppliedTeam(editingInstructions).length,quotedNarrationDetected:!!extractAudioScript(editingInstructions)}};
}
