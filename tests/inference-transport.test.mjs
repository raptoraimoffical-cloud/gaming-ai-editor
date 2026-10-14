import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {Agent,fetch as undiciFetch} from 'undici';
import {completionFetch} from '../electron/inference-transport.mjs';import {createInferenceFetch} from '../electron/inference-provider.mjs';
async function server(t,handler){const s=http.createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>{s.closeAllConnections();s.close();});return 'http://127.0.0.1:'+s.address().port;}
test('slow inference survives disabled header/body deadlines while an ordinary timed dispatcher fails',async t=>{
 const url=await server(t,(_,res)=>setTimeout(()=>{if(!res.destroyed){res.setHeader('Content-Type','application/json');res.end('{"ready":true}');}},2500)),ordinary=new Agent({headersTimeout:20,bodyTimeout:20});t.after(()=>ordinary.close());
 await assert.rejects(undiciFetch(url,{dispatcher:ordinary}),e=>e.cause?.code==='UND_ERR_HEADERS_TIMEOUT');assert.equal((await (await completionFetch(url,{signal:new AbortController().signal})).json()).ready,true);
});
test('explicit Stop cancels a pending real inference socket rather than waiting for a response',async t=>{
 const url=await server(t,()=>{}),controller=new AbortController(),pending=completionFetch(url,{signal:controller.signal});setTimeout(()=>controller.abort(Error('Editing stopped by you')),30);await assert.rejects(pending,/Editing stopped by you/);
});
test('actual local and hosted completion routes preserve JSON, explicit cancellation and provider authentication',async t=>{
 let hostedBody,auth;const url=await server(t,async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;res.setHeader('Content-Type','application/json');if(req.url==='/v1/chat/completions'){hostedBody=JSON.parse(body);auth=req.headers.authorization;res.end(JSON.stringify({model:'hosted-trained',choices:[{message:{content:'{"ok":true}'}}]}));}else res.end(JSON.stringify({model:'local-trained',message:{content:'{"ok":true}'}}));});
 const init={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'trained',messages:[{role:'user',content:'Edit'}]}),signal:new AbortController().signal};const local=createInferenceFetch(()=>({url}));assert.equal((await (await local(url+'/api/chat',init)).json()).model,'local-trained');
 const hosted=createInferenceFetch(()=>({url:url+'/v1',provider:'hosted'}),()=> 'fixture-key');assert.equal((await (await hosted(url+'/api/chat',init)).json()).model,'hosted-trained');assert.equal(auth,'Bearer fixture-key');assert.equal(hostedBody.messages[0].content,'Edit');
});
