import {createPokemonService} from '../electron/pokemon.mjs';
const p=createPokemonService('workspace/pokemon-smoke/library/pokemon-cache');
for(const n of ['pikachu-cosplay','pikachu-rock-star','pikachu-world-cap','koraidon-limited-build','miraidon-low-power-mode'])try{const a=await p.asset(n);console.log(n,a.pokemon.animated,a.pokemon.sourceUrl);if(!a.pokemon.animated)break;}catch(e){console.log(n,e.message);}
