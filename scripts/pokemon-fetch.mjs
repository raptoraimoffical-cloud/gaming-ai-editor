import {createPokemonService} from '../electron/pokemon.mjs';
const s=createPokemonService('workspace/pokemon-cache');
for(const name of ['charizard','charizard-mega-y','incineroar','delibird']){
 const a=await s.asset(name);console.log(JSON.stringify({name,dex:a.pokemon.nationalDex,formId:a.pokemon.formId,source:a.pokemon.sourceUrl,animated:a.pokemon.animated,frames:a.pokemon.frameCount,path:a.path}));
}
