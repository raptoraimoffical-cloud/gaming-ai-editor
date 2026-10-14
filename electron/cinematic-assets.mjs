import {projectGame,noMotion} from './game-presentation.mjs';
import {sceneGame} from './game-selection.mjs';
const protectedBackground=p=>['upload','generate'].includes(p.creationAssets?.backgroundMode)||/\b(?:background|backdrop)\b[^.!?\n]{0,45}\b(?:pattern|solid|black|white|red|blue|green|purple|orange|yellow)\b/i.test(p.editingInstructions||'');
// Cache source downloads, never a scene or an authored camera/animation plan.
export async function acquireCinematicEnvironments(project,{search,download,register=m=>m,library=[],keys={},progress=()=>{},check=()=>{},verify}={}){
 const next=structuredClone(project);next.cinematicEnvironmentPlan={};next.cinematicAssetReport={acquired:[],warnings:[]};
 if(noMotion(next)||next.cinematicMotion===false||protectedBackground(next))return next;
 const eligible=next.scenes.filter(s=>!s.manualTemplate&&sceneGame(next,s,projectGame(next))==='pokemon');if(!eligible.length)return next;
 const available=[...next.media,...library].find(m=>m.assetRole==='cinematic-environment'&&m.identity?.franchise==='pokemon'&&m.cinematicEnvironment?.accepted);
 let asset;
 // Keep using the existing Google integration. Fall back to an accepted source
 // asset when offline; no generated arena or fabricated mechanics screenshot.
 if(keys['google-images']){
  try{
   check();progress({stage:'Finding original Pokemon arena scenery for cinematic depth'});
   const candidates=await search('Pokemon battle arena background','google-images',keys['google-images'],{game:'Pokemon',type:'Background',purpose:'background'});
   for(const c of candidates.filter(c=>c.webAssessment?.accepted&&!/card|sprites?|logo|team builder|moveset|stats/i.test(c.name||''))){
    check();try{
     const m=await download(c);check();if(m.kind!=='image'||!m.decoded||!m.webAssessment?.accepted||m.transparent||m.width<640||m.height<350)continue;
     const review=verify?await verify(m):undefined;check();if(review&&review.accepted!==true)continue;
     // A generic gameplay screenshot often already contains fighters and UI.
     // Without a vision model require documented empty scenery, not merely
     // a matching arena keyword on an otherwise unknown picture.
     if(!review&&!/\bempty\b|no characters|background only|battleback|scenery|bg[-_](?:arena|stadium)/i.test([c.name,c.url,c.attribution?.description,m.name].filter(Boolean).join(' ')))continue;
     asset=register({...m,assetRole:'cinematic-environment',identity:{...m.identity,franchise:'pokemon'},cinematicEnvironment:{accepted:true,visionReviewed:!!review,query:c.searchQuery||'Pokemon battle arena background'}});break;
    }catch(e){check();next.cinematicAssetReport.warnings.push(e.message);}
   }
  }catch(e){check();next.cinematicAssetReport.warnings.push('Cinematic scenery search: '+e.message);}
 }
 asset??=available;
 if(!asset){next.cinematicAssetReport.warnings.push('No accepted source arena: retain the existing game background.');return next;}
 if(!next.media.some(m=>m.id===asset.id))next.media.push(asset);else next.media=next.media.map(m=>m.id===asset.id?asset:m);
 for(const s of eligible)next.cinematicEnvironmentPlan[s.id]=asset.id;
 next.cinematicAssetReport.acquired.push({mediaId:asset.id,source:asset.attribution?.source||asset.originalUrl,visionReviewed:asset.cinematicEnvironment.visionReviewed});return next;
}
