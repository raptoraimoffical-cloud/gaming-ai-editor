import {modelIdleSeconds} from './ai-performance.mjs';
import {planVisualInstructions} from './visual-instructions.mjs';
import {planBattle} from './battle-choreography.mjs';
import {planAttention,clearAttention} from './attention-director.mjs';
import {planShots} from './shot-director.mjs';
import {planLocalAnimations} from './local-animator.mjs';
import {planQuickStory} from './quick-story-plan.mjs';
import {createInferenceFetch,validateInferenceSettings} from './inference-provider.mjs';
import {analyzeNarration,modelChat} from './inference-trace.mjs';
import {ensureLocalRuntime} from './local-runtime.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {directWithReview} from './local-ai-pipeline.mjs';
import sharp from 'sharp';
import {validateBackgroundSettings} from './local-backgrounds.mjs';
const exec=promisify(execFile);
export const QUALITY_MODES={fast:{candidates:3,storyPasses:1,planningPasses:0,frameSamples:0,alternatives:1,reviewPasses:0,maxRevisions:0},balanced:{candidates:6,planningPasses:1,frameSamples:0,alternatives:1,reviewPasses:0,maxRevisions:0},high:{candidates:12,planningPasses:2,frameSamples:4,alternatives:2,reviewPasses:2,maxRevisions:2},ultra:{candidates:24,planningPasses:3,frameSamples:12,alternatives:4,reviewPasses:3,maxRevisions:4}};
export function createLocalAI(folder,{fetchImpl=fetch,getApiKey=()=>''}={}){
 const file=path.join(folder,'local-ai-settings.json');let controller,jobSignal,detachJob;
 const settings=()=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{url:'http://127.0.0.1:11434',models:{}};
 const rawFetch=fetchImpl;fetchImpl=createInferenceFetch(settings,getApiKey,rawFetch);const capabilityCache=new Map();
 async function capabilities(m,s,u,request){
  const key=m.digest?JSON.stringify([s.provider||'ollama',u.href,m.name,m.digest]):null;
  if(key&&capabilityCache.has(key))return [...capabilityCache.get(key)];
  const r=await request(new URL('/api/show',u),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:m.name}),signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw Error('Model metadata HTTP '+r.status);const value=(await r.json()).capabilities;
  if(!Array.isArray(value)||value.some(v=>typeof v!=='string'))return [];
  if(key){if(capabilityCache.size>=64)capabilityCache.delete(capabilityCache.keys().next().value);capabilityCache.set(key,[...value]);}
  return value;
 }
 async function discover(override){const s={...settings(),...override};const discoverFetch=createInferenceFetch(()=>s,getApiKey,rawFetch);if(s.provider!=='hosted'&&rawFetch===fetch)await ensureLocalRuntime(s.url);const hardware={ramTotal:os.totalmem(),ramAvailable:os.freemem(),gpus:[],diskAvailable:0};
  try{hardware.diskAvailable=fs.statfsSync(folder).bavail*fs.statfsSync(folder).bsize;}catch{}
  try{const {stdout}=await exec('nvidia-smi',['--query-gpu=name,memory.total,memory.free','--format=csv,noheader,nounits'],{windowsHide:true,timeout:5000});hardware.gpus=stdout.trim().split('\n').map(line=>{const [name,total,free]=line.split(',').map(s=>s.trim());return {name,vramMB:Number(total),freeMB:Number(free)};});}catch{}
  let models=[],error,loaded=[];try{const u=new URL(s.url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Use a valid inference server URL');const r=await discoverFetch(new URL('/api/tags',u),{signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Ollama HTTP '+r.status);models=(await r.json()).models||[];try{const r=await discoverFetch(new URL('/api/ps',u),{signal:AbortSignal.timeout(4000)});if(r.ok)loaded=(await r.json()).models||[];}catch{}
   models=await Promise.all(models.map(async m=>{if(s.provider==='hosted')return m;try{return {...m,capabilities:await capabilities(m,s,u,discoverFetch)};}catch{return {...m,capabilities:[]};}}));
  }catch(e){error='Local models unavailable: '+e.message;}
  return {settings:s,hardware,models,loaded,error};
 }
 async function save(s){validateInferenceSettings(s);delete s.apiKey;if(s.keepAliveSeconds!==undefined&&(!Number.isInteger(s.keepAliveSeconds)||s.keepAliveSeconds<0||s.keepAliveSeconds>600))throw Error('Model idle retention must be between 0 and 600 seconds');validateBackgroundSettings(s.imageGeneration);const url=new URL(s.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid local inference URL');for(const [key,max] of Object.entries({candidateLimit:24,alternatives:4,reviewPasses:4,maxRevisions:4,contextLength:32768,memoryLimitGB:128}))if(s[key]!==undefined&&(!Number.isInteger(s[key])||s[key]<1||s[key]>max))throw Error(key+' must be between 1 and '+max);if(s.processingPreference&&!['auto','cpu','gpu'].includes(s.processingPreference))throw Error('Choose automatic, CPU or GPU processing');const data=await discover(s);for(const name of Object.values(s.models||{}))if(name&&!data.models.some(m=>m.name===name))throw Error('Model is not installed: '+name);for(const role of ['vision','review'])if(s.models?.[role]&&!data.models.find(m=>m.name===s.models[role])?.capabilities.includes('vision'))throw Error(role+' needs an image-capable model');fs.writeFileSync(file,JSON.stringify(s,null,2));return data;}
 function check(){if(controller?.signal.aborted)throw Error('Editing stopped by you. The previous video is unchanged.');}
 function beginJob(signal){detachJob?.();jobSignal=signal;const owned=new AbortController();controller=owned;const stop=()=>owned.abort(signal.reason);if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});detachJob=()=>signal.removeEventListener('abort',stop);}
 function endJob(){detachJob?.();detachJob=undefined;jobSignal=undefined;}
 async function begin(mode='balanced',{useAI=true}={}){if(!QUALITY_MODES[mode])throw Error('Unknown AI quality mode');if(!jobSignal)controller=new AbortController();check();
  // Explicit model-free diagnostics/edits stay offline. Quick Draft itself uses
  // a compact fresh storyboard, while skipping layout alternatives and review.
  if(!useAI)return {mode,cfg:{...QUALITY_MODES[mode],storyPasses:0},settings:settings(),models:{},hardware:{ramTotal:os.totalmem(),ramAvailable:os.freemem(),gpus:[],diskAvailable:0},signal:controller.signal,started:Date.now(),limitations:[]};
  const data=await discover(),cfg={...QUALITY_MODES[mode]};if(data.settings.candidateLimit)cfg.candidates=Math.min(cfg.candidates,data.settings.candidateLimit);
  for(const key of ['alternatives','reviewPasses','maxRevisions'])if(data.settings[key]&&cfg[key])cfg[key]=Math.min(4,data.settings[key]);const remoteEndpoint=!['localhost','127.0.0.1','[::1]'].includes(new URL(data.settings.url).hostname);const installed=name=>data.models.find(m=>m.name===name),role=kind=>installed(data.settings.models?.[kind])||(['vision','review'].includes(kind)?data.models.find(m=>m.capabilities.includes('vision')):data.models.filter(m=>!m.capabilities.includes('embedding')&&(remoteEndpoint||m.size<Math.min(Math.max(2e9,data.hardware.ramAvailable*.55),(data.settings.memoryLimitGB||16)*1073741824))).sort((a,b)=>['high','ultra'].includes(mode)?b.size-a.size:a.size-b.size)[0]);
  const models={reasoning:role('reasoning'),planning:role('planning'),vision:role('vision'),review:role('review'),...(installed(data.settings.models?.editing)?{editing:installed(data.settings.models.editing)}:{})};
  if(mode==='ultra'&&(!models.reasoning||!models.vision?.capabilities.includes('vision')))throw Error('Ultra Quality requires an installed reasoning model and a vision-capable model. No weights were downloaded. Configure local models in Advanced AI settings or use Fast, Balanced, or High with its disclosed structural fallback.');
  const limitations=data.error?[data.error]:[];const remote=!['localhost','127.0.0.1','[::1]'].includes(new URL(data.settings.url).hostname);if(remote)limitations.push('Remote inference endpoint configured. Laptop hardware readings do not describe the inference server.');for(const m of new Set(Object.values(models).filter(Boolean)))if(!remote&&m.size>(data.hardware.gpus[0]?.freeMB||0)*1048576)limitations.push(m.name+' may need CPU/RAM offloading. Model file size is an estimate; actual inference requires additional memory.');return {mode,cfg,...data,models,signal:controller.signal,started:Date.now(),limitations};
 }
 async function direct(project,state,progress,preview){return directWithReview(project,state,progress,preview,{folder,check,fetchImpl});}
 async function locateAttachment(state,media,anchor){
  check();const models=[state?.models?.vision,...(['high','ultra'].includes(state?.mode)?[state?.models?.reasoning]:[])].filter((m,i,all)=>m?.capabilities?.includes('vision')&&all.findIndex(p=>p?.name===m.name)===i);
  if(!models.length)return {available:false};
  const image=await sharp(media.path).resize(768,768,{fit:'inside',withoutEnlargement:true}).flatten({background:'#bbbbbb'}).png().toBuffer();
  let reason='No confident visible anatomical point';
  for(const model of models)try{
   const r=await fetchImpl(new URL('/api/chat',state.settings.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:state.signal,body:JSON.stringify({model:model.name,stream:false,think:false,keep_alive:modelIdleSeconds(state.settings),format:{type:'object',additionalProperties:false,required:['x','y','confidence'],properties:{x:{type:'number',minimum:0,maximum:1000},y:{type:'number',minimum:0,maximum:1000},confidence:{type:'number',minimum:0,maximum:1}}},options:{temperature:0,num_ctx:4096},messages:[{role:'user',content:'Locate an accessory attachment point on this actual character artwork: '+media.name+'. Desired body part: '+anchor+'. For neck, first locate the head, then trace the visible body connection directly BELOW the head. Put the point on the middle of that neck connection where a scarf would wrap. Do not select its mouth, beak, a leaf, wing, tail or the image center. For head use its crown; for hand use a visible grasping hand. Return JSON {x:number,y:number,confidence:number}, coordinates normalized to 0-1000 from the top-left of the ENTIRE image. Use confidence below 0.8 if uncertain or there is no such visible body part. Do not guess an invisible hand.',images:[image.toString('base64')]}]})});
   if(!r.ok)throw Error('HTTP '+r.status);const raw=JSON.parse((await r.json()).message.content),point={x:raw.x/1000,y:raw.y/1000,confidence:raw.confidence};
   if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1||point.y<0||point.y>1||point.confidence<.8)continue;
   const dims=await sharp(media.path).metadata(),pixel=await sharp(media.path).extract({left:Math.min(dims.width-1,Math.floor(point.x*dims.width)),top:Math.min(dims.height-1,Math.floor(point.y*dims.height)),width:1,height:1}).ensureAlpha().raw().toBuffer();
   if(pixel.at(-1)<48){reason='Vision coordinate was on transparent padding; tried another installed vision-capable model';continue;}
   return {...point,available:true,model:model.name};
  }catch(e){check();reason=e.message;}
  return {available:false,reason};
 }
 async function evaluateMoveset(state,pokemon,file){
  check();const model=state?.models?.vision;if(!model?.capabilities?.includes('vision'))return {available:false};
  try{const image=await sharp(file).resize(1200,1200,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
   const r=await fetchImpl(new URL('/api/chat',state.settings.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:state.signal,body:JSON.stringify({model:model.name,stream:false,think:false,keep_alive:modelIdleSeconds(state.settings),format:'json',options:{temperature:0,num_ctx:4096},messages:[{role:'user',content:'Read the actual printed Pokemon moveset in this image. Desired exact Pokemon/form: '+pokemon.title+'. Return JSON {accepted:boolean,pokemon:string,moves:string[]}. Transcribe 2 to 4 move names ONLY from this image, never remembered knowledge. Reject unclear text, wrong Pokemon or form, collages of multiple builds/characters and trading cards. This is a sourced example moveset, not proof of best competitive performance.',images:[image.toString('base64')]}]})});
   if(!r.ok)throw Error('HTTP '+r.status);const value=JSON.parse((await r.json()).message.content);if(typeof value.accepted!=='boolean'||!Array.isArray(value.moves))throw Error('Invalid moveset inspection');return {...value,available:true,model:model.name};
  }catch(e){check();return {available:false,reason:e.message};}
 }
 async function evaluateMoveCard(state,move,file){
  check();const model=state?.models?.vision;
  if(!model?.capabilities?.includes('vision'))return {available:false,reason:'A trained vision model is needed to verify sourced mechanic images'};
  try{
   const image=await sharp(file).resize(1200,1200,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
   const instruction=move.kind==='type'?'We need the published Pokemon video-game '+move.title+' type icon or type badge. Accept a clean single game type label/icon with the requested type visibly identifiable; a description is not required. Reject a different type, a multi-type chart/sheet, merchandise, invented fan diagrams and unrelated elemental artwork. Transcribe its visible type name into name; description may be empty.':'We need a readable Pokemon video-game '+(move.kind||'move')+' information image for '+move.title+'. Transcribe the exact mechanic name and its actual description from the image; do not supply remembered knowledge. Reject unreadable text, a different mechanic, trading cards, collages with unrelated mechanics, invented fan diagrams, or a name without a description. A real game summary screen may list other moves; accept it when the requested move is clearly selected and its own description is readable. Check visible description against this reference when present: '+JSON.stringify({name:move.title,description:move.description,type:move.type,power:move.power,accuracy:move.accuracy})+'.';
   const r=await fetchImpl(new URL('/api/chat',state.settings.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:state.signal,body:JSON.stringify({model:model.name,stream:false,think:false,keep_alive:modelIdleSeconds(state.settings),format:'json',options:{temperature:0,num_ctx:4096},messages:[{role:'user',content:'Read ONLY text visibly printed in this image. '+instruction+' Return JSON {accepted:boolean,name:string,description:string,reason:string}. Never invent text missing from the image.',images:[image.toString('base64')]}]})});
   if(!r.ok)throw Error('HTTP '+r.status);const value=JSON.parse((await r.json()).message.content);
   if(typeof value.accepted!=='boolean'||typeof value.name!=='string'||typeof value.description!=='string')throw Error('Invalid move-card inspection');
   return {...value,available:true,model:model.name};
  }catch(e){check();return {available:true,accepted:false,reason:'Move-card inspection failed: '+e.message,model:model.name};}
 }
 async function evaluateAsset(state,entity,proxy){
  check();const model=state.models.vision;if(!model?.capabilities.includes('vision')||!['high','ultra'].includes(state.mode))return {available:false,reason:'Semantic asset inspection is not configured for this mode'};
  try{const r=await fetchImpl(new URL('/api/chat',state.settings.url),{method:'POST',headers:{'Content-Type':'application/json'},signal:state.signal,body:JSON.stringify({model:model.name,stream:false,think:false,keep_alive:modelIdleSeconds(state.settings),format:'json',options:{temperature:0,num_ctx:state.settings.contextLength||4096,...(state.settings.processingPreference==='cpu'?{num_gpu:0}:{})},messages:[{role:'user',content:'Inspect this candidate image. Does the actual depicted subject match '+entity.name+' from the correct game/franchise? Metadata does not prove identity. Reject uncertain identities, wrong forms/franchises, text-only signs, and photographs of unrelated people. Return JSON {accepted:boolean,reason:string}. This does not verify licensing. Desired context: '+JSON.stringify(entity),images:[fs.readFileSync(proxy).toString('base64')]}]})});if(!r.ok)throw Error('HTTP '+r.status);const result=JSON.parse((await r.json()).message.content);if(typeof result.accepted!=='boolean'||typeof result.reason!=='string')throw Error('Invalid asset inspection response');return {available:true,accepted:result.accepted,reason:result.reason.slice(0,1200),model:model.name};}catch(e){check();return {available:true,accepted:false,reason:'Asset inspection failed: '+e.message,model:model.name};}
 }

 async function editingSettings(){const data=await discover();const model=data.models.find(m=>m.name===data.settings.models?.editing)||data.models.find(m=>m.name===data.settings.models?.reasoning)||data.models.find(m=>m.name===data.settings.models?.planning)||data.models.find(m=>m.capabilities?.includes('completion'));return {url:data.settings.url,provider:data.settings.provider||'ollama',model:model?.name,supportsVision:!!model?.capabilities?.includes('vision'),preferExactCommands:true,signal:controller?.signal,fetchImpl,contextLength:data.settings.contextLength,connectionError:data.error};}
 async function install(model,progress=()=>{}){const s=settings();if(s.provider==='hosted')throw Error('Choose local Ollama before downloading weights');if(!/^[a-zA-Z0-9][\w./:-]{0,160}$/.test(model))throw Error('Invalid model name');await ensureLocalRuntime(s.url);if(!jobSignal)controller=new AbortController();check();const r=await rawFetch(new URL('/api/pull',s.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:true}),signal:controller.signal});if(!r.ok)throw Error('Model download failed (HTTP '+r.status+')');const reader=r.body.getReader(),decoder=new TextDecoder();let pending='',success=false;while(true){const {done,value}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});const lines=pending.split('\n');pending=lines.pop();if(done&&pending)lines.push(pending);for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line);if(event.error)throw Error(event.error);success ||= event.status==='success';progress({stage:'Model '+model+': '+event.status,percent:event.total?100*event.completed/event.total:undefined});}if(done)break;}if(!success)throw Error('Model download ended without verification');return discover();}
 async function animate(project,state,profile,progress){
  project=clearAttention(project);
  const url=new URL(state.settings.url);let localState=state;
  if(state.settings.provider==='hosted'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)){
   const data=await discover({provider:'ollama',url:'http://127.0.0.1:11535'});const model=data.models.find(m=>m.name==='qwen3.5:4b')||data.models.find(m=>m.capabilities?.includes('completion'));state.inferenceEvents??=[];
   localState={...state,settings:{...data.settings,provider:'ollama'},models:{reasoning:model}};
  }
  const directed=await planShots(project,localState,progress,rawFetch);return planLocalAnimations(directed,localState,profile,progress,rawFetch);
 }
 return {chat:(state,model,messages,opts={})=>modelChat(state,model,messages,{...opts,fetchImpl}),planVisualInstructions:(p,t,s,progress,c)=>planVisualInstructions(p,t,s,progress,c,fetchImpl),beginJob,endJob,battle:(p,r,ids,state)=>planBattle(p,r,ids,state,fetchImpl),animate,author:(p,s,progress)=>planQuickStory(p.attentionPlan?.version>=2&&p.youtubeStrategy?p:planAttention(p),s,progress,fetchImpl),install,editingSettings,analyze:(p,s,progress)=>analyzeNarration(p,s,progress,fetchImpl),discover,save,settings,begin,direct,evaluateAsset,evaluateMoveCard,evaluateMoveset,locateAttachment,check,cancel(){controller?.abort();}};
}
