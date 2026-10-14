import {environmentSvg} from './environments.mjs';
import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
import {storyboardFor} from './storyboard.mjs';
export const SCENE_FAMILIES=['full-frame-gameplay','full-frame-artwork','character-environment','character-comparison','two-character-interaction','evolution-sequence','split-gameplay','animated-ranking','statistic-visualization','gameplay-overlay','image-collage','editorial-headline'];
export function composeReaction(scene,project){
 const r={...scene.reaction},vertical=project.format!=='horizontal',style=project.referenceStyle||{},layers=[],credits=new Set();
 if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='comparison')r.intent='comparison';
 if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='ranking'){r.intent='ranking';r.rankings=r.entities.map((e,i)=>({entityId:e.id,label:e.name,rank:i+1,start:e.start,mediaId:e.mediaId}));}
 const foreground=r.entities.filter(e=>e.type!=='game'&&e.mediaId).map(e=>({...e,media:project.media.find(m=>m.id===e.mediaId)})).filter(e=>e.media);
 const franchises=new Set(r.entities.map(franchiseForEntity).filter(f=>f!=='unknown')),subjectFranchise=franchiseForEntity(foreground[0]||r.entities[0]||{});
 let theme=subjectFranchise==='minecraft'?'minecraft':subjectFranchise==='pokemon'?'battle':r.theme||'analysis';
 if(['statistic','number','timeline'].includes(r.intent))theme='analysis';if(r.intent==='ranking')theme='leaderboard';if(r.intent==='news')theme='news';
 const accent=theme==='minecraft'?'#ffe698':theme==='battle'?'#f7e7a1':theme==='leaderboard'?'#ffcf70':theme==='platformer'?'#fff0b4':'#7aeadb';
 const add=(type,props={})=>{const l={id:`${scene.id}-reaction-${layers.length}`,type,role:'graphic',x:.06,y:.08,width:.88,height:.06,z:layers.length,start:scene.start,end:scene.end,enter:'fade',exit:'fade',entranceDuration:style.entranceSeconds||.24,exitDuration:.16,easing:'easeInOut',...props};l.start=Math.max(scene.start,Math.min(l.end-.03,l.start));layers.push(l);return l;};
 const text=(value,x,y,w,h,color='white',start=scene.start,role='label')=>add('text',{text:String(value),x,y,width:w,height:h,color,start,role,enter:'slide'});
 const matchingBackgrounds=project.media.filter(m=>['image','video'].includes(m.kind)&&(m.license||m.provider==='google-images'&&m.decoded&&m.webAssessment?.accepted)&&m.assetReview?.accepted!==false&&!m.pokemon&&assetIdentity(m).variant!=='stylized diagram; not official game art'&&franchises.has(assetIdentity(m).franchise)&&/gameplay|screenshot|terrain|forest|cave|landscape|environment/i.test(m.name+' '+m.tags+' '+(m.attribution?.description||'')));
 const outdoor=subjectFranchise==='minecraft'&&foreground.some(e=>/chicken|pig|cow|sheep/.test(e.id));
 const selectedBackground=project.media.find(m=>m.id===scene.gameBackgroundId);
 const background=selectedBackground||matchingBackgrounds.filter(m=>!outdoor||!/deep dark|cave|nether/i.test(m.name+' '+m.tags)).sort((a,b)=>(a.kind==='video'?0:1)-(b.kind==='video'?0:1))[0];
 const orderedEvolution=r.relationship?.verified&&foreground.find(e=>e.id===r.relationship.from)?.start<foreground.find(e=>e.id===r.relationship.to)?.start;
 let family=orderedEvolution?'evolution-sequence':r.intent==='ranking'?'animated-ranking':['statistic','number','timeline'].includes(r.intent)?background?.kind==='video'?'gameplay-overlay':'statistic-visualization':r.intent==='comparison'||r.relationship?.verified?foreground.length===0&&r.entities.filter(e=>e.mediaId).length===2?'split-gameplay':'character-comparison':r.intent==='news'?'editorial-headline':foreground.length>2?'image-collage':foreground.length===2?'two-character-interaction':foreground.length?'character-environment':background?.kind==='video'?'full-frame-gameplay':background?'full-frame-artwork':'editorial-headline';
 if(family==='character-environment'&&foreground.length===1&&foreground[0].type!=='person'&&foreground[0].media.kind==='image'&&foreground[0].media.transparent!==true&&!foreground[0].media.identity?.variant?.includes('diagram')&&assetIdentity(foreground[0].media).source!=='original programmatic illustration')family='full-frame-artwork';
 if(scene.pokemonMode==='manual'&&scene.pokemonLayout==='team')family='image-collage';
 let backgroundConcept=background&&['full-frame-gameplay','full-frame-artwork','gameplay-overlay'].includes(family)?`Full-canvas ${background.name}`:`Original ${theme} environment; not a game screenshot`;
 const bg=add('svg',{role:'background',animation:'background-motion',animationAmount:.055,svg:environmentSvg(theme),x:0,y:0,width:1,height:1,enter:'none',exit:undefined,keyframes:[{time:scene.start,scale:1.04,x:0},{time:scene.end,scale:1.08,x:-(style.backgroundTravel||.025)/2}],focalPoint:{x:.5,y:.5}});
 const sourceBackdrop=(m,blur=0)=>{backgroundConcept=`Full-canvas ${m.name}${blur?' / depth blur':''}`;bg.type=m.kind==='video'?'video':'image';bg.mediaId=m.id;delete bg.svg;bg.fit='cover';bg.blur=blur;bg.focalPoint=m.focalPoint||{x:.5,y:.5};if(m.attribution)credits.add(m.attribution.credit);};
 if(background&&['full-frame-gameplay','full-frame-artwork','gameplay-overlay','split-gameplay'].includes(family))sourceBackdrop(background);
 if(background&&['character-environment','two-character-interaction','character-comparison','evolution-sequence','animated-ranking','image-collage','editorial-headline'].includes(family))sourceBackdrop(background,1);
 const subject=(e,x,y,w,h,enter='spring',extra={})=>{if(!e?.media)return;const l=add(e.media.kind==='video'?'video':'image',{role:'subject',animation:r.intent==='ranking'?'ranking-reveal':r.intent==='comparison'?'comparison-reveal':'spring-pop',animationAmount:.10,manual:e.assetStatus==='manual'||scene.pokemonMode==='manual',mediaId:e.mediaId,x,y,width:w,height:h,fit:'contain',start:e.start,end:e.visualEnd||scene.end,enter,shadow:false,focalPoint:e.media.focalPoint||{x:.5,y:.5},keyframes:[{time:Math.max(scene.start,e.start),scale:(style.subjectSize||.9)/.9,y},{time:Math.max(scene.start,e.start)+Math.max(.05,(scene.end-Math.max(scene.start,e.start))*.95),scale:1.035*(style.subjectSize||.9)/.9,y:y-.015}],...extra});if(e.media.attribution)credits.add(e.media.attribution.credit);return l;};
 let title=scene.titleOverride||r.entities.filter(e=>e.type!=='game')[0]?.name||r.entities[0]?.name||scene.title;
 if(family==='full-frame-artwork'&&foreground.length===1){sourceBackdrop(foreground[0].media);bg.keyframes=[{time:scene.start,scale:1.02},{time:scene.end,scale:1.1}];bg.start=scene.start;}
 if(family==='character-environment'){
  const e=foreground[0];subject(e,vertical?.045:.19,vertical?(e?.type==='person'?.08:.14):.045,vertical?.91:.62,vertical?(e?.type==='person'?.50:.66):.82,'spring',e?.type==='person'?{fit:'cover'}:{});
  if(e?.media.identity?.source==='original programmatic illustration')text('STYLIZED MOB ILLUSTRATION',.07,.91,.86,vertical?.012:.023,'#edf7e2',e.start,'disclosure');
 }else if(family==='two-character-interaction'||family==='character-comparison'){
  foreground.slice(0,2).forEach((e,i)=>subject(e,vertical?(family==='character-comparison'?.08:i?.39:.01):.025+i*.49,vertical?(family==='character-comparison'?.02+i*.41:.22+i*.15):.12,vertical?(family==='character-comparison'?.84:.62):.46,vertical?(family==='character-comparison'?.4:.48):.7,i?'right':'left'));
  if(family==='character-comparison'&&['first','second'].includes(r.focus)){const chosen=r.focus==='first'?0:1;for(const [i,e] of foreground.slice(0,2).entries()){const l=layers.find(l=>l.mediaId===e.mediaId&&l.role==='subject');if(l){const factor=i===chosen?1.08:.88;l.width*=factor;l.x+=(vertical?.84:.46)*(1-factor)/2;l.height*=factor;l.y+=(vertical?.4:.7)*(1-factor)/2;}}}
  if(r.relationship?.verified&&family==='character-comparison')text(`${r.entities.find(e=>e.id===r.relationship.from)?.name} \u2192 ${r.entities.find(e=>e.id===r.relationship.to)?.name}`,.08,.86,.84,.028,accent,Math.max(...foreground.map(e=>e.start)),'relationship');
  if(family==='character-comparison'&&!r.relationship?.verified)text('VS',vertical?.43:.46,vertical?.42:.45,.14,vertical?.055:.11,accent,Math.max(scene.start,foreground[1]?.start||scene.start));
 }else if(family==='evolution-sequence'){
  const relation=r.relationship,from=foreground.find(e=>e.id===relation.from),to=foreground.find(e=>e.id===relation.to),cue=Math.max(scene.start,relation.transitionTime),finish=Math.min(scene.end-.02,cue+.32),begin=Math.max(scene.start,cue-.12);
  subject(from,vertical?.04:.18,vertical?.12:.035,vertical?.92:.64,vertical?.7:.83,'spring',{start:Math.max(scene.start,from.start),end:finish,keyframes:[{time:begin,opacity:1,scale:1},{time:finish,opacity:0,scale:.78,rotation:-4}],exit:undefined});
  subject(to,vertical?.035:.16,vertical?.10:.015,vertical?.93:.68,vertical?.73:.85,'none',{animation:'none',start:cue,reveal:'iris',revealDuration:.32,keyframes:[{time:cue,opacity:0,scale:.78,rotation:4},{time:finish,opacity:1,scale:1,rotation:0}],exit:'fade'});
  add('shape',{role:'transition-flash',x:0,y:0,width:1,height:1,color:'#e6f7de',start:begin,end:Math.min(scene.end,finish+.1),enter:'none',exit:undefined,keyframes:[{time:begin,opacity:0},{time:cue,opacity:.65},{time:finish,opacity:0}]});
  text(`${from.name} → ${to.name}`,.08,vertical?.84:.86,.84,vertical?.023:.04,accent,Math.min(cue,scene.end-.1),'relationship');
 }else if(family==='split-gameplay'){
  const games=r.entities.filter(e=>e.mediaId).map(e=>({...e,media:project.media.find(m=>m.id===e.mediaId)}));games.slice(0,2).forEach((e,i)=>subject(e,vertical?0:i*.5,vertical?i*.47:0,vertical?1:.5,vertical?.46:1,i?'right':'left',{fit:'cover',role:'comparison-media',start:scene.start}));
 }else if(family==='animated-ranking'){
  title=scene.titleOverride||'THE RANKING';text(title,.07,.055,.86,vertical?.065:.11,accent,scene.start,'title');
  const rankings=[...(r.rankings?.length?r.rankings:r.entities.map(e=>({entityId:e.id,label:e.name,start:e.start})))].sort((a,b)=>(a.rank||99)-(b.rank||99));
  const n=Math.min(10,rankings.length),rowH=Math.min(.16,.7/Math.max(1,n));rankings.slice(0,n).forEach((rank,i)=>{const y=.17+i*rowH,start=Math.max(scene.start,rank.start);const e=foreground.find(e=>e.id===rank.entityId)||r.entities.filter(e=>e.mediaId).map(e=>({...e,media:project.media.find(m=>m.id===e.mediaId)})).find(e=>e.id===rank.entityId);text(rank.rank?`#${rank.rank}`:'•',.055,y,.2,rowH*.64,accent,start,'rank');if(e)subject(e,.25,y-.025,.3,rowH,'spring');text(rank.label,e?.media?.kind==='pokemon'?.58:.30,y+.02,e?.media?.kind==='pokemon'?.36:.64,rowH*.24,'white',start);});
 }else if(family==='statistic-visualization'||family==='gameplay-overlay'){
  const metrics=r.metrics.filter(m=>r.intent==='timeline'?m.kind==='year':m.kind!=='year').slice(0,2),m=metrics[0];title=scene.titleOverride||m?.label||'The numbers';text(title,.065,.065,.87,vertical?.042:.065,accent,scene.start,'title');
  if(foreground[0])subject(foreground[0],vertical?.04:.04,vertical?.14:.12,vertical?.50:.45,vertical?.32:.67,'left');
  const y=vertical?(foreground.length?.49:.28):.2;
  if(metrics.length>1&&/\b(from|to|before|after|compared|versus)\b/i.test(scene.text))add('line',{role:'chart',x:.08,y:.34,width:.84,height:.4,points:metrics.map(m=>m.value),labels:metrics.map(m=>`${m.value}${m.kind==='percentage'?'%':''}`),color:accent,start:metrics.at(-1).start});
  else if(m?.kind==='percentage')add('ring',{role:'chart',x:vertical?.12:.52,y:vertical?(foreground.length?.43:.25):.20,width:vertical?.76:.38,height:vertical?.34:.65,value:m.value,color:accent,label:`${m.value}%`,start:m.start});
  else if(m){text(m.value,vertical?.08:.52,y,vertical?.84:.40,vertical?.15:.24,accent,m.start,'stat-value');text(m.kind==='base-stat'?`BASE ${m.label.toUpperCase()}`:m.label.toUpperCase(),vertical?.09:.53,y+.18,vertical?.82:.39,vertical?.029:.045,'white',m.start,'stat-label');add('bar',{role:'chart',x:vertical?.08:.52,y:y+.245,width:vertical?.84:.40,height:vertical?.025:.036,value:m.kind==='base-stat'?m.value/255*100:100,color:accent,start:m.start});}
  if(m?.verified)text('BASE STAT / POKÉAPI VERIFIED',.08,vertical?.81:.9,.84,vertical?.014:.022,'#bddce0',m.start,'verification');
 }else if(family==='image-collage'){
  const team=scene.pokemonMode==='manual'&&scene.pokemonLayout==='team',n=Math.min(team?6:4,foreground.length),cols=team?3:2;
  foreground.slice(0,n).forEach((e,i)=>subject(e,.02+(i%cols)*(.96/cols),.06+Math.floor(i/cols)*(team?.36:.40),.94/cols,team?.34:.39,i%2?'right':'left'));
 }else if(family==='editorial-headline'){
  if(background)sourceBackdrop(background,6);
  if(foreground[0])subject(foreground[0],vertical?.04:.48,vertical?.34:.14,vertical?.92:.48,vertical?.44:.76,'right');
  title=scene.titleOverride||(r.intent==='news'?scene.title:title);text(title,.055,foreground.length?(vertical?.08:.30):(vertical?.29:.30),foreground.length&&!vertical?.42:.89,vertical?.11:.16,'white',scene.start,'title');
 }
 if(scene.titleOverride&&!layers.some(l=>l.role==='title'))text(scene.titleOverride,.055,.06,.89,vertical?.047:.075,'white',scene.start,'title');
 if(credits.size)text([...credits].join(' | '),.04,.965,.92,vertical?.010:.018,'#e0e8eb',scene.start,'credit');
 const next={...scene,layers,compositionFamily:family,template:family,kind:r.intent,title,captionAccent:accent,backgroundTheme:theme,backgroundConcept,captionStyle:{fontSize:style.captionFontSize||40,wordsPerGroup:style.captionWords||3,minimal:true,position:'bottom',bottom:vertical?.075:.05,...scene.captionStyle}};
 next.storyboard=storyboardFor(next,project);return next;
}
