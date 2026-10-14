import fs from 'node:fs';
import crypto from 'node:crypto';
const bundled=JSON.parse(fs.readFileSync(new URL('./data/pokemon-names.json',import.meta.url),'utf8'));
export const BUNDLED_POKEMON=bundled.records;
export const POKEMON_LEXICON={species:bundled.speciesCount,identifiers:bundled.records.length,source:bundled.source};
export const normalizePokemon=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/♀/g,' female ').replace(/♂/g,' male ').replace(/[’']s\b/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const forms={mega:'mega',alolan:'alola',alola:'alola',galarian:'galar',galar:'galar',hisuian:'hisui',hisui:'hisui',paldean:'paldea',paldea:'paldea',gigantamax:'gmax',gmax:'gmax',primal:'primal',origin:'origin',altered:'altered',therian:'therian',incarnate:'incarnate',sky:'sky',land:'land',attack:'attack',defense:'defense',speed:'speed',wash:'wash',heat:'heat',frost:'frost',fan:'fan',mow:'mow',white:'white',black:'black',crowned:'crowned',eternamax:'eternamax',rider:'rider',resolute:'resolute',pirouette:'pirouette',blade:'blade',shield:'shield',sunshine:'sunshine',sunny:'sunny',rainy:'rainy',snowy:'snowy',zen:'zen',school:'school',complete:'complete',ash:'ash',busted:'busted',gulping:'gulping',gorging:'gorging',low:'low',amped:'amped',unbound:'unbound',female:'female',male:'male'};
const safeCorrections={'char az ard':'charizard','char iz ard':'charizard','char is art':'charizard','char zard':'charizard','inciner roar':'incineroar','in cinema roar':'incineroar','in cineror':'incineroar','in cinaror':'incineroar','delhi bird':'delibird','deli bird':'delibird','dellie bird':'delibird','dellybird':'delibird','halucha':'hawlucha','hallucha':'hawlucha','corvenant':'corviknight','corvenight':'corviknight','frostlust':'froslass','frostlass':'froslass','guard chomp':'garchomp','poly toad':'politoed','polytoad':'politoed'};
const contextualCorrections={'sneezler':'sneasler','snyzler':'sneasler','sneez ler':'sneasler','snee zler':'sneasler','sneaze ler':'sneasler','gengambit':'kingambit','kengambit':'kingambit','geng gambit':'kingambit','incinerator':'incineroar','waterdle':'wartortle','war turtle':'wartortle','blast was':'blastoise','blast toys':'blastoise','seal':'seel','onyx':'onix','slow king':'slowking','slow bro':'slowbro','frost lust':'froslass','frost last':'froslass','king gambit':'kingambit','mr mime':'mr-mime','mime junior':'mime-jr','tataroth':'tyranitar','serenitor':'tyranitar',
 'setile':'sceptile','septile':'sceptile','scept aisle':'sceptile','sep tile':'sceptile','set tile':'sceptile','scep tile':'sceptile','basky legion':'basculegion','bas ky legion':'basculegion','bascu legion':'basculegion','bascul legion':'basculegion','baskulegion':'basculegion','basky leg ion':'basculegion','p k chuth':'pikachu','p k chu':'pikachu','pika chew':'pikachu','gardevoir':'gardevoir','guard of war':'gardevoir','salamance':'salamence','sal a mence':'salamence','metta gross':'metagross','meta gross':'metagross','aero dactyl':'aerodactyl','kangas khan':'kangaskhan','lucario':'lucario','luke ario':'lucario','am faros':'ampharos','amph a ros':'ampharos','ty ran itar':'tyranitar','mega setile':'mega sceptile'};
const common=new Set(('pokemon gaming ranking compared strongest evolution regional strategy champions championship tournament entrants move moves ability abilities team damage attack attacks battle player players picture video image words regular always never actually people everyone context best first second third more many very then from into with after before because instead however about around really works should could would does doesnt dont want need use uses used using game games over under snow rain another time speed power support target targets turn choice held item boost boosts stronger weaker special normal protect guard train mint chance percent accuracy life living playing taking winning different').split(' '));
// Proper names match first. Fuzzy recovery cannot turn real English narration
// (e.g. “perfect”, “might be”, “monkey”) into unrelated Pokémon.
const englishWords=new Set(fs.readFileSync(new URL('./data/english-name-guard.txt',import.meta.url),'utf8').split('\n').map(normalizePokemon));
const domain=/\b(pokemon|pokedex|vgc|showdown|evolv\w*|pokeball)\b/;
const indices=new WeakMap();
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];}
const phonetic=s=>normalizePokemon(s).replace(/ph/g,'f').replace(/g(?=[eiy])/g,'j').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k').replace(/[aeiouy ]/g,'').replace(/(.)\1+/g,'$1');
export function pokemonAliases(entry){
 const parts=normalizePokemon(entry.name).split(' '),out=[parts.join(' '),...(entry.aliases||[]).map(normalizePokemon)];if(entry.displayName)out.push(normalizePokemon(entry.displayName));
 const isForm=!entry.species||entry.name!==entry.species;
 if(isForm&&parts.length>1){out.push([...parts.slice(1),parts[0]].join(' '),[...parts.slice(1),parts[0],'form'].join(' '));}
 for(const [spoken,key] of Object.entries(forms)){const i=parts.indexOf(key);if(i>=0&&isForm){const rest=parts.filter((_,j)=>j!==i);out.push([spoken,...rest].join(' '),[...rest,spoken].join(' '));}}
 if(entry.name==='calyrex-ice')out.push('ice rider calyrex','calyrex ice rider');if(entry.name==='calyrex-shadow')out.push('shadow rider calyrex','calyrex shadow rider');
 if(entry.name==='nidoran-f')out.push('nidoran f','female nidoran');if(entry.name==='nidoran-m')out.push('nidoran m','male nidoran');
 return [...new Set(out.filter(Boolean))];
}
function indexFor(catalog){
 if(indices.has(catalog))return indices.get(catalog);const exact=new Map(),compact=new Map(),fuzzy=[];
 const add=(map,key,name)=>{const set=map.get(key)||new Set();set.add(name);map.set(key,set);};
 for(const e of catalog){for(const alias of pokemonAliases(e)){add(exact,alias,e.name);add(compact,alias.replaceAll(' ',''),e.name);}if(e.default||!e.name.includes('-')){const word=normalizePokemon(e.species||e.name).replaceAll(' ','');fuzzy.push({name:e.name,word,sound:phonetic(word)});}}
 const result={exact,compact,fuzzy};indices.set(catalog,result);return result;
}
const unique=set=>set?.size===1?[...set][0]:undefined;
export function resolveName(query,catalog){const q=normalizePokemon(query),index=indexFor(catalog),set=index.exact.get(q)||index.compact.get(q.replaceAll(' ',''));if(set?.size===1)return [...set][0];throw Error(set?.size?'Multiple Pokémon forms match; choose the exact form.':'No exact Pokémon species/form matches this name. Specify Mega X/Y or the regional form explicitly.');}
function correctedPhrase(phrase,context){
 let text=phrase;if(context)text=text.replace(/\b(?:megga|meabga|meaga|meega)\b/g,'mega').replace(/^mega(?=[a-z]{5})/,'mega ');
 if(context)text=text.replace(/\b(?:star raptor|star rap tor|starraptor|starapter|star aptor)\b/g,'staraptor').replace(/\b(?:basket legion|basque legion|basky legian|basculigion)\b/g,'basculegion');
 if(context)text=text.replace(/\b(?:bascule|baskule|basky|bascul) (?:jun|june|jion|jyon|legion)\b/g,'basculegion');
 for(const [wrong,right] of Object.entries({...safeCorrections,...(context?contextualCorrections:{})}).sort((a,b)=>b[0].length-a[0].length))text=text.replace(new RegExp('(?:^| )'+wrong+'(?= |$)','g'),m=>(m.startsWith(' ')?' ':'')+right);
 if(/\bmega\b/.test(text))text=text.replace(/\bwhy\b/g,'y').replace(/\bex\b/g,'x').replace(/\bzee\b/g,'z');
 return normalizePokemon(text.replace(/\bmegacharizard\b/g,'mega charizard'));
}
function modifiedName(phrase,index){
 const tokens=phrase.split(' '),modifier=forms[tokens[0]]&&!common.has(tokens[0])?tokens.shift():undefined;
 if(!modifier||!tokens.length)return;
 const suffix=/^[xyz]$/.test(tokens.at(-1))?tokens.pop():undefined,base=tokens.join(''),exact=unique(index.compact.get(base));
 if(!exact&&tokens.some(t=>common.has(t)||englishWords.has(t)))return;
 const candidates=exact?[{name:exact,score:1}]:index.fuzzy.flatMap(e=>{
  if(e.word[0]!==base[0]||Math.abs(e.word.length-base.length)>3)return [];
  const d=distance(base,e.word),a=phonetic(base),pd=distance(a,e.sound);
  const score=d<=1?.95:d<=2&&base.length>=6?.9:pd===0&&a.length>=3?.9:pd===1&&a.length>=4?.83:0;
  return score?[{name:e.name,word:e.word,score}]:[];
 }).sort((a,b)=>b.score-a.score);
 if(!candidates.length||candidates[1]&&candidates[0].score-candidates[1].score<.04)return;
 const name=candidates[0].name,stem=index.fuzzy.find(e=>e.name===name)?.word||normalizePokemon(name).replaceAll(' ',''),query=[modifier,stem,suffix].filter(Boolean).join(' ');
 const match=unique(index.exact.get(query))||unique(index.compact.get(query.replaceAll(' ','')));
 return match?{name:match,corrected:true,method:'form-phonetic'}:{name,corrected:true,method:'form-phonetic',missingModifier:modifier};
}
export function identifyPokemon(words,catalog=BUNDLED_POKEMON,options={}){
 const index=indexFor(catalog),tokens=words.map(w=>normalizePokemon(w.text)),text=tokens.join(' ');
 const context=!!options.pokemonContext||domain.test(text)||/\b(?:mega|megga|meabga|meaga|meega)\b/.test(text)||tokens.some(t=>index.exact.has(t)&&!common.has(t))||Object.keys(safeCorrections).some(w=>(' '+text+' ').includes(' '+w+' '));
 const result=[];
 for(let i=0;i<words.length;i++){
  let found;
  for(let n=Math.min(8,words.length-i);n>=1;n--){const original=tokens.slice(i,i+n).join(' '),phrase=correctedPhrase(original,context),exact=unique(index.exact.get(phrase));
   if(exact){found={name:exact,n,method:phrase===original?'exact':'known-transcription',corrected:phrase!==original};break;}
   const joined=context&&unique(index.compact.get(phrase.replaceAll(' ','')));if(joined){found={name:joined,n,method:'joined-syllables',corrected:true};break;}
   if(context&&n>1){const recovered=modifiedName(phrase,index);if(recovered){found={...recovered,n};break;}}
  }
  if(!found&&context){
   for(let n=Math.min(3,words.length-i);n>=1;n--){const ts=tokens.slice(i,i+n);if(ts.some(t=>!t||common.has(t)||englishWords.has(t))||ts.join('').length<5)continue;const word=ts.join('').replaceAll(' ',''),sound=phonetic(word),candidates=[];
    for(const entry of index.fuzzy){if(entry.word[0]!==word[0]||Math.abs(entry.word.length-word.length)>2)continue;const d=distance(word,entry.word),pd=sound.length>=4&&entry.sound.length>=4?distance(sound,entry.sound):Infinity;let score=0;if(d<=1)score=.94-d*.04;else if(d<=2&&Math.min(word.length,entry.word.length)>=8)score=.85;else if(pd===0)score=.9;else if(pd===1&&Math.min(sound.length,entry.sound.length)>=5&&Math.min(word.length,entry.word.length)>=7)score=.82;if(score)candidates.push({...entry,score});}
    const ranked=[...new Map(candidates.sort((a,b)=>b.score-a.score).map(c=>[c.name,c])).values()];if(!ranked.length)continue;
    const ambiguous=ranked[1]&&ranked[0].score-ranked[1].score<.04;
    found={name:ranked[0].name,n,method:'phonetic-spelling',corrected:true,uncertain:!!ambiguous,candidates:ambiguous?ranked.slice(0,3).map(c=>c.name):undefined};break;
   }
  }
  if(!found)continue;
  const previous=tokens[i-1],next=tokens[i+found.n],nextStartsName=forms[next]&&unique(index.exact.get(correctedPhrase(tokens[i+found.n+1]||'',context)));
  // A regular adjective following a name is not an unresolved Pokémon form.
  const formContext=/\b(form|forme)\b/.test(tokens.slice(Math.max(0,i-2),i+found.n+3).join(' '));
  const specific=(modifier)=>found.name.startsWith('deoxys-')&&['attack','defense','speed'].includes(modifier)||found.name.startsWith('rotom')&&['wash','heat','frost','fan','mow'].includes(modifier);
  const prefix=forms[previous]&&(!common.has(previous)||formContext||specific(previous)),suffix=found.method!=='form-phonetic'&&forms[next]&&!nextStartsName&&(!common.has(next)||formContext||specific(next));
  const explicitMissing=prefix||suffix||found.missingModifier,unresolved=!!explicitMissing||found.uncertain;
  result.push({id:crypto.randomUUID(),name:found.name,start:words[i].start,end:words[i+found.n-1].end,spoken:words.slice(i,i+found.n).map(w=>w.text).join(' '),corrected:found.corrected,recognition:found.method,status:unresolved?'unresolved':'identified',...(found.candidates?{candidates:found.candidates}:{}),warning:explicitMissing?'Unresolved '+(found.missingModifier||forms[previous]||forms[next])+' form: select the exact form manually':found.uncertain?'Several Pokémon names fit this transcription; choose the intended name.':found.corrected?'Pokémon transcription spelling recovered — review identification':undefined});
  i+=found.n-1;
 }
 // A shortened species name refers to its established form until the speaker
 // explicitly changes that species back. Never choose between Mega X and Y.
 const activeForms=new Map();
 for(const mention of result){
  const entry=catalog.find(e=>e.name===mention.name),species=entry?.species||mention.name;
  const spoken=normalizePokemon(mention.spoken),at=words.findIndex(w=>w.start===mention.start),before=tokens.slice(Math.max(0,at-3),at).join(' ');
  const explicitBase=/\b(?:regular|normal|base|non mega|nonmega|unevolved)\b/.test(before);
  if(mention.status!=='identified'){if(/mega|alola|galar|hisui|paldea|primal|gigantamax/.test(correctedPhrase(spoken,context)))activeForms.set(species,{unresolved:true,warning:mention.warning});else activeForms.delete(species);continue;}
  if(explicitBase&&entry?.default){activeForms.delete(species);continue;}
  if(entry&&entry.name!==species&&!entry.default){activeForms.set(species,mention.name);continue;}
  if(entry?.default&&activeForms.has(species)&&!Object.keys(forms).some(f=>new RegExp('\\b'+f+'\\b').test(spoken))){
   const established=activeForms.get(species);if(established?.unresolved){mention.status='unresolved';mention.warning=established.warning;}else mention.name=established;mention.recognition='established-form';mention.formContext=species;
  }
 }
 return result;
}
const frequent=['Mega Sceptile','Mega Staraptor','Staraptor','Basculegion','Pikachu','Charizard','Incineroar','Garchomp','Gengar','Gyarados','Kingambit','Corviknight','Froslass','Politoed','Snorlax','Hawlucha','Rotom','Tyranitar','Absol','Dragonite','Mimikyu','Landorus','Rillaboom','Sceptile','Mega Gardevoir','Mega Salamence','Mega Metagross'];
import {POKEMON_NATURES} from './pokemon-natures.mjs';
export function pokemonVocabulary({text='',names=[]}={}){
 const ws=text.split(/\s+/).map((text,i)=>({text,start:i,end:i+1})),inText=identifyPokemon(ws,BUNDLED_POKEMON,{pokemonContext:true}).filter(m=>m.status==='identified').map(m=>BUNDLED_POKEMON.find(r=>r.name===m.name)?.displayName||m.name.replaceAll('-',' '));
 return {domain:'pokemon',terms:[...POKEMON_NATURES.map(n=>n.title), 'nature', 'mint', 'EVs', 'IVs', 'STAB', 'Trick Room', 'Terastallize', 'Flamethrower', 'Thunderbolt', 'Ice Beam', 'Water Gun', 'Hydro Pump', 'Leaf Blade', 'Shadow Ball','Leaf Storm','Swords Dance','Nasty Plot','Calm Mind','Tailwind','Protect','Earthquake','Fire Blast','Draco Meteor','Close Combat','Power Whip','Will-O-Wisp','Fake Out','U-turn','Volt Switch','Thunder Wave','Muddy Water','Ice Shard','Dazzling Gleam','Sucker Punch','Extreme Speed','Lightning Rod','Intimidate','Moxie','Swift Swim','Prankster','Levitate'],names:[...new Set([...names,...inText,...frequent].filter(n=>typeof n==='string'&&n.length<80))].slice(0,35),notice:'Vocabulary hints only. No names are inserted as transcript text.'};
}
