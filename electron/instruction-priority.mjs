const positive=(text,kind)=>!new RegExp("\\b(?:no|without|disable|remove|avoid|stop|don['\u2019]?t|never)\\s+(?:(?:add|use|show|more|the|any|automatic|all)\\s+){0,3}"+kind,'i').test(text)&&new RegExp('\\b(?:more|many|lots of|frequent|enable|add|want)\\b.{0,45}'+kind,'i').test(text);
export function latestBrief(base,draft=''){
 let next=base;const visualDraft=draft.replace(/\bsound effects?/gi,'audio cues');
 if(positive(visualDraft,'(?:animations?|motion|movement|effects)'))next=next.replace(/\b(?:no|without|avoid|disable)\s+(?:all\s+)?(?:motion|animations?|movement)\b/gi,'purposeful animation');
 if(positive(visualDraft,'(?:effects|animations?|visuals)'))next=next.replace(/\b(?:minimal effects|restrained|sparse|clean documentary|documentary)\b/gi,'dense narration-led visuals').replace(/\b(?:no|without|disable|remove|avoid)\s+(?:visual\s+)?effects\b/gi,'purposeful visual effects');
 if(positive(draft,'(?:sounds?|sound effects?|sfx)'))next=next.replace(/\b(?:no|without|disable|remove)\s+(?:automatic\s+)?(?:sound effects?|sfx)\b/gi,'brief narration-cued sound effects');
 return next;
}
export function applyLatestSwitches(project,draft=''){
 const next={...project};
 if(positive(draft,'(?:sounds?|sound effects?|sfx)'))next.autoSoundEffects=true;
 if(positive(draft.replace(/\bsound effects?/gi,'audio cues'),'(?:animations?|motion|movement|effects)'))next.freezePokemonMotion=false;
 if(positive(draft,'(?:gifs|memes|reactions)'))next.autoReactionGifs=true;
 return next;
}
