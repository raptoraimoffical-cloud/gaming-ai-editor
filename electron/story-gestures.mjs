// General physical vocabulary for a model-directed story. The model owns the
// scene, role, prop and narrated cue; the animator owns acceleration and poses.
export const STORY_GESTURES=['collect','reach','carry','react','celebrate','slump','look-back','float','recoil','leave'];
export function storySourceProps(rows,actors=[]){
 const props=[];
 for(const p of rows||[]){let query=String(p.query||'').replaceAll('_',' ');for(const actor of actors){const name=String(actor.name||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(name)query=query.replace(new RegExp('\\b'+name+'\\b','ig'),' ');}query=query.replace(/\b(?:with|wearing|holding|cartoon|character|pokemon)\b/gi,' ').replace(/\s+/g,' ').trim();if(query.length<3)continue;
  const anchor=/\b(?:m[ou]u?stache|sunglasses|glasses|eyepatch|mask)\b/i.test(query)?'face':/\b(?:scarf|collar|necklace|amulet)\b/i.test(query)?'neck':/\b(?:hat|helmet|crown)\b/i.test(query)?'head':p.anchor;
  const fallback={face:.18,neck:.20,head:.25,hand:.25,near:.25}[anchor]||.2,requested=typeof p.size==='number'?p.size:({small:fallback*.75,medium:fallback,large:fallback*1.25}[p.size]||fallback),size=requested<.08||requested>.4?fallback:Math.min(requested,anchor==='face'?.25:.4);
  if(!props.some(x=>x.query.toLowerCase()===query.toLowerCase()))props.push({...p,query,anchor,size});
 }
 return props;
}
export function storyGestureRecipe(raw){
 const r=structuredClone(raw),duration=Math.max(.6,Math.min(6,r.duration)),at=n=>+(n*duration).toFixed(4),frame=(t,v)=>({at:at(t),...v});
 const paths={
  collect:[frame(0,{dx:0}),frame(.18,{dx:-.018,rotation:-3}),frame(.45,{dy:.055,rotation:8,scale:.97}),frame(.72,{dx:.035,dy:-.015,rotation:-3}),frame(1,{dx:0,dy:0,rotation:0,scale:1})],
  reach:[frame(0,{dx:0}),frame(.18,{dx:-.018,rotation:-3}),frame(.62,{dx:.09,rotation:7,scale:1.025}),frame(1,{dx:0,rotation:0,scale:1})],
  carry:[frame(0,{dy:0}),frame(.25,{dx:.04,dy:-.012,rotation:-3}),frame(.55,{dx:.08,dy:.012,rotation:3}),frame(.80,{dx:.12,dy:-.012,rotation:-3}),frame(1,{dx:.15,dy:0,rotation:0})],
  react:[frame(0,{scale:1}),frame(.16,{dy:.012,scale:.96,rotation:-4}),frame(.44,{dy:-.025,scale:1.08,rotation:5}),frame(.70,{dy:0,scale:.99,rotation:-2}),frame(1,{dy:0,scale:1,rotation:0})],
  celebrate:[frame(0,{dy:0}),frame(.15,{dy:.018,scale:.95}),frame(.42,{dy:-.065,scale:1.06,rotation:-7}),frame(.72,{dy:0,rotation:3,scale:.97}),frame(1,{dy:0,scale:1,rotation:0})],
  slump:[frame(0,{dy:0,scale:1}),frame(.22,{rotation:-3}),frame(.55,{dy:.035,scale:.9,rotation:12}),frame(1,{dy:.035,scale:.9,rotation:12})],
  'look-back':[frame(0,{rotation:0}),frame(.15,{dx:.018,rotation:3}),frame(.48,{dx:-.025,rotation:-11}),frame(.72,{dx:-.025,rotation:-11}),frame(1,{dx:0,rotation:0})],
  float:[frame(0,{dy:0}),frame(.22,{dy:-.025,rotation:-3}),frame(.55,{dy:-.045,rotation:3}),frame(.82,{dy:-.015,rotation:-2}),frame(1,{dy:0,rotation:0})],
  recoil:[frame(0,{dx:0}),frame(.16,{dx:.018,rotation:2}),frame(.34,{dx:-.08,rotation:-12,scale:.96}),frame(.65,{dx:-.04,rotation:4}),frame(1,{dx:0,rotation:0,scale:1})]
 };
 if(!STORY_GESTURES.includes(r.gesture))throw Error('Unsupported physical story gesture');
 const leave=r.gesture==='leave';return {kind:leave?'depart':'perform',actorId:r.actorId,wordIndex:r.wordIndex,duration,reason:r.reason,propQuery:'',direction:r.direction||'right',endState:leave?'gone':r.endState==='hold'?'hold':'restore',...(!leave?{actorMotion:paths[r.gesture]}:{}),attachments:(r.props||[]).map(p=>({...p,owner:'actor',query:p.query?.replaceAll('_',' ')})),soundBeats:(r.soundBeats||[]).map(b=>({cue:b.cue,at:b.phase!==undefined?at({start:0,anticipation:.16,contact:.46,payoff:.82}[b.phase]??.46):b.at})).filter(b=>b.at>=0&&b.at<=duration)};
}
