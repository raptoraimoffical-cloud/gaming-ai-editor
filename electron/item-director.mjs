import {activeHeldPicture} from './story-props.mjs';
// Item names come from the actual item catalogue and explicitly tagged user assets.
// Placement is tied to spoken words, never an unrelated periodic keyword pulse.
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function itemCues(scene,catalog,media,request=''){
 const names=new Map(catalog.map(i=>[norm(i.name),{name:i.name}]));
 for(const m of media.filter(m=>m.kind==='image'&&(m.assetRole==='item'||/\b(?:item\s*:|hat|helmet|accessory|held item)\b/i.test(m.tags+' '+m.name)))){
  names.set(norm((m.name||'').replace(/\.[^.]+$/,'')),{name:m.name,mediaId:m.id});
  if(/\bhat\b/i.test(m.tags+' '+m.name)&&!names.has('hat'))names.set('hat',{name:m.name,mediaId:m.id});
  for(const match of (m.tags||'').matchAll(/\bitem\s*:\s*([^,;]+)/gi))names.set(norm(match[1]),{name:match[1].trim(),mediaId:m.id});
 }
 const words=scene.words||[],tokens=words.map(w=>norm(w.text));const result=[];
 const ordered=[...names].sort((a,b)=>b[0].length-a[0].length);
 for(let i=0;i<tokens.length;i++)for(const [label,item] of ordered){const n=label.split(' ').length;if(tokens.slice(i,i+n).join(' ')!==label)continue;
  const before=words.slice(Math.max(0,i-14),i).map(w=>w.text).join(' ').split(/[.!?;]/).at(-1),after=words.slice(i+n,i+n+8).map(w=>w.text).join(' ').split(/[.!?;]/)[0];
  result.push({...item,start:words[i].start,end:words[i+n-1].end,before,after});i+=n-1;break;
 }
 // Other games can name an item explicitly; movements without an article are
 // deliberately not treated as items ("uses Thunderbolt" is an attack).
 const text=words.map(w=>w.text).join(' ');
 for(const match of text.matchAll(/\b(?:holds?|holding|wears?|wearing|equips?|uses?\s+the)\s+(?:(?:a|an|the|his|her|its)\s+)?([^,.!?;]+?)(?=\s+(?:and|but|while|because|against|to|which|that|is|can|on|for|with)\b|[,!.?;]|$)/gi)){
  const label=norm(match[1]);if(!label||names.has(label)||label.split(' ').length>5||/^(it|this|that|them)$/.test(label)||result.some(c=>norm(c.name)===label))continue;
  const preceding=text.slice(0,match.index),index=preceding.trim()?preceding.trim().split(/\s+/).length:0,verbWords=match[0].split(/\s+/).length,indexEnd=Math.min(words.length-1,index+verbWords-1),itemIndex=Math.max(index,indexEnd-label.split(' ').length+1);
  result.push({name:label,start:words[itemIndex]?.start??scene.start,end:words[indexEnd]?.end??scene.start,before:words.slice(Math.max(0,index-12),itemIndex).map(w=>w.text).join(' '),after:words.slice(indexEnd+1,indexEnd+8).map(w=>w.text).join(' '),generic:true});
 }
 // Carry a recent named item into a subsequent "Pikachu uses it" instruction.
 for(let i=0;i<words.length-1;i++)if(/^(uses?|using|holds?|holding|wears?|wearing|equips?)$/.test(tokens[i])&&/^(it|this|that)$/.test(tokens[i+1])){
  const previous=result.filter(c=>c.start<words[i].start&&words[i].start-c.start<8).sort((a,b)=>b.start-a.start)[0];if(!previous)continue;
  result.push({...previous,start:words[i+1].start,end:words[i+1].end,before:words.slice(Math.max(0,i-12),i+1).map(w=>w.text).join(' ').split(/[.!?;]/).at(-1),after:words.slice(i+2,i+8).map(w=>w.text).join(' ').split(/[.!?;]/)[0]});
 }
 result.sort((a,b)=>a.start-b.start);
 // Direct commands can attach an available item even when it is not in the script.
 if(request&&!/when i|if i|say i|whenever/i.test(request))for(const [label,item] of ordered){if(!new RegExp('\\b'+escape(label)+'\\b','i').test(norm(request)))continue;if(result.some(c=>c.name===item.name||item.mediaId&&c.mediaId===item.mediaId))continue;result.push({...item,start:scene.start,end:scene.start,before:request,after:request,command:true});}
 return result;
}
function actorFor(scene,media,cue,setup=false){
 const context=cue.before+' '+cue.after,actors=(scene.layers||[]).filter(l=>l.mediaId&&!l.instructionLocked&&!l.attachment&&l.role!=='background'&&l.role!=='item'&&l.start<=cue.start&&l.end>cue.start&&!l.excludedRanges?.some(r=>cue.start>=r.start&&cue.start<r.end));
 const matches=actors.flatMap(l=>{const m=media.find(m=>m.id===l.mediaId);const aliases=[m?.pokemon?.displayName,m?.pokemon?.name,m?.identity?.subject,...(scene.reaction?.entities||[]).filter(e=>e.mediaId===l.mediaId).map(e=>e.name)].filter(Boolean);return aliases.flatMap(a=>{const name=norm(a),before=norm(cue.before),text=before.includes(name)?before:norm(cue.after),index=text.lastIndexOf(name);return index>=0&&new RegExp('\\b'+escape(name)+'\\b').test(text)?[{layer:l,index:index+(before.includes(name)?10000:0),length:name.length}]:[];});}).sort((a,b)=>b.index-a.index||b.length-a.length);
 if(!/\b(?:hold\w*|use[sd]?|using|wear\w*|equip\w*|give|given|put|head)\b/i.test(context)&&!(setup&&/\bwith\b/i.test(cue.before)))return;
 return matches[0]?.layer;
}
export async function directItems(project,{catalog=[],itemAsset,library=[],search,download,cutout,keys={},sceneIds,request='',time,progress=()=>{}}={}){
 const noMotion=/\b(?:no|without|avoid)\s+(?:all\s+)?(?:motion|animations?|movement)\b/i.test(project.editingInstructions||'');
 const next=structuredClone(project),pool=[...next.media,...library],wanted=new Set(sceneIds||next.scenes.map(s=>s.id)),googleItems=new Map();
 for(const scene of next.scenes.filter(s=>wanted.has(s.id))){
  if(next.shortStyle==='pokemon-setup')scene.layers=(scene.layers||[]).filter(l=>!l.autoItem);
  scene.itemDirection={placed:[],warnings:[],missing:[]};
  const pokemonContext=/pokemon|pokémon/i.test(scene.text)||(scene.layers||[]).some(l=>pool.some(m=>m.id===l.mediaId&&(m.pokemon||m.identity?.franchise==='pokemon')));
  const cues=itemCues(scene,pokemonContext?catalog:[],pool,request);
  for(const cue of cues){if(!cue.command&&(next.naturePlan||[]).some(n=>n.sceneId===scene.id&&norm(n.mint)===norm(cue.name)&&cue.start>=n.start-.05&&cue.start<n.end))continue;if(cue.command&&time!==undefined)cue.start=Math.max(scene.start,Math.min(scene.end-.03,time));let asset=pool.find(m=>m.id===cue.mediaId||m.kind==='image'&&norm(m.identity?.subject||(m.name||'').replace(/\.[^.]+$/,''))===norm(cue.name));
   if(!cue.mediaId&&keys['google-images']&&search&&download){
    const cached=pool.find(m=>m.provider==='google-images'&&m.decoded&&m.transparent&&norm(m.identity?.subject)===norm(cue.name));
    if(cached)asset=cached;
    else if(googleItems.has(cue.name))asset=googleItems.get(cue.name)||asset;
    else try{progress({stage:'Finding Google item image: '+cue.name});const query=(pokemonContext?'Pokemon ':'')+cue.name.replaceAll('-',' ')+' item transparent PNG -emoji -trading-card';
     const candidates=await search(query,'google-images',keys['google-images'],{exactQuery:true,type:'PNG',purpose:'prop'}),words=norm(cue.name).split(' ');let found;
     for(const c of candidates.filter(c=>c.webAssessment?.autoEligible&&words.every(w=>norm(c.name).split(' ').includes(w))&&!/trading card|cosplay|merch|shirt|emoji/i.test(c.name)).slice(0,4))try{let m=await download(c);if(!m.decoded||m.width<96||m.height<96)continue;if(!m.transparent){if(!cutout)continue;m=await cutout(m);}found={...m,assetRole:'item',identity:{...m.identity,franchise:pokemonContext?'pokemon':m.identity?.franchise,subject:cue.name,source:m.attribution?.source,confidence:.9}};pool.push(found);break;}catch{}
     googleItems.set(cue.name,found);if(found)asset=found;
    }catch(e){googleItems.set(cue.name,undefined);scene.itemDirection.warnings.push('Google item search: '+e.message);}
   }
   try{if(!asset){progress({stage:'Finding item image: '+cue.name});if(cue.generic)throw Error('No tagged local image');asset=await itemAsset(cue.name);pool.push(asset);}}
   catch(e){
    const review=[],log=[];
    for(const provider of [...(keys['google-images']?['google-images']:[]),'permitted','commons']){if(asset||!search||!download)break;const query=cue.name.replaceAll('-',' ')+' item transparent';try{const candidates=await search(query,provider,keys[provider]);const words=norm(cue.name).split(' ');const matching=candidates.filter(c=>!/(?:cosplay|figurine|statue|sculpture|costume)/i.test(c.name)&&words.every(w=>norm(c.name+' '+(c.attribution?.description||'')).split(' ').includes(w)));log.push({provider,query,results:candidates.length,rejected:candidates.length-matching.length});review.push(...matching.map(c=>({...c,origin:'online',searchQuery:query})));const exact=matching.find(c=>c.usageStatus!=='requires-user-rights'&&norm(c.identity?.subject)===norm(cue.name));if(exact)asset=await download(exact);}catch(e){log.push({provider,query,error:e.message});}}
    if(!asset){const reason=cue.name+': '+e.message+'; choose an item image or upload one.';scene.itemDirection.warnings.push(reason);scene.itemDirection.missing.push({name:cue.name,reason,candidates:review,searchLog:log});}
   }
   if(!asset){continue;}if(!cue.command&&activeHeldPicture(scene,asset,cue.start,Math.min(scene.end,cue.start+2.4),next)){scene.layers=scene.layers.filter(l=>!l.autoItem||l.mediaId!==asset.id||Math.abs(l.start-cue.start)>.1);continue;}if(!next.media.some(m=>m.id===asset.id))next.media.push(asset);
   const actor=actorFor(scene,next.media,cue,next.shortStyle==='pokemon-setup'),head=/\b(?:hat|helmet|head)\b/i.test(cue.name+' '+cue.before+' '+cue.after),start=Math.max(scene.start,actor?.start??scene.start,cue.start),end=Math.min(scene.end,actor?.end??scene.end,next.shortStyle==='pokemon-setup'&&actor?actor.end:Math.max(start+2.4,cue.end+2));if(end<=start)continue;
   if(actor){
    scene.layers=scene.layers.filter(l=>{if(l.role!=='item'||l.mediaId!==asset.id||l.attachment||l.end<=start)return true;if(l.start>=start)return false;l.end=start;return true;});
    // A deliberate held-item explanation owns the frame for its duration.
    const frames=new Map((actor.keyframes||[]).map(k=>[k.time,{...k}]));
    for(const [t,k] of frames)if(t>=start&&t<end&&k.opacity!==undefined)k.opacity=1;
    for(const t of [start,Math.max(start,end-.001)])frames.set(t,{...frames.get(t),time:t,opacity:1});
    actor.keyframes=[...frames.values()].sort((a,b)=>a.time-b.time);
    for(const l of scene.layers.filter(l=>l.id.includes('-sequence-')&&l.start<end&&l.end>start)){
     const frames=new Map((l.keyframes||[]).map(k=>[k.time,{...k}]));
     for(const [time,opacity] of [[l.start,l.start<start?1:0],[Math.max(l.start,start),0],[Math.min(l.end,end),1]])if(time<l.end)frames.set(time,{...frames.get(time),time,opacity});
     l.keyframes=[...frames.values()].sort((a,b)=>a.time-b.time);
    }
   }
   const id=scene.id+'-item-'+asset.id+'-'+Math.round(cue.start*1000);scene.layers=(scene.layers||[]).filter(l=>l.id!==id);
   const actorMedia=next.media.find(m=>m.id===actor?.mediaId),measuredPikachu=actorMedia?.pokemon?.name==='pikachu'&&actorMedia.pokemon.sourceKey?.startsWith('other.showdown.front');
   const neck=/\b(?:scarf|necklace|collar|amulet)\b/i.test(cue.name),part=head?'head':neck?'neck':'hand';
   const anchor=head?(measuredPikachu?{x:.32,y:.30}:{x:.5,y:.23}):neck?{x:.5,y:.42}:(measuredPikachu?{x:.4,y:.72}:{x:.66,y:.60});
   scene.layers.push({id,type:'image',role:'item',autoItem:!cue.command,mediaId:asset.id,x:.7,y:.3,width:.17,height:.17,z:Math.max(75,(actor?.z||0)+1),start,end,manual:true,fit:'contain',animation:'spring-pop',entranceDuration:.25,exit:'fade',...(actor?{attachment:{targetId:actor.id,anchor:part,...anchor,size:head?.36:neck?.18:.26,contentBounds:true,autoAnchor:!measuredPikachu},animation:'fade'}:{}),...(noMotion?{animation:'none',exit:'none'}:{})});
   scene.itemDirection.placed.push({name:asset.name,time:start,targetId:actor?.id,anchor:actor?part:'callout'});
  }
  if(scene.sequenceSourceLayers){const items=scene.layers.filter(l=>l.role==='item');scene.sequenceSourceLayers=[...scene.sequenceSourceLayers.filter(l=>l.role!=='item'),...structuredClone(items)];}
 }
 if(next.shortStyle==='pokemon-setup')carrySetupItems(next);
 return next;
}
function carrySetupItems(project){
 const held=new Map();
 for(const scene of project.scenes){
  const actors=(scene.layers||[]).filter(l=>l.role==='subject'&&l.mediaId).sort((a,b)=>a.start-b.start),items=(scene.layers||[]).filter(l=>l.role==='item'&&l.attachment);
  for(const actor of actors){
   const local=items.filter(l=>l.attachment.targetId===actor.id).sort((a,b)=>a.start-b.start),previous=held.get(actor.mediaId);
   if(previous&&actor.start<(local[0]?.start??actor.end))scene.layers.push({...previous,id:scene.id+'-held-'+actor.id,attachment:{...previous.attachment,targetId:actor.id},start:actor.start,end:local[0]?.start??actor.end,animation:'none',exit:'none'});
   if(local.length)held.set(actor.mediaId,{...local.at(-1)});
  }
 }
}
