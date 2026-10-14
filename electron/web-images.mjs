import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {searchGoogleImages} from './google-images.mjs';
import {downloadPublicImage,inspectImageBytes} from './web-image-download.mjs';
import {imageSearchIntent,assessWebCandidate} from './web-image-queries.mjs';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
export function createWebImages(folder,{fetchImpl=fetch,imageFetch,lookup,getKey=()=>''}={}){
 fs.mkdirSync(folder,{recursive:true});const stateFile=path.join(folder,'google-state.json'),verified=new Map(),flights=new Map(),controllers=new Set();
 let state={enabled:true,favorites:[],rejected:[],...read(stateFile,{}),maxSearches:0,unlimited:true},sessionSearches=0,lastError='',quota=null;
 // Zero means unlimited. Migrate old saved limits, including explicitly small
 // legacy limits: narration assets must never stop halfway through a video.
 if(state.budgetVersion!==3){state.budgetVersion=3;save();}
 function read(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
 function save(){fs.writeFileSync(stateFile,JSON.stringify(state,null,2));}
 function status(){return {enabled:state.enabled,configured:!!getKey(),maxSearches:0,unlimited:true,sessionSearches,lastError,quota,favorites:state.favorites,rejected:state.rejected,cachedQueries:fs.readdirSync(folder).filter(f=>/^google-search-.*\.json$/.test(f)).length};}
 function configure(settings){if(typeof settings.enabled==='boolean')state.enabled=settings.enabled;save();return status();}
 function beginBudget(){sessionSearches=0;}
 async function search(value,key=getKey(),options={}){
  if(!state.enabled)throw Error('Google Images is disabled in Settings.');
  const intent=imageSearchIntent(options.subjectName||value,options),query=options.exactQuery||options.subjectName?String(value):intent.query,file=path.join(folder,'google-search-'+hash(query.toLowerCase())+'.json');
  let results;const cached=read(file,null);
  if(cached&&Date.now()-cached.time<86400000)results=cached.results;
  else{
   if(!key)throw Object.assign(Error('Automatic Google Images search requires a SerpApi key in Settings. Browse Google Images or import a direct URL.'),{code:'MISSING_KEY'});
   if(!flights.has(query)){
    sessionSearches++;const controller=new AbortController();controllers.add(controller);
    flights.set(query,searchGoogleImages(query,key,{fetchImpl,signal:controller.signal}).then(results=>{fs.writeFileSync(file,JSON.stringify({time:Date.now(),query,results}));lastError='';return results;}).catch(e=>{lastError=e.message;throw e;}).finally(()=>{controllers.delete(controller);flights.delete(query);}));
   }
   results=await flights.get(query);
  }
  return results.filter(c=>!state.rejected.includes(c.id)).map(c=>{const item={...c,searchQuery:query,tags:[intent.franchise,intent.subject,intent.style].join(', '),searchIntent:intent,kind:'image'};item.webAssessment=assessWebCandidate(item,intent);item.selection=item.webAssessment;item.score=item.webAssessment.score;verified.set(item.id,item);return item;}).sort((a,b)=>b.score-a.score);
 }
 async function download(input){
  const candidate=verified.get(input.id);if(!candidate)throw Error('Search for this image again before importing it.');
  const record=path.join(folder,candidate.id+'.json'),cached=read(record,null);if(cached&&fs.existsSync(cached.path)&&cached.decoded)return cached;
  const controller=new AbortController();controllers.add(controller);
  try{
   let result;for(let retry=0;retry<3;retry++){try{result=await downloadPublicImage(candidate.url,{signal:controller.signal,lookup,fetchImpl:imageFetch});break;}catch(e){if(controller.signal.aborted)throw Error('Image download cancelled.');if(retry===2||e.status&&e.status<500&&e.status!==429||/Private|supported|limit/.test(e.message))throw e;await new Promise(resolve=>setTimeout(resolve,250*2**retry));}}
   const info=await inspectImageBytes(result.bytes),contentHash=hash(result.bytes),file=path.join(folder,'google-content-'+contentHash+'.'+(info.format==='jpeg'?'jpg':info.format));
   if(!fs.existsSync(file))fs.writeFileSync(file,result.bytes);
   const asset={...candidate,...info,candidateId:candidate.id,id:contentHash.slice(0,24),contentHash,path:file,finalUrl:result.finalUrl,originalUrl:candidate.url,duration:0,usageStatus:input.declaredRights?.trim()?'user-declared permission':'unverified',license:input.declaredRights?.trim()||'',downloadedAt:new Date().toISOString()};
   asset.webAssessment=assessWebCandidate(asset,candidate.searchIntent);asset.selection=asset.webAssessment;
   fs.writeFileSync(record,JSON.stringify(asset,null,2));return asset;
  }finally{controllers.delete(controller);}
 }
 async function importUrl(value,{name='Imported web image',query='',declaredRights=''}={}){
  const u=new URL(value);const c={id:'google-image-'+hash(u.href).slice(0,24),name,provider:'google-images',url:u.href,originalUrl:u.href,license:'',rightsNotice:'Reuse permission is not verified. Check the original publisher.',attribution:{source:u.href,credit:u.hostname,licenseUrl:'',description:name},searchQuery:query,searchIntent:imageSearchIntent(query||name),kind:'image'};verified.set(c.id,c);return download({...c,declaredRights});
 }
 async function test(key=getKey()){
  if(!key)throw Error('Save a SerpApi key first.');let response;
  try{response=await fetchImpl('https://serpapi.com/account.json?'+new URLSearchParams({api_key:key}),{signal:AbortSignal.timeout(15000)});}catch{throw Error('SerpApi connection failed.');}
  if(!response.ok)throw Error(response.status===401||response.status===403?'Invalid SerpApi key.':'SerpApi account HTTP '+response.status);
  const data=await response.json();if(data.error)throw Error('SerpApi account check failed. Check the key and quota.');
  quota=Object.fromEntries(['account_status','plan_name','searches_per_month','plan_searches_left','total_searches_left','this_month_usage'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));return status();
 }
 return {search,download,importUrl,status,configure,test,beginBudget,cancel(){for(const c of controllers)c.abort();return true;},clear(){for(const f of fs.readdirSync(folder).filter(f=>/^google-search-[a-f0-9]+\.json$/.test(f)))fs.unlinkSync(path.join(folder,f));return status();},favorite(id,value=true){state.favorites=[...new Set(value?[...state.favorites,id]:state.favorites.filter(x=>x!==id))].slice(-500);save();return status();},reject(id){state.rejected=[...new Set([...state.rejected,id])].slice(-1000);save();return status();}};
}
