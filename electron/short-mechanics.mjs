import {CORE_MOVES} from './move-effects.mjs';
import {projectGame} from './game-presentation.mjs';
import {normalize} from './reactions.mjs';
import {mechanicMention} from './mechanic-context.mjs';
import {matchMechanic} from './mechanic-name.mjs';

// Cards require both an exact spoken name and real source metadata. The model
// cannot invent a move, a rule, a probability or a stat to fill the screen.
export async function enrichShortMechanics(project,service,progress=()=>{}){
 if(projectGame(project)!=='pokemon'&&!project.shortStyle?.startsWith('pokemon-'))return project;
 const cues=[],warnings=[];let catalog;
 try{catalog=await service.mechanicCatalog();}catch(e){catalog=CORE_MOVES;warnings.push('Move/ability catalog unavailable; using bundled source metadata for core moves: '+e.message);}
 const names=catalog.map(m=>({...m,tokens:normalize(m.name).split(' ')})).sort((a,b)=>b.tokens.length-a.tokens.length);
 const cache=new Map();
 for(const scene of project.scenes){
  const words=scene.words||[],tokens=words.map(w=>normalize(w.captionText||w.text));
  for(let i=0;i<words.length;i++){
   const match=matchMechanic(words,i,names);if(!match)continue;const found=match.entry;
   const key=found.kind+'/'+found.name;
   try{progress({stage:'Checking '+found.kind+': '+found.name});if(!cache.has(key))cache.set(key,await service.mechanic(found.kind,found.name).catch(e=>{const known=CORE_MOVES.find(m=>m.name===found.name);if(known)return known;throw e;}));const data=cache.get(key);cues.push({...data,sceneId:scene.id,start:words[i].start,end:scene.end,quote:words.slice(i,i+match.count).map(w=>w.text).join(' '),wordIndex:i,wordCount:match.count,corrected:match.corrected});}catch(e){warnings.push(found.name+': '+e.message);}
   i+=match.count-1;
  }
 }
 return {...project,shortMechanics:{cues,warnings:[...new Set(warnings)]}};
}
