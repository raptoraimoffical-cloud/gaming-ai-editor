import {narrationProp} from './narration-props.mjs';import {noMotion,projectGame} from './game-presentation.mjs';import {sceneGame} from './game-selection.mjs';
// Literal props compose with the existing cast instead of covering it with
// keyword icons. The phone holds the actual game logo; a clock accompanies time.
export function applyReferenceProps(project){
 const next=structuredClone(project),motion=!noMotion(project);
 for(const s of next.scenes){
  s.layers=(s.layers||[]).filter(l=>!l.referenceProp||l.manual||l.manualFraming);for(const l of s.layers)if(l.referencePropSourceRanges&&!l.manual&&!l.manualFraming){if(l.referencePropSourceRanges.length)l.excludedRanges=l.referencePropSourceRanges;else delete l.excludedRanges;delete l.referencePropSourceRanges;}if(s.manualTemplate||s.battlePlan)continue;
  for(const [i,w] of (s.words||[]).entries()){
   const token=w.text.toLowerCase().replace(/[^a-z]/g,''),kind=/^(mobile|phone|smartphone)$/.test(token)?'phone':/^(waiting|wait|timer|minutes|hours)$/.test(token)?'clock':null;
   if(!kind||s.words.slice(Math.max(0,i-2),i).some(w=>/^(not|no|never)$/i.test(w.text))||s.layers.some(l=>l.referenceProp&&l.end>w.start))continue;
   const media=narrationProp(next,kind),start=Math.max(s.start,w.start),end=Math.min(s.end,start+2.6);if(!media||end-start<.4||s.layers.some(l=>l.start<end&&l.end>start&&(['gameplay','chart','narrated-action','mechanic-card'].includes(l.role)||l.setupGraphic)))continue;
   const actor=s.layers.find(l=>l.role==='subject'&&l.start<=start&&l.end>start),small=!!actor,id=s.id+'-reference-prop-'+i;
   const box=kind==='phone'?{x:small?.73:.24,y:small?.12:.10,width:small?.22:.52,height:small?.27:.58}:{x:small?.75:.34,y:small?.11:.23,width:small?.20:.32,height:small?.12:.18};
   const busy=s.layers.some(l=>l!==actor&&!(kind==='phone'&&l.role==='game-logo'&&!l.manual&&!l.manualFraming)&&l.role!=='background'&&l.role!=='environment-depth'&&l.start<end&&l.end>start&&l.x<box.x+box.width&&l.x+l.width>box.x&&l.y<box.y+box.height&&l.y+l.height>box.y);if(busy)continue;
   s.layers.push({id,referenceProp:true,type:'image',role:'supporting-image',mediaId:media.id,...box,z:36,start,end,fit:'contain',animation:motion?'spring-pop':'none',entranceDuration:.18,exit:'none',...(motion?{keyframes:[{time:start,rotation:-3,scale:.94},{time:start+.35,rotation:2,scale:1},{time:end,rotation:0,scale:1.02}]}:{})});
   if(kind==='phone'){
    const game=sceneGame(next,s,projectGame(next)),logo=s.layers.filter(l=>l.role==='game-logo'&&l.start<=start&&l.end>start).map(l=>next.media.find(m=>m.id===l.mediaId)).find(Boolean)||next.media.find(m=>m.assetRole==='logo'&&m.identity?.franchise===game);
    if(logo){for(const l of s.layers.filter(l=>l.role==='game-logo'&&l.mediaId===logo.id&&l.start<end&&l.end>start&&!l.manual&&!l.manualFraming)){l.referencePropSourceRanges??=structuredClone(l.excludedRanges||[]);l.excludedRanges=[...(l.excludedRanges||[]),{start,end}];}s.layers.push({id:id+'-screen',referenceProp:true,type:'image',role:'game-logo',mediaId:logo.id,x:box.x+box.width*.15,y:box.y+box.height*.28,width:box.width*.7,height:box.height*.25,z:38,start,end,fit:'contain',animation:'none',exit:'none',attachment:{targetId:id,anchor:'body',x:.5,y:.45,size:.68}});}
   }
  }
 }return next;
}
