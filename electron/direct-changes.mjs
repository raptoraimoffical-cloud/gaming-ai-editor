import {interpretLocal,applyOperations,recordRevision,requestClauses} from './revisions.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {quickPatch,applyPatchOperations,patchRange} from './quick-patch.mjs';
import {assetRequest} from './revision-assets.mjs';
import {creativeRequest,sourceMechanicRequest} from './creative-request.mjs';
import {manualEdit} from './manual-editor.mjs';
import {sameAudio} from './audio-routing.mjs';
import {missingPokemonRequest} from './missing-pokemon.mjs';

// Direct edits run before style-remake routing and before loading/rendering a
// vision model. A range edit uses the same validated splice as a manual patch.
export function createDirectChanges({assets,library=()=>[],music,sound,repairPokemon,resolveImages,fallback,progress=()=>{}}){
 return async function direct(project,request,context={},keys={},report=progress){
  if(typeof request!=='string'||!request.trim()||request.length>64000)throw Error('Describe the change in 1–64000 characters.');
  if(context.timeRange)patchRange(project,context);
  if(project.pendingRevision&&project.pendingRevision.request?.trim()!==request.trim()){project={...project};delete project.pendingRevision;}
  if(project.pendingRevision)return assets.apply(project,request,context,keys,{});
  if(repairPokemon&&missingPokemonRequest(request))return repairPokemon(project,request,context,keys,report);
  const clauses=requestClauses(request);
  if(clauses.length>1){let current=project;for(const [i,clause] of clauses.entries()){let result=await direct(current,clause,context,keys,report);if(!result&&fallback)result=await fallback(current,clause,context,keys,report);if(!result)return null;current=result;if(current.pendingRevision)return {...current,pendingRevision:{...current.pendingRevision,remainingInstructions:clauses.slice(i+1).join('; '),fullRequest:request}};}
   return recordRevision(project,{...current,revisionHistory:project.revisionHistory,revisionCursor:project.revisionCursor},request,[],clauses.length+' requested changes applied','Direct timeline edits');}
  const musical=/\b(?:music|soundtrack|song)\b/i.test(request)&&/\b(?:change|replace|use|play|set|remove|mute|quieter|louder|volume)\b/i.test(request);
  if(musical&&!/\b(?:and|then)\s+(?:add|make|animate|change|replace)\b/i.test(request)){
   if(/\bremove|mute\b/i.test(request)){
    if(context.timeRange){const next=structuredClone(project);next.musicClip={start:0,end:project.duration,...next.musicClip,mutedRanges:[...(next.musicClip?.mutedRanges||[]),context.timeRange]};return recordRevision(project,next,request,[],'Muted music in the selected seconds','Direct soundtrack edit');}
    return manualEdit(project,{type:'audio',kind:'music',values:{remove:true}});
   }
   const volume=request.match(/(?:volume|to|at)\s*(\d+(?:\.\d+)?)\s*(%?)/i),gain=volume?Number(volume[1])/(volume[2]?100:1):/quieter/i.test(request)?(project.musicVolume??.08)*.65:/louder/i.test(request)?Math.min(1,(project.musicVolume??.08)*1.4):undefined;
   if(gain!==undefined&&project.musicId&&!/replace|change.*(?:to|with)|use|play/i.test(request))return manualEdit(project,{type:'audio',kind:'music',values:{volume:gain}});
   const clean=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),needle=clean(request),voice=project.media.find(m=>m.id===project.voiceId);
   const score=t=>{const name=clean(t.name),id=clean(t.id),tokens=name.split(' ').filter(w=>w.length>2&&!['pokemon','music','battle','trainer','soundtrack'].includes(w));if(needle.includes(name)||needle.includes(id))return 100;return tokens.filter(w=>needle.includes(w)).length*5+(/pokemon/.test(needle)&&t.game==='pokemon'||/minecraft/.test(needle)&&t.game==='minecraft'?3:0)+(/battle/.test(needle)&&/battle|trainer/.test(name)?1:0);};
   const local=[...new Map([...project.media,...library()].map(m=>[m.id,m])).values()].filter(m=>m.kind==='audio'&&m.assetRole==='music'&&!sameAudio(m,voice));
   let selected=local.map(m=>({m,score:score({...m,game:m.identity?.franchise})})).filter(t=>t.score>0).sort((a,b)=>b.score-a.score)[0]?.m;
   const tracks=music?await music.catalog():[],best=tracks.map(t=>({t,score:score(t)})).filter(t=>t.score>0).sort((a,b)=>b.score-a.score)[0];
   if(best&&(!selected||best.score>score({...selected,game:selected.identity?.franchise}))){report({stage:'Downloading '+best.t.name,percent:35});selected=await music.download(best.t.id);}
   if(!selected)throw Error('Name a track in Game Music or your imported music library. No unrelated track was substituted.');
   report({stage:'Applying the selected soundtrack',percent:90});
   const withMedia={...project,media:[...new Map([...project.media,selected].map(m=>[m.id,m])).values()]};
   if(context.timeRange){const {start,end}=context.timeRange;if(start<0||end>project.duration||end-start<.1)throw Error('Choose music seconds inside the video.');const alias={...selected,id:'patch-music-'+selected.id,assetRole:'sound-effect'},next={...withMedia,media:[...withMedia.media.filter(m=>m.id!==alias.id),alias],musicClip:{start:0,end:project.duration,...project.musicClip,mutedRanges:[...(project.musicClip?.mutedRanges||[]),{start,end}]},soundEffects:[...(project.soundEffects||[]),{mediaId:alias.id,start,end,volume:gain??project.musicVolume??.08,sourceOffset:0,loop:true,duck:true,fadeIn:.3,fadeOut:.5,auto:false,cue:'patch-music'}]};return recordRevision(project,next,request,[],'Changed music only from '+start+' to '+end+' seconds','Direct soundtrack edit');}
   const edited=manualEdit(withMedia,{type:'audio',kind:'music',values:{mediaId:selected.id,start:0,end:project.duration,sourceOffset:0,fadeIn:.3,fadeOut:.5,loop:true,duck:true,mutedRanges:[],...(gain!==undefined?{volume:gain}:{})}});
   return recordRevision(project,{...edited,revisionHistory:project.revisionHistory,revisionCursor:project.revisionCursor},request,[], 'Changed music to '+selected.name,'Direct soundtrack edit');
  }
  if(sound&&/\b(?:add|insert|play|use)\b/i.test(request)&&/\b(?:sound|sfx|cries|cry|pop|whoosh|ding)\b/i.test(request)&&!creativeRequest(request,context)){
   const media=await sound(request);if(media){const start=Number(request.match(/\bat\s*(\d+(?:\.\d+)?)\s*(?:seconds?|s)?/i)?.[1]??context.timeRange?.start??context.time??0),end=Math.min(project.duration,context.timeRange?.end??project.duration,start+media.duration);if(start<0||start>=project.duration||end-start<1/30)throw Error('Sound must fit inside the selected seconds.');const next={...project,media:[...new Map([...project.media,media].map(m=>[m.id,m])).values()],soundEffects:[...(project.soundEffects||[]),{mediaId:media.id,start,end,volume:.12,auto:false}]};return recordRevision(project,next,request,[],'Added '+media.name+' at '+start+'s','Direct sound edit');}
  }
  const target=assetRequest(request),specificAsset=target&&!sourceMechanicRequest(request)&&!creativeRequest(request,context)&&!/\b(?:sound|sfx|cries|cry|captions?|charts?|graphs?)\b/i.test(request);
  if(resolveImages){const resolved=await resolveImages(project,request,context,report);if(resolved){let current=project;for(const [i,subject] of resolved.additions.entries()){
   const instruction='Add an image of '+subject.query+' at '+subject.start+' seconds'+(subject.placement?' '+subject.placement:'');
   current=await assets.apply(current,instruction,{...context,sceneId:subject.sceneId,onlineFirst:true,imageIntent:subject},keys,{});
   if(current.pendingRevision)return {...current,pendingRevision:{...current.pendingRevision,fullRequest:request,remainingInstructions:resolved.additions.slice(i+1).map(s=>'Add an image of '+s.query+' at '+s.start+' seconds '+s.placement).join('; ')}};
   }
   return recordRevision(project,{...current,lastEditAI:resolved.trace,revisionHistory:project.revisionHistory,revisionCursor:project.revisionCursor},request,[], 'Added '+resolved.additions.length+' narrated subject image(s)','Trained image intent + online image insertion');
  }}
  // Known colors/backgrounds should not go to the image search parser.
  let command;try{command=interpretLocal(project,request,context);}catch{}
  if(specificAsset&&!(command?.operations.every(o=>o.type==='background')&&target.purpose==='background')){report({stage:'Finding '+target.name,percent:15});return assets.apply(project,request,{...context,onlineFirst:true},keys,{});}
  if(command&&!creativeRequest(request,context)){
   if(context.timeRange)return quickPatch(project,request,context,{progress:report,edit:async sub=>applyPatchOperations(sub,interpretLocal(sub,request,{...context,timeRange:undefined,sceneId:undefined}))});
   const applied=applyOperations(project,command);return recordRevision(project,refreshStoryboard(applied.project),request,command.operations,applied.summary,'Direct timeline edit');
  }
  return null;
 };
}
