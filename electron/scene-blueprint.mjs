import {parseSuppliedTeam} from './supplied-team.mjs';
const clean=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function extractAudioScript(text=''){
 const section=/^#{1,3}\s*\d*\.?\s*(?:(?:EXACT\s+)?(?:AUDIO\s+)?SCRIPT|NARRATION|VOICEOVER(?:\s+SCRIPT)?)\s*:?\s*$([\s\S]*?)(?=^#{1,3}\s|$(?![\s\S]))/mi.exec(text)?.[1];
 return section?.match(/["“]([\s\S]+?)["”]/)?.[1]?.trim()||'';
}
export function readSceneBlueprints(text=''){
 const headers=[...text.matchAll(/^##\s*SCENE\s+(\d+)\s*[—–-]\s*(.+)$/gmi)];
 return headers.map((h,i)=>{
  const remainder=text.slice(h.index+h[0].length,headers[i+1]?.index??text.length),body=remainder.split(/^#\s+\d+\./m)[0];
  const voice=body.match(/\*?\*?Voiceover:\*?\*?\s*["“]([^"”]+)["”]/i)?.[1];
  return {id:'blueprint-'+h[1],title:h[2].trim(),voice:voice?.replace(/^\s*\.{3}|\.{3}\s*$/g,'').trim(),body:body.trim()};
 }).filter(b=>b.voice);
}
// Local word alignment tolerates ASR substitutions and omitted linking words,
// but never changes the audio or uses the guide's approximate timestamps.
export function blueprintSpokenSpan(project,quote){
 const words=project.scenes.flatMap(s=>s.words||[]),wanted=clean(quote).split(' ').filter(Boolean),tokens=words.map(w=>clean(w.captionText||w.text));
 if(!wanted.length)return;
 let best;
 for(let from=0;from<tokens.length;from++){
  if(tokens[from]!==wanted[0]&&wanted.length<5)continue;
  const n=Math.min(tokens.length-from,wanted.length+6),dp=Array.from({length:wanted.length+1},()=>Array(n+1).fill(Infinity));dp[0][0]=0;
  for(let i=0;i<=wanted.length;i++)for(let j=0;j<=n;j++){
   if(i<wanted.length)dp[i+1][j]=Math.min(dp[i+1][j],dp[i][j]+1);
   if(j<n)dp[i][j+1]=Math.min(dp[i][j+1],dp[i][j]+1);
   if(i<wanted.length&&j<n)dp[i+1][j+1]=Math.min(dp[i+1][j+1],dp[i][j]+(wanted[i]===tokens[from+j]?0:1));
  }
  for(let j=Math.max(1,wanted.length-5);j<=n;j++){const cost=dp[wanted.length][j]/wanted.length;if(cost<=.34&&(!best||cost<best.cost))best={cost,from,to:from+j-1};}
 }
 return best?{start:words[best.from].start,end:words[best.to].end,confidence:1-best.cost,words:words.slice(best.from,best.to+1)}:undefined;
}
export function planSceneBlueprint(project,text=project.editingInstructions||''){
 const scenes=readSceneBlueprints(text).map(b=>({...b,span:blueprintSpokenSpan(project,b.voice)}));
 for(let i=0;i<scenes.length;i++)if(scenes[i].span){scenes[i].start=scenes[i].span.start;scenes[i].end=scenes.slice(i+1).find(b=>b.span&&b.span.start>scenes[i].start)?.span.start??project.duration;}
 return {scenes:scenes.filter(b=>b.span&&b.end>b.start),unmatched:scenes.filter(b=>!b.span).map(b=>({id:b.id,voice:b.voice,reason:'No confident matching words in the recording'}))};
}
export function blueprintRequirements(project){
 const plan=planSceneBlueprint(project),team=parseSuppliedTeam(project.editingInstructions),requirements=[];
 for(const b of plan.scenes){
  const name=b.body.match(/(?:verified|authentic)\s+photo\s+of\s+([\p{L}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3})/u)?.[1];
  if(name){const scene=project.scenes.find(s=>s.start<=b.start&&s.end>b.start);requirements.push({kind:'image',name,type:'person',franchise:'unknown',query:name+' portrait photo',sceneId:scene.id,quote:b.span.words.slice(0,Math.min(4,b.span.words.length)).map(w=>w.text).join(' '),duration:b.end-b.start,members:[]});}
 }
 const reveal=plan.scenes.find(b=>/reveal.*(?:six|team|roster)/i.test(b.title)),hold=plan.scenes.find(b=>/full build|pause.*build/i.test(b.title));
 if(team.length&&reveal){const scene=project.scenes.find(s=>s.start<=reveal.start&&s.end>reveal.start);requirements.push({kind:'group',name:'Full supplied team',type:'pokemon',franchise:'pokemon',query:'',sceneId:scene.id,quote:reveal.span.words.slice(0,5).map(w=>w.text).join(' '),duration:(hold?.end??reveal.end)-reveal.start,members:team});}
 return requirements;
}
