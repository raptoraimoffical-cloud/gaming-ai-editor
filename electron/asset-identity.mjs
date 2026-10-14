const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const FRANCHISES=[['minecraft',/\bminecraft\b/],['pokemon',/\bpokemon\b|\bpokemon(?:champions|showdown)\b/],['mario',/\b(?:mario|luigi|nintendo platformer)\b/],['zelda',/\bzelda\b/],['fortnite',/\bfortnite\b/],['valorant',/\bvalorant\b/],['melee',/\bmelee\b/],['roblox',/\broblox\b/],['counter-strike',/\bcounter strike\b/],['league-of-legends',/\bleague of legends\b/],['apex-legends',/\bapex legends\b/],['overwatch',/\boverwatch\b/],['rocket-league',/\brocket league\b/],['call-of-duty',/\bcall of duty\b/],['dota-2',/\bdota 2\b/]];
// AI responses and source catalogs use display names, accents, capitalization
// and individual game titles. Compare their canonical family, never raw labels.
export function normalizeFranchise(value){
 const key=normalize(String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2'));
 if(!key||['unknown','none','all','other','multiple','multiple games','n a'].includes(key))return 'unknown';
 return FRANCHISES.find(([,re])=>re.test(key))?.[0]||key.replace(/ /g,'-');
}
export function assetIdentity(asset){
 const hay=normalize(`${asset.name} ${asset.tags||''} ${asset.attribution?.description||''}`);
 const explicit=asset.identity||{};const franchise=asset.pokemon?'pokemon':explicit.franchise?normalizeFranchise(explicit.franchise):FRANCHISES.find(([,re])=>re.test(hay))?.[0]||'unknown';
 const subject=asset.pokemon?.name||explicit.subject||(/\bminecraft\b/.test(hay)?['chicken','pig','cow','sheep','creeper','zombie','skeleton'].find(n=>new RegExp(`\\b${n}s?\\b`).test(hay)):undefined)||asset.name;
 return {...explicit,franchise,subject,variant:asset.pokemon?.name||explicit.variant||'unspecified',source:explicit.source||asset.attribution?.source||asset.pokemon?.sourceUrl||'local library',permission:{license:asset.license||'Not declared',source:asset.attribution?.licenseUrl||asset.pokemon?.licenseUrl||'',status:asset.pokemon?'repository notice / Pokemon image copyright':asset.attribution?'provider metadata':asset.license?'user declaration':'unavailable'},confidence:asset.pokemon?1:explicit.confidence??(franchise==='unknown'?.35:.9)};
}
export function franchiseForEntity(entity){
 if(entity.type==='pokemon')return 'pokemon';
 const explicit=normalizeFranchise(entity.franchise);if(explicit!=='unknown')return explicit;
 const title=normalize(`${entity.id||''} ${entity.name||''} ${entity.query||''}`);
 // An arbitrary model-proposed game ID is not a franchise. Resolve known
 // families from actual names; a subtitle remains in its parent family.
 return FRANCHISES.find(([,re])=>re.test(title))?.[0]||'unknown';
}
export function allowedFranchise(entity,asset){const expected=franchiseForEntity(entity),actual=assetIdentity(asset).franchise;return expected==='unknown'||actual==='unknown'&&!asset.pokemon||expected===actual;}

export function refineVisualBeats(project){
 const scenes=[];
 for(const s of project.scenes){
  const points=(project.pokemonMentions||[]).filter(m=>m.start>s.start+.1&&m.start<s.end-.08&&/\bminecraft\b/i.test(s.text)&&s.words.some(w=>w.start<m.start&&/\bminecraft\b/i.test(w.text))).map(m=>m.start);
  const mob=s.words.findIndex(w=>/^(chickens?|pigs?)\b/i.test(w.text));if(mob>=6&&/\bminecraft\b/i.test(s.text)&&s.words[mob].start>s.start+.6)points.push(s.words[mob].start);
  const cuts=[s.start,...new Set(points),s.end].sort((a,b)=>a-b);
  for(let i=0;i<cuts.length-1;i++){const start=cuts[i],end=cuts[i+1],words=s.words.filter(w=>w.start>=start-.01&&w.start<end-.01);scenes.push({...s,id:cuts.length>2?`${s.id}-topic-${i}`:s.id,start,end,words,text:words.map(w=>w.text).join(' '),layers:undefined,pokemon:(s.pokemon||[]).filter(p=>p.start<end&&p.end>start).map(p=>({...p,start:Math.max(start,p.start),end:Math.min(end,p.end)}))});}
 }
 return {...project,scenes};
}
