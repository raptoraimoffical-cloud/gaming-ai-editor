import {quoteTime} from './local-animator.mjs';
import {normalize} from './reactions.mjs';
import {franchiseForEntity} from './asset-identity.mjs';
export function narratedSubjects(scene,subjects=[]){
 const found=[];
 for(const s of subjects.slice(0,20)){
  if(!s||typeof s.name!=='string'||typeof s.quote!=='string'||typeof s.query!=='string'||s.name.length<3||s.name.length>70||s.query.length>180||!['character','object','person','game','hardware'].includes(s.type))continue;
  const name=normalize(s.name),quote=normalize(s.quote);if(!(' '+quote+' ').includes(' '+name+' '))continue;
  let start;try{start=quoteTime(scene,s.quote);}catch{continue;}
  if(found.some(e=>normalize(e.name)===name))continue;
  const entity={id:name.replaceAll(' ','-'),name:s.name,type:s.type,start,aliases:[s.name],query:s.query,identity:[name],franchise:s.franchise||'unknown',source:'Model-proposed subject verified against actual narration'};
  found.push({...entity,franchise:franchiseForEntity(entity)});
 }
 return found;
}
