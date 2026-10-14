const key=text=>String(text||'').trim().replace(/\s+/g,' ').toLowerCase();
const colors={white:'#ffffff',black:'#000000',yellow:'#fff23d',red:'#ff423b',blue:'#6fdcff',green:'#6affaa',gold:'#ffcf57'};
const color=value=>/^#[0-9a-f]{6}$/i.test(value)?value:colors[key(value)];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function box(value){
 if(!value||!['x','y','width','height'].every(k=>Number.isFinite(value[k]))||value.width<=0||value.height<=0)return;
 const x=clamp(value.x,0,.99),y=clamp(value.y,0,.99);
 return {x,y,width:Math.min(value.width,1-x),height:Math.min(value.height,1-y)};
}
// Repair optional presentation fields without changing subject identities or
// discarding an otherwise useful model composition. Identity/schema validation
// remains strict at the caller.
export function normalizeThumbnailModelPlan(value){
 if(!value||typeof value!=='object')return value;
 const p=structuredClone(value);
 if(p.headlineColor!==undefined){const c=color(p.headlineColor);if(c)p.headlineColor=c;else delete p.headlineColor;}
 for(const a of p.assets||[]){
  if(a.box!==undefined){const b=box(a.box);if(b)a.box=b;else delete a.box;}
  if(a.transform&&typeof a.transform==='object'){
   if(a.transform.tint!==undefined){const c=color(a.transform.tint);if(c)a.transform.tint=c;else delete a.transform.tint;}
   if(a.transform.crop!==undefined){const b=box(a.transform.crop);if(b)a.transform.crop=b;else delete a.transform.crop;}
   if(Number.isFinite(a.transform.rotation))a.transform.rotation=clamp(a.transform.rotation,-180,180);
  }
 }
 if(Array.isArray(p.textLayers))p.textLayers=p.textLayers.filter(l=>l&&typeof l.text==='string'&&Number.isFinite(l.y)&&Number.isFinite(l.size)&&l.size>0).slice(0,10).map(l=>{
  const out={...l,y:clamp(l.y,.05,.96),size:clamp(l.size,.02,.35)};
  if(out.color!==undefined){const c=color(out.color);if(c)out.color=c;else delete out.color;}
  if(out.x!==undefined){if(Number.isFinite(out.x))out.x=clamp(out.x,0,1);else delete out.x;}
  if(out.width!==undefined){if(Number.isFinite(out.width)&&out.width>0)out.width=clamp(out.width,.01,1);else delete out.width;}
  return out;
 });
 return p;
}
export function deduplicateThumbnailText(plan){
 const seen=new Set([plan.headline,plan.secondaryText].map(key).filter(Boolean));
 return {...plan,textLayers:plan.textLayers?.filter(l=>{const k=key(l.text);if(!k||seen.has(k))return false;seen.add(k);return true;})};
}
