const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function imageBeatFormat(scene){
 const span=scene.end-scene.start,words=scene.words||[],count=Math.max(1,Math.ceil(span/2));
 return {type:'array',minItems:words.length>5?Math.max(1,Math.floor(span/2)):0,maxItems:count,items:{type:'object',additionalProperties:false,required:['wordIndex','query','duration','framing','reason'],properties:{wordIndex:{type:'integer',minimum:0,maximum:Math.max(0,words.length-1)},query:{type:'string',minLength:3,maxLength:150},duration:{type:'number',minimum:1,maximum:3},framing:{enum:['focus','side','evidence']},reason:{type:'string',maxLength:160}}}};
}
// Pictures have their own budget. Actor choreography must not consume all of
// the source-picture slots, and one failed asset must not cancel other beats.
export function imageBeatRecipes(scene,beats=[],rejected=[]){
 if(!Array.isArray(beats))throw Error('Image beats must be a list');
 const selected=[],queries=new Set();
 for(const beat of beats)try{
  if(!beat||typeof beat.query!=='string'||beat.query.length<3||beat.query.length>150||!['focus','side','evidence'].includes(beat.framing)||!Number.isFinite(beat.duration)||beat.duration<1||beat.duration>3)throw Error('A source picture needs a real source query and usable framing');
  // The supplied raw-word index owns timing. Older model responses with a
  // quote are normalized by the same exact-span compiler as actor recipes.
  const quote=beat.quote??scene.words[beat.wordIndex]?.text;
  if(!String(quote||'').trim())throw Error('A source picture needs a spoken cue');
  const query=normal(beat.query);if(queries.has(query))continue;queries.add(query);
  selected.push({kind:'stage-image',quote,wordIndex:beat.wordIndex,propQuery:beat.query,duration:beat.duration,framing:beat.framing,size:.36,reason:beat.reason||'Illustrate the actual narration',sound:'pop'});
 }catch(e){rejected.push({quote:beat?.quote,query:beat?.query,reason:e.message});}
 return selected;
}
