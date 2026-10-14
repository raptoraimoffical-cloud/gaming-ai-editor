// Cache published literal artwork. Google originals override these offline
// props during acquisition when configured; emoji packs are never used.
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const folder=path.resolve('electron/data/narration-props');fs.mkdirSync(folder,{recursive:true});
const manifest=[];
async function sourceFetch(url,options){for(let attempt=0;attempt<3;attempt++){const r=await fetch(url,options);if(r.status!==429||attempt===2)return r;await new Promise(resolve=>setTimeout(resolve,Math.min(30000,Number(r.headers.get('retry-after')||2)*1000)));}}
for(const [kind,title,rotate] of [['paper','Paper icon.svg',0],['leaf','Leaf Simple Green L.svg',0],['lightning','Yellow Lightning Bolt with Black Outline.svg',0],['ruler','Ruler.svg',90],['crumpled-paper','Ball of paper.svg',0],['phone','Smartphone icon.svg',0],['clock','Clock.svg',0],['trophy','Trophy.png',0],['crown','Crown.svg',0]]){
 const api='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles:'File:'+title,prop:'imageinfo',iiprop:'url|extmetadata'});
 const response=await fetch(api);if(!response.ok)throw Error('Commons metadata HTTP '+response.status);
 const info=Object.values((await response.json()).query.pages)[0].imageinfo?.[0];if(!info)throw Error('Missing original '+title);
 const meta=info.extmetadata,source=info.url.split('?')[0],file=kind==='phone'?'phone-cropped-sourced-v2.png':kind+'-sourced-v2.png';
 if(!fs.existsSync(path.join(folder,file))){const r=await sourceFetch(source,{headers:{'User-Agent':'GamingAIEditor/0.1 source attribution client'}});if(!r.ok)throw Error(title+' HTTP '+r.status);let art=sharp(Buffer.from(await r.arrayBuffer()),{density:200}).rotate(rotate);if(kind==='phone')art=art.trim();await art.resize({width:kind==='ruler'?96:768,height:kind==='ruler'?768:768,fit:'inside'}).png().toFile(path.join(folder,file));}
 const dimensions=await sharp(path.join(folder,file)).metadata();
 manifest.push({kind,file,name:title.replace('.svg',''),source,credit:meta.Artist?.value.replace(/<[^>]+>/g,'')||'Source contributor',license:meta.LicenseShortName?.value||meta.UsageTerms?.value,licenseUrl:meta.LicenseUrl?.value||info.descriptionurl,changes:'Published original rasterized; '+(rotate?'rotated vertically for a size comparison.':kind==='phone'?'transparent margins cropped for accurate logo placement.':'animated within the video.'),width:dimensions.width,height:dimensions.height});
}
const sadUrl='https://media1.tenor.com/m/tuzl1hVGlIQAAAAC/sad-cat-sad-cat-meme.gif',sad=await fetch(sadUrl);if(!sad.ok)throw Error('Sad reaction HTTP '+sad.status);
const sadFile='sad-cat-sourced-v2.gif';fs.writeFileSync(path.join(folder,sadFile),Buffer.from(await sad.arrayBuffer()));
const sm=await sharp(path.join(folder,sadFile),{animated:true}).metadata();
manifest.push({kind:'sad',file:sadFile,name:'Sad cat face reaction',source:sadUrl,credit:'Original uploader via Tenor',license:'Reaction footage belongs to its original rights holder; source attribution is not a blanket reuse license.',licenseUrl:'https://tenor.com/search/sad-cat-gifs',changes:'Brief contextual reaction over the discussed stats.',width:sm.width,height:sm.pageHeight||sm.height,animated:true});
fs.writeFileSync(path.join(folder,'context-manifest.json'),JSON.stringify(manifest,null,2));console.log('Cached '+manifest.length+' sourced props; no emoji assets.');
