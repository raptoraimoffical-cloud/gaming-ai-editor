const normal=t=>t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const aliases={netherite:['neverright','neverwrite','netherright'],warden:['wardon','worrden'],creeper:['creaper','creper'],creepers:['creapers','crepers'],incineroar:['incineror','incinerar'],delibird:['dellabird','dellibird']};
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const before=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,last+(a[i-1]===b[j-1]?0:1));last=before;}}return row[b.length];}
export function alignScript(segments,script=''){
 if(!script.trim())return {segments:structuredClone(segments),report:{used:false,corrections:[],unusedScriptWords:0,reason:'Voiceover only; Whisper timestamps retained'}};
 if(script.length>100000)throw Error('Script exceeds 100,000 characters');
 const spoken=segments.flatMap(s=>s.words||[]),written=script.match(/\S+/g)||[];if(spoken.length*written.length>3e6)throw Error('Script alignment exceeds the laptop budget; shorten the optional script');
 const n=spoken.length,m=written.length,dp=Array.from({length:n+1},()=>new Float64Array(m+1).fill(Infinity)),back=Array.from({length:n+1},()=>Array(m+1));dp[0][0]=0;
 const update=(i,j,v,step)=>{if(v<dp[i][j]){dp[i][j]=v;back[i][j]=step;}};
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
  if(i<n)update(i+1,j,dp[i][j]+1,{i,j,kind:'spoken'});if(j<m)update(i,j+1,dp[i][j]+1,{i,j,kind:'script'});
  if(i<n&&j<m)for(let count=1;count<=Math.min(3,n-i);count++){
   const a=normal(spoken.slice(i,i+count).map(w=>w.text).join('')),b=normal(written[j]);const known=aliases[b]?.includes(a),exact=a===b;
   const fuzzy=!exact&&count===1&&a.length>=4&&b.length>=4&&a[0]===b[0]&&distance(a,b)/Math.max(a.length,b.length)<=.25;
   if(exact||known||fuzzy)update(i+count,j+1,dp[i][j]+(exact?0:known?.1:.4),{i,j,kind:'match',count,correct:known||fuzzy,confidence:exact?1:known?.95:.75});
  }
 }
 let i=n,j=m;const steps=[];while(i||j){const s=back[i][j];if(!s)break;steps.push(s);i=s.i;j=s.j;}steps.reverse();
 const replacements=new Map(),removed=new Set(),corrections=[];
 for(const s of steps){if(s.kind!=='match')continue;const ws=spoken.slice(s.i,s.i+s.count),original=ws.map(w=>w.text).join(' '),text=written[s.j];if(s.correct||s.count===1&&normal(original)===normal(text)&&original!==text){replacements.set(ws[0],{...ws[0],text,originalText:original,end:ws.at(-1).end});for(const w of ws.slice(1))removed.add(w);corrections.push({original,text,start:ws[0].start,end:ws.at(-1).end,confidence:s.confidence});}}
 return {segments:segments.map(s=>{const words=s.words.filter(w=>!removed.has(w)).map(w=>replacements.get(w)||{...w});return {...s,words,text:words.map(w=>w.text).join(' ')};}),report:{used:true,corrections,unusedScriptWords:steps.filter(s=>s.kind==='script').length,unmatchedSpokenWords:steps.filter(s=>s.kind==='spoken').length,reason:'Aligned to spoken words. Unspoken script words were omitted; narration audio and timestamp intervals retained.'}};
}
