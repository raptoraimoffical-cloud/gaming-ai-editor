import test from 'node:test';
import assert from 'node:assert/strict';
import {assetIdentity,franchiseForEntity,normalizeFranchise,allowedFranchise} from '../electron/asset-identity.mjs';
import {narratedSubjects} from '../electron/narrated-subjects.mjs';
import {auditVisuals} from '../electron/storyboard.mjs';
import {directWithReview} from '../electron/local-ai-pipeline.mjs';
import {bundledNarrationArt} from '../electron/narration-props.mjs';
import {configureShortStyle,applyReferenceShort} from '../electron/short-styles.mjs';
import {applyNarrativeHook} from '../electron/narrative-hook.mjs';

function fixture(){
 const media=[{id:'voice',kind:'audio'}, {id:'picture',path:'picture.png',name:'Pokemon source artwork',kind:'image',identity:{franchise:'pokemon'},license:'Source notice'}];
 const labels=['Pokémon','Pokemon Champions','pokemon-showdown'];
 const scenes=labels.map((franchise,i)=>({id:`scene-${i+1}-0`,start:i*3,end:i*3+3,text:'This strategy works.',words:[{text:'This',start:i*3,end:i*3+.5},{text:'strategy',start:i*3+.5,end:i*3+1},{text:'works.',start:i*3+1,end:i*3+1.5}],reaction:{entities:[{id:'strategy',name:'Strategy',type:'character',franchise}]},layers:[{id:'bg-'+i,type:'shape',role:'background',x:0,y:0,width:1,height:1,z:0,start:i*3,end:i*3+3},{id:'picture-'+i,type:'image',role:'subject',mediaId:'picture',x:.2,y:.2,width:.6,height:.4,z:10,start:i*3,end:i*3+3}]}));
 scenes.at(-1).layers.push({...scenes.at(-1).layers[1],id:'extra-picture',x:.65,width:.25,role:'supporting-image'});
 return {id:'franchise-regression',voiceId:'voice',duration:9,format:'vertical',media,scenes,captionStyle:{fontSize:51,bottom:.19}};
}
function state(models={}){return {mode:'high',models,cfg:{planningPasses:0,alternatives:0,frameSamples:3,reviewPasses:1,maxRevisions:0},settings:{url:'http://127.0.0.1:11434'},limitations:[],hardware:{},started:Date.now(),signal:new AbortController().signal,narrationAnalysis:{available:true,visualBrief:'Current narration'}};}

test('AI and catalog franchise spellings normalize to the same family without changing species/form identity',()=>{
 for(const label of ['pokemon','Pokemon','Pokémon','POKÉMON','Pokemon Champions','pokemon-game-123','Pokémon Showdown','PokemonChampions']){
  assert.equal(normalizeFranchise(label),'pokemon');
  assert.equal(franchiseForEntity({id:'game',type:'game',franchise:label}),'pokemon');
  assert.equal(assetIdentity({identity:{franchise:label,subject:'sceptile-mega'}}).franchise,'pokemon');
 }
 assert.equal(franchiseForEntity({type:'game',id:'pokemon-group-123',name:'Pokémon Scarlet'}),'pokemon');
 assert.equal(franchiseForEntity({type:'game',id:'strategy',name:'Strategy'}),'unknown');
 assert.equal(assetIdentity({pokemon:{name:'sceptile-mega'},identity:{franchise:'Minecraft',subject:'creeper'}}).subject,'sceptile-mega');
 assert.equal(allowedFranchise({type:'game',name:'Pokémon Champions',id:'champions'},{identity:{franchise:'POKÉMON'}}),true);
 assert.equal(allowedFranchise({type:'game',name:'Minecraft',id:'minecraft'},{identity:{franchise:'Pokémon'}}),false);
});

