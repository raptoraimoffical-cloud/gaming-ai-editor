const norm=text=>String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const connectors=/^(a|an|the|of|to|with|and|or|for|by|than|its|his|her)$/i;
export function phraseCaptionRange(scene,project,current,maxWords=3){
 const words=scene.words||[],names=[...(scene.reaction?.entities||[]).map(e=>e.name),...(project.shortMechanics?.cues||[]).map(c=>c.title),...(project.media||[]).map(m=>m.pokemon?.displayName||m.assetRole==='item'&&m.name), 'special attack','special defense','base stats','max speed','one stage','water type','electric type'].filter(Boolean).map(norm).filter(n=>n.includes(' ')).sort((a,b)=>b.length-a.length),units=[];
 for(let i=0;i<words.length;i++){
  let end=i+1;
  if(words[i].captionText&&words[i].captionText!==words[i].text){while(end<words.length&&words[end].captionText==='')end++;}
  else{const name=names.find(n=>{const count=n.split(' ').length;return norm(words.slice(i,i+count).map(w=>w.text).join(' '))===n;});if(name)end=Math.min(words.length,i+name.split(' ').length);}
  const size=words.slice(i,end).map(w=>w.captionText??w.text).join(' ').trim().split(/\s+/).length;
  units.push({start:i,end,size,text:words[end-1].text});i=end-1;
 }
 const groups=[];let pending=[],size=0;
 const finish=()=>{if(pending.length)groups.push({start:pending[0].start,end:pending.at(-1).end});pending=[];size=0;};
 for(const unit of units){
  if(size+unit.size>maxWords&&pending.length){let tail;if(pending.length>1&&connectors.test(norm(pending.at(-1).text)))tail=pending.pop();finish();if(tail){pending=[tail];size=tail.size;}}
  pending.push(unit);size+=unit.size;if(/[.!?;]$/.test(unit.text))finish();
 }
 finish();return groups.find(g=>current>=g.start&&current<g.end)||{start:0,end:Math.min(maxWords,words.length)};
}
