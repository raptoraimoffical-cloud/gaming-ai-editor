import {sceneGame,selectedGame} from './game-selection.mjs';
export const POKEMON_TYPES=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const clean=s=>String(s||'').toLowerCase().replace(/[^a-z]+/g,' ').trim();
export function pokemonTypeCues(project){
 const cues=[];
 for(const scene of project.scenes){
  if(sceneGame(project,scene,selectedGame(project))!=='pokemon'&&!project.shortStyle?.startsWith('pokemon-'))continue;
  const words=scene.words||[],tokens=words.map(w=>clean(w.captionText??w.text));
  for(let i=0;i<words.length;i++){
   const parts=tokens[i].split(' '),name=parts[0];if(!POKEMON_TYPES.includes(name))continue;
   const before=tokens.slice(Math.max(0,i-6),i).join(' '),after=[...parts.slice(1),...tokens.slice(i+1,i+5)].join(' ');
   // Fire, normal, small bugs, dark rooms, etc. are ordinary speech unless
   // the local phrase identifies a Pokemon type or a type matchup.
   const explicit=/^(?:(?:and|or) [a-z]+ )?(?:types?|typing|typed|pokemon|moves?|attacks?)\b/.test(after)||/\b(?:types?|typing)(?: is| are| of| becomes| to| a| an| the)?$/.test(before);
   const matchup=/\b(?:weak(?:ness)?|weaknesses|resists?|resistant|immun(?:e|ity)|super effective|effective|strong)(?:\s+(?:against|to|versus|vs))?(?:\s+(?:the|a|an|both))?$/.test(before);
   const parallel=cues.at(-1)?.sceneId===scene.id&&i-cues.at(-1).wordIndex<=3&&/\b(?:and|or)$/.test(before)&&cues.at(-1).explicit;
   if(!explicit&&!matchup&&!parallel)continue;
   const count=parts.length>1?1:/^(?:type|types|typing|typed)$/.test(tokens[i+1])?2:1;
   cues.push({kind:'type',name,title:name[0].toUpperCase()+name.slice(1),sceneId:scene.id,start:words[i].start,end:Math.min(scene.end,words[i].start+2.2),wordIndex:i,wordCount:count,explicit:explicit||parallel,quote:words.slice(i,i+count).map(w=>w.text).join(' ')});
  }
 }
 return cues;
}