test('the four reported Pokemon mismatches complete layout review with original captions and narration intact',async()=>{
 const p=fixture(),s=state(),before=JSON.stringify(p);let frames=0;
 assert.equal(p.scenes.flatMap(s=>s.layers.filter(l=>l.mediaId)).length,4);
 assert.deepEqual(auditVisuals(p).errors,[]);
 const n=await directWithReview(p,s,()=>{},async()=>{frames++;return {path:'rendered-frame.png'};},{check:()=>{},fetchImpl:()=>{throw Error('No inference needed for identity validation');}});
 assert.equal(frames,9);assert.equal(n.processingReport.structuralAudit.errors.length,0);
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(n.voiceId,p.voiceId);
 assert.deepEqual(n.scenes.map(s=>s.words),p.scenes.map(s=>s.words));assert.equal(JSON.stringify(p),before);
});

test('verified narrated subject titles acquire a canonical family before asset acquisition',()=>{
 const s={start:0,end:4,text:'Pokemon Champions',words:[{text:'Pokemon',start:0,end:.4},{text:'Champions',start:.4,end:1}]};
 const [e]=narratedSubjects(s,[{name:'Pokemon Champions',type:'game',query:'Pokemon Champions game screenshot',quote:'Pokemon Champions',franchise:'Pokémon Champions'}]);
 assert.equal(e.franchise,'pokemon');assert.equal(e.start,0);assert.equal(e.name,'Pokemon Champions');
});

test('selected game and explicit narrated game context permit real source cards beside unclassified explanatory subjects',()=>{
 const p=fixture();p.scenes[0].reaction.entities[0].franchise='competitive-strategy';p.gameSelection='pokemon';assert.deepEqual(auditVisuals(p).errors,[]);
 delete p.gameSelection;p.scenes[0].text='In Pokémon Champions, this strategy works.';assert.deepEqual(auditVisuals(p).errors,[]);
});

test('a real cross-franchise asset error fails before any expensive model call or rendered review and identifies the offending layer',async()=>{
 const p=fixture();p.scenes[0].reaction.entities=[{type:'game',id:'minecraft',name:'Minecraft'}];p.scenes[0].text='Minecraft gameplay.';const s=state({reasoning:{name:'slow-model'},vision:{name:'slow-vision',capabilities:['vision']}});delete s.narrationAnalysis;let calls=0;
 await assert.rejects(directWithReview(p,s,()=>{},()=>{calls++;throw Error('Should not render');},{check:()=>{},fetchImpl:()=>{calls++;throw Error('Should not infer');}}),/Visual preflight failed before layout\/frame review: scene-1-0: mismatched franchise pokemon.*layer picture-0.*expected minecraft/);
 assert.equal(calls,0);
});

test('an optional renderer failure retains the completed valid edit, reports incomplete review and avoids repeatedly retrying a broken renderer',async()=>{
 const p=fixture(),s=state();let frames=0;
 const n=await directWithReview(p,s,()=>{},async()=>{if(++frames===3)throw Error('Chromium renderer disconnected');return {path:'rendered-frame.png'};},{check:()=>{}});
 assert.equal(frames,3);assert.deepEqual(n.scenes,p.scenes);assert.equal(n.processingReport.structuralAudit.errors.length,0);
 assert.ok(n.processingReport.limitations.some(l=>/completed edit retained.*Chromium/.test(l)));
 assert.ok(n.processingReport.frameReview.some(r=>r.failed&&/no successful inspection/.test(r.inspection)));
 assert.deepEqual(n.captionStyle,p.captionStyle);assert.equal(n.voiceId,p.voiceId);
});

test('Stop remains a cancellation even when the pending frame renderer fails',async()=>{
 const p=fixture(),s=state(),c=new AbortController();s.signal=c.signal;
 await assert.rejects(directWithReview(p,s,()=>{},async()=>{c.abort(Error('Editing stopped by you'));throw Error('Renderer aborted');},{check:()=>{}}),/Editing stopped by you/);
});

