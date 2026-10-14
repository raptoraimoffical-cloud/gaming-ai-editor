import crypto from 'node:crypto';
export function googleImageCandidates(data){return (data.images_results||[]).filter(r=>r.original).slice(0,30).flatMap(r=>{
 try{const image=new URL(r.original),page=new URL(r.link||r.original);if(!['https:','http:'].includes(image.protocol)||!['https:','http:'].includes(page.protocol)||image.username||image.password||page.username||page.password)return [];
 return [{id:'google-image-'+crypto.createHash('sha256').update(image.href).digest('hex').slice(0,24),provider:'google-images',name:r.title||'Google image result',url:image.href,originalUrl:image.href,thumbnail:r.thumbnail,width:Number(r.original_width)||0,height:Number(r.original_height)||0,license:'',usageStatus:'requires-user-rights',rightsNotice:'Google Images discovery does not grant reuse rights. Check the original publisher.',attribution:{source:page.href,licenseUrl:r.license_details_url||'',credit:r.source||page.hostname,description:r.title||'',changes:'Original downloaded; scaled and animated'}}];}catch{return [];}
});}
export async function searchGoogleImages(query,key,{fetchImpl=fetch,signal}={}){
 if(!key)throw Object.assign(Error('Automatic Google Images search requires a SerpAPI key in Settings. Browse Google Images or import a direct image URL instead.'),{code:'MISSING_KEY'});
 const params={engine:'google_images',q:query,api_key:key,hl:'en',gl:'us',safe:'active',num:'30'};if(/animated.*gif/i.test(query))params.image_type='animated';
 const url='https://serpapi.com/search.json?'+new URLSearchParams(params);
 let r;try{r=await fetchImpl(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});}catch(e){if(signal?.aborted)throw Object.assign(Error('Google Images search cancelled.'),{code:'CANCELLED'});throw Error('Google Images connection timed out or failed.');}
 if(!r.ok)throw Object.assign(Error(r.status===401||r.status===403?'Invalid SerpApi key. Save a valid key in Settings.':r.status===429?'SerpApi quota exhausted. Cached results and manual imports remain available.':'Google Images provider HTTP '+r.status),{code:r.status===429?'QUOTA':r.status===401||r.status===403?'INVALID_KEY':'HTTP'});
 const data=await r.json();if(data.error)throw Object.assign(Error(/limit|quota|run out|exceed/i.test(data.error)?'SerpApi quota exhausted.':'Google Images search failed; check your provider key and quota.'),{code:/limit|quota|run out|exceed/i.test(data.error)?'QUOTA':'INVALID_KEY'});return googleImageCandidates(data);
}
