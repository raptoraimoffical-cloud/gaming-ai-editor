import {imageSearchIntent} from './web-image-queries.mjs';
import {resolveSubject,assetQueries,rankCandidates} from './asset-relevance.mjs';
import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
import {reviseProject,applyOperations,recordRevision,scenesFor,requestClauses,interpretLocal} from './revisions.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {normalize} from './reactions.mjs';
import {validateProject} from './planner.mjs';
import {quickPatch} from './quick-patch.mjs';
import {namedImageMatch,sourceMatchedImage} from './named-images.mjs';
function placeRequestedAsset(project,scene,layer,request){
 const text=request.toLowerCase(),media=project.media.find(m=>m.id===layer.mediaId),wide=(media?.width||1)/(media?.height||1)>2;
 layer.width=wide?.78:.32;layer.height=wide?.17:.24;layer.fit='contain';
 const target=(scene.layers||[]).find(l=>l.id!==layer.id&&l.role==='subject'&&project.media.some(m=>m.id===l.mediaId&&[m.name,m.pokemon?.displayName].some(n=>n&&text.includes(n.toLowerCase()))));
 if(target&&(/\b(?:attach|wear|wearing|hold|holding|give|head|neck|hand|feet)\b/.test(text)||/\b(?:hat|helmet|scarf|collar|shoes)\b/.test(text))){const anchor=/scarf|collar|neck/.test(text)?'neck':/shoes|feet/.test(text)?'feet':/hat|helmet|head/.test(text)?'head':'hand';layer.role='item';layer.attachment={targetId:target.id,anchor,x:.5,y:anchor==='head'?.2:anchor==='neck'?.4:anchor==='feet'?.9:.6,size:.22,contentBounds:true,autoAnchor:true};layer.z=target.z+3;return;}
 const gap=.025,positions=[{x:(1-layer.width)/2,y:.055},{x:.04,y:.34},{x:.96-layer.width,y:.34},{x:(1-layer.width)/2,y:.58}];
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
 const obstacles=(scene.layers||[]).filter(l=>l.id!==layer.id&&l.mediaId&&l.role!=='background'&&l.start<layer.end&&l.end>layer.start);
 let pos=positions.sort((a,b)=>obstacles.reduce((n,l)=>n+overlap({...a,...{width:layer.width,height:layer.height}},l),0)-obstacles.reduce((n,l)=>n+overlap({...b,...{width:layer.width,height:layer.height}},l),0))[0];
 if(target&&/above|below|beside|next to/.test(text))pos=/above/.test(text)?{x:target.x+(target.width-layer.width)/2,y:target.y-layer.height-gap}:/below/.test(text)?{x:target.x+(target.width-layer.width)/2,y:target.y+target.height+gap}:{x:target.x+target.width+gap,y:target.y+(target.height-layer.height)/2};
 else {if(/(?:on|to|in) (?:the )?left/.test(text))pos.x=.04;if(/(?:on|to|in) (?:the )?right/.test(text))pos.x=.96-layer.width;if(/(?:at|on|in) (?:the )?top/.test(text))pos.y=.04;if(/(?:at|on|in) (?:the )?bottom/.test(text))pos.y=.72-layer.height;}
 layer.x=Math.max(.025,Math.min(.975-layer.width,pos.x));layer.y=Math.max(.025,Math.min(.74-layer.height,pos.y));layer.manualFraming=true;
}
export function assetRequest(request){
 request=requestClauses(request).find(c=>/\b(?:add|replace)\b/i.test(c))||request;
 const add=/\b(?:add|insert|put|show)\s+(.+?)(?=\s+(?:to|in|with|using|at|above|below|beside|next to|on the|to the)\b|[.!]|$)/i.exec(request);
 const replace=/\breplace\b.*?\bwith\s+(.+?)(?=\s+(?:with|using|and|in|to|at)\b|[.!]|$)/i.exec(request);
 const find=/\b(?:find|search(?: Google)?(?: for)?|use)\s+(.+?)(?=\s+(?:at|with|using)\b|[.!]|$)/i.exec(request);
 const directReplace=/\breplace\s+(?:that |the |this )?(?:picture|image|background)\s+with\s+(.+)/i.exec(request);
 const background=/\b(?:change|replace|set)\b.*?\bbackground\s+(?:to|with)\s+(.+?)(?=\s+(?:at|from|for)\s+\d|[.!]|$)/i.exec(request);
 const name=(background?.[1]||add?.[1]||replace?.[1]||directReplace?.[1]||find?.[1])?.trim().replace(/^(?:(?:a|an|the|some)\s+)?(?:images?|pictures?|photos?|gifs?)\s+(?:of\s+)?/i,'').replace(/^(?:a|an|the)\s+/i,'');if(!name||/^(?:(?:a|an|more|some|new|better|smooth|smoother|custom)\s+)*(?:slide|spring|fade|zoom|animations?|effects?|transitions?|motion|captions?|subtitles?|text|labels?|graphs?|charts?|music|sounds?|sfx)\b/i.test(name))return null;
 const from=request.match(/\bfrom\s+(?:the\s+)?(left|right|top|bottom|up|down)\b/i)?.[1]?.toLowerCase();
 return {name,clause:request,direction:from==='top'?'up':from==='bottom'?'down':from||'left',purpose:/\bbackground\b/i.test(request)?'background':'subject',kind:background?'replace':add||find&&!/better image|transparent png|real .*skin/i.test(name)?'add':'replace',preferWeb:/google|better|try again|transparent|\bpng\b/i.test(request),animated:/animated|\bgif\b/i.test(request),animation:/slide/i.test(request)?'slide-in-out':/spring|pop/i.test(request)?'spring-pop':/zoom/i.test(request)?'smooth-zoom':/fade/i.test(request)?'fade':'spring-pop'};
}
export function createRevisionAssets({library,search,download,pokemonAsset,pokemonInfo,register,progress=()=>{},regenerate}){
 async function discover(project,target,context={},keys={}){
  if(context.onlineFirst&&keys['google-images'])target={...target,preferWeb:true};
  const scene=scenesFor(project,'this scene',context)[0],purpose=target.purpose||'subject';let entity;
 const chosen=scene.layers?.find(l=>l.id===context.layerId),current=project.media.find(m=>m.id===chosen?.mediaId);
 if(/^(?:(?:a|the|an) )?(?:better image|transparent png|real .*skin|image)$/i.test(target.name)&&current){target={...target,name:current.searchIntent?.franchise&&current.searchIntent?.subject?current.searchIntent.franchise+' '+current.searchIntent.subject:current.pokemon?.displayName||current.identity?.subject&&current.identity?.franchise+' '+current.identity.subject||current.name,kind:'replace',preferWeb:true};}
 if(target.preferWeb&&current)context={...context,rejectedIds:[...(context.rejectedIds||[]),current.id,current.candidateId].filter(Boolean)};
 const rejected=c=>context.rejectedIds?.includes(c.id)||target.preferWeb&&current&&(c.url&&c.url===current.originalUrl||c.attribution?.source&&c.attribution.source===current.attribution?.source);
  if(context.imageIntent?.name){const intent=context.imageIntent;entity={id:intent.name,name:intent.name,type:intent.type||'object',franchise:intent.franchise||'unknown',explicitLiteral:true,query:intent.query};if(entity.type==='pokemon'&&pokemonInfo){const info=await pokemonInfo(intent.name);entity={...entity,id:info.name,name:info.displayName,franchise:'pokemon'};}target={...target,name:entity.name,preferWeb:true};}
  try{entity ||=resolveSubject(target.name.replace(/\.(png|jpe?g|webp|gif|svg)$/i,''),scene);}catch(original){
   const exact=[...project.media,...library()].find(m=>m.license&&normalize(m.name.replace(/\.[^.]+$/,''))===normalize(target.name));
   if(exact)entity={id:exact.identity?.subject||target.name,name:target.name,type:'character',franchise:assetIdentity(exact).franchise,identity:[normalize(target.name)]};
   else {let info;if(pokemonInfo)try{info=await pokemonInfo(target.name);}catch{}
    if(info)entity={id:info.name,name:info.displayName,type:'pokemon',franchise:'pokemon'};
    else {const literal=target.name.replace(/\b(?:image|picture|photo|gif|of|transparent|png|animated)\b/gi,' ').replace(/\s+/g,' ').trim();if(!literal||literal.split(' ').length>12)throw original;entity={id:literal,name:literal,type:'object',franchise:'unknown',explicitLiteral:true,query:literal};target={...target,preferWeb:true};}
   }
  }
  const imagePurpose=entity.type==='person'?'person':purpose;
  const queries=target.preferWeb||target.animated?[imageSearchIntent(context.imageIntent?.query||target.name,{purpose:imagePurpose,type:target.animated?'GIF':'All'}).query]:entity.id==='mario'?['Super Mario Nintendo character artwork','Super Mario character','Super Mario']:assetQueries(entity,purpose,entity.query||entity.name);
  const pool=[...new Map([...project.media,...library()].map(m=>[m.id,m])).values()];
  const local=rankCandidates(entity,pool,{purpose,query:entity.name}).filter(c=>c.selection.accepted&&(!target.animated||c.pokemon?.animated||c.animationInfo?.animated)&&!rejected(c));
  const automatic=c=>{
   if(!c.selection.accepted)return false;
   if(c.provider==='google-images')return c.selection.autoEligible||entity.explicitLiteral||namedImageMatch(entity,c);
   if(c.usageStatus==='requires-user-rights')return false;
   if(namedImageMatch(entity,c))return true;
   return c.selection.score>=.8&&(/^User-confirmed/.test(c.identity?.source||'')||!/statue|cosplay|mascot|sculpture|costume/i.test(c.name+' '+(c.attribution?.description||'')))&&(c.pokemon||normalize(c.identity?.subject||'')===normalize(entity.id.replace(/^minecraft-/,''))||c.identity?.source==='original programmatic illustration');
  };
  const log=[{provider:'local library',query:entity.name,results:local.length,rejected:pool.length-local.length}];
  if((!target.preferWeb||!keys['google-images']&&context.imageIntent)&&local.some(c=>automatic(c)&&(!target.animated||c.pokemon?.animated||c.animationInfo?.animated)))return {entity,asset:local.find(automatic),log,queries,candidates:local};
  const candidates=[...local.map(c=>({...c,origin:'library'}))];
  if((!target.preferWeb||!keys['google-images'])&&entity.type==='pokemon'&&pokemonAsset){try{const asset=await pokemonAsset(entity.id);if(target.animated&&!asset.pokemon?.animated&&!asset.animationInfo?.animated)throw Error('The structured sprite is static; searching for animation.');return {entity,asset,log,queries,candidates:[...candidates,...rankCandidates(entity,[{...asset,origin:'library'}],{purpose,query:entity.name})]};}catch(e){log.push({provider:'PokéAPI',query:entity.id,error:e.message});}}
  for(const provider of [...(target.preferWeb&&keys['google-images']?['google-images']:[]),...(entity.franchise==='minecraft'?['minecraft-wiki']:[]),'permitted','commons',...['pexels','pixabay','google-images'].filter(p=>keys[p]&&!(target.preferWeb&&p==='google-images'))])for(const query of queries.slice(0,provider==='google-images'?1:3)){
   progress({stage:`Searching ${provider} for ${query}`});
   try{const results=await search(query,provider,keys[provider],{purpose:imagePurpose,subjectName:entity.name,type:target.animated?'GIF':/transparent|\bpng\b/i.test(target.clause||target.name)?'PNG':'All'});const ranked=rankCandidates(entity,results.map(c=>({...c,kind:'image',tags:c.attribution?.description||c.name})),{purpose,query});
    log.push({provider,query:results[0]?.searchQuery||query,results:ranked.length,rejected:ranked.filter(c=>!c.selection.accepted).map(c=>({name:c.name,reasons:c.selection.rejected}))});
    for(const c of ranked.filter(c=>c.selection.accepted&&!rejected(c)))if(!candidates.some(a=>a.id===c.id))candidates.push({...c,origin:'provider',searchQuery:c.searchQuery||query});
    for(const best of ranked.filter(c=>automatic(c)&&!rejected(c))){try{let asset=await download(best);if(target.preferWeb&&asset.id===current?.id)continue;if(asset.provider==='google-images'&&!asset.webAssessment?.accepted){log.push({provider,query,error:'Decoded original does not meet the requested transparency/animation.'});continue;}if(asset.decoded&&namedImageMatch(entity,best)){asset=sourceMatchedImage(entity,asset);if(register)asset=register(asset);}return {entity,asset,log,queries,candidates,target};}catch(e){log.push({provider,query,error:'The matching download failed: '+e.message});}}
   }catch(e){log.push({provider,query,error:e.message});}
  }
  const cached=local.find(c=>automatic(c)&&!rejected(c));if(cached)return {entity,asset:cached,target,log,queries,candidates};
  return {entity,target,log,queries,candidates:candidates.sort((a,b)=>b.selection.score-a.selection.score).slice(0,6),reason:candidates.length?'Possible depictions were found, but their character identity or artwork suitability needs your confirmation. Reuse permission remains unverified for Google discoveries.':'No verified matching original was found. Automatic Google Images requires a configured SerpApi key; browse Google Images, import a direct image URL, or choose a local file to continue.'};
 }
 async function commit(project,target,asset,request,context){
  if(context.timeRange){const clean={...project};delete clean.pendingRevision;return quickPatch(clean,request,context,{edit:sub=>commit(sub,target,asset,request,{...context,timeRange:undefined,sceneId:undefined})});}
  const p={...project,media:[...project.media.filter(m=>m.id!==asset.id),asset]};delete p.pendingRevision;
  const scenes=scenesFor(p,target.clause||request,context);const operations=[];
  if(target.purpose==='background')for(const s of scenes)operations.push({type:'background',sceneIds:[s.id],mediaId:asset.id});
  else if(target.kind==='add')for(const s of scenes){const cue=(target.clause||request).match(/\b(?:at|timestamp)\s*(?:(\d+):)?(\d+(?:\.\d+)?)\b/i);operations.push({type:'add',sceneIds:[s.id],mediaId:asset.id,...(cue?{start:Number(cue[1]||0)*60+Number(cue[2])}:{}),...(context.imageIntent?.end!==undefined?{end:Math.min(s.end,context.imageIntent.end)}:{})});}
  else{for(const s of scenes){if(target.purpose==='background'){operations.push({type:'background',sceneIds:[s.id],mediaId:asset.id});continue;}const selected=s.layers?.find(l=>l.id===context.layerId),subjects=s.layers?.filter(l=>l.role==='subject'||l.mediaId&&l.role!=='background')||[],layer=selected||subjects.length===1&&subjects[0];if(!layer)throw Error('Select the image to replace, then resume this request.');operations.push({type:'replace',sceneIds:[s.id],layerIds:[layer.id],mediaId:asset.id});}}
  let changed=applyOperations(p,{operations}).project;
  for(const s of changed.scenes.filter(s=>scenes.some(a=>a.id===s.id))){const layer=target.purpose==='background'?s.layers.find(l=>l.role==='background'):target.kind==='add'?s.layers.at(-1):s.layers.find(l=>l.mediaId===asset.id&&(target.purpose==='background'?l.role==='background':l.role!=='background'));if(layer){layer.animation=target.animation;layer.direction=target.direction||'left';layer.entranceDuration=.24;if(target.animation==='slide-in-out')layer.animationAmount=.12;layer.exit=target.purpose==='background'?'none':'fade';layer.manual=true;layer.instructionLocked=true;
    if(target.purpose!=='background'){placeRequestedAsset(changed,s,layer,target.clause||request);if(context.imageIntent?.type==='person'&&!/above|below|beside|next to|left|right|top|bottom/i.test(request)){layer.role='story-picture';layer.x=.16;layer.y=.24;layer.width=.68;layer.height=.42;}}
  }}
  if(asset.attribution?.credit)for(const s of changed.scenes.filter(s=>scenes.some(a=>a.id===s.id))){const credit=s.layers.find(l=>l.role==='credit');if(credit){if(!credit.text.includes(asset.attribution.credit))credit.text+=' | '+asset.attribution.credit;}else s.layers.splice(Math.max(0,s.layers.length-1),0,{id:s.id+'-revision-credit-'+crypto.randomUUID(),type:'text',role:'credit',text:asset.attribution.credit,x:.04,y:.958,width:.92,height:.017,z:100,start:s.start,end:s.end,animation:'none',exit:'none',color:'#eeeeee'});}
  for(const clause of requestClauses(request).filter(c=>c!==(target.clause||request))){if(assetRequest(clause))throw Error('Request one new asset at a time. Your current project has not been changed.');const extra=interpretLocal(changed,clause,context);changed=applyOperations(changed,extra).project;operations.push(...extra.operations);}
  changed=refreshStoryboard(changed);
  return recordRevision(p,changed,request,operations,`${target.kind==='add'?'Added':'Replaced with'} ${asset.name}; ${target.animation}; ${scenes.map(s=>'Scene '+(p.scenes.findIndex(a=>a.id===s.id)+1)).join(', ')}`,'Local asset search and validated editor');
 }
 async function apply(project,request,context={},keys={},settings={}){
  if(typeof request!=='string'||!request.trim()||request.length>64000)throw Error('Enter a revision request of 1–64000 characters.');validateProject(project);scenesFor(project,request,context);
  if(project.pendingRevision){const ordinal=/\b(?:use|choose)\s+(?:the\s+)?(first|second|third|fourth|fifth|sixth|[1-6])\s+(?:search )?result/i.exec(request);if(ordinal){const n=/^[1-6]$/.test(ordinal[1])?Number(ordinal[1])-1:['first','second','third','fourth','fifth','sixth'].indexOf(ordinal[1].toLowerCase()),candidate=project.pendingRevision.candidates[n];if(!candidate)throw Error('That search result is not available.');return resume(project,project.pendingRevision.id,{candidateId:candidate.id,providerKey:keys[candidate.provider],confirmIdentity:true});}if(/remove.*try again|search again|reject.*try again/i.test(request)){const previous=project.pendingRevision;const clean={...project};delete clean.pendingRevision;return apply(clean,previous.request,{...previous.context,rejectedIds:previous.candidates.map(c=>c.id)},keys,settings);}throw Error('Choose a result or cancel the pending request before starting another edit.');}
  if(/\b(?:redo|regenerate|rebuild).*\b(?:scene|visuals?)\b/i.test(request)&&regenerate)return regenerate(project,request,context,keys);
  let target=assetRequest(request);if(!target&&/remove.*try again/i.test(request)){const sc=scenesFor(project,'this scene',context)[0],m=project.media.find(m=>m.id===sc.layers?.find(l=>l.id===context.layerId)?.mediaId);if(m){target={name:m.searchIntent?m.searchIntent.franchise+' '+m.searchIntent.subject:m.pokemon?.displayName||m.name,kind:'replace',purpose:'subject',preferWeb:true,animation:'spring-pop',clause:request};context={...context,rejectedIds:[m.candidateId||m.id]};}}if(target&&/better image|transparent png|real .*skin/i.test(target.name)){const sc=scenesFor(project,'this scene',context)[0],m=project.media.find(m=>m.id===sc.layers?.find(l=>l.id===context.layerId)?.mediaId);if(m)target={...target,name:m.searchIntent?m.searchIntent.franchise+' '+m.searchIntent.subject:m.pokemon?.displayName||m.name,kind:'replace',preferWeb:true};}if(!target)return reviseProject(project,request,{...settings,preferExactCommands:true},fetch,context);
  if(context.onlineFirst&&keys['google-images'])target={...target,preferWeb:true};
  let result;try{result=await discover(project,target,context,keys);}catch(e){return {...project,pendingRevision:{id:crypto.randomUUID(),request,context,target,createdAt:new Date().toISOString(),state:'needs-asset',reason:e.message,queries:[target.name],searchLog:[],candidates:[]}};}
  target=result.target||target;if(result.asset)return commit(project,target,result.asset,request,context);
  return {...project,pendingRevision:{id:crypto.randomUUID(),request,context,target:{...target,entity:result.entity},createdAt:new Date().toISOString(),state:'needs-asset',reason:result.reason,queries:result.queries,searchLog:result.log,candidates:result.candidates}};
 }
 async function resume(project,id,selection){
  const pending=project.pendingRevision;if(!pending||pending.id!==id)throw Error('This pending request is no longer active.');
  let asset;if(selection.mediaId)asset=[...project.media,...library()].find(m=>m.id===selection.mediaId);else{const candidate=pending.candidates.find(c=>c.id===selection.candidateId);if(!candidate)throw Error('Select one of the displayed candidates.');if(candidate.origin==='library')asset=candidate;else{
   // Rehydrate the same provider's license-verification map after save/reopen.
   const query=candidate.searchQuery||pending.searchLog.find(l=>l.provider===candidate.provider&&l.query)?.query||pending.queries[0];await search(query,candidate.provider,selection.providerKey);asset=await download({...candidate,declaredRights:selection.declaredRights});
  }}
  if(!asset||!asset.license&&asset.provider!=='google-images')throw Error('The selected asset needs declared reuse rights.');
   let entity=pending.target.entity;try{entity=entity||resolveSubject(pending.target.name,scenesFor(project,'this scene',pending.context)[0]);}catch{if(!selection.declareSubject&&normalize(asset.identity?.subject||'')!==normalize(pending.target.name))throw Error('Confirm this custom subject using an uploaded image with subject tags. The request is retained.');entity={id:pending.target.name,name:pending.target.name,type:'character',franchise:assetIdentity(asset).franchise,identity:[normalize(pending.target.name)]};}
  if(selection.declareSubject&&selection.confirmIdentity&&selection.mediaId){const actual=assetIdentity(asset).franchise,expected=franchiseForEntity(entity);if(actual!=='unknown'&&expected!=='unknown'&&actual!==expected)throw Error('This asset belongs to a different franchise. Choose the matching image; the request is retained.');asset={...asset,tags:[asset.tags,entity.name].filter(Boolean).join(', '),identity:{...assetIdentity(asset),subject:entity.id,franchise:expected,source:'User-confirmed library selection',confidence:1}};}
  if(!rankCandidates(entity,[asset],{query:entity.name})[0].selection.accepted)throw Error('This asset has a different subject or franchise. Select a relevant image; the pending request is preserved.');
  if(!selection.confirmIdentity)throw Error('Confirm that this image depicts the requested subject before using it.');
  if(register){if(!asset.pokemon)asset={...asset,identity:{...assetIdentity(asset),subject:entity.id,franchise:franchiseForEntity(entity),source:'User-confirmed candidate',confidence:1}};asset=register(asset);}
  return commit(project,pending.target,asset,pending.request,pending.context);
 }
 return {apply,resume,discover};
}
