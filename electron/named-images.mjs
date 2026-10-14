const words=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
// Matching a named narration subject to original-source metadata is distinct
// from semantic vision approval and from permission to reuse the picture.
export function namedImageMatch(entity,asset){
 if(asset.generatedForProject||asset.assetRole==='build-sheet')return false;
 if(!['person','character','object'].includes(entity.type)||!entity.name||!(entity.type==='person'||entity.explicitLiteral||entity.source==='Model-proposed subject verified against actual narration'))return false;
 const name=words(entity.name),hay=words(`${asset.name||''} ${asset.attribution?.description||''}`);
 if(!name.length||name.every(w=>['person','guy','man','woman','creator','picture','image','subject','thing'].includes(w))||!name.every(w=>hay.includes(w)))return false;
 if(entity.type==='person'&&/\b(?:logo|icon|figurine|plush|toy|merchandise|costume|fanart|collage)\b/i.test(asset.name+' '+(asset.attribution?.description||'')))return false;
 return asset.selection?.accepted===true||asset.webAssessment?.accepted===true;
}
export const sourceMatchedImage=(entity,asset)=>({...asset,sourceMatch:{subject:entity.id,name:entity.name,method:'Exact named subject in source metadata; original image decoded',semanticVision:false}});
