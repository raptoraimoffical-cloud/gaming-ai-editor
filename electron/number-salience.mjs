const clean=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function significantMetric(scene,metric){
 if(!Number.isFinite(metric.value)||metric.value<0)return false;
 if(['percentage','base-stat'].includes(metric.kind))return true;
 if(metric.kind==='year')return /\b(?:released|launched|since|year|history|in)\b/i.test(scene.text||'');
 if(metric.label&&metric.label!=='Narrated number')return true;
 const words=scene.words||[],i=words.findIndex(w=>Math.abs(w.start-metric.start)<.04),near=words.slice(Math.max(0,i-4),i+7).map(w=>clean(w.captionText??w.text)).join(' ');
 return /\b(?:times?|x) (?:super effective|effective|damage|stronger|weaker)|\b(?:costs?|worth|price|speed|power|damage|accuracy|attack|defense|hp|cooldown|percent|fps|gb)\b/.test(near)&&!/^\b(?:every|each)\b/.test(near);
}
export function metricDisplay(scene,metric){
 const words=scene.words||[],i=words.findIndex(w=>Math.abs(w.start-metric.start)<.04),after=words.slice(Math.max(0,i+1),i+8).map(w=>clean(w.captionText??w.text)).join(' ');
 if(/^(?:times?|x) (?:super effective|effective)/.test(after))return metric.value+'× super effective';
 return new Intl.NumberFormat('en-US').format(metric.value)+(metric.label&&metric.label!=='Narrated number'?' '+metric.label:'');
}
