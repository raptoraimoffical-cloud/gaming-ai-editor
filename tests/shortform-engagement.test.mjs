import test from 'node:test';import assert from 'node:assert/strict';
import {creativePassages,engagementWindows,auditEngagement,ENGAGEMENT_POLICY,ENGAGEMENT_RESEARCH} from '../electron/engagement-plan.mjs';
import {applyEngagementImages} from '../electron/engagement-images.mjs';
import {planQuickStory} from '../electron/quick-story-plan.mjs';
import {planCreativeActions,applyCreativeActions} from '../electron/creative-actions.mjs';
import {applyVisualCadence} from '../electron/visual-cadence.mjs';
import {freshVisualDraft} from '../electron/fresh-project.mjs';import {renderProject} from '../electron/render-project.mjs';
import {manualEdit} from '../electron/manual-editor.mjs';
import {applyEditorialPlan} from '../electron/editorial-planner.mjs';
import {placementFor} from '../electron/layer-motion.mjs';

const actor=(id='rotom',start=0,end=8)=>({id:'actor-'+id,type:'image',role:'subject',mediaId:id,x:id==='rotom'?.08:.58,y:.25,width:.34,height:.3,z:20,start,end,animation:'none',exit:'none'});
function fixture(text='Rotom charges up and Charizard arrives.'){return {id:'p',name:'Pacing fixture',duration:8,voiceId:'voice',format:'vertical',gameSelection:'pokemon',captionColor:'#fff',captionStyle:{fontSize:51,bottom:.16},musicVolume:.08,media:[{id:'voice',kind:'audio'},...['rotom','charizard','card'].map(id=>({id,name:id,kind:'image',path:id+'.png',width:400,height:400,license:'Fixture source'}))],scenes:[{id:'s',text,start:0,end:8,words:text.split(' ').map((text,i)=>({text,start:i,end:i+.8})),reaction:{entities:[{id:'rotom',name:'Rotom',type:'pokemon',mediaId:'rotom',start:0},{id:'charizard',name:'Charizard',type:'pokemon',mediaId:'charizard',start:4}],metrics:[]},layers:[actor()]}]};}
const state=mode=>({mode,models:{editing:{name:'trained'},reasoning:{name:'trained'}},settings:{url:'http://127.0.0.1:11434'},signal:new AbortController().signal,limitations:[]});
function longFixture(){const p=fixture(),words=Array.from({length:16},()=>['Rotom','charges','up.']).flat().map((text,i)=>({text,start:i*.75,end:i*.75+.65}));p.duration=36;p.scenes[0]={...p.scenes[0],end:36,text:words.map(w=>w.text).join(' '),words,layers:[actor('rotom',0,36)]};return p;}
function proposal(s){const verbs=s.words.filter(w=>w.text==='charges').filter((_,i)=>i%2===0).map(w=>({kind:'power-up',quote:w.text,wordIndex:w.wordIndex,duration:.8,actorId:'rotom',reason:'Show the spoken charge',sound:'whoosh'}));return {id:s.id,ideas:['Build charge and recovery','Alternate charging emphasis'],selectedIdea:0,recipes:verbs,motion:'none',effect:'none',sound:'none',chart:'none',metricIndexes:[],subjects:[],reason:'Demonstrate the current passage',visualQueries:[]};}
test('reviewed sources distinguish practitioner advice, ads and experiments from a proven two-second retention law',()=>{
 assert.ok(ENGAGEMENT_RESEARCH.sources.length>=12);assert.equal(ENGAGEMENT_RESEARCH.reviewedAt,'2026-10-12');assert.match(ENGAGEMENT_RESEARCH.targetBasis,/No reviewed source/);assert.equal(ENGAGEMENT_POLICY.targetSeconds,2);assert.ok(ENGAGEMENT_POLICY.rules.some(r=>/one dominant action/.test(r)));assert.ok(ENGAGEMENT_POLICY.rules.some(r=>/never copy speech/.test(r)));
});
test('long passages cover every raw word once, retain full story and keep Pokemon name spans together',()=>{
 const p=longFixture(),original=structuredClone(p.scenes[0]);const parts=creativePassages(original,p);assert.ok(parts.length>=4);assert.deepEqual(parts.flatMap(s=>s.words),original.words);assert.equal(parts[0].wordOffset,0);assert.equal(parts.at(-1).end,36);assert.ok(parts.every(s=>s.wholeText===original.text&&s.sourceSceneId==='s'));assert.deepEqual(p.scenes[0],original);
 const named=fixture();named.duration=12;named.scenes[0].end=12;named.scenes[0].words=[{text:'This',start:0,end:.5},{text:'is',start:7,end:7.5},{text:'Mega',start:7.8,end:8.05},{text:'Sceptile.',start:8.1,end:8.5},{text:'Yes.',start:10,end:11}];named.pokemonMentions=[{start:7.8,end:8.5}];const grouped=creativePassages(named.scenes[0],named);assert.ok(grouped.some(s=>s.words.some(w=>w.text==='Mega')&&s.words.some(w=>w.text==='Sceptile.')));
});
test('Quick Draft plans all sections of a long scene and executes more than six globally timed actions without changing captions',async()=>{
 const p=longFixture(),requests=[];const n=await planQuickStory(p,state('fast'),()=>{},async(_,o)=>{const b=JSON.parse(o.body),c=JSON.parse(b.messages[1].content);requests.push(c);return Response.json({message:{content:JSON.stringify({scenes:c.scenes.map(proposal)})}});});
 assert.ok(requests.length>=2);assert.ok(requests.every(c=>c.wholeStory[0].text===p.scenes[0].text&&c.engagement.targetSeconds===2));const actions=n.scenes[0].editorialPlan.creativeActions;assert.ok(actions.length>6);assert.ok(actions.some(a=>p.scenes[0].words[a.cueWordIndex].start>=27));assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
 const delivered=applyCreativeActions(n);assert.ok(delivered.creativeActionReport.events.length>6);assert.ok(delivered.creativeActionReport.events.some(e=>e.start>=27));assert.deepEqual(delivered.captionStyle,p.captionStyle);
});
test('full creative planner retains early and late actions across long-scene batches with exact global quotes',async()=>{
 const p=longFixture(),requests=[];const n=await planCreativeActions(p,state('high'),()=>{},async(_,o)=>{const b=JSON.parse(o.body),c=JSON.parse(b.messages[1].content);requests.push(c);return Response.json({message:{content:JSON.stringify(proposal(c.scene))}});});
 assert.ok(requests.length>=4);assert.ok(requests.every(c=>c.wholeStory[0].text===p.scenes[0].text&&c.engagement.windows.length));const actions=n.scenes[0].editorialPlan.creativeActions;assert.ok(actions.length>6);assert.ok(actions.some(a=>a.wordIndex<6));assert.ok(actions.some(a=>a.wordIndex>35));for(const a of actions)assert.equal(p.scenes[0].words[a.wordIndex].text,a.quote);
});
test('real visual gaps continue across sentence boundaries; captions, dots, idle zoom and duplicate pictures do not reset the clock',()=>{
 const p=fixture();p.scenes=[{...p.scenes[0],end:3,layers:[actor('rotom',0,3),{id:'dots',type:'particles',role:'environment-depth',start:0,end:3}]},{...p.scenes[0],id:'next',start:3,end:8,words:[],layers:[{...actor('rotom',3,8),referenceContinuation:true,animation:'smooth-zoom'},{...actor('rotom',4,6),id:'duplicate'}]}];
 const audit=auditEngagement(p);assert.equal(audit.events.length,1);assert.equal(audit.gaps[0].seconds,8);assert.equal(audit.measured,false);assert.match(audit.notice,/not measured or predicted/);
});
test('complete attacks and readable source evidence can hold, while missing ghost artwork never counts as activity',()=>{
 const p=fixture();p.scenes[0].layers=[{...actor(),role:'narrated-action',actionMovie:true}];assert.equal(auditEngagement(p).gaps.length,0);
 p.scenes[0].layers=[{...actor('card'),role:'mechanic-card'}];assert.ok(auditEngagement(p).holds.some(h=>h.end===3));assert.ok(auditEngagement(p).gaps.some(g=>g.start===3));
 p.scenes[0].layers=[{...actor('missing')},{...actor('card'),role:'item',attachment:{targetId:'nonexistent',anchor:'head',x:.5,y:.2,size:.2}}];assert.equal(auditEngagement(p).events.length,0);assert.ok(auditEngagement(p).warnings.some(w=>/first second/.test(w)));
});
test('manual images and mystery silhouettes do not get flagged as unintended early named reveals',()=>{
 const p=fixture();p.pokemonMentions=[{mediaId:'rotom',status:'ready',start:4,end:4.5}];assert.equal(auditEngagement(p).prematureVisuals.length,1);p.scenes[0].layers[0].silhouette=true;assert.equal(auditEngagement(p).prematureVisuals.length,0);delete p.scenes[0].layers[0].silhouette;p.scenes[0].layers[0].manual=true;assert.equal(auditEngagement(p).prematureVisuals.length,0);
});
test('blank chart placeholders and invisible evidence cannot conceal a quiet visual gap',()=>{
 const p=fixture();p.scenes[0].layers=[{id:'blank',role:'chart',type:'shape',start:0,end:8,x:.1,y:.2,width:.8,height:.4},{...actor('card'),role:'mechanic-card',opacity:0}];let audit=auditEngagement(p);assert.equal(audit.events.length,0);assert.equal(audit.holds.length,0);assert.equal(audit.gaps[0].seconds,8);
 p.scenes[0].layers=[{id:'real',role:'chart',type:'ring',value:75,start:0,end:8,x:.1,y:.2,width:.8,height:.4}];audit=auditEngagement(p);assert.equal(audit.events[0].kind,'data-reveal');assert.equal(audit.holds[0].end,3);
});
test('a missed resolved subject appears at its spoken cue in a separate lane without duplicating the visible lead',()=>{
 const p=fixture(),before=JSON.stringify([p.captionStyle,p.scenes[0].words]),n=applyEngagementImages(p);const added=n.scenes[0].layers.find(l=>l.engagementCoverage);assert.equal(added.mediaId,'charizard');assert.equal(added.start,4);assert.equal(added.role,'supporting-image');assert.equal(n.engagementImageReport.added.length,1);assert.equal(JSON.stringify([n.captionStyle,n.scenes[0].words]),before);assert.deepEqual(applyEngagementImages(n),n);
 const present=fixture();present.scenes[0].layers.push(actor('charizard',4,8));assert.equal(applyEngagementImages(present).engagementImageReport.added.length,0);
});
test('coverage recovery respects unknown media, off-screen future subjects, manual deletions and no-animation instructions',()=>{
 const p=fixture();p.scenes[0].reaction.entities[1].start=9;assert.equal(applyEngagementImages(p).engagementImageReport.added.length,0);p.scenes[0].reaction.entities[1].start=4;p.media=p.media.filter(m=>m.id!=='charizard');assert.equal(applyEngagementImages(p).engagementImageReport.added.length,0);
 const n=applyEngagementImages(fixture()),layer=n.scenes[0].layers.find(l=>l.engagementCoverage),deleted=manualEdit(n,{type:'delete',sceneId:'s',layerId:layer.id});assert.equal(applyEngagementImages(deleted).engagementImageReport.added.length,0);
 const still=applyEngagementImages({...fixture(),editingInstructions:'No animations.'});assert.equal(still.scenes[0].layers.find(l=>l.engagementCoverage).animation,'none');
});
test('semantic cadence follows actual spoken cues and never fills post-narration silence with repeated timer pops',()=>{
 const p=fixture('Rotom explains a plan.'),n=applyVisualCadence(p);assert.ok(n.cadenceReport.events.every(e=>p.scenes[0].words.some(w=>w.start===e.start)));assert.ok(!n.cadenceReport.events.some(e=>e.start>3));assert.deepEqual(n.scenes[0].words,p.scenes[0].words);
});
test('window cues ignore filler and ordinary counts, and new versions discard former pacing decisions',()=>{
 const p=fixture('The Rotom is number one.'),windows=engagementWindows(p.scenes[0],p);assert.equal(windows[0].wordIndex,1);assert.deepEqual(windows[0].significantMetrics,[]);
 p.shortformEngagementReport=auditEngagement(p);p.engagementImageReport={added:['old']};const fresh=freshVisualDraft(p);assert.equal(fresh.shortformEngagementReport,undefined);assert.equal(fresh.engagementImageReport,undefined);const payload=renderProject(p);assert.equal(payload.shortformEngagementReport,undefined);
});
test('a late chart preserves the opening cast, shows its panel and labels at the data cue and restores full-size actors afterward',()=>{
 const p=fixture();p.scenes[0].reaction.metrics=[{value:75,kind:'percentage',label:'win rate',start:4,source:'narration'}];p.scenes[0].editorialPlan={id:'s',chart:'ring',metricIndexes:[0],motion:'none',effect:'none',sound:'none',visualQueries:[],reason:'Explain the narrated percentage'};
 const n=applyEditorialPlan(p),before=n.scenes[0].layers.find(l=>l.mediaId==='rotom'&&l.start===0),context=n.scenes[0].layers.find(l=>l.mediaId==='rotom'&&l.start===4),after=n.scenes[0].layers.find(l=>l.mediaId==='rotom'&&l.start===7);assert.equal(before.width,.34);assert.equal(before.end,4);assert.equal(context.width,.22);assert.equal(after.width,.34);assert.ok(n.scenes[0].layers.filter(l=>l.role.startsWith('chart')||l.role==='stat-label').every(l=>l.start>=4&&l.end===7));assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.deepEqual(applyEditorialPlan(n).scenes[0].layers,n.scenes[0].layers);
});
test('a chart beginning immediately retains attachment anchors and removing the chart restores their full original geometry',()=>{
 const p=fixture();p.scenes[0].layers.push({...actor('card'),role:'item',id:'held',attachment:{targetId:'actor-rotom',anchor:'head',x:.5,y:.2,size:.2}});p.scenes[0].reaction.metrics=[{value:75,kind:'percentage',label:'win rate',start:0,source:'narration'}];p.scenes[0].editorialPlan={id:'s',chart:'ring',metricIndexes:[0],motion:'none',effect:'none',sound:'none',visualQueries:[],reason:'Explain the percentage'};
 const n=applyEditorialPlan(p),item=n.scenes[0].layers.find(l=>l.id==='held');assert.ok(placementFor(item,n.scenes[0].layers,n.media,1,1080,1920).motion.opacity>.9);n.scenes[0].editorialPlan.chart='none';n.scenes[0].editorialPlan.metricIndexes=[];const restored=applyEditorialPlan(n);assert.equal(restored.scenes[0].layers.find(l=>l.id==='actor-rotom').width,.34);assert.equal(restored.scenes[0].editorialChartSourceLayers,undefined);
});
test('an irrelevant bad chart field cannot discard valid trained actions, and recipe quotes are limited to actual passage words',async()=>{
 const p=fixture(),n=await planQuickStory(p,state('fast'),()=>{},async(_,o)=>{const c=JSON.parse(JSON.parse(o.body).messages[1].content),s=c.scenes[0];return Response.json({message:{content:JSON.stringify({scenes:[{...proposal(s),chart:'none',metricIndexes:[999]}]})}});});assert.ok(n.scenes[0].editorialPlan.creativeActions.length);assert.deepEqual(n.scenes[0].editorialPlan.metricIndexes,[]);
});
