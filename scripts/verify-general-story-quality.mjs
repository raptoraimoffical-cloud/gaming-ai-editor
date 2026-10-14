import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {createBackend,root} from '../electron/backend.mjs';
import {plan} from '../electron/planner.mjs';import {configureShortStyle} from '../electron/short-styles.mjs';
import {newEditVersion} from '../electron/edit-version.mjs';
import {applyGoldReferenceBrief} from '../electron/gold-reference-policy.mjs';
import {createLocalAI,QUALITY_MODES} from '../electron/local-ai.mjs';import {completionFetch} from '../electron/inference-transport.mjs';
import {enrichShortMechanics} from '../electron/short-mechanics.mjs';import {createPokemonService} from '../electron/pokemon.mjs';
import {auditEngagement} from '../electron/engagement-plan.mjs';import {auditVisualDelivery} from '../electron/visual-delivery.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
const folder=path.join(root,'workspace/general-story-quality-'+Date.now()),work=path.join(folder,'backend');fs.mkdirSync(work,{recursive:true});
for(const name of ['library.sqlite','local-ai-settings.json'])fs.copyFileSync(path.join(root,'workspace',name),path.join(work,name));
if(process.env.GAMING_MODEL_CHECK_URL){const file=path.join(work,'local-ai-settings.json'),settings=JSON.parse(fs.readFileSync(file,'utf8'));fs.writeFileSync(file,JSON.stringify({...settings,url:process.env.GAMING_MODEL_CHECK_URL,processingPreference:'cpu',keepAliveSeconds:0}));}
fs.mkdirSync(path.join(work,'pokemon-cache'),{recursive:true});for(const name of fs.readdirSync(path.join(root,'workspace/pokemon-cache')).filter(n=>n.endsWith('.json')))fs.copyFileSync(path.join(root,'workspace/pokemon-cache',name),path.join(work,'pokemon-cache',name));
const b=await createBackend({workspace:work}),review=createReviewRenderer({root,folder,scale:.5}),reports=[];
const replayFolder=process.argv.find(a=>a.startsWith('--replay='))?.slice(9),replay=replayFolder?fs.readdirSync(replayFolder).filter(n=>/^proposal-\d+\.json$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0])).map(n=>JSON.parse(fs.readFileSync(path.join(replayFolder,n),'utf8')).response):undefined;
let proposalCount=0;const ai=replay?createLocalAI(work,{fetchImpl:async()=>{const response=replay[proposalCount++];assert.ok(response,'Captured model response missing');return Response.json(response);}}):process.env.GAMING_MODEL_CHECK_URL?createLocalAI(work,{fetchImpl:async(input,init={})=>{if(new URL(input).pathname==='/api/chat'){const body=JSON.parse(init.body);body.options={...body.options,num_thread:4};init={...init,body:JSON.stringify(body)};}const response=await completionFetch(input,init);if(new URL(input).pathname==='/api/chat')fs.writeFileSync(path.join(folder,'proposal-'+(++proposalCount)+'.json'),JSON.stringify({request:JSON.parse(init.body),response:await response.clone().json()},null,2));return response;}}):b.localAI;
const cases=[
 {name:'move-explanation',text:'Close Combat is a powerful Fighting move. Lucario and Gallade can use it, but lowering defenses makes the next hit dangerous.'},
 {name:'weather-partnership',text:'Pelipper sets rain. Archaludon holds an Assault Vest and uses Electro Shot to raise its Special Attack before firing electricity. These partners work together.'},
 {name:'specific-matchup',text:'Charizard uses Flamethrower on Blastoise, but Blastoise resists it. Blastoise can fight back with Hydro Pump. Charizard really wants a different opponent.'}
];
try{
 const voice=await b.importMedia('C:/Users/Eli/Downloads/1012 (1).MP3');
 for(const [index,c] of (process.argv.includes('--first-only')?cases.slice(0,1):cases).entries()){
  const words=c.text.split(' ').map((text,i)=>({text,start:i*.46,end:i*.46+.42})),duration=words.at(-1).end+.25;
  let p=configureShortStyle({id:crypto.randomUUID(),creativePassId:crypto.randomUUID(),editVersion:newEditVersion(),name:c.name,format:'vertical',videoMode:'youtube-shorts',gameSelection:'pokemon',shortStyle:'pokemon-dense',duration,voiceId:voice.id,narrationMuted:true,autoPokemonCries:true,autoSoundEffects:true,autoReactionGifs:true,gamePatterns:true,captionColor:'#8affcb',musicVolume:.04,media:[voice],scenes:plan([{text:c.text,start:0,end:duration,words}], [voice],duration),editingInstructions:'Make this specific story visually clear and lively. Use actual game artwork, relevant source pictures, published mechanic images, coordinated character interactions, smooth motion, quiet game sounds, and a meaningful change about every two seconds. Keep the captions unchanged. Do not invent game facts or damage. No generic logo intro. Every image must illustrate this narration.'},'pokemon-dense');
  p=applyGoldReferenceBrief(p);const captionBefore=JSON.stringify(p.captionStyle),wordBefore=JSON.stringify(p.scenes.flatMap(s=>s.words));
  console.log('CASE '+c.name);const inference=!process.argv.includes('--no-inference'),state=replay?{mode:'balanced',settings:b.localAI.settings(),cfg:QUALITY_MODES.balanced,models:{reasoning:{name:'qwen3.5:4b'},editing:{name:'qwen3.5:4b'}},signal:new AbortController().signal,inferenceEvents:[],limitations:[]}:await ai.begin(index===0?'balanced':'fast',{useAI:inference});
  // Use the installed reasoning weights for this bounded diagnostic, so
  // multi-script renderer checks do not require repeated 8B CPU offloading.
  if(inference&&!process.argv.includes('--editing-model'))state.models.editing=state.models.reasoning;
  p=await b.enrichPokemon(p,words,u=>console.log(u.stage));
  p=await enrichShortMechanics(p,createPokemonService(path.join(work,'pokemon-cache')),u=>console.log(u.stage));
  // enrichVisuals resolves exact mechanics before composition; the author
  // still sees resolved canonical actor names in these ordinary scripts.
  p=await ai.author(p,state,u=>console.log(u.stage));
  fs.writeFileSync(path.join(folder,c.name+'-author.json'),JSON.stringify({report:p.creativePlanningReport,inference:state.inferenceEvents},null,2));
  assert.equal(JSON.stringify(p.captionStyle),captionBefore,'The story author changed caption appearance');
  if(inference)assert.ok(state.inferenceEvents.some(e=>e.stage==='quick-story-authoring'&&e.performed&&e.accepted),'No trained story inference');
  p=await b.enrichVisuals(p,u=>console.log(u.stage),{},state);p=b.finalizePresentation(p);p=await b.localAI.direct(p,{...state,cfg:{...state.cfg,planningPasses:0,frameSamples:0}},u=>console.log(u.stage));
  assert.equal(JSON.stringify(p.scenes.flatMap(s=>s.words.map(({captionText,...w})=>w))),wordBefore);
  const delivery=auditVisualDelivery(p),pacing=auditEngagement(p),frames=[];
  fs.writeFileSync(path.join(folder,c.name+'-diagnostic.json'),JSON.stringify({model:state.models.editing?.name,inference:state.inferenceEvents,planning:p.creativePlanningReport,source:p.creativeSourceReport,actions:p.creativeActionReport,coverage:p.narratedPictureReport,delivery,pacing},null,2));
  assert.ok(p.narratedPictureReport.delivered.length>=(c.name==='specific-matchup'?2:3),'Too few narrated subjects delivered');assert.deepEqual(delivery.logoOnlySpans,[]);if(inference)assert.ok(p.creativeActionReport.events.length,'No planned pictures or performances delivered');assert.ok(delivery.distinctSourceImages>=(c.name==='specific-matchup'?2:4),'Too few source pictures: '+delivery.distinctSourceImages);
  for(const time of [.25,1.8,3.4,5.6,7.8,Math.min(duration-.25,9.6)])frames.push({time,...await review.render(b.hydrate(p),Math.round(time*30),c.name+'-'+time)});
  if(process.argv.includes('--export'))await b.render(p,path.join(folder,c.name+'.mp4'),u=>{if(u.percent===undefined)console.log(u.stage);});
  reports.push({name:c.name,duration,model:state.models.editing?.name,actualTrainedInference:inference&&!replay,replayedCapturedModelResponses:!!replay,pictures:delivery.distinctSourceImages,visualEvents:pacing.events.length,characterActions:p.creativeActionReport.events.filter(e=>e.kind!=='stage-image').length,narratedCoverage:p.narratedPictureReport,frames:frames.map(f=>({time:f.time,path:f.path})),authorPreservesCaptions:true,wordsPreserved:true,captionStyle:p.captionStyle,diagnosticNarrationSyntheticAndMuted:true});
  console.log('PASS '+c.name+': '+delivery.distinctSourceImages+' source pictures, '+pacing.events.length+' visual events');
 }
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({reports,projectSaved:false,googleApiLiveTested:false,notice:'Synthetic timing fixtures exercise actual trained inference and production composition using cached original/published assets. This checks story delivery across scripts, not viewer retention or a studio animation rating.'},null,2));console.log('Verification: '+folder);
}finally{await review.close();b.close();}
