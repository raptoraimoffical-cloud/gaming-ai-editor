import {CORE_MOVES} from './move-effects.mjs';
import {normalize,timeAt} from './reactions.mjs';
const ordinary=new Set('Who Whose Which With Who He She They It Its Has Had Uses Used Said Says Won Wins Winning Finished Goes Gets The A An And But At After Before Over Under This That These Those One Two Three Four Five Six Every Each Pokemon Pokémon Mega Regional Championship World Tournament Life Orb Choice Specs Fake Out Good Gold Make It Rain Shadow Ball Tail Wind Nasty Plot'.toLowerCase().split(' '));
// Model proposals remain the primary route. Recover clear named people in a
// player/creator sentence when that route omitted the subject. Never turn a
// Pokemon or move title into a person's photograph.
export function discoverNamedPeople(scene,project){
 const text=scene.text||'',found=[],blocked=new Set([...CORE_MOVES.map(m=>normalize(m.title)),...project.media.flatMap(m=>m.pokemon?[m.pokemon.name,m.pokemon.displayName,m.pokemon.speciesName].map(normalize):[])]);
 const existing=new Set((scene.aiSubjects||[]).map(e=>normalize(e.name)));
 const patterns=[/\b(?:player|creator|trainer|streamer|competitor|person|guy|woman|man)\s+(?:(?:named|called)\s+)?([A-Za-z][\w'-]*(?:\s+[A-Z][\w'-]*){0,2})/g,/\b([A-Z][a-z][\w'-]*(?:\s+[A-Z][a-z][\w'-]*){1,2})\b/g];
 for(const re of patterns)for(const match of text.matchAll(re)){
  const name=match[1],key=normalize(name),index=match.index+match[0].indexOf(name),context=text.slice(Math.max(0,index-35),index+name.length+90);
  if(existing.has(key)||blocked.has(key)||name.split(/\s+/).some(w=>ordinary.has(w.toLowerCase()))||!/(?:\b(?:player|creator|trainer|streamer|competitor|person|guy|woman|man|won|wins|finished|said|says|champion|record|defeated|beat|made|uploaded|told|announced|entered)\b)/i.test(context))continue;
  const entity={id:key.replaceAll(' ','-'),name,type:'person',start:timeAt(scene,index),aliases:[name],query:name+' player portrait photo',identity:[key],franchise:'unknown',theme:'esports',explicitLiteral:true,source:'Named person in an actual player or creator narration clause'};found.push(entity);existing.add(key);
 }
 return found;
}
