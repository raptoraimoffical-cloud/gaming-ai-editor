import {videoMode} from './video-modes.mjs';
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const filler=/^(?:so|well|anyway|basically|honestly|you know|i mean|as i said|moving on|let me tell you|in this video)[ ,.!?]*$/i;
const action=/\b(evolv\w*|defeat\w*|attack\w*|unlock\w*|craft\w*|build\w*|surviv\w*|damage\w*|heal\w*|jump\w*|win\w*|los\w*|transform\w*|increase\w*|decrease\w*|grew|fell|rose)\b/i;
const concepts=/\b(biome|forest|cave|desert|snow|snowy|terrain|arena|map|weapon|ability|abilities|armor|shield|mechanic|update|inventory|crafting)\b/i;
const comparison=/\b(versus|vs|compared|better|worse|stronger|weaker|faster|slower|instead|unlike|but)\b/i;
const contains=(text,name)=>(' '+normalize(text)+' ').includes(' '+normalize(name)+' ');

export function sentenceImportance(scene){
 const words=scene.words||[],chunks=[];
 if(words.length){let current=[];for(const w of words){if(current.length&&/^(but|because|whereas|however|then)$/i.test(normalize(w.text))){chunks.push(current);current=[];}current.push(w);if(/[.!?;,]$/.test(w.text)){chunks.push(current);current=[];}}if(current.length)chunks.push(current);}
 const groups=chunks.length?chunks.map(ws=>({text:ws.map(w=>w.text).join(' '),start:ws[0].start,end:ws.at(-1).end,timing:'spoken-word timestamps'})):[{text:scene.text,start:scene.start,end:scene.end,timing:'scene timing; word alignment unavailable'}];
 let previous=[];
 return groups.map((part,index)=>{
  const mentioned=(scene.reaction?.entities||[]).filter(e=>contains(part.text,e.name)||contains(part.text,e.id.replace(/-/g,' ')));
  const pronoun=/\b(it|they|this pokemon|this character|its|their)\b/i.test(part.text);
  const entities=mentioned.length?mentioned:pronoun?previous:[];if(mentioned.length)previous=mentioned;
  const metricIndexes=(scene.reaction?.metrics||[]).flatMap((m,i)=>m.start>=part.start-.05&&m.start<part.end+.05?[i]:[]);
  const type=filler.test(part.text)?'connective':metricIndexes.length||/\b\d+(?:\.\d+)?\s*(?:%|percent|points|damage|seconds)\b/i.test(part.text)?'evidence':comparison.test(part.text)?'comparison':action.test(part.text)?'action':mentioned.length?'subject':concepts.test(part.text)?'concept':'explanation';
  const importance=type==='connective'?0:type==='evidence'||type==='comparison'?3:type==='action'||type==='subject'||type==='concept'?2:1;
  const tokens=part.text.match(/[A-Za-z][A-Za-z'-]*|\d+(?:\.\d+)?%?/g)||[];
  const keywords=[...new Set([...entities.map(e=>e.name),...tokens.filter(w=>action.test(w)||comparison.test(w)||concepts.test(w)||/\d/.test(w))])].slice(0,8);
  return {id:scene.id+'-phrase-'+index,...part,type,importance,entityIds:entities.map(e=>e.id),metricIndexes,keywords,visualNeed:type==='connective'?'hold':type==='evidence'?'chart':type==='comparison'?'comparison':type==='action'||type==='concept'?'demonstration':entities.length?'image':'context',reason:type==='connective'?'Connecting speech does not introduce a visual claim':type==='evidence'?'Visualize only the narrated, supplied evidence':type==='comparison'?'Show the difference being discussed':type==='action'?'Show the action and its consequence':type==='concept'?'Show the named mechanic or environment rather than a decorative image':entities.length?'Show the referenced subject; keep pronouns on the established subject':'Keep context while the explanation develops'};
 });
}
export function youtubeStrategy(project){
 const mode=videoMode(project),short=mode.format==='vertical';
 return {mode:mode.id,canvas:{width:mode.width,height:mode.height},targetInterval:2,rules:short?['Make the subject and promise clear immediately.','Use one dominant visual with readable mobile framing.','Use relevant two-second focus changes; hold charts long enough to read.','Deliver the promised payoff without adding filler.']:['Establish context and the question being answered.','Develop evidence in a coherent sequence; use widescreen comparisons.','Use two-second focus changes within explanations, preserving chart reading time.','Resolve the question with a clear conclusion.'],recommendationBasis:'Audience relevance, choosing to watch, viewing behavior and satisfaction; editorial guidance, not knowledge of private ranking weights.',sources:['https://support.google.com/youtube/answer/16089387','https://support.google.com/youtube/answer/11914225'],sentences:project.scenes.map(s=>({sceneId:s.id,phrases:sentenceImportance(s)}))};
}
