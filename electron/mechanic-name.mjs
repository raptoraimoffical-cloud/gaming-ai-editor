import {mechanicMention,clauseAround} from './mechanic-context.mjs';
const compact=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
const indexes=new WeakMap();
const spokenAliases=new Map([['lasterspecs','last-respects'],['lastrespecs','last-respects']]);
function indexFor(entries){if(indexes.has(entries))return indexes.get(entries);const index=new Map();for(const m of entries)index.set(compact(m.name),m);indexes.set(entries,index);return index;}
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next;}return row[b.length];}
function findMechanic(words,at,entries){
 const index=indexFor(entries),samples=[];
 for(let count=Math.min(5,words.length-at);count>0;count--){const spoken=compact(words.slice(at,at+count).map(w=>w.captionText??w.text).join(' '));if(!spoken)continue;const alias=spokenAliases.get(spoken),entry=index.get(alias?compact(alias):spoken);
  if(entry&&mechanicMention(words,at,count,entry.kind||'move',entry.name))return {entry,count,corrected:spoken!==compact(entry.title||entry.name)||count!==entry.name.split('-').length};samples.push({spoken,count});}
 // Recover minor speech-recognition splits/spelling errors only after a local
 // mechanic cue. Ambiguous and ordinary narration remain untouched.
 const before=clauseAround(words,at).before.split(' ').slice(-5).join(' ');
 if(!/\b(?:moves?|uses?|using|used|with|learns?|learned|fires?|clicks?|ability(?: is)?|called|named)(?: (?:the|a|an|move|attack|both|and|or))*$/.test(before))return;
 const candidates=[];for(const sample of samples){if(sample.spoken.length<8)continue;for(const [name,entry] of index){if(Math.abs(name.length-sample.spoken.length)>2||!mechanicMention(words,at,sample.count,entry.kind||'move',entry.name))continue;const d=distance(name,sample.spoken);if(d<=2&&d/Math.max(name.length,sample.spoken.length)<=.2)candidates.push({...sample,entry,d});}}
 candidates.sort((a,b)=>a.d-b.d||b.spoken.length-a.spoken.length);const best=candidates[0];if(best&&(!candidates[1]||best.d<candidates[1].d||best.entry.name===candidates[1].entry.name))return {entry:best.entry,count:best.count,corrected:true};
}
export function matchMechanic(words,at,entries){
 const index=indexFor(entries);index.recognitionCache??=new Map();
 const key=words.slice(Math.max(0,at-5),at+11).map(w=>w.captionText??w.text).join('|')+'@'+Math.min(at,5);
 if(index.recognitionCache.has(key))return index.recognitionCache.get(key);
 const result=findMechanic(words,at,entries);if(index.recognitionCache.size>=4096)index.recognitionCache.delete(index.recognitionCache.keys().next().value);index.recognitionCache.set(key,result);return result;
}
