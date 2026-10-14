const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function clauseAround(words,index,count=1){
 let a=index,b=index+count;
 while(a>0&&!/[.!?;]$/.test(words[a-1].text))a--;
 while(b<words.length&&!/[.!?;]$/.test(words[b-1].text))b++;
 return {before:words.slice(a,index).map(w=>norm(w.captionText??w.text)).join(' '),after:words.slice(index+count,b).map(w=>norm(w.captionText??w.text)).join(' '),start:a,end:b};
}
export function mechanicMention(words,index,count,kind,name){
 const {before,after}=clauseAround(words,index,count),close=before.split(' ').slice(-5).join(' '),single=!name.includes('-');
 if(kind==='ability'){
  const explicit=/\babilit(?:y|ies)(?: (?:is|called|named|of|the|its|his|her|their))*$/.test(close)||/^abilit(?:y|ies)\b/.test(after);
  if(explicit)return true;
  if(name==='plus'&&(/[,;:]$/.test(words[index].text)||/^(?:it|its|he|she|they|this|that|we|you|there|the|also|has|good)\b/.test(after)))return false;
  return /\b(?:has|with|gets|runs|using|uses|ability is) (?:the )?$/.test(close)&&!/^\b(?:synergy|together)\b/.test(after);
 }
 if(/\babilit(?:y|ies)(?: is| called)?$/.test(close))return false;
 const explicit=/\b(?:moves?|uses?|used|using|learns?|learned|clicks?|spams?|fires?|launches?|unleashes?|hits?|attacks?|called|named|access to|gets?|has|runs|with|like|such as)(?: (?:the|move|a|an|both|and|or))*$/.test(close)||/^(?:move|attack)\b/.test(after);
 // Compound move names are distinctive. Common single words (Protect,
 // Return, Present, etc.) need a local mechanic cue, not one in another sentence.
 const explained=/^(?:is (?:one of the (?:best|worst|strongest|most \w+)|(?:a |the )?(?:best|worst|strongest|powerful|useful))\b.*\bmoves?\b|(?:is |gets )?(?:resisted|ineffective|super effective)\b|also nothing\b)/.test(after);
 return explicit||!single||explained;
}
