import {MINECRAFT_ENTITIES} from './minecraft-entities.mjs';
import {assetIdentity,franchiseForEntity} from './asset-identity.mjs';
import {entityAssetScore,normalize,ENTITIES} from './reactions.mjs';
import {imageSearchIntent,assessWebCandidate} from './web-image-queries.mjs';
export function resolveSubject(query,scene){
 const q=normalize(query.replace(/\b(?:a|an|the|better|real|transparent|png|gif|animated|image|picture|official|artwork|skin)\b/gi,' ').replace(/\s+/g,' ').trim()),pokemon=scene?.reaction?.entities.find(e=>e.type==='pokemon'&&[normalize(e.name),normalize(e.id)].includes(q));if(pokemon)return pokemon;
 const named=ENTITIES.find(e=>e.aliases.some(a=>normalize(a)===q));if(named)return named;
 const mob=/\bminecraft\b/.test(q)&&['chicken','pig','cow','sheep','creeper','zombie','skeleton'].find(n=>q.includes(n));if(mob)return {id:'minecraft-'+mob,name:'Minecraft '+mob,type:'object',franchise:'minecraft',identity:['minecraft',mob],query:'Minecraft '+mob};
 const minecraft=MINECRAFT_ENTITIES.find(e=>[normalize(e.name),...e.aliases.map(normalize)].includes(q));if(minecraft)return minecraft;
 const explicit=imageSearchIntent(query);if(explicit.franchise!=='unknown'&&explicit.subject&&![explicit.franchise,'background'].includes(explicit.subject)&&!ENTITIES.some(e=>e.type==='game'&&normalize(e.name)===q))return {id:explicit.franchise==='minecraft'?'minecraft-'+explicit.subject.replace(/ /g,'-'):explicit.subject,name:explicit.franchise==='mario'?'Mario':explicit.franchise+' '+explicit.subject,type:explicit.franchise==='pokemon'?'pokemon':explicit.background?'game':'character',franchise:explicit.franchise,identity:[explicit.subject],query};
 const game=ENTITIES.find(e=>e.type==='game'&&q.includes(normalize(e.name)));if(game)return {...game,query};
 const inherited=scene?.reaction?.entities.find(e=>e.mediaId&&normalize(e.name)===q);if(inherited)return inherited;
 throw Error('Identify a supported game or character in the search query, or upload a custom asset with its subject and rights. Unidentified stock images are not inserted automatically.');
}
export function assetQueries(entity,purpose='subject',query=entity.query||entity.name){
 const queries=[query];if(purpose==='background')queries.push(`${entity.name} ${/forest/i.test(query)?'forest ':''}gameplay screenshot`);else if(entity.type==='character')queries.push(`${entity.name} character artwork`);else if(entity.type==='object')queries.push(`${entity.name} transparent`);return [...new Set(queries)].slice(0,3);
}
export function rankAsset(entity,asset,{purpose='subject',query=entity.name}={}){
 if(asset.provider==='google-images'){
  const intent=imageSearchIntent(entity.name,{game:entity.franchise||'All',purpose,type:asset.searchIntent?.animated?'GIF':asset.searchIntent?.wantsTransparent?'PNG':'All'});
  const assessment=assessWebCandidate({...asset,url:asset.originalUrl||asset.url},intent);if(asset.assetReview?.subject===entity.id&&asset.assetReview.accepted===false&&!/^User-confirmed/.test(asset.identity?.source||''))return {...assessment,accepted:false,autoEligible:false,score:0,rejected:[...assessment.rejected,'Previous visual inspection rejected this image']};if(assessment.accepted&&asset.decoded&&asset.sourceMatch?.subject===entity.id)return {...assessment,autoEligible:true,score:.85,confidence:assessment.confidence};return assessment.accepted&&(asset.assetReview?.accepted||/^User-confirmed/.test(asset.identity?.source||''))?{...assessment,autoEligible:true,score:1,confidence:1}:assessment;
 }
 const identity=assetIdentity(asset),matching=entityAssetScore(entity,{...asset,kind:asset.kind||'image',tags:asset.tags||asset.attribution?.description||''})||(!asset.pokemon&&entity.type==='pokemon'&&asset.identity?.franchise==='pokemon'&&normalize(asset.identity.subject)===normalize(entity.id)&&/^User-confirmed/.test(asset.identity.source)?1:0);
 const reasons=[],reject=[];if(asset.assetRole==='logo'&&purpose!=='logo')reject.push('A game logo is an overlay, not background footage or character artwork');if(!matching)reject.push('Subject or franchise does not match');if(!asset.license)reject.push('Reuse rights not declared');
 if(asset.assetReview?.subject===entity.id&&asset.assetReview.accepted===false&&!/^User-confirmed/.test(asset.identity?.source||''))reject.push('Previous visual inspection rejected this subject match: '+asset.assetReview.reason);
 if(entity.id==='mario'&&!/super\s*mario|nintendo|video\s*game|mario.*(?:character|statue|cosplay|mascot)/i.test(`${asset.name} ${asset.tags||''} ${asset.attribution?.description||''}`)&&asset.identity?.franchise!=='mario')reject.push('Mario has no documented Super Mario / Nintendo context; a personal name is insufficient');
 const width=asset.width||asset.pokemon?.spriteWidth||0,height=asset.height||asset.pokemon?.spriteHeight||0;
 const nativeSprite=!!asset.pokemon,diagram=identity.source==='original programmatic illustration',transparent=asset.transparent===true||nativeSprite||diagram;
 if(!nativeSprite&&!diagram&&!asset.pixelArt&&width&&height&&(width<320||height<240))reject.push('Source is too small for useful 1080p imagery');
 if(purpose==='background'&&(nativeSprite||diagram))reject.push('Foreground sprite/diagram is not background footage');
 const hay=normalize(`${asset.name} ${asset.tags||''} ${asset.attribution?.description||''}`);if(entity.type==='object'&&/wood\s*craft|toy|plush|figurine|statue|merchandise|cosplay|diorama|3d print/.test(hay))reject.push('Physical merchandise is not the narrated in-game subject');if(entity.type==='object'&&franchiseForEntity(entity)!=='unknown'&&asset.attribution&&!/screenshot|sprite|in game|game render|gameplay|game asset|pixel art/.test(hay))reject.push('In-game depiction is not documented; requires visual approval');const tokens=normalize(query).split(' ').filter(t=>t.length>2),queryScore=tokens.filter(t=>hay.includes(t)).length/Math.max(1,tokens.length);
 if(purpose==='background'&&/forest/i.test(query)&&!(/forest|woodland|trees?/.test(hay)))reject.push('The requested forest environment is not documented');
 if(transparent&&purpose==='subject')reasons.push('Transparent foreground');if(asset.kind==='video'&&purpose==='background')reasons.push('Actual footage');if(width>=1280&&height>=720)reasons.push('HD source');if(nativeSprite)reasons.push('Exact PokéAPI species/form');if(diagram)reasons.push('Original labeled diagram');
 const resolution=nativeSprite||diagram||asset.pixelArt?1:width&&height?Math.min(1,width*height/2073600):.25;
 const score=reject.length?0:.55*matching+.17*resolution+.15*queryScore+.08*(transparent&&purpose==='subject'?1:purpose==='background'&&asset.kind==='video'?1:0)+.05*(asset.attribution?1:1);
 return {accepted:!reject.length,score:Number(score.toFixed(3)),confidence:nativeSprite||diagram?1:Math.min(.95,score),identity,query,reasons,rejected:reject,width,height,transparent,qualityWarning:!nativeSprite&&!diagram&&(!width||!height)?'Dimensions not verified; review source quality':nativeSprite?'Native pixel sprite; not HD artwork':diagram?'Stylized diagram; not official game art':undefined};
}
export function rankCandidates(entity,assets,options){return assets.map(asset=>({...asset,selection:rankAsset(entity,asset,options)})).sort((a,b)=>b.selection.score-a.selection.score);}
