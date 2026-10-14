import {Agent,fetch as undiciFetch} from 'undici';
let dispatcher;
// A non-streaming local completion can legitimately take longer than Node's
// default five-minute header/body timeout. Only inference uses this dispatcher;
// discovery/image requests retain their own bounded resource checks. The job's
// AbortSignal still cancels immediately on Stop or window close.
export function completionFetch(input,init={},fetchImpl=fetch){
 if(fetchImpl!==fetch)return fetchImpl(input,init);
 dispatcher??=new Agent({headersTimeout:0,bodyTimeout:0});
 return undiciFetch(input,{...init,dispatcher});
}
