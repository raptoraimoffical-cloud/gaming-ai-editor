const normal=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ordinary=new Set('a an the it its this that these those he she they them him her i you we us me is are was were be been have has had do does did when then there here some any what which guy person people man woman someone about of to and or but so'.split(' '));
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];}
export function spokenNameCue(scene,name){
 const tokens=normal(name).split(' ');if(!tokens.length||tokens.some(t=>ordinary.has(t)))return null;
 for(let i=0;i<(scene.words||[]).length;i++){
  const span=scene.words.slice(i,i+tokens.length),raw=normal(span.map(w=>w.captionText??w.text).join(' ')).split(' ');if(raw.length!==tokens.length||raw.some(t=>ordinary.has(t)))continue;
  if(tokens.every((t,j)=>t===raw[j]||t.length>=4&&raw[j].length>=4&&distance(t,raw[j])<=Math.max(1,Math.floor(t.length/5))))return {start:span[0].start,quote:span.map(w=>w.text).join(' ')};
 }
 return null;
}
export function subjectGrounded(project,name,request=''){
 const needle=' '+normal(name)+' ';if(!normal(name))return false;
 if([request,project.editingInstructions,project.suppliedScript,...project.scenes.map(s=>s.text)].some(s=>(' '+normal(s)+' ').includes(needle)))return true;
 return project.scenes.some(s=>(s.reaction?.entities||[]).some(e=>normal(e.name)===normal(name))||!!spokenNameCue(s,name));
}
