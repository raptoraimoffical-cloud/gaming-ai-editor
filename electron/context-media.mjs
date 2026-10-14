import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
export async function acquireContextMedia(project,{search,download,keys={},progress=()=>{},check=()=>{}}){
 if(project.creationAssets?.backgroundMode==='upload'||project.creationAssets?.backgroundMode==='generate')return project;
 const wanted=[...new Set(project.scenes.flatMap(s=>(s.reaction?.entities||[]).map(franchiseForEntity)).filter(f=>f!=='unknown'))].slice(0,3),media=[...project.media],log=[...(project.assetSearchLog||[])];
 for(const franchise of wanted){
  const existing=media.filter(m=>assetIdentity(m).franchise===franchise&&m.assetRole==='background'&&['image','video'].includes(m.kind));if(existing.length>=2||project.shortStyle&&existing.length>=1)continue;
  const concepts=[...new Set((project.youtubeStrategy?.sentences||[]).filter(s=>project.scenes.find(scene=>scene.id===s.sceneId)?.reaction?.entities?.some(e=>franchiseForEntity(e)===franchise)).flatMap(s=>s.phrases.flatMap(p=>p.keywords)).filter(w=>/^(forest|cave|desert|snow|snowy|terrain|arena|biome)$/i.test(w)))].slice(0,2);
  const query=franchise+' '+(concepts.length?concepts.join(' ')+' gameplay screenshot':'gameplay environment');
  for(const provider of ['permitted','commons',...(keys['google-images']?['google-images']:[])]){
   check();progress({stage:'Finding context scenery for '+franchise});
   try{
    const results=await search(query,provider,keys[provider],{purpose:'background'});
    const candidates=results.filter(m=>(m.license&&m.usageStatus!=='requires-user-rights'||m.provider==='google-images'&&m.webAssessment?.autoEligible)&&m.width>=640&&m.height>=360&&!m.transparent&&assetIdentity(m).franchise===franchise&&/gameplay|screenshot|terrain|forest|cave|landscape|environment|arena/i.test(m.name+' '+m.tags+' '+m.attribution?.description)&&!(/logo|sprite|toy|plush|figurine|cosplay/i.test(m.name+' '+m.tags)));
    const entry={purpose:'context-background',franchise,query,provider,returned:results.length,accepted:candidates.map(m=>m.id),inserted:[]};log.push(entry);
    for(const c of candidates.slice(0,2-existing.length)){check();const m=await download(c);if(m.provider==='google-images'&&(!m.webAssessment?.accepted||m.transparent||m.width<640||m.height<360))continue;if(!media.some(a=>a.id===m.id)){media.push({...m,assetRole:'background'});entry.inserted.push(m.id);}}
    if(entry.inserted.length)break;
   }catch(e){check();log.push({purpose:'context-background',franchise,query,provider,error:e.message});}
  }
 }
 return {...project,media,assetSearchLog:log};
}
