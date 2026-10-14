const clean=s=>s.replace(/\*\*/g,'').trim();
// Parse structured user data verbatim instead of regenerating it from model
// memory. Supports markdown build sheets and ordinary Pokepaste exports.
export function parseSuppliedTeam(text=''){
 const members=[],headers=[...text.matchAll(/^\*\*([^\n]+)\*\*\s*$/gm)];
 for(const [i,h] of headers.entries()){
  const block=text.slice(h.index,headers[i+1]?.index??text.length),item=block.match(/^Held Item:\s*(.+)$/mi)?.[1];if(!item)continue;
  const name=clean(h[1]),facts=[];const ability=block.match(/^(?:Base )?Ability:\s*(.+)$/mi)?.[1],mega=block.match(/^Mega Ability:\s*(.+)$/mi)?.[1],nature=block.match(/^Nature(?:\s*\/\s*Stat Alignment)?:\s*(.+)$/mi)?.[1];
  if(ability)facts.push('Ability: '+clean(ability));if(mega)facts.push('Mega Ability: '+clean(mega));if(nature)facts.push('Nature: '+clean(nature));
  const points=block.match(/^Stat Points:\s*(\d[^\n]+)|^EVs?:\s*(\d[^\n]+)$/mi);if(points)facts.push((/label them\s*["“]?SP/i.test(text)||/^Stat Points:/mi.test(block)?'SP: ':'EVs: ')+clean(points[1]||points[2]));
  const moves=/^Moves:\s*\n((?:[-*]\s*[^\n]+\n?)+)/mi.exec(block);if(moves)facts.push(...moves[1].split('\n').filter(l=>/^[-*]/.test(l)).map(l=>clean(l.replace(/^[-*]\s*/,''))));
  if(/\bAll\s+(?:Pok[e\u00e9]mon\s+(?:are\s+)?)?(?:are\s+)?Level\s*50/i.test(text)||/^Level:\s*50/mi.test(block))facts.push('Level 50');
  members.push({name,type:'pokemon',franchise:'pokemon',query:'Pokemon '+name+' official artwork',item:clean(item),facts,sourceQuote:block.trim(),structured:true});
 }
 if(members.length)return members;
 for(const block of text.split(/\n\s*\n/)){const header=/^\s*([^\n@]+?)\s*@\s*([^\n]+)\s*$/m.exec(block);if(!header)continue;const facts=block.split('\n').filter(l=>!l.includes('@')&&l.trim()).map(clean);members.push({name:clean(header[1]),type:'pokemon',franchise:'pokemon',query:'Pokemon '+clean(header[1])+' official artwork',item:clean(header[2]),facts,sourceQuote:block.trim(),structured:true});}
 return members;
}
