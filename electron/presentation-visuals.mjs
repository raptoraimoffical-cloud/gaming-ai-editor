const PALETTES={platformer:['#132e56','#102036','#ff5b54','#62d7fb'],battle:['#111b3a','#071521','#ffc65c','#78ded2'],arena:['#261749','#0d1430','#b590ff','#6fe9fb'],esports:['#161d36','#070e1a','#ff7279','#91eece'],analysis:['#102b35','#06121d','#58e1cc','#7eb3ff'],leaderboard:['#302750','#101226','#ffcf70','#b095ff'],news:['#2c1530','#111327','#fc698d','#99d1ff'],documentary:['#20313b','#0c1722','#e7c389','#a4dcd7'],fantasy:['#183d35','#0b1623','#b3e77e','#edca87']};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function backdrop(theme,accent,secondary){const grid=theme==='analysis'||theme==='esports'||theme==='news';const lines=grid?Array.from({length:10},(_,i)=>`<path d="M${i*120} 0V1920 M0 ${i*210}H1080" stroke="${secondary}" opacity=".065"/>`).join(''):'';const landscape=theme==='platformer'?`<path d="M0 1300H180V1210H370V1340H590V1230H790V1320H1080V1920H0Z" fill="${secondary}" opacity=".14"/><path d="M0 1480H1080" stroke="${accent}" opacity=".25"/>`:theme==='battle'?`<ellipse cx="540" cy="1170" rx="440" ry="140" fill="none" stroke="${accent}" opacity=".22" stroke-width="4"/><path d="M100 1170H980 M540 1000V1340" stroke="${secondary}" opacity=".18"/>`:theme==='leaderboard'?`<path d="M160 1300V870H410V1300 M420 1300V680H670V1300 M680 1300V1040H930V1300" fill="${accent}" opacity=".08"/>`:'';return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${lines}${landscape}<circle cx="940" cy="300" r="360" fill="none" stroke="${secondary}" opacity=".1" stroke-width="2"/><path d="M55 150L180 150 M900 1760H1025" stroke="${accent}" stroke-width="5" opacity=".5"/></svg>`;}
export function composeReaction(scene,project){
 const r={...scene.reaction};if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='comparison')r.intent='comparison';if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='ranking'){r.intent='ranking';r.rankings=r.entities.map((e,i)=>({entityId:e.id,label:e.name,rank:i+1,start:e.start,mediaId:e.mediaId,source:'manual list order'}));}const palette=PALETTES[r.theme]||PALETTES.analysis;const [light,dark,accent,secondary]=palette;const layers=[];
 const add=(type,props={})=>{const layer={id:`${scene.id}-reaction-${layers.length}`,type,x:.07,y:.1,width:.86,height:.06,z:layers.length,start:scene.start,end:scene.end,enter:'fade',exit:'fade',easing:'easeOut',...props};layer.start=Math.max(scene.start,Math.min(scene.end-.03,layer.start));layers.push(layer);return layer;};
 const text=(value,x,y,width,height,color='white',start=scene.start)=>add('text',{text:String(value),x,y,width,height,color,start,enter:'slide'});
 const shape=(x,y,width,height,color='#ffffff09',props={})=>add('shape',{x,y,width,height,color,...props});
 add('shape',{x:0,y:0,width:1,height:1,color:`radial-gradient(ellipse at 85% 15%,${light},${dark} 85%)`,enter:'none'});
 add('svg',{svg:backdrop(r.theme,accent,secondary),x:0,y:0,width:1,height:1,opacity:1,enter:'none'});
 shape(.07,.07,.07,.005,accent);text(r.entities[0]?.type==='pokemon'?'POKEMON / ANALYSIS':r.intent==='ranking'?'THE RANKING':r.theme==='platformer'?'CHARACTER FILE':r.intent==='statistic'?'BY THE NUMBERS':'GAMING / EXPLAINED',.17,.061,.75,.022,accent);
 const subjectEntities=r.entities.filter(e=>e.mediaId);const subjects=subjectEntities.map(e=>({...e,media:project.media.find(m=>m.id===e.mediaId)}));
 if(subjects[0]?.media.kind==='video')add('video',{mediaId:subjects[0].mediaId,x:0,y:.26,width:1,height:.58,fit:'cover',blur:18,opacity:.16,start:subjects[0].start,z:1});
 const title=scene.titleOverride||(r.intent==='statistic'||r.intent==='number'?r.metrics[0]?.label||'The numbers':r.intent==='ranking'?'The final order':r.intent==='comparison'?'What sets them apart':r.intent==='timeline'?'How it changed':r.intent==='news'?'The latest development':r.entities[0]?.name||scene.title);
 text(title,.07,.135,.86,.066);const subtitle=r.intent==='comparison'?'A closer look at both sides':r.intent==='ranking'?'Positions stated in the narration':r.intent==='statistic'?r.metrics[0]?.verified?'Base stat verified against PokeAPI':'The figure stated in this voiceover':r.intent==='reveal'?'The payoff':r.categories.includes('emphasis')?'WHY IT MATTERS':'IN FOCUS';text(subtitle,.075,.225,.84,.021,'#c3cbd9');
 const credits=new Map();
 const asset=(entity,x,y,w,h,enter='spring',start=entity.start)=>{const media=entity.media||project.media.find(m=>m.id===entity.mediaId);if(!media)return;add(media.kind==='video'?'video':'image',{mediaId:media.id,x,y,width:w,height:h,fit:media.kind==='video'?'cover':'contain',start,end:entity.visualEnd||scene.end,enter,float:media.kind==='pokemon'&&r.intent!=='statistic',mask:'inset(0 round 18px)',shadow:true});if(media.attribution)credits.set(media.id,media.attribution.credit);};
 if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='solo'){
  shape(.07,.31,.86,.435,'#ffffff08',{stroke:'#ffffff15'});subjects.forEach(e=>{asset(e,.115,.335,.77,.385,'spring');add('text',{text:e.name,x:.09,y:.765,width:.82,height:.025,color:accent,start:e.start,end:e.visualEnd||scene.end});});
 }else if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='team'||r.entities.length>2&&r.intent==='pokemon'){
  subjects.slice(0,6).forEach((e,i)=>{const x=.065+(i%3)*.3,y=.32+Math.floor(i/3)*.22;shape(x,y,.275,.2,'#ffffff08',{start:e.start,stroke:'#ffffff15'});asset(e,x+.015,y+.01,.245,.145,'spring');text(e.name,x+.015,y+.16,.245,.021,'white',e.start);});
 }else if(r.intent==='ranking'){
  const rankings=r.rankings.length?r.rankings: r.entities.map(e=>({entityId:e.id,label:e.name,rank:undefined,start:e.start,mediaId:e.mediaId,source:'narration'}));
  const sorted=[...rankings].sort((a,b)=>(a.rank||999)-(b.rank||999));
  const dense=sorted.length>5;sorted.slice(0,10).forEach((rank,i)=>{const y=.32+i*(dense?.047:.105),start=rank.start;shape(.06,y,.88,dense?.041:.09,i===0?'#ffcf701c':'#ffffff0a',{start,enter:'slide',stroke:i===0?accent:'#ffffff18'});text(rank.rank?`#${rank.rank}`:'-',.09,y+(dense?.006:.017),.16,dense?.023:.052,rank.rank===1?accent:'#e9edf9',start);const e=r.entities.find(e=>e.id===rank.entityId);if(e?.mediaId)asset(e,.255,y+.003,dense?.095:.15,dense?.034:.075,'spring',start);text(rank.label,e?.mediaId?(dense?.37:.435):.29,y+(dense?.011:.026),e?.mediaId?(dense?.54:.47):.62,dense?.018:.032,'white',start);});
  if(sorted.length===0){shape(.08,.35,.84,.28,'#ffffff08');text(/top\s*(10|ten)/i.test(scene.text)?'TOP 10':'TOP 5',.13,.42,.76,.12,accent);text('Waiting for named list items',.13,.58,.74,.03,'#becbdd');}
 }else if(r.intent==='statistic'||r.intent==='number'){
  const metrics=r.metrics.filter(m=>m.kind!=='year').slice(0,2);const first=metrics[0];
  if(subjects[0])asset(subjects[0],.25,.29,.5,.22,'spring');
  const y=subjects.length?.53:.34;
  if(metrics.length>=2&&/\b(from|to|before|after|compared|versus)\b/i.test(scene.text)){
   const values=metrics.map(m=>m.value);const start=metrics.at(-1).start;shape(.07,.37,.86,.32,'#ffffff08',{start});add('line',{x:.12,y:.4,width:.76,height:.26,points:values,labels:metrics.map(m=>`${m.value}${m.kind==='percentage'?'%':''}`),color:accent,start,enter:'fade'});text('BEFORE / AFTER',.13,.735,.74,.034,accent,start);text('Values stated in voiceover',.14,.79,.72,.02,'#b8c7d8',start);
  }else if(first?.kind==='percentage'){
   add('ring',{x:.24,y:subjects.length?.52:.34,width:.52,height:.23,value:first.value,color:accent,start:first.start,label:`${first.value}%`,enter:'fade'});
   text(first.label,.16,subjects.length?.765:.60,.68,.036,'white',first.start);text(first.source==='pokeapi'?'PokeAPI':'Stated in voiceover',.2,subjects.length?.807:.68,.6,.017,'#adbdca',first.start);
  }else if(first){
   shape(.08,y,.84,.205,'#ffffff0b',{start:first.start,stroke:'#ffffff18'});text(String(first.value),.12,y+.02,.72,.10,accent,first.start);text(first.kind==='base-stat'?`BASE ${first.label.toUpperCase()}`:first.label.toUpperCase(),.13,y+.133,.74,.027,'white',first.start);
   add('bar',{x:.12,y:y+.183,width:.75,height:.012,value:first.kind==='base-stat'?first.value/255*100:100,color:accent,start:first.start,enter:'fade'});text(first.verified?'PokeAPI verified':first.warning?'Narrated claim / check source':'Stated in voiceover',.1,y+.23,.8,.021,'#c0cad5',first.start);
  }
 }else if(r.intent==='comparison'){
  const entities=r.entities.slice(0,2);entities.forEach((e,i)=>{const x=.055+i*.475;shape(x,.33,.415,.35,'#ffffff08',{start:e.start,stroke:'#ffffff15',enter:i?'right':'left'});if(e.mediaId)asset(e,x+.025,.35,.365,.24,i?'right':'left');else text(e.name,x+.04,.435,.335,.043,secondary,e.start);text(e.name,x+.025,.622,.365,.027,'white',e.start);});
  text('VS',.445,.716,.11,.048,accent,Math.max(scene.start,entities[1]?.start||scene.start));
  const stats=['speed','attack','defense'];const explicit=stats.find(stat=>new RegExp(`\\b${stat}\\b`,'i').test(scene.text));if(explicit)subjects.slice(0,2).forEach((e,i)=>{const stat=e.media.pokemon?.stats.find(s=>s.name===explicit);if(!stat)return;text(`${explicit.toUpperCase()}  ${stat.value}`,.08+i*.475,.782,.37,.022,accent,e.start);add('bar',{x:.08+i*.475,y:.819,width:.37,height:.011,value:stat.value/255*100,color:accent,start:e.start});});
 }else if(r.intent==='timeline'){
  shape(.135,.34,.004,.39,accent);const points=r.metrics.filter(m=>m.kind==='year');points.slice(0,4).forEach((m,i)=>{add('ring',{x:.111,y:.36+i*.1,width:.05,height:.028,value:100,color:accent,start:m.start});text(String(m.value),.2,.35+i*.1,.6,.06,accent,m.start);});if(subjects[0])asset(subjects[0],.5,.35,.38,.37,'slide');
 }else{
  if(subjects.length){const hero=subjects[0];shape(.07,.31,.86,.435,'#ffffff08',{stroke:'#ffffff15'});asset(hero,.115,.335,.77,.385,r.intent==='reveal'?'spring':'left');if(subjects.length>1)asset(subjects[1],.67,.59,.24,.16,'right');
   if(hero.media.kind!=='pokemon')text(hero.media.attribution?.description?.match(/statue|cosplay|mascot/i)?'A real-world character appearance':hero.name,.09,.765,.82,.025,secondary);
  }else{
   // Authored topic graphic, explicitly no imitation of an unavailable character image.
   const mechanic=r.intent==='mechanic';shape(.08,.34,.84,.34,'#ffffff08',{stroke:'#ffffff15'});add('svg',{x:.2,y:.365,width:.6,height:.17,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><path d="M80 180L200 60L320 180L470 80" fill="none" stroke="${accent}" stroke-width="12"/><circle cx="200" cy="60" r="22" fill="${secondary}"/><circle cx="470" cy="80" r="25" fill="${accent}"/><path d="M70 240H530" stroke="${secondary}" opacity=".4" stroke-width="4"/></svg>`});text(mechanic?'HOW IT WORKS':r.entities[0]?.name||'THE KEY IDEA',.13,.555,.74,.052,accent);if(r.entities.some(e=>e.assetStatus==='missing'))text('Topic graphic / source visual unavailable',.13,.65,.74,.018,'#9fafc2');
  }
 }
 if(r.categories.includes('emphasis')&&r.intent!=='statistic'&&r.intent!=='ranking'){const keyword=scene.text.match(/\b(iconic|best|worst|underrated|overrated|incredible)\b/i)?.[0];if(keyword){shape(.07,.795,.3,.033,`${accent}22`);text(keyword.toUpperCase(),.092,.8,.26,.02,accent);}}
 if(credits.size)text([...credits.values()].join(' | '),.07,.94,.86,.013,'#c1cbd8');
 return {...scene,layers,template:r.template,kind:r.intent,title,captionAccent:accent,backgroundTheme:r.theme};
}
