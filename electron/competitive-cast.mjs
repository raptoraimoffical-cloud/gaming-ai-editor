import fs from 'node:fs';import path from 'node:path';
export function parseUsageTable(text){return [...String(text).matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([\d.]+)%/gm)].map(m=>({rank:Number(m[1]),name:m[2].trim(),usage:Number(m[3])})).filter(r=>r.usage>=1);}
export function createCompetitiveCast(folder,{fetchImpl=fetch}={}){
 fs.mkdirSync(folder,{recursive:true});let pending;
 async function load(project){
  const champions=/champions/i.test(project.topic+' '+project.scenes.map(s=>s.text).join(' ')),file=path.join(folder,champions?'champions-vgc.json':'vgc.json');
  let previous;try{previous=JSON.parse(fs.readFileSync(file,'utf8'));if(Date.now()-previous.time<86400000)return previous;}catch{}
  const get=async url=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Usage source HTTP '+r.status);return r.text();};
  try{const index=await get('https://www.smogon.com/stats/'),months=[...index.matchAll(/href="(20\d{2}-\d{2})\/"/g)].map(m=>m[1]).sort().reverse(),month=months[0];if(!month)throw Error('No published usage month');
   const base='https://www.smogon.com/stats/'+month+'/',listing=await get(base),files=[...listing.matchAll(/href="(gen9[^"/]+-1760\.txt)"/g)].map(m=>m[1]).filter(f=>champions?/^gen9championsvgc/.test(f):/^gen9vgc/.test(f)).filter(f=>!/bo3|bo1/i.test(f)).sort().reverse();
   if(!files.length)throw Error('No matching published VGC format');const source=base+files[0],rows=parseUsageTable(await get(source));if(!rows.length)throw Error('Usage table is empty');
   const result={time:Date.now(),month,format:files[0].replace(/-1760\.txt$/,''),source,rows};fs.writeFileSync(file,JSON.stringify(result));return result;
  }catch(e){if(previous)return {...previous,warning:'Cached usage examples: '+e.message};return {rows:[],warning:e.message};}
 }
 return {async load(project){if(pending)return pending;pending=load(project);try{return await pending;}finally{pending=undefined;}}};
}
