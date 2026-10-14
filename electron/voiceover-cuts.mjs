const commonLead=/^(?:and|or|but|so|the|a|i|you|it|he|she|they|we|its|youre|im|theyre|were|hes|shes|youll|well|with|of|to|for|in)$/;
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
export const VOICEOVER_PACING={tight:{minimumGap:.028,remainingGap:.012,wordPadding:.004},natural:{minimumGap:.55,remainingGap:.28,wordPadding:.065},relaxed:{minimumGap:.9,remainingGap:.42,wordPadding:.065}};
function deliberateHold(words,gap){
 const before=words.filter(w=>w.end<=gap.start+.03).slice(-16),phrase=before.map(w=>norm(w.text)).join(' ');
 if(/\b(?:dont|do not|never|no)\s+(?:pause|wait|hold)\b/.test(phrase))return false;
 return /\b(?:wait for it|let that sink in|take a moment|moment of silence|pause here|pause now|hold here|pause to (?:read|look|think)|(?:copy|read|look at) (?:this|the) (?:build|team|screen|setup|chart|numbers))$/.test(phrase);
}
export function planVoiceoverCuts(words,duration,gaps=[],options={}){
 const cuts=[];let n=0;const add=(start,end,kind,reason,quote='')=>{start=Math.max(0,start);end=Math.min(duration,end);if(end-start>=.014)cuts.push({id:'cut-'+n++,start,end,kind,reason,quote,enabled:true});};
 const pacing=VOICEOVER_PACING[options.pacing]||VOICEOVER_PACING.natural,padding=pacing.wordPadding;
 if(options.tighten!==false)for(const gap of gaps){if(deliberateHold(words,gap)||options.pauseHolds?.some(h=>h.start<gap.end&&h.end>gap.start))continue;
  const start=gap.verifiedQuiet?gap.start:Math.max(gap.start,...words.filter(w=>w.end<=gap.end&&w.end>gap.start).map(w=>w.end+padding)),end=gap.verifiedQuiet?gap.end:Math.min(gap.end,...words.filter(w=>w.start>=gap.start&&w.start<gap.end).map(w=>w.start-padding));
  const leading=!words.some(w=>w.end<=start),trailing=!words.some(w=>w.start>=end),target=(leading||trailing)&&options.pacing==='tight'?0:pacing.remainingGap;
  if(end-start>=pacing.minimumGap)add(start+target/2,end-target/2,'pause',options.pacing==='tight'?'Close a detected non-speech gap; keep only the phonetic safety margin':'Shorten a non-speech pause while keeping natural spacing');
 }
 if(options.fillers!==false)for(const [i,w] of words.entries())if(/^(?:um|uh|erm|er)$/.test(norm(w.text))&&w.end>w.start+.035){const edges=removalEdges(words,i,i,duration);const before=cuts.length;add(edges.start,edges.end,'filler','Remove a standalone hesitation',w.text);if(cuts.length>before)Object.assign(cuts.at(-1),{firstWord:i,lastWord:i});}
 return cuts;
}
function removalEdges(words,first,last,duration=Infinity){
 const previous=words[first-1],next=words[last+1],a=words[first],b=words[last];
 const separatedBefore=Number.isFinite(previous?.speechOffset)&&Number.isFinite(a.speechOnset)&&a.speechOnset-previous.speechOffset>=.024,separatedAfter=Number.isFinite(b.speechOffset)&&Number.isFinite(next?.speechOnset)&&next.speechOnset-b.speechOffset>=.024;
 const lower=previous?(separatedBefore?previous.speechOffset:(previous.audioEnd??previous.end))+.004:0,upper=next?(separatedAfter?next.speechOnset:(next.audioStart??next.start))-.004:duration;
 const start=separatedBefore?Math.min(a.start-.008,a.speechOnset-.008):Math.min(a.start-.008,a.audioStart??a.start),end=separatedAfter?Math.max(b.end+.008,(b.speechOffset+next.speechOnset)/2):Math.max(b.end+.008,b.audioEnd??b.end);
 return {start:Math.max(0,lower,start),end:Math.min(duration,upper,end)};
}
export function validateRetake(words,proposal){
 if(!Number.isInteger(proposal.firstWord)||!Number.isInteger(proposal.lastWord)||proposal.firstWord<0||proposal.lastWord<proposal.firstWord||proposal.lastWord>=words.length||!Number.isFinite(proposal.confidence)||proposal.confidence<.92||proposal.confidence>1)throw Error('Retake has uncertain or invalid word boundaries');
 const selected=words.slice(proposal.firstWord,proposal.lastWord+1),quote=selected.map(w=>w.text).join(' ');
 if(norm(quote)!==norm(proposal.quote)||selected.length>60)throw Error('Retake does not match the actual transcript');
 if(proposal.lastWord>=words.length-1)throw Error('A retake must retain a later completed take');
 const k=proposal.keepFirstWord,z=proposal.keepLastWord;
 if(!Number.isInteger(k)||!Number.isInteger(z)||k<=proposal.lastWord||z<k||z>=words.length||k-proposal.lastWord>24)throw Error('Retake must identify its nearby later replacement take');
 const kept=words.slice(k,z+1),keptQuote=kept.map(w=>w.text).join(' '),oldTokens=selected.map(w=>norm(w.text)),newTokens=kept.map(w=>norm(w.text));
 if(proposal.keepQuote!==undefined&&norm(proposal.keepQuote)!==norm(keptQuote))throw Error('Replacement take does not match the actual transcript');
 let prefix=0;while(prefix<Math.min(oldTokens.length,newTokens.length)&&oldTokens[prefix]===newTokens[prefix])prefix++;
 const repair=/\b(?:no|sorry|restart|again|i mean)$/.test(norm(quote)),sameStart=oldTokens[0]===newTokens[0],fragment=/(?:\.\.\.|\u2026)$/.test(selected.at(-1).text)||selected.length<=3&&sameStart&&!commonLead.test(oldTokens[0]);
 if(prefix<Math.min(3,selected.length)&&!(sameStart&&(repair||fragment||selected.length<=10&&kept.length>=selected.length+3&&!commonLead.test(oldTokens[0]))))throw Error('No matching replacement take; original words retained');
 if(!repair&&!fragment&&kept.length<selected.length)throw Error('Replacement is less complete than the discarded take');
 const edges=removalEdges(words,proposal.firstWord,proposal.lastWord);
 if(edges.end<=edges.start)throw Error('Retake has no safe removable audio interval');
 return {...edges,firstWord:proposal.firstWord,lastWord:proposal.lastWord,protectedKeepEnd:k+Math.max(1,prefix)-1,kind:'retake',quote,reason:proposal.reason,keepFirstWord:k,keepLastWord:z,keepQuote:keptQuote,enabled:true};
}
export function retakeCandidates(words){
 const candidates=[],common=commonLead;
 for(let i=0;i<words.length-2;i++)for(let j=i+1;j<Math.min(words.length,i+25);j++){
  const a=norm(words[i].text),b=norm(words[j].text);if(!a||a!==b||/[\u2026]|\.\.\./.test(words[j].text))continue;if(i>0&&norm(words[i-1].text)===norm(words[j-1].text))continue;
  let prefix=0;while(i+prefix<j&&j+prefix<words.length&&norm(words[i+prefix].text)===norm(words[j+prefix].text))prefix++;
  const gap=words[j].start-words[j-1].end,fragment=!common.test(a)&&(j-i<=10)&&(prefix===1)&&(gap>.12||/\.\.\.|[\u2026]/.test(words[j-1].text));
  if(prefix<3&&!fragment)continue;
  let end=j;while(end+1<words.length&&end-j<40&&!/[.!?]$/.test(words[end].text)&&words[end+1].start-words[end].end<1.5)end++;
  if(end-j+1<j-i)continue;
  const proposal={firstWord:i,lastWord:j-1,quote:words.slice(i,j).map(w=>w.text).join(' '),keepFirstWord:j,keepLastWord:end,keepQuote:words.slice(j,end+1).map(w=>w.text).join(' '),confidence:1};
  try{validateRetake(words,proposal);candidates.push({...proposal,prefix,kind:fragment?'fragment':'repeat'});}catch{}
 }
 const full=candidates.filter(c=>!candidates.some(other=>other!==c&&other.firstWord<=c.firstWord&&other.lastWord>=c.lastWord&&other.keepFirstWord<=c.keepFirstWord&&other.keepLastWord>=c.keepLastWord&&(other.firstWord<c.firstWord||other.lastWord>c.lastWord)));
 const ranked=full.toSorted((a,b)=>b.prefix-a.prefix||b.lastWord-b.firstWord-(a.lastWord-a.firstWord)).slice(0,16);
 return ranked.map((c,i)=>({...c,id:'take-'+i}));
}
export function resolveRetakeProposal(words,proposal){
 const find=(quote,anchor)=>{const target=norm(quote),matches=[];if(!target)return matches;for(let i=Math.max(0,(anchor??0)-12);i<Math.min(words.length,(anchor??0)+13);i++)for(let j=i;j<Math.min(words.length,i+60);j++){const value=norm(words.slice(i,j+1).map(w=>w.text).join(' '));if(value===target)matches.push({first:i,last:j});if(value.length>target.length+8)break;}return matches;};
 try{validateRetake(words,proposal);return proposal;}catch{}
 const removed=find(proposal.quote,proposal.firstWord),kept=find(proposal.keepQuote,proposal.keepFirstWord),pairs=[];
 for(const a of removed)for(const b of kept)if(b.first>a.last){const p={...proposal,firstWord:a.first,lastWord:a.last,keepFirstWord:b.first,keepLastWord:b.last};try{validateRetake(words,p);pairs.push(p);}catch{}}
 if(!pairs.length)return proposal;
 return pairs.toSorted((a,b)=>Math.abs(a.firstWord-proposal.firstWord)+Math.abs(a.keepFirstWord-proposal.keepFirstWord)-Math.abs(b.firstWord-proposal.firstWord)-Math.abs(b.keepFirstWord-proposal.keepFirstWord))[0];
}
export function retainedVoiceoverRanges(duration,cuts){
 const removed=cuts.filter(c=>c.enabled!==false).map(c=>({start:Math.max(0,c.start),end:Math.min(duration,c.end)})).sort((a,b)=>a.start-b.start),merged=[];
 for(const r of removed){if(!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.end<=r.start)throw Error('Invalid voiceover cut');const last=merged.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else merged.push({...r});}
 const keep=[];let from=0;for(const r of merged){if(r.start-from>.025)keep.push({start:from,end:r.start});from=r.end;}if(duration-from>.025)keep.push({start:from,end:duration});if(!keep.length)throw Error('Cleanup would remove the entire voiceover');return keep;
}
export function voiceoverFilter(ranges,{breaths=[],enhance=false,gain=1,pacing='natural'}={}){
 const retainedBreaths=breaths.filter(b=>ranges.some(r=>r.start<b.end&&r.end>b.start)),merged=[];
 for(const b of retainedBreaths.toSorted((a,b)=>a.start-b.start)){const last=merged.at(-1);if(last&&b.start<=last.end+.025)last.end=Math.max(last.end,b.end);else merged.push({...b});}
 // Sample-by-sample ramps preserve speech tone and avoid the old frame-level
 // breath-gate jumps. No noise subtraction, EQ or dynamic loudness processing.
 const breathGain=merged.map(b=>{const f=Math.min(.035,(b.end-b.start)/3);return `(1-0.75*(1-cos(PI*clip((t-${b.start.toFixed(5)})/${f.toFixed(5)},0,1)))/2*(1-cos(PI*clip((${b.end.toFixed(5)}-t)/${f.toFixed(5)},0,1)))/2)`;}).join('*');
 const filters=['[0:a]aresample=48000'+(breathGain?`,aeval=exprs='val(ch)*${breathGain}':c=same`:'')+',asplit='+ranges.length+ranges.map((_,i)=>`[raw${i}]`).join('')];
 ranges.forEach((r,i)=>filters.push(`[raw${i}]atrim=start=${r.start.toFixed(5)}:end=${r.end.toFixed(5)},asetpts=PTS-STARTPTS[a${i}]`));let last='a0';for(let i=1;i<ranges.length;i++){const label='join'+i;filters.push(`[${last}][a${i}]acrossfade=d=0.008:c1=tri:c2=tri[${label}]`);last=label;}
 filters.push(`[${last}]${enhance&&Number.isFinite(gain)&&gain>0?'volume='+gain.toFixed(7):'anull'}[out]`);return filters.join(';').replaceAll('acrossfade=d=0.008',pacing==='tight'?'acrossfade=d=0.004':'acrossfade=d=0.008');
}
