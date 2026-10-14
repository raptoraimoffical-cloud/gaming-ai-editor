import {modelIdleSeconds} from './ai-performance.mjs';
import {videoFPS} from './video-modes.mjs';
import {modelChat,recordInference} from './inference-trace.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyAiDirection} from './ai-director.mjs';
import {refreshStoryboard} from './storyboard.mjs';
import {validateProject} from './planner.mjs';
import {assessProject,compareAssessments,inspectScene,repairGeometry,replaceScene,applyReviewChanges,parseVisionReview,sampleTimes} from './quality-review.mjs';

export async function directWithReview(project,state,progress,preview,{folder,check,fetchImpl=fetch}){
 check();let p={...project,creativePassId:project.creativePassId||crypto.randomUUID()};const stages=[],alternatives=[],frameReview=[],corrections=[];
 // Identity, missing media and invalid geometry cannot be repaired by a slow
 // frame review. Catch them before any additional model calls or rendering.
 const preflight=assessProject(p);if(preflight.errors.length)throw Error('Visual preflight failed before layout/frame review: '+[...new Set(preflight.errors)].join('; '));
 // Review stages stay in memory. Project files are written only by Save.
 const snapshot=stage=>stages.push(stage);
 const options={num_ctx:state.settings.contextLength||4096,...(state.settings.processingPreference==='cpu'?{num_gpu:0}:{})};
 async function chat(model,messages,stage='frame-review'){check();return modelChat(state,model,messages,{fetchImpl,stage});}
 async function freshDirection(base,model,context){
  // Source files and frame observations may be cached. An old composition is
  // never a substitute for a new planning pass, even for identical narration.
  const result=await applyAiDirection(base,{url:state.settings.url,model:model.name,qualityContext:context,signal:state.signal,keepAlive:modelIdleSeconds(state.settings),fetchImpl,geometryOnly:state.settings.compactLayouts===true,inferenceOptions:options,onInference:e=>recordInference(state,e)});
  if(result.directorStatus?.startsWith('Deterministic fallback:'))state.limitations.push('Local planning proposal rejected: '+result.directorStatus.slice(24));
  return result;
 }
 snapshot('planned',p);
 let brief=state.narrationAnalysis?.visualBrief||'';
 if(state.narrationAnalysis?.available)snapshot('understood',{...p,visualBrief:brief});
 if(!state.narrationAnalysis&&state.mode!=='fast'&&state.models.reasoning){
  progress({stage:'Understanding full narration with '+state.models.reasoning.name});
  try{const result=await chat(state.models.reasoning,[{role:'system',content:'Return JSON with a visualBrief string. Analyze subjects, franchises, relationships, claims and narrative beats across the entire script. Resolve sentence references. Preserve all facts/forms and timing, use only supplied media. Respect editing instructions.'},{role:'user',content:JSON.stringify({instructions:p.editingInstructions,scenes:p.scenes.map(s=>({id:s.id,text:s.text,start:s.start,end:s.end,entities:s.reaction?.entities})),media:p.media.map(m=>({id:m.id,name:m.name}))})}],'narration-analysis');brief=String(result.visualBrief||'').slice(0,6000);snapshot('understood',{...p,visualBrief:brief});}catch(e){check();state.limitations.push('Reasoning fallback: '+e.message);}
 }
 const designs=['Keep subject-first staging; refine readable labels and entrances.','Try an alternate editorial composition with more negative space and coordinated comparison reveals.','Try cinematic depth with the same assets, safe captions and restrained background motion.','Try infographic-first staging without adding facts or unsupported assets.'];
 const baseline=p,model=state.cfg.planningPasses?state.models.planning:null,candidateProjects=[baseline];
 alternatives.push({index:0,source:'baseline',assessment:assessProject(baseline)});
 let winnerAssessment=alternatives[0].assessment;
 for(let i=0;model&&i<state.cfg.alternatives;i++){
  check();progress({stage:`Planning layout ${i+1}/${state.cfg.alternatives}: ${model.name}`});
  const context=JSON.stringify({brief,design:designs[i],baselineIssues:alternatives[0].assessment.findings,previouslyTried:alternatives.slice(1).map(a=>({design:a.design,findings:a.assessment.findings}))});
  const candidate=await freshDirection(baseline,model,context),assessment=assessProject(candidate),entry={index:i+1,source:'local model',design:designs[i],assessment,status:candidate.directorStatus,changed:JSON.stringify(candidate.scenes.map(s=>s.layers))!==JSON.stringify(baseline.scenes.map(s=>s.layers))};
  alternatives.push(entry);candidateProjects.push(candidate);snapshot('alternative-'+i,candidate);
  if(!assessment.errors.length&&(compareAssessments(assessment,winnerAssessment)<0||compareAssessments(assessment,winnerAssessment)===0&&p===baseline&&candidate.directorStatus?.startsWith('Ollama:')&&JSON.stringify(candidate.scenes.map(s=>s.layers))!==JSON.stringify(baseline.scenes.map(s=>s.layers)))){p=candidate;winnerAssessment=assessment;}
 }
 if(!model&&state.cfg.planningPasses)state.limitations.push('No installed planning model; deterministic scene plan retained.');
 if(model&&state.cfg.planningPasses>1){
  progress({stage:'Coordinating motion and narration timing'});
  const candidate=await freshDirection(p,model,JSON.stringify({brief,task:'Refine motion using the selected plan. Preserve user style, caption settings, all subject timings and verified facts.',findings:winnerAssessment.findings})),assessment=assessProject(candidate);
  if(!assessment.errors.length&&compareAssessments(assessment,winnerAssessment)<0){p=candidate;winnerAssessment=assessment;}
  alternatives.push({index:alternatives.length,source:'local model timing',assessment,status:candidate.directorStatus});candidateProjects.push(candidate);snapshot('planning-timing',p);
 }
 alternatives.forEach(a=>a.selected=JSON.stringify(a.assessment)===JSON.stringify(winnerAssessment));
 const vision=state.models.review?.capabilities.includes('vision')?state.models.review:state.models.vision;
 let frameCounter=0,selectedPlan=p,frameError;const reviewCache=new Map();
 async function review(scene,project,pass,label){
  const cacheKey=JSON.stringify({scene,captionStyle:project.captionStyle,instructions:project.editingInstructions});
  if(reviewCache.has(cacheKey))return reviewCache.get(cacheKey);
  const observations=[],issues=[],changes=[];
  for(const t of sampleTimes(scene)){
   check();let frame;
   if(frameError)return {issues:[],changes:[],complete:false,semantic:!!vision?.capabilities.includes('vision')};
   try{frame=await preview(project,Math.round(t*videoFPS(project)),`${label}-${frameCounter++}`);}catch(e){
    check();if(state.signal?.aborted)throw state.signal.reason||e;
    // Rendered review is optional. Keep the latest structurally valid edit
    // in memory and disclose the failed check instead of losing all work.
    frameError=e.message;state.limitations.push('Rendered frame review unavailable; completed edit retained: '+e.message);
    frameReview.push({sceneId:scene.id,time:t,pass,label,failed:true,error:e.message,inspection:'Frame could not be rendered; no successful inspection claimed.'});
    return {issues:[],changes:[],complete:false,semantic:!!vision?.capabilities.includes('vision')};
   }
   const observation={sceneId:scene.id,time:t,frame:frame.path,pass,label,inspection:'Actual frame rendered; geometry audited. Semantic vision is unavailable.'};
   if(vision?.capabilities.includes('vision')){
    try{const value=await chat(vision,[{role:'user',content:'Inspect the actual rendered frame against narration and its layer plan. Return JSON {issues:[{code,layerId?,message}],changes:[{layerId,values:{x?,y?,width?,height?,scale?,opacity?,animation?}}]}. Codes: wrong-subject, wrong-form, irrelevant-media, clipping, unreadable-text, caption-overlap, animation-visibility. Empty issues means no visible defect. Never invent aesthetic scores. Changes may alter geometry/motion only; assets, facts, style and timings must stay. Raw transcription spelling alone is not a wrong-form finding. Canonical entity names come from resolved metadata. Comparisons can show both relevant subjects; do not treat that as contradicting a narration opinion. Judge subjects active at this sample time: '+t+' seconds. Canonical entities: '+JSON.stringify(scene.reaction?.entities?.map(e=>({name:e.name,start:e.start,mediaId:e.mediaId})))+'; Narration: '+scene.text+'; Instructions: '+project.editingInstructions+'; Layers: '+JSON.stringify(scene.layers.map(({svg,...l})=>l)),images:[fs.readFileSync(frame.path).toString('base64')]}]);const parsed=parseVisionReview(value,scene);observation.inspection=parsed;issues.push(...parsed.issues);changes.push(...parsed.changes);}catch(e){check();observation.failed=true;state.limitations.push('Vision inspection failed: '+e.message);}
   }
   observations.push(observation);frameReview.push(observation);
  }
  // Stable codes/layer IDs prevent wording differences being counted as improvement.
  const result={issues:[...new Map(issues.map(i=>[i.code+':'+(i.layerId||'')+(i.code==='observation'?':'+i.message:''),i])).values()],changes,complete:observations.every(o=>!o.failed),semantic:!!vision?.capabilities.includes('vision')};
  if(result.complete)reviewCache.set(cacheKey,result);return result;
 }
 if(state.cfg.frameSamples){
  // Compare actual candidate pixels when semantic inspection is configured.
  // No model or an unsuccessful inspection means no semantic ranking claim.
  if(model&&vision?.capabilities.includes('vision')&&candidateProjects.length>1){
   progress({stage:'Comparing rendered alternative compositions'});
   let best=p,bestAudit=assessProject(p),bestReview;
   const reviewed=new Set();
   for(const candidate of [p,...candidateProjects]){
    const key=JSON.stringify(candidate.scenes.map(s=>s.layers));if(reviewed.has(key))continue;reviewed.add(key);
    const audit=assessProject(candidate);if(audit.errors.length)continue;
    const results=[];for(const s of candidate.scenes.slice(0,state.cfg.frameSamples))results.push(await review(s,candidate,0,'alternative'));
    const evaluation={complete:results.every(r=>r.complete),issues:results.flatMap(r=>r.issues)};
    const entry=alternatives[candidateProjects.indexOf(candidate)];if(entry)entry.frameEvaluation={complete:evaluation.complete,issues:evaluation.issues};
    if(!bestReview){bestReview=evaluation;continue;}
    if(evaluation.complete&&bestReview.complete&&audit.findings.length<=bestAudit.findings.length&&evaluation.issues.length<bestReview.issues.length&&evaluation.issues.every(a=>bestReview.issues.some(b=>a.sceneId===b.sceneId&&a.code===b.code&&a.layerId===b.layerId))){best=candidate;bestAudit=audit;bestReview=evaluation;}
   }
   p=best;selectedPlan=best;winnerAssessment=bestAudit;
  }
  progress({stage:'Reviewing actual rendered frames'});
  const scenes=p.scenes.slice(0,state.cfg.frameSamples);
  for(const original of scenes){
   let scene=p.scenes.find(s=>s.id===original.id),before=await review(scene,p,0,'baseline'),geometry=inspectScene(scene,p);
   for(let pass=1;pass<state.cfg.reviewPasses&&corrections.filter(c=>c.sceneId===scene.id&&c.accepted).length<state.cfg.maxRevisions;pass++){
    check();if(!geometry.length&&!before.issues.length)break;
    let candidateScene=repairGeometry(scene,p,geometry);
    // Identity errors cannot be fixed by nudging a layer. Preserve for asset review.
    if(before.issues.some(i=>['wrong-subject','wrong-form','irrelevant-media'].includes(i.code)))candidateScene=scene;
    else if(before.complete&&before.changes.length){try{candidateScene=applyReviewChanges(candidateScene,before.changes);}catch(e){state.limitations.push('Rejected review proposal: '+e.message);}}
    if(JSON.stringify(candidateScene)===JSON.stringify(scene))break;
    progress({stage:`Improving scene ${p.scenes.findIndex(s=>s.id===scene.id)+1}, review ${pass+1}`});
    const candidate=replaceScene(p,candidateScene),assessment=assessProject(candidate),current=assessProject(p);
    if(assessment.errors.length||compareAssessments(assessment,current)>0){corrections.push({sceneId:scene.id,pass,accepted:false,reason:'Proposal worsens validated geometry or breaks project constraints'});break;}
    const after=await review(candidateScene,candidate,pass,'correction'),newGeometry=inspectScene(candidateScene,candidate);
    const sameOrFewerIssues=after.issues.every(a=>before.issues.some(b=>a.code===b.code&&a.layerId===b.layerId));
    const accepted=newGeometry.length<=geometry.length&&sameOrFewerIssues&&(newGeometry.length<geometry.length||after.issues.length<before.issues.length)&&(!before.semantic||before.complete&&after.complete);
    corrections.push({sceneId:scene.id,pass,accepted,before:{geometry:geometry.length,vision:before.issues.length},after:{geometry:newGeometry.length,vision:after.issues.length},reason:accepted?'Fewer observed defects with no new validated defect':'No measurable improvement; retained previous best scene'});
    if(!accepted)break;
    p=candidate;scene=candidateScene;geometry=newGeometry;before=after;snapshot('corrected-'+scene.id+'-'+pass,p);
   }
  }
  if(!vision?.capabilities.includes('vision'))state.limitations.push('No installed semantic vision model. Only measurable geometry repairs run; actual frame samples remain available for human inspection.');
  if(p.scenes.length>scenes.length)state.limitations.push(`Frame-review budget covered ${scenes.length}/${p.scenes.length} scenes. Remaining scenes received structural validation only.`);
  snapshot('frame-reviewed',p);
 }
 check();validateProject(p);const audit=assessProject(p);if(audit.errors.length)throw Error(audit.errors.join('; '));
 alternatives.forEach((a,i)=>a.selected=i===candidateProjects.indexOf(selectedPlan));
 const report={version:3,inferenceEvents:state.inferenceEvents||[],narrationAnalysis:state.narrationAnalysis,aiConnection:{endpoint:state.settings.url,connected:!state.error,error:state.error},layoutChanged:JSON.stringify(p.scenes.map(s=>s.layers))!==JSON.stringify(baseline.scenes.map(s=>s.layers)),selectedPlan:alternatives.find(a=>a.selected)?.source==='baseline'&&p.scenes.some(s=>s.editorialPlanApplied)?'trained editorial recipes':alternatives.find(a=>a.selected)?.source||'baseline',mode:state.mode,candidateBudget:state.cfg.candidates,planningPasses:stages.filter(s=>s.startsWith('alternative-')||s.startsWith('planning-')).length,models:Object.fromEntries(Object.entries(state.models).map(([k,m])=>[k,m?.name||null])),hardware:state.hardware,elapsedSeconds:(Date.now()-state.started)/1000,stages,alternatives,cacheHits:0,assetReviews:state.assetReviews||[],frameReview,corrections,structuralAudit:audit,limitations:[...new Set(state.limitations)],evaluation:'Measured validation/geometry findings and configured vision observations; no subjective quality score.'};
 const refreshed=refreshStoryboard({...p,processingReport:report});
 // Rebuilding one scene must not rewrite untouched scene/storyboard objects.
 p={...refreshed,scenes:refreshed.scenes.map((s,i)=>p.scenes[i]===project.scenes[i]?project.scenes[i]:s)};snapshot('complete',p);return p;
}
