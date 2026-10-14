import {completionFetch} from './inference-transport.mjs';
export function validateInferenceSettings(settings) {
 const u=new URL(settings.url);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('Use a valid inference endpoint without credentials or query parameters');
 if(settings.provider==='hosted'&&u.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error('Hosted API keys require an HTTPS endpoint');
 if(settings.provider&&!['ollama','hosted'].includes(settings.provider))throw Error('Unknown inference provider');
}

export function createInferenceFetch(getSettings,getKey=()=>'',fetchImpl=fetch) {
 return async (input,init={})=>{
  const settings=getSettings();
  if(settings.provider!=='hosted')return /\/api\/(?:chat|generate)$/.test(new URL(input).pathname)?completionFetch(input,init,fetchImpl):fetchImpl(input,init);
  validateInferenceSettings(settings);
  const route=new URL(input).pathname;
  const base=settings.url.replace(/\/$/,'');
  const key=await getKey();
  const headers={'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})};
  if(route.endsWith('/api/ps'))return Response.json({models:[]});
  if(route.endsWith('/api/show'))return Response.json({capabilities:['completion',...(settings.hostedVision?['vision']:[])]});
  if(route.endsWith('/api/tags')) {
   const r=await fetchImpl(base+'/models',{headers,signal:init.signal});
   if(!r.ok)return r;
   const data=await r.json();
   return Response.json({models:(data.data||[]).filter(m=>!m.architecture?.output_modalities||m.architecture.output_modalities.includes('text')).map(m=>({name:m.id,size:0,digest:m.id,contextLength:m.context_length,capabilities:['completion',...(m.architecture?.input_modalities?.includes('image')||!m.architecture?.input_modalities&&settings.hostedVision?['vision']:[])]}))});
  }
  if(!route.endsWith('/api/chat'))throw Error('This operation is only supported by local Ollama');
  const body=JSON.parse(init.body);
  const messages=body.messages.map(({images,...m})=>images?.length?{...m,content:[{type:'text',text:m.content},...images.map(b=>({type:'image_url',image_url:{url:'data:image/png;base64,'+b}}))]}:m);
  // JSON mode is portable across providers; application schemas validate every result.
  if(body.format&&typeof body.format==='object')messages.unshift({role:'system',content:'Return only JSON matching this schema: '+JSON.stringify(body.format)});
  const requested=body.options?.num_predict,configured=settings.hostedMaxTokens||8192;
  const max_tokens=Number.isInteger(requested)&&requested>0?Math.min(configured,requested):configured;
  const r=await completionFetch(base+'/chat/completions',{...init,headers,body:JSON.stringify({model:body.model,messages,stream:false,temperature:body.options?.temperature??0,max_tokens,response_format:{type:'json_object'}})},fetchImpl);
  if(!r.ok)return r;
  const d=await r.json();
  const content=d.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim())throw Error('Hosted model returned no edit instructions');
  return Response.json({model:d.model||body.model,message:{content},prompt_eval_count:d.usage?.prompt_tokens,eval_count:d.usage?.completion_tokens,load_duration:0});
 };
}