test('the generated dense Trophy.png supporting layer completes preflight and review without removing the prop',async()=>{
 const p=fixture();p.duration=6;p.gameSelection='pokemon';p.scenes=p.scenes.slice(0,1);const scene=p.scenes[0];scene.id='scene-0-0';scene.end=6;scene.text='Charizard is king and won.';scene.words=[{text:'Charizard',start:0,end:.5},{text:'is',start:.5,end:.8},{text:'king',start:1,end:1.4},{text:'and',start:2,end:2.2},{text:'won.',start:3,end:3.4}];scene.reaction={entities:[{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'picture',start:0}],metrics:[]};scene.layers.forEach(l=>l.end=6);
 const props=bundledNarrationArt().filter(m=>['crown','trophy'].includes(m.identity.subject));p.media.push(...props);p.narrationAssetPlan=Object.fromEntries(props.map(m=>[m.identity.subject,m.id]));
 const drafted=applyReferenceShort(configureShortStyle(p,'pokemon-dense')),trophy=drafted.scenes[0].layers.find(l=>l.id==='scene-0-0-dense-1');assert.ok(trophy);assert.equal(drafted.media.find(m=>m.id===trophy.mediaId).name,'Trophy.png');assert.equal(trophy.role,'supporting-image');assert.deepEqual(auditVisuals(drafted).errors,[]);
 let frames=0;const result=await directWithReview(drafted,state(),()=>{},async()=>{frames++;return {path:'rendered.png'};},{check:()=>{}});assert.equal(frames,3);assert.deepEqual(result.processingReport.structuralAudit.errors,[]);assert.ok(result.scenes[0].layers.some(l=>l.id===trophy.id&&l.mediaId===trophy.mediaId));assert.deepEqual(result.scenes[0].words,drafted.scenes[0].words);assert.deepEqual(result.captionStyle,drafted.captionStyle);
});

test('all acquired neutral supporting narration props are valid in a Pokemon scene',()=>{
 for(const prop of bundledNarrationArt()){
  const p=fixture();p.media.push(prop);p.gameSelection='pokemon';p.narrationAssetPlan={[prop.identity.subject]:prop.id};p.scenes[0].layers.push({...p.scenes[0].layers[1],id:'support-'+prop.id,role:'supporting-image',mediaId:prop.id,x:.7,y:.06,width:.24,height:.18});assert.deepEqual(auditVisuals(p).errors,[],prop.name);
 }
});

test('a generated mystery question-mark prop passes franchise validation alongside its Pokemon silhouette',()=>{
 const p=fixture();p.gameSelection='pokemon';p.scenes[0].text='These Pokemon are mysterious.';p.scenes[0].words=[{text:'These',start:0,end:.4},{text:'Pokemon',start:.4,end:.8},{text:'are',start:.8,end:1},{text:'mysterious.',start:1,end:1.6}];p.pokemonMentions=[{name:'Charizard',start:5,status:'ready',mediaId:'picture'}];p.media.push({id:'question',name:'Original question-mark prop',kind:'image',path:'question.png',assetRole:'narration-prop',license:'Source notice',identity:{franchise:'illustration',subject:'question-mark'}});p.narrationAssetPlan={'question-mark':'question'};
 const n=applyNarrativeHook(p);assert.ok(n.scenes[0].layers.some(l=>l.role==='hook-question'&&l.mediaId==='question'));assert.deepEqual(auditVisuals(n).errors,[]);n.narrationAssetPlan={};assert.ok(auditVisuals(n).errors.some(e=>e.includes('mismatched franchise illustration')));
});

test('the supporting prop exception rejects unplanned illustrations, game assets, unrelated asset roles and lead replacements',()=>{
 const prop=bundledNarrationArt().find(m=>m.identity.subject==='trophy');
 for(const variant of ['unplanned','game','role','lead']){
  const p=fixture(),asset=structuredClone(prop);if(variant==='game')asset.identity.franchise='minecraft';if(variant==='role')asset.assetRole='logo';p.media.push(asset);p.gameSelection='pokemon';if(variant!=='unplanned')p.narrationAssetPlan={trophy:asset.id};p.scenes[0].layers.push({...p.scenes[0].layers[1],id:'wrong-'+variant,role:variant==='lead'?'subject':'supporting-image',mediaId:asset.id,x:.7,y:.06,width:.24,height:.18});assert.ok(auditVisuals(p).errors.some(e=>e.includes('wrong-'+variant)&&e.includes('mismatched franchise')),variant);
 }
});
