import {DEFAULT_INSTRUCTIONS} from './default-instructions.mjs';
import {isBackPokemon,requestsBackView} from './game-presentation.mjs';
export function pokemonImageMode(scene,project){
 const instructions=(scene?.visualInstructions||project.editingInstructions||'').replace(DEFAULT_INSTRUCTIONS,'').replace(/^REFERENCE SHORT STYLE:.*$/gm,'');
 const explicit=instructions.split(/[.!?;\n]+/).filter(clause=>{const match=/\b(?:use|prefer|choose|show)\s+(?:the\s+)?(?:showdown|3d|3-d|pixel|retro|animated|sprites?)\b/i.exec(clause);return match&&!/\b(?:only when|only if|unless)\b/i.test(clause)&&!/\b(?:not|never|avoid|dont|don't)\b/i.test(clause.slice(0,match.index).split(/\s+/).slice(-8).join(' '));}).join(' ');
 const text=(scene?.text||'')+' '+explicit;
 if(requestsBackView(scene||{}))return 'back';
 if(/\bshowdown\b|\bsprites?\b/i.test(text))return 'showdown';
 if(/\b3[ -]?d\b|\b(?:game|character|pokemon|pokémon)\s+models?\b|\bmodel\s+(?:animation|design|render)\b/i.test(text))return 'model';
 return 'artwork';
}
const sprite=m=>/showdown|sprites?\b/i.test([m.pokemon?.sourceKey,m.pokemon?.sourceUrl,m.identity?.variant].join(' '))&&!/official-artwork|other\.home|google-artwork/i.test(m.pokemon?.sourceKey||'');
export function preferredPokemonImage(name,scene,project,pool=project.media){
 const mode=pokemonImageMode(scene,project),matching=pool.filter(m=>['pokemon','image','video'].includes(m.kind)&&(m.pokemon?.name===name||m.identity?.franchise==='pokemon'&&m.identity.subject===name)&&(!isBackPokemon(m)||mode==='back'));
 if(mode!=='artwork')return matching.find(m=>mode==='showdown'?/showdown/.test(m.pokemon?.sourceKey||''):mode==='model'?/other\.home/.test(m.pokemon?.sourceKey||''):isBackPokemon(m));
 return matching.find(m=>m.provider==='google-images'&&m.decoded&&m.webAssessment?.accepted&&(m.webAssessment.autoEligible||/^User-confirmed/.test(m.identity?.source||''))&&!sprite(m))||matching.find(m=>/official-artwork/.test(m.pokemon?.sourceKey||''))||matching.find(m=>!sprite(m)&&m.kind==='image'&&m.license);
}
export async function acquirePokemonImage(mention,scene,project,{service,asset,search,download,pool=project.media,key='',register=m=>m,progress=()=>{},check=()=>{},enabled=true}={}){
 const mode=pokemonImageMode(scene,project),log={name:mention.name,sceneId:scene?.id,mode,attempts:[]};let searched=false,searchFailed=false;
 let cached=preferredPokemonImage(mention.name,scene,project,pool);
 if(cached&&!cached.pokemon){const info=service?.info?await service.info(mention.name).catch(()=>({name:mention.name,displayName:cached.name,stats:[],types:[]})):{name:mention.name,displayName:cached.name,stats:[],types:[]};cached=await register({...cached,pokemon:{...info,sourceKey:cached.provider==='google-images'?'google-artwork':'user-artwork',sourceUrl:cached.originalUrl||cached.attribution?.source,animated:!!cached.animationInfo?.animated,frameCount:cached.animationInfo?.frameCount||1,cycleMs:cached.animationInfo?.cycleMs||0}});}
 if(cached&&(cached.provider==='google-images'||mode!=='artwork'||(!enabled||!key)&&cached.pokemonArtworkSearch?.version===1&&Date.now()-cached.pokemonArtworkSearch.checkedAt<86400000))return {media:cached,log:{...log,source:'cached '+mode,mediaId:cached.id}};
 if(mode==='artwork'&&enabled&&key&&search&&download){
  const query='Pokemon '+mention.name.replaceAll('-',' ')+' official artwork transparent png -showdown -sprite -back';progress({stage:'Finding Google artwork: '+mention.name});
  try{check();const results=await search(query,'google-images',key,{game:'Pokemon',type:'PNG',exactQuery:true});log.attempts.push({provider:'google-images',query,returned:results.length});searched=true;
   for(const c of results.filter(c=>c.webAssessment?.autoEligible&&!/showdown|\b(?:back sprite|rear view|3d model)\b/i.test(c.name+' '+c.url))){
    try{check();const m=await download(c);if(!m.decoded||!m.webAssessment?.autoEligible||!m.transparent||Math.min(m.width,m.height)<96)continue;const info=await service.info(mention.name),media=await register({...m,pokemon:{...info,attribution:m.attribution?.credit||'Original Google image publisher',repository:'',licenseUrl:m.attribution?.licenseUrl||'',notice:m.rightsNotice||'Image reuse rights are not verified.',sourceKey:'google-artwork',sourceUrl:m.originalUrl||c.url,animated:false,frameCount:1,cycleMs:0},identity:{franchise:'pokemon',subject:mention.name,source:'Documented exact-subject Google original',confidence:m.webAssessment.confidence}});return {media,log:{...log,source:'google-images',mediaId:media.id}};
    }catch(e){check();searchFailed=true;log.attempts.push({candidate:c.id,error:e.message});}
   }
  }catch(e){check();searchFailed=true;log.attempts.push({provider:'google-images',error:e.message});}
 }else if(mode==='artwork')log.attempts.push({provider:'google-images',status:enabled?'not-configured':'disabled'});
 if(cached){if(searched&&!searchFailed)cached=await register({...cached,pokemonArtworkSearch:{version:1,checkedAt:Date.now()}});return {media:cached,log:{...log,source:'cached official artwork',mediaId:cached.id}};}
 const keys=mode==='showdown'?['other.showdown.front_default']:mode==='model'?['other.home.front_default']:mode==='back'?[]:['other.official-artwork.front_default','other.home.front_default','front_default'];
 for(const sourceKey of keys){try{progress({stage:'Caching exact '+mode+': '+mention.name});let media=await asset(mention.name,{sourceKey});if(searched&&!searchFailed)media=await register({...media,pokemonArtworkSearch:{version:1,checkedAt:Date.now()}});return {media,log:{...log,source:sourceKey,mediaId:media.id}};}catch(e){log.attempts.push({sourceKey,error:e.message});}}
 if(mode==='back'||mode==='showdown'){const media=await asset(mention.name,{view:mode==='back'?'back':'front'});return {media,log:{...log,source:'contextual sprite',mediaId:media.id}};}
 throw Error('No exact artwork/model/front image for '+mention.name+'. '+log.attempts.filter(a=>a.error).map(a=>a.error).join('; '));
}
