import crypto from 'node:crypto';
import {planSceneBlueprint} from './scene-blueprint.mjs';
import {mergeRanges} from './layer-visibility.mjs';
import {contactPerformance} from './scene-action-motion.mjs';
import {sourceMechanicGeometry} from './mechanic-images-policy.mjs';
const normal=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const has=(text,name)=>(' '+normal(text)+' ').includes(' '+normal(name)+' ');
const timing=(p,name,start,end)=>p.scenes.flatMap(s=>s.words||[]).find(w=>w.start>=start-.05&&w.start<end&&has(w.captionText||w.text,name))?.start;
export function createBlueprintScenes({background,trainer,opponents,mechanicImage,coinImage,check=()=>{}}){
 return async function execute(project,progress=()=>{},keys={},state){
  const plan=planSceneBlueprint(project);if(!plan.scenes.length)return project;
  const p=structuredClone(project);for(const s of p.scenes){s.layers=(s.layers||[]).filter(l=>!l.blueprintVisual);delete s.transition;delete s.transitionDuration;}const group=p.visualInstructionReport?.applied.find(r=>r.kind==='group'),members=(group?.members||[]).map(m=>({...m,image:p.media.find(a=>a.id===m.mediaId),item:p.media.find(a=>a.id===m.itemId)})).filter(m=>m.image);
  const report={requested:plan.scenes.length,applied:[],missing:[...plan.unmatched],sources:[],soundBeats:[]},assets=new Map(p.media.map(m=>[m.id,m]));
  const addAsset=m=>{if(m){assets.set(m.id,m);report.sources.push({id:m.id,name:m.name,source:m.attribution?.source||m.pokemon?.sourceUrl});}return m;};
  progress({stage:'Executing your scene-by-scene storyboard'});
  const arena=addAsset(await background(p,keys,progress).catch(e=>{report.missing.push({kind:'background',reason:e.message});}));
  let enemies,anonymous,coin;
  const getEnemies=async()=>enemies??=await opponents(p,keys,progress).then(a=>a.map(addAsset));
  const render=(b,layers)=>{
   for(const s of p.scenes.filter(s=>s.start<b.end&&s.end>b.start)){
    const start=Math.max(b.start,s.start),end=Math.min(b.end,s.end);
    for(const l of s.layers||[])if(!l.blueprintVisual&&!l.manual&&(l.role!=='background'||l.mediaId)&&(!l.instructionLocked||l.role==='game-logo'||p.media.find(m=>m.id===l.mediaId)?.assetRole==='logo'))l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),{start,end}]);
    // Mandatory generated photo/group layers also yield to their specific
    // storyboard shot. Manual edits made by the user remain protected.
    const requiredIds=new Set((p.visualInstructionReport?.applied||[]).flatMap(r=>r.layerIds||[]));
    for(const l of s.layers||[])if(requiredIds.has(l.id)&&b.kind!=='pause-build')l.excludedRanges=mergeRanges([...(l.excludedRanges||[]),{start,end}]);
    for(const l of layers){const a=Math.max(l.start,start),z=Math.min(l.end,end);if(z>a){const id=l.id+'-'+s.id,fx=l.blueprintEffect;(s.layers||=[]).push({...l,id,...(fx?{blueprintEffect:{...fx,actorId:fx.actorId&&fx.actorId+'-'+s.id,allyId:fx.allyId&&fx.allyId+'-'+s.id,targetIds:fx.targetIds?.map(id=>id+'-'+s.id)}}:{}),...(l.attachment?{attachment:{...l.attachment,targetId:l.attachment.targetId+'-'+s.id}}:{}),start:a,end:z,animationStart:l.start,animationEnd:l.end});if(l.role==='subject'&&assets.get(l.mediaId)?.pokemon)s.layers.push({id:id+'-ground',type:'shape',role:'shadow',blueprintVisual:true,instructionLocked:true,start:a,end:z,x:0,y:0,width:.1,height:.018,z:l.z-1,color:'radial-gradient(ellipse,#070c17a0,transparent 72%)',stroke:'transparent',animation:'none',exit:'none',attachment:{targetId:id,anchor:'ground',x:.5,y:1,size:.7,contentBounds:true},cinematicDepthOverride:1});}}
    (s.layers||=[]).push({id:b.id+'-base-'+s.id,type:'shape',role:'background',blueprintVisual:true,instructionLocked:true,start,end,x:0,y:0,width:1,height:1,z:1,color:p.editingPreferences?.backgroundColor||'#101d2d',animation:'none',exit:'none'});
    if(arena)s.layers.push({id:b.id+'-arena-'+s.id,type:'image',role:'background',blueprintVisual:true,instructionLocked:true,mediaId:arena.id,start,end,x:arena.quietScenery?-.025:-.25,y:arena.quietScenery?-.025:-.06,width:arena.quietScenery?1.05:1.5,height:arena.quietScenery?1.05:2.4,z:2,fit:'cover',opacity:.22,blur:arena.quietScenery?undefined:14,animation:'background-motion',animationAmount:.035,exit:'none'});
   }
   report.applied.push({id:b.id,title:b.title,start:b.start,end:b.end,kind:b.kind,images:layers.filter(l=>l.mediaId).length});
  };
  const base=(b,type,role,v)=>({id:b.id+'-'+crypto.randomUUID(),type,role,blueprintVisual:true,instructionLocked:true,start:b.start,end:b.end,x:.06,y:.12,width:.88,height:.50,z:50,fit:'contain',animation:'none',exit:'none',cinematicDepthOverride:role==='subject'||role==='blueprint-effect'||role==='item'?1:0,...v});
  const effect=(b,kind,v={})=>base(b,'group','blueprint-effect',{x:0,y:0,width:1,height:1,z:70,blueprintEffect:{kind,at:b.start,end:b.end,seed:crypto.randomInt(100000),...v}});
  const actor=(b,m,x,y,w=.42,h=.32,extra={})=>base(b,'image','subject',{mediaId:m.id,x,y,width:w,height:h,z:45,animation:'spring-pop',entranceDuration:.16,easing:'smooth',shadow:true,...extra});
  const attached=(b,m,owner)=>base(b,'image','item',{mediaId:m.id,x:0,y:0,width:.1,height:.1,z:60,attachment:{targetId:owner.id,anchor:'near',x:.93,y:.65,size:.25,contentBounds:true,autoAnchor:false},animation:'scale-reveal',entranceDuration:.2});
  let rememberedCounter;
  for(const b of plan.scenes){
   check();progress({stage:'Composing '+b.title});const layers=[],body=b.body;
   try{
    const quoted=[...body.matchAll(/["“]([^"”\n]+)["”]/g)].map(m=>m[1]),counts=quoted.filter(v=>/^\s*[\d,]+\s+(?:PLAYERS|ENTRANTS|COMPETITORS)\s*$/i.test(v)).map(v=>Number(v.replace(/\D/g,'')));
    const cues=(p.shortMechanics?.cues||[]).filter(c=>has(body,c.title));
    const selected=members.filter(m=>has(body,m.image.pokemon?.speciesName||m.image.pokemon?.name||m.name));
    const personRequirement=p.visualInstructionReport?.applied.find(r=>r.kind==='image'&&/photo|verified|winner footage/i.test(body)&&has(body,r.name));
    if(/full build overlay|pause.*build|complete build overlay/i.test(b.title+' '+body)&&group&&/all six|six.*cards/i.test(body)){
     b.kind='pause-build';const end=Math.max(b.end,b.span.end),person=p.visualInstructionReport.applied.find(r=>r.kind==='image'),record=plan.scenes.map(scene=>scene.body.match(/["“](\d+\s*[–—-]\s*\d+)["”]/)?.[1]).find(Boolean),replica=p.editingInstructions.match(/replica code:\s*([A-Z0-9]+)/i)?.[1];
     for(const s of p.scenes)for(const l of s.layers||[])if(group.layerIds.includes(l.id)){l.start=Math.max(s.start,b.start);l.end=Math.min(s.end,end);l.excludedRanges=(l.excludedRanges||[]).filter(r=>r.end<=b.start||r.start>=end);if(l.role==='instruction-title'&&person){l.text=person.name.toUpperCase()+(record?' · '+record:'');l.y=.074;l.height=.035;l.fontSize=38;}}
     if(replica)for(const s of p.scenes.filter(s=>s.start<end&&s.end>b.start))s.layers.push(base(b,'text','instruction-source',{id:b.id+'-replica-'+s.id,start:Math.max(s.start,b.start),end:Math.min(s.end,end),x:.06,y:.79,width:.88,height:.03,z:125,text:'SP: published replica · '+replica,fontSize:23,color:'#c0d6e8'}));
     group.start=b.start;group.end=end;report.applied.push({id:b.id,title:b.title,start:b.start,end,kind:b.kind,images:members.length*2});continue;
    }
    if(counts.length){
     const recap=rememberedCounter&&/montage|reappear|return.*tournament/i.test(body);b.kind=recap?'recap':'counter';
     // A requested montage needs actual pictures from its first frame. Show
     // published game imagery as game imagery, never as unverified event footage.
     if(/montage|battle visual|gameplay/i.test(body)&&arena){const original=addAsset(arena.quietScenery?await background(p,keys,progress,true):arena);layers.push(base(b,'image','blueprint-game-shot',{mediaId:original.id,x:-.12,y:.09,width:1.24,height:.51,z:25,fit:'cover',keyframes:[{time:b.start,x:-.12,scale:1},{time:b.start+(b.end-b.start)*.48,x:-.04,scale:1.08},{time:b.end,x:-.12,scale:1.025}]}));}
     if(recap)for(const [i,m] of members.entries()){const at=b.start+Math.floor(i/2)*(b.end-b.start)/3,end=Math.min(b.end,at+(b.end-b.start)/3);const a=actor(b,m.image,.075+i%2*.47,.19,.38,.34,{start:at,end});layers.push(a);if(m.item)layers.push({...attached(b,m.item,a),start:at,end});report.soundBeats.push({start:at,cue:'pop',priority:12,reason:'Narrated team recap'});}
     rememberedCounter=counts;layers.push(effect(b,'counter',{values:counts,top:layers.some(l=>l.mediaId)?.54:.34,label:quoted.find(v=>/^\s*[\d,]+\s+(?:PLAYERS|ENTRANTS|COMPETITORS)\s*$/i.test(v))?.replace(/[\d,]+/,'').trim()||'PLAYERS'}));for(let i=0;i<counts.length;i++)report.soundBeats.push({start:b.start+(b.end-b.start)*i/counts.length,cue:i===counts.length-1?'impact':'click',priority:15,reason:'Requested counter step'});
    }
    else if(personRequirement){
     b.kind='person-record';const media=p.media.find(m=>p.scenes.some(s=>s.layers?.some(l=>personRequirement.layerIds.includes(l.id)&&l.mediaId===m.id)));if(!media)throw Error('The requested original person photo is missing');
     layers.push(actor(b,media,.07,.06,.86,.46,{animation:'scale-reveal',fit:'cover'}));
     const record=quoted.find(v=>/^\d+\s*[–—-]\s*\d+$/.test(v));if(record){const numbers=record.match(/\d+/g),words=p.scenes.flatMap(s=>s.words||[]).filter(w=>w.start>=b.start&&w.start<b.end),spoken=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];const revealAt=numbers.map(n=>words.find(w=>normal(w.text)===n||normal(w.text)===spoken[Number(n)])?.start??b.start);layers.push(effect(b,'record',{record,name:personRequirement.name,revealAt}));report.soundBeats.push({start:revealAt[1]??revealAt[0],cue:'impact',priority:15,reason:'Requested record reveal'});}
    }
    else if(/silhouette/i.test(body)&&/player|trainer/i.test(body)){
     b.kind='anonymous-player';anonymous??=addAsset(await trainer());layers.push(base(b,'shape','blueprint-spotlight',{x:.18,y:.11,width:.64,height:.44,z:35,color:'radial-gradient(ellipse,#c7e2ff85,transparent 72%)'}),actor(b,anonymous,.15,.11,.7,.43,{silhouette:true}),effect(b,'record',{record:quoted.find(v=>/^\d+\s+LOSSES$/i.test(v))||'',name:quoted.find(v=>/^UNDEFEATED$/i.test(v))||''}));report.soundBeats.push({start:b.start,cue:'pop',priority:12,reason:'Anonymous player reveal'});
    }
    else if(cues.length&&(/animate|animation|uses|use|redirect|demonstrat|attack/i.test(body))){
     const cue=cues.find(c=>c.start>=b.start-.2&&c.start<b.end)||cues[0];b.kind='mechanic';
     const source=addAsset(await mechanicImage(cue,p,keys,progress,state)),cardBox=source?sourceMechanicGeometry(source,cue.kind,p):null;if(cardBox)cardBox.height=Math.min(.20,cardBox.height);if(source)layers.push(base(b,'image','mechanic-card',{mediaId:source.id,...cardBox,z:90,sourceMoveCard:true,start:Math.max(b.start,cue.start)}));
     const kind=cue.name==='fake-out'?'contact':cue.name==='rage-powder'?'redirect':cue.name==='tailwind'?'wind':cue.name==='nasty-plot'?'setup':cue.name==='make-it-rain'?'coins':cue.damageClass==='physical'?'contact':cue.damageClass==='status'?'setup':'beam';
     const active=selected.length?selected:members.filter(m=>p.pokemonMentions?.some(e=>e.mediaId===m.image.id&&e.start<=b.start));if(!active.length)throw Error('No supplied actor for the requested mechanic');
     const foe=await getEnemies();if(kind==='contact'){
      const first=active.map(m=>timing(p,m.image.pokemon?.speciesName||m.image.pokemon?.name,b.start,b.end)??b.start).sort((a,z)=>a-z)[0];for(const [i,m] of active.entries())if(first>b.start+.15)layers.push(actor(b,m.image,.055+i*.31,.29,.28,.30,{end:first}));
      const ordered=active.map(m=>({...m,at:timing(p,m.image.pokemon?.speciesName||m.image.pokemon?.name,b.start,b.end)??b.start})).sort((a,z)=>a.at-z.at);
      for(let i=0;i<ordered.length;i++){const m=ordered[i],at=Math.max(b.start,m.at),end=Math.min(b.end,ordered[i+1]?.at??b.end);if(end-at<.25)continue;const t=end-at;
       const ab={x:.015,y:.31,width:.54,height:.37},tb={x:.55,y:.33,width:.41,height:.345},motion=contactPerformance(at,end,ab,tb,i%3),attacker=actor(b,m.image,ab.x,ab.y,ab.width,ab.height,{start:at,end,keyframes:motion.attacker}),target=actor(b,foe[i%foe.length],tb.x,tb.y,tb.width,tb.height,{start:at,end,keyframes:motion.target});
       layers.push(attacker,target,effect({...b,start:at,end},'contact',{actorId:attacker.id,targetIds:[target.id]}));if(m.item){const item=attached(b,m.item,attacker);item.attachment.x=.14;layers.push({...item,start:at,end});}
       const labelY=Math.max(.222,(cardBox?.y??.05)+(cardBox?.height??.15)+.013),label=quoted.find(v=>new RegExp('#'+(i+1)+'\\b').test(v));if(label)layers.push(base(b,'text','instruction-callout',{start:at,end,text:label,x:.055,y:labelY,width:.47,height:.03,fontSize:37,color:'#ffffff',z:95}));
       const joke=i===ordered.length-1&&quoted.find(v=>/ANOTHER ONE/i.test(v));if(joke)layers.push(base(b,'text','comic-aside',{start:at,end:Math.min(end,at+.7),text:joke,x:.55,y:labelY,width:.40,height:.03,fontSize:31,color:'#ffe394',z:95,animation:'scale-reveal',entranceDuration:.14}));
       report.soundBeats.push({start:at+t*.23,cue:'whoosh',priority:12,reason:'Attack acceleration'},{start:motion.hit,cue:'impact',priority:16,reason:'Separate illustrative opening strike'});
      }
     }else{
      const lead=kind==='setup'||kind==='coins'?active.find(m=>p.pokemonMentions?.some(e=>e.mediaId===m.image.id&&e.start>=b.start-1&&e.start<b.end))||active.find(m=>has(b.voice,m.image.pokemon?.speciesName||m.image.pokemon?.name))||active.at(-1):active.find(m=>has(b.voice,m.image.pokemon?.speciesName||m.image.pokemon?.name))||active[0];
      const ally=active.find(m=>m!==lead)||members.find(m=>m!==lead&&/protect.*partner|next to|ally|side/i.test(body));
      const at=Math.max(b.start,cue.start),t=b.end-at,hero=actor(b,lead.image,kind==='setup'?.12:kind==='coins'?.25:.025,kind==='setup'?.285:kind==='coins'?.435:.39,kind==='setup'?.76:kind==='coins'?.56:.47,kind==='setup'?.415:kind==='coins'?.29:.32,{float:kind==='wind',effectColor:kind==='coins'?'#ffe27c':'#b596ff',keyframes:[{time:b.start,scale:1},{time:at,scale:1,glow:0},{time:at+t*.20,scale:.94,scaleX:1.035,scaleY:.965,glow:.15},{time:at+t*.36,scale:1.09,scaleX:.98,scaleY:1.025,glow:.75},{time:at+t*.60,scale:1.02,scaleX:1,scaleY:1,glow:.2},{time:b.end,scale:1,glow:0}]});layers.push(hero);if(lead.item)layers.push({...attached(b,lead.item,hero),start:kind==='coins'?timing(p,lead.item.name.split(' ')[0],b.start,b.end)??b.start:b.start});
      let partner;const targets=[];if(ally&&['redirect','wind'].includes(kind)){partner=actor(b,ally.image,.51,.39,.465,.32);layers.push(partner);}
      if(['redirect','coins','beam'].includes(kind))for(let i=0;i<(kind==='coins'?2:1);i++){const x=kind==='coins'?.02+i*.51:.28,y=.235,width=kind==='coins'?.46:.44,height=.25,target=actor(b,foe[i%foe.length],x,y,width,height,{opacity:1,keyframes:[{time:b.start,y,rotation:0},{time:at+t*.66,y,rotation:0},{time:at+t*.74,y:y+.012,rotation:i?-9:9,scaleX:.96,scaleY:1.025},{time:b.end,y,rotation:0,scaleX:1,scaleY:1}]});targets.push(target);layers.push(target);}
      if(kind==='coins')coin??=addAsset(await coinImage());layers.push(effect(b,kind,{actorId:hero.id,allyId:partner?.id,targetIds:targets.map(l=>l.id),imageMediaId:coin?.id,theme:kind==='coins'?'steel':kind==='wind'?'water':kind==='setup'?'psychic':cue.type,color:cue.type==='fire'?'#ff8849':cue.type==='electric'?'#fff07b':'#a5ddff'}));
      layers.at(-1).blueprintEffect.activatesAt=Math.max(b.start,cue.start);report.soundBeats.push({start:Math.max(b.start,cue.start),cue:kind==='setup'?'stat-boost':kind==='coins'?'coin':'whoosh',priority:15,reason:'Requested '+cue.title+' demonstration'});if(kind==='coins')report.soundBeats.push({start:at+t*.38,cue:'coin',priority:13,reason:'Continuing coin impacts across both targets'});if(['redirect','coins','beam'].includes(kind))report.soundBeats.push({start:Math.min(b.end-.12,Math.max(b.start,cue.start)+(b.end-Math.max(b.start,cue.start))*.65),cue:'impact',priority:16,reason:'Illustrated attack contact without invented damage or knockout'});
     }
    }
    else if(members.length&&/six|roster|team/i.test(body)){
     b.kind='roster';for(const [i,m] of members.entries()){const at=b.start+(Math.min(1.1,(b.end-b.start)*.35)*i/members.length),x=.095+i%2*.455,y=.095+Math.floor(i/2)*.21,a=actor(b,m.image,x,y,.36,.19,{start:at});if(/reveal/i.test(b.title)&&group){a.keyframes=[{time:at,x,y,width:.36,height:.19},{time:Math.max(at+.05,b.end-.26),x,y,width:.36,height:.19},{time:b.end,x:.067+i%2*.465,y:.177+Math.floor(i/2)*.215,width:.125,height:.105}];}layers.push(a);if(m.item)layers.push(attached(b,m.item,a));report.soundBeats.push({start:at,cue:'pop',priority:12,reason:'Organized team and held-item reveal'});}
    }
    else if(rememberedCounter&&/reappear|return.*tournament|montage/i.test(body)){b.kind='recap';for(const [i,m] of members.entries())layers.push(actor(b,m.image,.045+i%3*.315,.14+Math.floor(i/3)*.25,.28,.23));layers.push(effect(b,'counter',{values:[rememberedCounter.at(-1)],label:'PLAYERS'}));}
    else throw Error('This scene needs an executable asset or mechanic; it was not replaced by a drifting logo');
    render(b,layers);
   }catch(e){check();report.missing.push({id:b.id,title:b.title,reason:e.message});}
  }
  // Time the complete supplied sheet to its pause passage, including the gap.
  for(const s of p.scenes){s.layers=(s.layers||[]).filter(l=>l.end>l.start);if(s.captionStyleRanges)s.captionStyleRanges=s.captionStyleRanges.filter(r=>!group||r.style?.enabled!==false||r.end<group.start||r.start>group.end).concat(group?[{start:Math.max(s.start,group.start),end:Math.min(s.end,group.end),style:{enabled:false}}].filter(r=>r.end>r.start):[]);}
  p.media=[...assets.values()];p.sceneBlueprintReport=report;return p;
 };
}
