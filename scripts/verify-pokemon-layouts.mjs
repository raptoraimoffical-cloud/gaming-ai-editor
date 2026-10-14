import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {bundle} from '@remotion/bundler';import {renderStill,selectComposition} from '@remotion/renderer';
import {createBackend,root} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','pokemon-smoke');const b=await createBackend({workspace:path.join(folder,'library')});
try{
 const original=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8')));
 const teamWords='My team roster includes Charizard Mega Charizard Y Incineroar Delibird Alolan Ninetales Arceus Fire'.split(' ').map((text,i)=>({text,start:i*.25,end:(i+1)*.25}));
 const planned=await b.enrichPokemon({...original,duration:6,scenes:[{...original.scenes[0],start:0,end:2},{...original.scenes[1],start:2,end:6}]},teamWords);
 assert.equal(planned.pokemonMentions.length,6);assert.equal(planned.scenes[1].pokemon.length,6);assert.ok(planned.scenes.every(s=>s.pokemonLayout==='team'));assert.ok(planned.scenes[1].pokemon.every(p=>p.start>=2));
 const regional=await b.pokemonAsset('ninetales-alola');assert.equal(regional.pokemon.name,'ninetales-alola');assert.equal(regional.pokemon.nationalDex,38);
 const staticForm=await b.pokemonAsset('arceus-fire',{sourceKey:'front_default'});assert.equal(staticForm.pokemon.name,'arceus-fire');assert.equal(staticForm.pokemon.nationalDex,493);assert.equal(staticForm.pokemon.animated,false);assert.equal(staticForm.pokemon.frameCount,1);
 const media=[...original.media,regional,staticForm];const sprites=media.filter(m=>m.pokemon);const serveUrl=await bundle({entryPoint:path.join(root,'src','remotion.tsx')});
 for(const [layout,count] of [['comparison',2],['ranking',4],['team',6],['solo',1]]){
  const entries=layout==='solo'?[staticForm]:sprites.slice(0,count);const project={...original,media,duration:2,scenes:[{...original.scenes[0],id:'layout-test',start:0,end:2,title:layout==='solo'?'Exact static form fallback':layout==='team'?'Team roster':layout==='comparison'?'Head to head':'Pokémon rankings',words:[],pokemonLayout:layout,pokemon:entries.map((m,i)=>({mentionId:'layout-'+i,mediaId:m.id,start:0,end:2}))}]};
  const inputProps={project};const composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps});await renderStill({serveUrl,composition,inputProps,frame:30,output:path.join(folder,`layout-${layout}.png`)});
 }
 console.log(JSON.stringify({regional:{name:regional.pokemon.name,formId:regional.pokemon.formId},static:{name:staticForm.pokemon.name,source:staticForm.pokemon.sourceUrl,animated:staticForm.pokemon.animated},layouts:['comparison','ranking','team of six','static fallback']},null,2));
}finally{b.close();}
