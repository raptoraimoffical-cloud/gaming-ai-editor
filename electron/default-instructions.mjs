import legacy from './data/legacy-editing-brief.json' with {type:'json'};
export const LEGACY_GAME_INSTRUCTIONS=legacy.older[1];
export const LEGACY_INSTRUCTIONS=legacy.older[0];
export const DEFAULT_INSTRUCTIONS='Plan the full narration before editing. Understand the subjects, relationships, actions and important claims in context, then build a coherent visual story. Use accurate online images, original game assets, relevant footage and GIFs. Act out important concepts with coordinated character performances, carried props, interactions and visible consequences. Entrances, fades and zooms support the action. Choose humor that fits this actual premise and finish its setup, action and payoff. Start with a relevant hook and vary the staging for each video. Aim for meaningful activity or a change of focus about every two seconds; hold readable evidence and complete actions. Use smooth motion, purposeful camera changes and coordinated transitions. Keep faces, attachments, evidence and captions clear. Use quiet, related moving backgrounds. Add frequent brief pops, swooshes and relevant game sounds at actual action phases, below the voice. Usually include music matched to the game or region; honor explicit mute and track choices. Use numbers and charts only for meaningful narrated facts. Preserve the original recording, timing and caption appearance. Follow the instructions for this video; create a fresh edit.';
export const CREATIVE_BRIEF=DEFAULT_INSTRUCTIONS;
const oldSentenceVariants=['Keep a narration-led picture sequence about every two seconds: use contextual meme GIFs for fast, slow, strong, fear and surprises, or published literal props for small, large, time, ideas and other important descriptions.','Source move and ability description screenshots through Google Images; do not substitute invented information cards.'];
// Remove only recognized old app boilerplate. A user's own script, blueprint,
// custom directives and reference preset remain specific to their project.
export function upgradeDefaultInstructions(text){
 if(typeof text!=='string'||!text.trim())return DEFAULT_INSTRUCTIONS;
 if(text===DEFAULT_INSTRUCTIONS)return text;
 const old=/^(?:Invent several different visual ideas|Make a dense, captivating gaming Short)/.test(text)||legacy.older.some(s=>text.includes(s));
 if(!old)return text;
 let custom=text;for(const sentence of [...legacy.older,...legacy.sentences,...oldSentenceVariants].sort((a,b)=>b.length-a.length))custom=custom.split(sentence).join('');
 custom=custom.replace(/^[ \t]+|[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
 return DEFAULT_INSTRUCTIONS+(custom?'\n\n'+custom:'');
}
