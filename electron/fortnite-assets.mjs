import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const FORTNITE_SOURCE='https://fortnite.fandom.com/wiki/Category:Images_-_Assets';
export const FORTNITE_CATEGORIES={all:'All assets',backgrounds:'Backgrounds',renders:'Renders',weapons:'Weapons',items:'Items',icons:'Icons',logos:'Logos',graphics:'Graphics',screenshots:'Screenshots'};
export function fortniteMetadata({category='all',subject='',source=FORTNITE_SOURCE,license=''}={}){
 if(!FORTNITE_CATEGORIES[category])throw Error('Unknown Fortnite category');
 const url=new URL(source);
 if(url.protocol!=='https:'||url.hostname!=='fortnite.fandom.com'||url.username||url.password)throw Error('Use the original Fortnite Fandom source page');
 if(!license.trim())throw Error('Enter the downloaded asset license or permission');
 return {provider:'fortnite-fandom',assetRole:['backgrounds','screenshots'].includes(category)?'background':'character',tags:'Fortnite '+subject+' '+FORTNITE_CATEGORIES[category],fortnite:{category,subject},identity:{franchise:'fortnite',subject:subject.trim()||category,variant:'Fortnite Fandom source artwork',source:url.href,confidence:1},license,attribution:{credit:'Epic Games / Fortnite Wiki contributors',source:url.href,licenseUrl:url.href,changes:'Imported; may be resized or animated'}};
}
export function createFortniteAssets(folder,{register,inspect,fetchImpl=fetch}){
 fs.mkdirSync(folder,{recursive:true});const candidates=new Map(),categories=new Set(['Category:Images - Assets']);
 async function api(params){const r=await fetchImpl('https://fortnite.fandom.com/api.php?'+new URLSearchParams({action:'query',format:'json',...params}),{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Fortnite Wiki HTTP '+r.status);const data=await r.json();if(data.error)throw Error(data.error.info||'Wiki request failed');return data;}
 async function list({category='Category:Images - Assets',cursor='',query=''}={}){
  if(!categories.has(category))throw Error('Choose a category from the source browser');let pages,next,subcategories=[];
  if(query.trim()){
   const d=await api({generator:'search',gsrnamespace:'6',gsrsearch:query.trim()+' "Asset" "Fortnite"',gsrlimit:'40',prop:'imageinfo',iiprop:'url|size',iiurlwidth:'320',...(cursor?{gsroffset:cursor}:{})});pages=Object.values(d.query?.pages||{});next=d.continue?.gsroffset;
  }else{
   const d=await api({list:'categorymembers',cmtitle:category,cmlimit:'40',...(cursor?{cmcontinue:cursor}:{})});const rows=d.query?.categorymembers||[];next=d.continue?.cmcontinue;
   subcategories=rows.filter(r=>r.ns===14).map(r=>{categories.add(r.title);return {title:r.title,name:r.title.replace(/^Category:Images - /,'')};});
   const ids=rows.filter(r=>r.ns===6).map(r=>r.pageid);pages=ids.length?Object.values((await api({pageids:ids.join('|'),prop:'imageinfo',iiprop:'url|size',iiurlwidth:'320'})).query?.pages||{}):[];
  }
  const files=pages.flatMap(p=>{const i=p.imageinfo?.[0];if(!i||!/^https:\/\/static\.wikia\.nocookie\.net\/fortnite\/images\//.test(i.url)||!(/\.(png|webp|jpe?g|gif|svg)$/i.test(p.title)))return [];
   const name=p.title.replace(/^File:/,'').replace(/ - Asset - Fortnite\.[^.]+$/,'');const type=/background|screenshot/i.test(name)?'backgrounds':/logo/i.test(name)?'logos':'renders';
   const m={...fortniteMetadata({category:type,subject:name,source:i.descriptionurl,license:'Fortnite artwork retains Epic Games and original rights holders’ copyright.'}),id:'fortnite-fandom-'+p.pageid,name,url:i.url,thumbnail:i.thumburl||i.url,kind:'image',width:i.width,height:i.height};candidates.set(m.id,m);return [m];});
  return {files,categories:subcategories,next:next===undefined?null:String(next),category,source:FORTNITE_SOURCE};
 }
 async function download(id){const c=candidates.get(id);if(!c)throw Error('Browse the wiki before importing');const file=path.join(folder,crypto.createHash('sha256').update(c.url).digest('hex').slice(0,24)+path.extname(new URL(c.url).pathname.split('/revision/')[0]));
  if(!fs.existsSync(file)){const r=await fetchImpl(c.url,{signal:AbortSignal.timeout(25000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('Wiki image is unavailable');const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<24||bytes.length>30e6)throw Error('Invalid or oversized wiki image');fs.writeFileSync(file,bytes);}
  return register({...c,path:file,originalUrl:c.url,duration:0,...await inspect(file,'image')});
 }
 return {list,download};
}
