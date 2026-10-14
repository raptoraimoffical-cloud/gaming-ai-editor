// One narration-context decision is shared by source cards, learner galleries
// and combat. It uses complete clauses and the established cast, not five words
// immediately before a move name.
const norm=s=>String(s||'').toLowerCase().replace(/['\u2019]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function moveContext(project,cue){
 const words=project.scenes.flatMap(s=>(s.words||[]).map(w=>({...w,sceneId:s.id}))),i=words.findIndex(w=>Math.abs(w.start-cue.start)<.025),mentions=(project.pokemonMentions||[]).filter(m=>m.status==='ready'&&m.mediaId).sort((a,b)=>a.start-b.start);
 if(i<0)return {kind:'uncertain',showLearners:false,showCard:true,reason:'Move has no exact spoken cue'};
 const length=cue.wordCount||String(cue.name||cue.title||'').split(/[- ]/).length;
 let a=i,b=i+length;while(a>0&&!/[.!?;]$/.test(words[a-1].text))a--;while(b<words.length&&!/[.!?;]$/.test(words[b-1].text))b++;
 const transition=j=>/^(?:but|however|instead|whereas)$/i.test(norm(words[j]?.text))||norm(words[j]?.text)==='and'&&/^(?:now|then|yet|instead)$/.test(norm(words[j+1]?.text));
 for(let j=a;j<i;j++)if(transition(j))a=j;for(let j=i+length;j<b;j++)if(transition(j)){b=j;break;}
 const begin=words[a].start,end=words[Math.min(b-1,words.length-1)].end,before=words.slice(a,i).map(w=>norm(w.captionText??w.text)).join(' '),after=words.slice(i+length,b).map(w=>norm(w.captionText??w.text)).join(' '),text=before+' '+norm(cue.title||cue.name)+' '+after;
 const current=mentions.filter(m=>m.start>=begin-.02&&m.start<end),recent=[...new Map(mentions.filter(m=>m.start<end&&cue.start-m.end<24).map(m=>[m.mediaId,m])).values()],personal=/\b(?:its|his|her|their|it|them|this pokemon|that pokemon|the opponent)\b/.test(text),explicitAction=/\b(?:uses?|used|using|fires?|unleashes?|launches?|attacks?|hits?|clicks?|spams?|checks?|counters?|threatens?|threatened|beats?|resists?|resisted|immune|immunity|affected|switch(?:es)?|fails?|nothing|staring down|facing)\b/.test(text);
 const general=/\b(?:one of the (?:best|worst|strongest|most)|(?:best|worst|strongest|powerful|useful|great|popular|common) (?:pokemon )?moves?|(?:move|strategy) (?:is|works|lets|changes)|pokemon (?:that|which|who|can) learn|(?:learners|distribution|learnability))\b/.test(text)||current.length===0&&!personal&&!explicitAction;
 const broadBest=/\b(?:one of the (?:best|worst|strongest|most)|(?:best|worst|strongest|popular|common) (?:pokemon )?moves?)\b/.test(text)&&!explicitAction;
 const kind=broadBest?'general':(current.length||personal&&recent.length||explicitAction&&recent.length)&&!(general&&!personal&&!current.length)?'matchup':general?'general':'uncertain';
 const verbWords=words.slice(a,b).filter(w=>/^(?:uses?|used|using|fires?|unleashes?|launches?|attacks?|hits?|clicks?|spams?|checks?|counters?|threatens?|threatened|beats?)[,.!?]*$/i.test(w.text)),verb=verbWords.filter(w=>w.start<=cue.start).at(-1)||verbWords[0],verbAt=verb?.start??cue.start;
 let attacker=mentions.filter(m=>m.end<=verbAt+.04&&verbAt-m.end<20).at(-1),defender=current.find(m=>m.start>cue.start&&m.mediaId!==attacker?.mediaId);
 if(!defender){
  const alternatives=recent.filter(m=>m.mediaId!==attacker?.mediaId),targetLanguage=/\b(?:on|against|towards?|into|at|opponents?|targets?|enem(?:y|ies)|foes?)\b/.test(after)||/\b(?:it|them|him|her)\b/.test(after)||/\b(?:resists?|staring down|facing|threatened by)\b/.test(before);
  const previous=words.slice(Math.max(0,a-35),a).map(w=>norm(w.text)).join(' '),opposition=/\b(?:versus|vs|against|opponents?|resists?|counters?|checks?|attacks?|one shot|ohko)\b/.test(previous);
  // A previously introduced partner is not automatically the victim of the
  // next move. Own-stat setup/charge explanations have no opposing target.
  const ownSetup=/\b(?:raise|raises|raising|boost|boosts|boosting|increase|increases) (?:its|his|her|their|the users?)\b/.test(after);
  if(alternatives.length===1&&(targetLanguage||opposition&&!ownSetup))defender=alternatives[0];
 }
 // In “it resists Sucker Punch”, the grammatical subject receives the move.
 // An explicit user/firing verb still owns its usual attacker interpretation.
 const reception=/\b(?:resists?|staring down|facing|threatened by)\b/.test(before);
 if(!verb&&reception&&attacker){defender??=recent.filter(m=>m.mediaId!==attacker.mediaId).sort((a,b)=>a.end-b.end).at(-1);if(defender)[attacker,defender]=[defender,attacker];}
 const ineffective=/\b(?:does? (?:absolutely |almost |really )?nothing|also nothing|isnt (?:really |even )?affected|not (?:really |even )?affected|unaffected|immune|immunity|fails? completely|no damage)\b/.test(text),resisted=/\bresist|not very effective/.test(text);
 const detail=/\b(?:base power|accuracy|description|percent|chance|stat changes?|priority of|turns? for)\b/.test(text);
 const passiveReception=!verb&&(ineffective||resisted)&&current.length===0,hasPair=!!attacker&&!!defender&&attacker.mediaId!==defender.mediaId,requestedCard=/\b(?:show|keep|add|include) (?:all |the )?(?:sourced |source |published |real )?move (?:info|information|description) (?:cards|images)\b/i.test(project.editingInstructions||'');
 return {kind,showLearners:kind==='general',showCard:kind!=='matchup'||!hasPair&&!(passiveReception&&recent.length>=2)||detail||requestedCard||cue.damageClass==='status',hasPair,attackerId:attacker?.mediaId,defenderId:defender?.mediaId,verbAt,action:kind==='matchup'&&(!!verb||ineffective||resisted||reception),passiveReception,outcome:ineffective?'ineffective':resisted?'resisted':undefined,begin,end,text,reason:kind==='general'?'General move explanation':kind==='matchup'?'Named or contextual Pokemon matchup':'No grounded learner-gallery premise'};
}
