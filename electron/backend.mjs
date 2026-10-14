import {createThumbnailAssetService} from './thumbnail-assets.mjs';
import {createThumbnailImageModel} from './thumbnail-image-model.mjs';
import {frameArtwork} from './artwork-framing.mjs';
import {resolveCreationBrief} from './creation-brief.mjs';
import {auditVisualDelivery} from './visual-delivery.mjs';
import {readPixelEffects,applyPixelEffects,clearPixelEffects} from './pixel-effects.mjs';
import {discoverNamedPeople} from './person-mentions.mjs';
import {applyReferenceStage} from './reference-stage.mjs';
import {renderExportStreams} from './export-streams.mjs';
import {quietScenery} from './quiet-scenery.mjs';
import {createBlueprintScenes} from './blueprint-scenes.mjs';
import {extractAudioScript,readSceneBlueprints,blueprintRequirements} from './scene-blueprint.mjs';
import {finalPictureLayout} from './final-picture-layout.mjs';
import {addVisualPokemonCries,applyVisualPokemonCries} from './pokemon-visual-cries.mjs';
import {createVisualInstructions,explicitVisualBrief} from './visual-instructions.mjs';
import {namedImageMatch,sourceMatchedImage} from './named-images.mjs';
import {auditEngagement} from './engagement-plan.mjs';
import {applyEngagementImages,clearEngagementImages} from './engagement-images.mjs';
import {assertVisibleEdit} from './edit-result.mjs';
import {applyCinematicScenes,clearCinematicScenes} from './cinematic-scenes.mjs';
import {acquireCinematicEnvironments} from './cinematic-assets.mjs';
import {newEditVersion,applyEditVersion} from './edit-version.mjs';
import {applyGoldReferenceBrief} from './gold-reference-policy.mjs';
import {stageMechanicLayout,clearMechanicLayout} from './mechanic-layout.mjs';
import {manualEdit} from './manual-editor.mjs';
import {createDirectChanges} from './direct-changes.mjs';
import {createMissingPokemonRepair} from './missing-pokemon.mjs';
import {freshVisualDraft} from './fresh-project.mjs';
import {applyRankPodiums} from './rank-podiums.mjs';
import {pruneOrphanEffects} from './effect-owners.mjs';
import {createCompetitiveCast} from './competitive-cast.mjs';
import {createPublishedMechanics} from './published-mechanics.mjs';
import {acquireMoveCast,applyExplanationCast,clearExplanationCast} from './explanation-cast.mjs';
import {applyCounterDiagrams,clearCounterDiagrams} from './counter-diagrams.mjs';
import {createGameMusic} from './game-music.mjs';
import {ensureAutomaticMusic} from './automatic-music.mjs';
import {prepareStoryCastCandidates,acquireStoryCast,applyStoryCast} from './story-cast.mjs';
import {applyLayeredActivity,clearLayeredActivity,auditLayeredActivity} from './layered-activity.mjs';
import {creativeRequest,sourceMechanicRequest} from './creative-request.mjs';
import {applyVisualCadence,clearVisualCadence} from './visual-cadence.mjs';
import {applyNarrativeHook,clearNarrativeHook} from './narrative-hook.mjs';
import {applyReferenceProps} from './reference-props.mjs';
import {applyPerformances,clearPerformances} from './actor-performances.mjs';
import {cachedRenderBundle} from './render-bundle-cache.mjs';
import {serveMedia} from './media-stream.mjs';
import {visibleLayers} from './layer-visibility.mjs';
import {renderProject} from './render-project.mjs';
import {createReviewRenderer} from './review-renderer.mjs';
import {applyNarratedPictureCoverage,clearNarratedPictureCoverage} from './narrated-picture-coverage.mjs';
import {atomicReplaceSync} from './atomic-replace.mjs';
import {createVoiceoverTools} from './voiceover-tools.mjs';
import {createThumbnailTools} from './thumbnail-tools.mjs';
import {createNarrationProps} from './narration-props.mjs';
import {measureProjectArtwork,refineAttachmentAnchors} from './artwork-geometry.mjs';
import {arrangeOverlays} from './overlay-layout.mjs';
import {createSourceMoveCards,applySourceMoveCards,sourceMechanicCues} from './source-move-cards.mjs';
import {clearCreativeActions,acquireCreativeProps,applyCreativeActions} from './creative-actions.mjs';
import {createSourceMovesets,clearSourceMovesets,applySourceMovesets} from './source-movesets.mjs';
import {createBackgroundCutouts} from './background-cutouts.mjs';
import {clearNarrationExpressions,applyNarrationExpressions} from './narration-expressions.mjs';
import {quickPatch,applyPatchOperations} from './quick-patch.mjs';
import {needsImageResolution,resolveRevisionImages} from './revision-image-intent.mjs';
import {applyFinalInstructions} from './final-instructions.mjs';
import {gameProfile,selectedGame,sceneGame} from './game-selection.mjs';
import {applyReferenceFinish} from './reference-finish.mjs';
import {DEFAULT_INSTRUCTIONS,upgradeDefaultInstructions} from './default-instructions.mjs';
import {acquirePokemonImage} from './pokemon-image-policy.mjs';
import {applyMoveEffects,applySmoothTransitions} from './move-effects.mjs';
import {normalize} from './reactions.mjs';
import {configureShortStyle,applyReferenceShort} from './short-styles.mjs';
import {enrichNatures,applyNatureMints} from './pokemon-natures.mjs';
import {applyCaptionPalette} from './caption-palette.mjs';
import {applyEngagementEffects,applyNarratedBattles} from './engagement-effects.mjs';
import {clearActionMovie,applyActionMovie} from './action-movie.mjs';
import {clearStoryShots,enforceSpokenReveals,applyStoryShots} from './story-shots.mjs';
import {enrichShortMechanics} from './short-mechanics.mjs';
import {rebuildVideo} from './video-rebuild.mjs';
import {speechTimingIssues,replaceSpeech,restoreSpeechLayers} from './speech-timing.mjs';
import {audioIdentity,fingerprintAudio,prepareAudio} from './audio-integrity.mjs';
import {audioRouting} from './audio-routing.mjs';
import {directItems} from './item-director.mjs';
import {applyVisualSequence} from './visual-sequence.mjs';
import {applyBattles,fighters} from './battle-choreography.mjs';
import {planAttention,applyAttention,clearAttention} from './attention-director.mjs';
import {acquireContextMedia} from './context-media.mjs';
import {videoFPS,modeOptions} from './video-modes.mjs';
import {parseRetention,retentionSummary} from './retention-planner.mjs';
import {createFortniteAssets} from './fortnite-assets.mjs';
import {createPokemonGameAssets,addGameLogoLayers,gameMentions} from './pokemon-game-assets.mjs';
import {automaticSounds} from './automatic-sounds.mjs';
import {applyGamePresentation,projectGame,requestsBackView} from './game-presentation.mjs';
import {createReactionGifs,applyReactionGifs} from './reaction-gifs.mjs';
import {addMinecraftCues} from './minecraft-cues.mjs';
import {creationMedia,applyCreationAssets} from './creation-assets.mjs';
import {createMinecraftAssets} from './minecraft-assets.mjs';
import {alignScript} from './script-alignment.mjs';
import {pipelineReport} from './pipeline-report.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import http from 'node:http';
import initSqlJs from 'sql.js';
import {renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {projectHealth} from './project-health.mjs';
import {plan,validateProject} from './planner.mjs';
import {createPokemonService,RIGHTS} from './pokemon.mjs';
import {createMediaProviders} from './media-providers.mjs';
import {directVisuals} from './visual-director.mjs';
import {createAudioBed} from './audio-bed.mjs';
import {applyAiDirection} from './ai-director.mjs';
import {applyInstructions,parseInstructions,selectInstructionAsset} from './editing-instructions.mjs';
import {reviseProject,undoRedo,applyOperations,recordRevision,scenesFor,interpretLocal,requestClauses} from './revisions.mjs';
import {analyzeReaction,entityAssetScore} from './reactions.mjs';
import {assetIdentity,refineVisualBeats} from './asset-identity.mjs';
import {originalMobAssets} from './illustrations.mjs';
import {refreshStoryboard,auditVisuals} from './storyboard.mjs';
import {rankCandidates,resolveSubject,assetQueries} from './asset-relevance.mjs';
import {inspectTransparency} from './media-inspection.mjs';
import {createRevisionAssets,assetRequest} from './revision-assets.mjs';
import {createLocalAI} from './local-ai.mjs';
import {generateDecorativeBackground} from './local-backgrounds.mjs';
import {readPackCatalog,readPackAssets,narrationAssets,narrationSounds} from './asset-packs.mjs';
import {regenerateSelected} from './scene-regeneration.mjs';
export const root=path.resolve(import.meta.dirname,'..');
const workspace=path.join(root,'workspace'); fs.mkdirSync(workspace,{recursive:true});
export function run(command,args,options={}){return new Promise((resolve,reject)=>{const {onStdout,...spawnOptions}=options;const p=spawn(command,args,{windowsHide:true,...spawnOptions});let out='',err='';p.stdout.on('data',d=>{out+=d;onStdout?.(String(d));});p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code===0?resolve(out):reject(Error(err.slice(-4000)||`${command} failed: ${code}`)));});}
export function python(){const p=path.join(root,'.runtime','venv','Scripts','python.exe');if(fs.existsSync(p))return p;throw Error('Project Python environment missing. Run scripts/setup.ps1.');}
export async function createBackend(options={}){
 const workspace=options.workspace||path.join(root,'workspace');fs.mkdirSync(workspace,{recursive:true});
 const SQL=await initSqlJs();const dbpath=path.join(workspace,'library.sqlite');let db=new SQL.Database(fs.existsSync(dbpath)?fs.readFileSync(dbpath):undefined);
 db.run('CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
 const assets=new Map();const token=crypto.randomBytes(24).toString('hex');
 const server=http.createServer((req,res)=>{
  const parts=(req.url||'').split('?')[0].split('/');let p;try{p=parts[1]===token?assets.get(decodeURIComponent(parts[2])):null;}catch{};
  if(!p){res.writeHead(404);res.end();return;}
  serveMedia(req,res,p);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const port=server.address().port;
 const url=m=>{assets.set(m.id,m.path);if(m.pokemon?.animated&&!m.pokemon.spriteWidth&&fs.existsSync(m.path)){const fd=fs.openSync(m.path,'r');try{const header=Buffer.alloc(10);const bytes=fs.readSync(fd,header,0,10,0);if(bytes===10&&/^GIF8[79]a$/.test(header.toString('ascii',0,6)))m={...m,pokemon:{...m.pokemon,spriteWidth:header.readUInt16LE(6),spriteHeight:header.readUInt16LE(8)}};}finally{fs.closeSync(fd);}}return {...m,...(m.pokemon&&m.provider!=='google-images'?{license:RIGHTS.notice,pokemon:{...m.pokemon,...RIGHTS}}:{}),url:`http://127.0.0.1:${port}/${token}/${encodeURIComponent(m.id)}`};};
 let librarySnapshot;
 let dbStamp=fs.existsSync(dbpath)?fs.statSync(dbpath).mtimeMs:0;
 function reloadDB(){const stamp=fs.existsSync(dbpath)?fs.statSync(dbpath).mtimeMs:0;if(stamp!==dbStamp){db.close();db=new SQL.Database(fs.readFileSync(dbpath));dbStamp=stamp;librarySnapshot=undefined;}}
 const storageStats={writes:0,bytes:0,rows:0};
 function flush(){librarySnapshot=undefined;const bytes=db.export(),temp=dbpath+'.'+crypto.randomUUID()+'.saving';try{fs.writeFileSync(temp,bytes);atomicReplaceSync(temp,dbpath);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}storageStats.writes++;storageStats.bytes+=bytes.length;dbStamp=fs.statSync(dbpath).mtimeMs;}
 function library(){reloadDB();if(!librarySnapshot){const result=db.exec('SELECT data FROM media');librarySnapshot=(result[0]?.values||[]).map(row=>url(JSON.parse(row[0])));}return structuredClone(librarySnapshot);}
 function persistMany(records){if(!records.length)return;reloadDB();let changed=0;db.run('BEGIN');try{for(const m of records){const data=JSON.stringify({...m,url:''}),prior=db.exec('SELECT data FROM media WHERE id=?',[m.id])[0]?.values[0]?.[0];if(prior===data)continue;db.run('INSERT OR REPLACE INTO media VALUES (?,?)',[m.id,data]);changed++;}db.run('COMMIT');}catch(e){db.run('ROLLBACK');throw e;}if(changed){storageStats.rows+=changed;flush();}}
 function persist(m){persistMany([m]);}
 async function measureAndPersist(project){const records=[],next=await measureProjectArtwork(project,m=>{records.push(m);return url(m);});persistMany(records);return next;}
 async function frameAndPersist(project){const records=[],next=await frameArtwork(project,path.join(workspace,'framed-artwork'),m=>{records.push(m);return url(m);});persistMany(records);return next;}
 const soundtrack=createGameMusic(path.join(workspace,'game-music'),{inspect:async file=>{const probe=JSON.parse(await run('ffprobe',['-v','error','-show_format','-of','json',file]));return {duration:Number(probe.format.duration)};},register:m=>{persist(m);return url(m);}});
 function indexPacks(){reloadDB();const records=[...readPackAssets(root,workspace),...readPixelEffects(root)];const existing=new Map((db.exec('SELECT id,data FROM media')[0]?.values||[]).map(r=>[r[0],JSON.parse(r[1])]));let changed=false;db.run('BEGIN');try{for(const m of records){const prior=existing.get(m.id);if(!prior){db.run('INSERT INTO media VALUES (?,?)',[m.id,JSON.stringify(m)]);existing.set(m.id,m);changed=true;}else if(m.assetRole==='animation-effect'&&(prior.path!==m.path||JSON.stringify(prior.spriteSheet)!==JSON.stringify(m.spriteSheet))){db.run('UPDATE media SET data=? WHERE id=?',[JSON.stringify({...prior,...m}),m.id]);changed=true;}else if(prior.pokemon&&(!prior.pack||prior.pack.name!==m.pack.name||prior.pokemon.metadataPending&&!prior.duration)){db.run('UPDATE media SET data=? WHERE id=?',[JSON.stringify({...m,...prior,pack:m.pack,pixelArt:true,assetRole:m.assetRole}),m.id]);changed=true;}}db.run('COMMIT');if(changed)flush();}catch(e){db.run('ROLLBACK');throw e;}return readPackCatalog(root,workspace);}
 indexPacks();
 async function downloadPack(id,progress=()=>{}){if(!readPackCatalog(root,workspace).packs.some(p=>p.id===id))throw Error('Unknown asset pack');await new Promise((resolve,reject)=>{const child=spawn(python(),[path.join(root,'python/install_asset_pack.py'),'--pack',id,'--folder',path.join(workspace,'asset-packs')],{windowsHide:true});let pending='',error;child.stdout.on('data',d=>{pending+=d;let i;while((i=pending.indexOf('\n'))>=0){const line=pending.slice(0,i);pending=pending.slice(i+1);try{const v=JSON.parse(line);if(v.error)error=v.error;progress({stage:v.stage+(v.completed?' '+v.completed+'/'+v.total:'')});}catch{}}});child.stderr.on('data',()=>{});child.on('error',reject);child.on('close',code=>code||error?reject(Error(error||'Asset pack download failed; retry to reuse cached files')):resolve());});return indexPacks();}
 async function placeSound(project,mediaId,time=0){const m=library().find(a=>a.id===mediaId);if(m?.assetRole!=='sound-effect'||!m.license)throw Error('Choose a licensed sound effect');if(!Number.isFinite(time)||time<0||time>=project.duration)throw Error('Sound must start inside the video');const next=structuredClone(project);if(!next.media.some(a=>a.id===m.id))next.media.push(m);next.soundEffects=[...(next.soundEffects||[]),{mediaId:m.id,start:time,end:Math.min(project.duration,time+m.duration),volume:.12}];const {recordRevision}=await import('./revisions.mjs');return recordRevision(project,next,'Add sound effect',[],m.name+' inserted at '+time.toFixed(2)+'s','Game Assets');}
 const retentionPath=path.join(workspace,'retention-profile.json');const retentionProfile=()=>fs.existsSync(retentionPath)?JSON.parse(fs.readFileSync(retentionPath,'utf8')):null;
 const pokemon=createPokemonService(path.join(workspace,'pokemon-cache'));
 const localAI=createLocalAI(workspace,{getApiKey:options.getInferenceKey});
 const minecraft=createMinecraftAssets(path.join(workspace,'minecraft'),{...options.minecraftOptions,register:m=>{persist(m);return url(m);},inspect:inspectMedia,run,python});
 const gameMusic={catalog:()=>[...soundtrack.catalog(),...(minecraft.soundStatus()?.files||[]).filter(f=>f.category==='music').map(f=>({id:f.id,name:'Minecraft · '+f.name,game:'minecraft',url:'https://resources.download.minecraft.net/'+f.hash.slice(0,2)+'/'+f.hash,source:'https://www.minecraft.net/en-us/usage-guidelines',credit:'Original Minecraft Java game audio · Mojang / Microsoft',license:minecraft.notice,installed:f.downloaded||f.local}))],download:id=>id.startsWith('minecraft-sound-')?minecraft.importSound(id,true):soundtrack.download(id),indexMinecraft:async()=>{await minecraft.indexSounds();return gameMusic.catalog();}};
 const fortniteAssets=createFortniteAssets(path.join(workspace,'fortnite-fandom'),{register:m=>{persist(m);return url(m);},inspect:inspectMedia});
 const pokemonGames=createPokemonGameAssets(path.join(workspace,'pokemon-game-assets'),{register:m=>{persist(m);return url(m);},inspect:inspectMedia});
 const providers=createMediaProviders(path.join(workspace,'online-cache'),{...options.providerOptions,getKey:()=>options.getProviderKeys?.()['google-images']||''});
 const reactionGifs=createReactionGifs(path.join(workspace,'reaction-gifs'),{register:m=>{persist(m);return url(m);},search:onlineSearch,download:onlineDownload});
 const backgroundCutouts=createBackgroundCutouts(path.join(workspace,'cutouts'),{python:python(),root});
 const narrationProps=createNarrationProps(path.join(workspace,'narration-props'),{register:m=>{persist(m);return url(m);},search:onlineSearch,download:onlineDownload,cutout:backgroundCutouts.cutout,verifyMove:(state,move,file)=>localAI.evaluateAsset(state,{name:'Pokemon '+move.title+' move being performed',type:'move-effect',franchise:'pokemon',context:'Must depict the requested attack itself, not a standalone character portrait, a different attack, invented information panel or a trading card. A real gameplay or anime still/GIF is suitable.'},file)});
 const publishedMechanics=createPublishedMechanics(path.join(workspace,'published-mechanics'),{register:m=>{persist(m);return url(m);}});
 const sourceMoveCards=createSourceMoveCards(path.join(workspace,'source-move-cards'),{register:m=>{persist(m);return url(m);},search:onlineSearch,download:onlineDownload,verify:localAI.evaluateMoveCard,capture:publishedMechanics.capture});
 const competitiveCast=createCompetitiveCast(path.join(workspace,'competitive-cast'));
 async function creativeSourceFallback(prop,{project,scene,at,progress},keys){
  const phrase=s=>' '+String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ',query=phrase(prop.query);
  const cue=(project.shortMechanics?.cues||[]).filter(c=>c.start<=at+.1&&query.includes(phrase(c.title))).sort((a,b)=>b.title.length-a.title.length)[0];
  if(cue){localAI.check();if(cue.kind==='item'){const m=await pokemon.itemAsset(cue.name);persist(m);return url(m);}if(['move','ability'].includes(cue.kind))return publishedMechanics.capture(cue);}
  if(projectGame(project)==='pokemon'){const text=phrase([project.editingInstructions,...project.scenes.map(s=>s.text)].join(' ')),catalog=await pokemon.itemCatalog(),item=catalog.filter(c=>query.includes(phrase(c.name))&&text.includes(phrase(c.name))).sort((a,b)=>b.name.length-a.name.length)[0];if(item){localAI.check();const m=await pokemon.itemAsset(item.name);persist(m);return url(m);}}
  const e=[...(scene.reaction?.entities||[]),...(scene.aiSubjects||[])].find(e=>(e.start??scene.start)<=at+.05&&e.type!=='game'&&query.includes(phrase(e.name)));
  if(!e)return undefined;
  if(e.type==='pokemon')return (await acquirePokemonImage({name:e.id,start:at,end:at},scene,project,{service:pokemon,asset:pokemonAsset,pool:[...project.media,...library()],key:keys['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()})).media;
  const found=await revisionAssets.discover(project,{name:e.name,query:prop.query,kind:'add',purpose:'subject',preferWeb:true},{sceneId:scene.id,onlineFirst:true,imageIntent:{...e,query:prop.query,start:at}},keys);return found.asset;
 }
 const sourceMovesets=createSourceMovesets(path.join(workspace,'source-movesets'),{register:m=>{persist(m);return url(m);},search:onlineSearch,download:onlineDownload,verify:localAI.evaluateMoveset,learnset:pokemon.learnset});
 const finishPresentation=p=>{
  // Undo composition passes in reverse order before rebuilding. Restore the
  // card lanes before authoring prop paths, so actors and evidence coexist.
  let next=clearEngagementImages(clearNarratedPictureCoverage(clearVisualCadence(clearCinematicScenes(clearPixelEffects(p)))));
  next=clearNarrativeHook(next);next=clearLayeredActivity(next);
  next=clearCounterDiagrams(next);next=clearExplanationCast(next);
  next=clearCreativeActions(next);next=clearMechanicLayout(next);next=clearSourceMovesets(next);
  next=clearPerformances(next);next=clearStoryShots(next);next=clearNarrationExpressions(next);next=clearActionMovie(next);
  next=applySmoothTransitions(applyMoveEffects(applyEngagementEffects(applyReferenceFinish(applyNatureMints(applyCaptionPalette(applyReactionGifs(applyReferenceProps(applyGamePresentation(next)))))))));
  next=applyPerformances(applyStoryShots(applyNarrationExpressions(applyActionMovie(enforceSpokenReveals(next)))));
  next=stageMechanicLayout(applySourceMoveCards(applySourceMovesets(next)));
  next=applyCreativeActions(applyStoryCast(next));next=applyRankPodiums(applyCounterDiagrams(applyExplanationCast(next)));next=applyLayeredActivity(next);
  next=applyVisualCadence(applyNarratedPictureCoverage(applyEngagementImages(applyNarrativeHook(next))));
  next=applyCinematicScenes(pruneOrphanEffects(arrangeOverlays(next)));
  if(next.layeredActivityReport)next.layeredActivityReport={...next.layeredActivityReport,...auditLayeredActivity(next)};
  const pool=library();next=applyPixelEffects(applyReferenceStage(finalPictureLayout(next)),pool);next.shortformEngagementReport=auditEngagement(next);return gameProfile(automaticSounds(next,pool));
 };
 async function onlineSearch(query,provider,key,options={}){if(provider==='fortnite-wiki')return (await fortniteAssets.list({query})).files;return provider==='minecraft-wiki'?minecraft.findWiki(query):providers.search(query,provider,key,options);}
 async function onlineDownload(candidate){if(candidate.provider==='fortnite-fandom')return fortniteAssets.download(candidate.id);if(candidate.provider==='minecraft-wiki')return minecraft.importWiki(candidate);const original=await providers.download(candidate);const dims=await inspectMedia(original.path,original.kind);const m={...original,...dims,...(original.decoded?{width:original.width,height:original.height,transparent:original.transparent,animationInfo:original.animationInfo}:{})};persist(m);return url(m);}
 async function enrichVisuals(project,progress=()=>{},providerKeys=options.getProviderKeys?.()||{},quality){
  if(!project.pokemonImageReport)providers.web.beginBudget();project={...project,media:[...project.media],scenes:project.scenes.map(s=>({...s}))};
  const mobFallbacks=[];project.assetSearchLog=[];
  project.media=project.media.map(m=>({...m,identity:assetIdentity(m)}));project.visualVersion=3;
  for(const s of project.scenes){s.words=s.words.map(w=>({...w}));for(const mention of project.pokemonMentions||[]){if(!mention.corrected||mention.status!=='ready')continue;const m=project.media.find(a=>a.id===mention.mediaId);const indexes=s.words.map((w,i)=>w.start>=mention.start-.02&&w.end<=mention.end+.02?i:-1).filter(i=>i>=0);indexes.forEach((index,i)=>{s.words[index].captionText=i===0?m?.pokemon?.displayName||s.words[index].text:'';});}}
  if(projectGame(project)==='pokemon'||['auto','multiple'].includes(project.gameSelection||'auto')&&project.pokemonMentions?.length){const logo=pokemonGames.brandLogo();if(!project.media.some(m=>m.id===logo.id))project.media.push(logo);}
  try{project=await pokemonGames.attach(project,progress);}catch(e){project.gameAssetWarnings=[e.message];}
  const backgroundPool=library().filter(m=>m.assetRole==='background'&&['image','video'].includes(m.kind)&&m.license&&m.identity?.franchise==='pokemon').slice(0,12);if(project.shortStyle||/pok[e\u00e9]mon/i.test(project.scenes.map(s=>s.text).join(' ')))for(const m of backgroundPool)if(!project.media.some(a=>a.id===m.id))project.media.push(m);
  project=await acquireCinematicEnvironments(project,{search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},library:library(),keys:providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''},progress,check:()=>localAI.check(),...(['high','ultra'].includes(quality?.mode)&&quality?.models?.vision?.capabilities?.includes('vision')?{verify:m=>localAI.evaluateAsset(quality,{name:'Pokemon battle arena background',type:'background',franchise:'pokemon',context:'A clean environment for foreground characters: no dominant character, combat UI, captions, move description card, collage or watermark. Scenery and a distant arena crowd are suitable.'},m.path)}:{})});
  if(project.gamePatterns===false&&project.shortStyle&&project.creationAssets?.backgroundMode!=='upload'&&project.creationAssets?.backgroundMode!=='generate'&&!project.media.some(m=>m.assetRole==='background'&&m.identity?.franchise==='pokemon')){
   try{progress({stage:'Finding real Pokemon game scenery for the reference Short'});const game=(await pokemonGames.games()).find(g=>g.code==='champions');if(game){const bg=await pokemonGames.background(game);if(bg)project.media.push(bg);}}catch(e){project.gameAssetWarnings=[...(project.gameAssetWarnings||[]),'Reference scenery unavailable: '+e.message];}
  }
  project=await enrichNatures(project,m=>{persist(m);return url(m);});
  if(!project.shortMechanics)project=await enrichShortMechanics(project,pokemon,progress);
  if(!quality&&providerKeys['google-images']&&sourceMechanicCues(project).length)quality=await localAI.begin('high');
  project=await narrationProps.acquire(project,{library:library(),keys:providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''},state:quality,progress,check:()=>localAI.check()});
  project=await sourceMovesets.acquire(project,{keys:providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''},state:quality,progress,check:()=>localAI.check()});
  project=await sourceMoveCards.acquire(project,{library:library(),keys:providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''},progress,check:()=>localAI.check(),state:quality,canVerify:!!quality?.models?.vision?.capabilities?.includes('vision')});
  project=await acquireMoveCast(project,{usage:competitiveCast,resolve:pokemon.resolve,progress,check:()=>localAI.check(),image:async(name,scene,p)=>{const choice=await acquirePokemonImage({name,start:scene.start,end:scene.start,displayName:name},scene,p,{service:pokemon,asset:pokemonAsset,pool:[...p.media,...library()],key:providerKeys['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()});return choice.media;}});
  project=await acquireStoryCast(project,{progress,check:()=>localAI.check(),image:async(name,scene,p)=>(await acquirePokemonImage({name,start:scene.start,end:scene.start,displayName:name},scene,p,{service:pokemon,asset:pokemonAsset,pool:[...p.media,...library()],key:providerKeys['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()})).media});
  const sourceKeys=providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''};project=await acquireCreativeProps(project,{search:onlineSearch,download:onlineDownload,cutout:backgroundCutouts.cutout,resolveSource:(prop,context)=>creativeSourceFallback(prop,context,sourceKeys),library:library(),keys:sourceKeys,progress,check:()=>localAI.check()});
  project=await measureAndPersist(project);
  let previousReaction=project.contextReaction;
  for(const scene of project.scenes){
   scene.aiSubjects=[...(scene.aiSubjects||[]),...discoverNamedPeople(scene,project)];scene.reaction=analyzeReaction(scene,project,previousReaction);const proposal=scene.aiPlan;if(proposal){const needsData=proposal.intent==='comparison'&&scene.reaction.entities.length<2||proposal.intent==='ranking'&&!scene.reaction.rankings.length||['statistic','timeline'].includes(proposal.intent)&&!scene.reaction.metrics.length;if(!needsData){scene.reaction.intent=proposal.intent;scene.reaction.theme=proposal.backgroundTheme;scene.reaction.focus=['first','second'].includes(proposal.focus)?proposal.focus:'balanced';scene.reaction.aiPlanUsed=true;}else scene.reaction.aiPlanRejected='Proposed scene intent requires unsupported subjects or numeric facts';}previousReaction=scene.reaction;
   if(scene.reaction.relationship){const relation=scene.reaction.relationship;try{Object.assign(relation,await pokemon.evolution(relation.from,relation.to));if(!relation.verified)relation.warning='The narrated evolution is not a direct relationship in PokeAPI; review the claim.';}catch(e){relation.warning=`Evolution relationship could not be verified: ${e.message}`;}}
   for(const entity of scene.reaction.entities){
    if(entity.type==='pokemon'&&entity.mediaId||project.shortMechanics?.cues.some(c=>c.sceneId===scene.id&&normalize(c.title)===normalize(entity.name)))continue;
    const queryPlan=scene.editorialPlan?.visualQueries?.find(q=>q.entityId===entity.id);if(queryPlan)entity.query=queryPlan.query;
    const override=project.media.find(m=>m.id===scene.visualOverrides?.[entity.id]);if(override){entity.mediaId=override.id;entity.assetStatus='manual';continue;}
   const localPool=library().filter(m=>['image','video','pokemon'].includes(m.kind)&&(m.name+' '+m.tags).toLowerCase().includes(entity.name.toLowerCase().replace(/^Minecraft /i,'')));const allRanked=rankCandidates(entity,[...new Map([...project.media,...localPool].map(m=>[m.id,m])).values()].filter(m=>['image','video','pokemon'].includes(m.kind)),{query:entity.name,purpose:entity.type==='game'?'background':'subject'});project.assetSearchLog.push({sceneId:scene.id,entity:entity.name,provider:'local',query:entity.name,returned:allRanked.length,candidates:allRanked.map(c=>({id:c.id,name:c.name,...c.selection}))});const ranked=allRanked.filter(c=>c.selection.accepted&&c.identity?.source!=='original programmatic illustration');
   scene.assetSelections=scene.assetSelections||[];scene.assetSelections.push({entityId:entity.id,query:entity.query||entity.name,alternatives:ranked.slice(0,12).map(c=>({mediaId:c.id,name:c.name,selection:c.selection})),selected:ranked[0]?.id});
   const local=ranked.find(c=>!c.attribution);
   const cached=ranked.find(c=>c.provider!=='google-images'||c.selection.autoEligible||/^User-confirmed/.test(c.identity?.source||''));
    if(local||cached){const chosen=local||cached;entity.mediaId=chosen.id;entity.assetStatus=local?'local':'cached';if(chosen.usageStatus)entity.warning=chosen.license||chosen.rightsNotice;if(!project.media.some(m=>m.id===chosen.id))project.media.push(chosen);project.assetSearchLog.at(-1).inserted=chosen.id;continue;}
    const errors=[];
    for(const provider of [...(providerKeys['google-images']&&providers.web.status().enabled?['google-images']:[]),...(entity.franchise==='minecraft'?['minecraft-wiki']:[]),...(entity.id==='fortnite'||entity.franchise==='fortnite'?['fortnite-wiki']:[]),'permitted','commons',...['pexels','pixabay'].filter(p=>providerKeys[p])]){
     progress({stage:`Finding permitted visual for ${entity.name}`});
     for(const query of assetQueries(entity,entity.type==='game'?'background':'subject',entity.query||entity.name).slice(0,provider==='google-images'?1:3)){try{const candidates=await onlineSearch(query,provider,providerKeys[provider],{purpose:entity.type==='person'?'person':entity.type==='game'?'background':'subject',subjectName:entity.name});const rankedOnline=rankCandidates(entity,candidates.map(c=>({...c,kind:'image',tags:c.tags||c.attribution?.description})),{query:entity.name,purpose:entity.type==='game'?'background':'subject'});project.assetSearchLog.push({sceneId:scene.id,entity:entity.name,provider,query:candidates[0]?.searchQuery||query,returned:candidates.length,candidates:rankedOnline.map(c=>({id:c.id,name:c.name,...c.selection}))});const candidatesForReview=rankedOnline.filter(c=>(c.width>=320||c.pixelArt||c.provider==='google-images')&&c.selection.accepted&&(namedImageMatch(entity,c)||c.selection.score>=(c.provider==='google-images'&&quality?.models?.vision?.capabilities.includes('vision')&&['high','ultra'].includes(quality.mode) ? .65 : .75))&&(c.provider==='google-images'||c.usageStatus!=='requires-user-rights'));scene.assetSelections.at(-1).alternatives.push(...rankedOnline.slice(0,6).map(c=>({candidate:c,selection:c.selection})));
      let selected;
      for(const candidate of candidatesForReview){
       localAI.check();let media;try{media=await onlineDownload(candidate);if(media.provider==='google-images'&&!media.webAssessment?.accepted)continue;}catch(e){errors.push('Original download: '+e.message);continue;}
       if(quality?.models.vision?.capabilities.includes('vision')&&['high','ultra'].includes(quality.mode)){
        progress({stage:'Evaluating actual candidate image for '+entity.name});
        const proxyFolder=path.join(workspace,'processing',project.id,'asset-proxies');fs.mkdirSync(proxyFolder,{recursive:true});const proxy=path.join(proxyFolder,media.id+'.png');
        await run('ffmpeg',['-v','error','-y','-i',media.path,'-frames:v','1','-vf','scale=640:640:force_original_aspect_ratio=decrease',proxy],{signal:quality.signal});
        const inspection=await localAI.evaluateAsset(quality,entity,proxy);quality.assetReviews=quality.assetReviews||[];quality.assetReviews.push({entity:entity.name,mediaId:media.id,...inspection});
        media.assetReview={subject:entity.id,...inspection};persist(media);if(!inspection.accepted)continue;
       }
       if(media.decoded&&namedImageMatch(entity,candidate)){media=sourceMatchedImage(entity,media);persist(media);}selected=media;scene.assetSelections.at(-1).selected=candidate.id;break;
      }
      if(!selected)continue;if(!project.media.some(a=>a.id===selected.id))project.media.push(selected);entity.mediaId=selected.id;entity.assetStatus='online';if(selected.usageStatus)entity.warning=selected.license||selected.rightsNotice;project.assetSearchLog.at(-1).inserted=selected.id;break;
     }catch(e){errors.push(`${provider}: ${e.message}`);project.assetSearchLog.push({sceneId:scene.id,entity:entity.name,provider,query,error:e.message,returned:0});}}if(entity.mediaId)break;
    }
    if(!entity.mediaId){const fallback=mobFallbacks.find(m=>m.identity.subject===entity.id.replace(/^minecraft-/,''));if(fallback){persist(fallback);if(!project.media.some(m=>m.id===fallback.id))project.media.push(url(fallback));entity.mediaId=fallback.id;entity.assetStatus='illustration-fallback';entity.warning='No permitted exact-game image found. Using an original block-style diagram, not Minecraft footage.';project.assetSearchLog.push({sceneId:scene.id,entity:entity.name,provider:'original diagram fallback',inserted:fallback.id,reason:entity.warning});continue;}entity.assetStatus='missing';entity.warning=`No verified original image for ${entity.name}. ${!providerKeys['google-images']?'Automatic Google Images needs a SerpApi key in Settings. ':''}${errors.length?': '+errors.join('; '):''}`;}
   }
   scene.reaction.rankings=scene.reaction.rankings.map(r=>({...r,mediaId:scene.reaction.entities.find(e=>e.id===r.entityId)?.mediaId}));
   if(scene.pokemonMode!=='manual')scene.pokemon=(scene.pokemon||[]).filter(p=>scene.reaction.entities.some(e=>e.type==='pokemon'&&e.mediaId===p.mediaId));
   scene.visualMediaIds=scene.visualMediaIds||scene.reaction.entities.filter(e=>e.mediaId).map(e=>e.mediaId);
   if(!scene.mediaId&&!scene.pokemon?.length)scene.mediaId=scene.reaction.entities.find(e=>e.mediaId)?.mediaId;

  }
  if(project.gamePatterns===false||!['pokemon','minecraft'].includes(projectGame(project)))project=await acquireContextMedia(project,{search:onlineSearch,download:onlineDownload,keys:providerKeys,progress,check:()=>localAI.check()});
  const audio=createAudioBed(path.join(workspace,'generated-audio')).map(m=>{persist(m);return url(m);});for(const m of audio)if(!project.media.some(a=>a.id===m.id))project.media.push(m);
  project.musicId=project.musicId||audio[0].id;project.soundEffects=project.soundEffects||[];
  const musicRequest=requestClauses(project.editingInstructions||'').find(c=>/\b(?:music|soundtrack|song)\b/i.test(c)&&/\b(?:use|play|change|replace|remove|mute|set)\b/i.test(c));
  if(musicRequest)try{progress({stage:'Choosing requested game music'});const edited=await directChanges(project,musicRequest,{scope:'whole',useAI:false},providerKeys,progress);if(edited)project={...edited,revisionHistory:project.revisionHistory,revisionCursor:project.revisionCursor};}catch(e){project.gameAssetWarnings=[...(project.gameAssetWarnings||[]),'Requested music: '+e.message];}
  project=await ensureAutomaticMusic(project,{catalog:gameMusic.catalog,download:gameMusic.download,progress,check:()=>localAI.check()});
  for(const f of narrationSounds(library(),project.scenes)){if(!project.media.some(m=>m.id===f.media.id))project.media.push(f.media);if(!project.soundEffects.some(s=>s.mediaId===f.media.id&&Math.abs(s.start-f.start)<.1))project.soundEffects.push({mediaId:f.media.id,start:f.start,volume:f.volume,auto:true});}
  project=applyGamePresentation(applyReferenceShort(addGameLogoLayers(directVisuals(project))));
  project=await reactionGifs.acquire(project,{library:library(),keys:providers.web.status().enabled?providerKeys:{...providerKeys,'google-images':''},progress,check:()=>localAI.check()});
  return refreshStoryboard(await itemDirection(finishPresentation(project),'',undefined,providerKeys,progress,undefined,quality));
 }
 async function pokemonCry(name,variant='latest'){const m=await pokemon.cry(name,variant);const probe=JSON.parse(await run('ffprobe',['-v','error','-show_format','-of','json',m.path]));m.duration=Number(probe.format.duration);if(!(m.duration>0))throw Error('Cry has no playable audio');persist(m);return url(m);}
 async function visualCries(p,progress=()=>{}){return addVisualPokemonCries(p,{library:library(),loadCry:name=>pokemonCry(name),progress,check:()=>localAI.check()});}
 async function cryRevision(before,after,progress=()=>{}){
  if(after.pendingRevision)return after;
  const next=await visualCries(after,progress),entry=after.revisionHistory?.at((after.revisionCursor??after.revisionHistory?.length??0)-1);
  if(entry&&entry.id!==before.revisionHistory?.at((before.revisionCursor??before.revisionHistory?.length??0)-1)?.id){const recorded=recordRevision(before,next,entry.request,entry.operations,entry.summary,entry.interpreter);return {...recorded,...(after.editPreviewTime!==undefined?{editPreviewTime:after.editPreviewTime}:{}),...(after.editPreviewRevisionId?{editPreviewRevisionId:recorded.revisionHistory.at(-1).id}: {})};}
  return next;
 }
 async function pokemonAsset(name,options){const m=await pokemon.asset(name,options);persist(m);return url(m);}
 async function enrichPokemon(project,words,progress=()=>{},providerKeys=options.getProviderKeys?.()||{}){
  if(project.gameSelection&&!['auto','multiple','pokemon'].includes(project.gameSelection))return {...project,pokemonMentions:[],scenes:project.scenes.map(s=>({...s,pokemon:[]}))};
  providers.web.beginBudget();project={...project,media:[...project.media],scenes:project.scenes.map(s=>({...s,pokemon:[]})),pokemonMentions:[],pokemonWarnings:[],pokemonImageReport:[]};
  try{project.pokemonMentions=await pokemon.mentions(words,{pokemonContext:!!project.shortStyle||/pok[e?]mon|vgc|showdown/i.test(project.editingInstructions||'')});project.pokemonRecognitionReport={...pokemon.recognitionStatus(),recognized:project.pokemonMentions.filter(m=>m.status!=='unresolved').length,corrected:project.pokemonMentions.filter(m=>m.corrected).length,review:project.pokemonMentions.filter(m=>m.status==='unresolved').length};}catch(e){project.pokemonWarnings.push(`Pokémon identification unavailable: ${e.message}. Cached media and the rest of the edit remain usable.`);return project;}
  for(const mention of project.pokemonMentions){
   if(mention.status==='unresolved'){project.pokemonWarnings.push(mention.warning);continue;}
   try{const scene=project.scenes.find(s=>mention.start>=s.start&&mention.start<s.end),choice=await acquirePokemonImage(mention,scene,project,{service:pokemon,asset:pokemonAsset,pool:[...project.media,...library()],key:providerKeys['google-images']||options.getProviderKeys?.()['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()});const m=choice.media;project.pokemonImageReport.push(choice.log);mention.mediaId=m.id;mention.status='ready';project.media=project.media.filter(a=>a.id!==m.id);project.media.push(m);}
   catch(e){mention.status='unavailable';mention.warning=e.message;project.pokemonWarnings.push(e.message);}
  }

  const narration=words.map(w=>w.text).join(' ');
  const globalLayout=/\b(team of six|six pok[eé]mon|my team|team roster)\b/i.test(narration)?'team':/\b(top|rankings?|ranked)\b/i.test(narration)?'ranking':/\b(versus|vs|compare|compared)\b/i.test(narration)?'comparison':null;
  for(const scene of project.scenes){
   const local=project.pokemonMentions.filter(m=>m.start<scene.end);
   const layout=globalLayout||(/\b(team|six|6)\b/i.test(scene.text)?'team':scene.kind==='comparison'?'comparison':scene.kind==='ranking'?'ranking':'solo');
   scene.pokemonLayout=layout;
   scene.pokemon=local.filter(m=>m.mediaId).map(m=>({mentionId:m.id,mediaId:m.mediaId,start:Math.max(scene.start,m.start),end:layout==='solo'?Math.min(scene.end,project.pokemonMentions.find(next=>next.start>m.start)?.start||scene.end):scene.end})).filter(p=>p.end>p.start);
   if(scene.pokemon.length>6){project.pokemonWarnings.push(`Scene ${scene.id} contains more than six Pokémon; review and split the layout.`);scene.pokemon=scene.pokemon.slice(0,6);}
   if(scene.pokemon.length)scene.title=layout==='team'?'Team roster':layout==='comparison'?'Head to head':layout==='ranking'?'Pokémon rankings':project.media.find(a=>a.id===scene.pokemon[0].mediaId).name;
  }
  return project;
 }
 async function inspectMedia(file,kind){if(kind==='audio')return {};if(/\.svg$/i.test(file))return {transparent:true,width:800,height:700};try{const info=JSON.parse(await run('ffprobe',['-v','error','-show_streams','-of','json',file])).streams.find(s=>s.width);return {width:info?.width,height:info?.height,transparent:kind==='image'&&inspectTransparency(file)};}catch(e){throw Error('Cannot inspect selected media '+path.basename(file)+': '+e.message);}}
 const revisionAssets=createRevisionAssets({library,search:onlineSearch,download:onlineDownload,pokemonAsset,pokemonInfo:async name=>pokemon.info(await pokemon.resolve(name)),register:m=>{persist(m);return url(m);},regenerate:(p,r,c,k)=>regenerateSelected(p,r,c,enrichVisuals,k)});
 const repairMissingPokemon=createMissingPokemonRepair({recognize:words=>pokemon.mentions(words,{pokemonContext:true}),image:async(name,scene,p,keys,progress)=>(await acquirePokemonImage({name,start:scene.start,end:scene.start},scene,p,{service:pokemon,asset:pokemonAsset,pool:[...p.media,...library()],key:keys['google-images']||options.getProviderKeys?.()['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()})).media});
 const visualInstructions=createVisualInstructions({assets:revisionAssets,plan:(...args)=>localAI.planVisualInstructions(...args),check:()=>localAI.check(),memberImage:async(member,p,scene,keys,progress)=>{
  if(member.type!=='pokemon'){const found=await revisionAssets.discover(p,{name:member.name,query:member.query,kind:'add',purpose:'subject',preferWeb:true},{sceneId:scene.id,onlineFirst:true,imageIntent:member},keys);if(!found.asset)throw Error(found.reason);return found.asset;}
  const name=await pokemon.resolve(member.name);if(!name)throw Error('Pokemon name could not be resolved: '+member.name);
  return (await acquirePokemonImage({name,start:scene.start,end:scene.start},scene,p,{service:pokemon,asset:pokemonAsset,pool:[...p.media,...library()],key:keys['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()})).media;
 },itemImage:async(name,keys,progress,state)=>{
  const canonical=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');let m;try{m=await pokemon.itemAsset(canonical);}catch(original){
   localAI.check();const source='https://www.championsdex.app/item-icons/'+canonical+'.png',folder=path.join(workspace,'published-item-icons');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,canonical+'.png');
   if(!fs.existsSync(file)){const response=await fetch(source,{signal:state?.signal?AbortSignal.any([state.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw original;const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>2e6)throw original;fs.writeFileSync(file,bytes);}
   const inspected=await inspectMedia(file,'image');m={...inspected,id:'published-item-'+canonical,name,kind:'image',path:file,assetRole:'item',pixelArt:true,license:'Pokemon item artwork belongs to its original rights holders; source retained, reuse permission not asserted.',identity:{franchise:'pokemon',subject:canonical,source:'Published Champions Dex exact-name item icon'},originalUrl:source,attribution:{source,credit:'Pokemon original rights holders / Champions Dex',licenseUrl:'https://www.championsdex.app',changes:'Original icon cached and scaled'}};
  }persist(m);return url(m);
 }});
 const blueprintScenes=createBlueprintScenes({check:()=>localAI.check(),background:async(p,_keys,_progress,originalOnly=false)=>{const cached=[...p.media,...library()].find(m=>m.assetRole==='background'&&!m.quietScenery&&m.game?.code==='champions');let original=cached;if(!original){const game=(await pokemonGames.games()).find(g=>g.code==='champions');if(!game)throw Error('Champions scenery unavailable');original=await pokemonGames.background(game);}if(originalOnly)return url(original);const ready=await quietScenery(original,path.join(workspace,'quiet-scenery'));persist(ready);return url(ready);},trainer:async()=>{const source='https://play.pokemonshowdown.com/sprites/trainers/red.png',folder=path.join(workspace,'blueprint-assets');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'anonymous-trainer-red.png');if(!fs.existsSync(file)){const response=await fetch(source,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Trainer source HTTP '+response.status);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));}const m={id:'blueprint-source-trainer-red',kind:'image',name:'Anonymous trainer silhouette source',path:file,...await inspectMedia(file,'image'),pixelArt:true,transparent:true,assetRole:'character',license:'Pokemon trainer artwork belongs to its original rights holders.',identity:{franchise:'pokemon',subject:'trainer-red',source},attribution:{source,credit:'Pokemon original rights holders / Pokemon Showdown',changes:'Shown only as an anonymous silhouette, not as a real player likeness'}};persist(m);return url(m);},opponents:async()=>Promise.all(['charizard','blastoise'].map(name=>pokemonAsset(name,{sourceKey:'other.official-artwork.front_default'}))),coinImage:async()=>{const m=await pokemon.itemAsset('relic-gold');persist(m);return url(m);},mechanicImage:async(cue,p,keys,progress,state)=>{const matching=p.media.find(m=>m.moveCard?.verified&&(m.provider!=='published-page'||m.captureVersion===5)&&String(m.moveCard.name).toLowerCase().replace(/[^a-z0-9]/g,'')===cue.title.toLowerCase().replace(/[^a-z0-9]/g,''));if(matching)return matching;return publishedMechanics.capture(cue);}});
 async function applyRequiredVisuals(p,text,state,keys,progress,context={}){
  const requestedBlueprint=selectedGame(p)==='pokemon'&&readSceneBlueprints(text).length>0&&!context.timeRange;
  const target=requestedBlueprint?{...p,editingInstructions:text,fps:Number(text.match(/\b(30|60)\s*FPS\b/i)?.[1])||p.fps||30}:p;
  if(requestedBlueprint&&!context.requirements)context={...context,requirements:blueprintRequirements(target)};
  let next=await visualInstructions(target,text,state,keys,progress,context);
  if(requestedBlueprint&&next.visualInstructionReport)next.visualInstructionReport.model='Scene blueprint compiler';
  const groups=next.visualInstructionReport?.applied.filter(r=>r.kind==='group')||[];
  if(groups.length&&/do not obscure.*build|hide.*(?:captions|subtitles).*build|build.*without.*(?:captions|subtitles)/is.test(text))next={...next,scenes:next.scenes.map(s=>({...s,captionStyleRanges:[...(s.captionStyleRanges||[]),...groups.map(g=>({start:Math.max(s.start,g.start),end:Math.min(s.end,g.end),style:{enabled:false}})).filter(r=>r.end>r.start)]}))};
  if(/recording.*ends mid.sentence|recording.*ends.*mid.sentence/i.test(text))next.publicationWarnings=['The supplied recording ends mid-sentence. Its original ending is preserved; add the completed recording before publication.'];
  if(selectedGame(next)==='pokemon'&&readSceneBlueprints(text).length&&!context.timeRange){next=await blueprintScenes(next,progress,keys,state);next=await measureAndPersist(next);next=await frameAndPersist(next);next=applyCinematicScenes(next);next=automaticSounds(next,library());}  if(groups.length&&/\b(?:export|standalone|separate|reusable)\b[\s\S]*\b(?:png|build overlay|build sheet)\b/i.test(text)){
   const folder=path.join(workspace,'exports','required-build-'+crypto.randomUUID()),renderer=createReviewRenderer({root,folder,scale:2});
   try{for(const g of next.visualInstructionReport.applied.filter(r=>r.kind==='group')){localAI.check();progress({stage:'Exporting the requested full-resolution build PNG'});const frame=await renderer.render({...next,media:next.media.map(url),narrationMuted:true,captionStyle:{...next.captionStyle,enabled:false}},Math.round(Math.min(g.end-.1,g.start+.8)*videoFPS(next)),'full-build');next.visualInstructionReport.exports=[...(next.visualInstructionReport.exports||[]),{kind:'png',name:g.name,path:frame.path,width:2160,height:3840}];}}catch(e){localAI.check();next.visualInstructionWarnings=[...(next.visualInstructionWarnings||[]),'The requested PNG export could not finish: '+e.message];}finally{await renderer.close();}
  }
next=applyPixelEffects(applyReferenceStage(finalPictureLayout(next)),library());next=automaticSounds(next,library());
  return refreshStoryboard(next);
 }
 const directChanges=createDirectChanges({assets:revisionAssets,library,music:gameMusic,repairPokemon:repairMissingPokemon,resolveImages:async(p,r,c,progress)=>needsImageResolution(r)?resolveRevisionImages(p,r,c,await localAI.editingSettings(),progress):null,fallback:(p,r,c,k,progress)=>revise(p,r,{},c,k,progress,true),sound:async r=>{
  if(/\b(?:cry|cries)\b/i.test(r)){const found=(await pokemon.mentions(r.split(/\s+/).map(text=>({text,start:0,end:.1})))).find(m=>m.status!=='unresolved');if(!found)throw Error('Name the Pokemon whose cry you want.');return pokemonCry(found.name,/legacy/i.test(r)?'legacy':'latest');}
  const cue=/stat.*(?:boost|rise)|boost.*stat/i.test(r)?'stat-boost':/victory|win/i.test(r)?'victory':/impact|hit/i.test(r)?'impact':/ding|click|menu/i.test(r)?'click':/pop|reveal/i.test(r)?'reveal':/swoosh|whoosh/i.test(r)?'whoosh':null;if(!cue)return null;
  const pool=[...library(),...createAudioBed(path.join(workspace,'generated-audio')).map(m=>{persist(m);return url(m);})],preferred=/pokemon|pok\u00e9mon/i.test(r)?'pokemon':null;
  return pool.filter(m=>m.assetRole==='sound-effect'&&new RegExp('\\b'+cue+'\\b','i').test(m.tags||m.name)).sort((a,b)=>Number(b.identity?.franchise===preferred)-Number(a.identity?.franchise===preferred))[0];
 }});
 async function assetSelection(project,query,context={},keys={}){const result=await revisionAssets.discover(project,{name:query,purpose:project.scenes.find(s=>s.id===context.sceneId)?.layers?.find(l=>l.id===context.layerId)?.role==='background'?'background':'subject'},context,keys);return {query,entity:result.entity,current:project.media.find(m=>m.id===project.scenes.find(s=>s.id===context.sceneId)?.layers?.find(l=>l.id===context.layerId)?.mediaId),candidates:result.candidates,searchLog:result.log,reason:result.reason};}
 async function replaceAsset(project,context,selection,query){let asset;if(selection.mediaId)asset=[...project.media,...library()].find(m=>m.id===selection.mediaId);else{await onlineSearch(selection.searchQuery||query,selection.provider,selection.key);asset=await onlineDownload(selection);}if(!asset)throw Error('Selected asset is missing');const p={...project,media:[...project.media.filter(m=>m.id!==asset.id),asset]};const {applyOperations,recordRevision}=await import('./revisions.mjs');const command={operations:[{type:'replace',sceneIds:[context.sceneId],layerIds:[context.layerId],mediaId:asset.id}]};return recordRevision(p,refreshStoryboard(applyOperations(p,command).project),'Manual asset replacement',command.operations,'Replaced selected layer with '+asset.name,'Asset selection');}
 async function importMedia(file,metadata={}){
  const ext=path.extname(file).toLowerCase();const kind=['.mp4','.mov','.mkv','.webm'].includes(ext)?'video':['.png','.jpg','.jpeg','.webp','.gif','.svg'].includes(ext)?'image':'audio';
  const info=kind==='image'?{format:{duration:0}}:JSON.parse(await run('ffprobe',['-v','error','-show_format','-of','json',file]));
  const id=crypto.randomUUID(); const folder=path.join(workspace,'media');fs.mkdirSync(folder,{recursive:true});const target=path.join(folder,id+ext);fs.copyFileSync(file,target);
  const m={...(metadata.provider?{provider:metadata.provider}:{}),...(metadata.fortnite?{fortnite:metadata.fortnite}:{}),...(metadata.assetRole?{assetRole:metadata.assetRole}:{}),id,name:path.basename(file),originalPath:path.resolve(file),path:target,kind,tags:metadata.tags||'',license:metadata.license||'',duration:Number(info.format.duration)||0,...await inspectMedia(target,kind),...(metadata.identity?{identity:metadata.identity}:{}),...(metadata.attribution?{attribution:metadata.attribution}:{})};const identified=kind==='audio'?await fingerprintAudio(m,run):m;persist(identified);return url(identified);
 }
 async function addMinecraftSounds(p,progress=()=>{}){if(p.gameSelection&&!['auto','multiple','minecraft'].includes(p.gameSelection))return p;return addMinecraftCues(p,{service:minecraft,progress,check:()=>localAI.check()});}
 async function updateScript(project,script,progress=()=>{}){if(!project.originalTranscript)throw Error('This saved project predates script alignment. Generate once to retain the original transcript.');const aligned=alignScript(project.originalTranscript,script);let p={...project,suppliedScript:script,scriptAlignment:aligned.report,scenes:plan(aligned.segments,project.media,project.duration),revisionHistory:[],revisionCursor:0};p.topic=/minecraft/i.test(p.scenes.map(s=>s.text).join(' '))?'minecraft':undefined;p=await enrichPokemon(p,aligned.segments.flatMap(s=>s.words),progress);p=await enrichVisuals(refineVisualBeats(p),progress);return refreshStoryboard(finishPresentation(applyInstructions(await addMinecraftSounds(p,progress))));}
 async function recognizeVoice(voice,opts,media,progress,signal){
  const transcript=path.join(workspace,crypto.randomUUID()+'.json'),vocabularyFile=transcript.replace(/\.json$/,'.vocabulary.json');
  const args=[path.join(root,'python','transcribe.py'),voice.path,transcript,'--model',opts.model||'base.en','--device',opts.device||'cpu','--cache-dir',path.join(workspace,'transcripts')];
  if(opts.allTakes)args.push('--all-takes');
  const extraNames=String(opts.names||opts.pokemonNames||'').split(/[,;\n]/).map(n=>n.trim()).filter(n=>n&&n.length<80);
  if(opts.pokemon!==false||extraNames.length){const hints=opts.pokemon!==false?pokemon.transcriptionHints({text:[opts.pokemonNames,opts.script,opts.editingInstructions].filter(Boolean).join(' '),names:media.filter(m=>m.pokemon).map(m=>m.pokemon.displayName||m.pokemon.name)}):{domain:'general',names:[],terms:[]};hints.names=[...new Set([...extraNames,...hints.names])].slice(0,35);fs.writeFileSync(vocabularyFile,JSON.stringify(hints));args.push('--vocabulary-json',vocabularyFile);}
  let pending='';
  try{
   await run(python(),args,{signal,onStdout:chunk=>{pending+=chunk;const lines=pending.split('\n');pending=lines.pop();for(const line of lines){try{const event=JSON.parse(line);if(typeof event.stage==='string')progress(event);}catch{}}}});
   return JSON.parse(fs.readFileSync(transcript,'utf8'));
  }finally{for(const file of [transcript,vocabularyFile])if(fs.existsSync(file))fs.unlinkSync(file);}
 }
 const voiceoverTools=createVoiceoverTools({folder:path.join(workspace,'voiceover-work'),root,library,recognize:(source,opts,progress,signal)=>recognizeVoice(source,opts,[],progress,signal),localAI,run,python,register:url,importMedia,saveMedia:m=>{persist(m);return url(m);}});
 const thumbnailSource=createThumbnailAssetService(path.join(workspace,'thumbnail-source-cache')),thumbnailImageModel=createThumbnailImageModel(path.join(workspace,'thumbnail-work'));
 const thumbnailTools=createThumbnailTools({folder:path.join(workspace,'thumbnail-work'),library,localAI,register:url,trainer:thumbnailSource.trainer,cutout:backgroundCutouts.cutout,generate:thumbnailImageModel,resolve:async(a,keys,progress,state)=>{
  const sourceGame=/pokemon|pok\u00e9mon|champions/i.test(a.name+' '+a.query)?'pokemon':/minecraft/i.test(a.name+' '+a.query)?'minecraft':/fortnite/i.test(a.name+' '+a.query)?'fortnite':'unknown';
  const p={id:crypto.randomUUID(),duration:1,format:'vertical',media:library(),scenes:[{id:'thumbnail',start:0,end:1,text:a.name+' '+a.query,words:a.name.split(/\s+/).map((text,i)=>({text,start:i*.01,end:i*.01+.009})),reaction:{entities:[],metrics:[]}}],editingInstructions:'Use the exact named original source asset'};
  if(a.type==='pokemon'){const name=await pokemon.resolve(a.name);return (await acquirePokemonImage({name,start:0,end:0},p.scenes[0],p,{service:pokemon,asset:pokemonAsset,pool:p.media,key:keys['google-images']||'',enabled:providers.web.status().enabled,search:onlineSearch,download:onlineDownload,register:m=>{persist(m);return url(m);},progress,check:()=>localAI.check()})).media;}
  if(a.type==='item'&&!keys['google-images']){const m=await pokemon.itemAsset(a.name.toLowerCase().replaceAll(' ','-'));persist(m);return url(m);}
  if(a.role==='background'){const prior=library().find(m=>sourceGame==='pokemon'&&m.assetRole==='background'&&m.identity?.franchise==='pokemon'&&m.kind==='image'&&/champions.*(?:arena|stadium)|(?:arena|stadium).*champions|clean battle environment/i.test(m.name+' '+m.tags+' '+(m.attribution?.description||''))&&!/showdown|interface|menu|chat|hud|ui screenshot/i.test(m.name+' '+m.tags+' '+(m.attribution?.description||'')));if(prior?.kind==='image')return prior;if(!keys['google-images'])return undefined;}
  const found=await revisionAssets.discover(p,{name:a.name,query:a.query,kind:'add',purpose:'subject',preferWeb:true},{sceneId:'thumbnail',onlineFirst:true,imageIntent:{name:a.name,query:a.query,type:a.type,start:0,franchise:sourceGame}},keys);const asset=found.asset;if(a.role==='background'&&asset&&/showdown|interface|menu|chat|hud|ui screenshot/i.test(asset.name+' '+asset.tags+' '+(asset.attribution?.description||'')))return undefined;return asset;
 }});
 async function repairSpeech(p,context={},keys={},progress=()=>{}){
  validateProject(p);if(p.pendingRevision)throw Error('Finish or cancel the pending image request before repairing speech.');
  const voice=p.media.find(m=>m.id===p.voiceId);if(!voice?.path||!fs.existsSync(voice.path))throw Error('The original narration file is missing. Restore it before repairing speech.');
  const state=await localAI.begin('fast');
  progress({stage:'Recovering spoken words and timing from the original narration'});
  const transcribed=await recognizeVoice(voice,{model:context.model||p.transcriptionInfo?.model||'base.en',device:context.device||'cpu',pokemonNames:p.pokemonNameHints,script:p.suppliedScript,editingInstructions:p.editingInstructions},p.media,progress,state.signal);
  const aligned=alignScript(transcribed.segments,p.suppliedScript||'');
  let next=replaceSpeech(p,transcribed,aligned.segments,aligned.report,plan);
  next=await enrichPokemon(next,aligned.segments.flatMap(s=>s.words),progress,keys);
  next=await enrichVisuals(refineVisualBeats(next),progress,keys,state);
  next=await itemDirection(applyCreationAssets(applyInstructions(next,next.editingInstructions)),'',undefined,keys,progress);
  next=restoreSpeechLayers(finishPresentation(await addMinecraftSounds(next,progress)));
  // Caption styling is independent of recognition and remains the user's design.
  for(const key of Object.keys(p).filter(k=>k.startsWith('caption')))next[key]=structuredClone(p[key]);
  for(const s of next.scenes){const old=p.scenes.find(o=>s.start>=o.start&&s.start<o.end)||p.scenes.at(-1);for(const key of Object.keys(old||{}).filter(k=>k.startsWith('caption')))s[key]=structuredClone(old[key]);}
  next=refreshStoryboard(await prepareAudio(next,run));validateProject(next);
  if(speechTimingIssues(next).some(i=>!i.review))throw Error('Speech timing is still invalid; the original edit was retained. Try a larger speech model.');
  const before=p.scenes.reduce((n,s)=>n+s.words.length,0),after=next.scenes.reduce((n,s)=>n+s.words.length,0);
  next.speechRepairReport={beforeWords:before,afterWords:after,issues:speechTimingIssues(p),model:transcribed.transcription.model,captionAppearancePreserved:true};
  progress({stage:'Speech timing repaired and visuals rebuilt',percent:100});
  return recordRevision(p,next,'Repair speech & timing',[{type:'repair-speech'}],'Recovered '+after+' timed words (previously '+before+') and rebuilt '+next.scenes.length+' scenes. Kept narration audio and caption appearance.','Local speech timing recovery');
 }
 function pendingItem(p,request,context={}){const scene=scenesFor(p,request,context).find(s=>s.itemDirection?.missing?.length);if(!scene)return;const missing=scene.itemDirection.missing[0];return {id:crypto.randomUUID(),request,context:{...context,sceneId:scene.id},target:{name:missing.name,kind:'add',item:true},createdAt:new Date().toISOString(),state:'needs-asset',reason:missing.reason,queries:[missing.name],searchLog:missing.searchLog,candidates:missing.candidates};}
 async function resumeItem(p,id,selection){
  const pending=p.pendingRevision;if(!pending?.target.item){const next=await revisionAssets.resume(p,id,selection);return pending?.remainingInstructions?revise(next,pending.remainingInstructions,{},pending.context,options.getProviderKeys?.()||{}):next;}
  if(pending.id!==id||!selection.confirmIdentity)throw Error('Confirm the requested item image first.');
  let asset;if(selection.mediaId)asset=[...p.media,...library()].find(m=>m.id===selection.mediaId);else{const c=pending.candidates.find(c=>c.id===selection.candidateId);if(!c)throw Error('Select a displayed image');await onlineSearch(c.searchQuery,c.provider,selection.providerKey);asset=await onlineDownload({...c,declaredRights:selection.declaredRights});}
  if(!asset||asset.kind!=='image'||!asset.license)throw Error('Choose an item image with declared rights.');
  asset={...asset,assetRole:'item',tags:(asset.tags||'')+', item: '+pending.target.name,identity:{...asset.identity,subject:pending.target.name,source:'User-confirmed item image',confidence:1}};persist(asset);asset=url(asset);
  const prepared={...p,media:[...p.media.filter(m=>m.id!==asset.id),asset]};delete prepared.pendingRevision;
  const next=await itemDirection(prepared,pending.request,[pending.context.sceneId],{},()=>{},pending.context.time);
  const revised=recordRevision(p,refreshStoryboard(next),pending.request,[],'Inserted '+pending.target.name+' and applied character attachment','Item asset review');const remaining=pendingItem(next,pending.request,pending.context);return remaining?{...revised,pendingRevision:remaining}:revised;
 }
 async function itemDirection(p,request='',sceneIds,keys={},progress=()=>{},time,state){
  let catalog=[];try{catalog=await pokemon.itemCatalog();}catch(e){progress({stage:'Item catalogue unavailable: '+e.message});}
  const placed=await directItems(p,{catalog,itemAsset:async name=>{const m=await pokemon.itemAsset(name);persist(m);return url(m);},library:library(),search:onlineSearch,download:onlineDownload,cutout:backgroundCutouts.cutout,keys,sceneIds,request,progress,time});
  const measured=await measureAndPersist(placed);
  return arrangeOverlays(await refineAttachmentAnchors(measured,{state,locate:localAI.locateAttachment,library:library(),register:m=>{persist(m);return url(m);},progress}));
 }
 async function remake(p,draft='',context={},keys={},progress=()=>{}){
  if(typeof draft!=='string'||draft.length>64000)throw Error('Enter remake instructions of at most 64000 characters.');
  if(context.timeRange||context.scope==='patch'||context.scope==='selected'&&context.sceneId){
   if(context.gameSelection&&context.gameSelection!==(p.gameSelection||'auto'))throw Error('Apply the game selection to the whole video before editing a patch.');
   return quickPatch(p,draft,context,{progress,edit:async(sub,range)=>{
    const target={...(context.layerId?{sceneId:context.sceneId,layerId:context.layerId}:{}),time:Math.max(range.start,Math.min(range.end-.01,context.time??range.start))};
    // Deterministic supported edits do not load models or search assets.
    let command;try{command=interpretLocal(sub,draft,target);}catch{}
    if(command){progress({stage:'Applying the selected object edits',percent:55});return applyPatchOperations(sub,command);}
    if(assetRequest(draft)&&!creativeRequest(draft,context)&&!sourceMechanicRequest(draft)&&!/sound|captions?|charts?|graphs?/i.test(draft))return revisionAssets.apply(sub,draft,target,keys,{});
    const creative=/reference|style|hook|creative|humor|funny|reaction|animate|animation|effect|visual|picture|image|story|battle|attack|on paper|one[- ]shot/i.test(draft);
    if(!creative&&context.useAI===false)throw Error('That patch instruction needs trained AI. Enable AI planning, or name a specific supported object edit.');
    const state=await localAI.begin(context.useAI===false?'fast':context.quality||'high',{useAI:context.useAI!==false});
    const instructions=[upgradeDefaultInstructions(sub.editingInstructions),draft].filter(Boolean).join('\n');
    const protectedLayers=new Map(sub.scenes.map(s=>[s.id,(s.layers||[]).filter(l=>l.manual||l.manualFraming||l.instructionLocked)]));
    let next=freshVisualDraft({...sub,editingInstructions:instructions,editingPreferences:parseInstructions(instructions).preferences});
    // Reuse resolved full-project names/forms and downloaded artwork. Only the
    // selected scenes are analyzed, authored, enriched and sounded.
    progress({stage:'Planning the selected passage using its existing cast',percent:22});next=await localAI.author(await prepareStoryCastCandidates(await localAI.analyze(next,state,progress),{family:pokemon.family,progress,check:()=>localAI.check()}),state,progress);
    next=applyCreationAssets(applyInstructions(await enrichVisuals(next,progress,keys,state),instructions));
    if(next.shortStyle)next=applyReferenceShort(next,{force:true});
    next=await itemDirection(next,'',next.scenes.map(s=>s.id),keys,progress);
    if(!creative&&context.useAI!==false){const settings=await localAI.editingSettings();next=await revisionAssets.apply(next,draft,target,keys,{...settings,requireAI:true});}
    next=finishPresentation(await addMinecraftSounds(next,progress));
    for(const s of next.scenes){const protectedObjects=protectedLayers.get(s.id)||[];s.layers=(s.layers||[]).filter(l=>!protectedObjects.some(p=>p.id===l.id)).concat(protectedObjects);}
    return prepareAudio(next,run);
   }});
  }
  const timingRepaired=speechTimingIssues(p).some(i=>!i.review);
  if(timingRepaired){p=await repairSpeech(p,context,keys,progress);context={...context,preserveCaptions:true};}
  const state=await localAI.begin(context.useAI===false?'fast':context.quality||'high',{useAI:context.useAI!==false});
  let rebuilt;
  try{rebuilt=await rebuildVideo(p,draft,{
   configure:n=>{n=gameProfile({...n,editingInstructions:upgradeDefaultInstructions(n.editingInstructions)},context.gameSelection??n.gameSelection??'auto');const pokemonStyle=n.gameSelection==='pokemon'||n.gameSelection==='auto'&&selectedGame(n)==='pokemon';return applyGoldReferenceBrief(configureShortStyle(n,pokemonStyle?(context.shortStyle??n.shortStyle??(context.referenceMatch?'pokemon-dense':undefined)):undefined));},
   identify:async n=>enrichPokemon(await localAI.analyze(n,state,progress),n.scenes.flatMap(s=>s.words||[]),progress,keys),
   author:async n=>{n.visualInstructionPlan=await localAI.planVisualInstructions(n,n.editingInstructions,state,progress);return localAI.author(await prepareStoryCastCandidates(n,{family:pokemon.family,progress,check:()=>localAI.check()}),state,progress);},enrich:n=>enrichVisuals(n,progress,keys,state),
   animate:context.useAI!==false&&state.mode!=='fast'&&p.localAnimatorEnabled!==false?n=>localAI.animate(n,state,retentionProfile(),progress):undefined,
   items:n=>itemDirection(n,'',undefined,keys,progress,undefined,state),finalize:async n=>finishPresentation(await addMinecraftSounds(n,progress)),prepareAudio:n=>prepareAudio(n,run),profile:retentionProfile(),progress,preserveCaptionText:context.correctNames!==true,preserveCaptions:context.preserveCaptions===true||/\b(?:don['\u2019]?t|do not|never)\s+(?:change|alter|modify)\s+(?:the\s+)?captions?|\b(?:keep|preserve)\s+(?:the\s+)?(?:current\s+|existing\s+)?captions?\s+(?:unchanged|as (?:is|they are))/i.test(draft),
   applyRequest:async n=>n,
   applyFinalRequest:async(n,request)=>{
    n=applyFinalInstructions(n);n=await applyRequiredVisuals(n,n.editingInstructions,state,keys,progress,{requirements:n.visualInstructionPlan});if(!request)return n;
    if(creativeRequest(request,context)){
     const authored=(n.creativePlanningReport?.actions||0)+(n.editorialReport?.scenes?.filter(s=>s.performances?.length).length||0);
     const delivered=(n.creativeActionReport?.events?.length||0)+(n.performanceReport?.events?.length||0);
     if(context.useAI!==false&&(!authored||!delivered))throw Error('The requested story changes were not rendered. '+(n.creativePropWarnings?.join(' ')||n.creativePlanningReport?.warnings?.join(' ')||'The planner did not produce an executable action. Try a specific image or action; your original video is unchanged.'));
     return n;
    }
    if(sourceMechanicRequest(request)||/gold (?:standard|reference)|reference.*(?:short|style)|pokemon (?:artwork|setup) short/i.test(request))return n;
    if(assetRequest(request)&&!/sound|captions?|charts?|graphs?/i.test(request))return revisionAssets.apply(n,request,{},keys,{});
    let command;try{command=interpretLocal(n,request,{});}catch{}
    if(command)return applyOperations(n,command).project;
    if(context.useAI===false)throw Error('This request needs a connected editing model; no unsupported change was silently accepted.');
    const settings=await localAI.editingSettings(),edited=await revisionAssets.apply(n,request,{},keys,{...settings,requireAI:true});
    return {...edited,revisionHistory:n.revisionHistory,revisionCursor:n.revisionCursor};
   }
  });}catch(e){if(timingRepaired&&e.message==='The request would not change the project.')return p;throw e;}
  return rebuilt;
 }
 async function revise(p,r,settings={},context={},keys={},progress=()=>{},skipDirect=false){
  if(p.pendingRevision&&p.pendingRevision.request?.trim()!==r.trim()){p={...p};delete p.pendingRevision;}
  validateProject(p);providers.web.beginBudget();
  if(!skipDirect){if(explicitVisualBrief(r)&&/\b(?:full|whole|entire)\s+team\b|\bteam\b[\s\S]*\b(?:evs|effort values|stat points)\b/i.test(r)){const state=await localAI.begin('fast');const next=await applyRequiredVisuals(p,r,state,keys,progress,context);return recordRevision(p,next,r,[],next.visualInstructionReport.applied.length+' required picture/team changes applied'+(next.visualInstructionWarnings?.length?' ? '+next.visualInstructionWarnings.join(' '):''),'Required visual execution');}const direct=await directChanges(p,r,context,keys,progress);if(direct)return direct;}
  if(context.timeRange)return remake(p,r,context,keys,progress);
  if(/repair.*(?:speech|timing|captions)|(?:fix|recover).*(?:stuck|frozen|missing speech|caption timing)/i.test(r))return repairSpeech(p,context,keys);
  if(/(?:recogniz[es]?|identify|fix|recover|detect|find|correct|missed)\s+(?:the\s+|spoken\s+|all\s+|missed\s+)?pok[e?]mon(?:\s+(?:names|mentions))?/i.test(r))return remake(p,'',{...context,useAI:false,preserveCaptions:true,correctNames:true},keys);
  if(sourceMechanicRequest(r)){
   providers.web.beginBudget();const state=await localAI.begin('high'),ids=new Set(scenesFor(p,r,context).map(s=>s.id));
   let subset=clearMechanicLayout({...p,scenes:p.scenes.filter(s=>ids.has(s.id)),editingInstructions:[upgradeDefaultInstructions(p.editingInstructions),r].filter(Boolean).join('\n')});
   subset=await enrichShortMechanics(subset,pokemon,progress);
   subset=await sourceMoveCards.acquire(subset,{library:library(),keys:providers.web.status().enabled?keys:{...keys,'google-images':''},state,canVerify:!!state.models?.vision?.capabilities?.includes('vision'),progress,check:()=>localAI.check()});
   const sourced=arrangeOverlays(stageMechanicLayout(applySourceMoveCards(subset))),scenes=new Map(sourced.scenes.map(s=>[s.id,s]));
   const next={...p,sourceMechanicImagesOnly:true,editingInstructions:subset.editingInstructions,sourceMoveCardReport:subset.sourceMoveCardReport,media:[...new Map([...p.media,...sourced.media].map(m=>[m.id,m])).values()],scenes:p.scenes.map(s=>scenes.get(s.id)||s)};
   const images=sourced.scenes.flatMap(s=>s.layers||[]).filter(l=>l.sourceMoveCard).length,missing=subset.sourceMoveCardReport.filter(c=>c.status==='unavailable').map(c=>c.move);
   return recordRevision(p,refreshStoryboard(next),r,[],'Applied '+images+' sourced mechanic image(s). Homemade cards removed.'+(missing.length?' No verified image found for: '+missing.join(', ')+'.':''),'Sourced mechanic images');
  }
  if(creativeRequest(r,context))return remake(p,r,{...context,useAI:true,referenceMatch:true,preserveCaptions:true,correctNames:true},keys,progress);
  if(/animate (?:the |my )?(?:narration|story|video)|animated movie|on paper|leaf storm|physical (?:or|and) special|sad face|good together|pair.*(?:pokemon|pok.mon)|act out.*(?:say|narration)|one[- ]shot|more (?:images|pictures|visuals)|new (?:image|picture).*every.*(?:2|two)/i.test(r))return remake(p,r,{...context,useAI:context.useAI!==false,referenceMatch:true,preserveCaptions:true,correctNames:true},keys,progress);
  if(/gold (?:standard|reference)|layered (?:pokemon )?short|diabolical.*style|champions.*reference.*style/i.test(r))return remake(p,r,{...context,shortStyle:'pokemon-dense'},keys);
  if(/sceptile (?:reference|style|short)|pokemon setup short|setup explainer short/i.test(r))return remake(p,r,{...context,shortStyle:'pokemon-setup'},keys);
  if(/reference (?:pokemon|pok.mon|artwork) short|pokemon artwork short|style of (?:the|my) reference/i.test(r))return remake(p,r,{...context,shortStyle:'pokemon-artwork'},keys);
  if(/wolfey|vgc style|held items?|item images?|attach|put .* (?:on|head)|wear .*hat|give .* (?:item|hat)|\b(?:give|equip|wears?|holds?|holding)\b|\b(?:use|uses|using)\b.*\b(?:item|hat|scarf|orb|berry|sash|band)\b/i.test(r)){
   const ids=scenesFor(p,r,context).map(s=>s.id),style=/wolfey|vgc style/i.test(r);
   let next=style?applyVisualSequence(clearAttention(p),{sceneIds:ids,force:true}):structuredClone(p);
   next.scenes=p.scenes.map(s=>ids.includes(s.id)?next.scenes.find(n=>n.id===s.id):s);
   next=await itemDirection(next,r,ids,keys,()=>{},context.time);
   if(/google/i.test(r)&&!keys['google-images'])for(const scene of next.scenes.filter(s=>ids.includes(s.id)))scene.itemDirection.warnings.push('Google Images needs a SerpAPI key in Online Images; item sprites and your library were used.');
   const placed=next.scenes.filter(s=>ids.includes(s.id)).flatMap(s=>s.itemDirection?.placed||[]),warnings=next.scenes.filter(s=>ids.includes(s.id)).flatMap(s=>s.itemDirection?.warnings||[]);
   if(!style&&!placed.length){const pending=pendingItem(next,r,context);if(pending)return {...p,pendingRevision:pending};throw Error(warnings.join(' ')||'No named item was found. Name the item and character, or upload an image tagged as an item/hat.');}
   for(const scene of next.scenes.filter(s=>ids.includes(s.id)))if(style){scene.shotPurpose='Competitive explanation: relevant callouts, item interactions and two-second visual beats; hold complete actions.';scene.captionStyle={...scene.captionStyle,wordsPerGroup:4};}
   const revised=recordRevision(p,refreshStoryboard(next),r,[],(style?'Applied competitive explainer pacing. ':'')+'Placed '+placed.length+' item image(s), '+placed.filter(c=>c.targetId).length+' attached to characters.'+(warnings.length?' Missing assets: '+warnings.join(' '):''),'Narration item and shot director');const pending=pendingItem(next,r,context);return pending?{...revised,pendingRevision:pending}:revised;
  }
  if(/(?:every|each)\s*(?:2|two)\s*(?:seconds?|s)\b|switch.*(?:pictures|images|visuals)|more.*(?:custom images|diagrams)/i.test(r)){const ids=scenesFor(p,r,context).map(s=>s.id),uploaded=applyCreationAssets(clearAttention(p)),prepared={...uploaded,scenes:p.scenes.map(s=>ids.includes(s.id)?uploaded.scenes.find(n=>n.id===s.id):s)},next=await itemDirection(applyVisualSequence(prepared,{sceneIds:ids,force:true}),'',ids,keys);return recordRevision(p,refreshStoryboard(next),r,[],'Applied visible two-second image/diagram changes with chart reading holds','Visual sequence editor');}
  if(/fight|brawl|make .*battle|attack each other|dust\s*cloud|thunderbolt|flamethrower|water[- ]gun|tackle/i.test(r)&&!/^\s*(remove|delete)\b/i.test(r)){
   const targets=scenesFor(p,r,context).map(s=>s.id),state=await localAI.begin('high'),plan=await localAI.battle(p,r,targets,state);
   let next=applyBattles(p,plan);providers.web.beginBudget();
   const imageKeys=providers.web.status().enabled?keys:{...keys,'google-images':''};
   next=await narrationProps.acquire(next,{library:library(),keys:imageKeys,state,progress,check:()=>localAI.check()});
   next=await sourceMoveCards.acquire(next,{library:library(),keys:imageKeys,state,canVerify:!!state.models?.vision?.capabilities?.includes('vision'),progress,check:()=>localAI.check()});
   next=automaticSounds(arrangeOverlays(applySourceMoveCards(applyBattles(next,plan))),library());
   return recordRevision(p,refreshStoryboard(next),r,[],'Choreographed '+plan.battles.length+' smooth battle(s) with sourced move images when available: '+plan.battles.map(b=>b.move).join(', '),'Trained battle director: '+plan.model);
  }
  if((assetRequest(r)||/remove.*try again/i.test(r))&&!/sound|sfx|cries|\bcry\b|captions?|charts?|graphs?|particles|spotlight|transitions?/i.test(r)){providers.web.beginBudget();return revisionAssets.apply(p,r,context,keys,{});}
  settings={...(context.useAI===false?{}:await localAI.editingSettings()),requireAI:context.useAI!==false,preferExactCommands:context.useAI===false};
  if(context.useAI===false){settings.model=undefined;settings.connectionError=undefined;}
  if(settings.requireAI&&settings.supportsVision){
   const serveUrl=await cachedRenderBundle(root),composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:p}}),folder=path.join(workspace,'processing','ai-changes');fs.mkdirSync(folder,{recursive:true});
   const file=path.join(folder,crypto.randomUUID()+'.png'),time=context.time??scenesFor(p,r,context)[0].start+.5;
   await renderStill({serveUrl,composition,inputProps:{project:p},frame:Math.max(0,Math.min(composition.durationInFrames-1,Math.round(time*videoFPS(p)))),output:file,scale:.5});settings.images=[fs.readFileSync(file).toString('base64')];
  }

  if(settings.requireAI&&/\b(?:cohesive|cohesion|smoother|smooth|visual story|richer backgrounds?|more animations?)\b/i.test(r)&&/make|improve|add|redo|rebuild|more|smooth|cohes/i.test(r)){
   const targets=new Set(scenesFor(p,r,context).map(s=>s.id)),state=await localAI.begin('high');
   const contextual=await acquireContextMedia({...p,editingInstructions:(p.editingInstructions||'')+'\n'+r},{search:onlineSearch,download:onlineDownload,keys,check:()=>localAI.check()});
   const directed=await localAI.animate(contextual,state,retentionProfile(),()=>{});
   const sequenced=applyAttention(planAttention(directed,retentionProfile()));const next={...sequenced,scenes:p.scenes.map(s=>targets.has(s.id)?sequenced.scenes.find(n=>n.id===s.id):s)};
   return recordRevision(p,refreshStoryboard(next),r,[], 'Directed '+targets.size+' scene(s) with contextual scenery, supporting shots and coordinated motion','Whole-video shot director');
  }
  if(settings.requireAI&&/\b(?:chart|graph|infographic|particles|spotlight)\b/i.test(r)&&/add|make|create|show|redo|regenerate|animate/i.test(r)){return regenerateSelected(p,r,context,async(sub,progress,k)=>{const quality=await localAI.begin('high');const authored=await localAI.author(sub,quality,progress);const chartRequest=/chart|graph|infographic/i.test(r);if(!authored.editorialReport?.scenes.some(s=>chartRequest?s.chart!=='none':s.effect!=='none'))throw Error(chartRequest?'No supported chart data was found. Include comparable numbers and units in the narrated script.':'No supported visual effect was proposed; no changes were applied.');return enrichVisuals(authored,progress,k,quality);},keys);}
  if(/\b(?:cry|cries)\b/i.test(r)&&/add|use|insert|play/i.test(r)){const mentions=await pokemon.mentions(r.split(/\s+/).map(text=>({text,start:0,end:.1})));const found=mentions.find(m=>m.status!=='unresolved');if(!found)throw Error('Name the exact Pokémon whose cry you want');const cry=await pokemonCry(found.name,/legacy/i.test(r)?'legacy':'latest');const at=Number(r.match(/at\s+(\d+(?:\.\d+)?)\s*(?:seconds|s)?/i)?.[1]??context.time??0);return placeSound(p,cry.id,at);}
  if(/\blogos?\b/i.test(r)&&/add|show|use|replace/i.test(r)){const catalogue=await pokemonGames.games(),targets=scenesFor(p,r,context);const matches=gameMentions({text:r,start:targets[0].start,words:[]},catalogue);if(matches.length){let next=structuredClone(p);const assets=[];for(const mention of matches)for(const game of mention.game.versions||[mention.game])assets.push(await pokemonGames.logo(game));next.media=[...new Map([...next.media,...assets].map(m=>[m.id,m])).values()];const operations=[];for(const scene of targets)for(const [i,m] of assets.entries())operations.push({type:'add',sceneIds:[scene.id],mediaId:m.id,x:assets.length>1?.04+i*.48:.16,y:.07,start:Math.max(scene.start,Math.min(scene.end-.05,context.time??scene.start)),end:scene.end});next=applyOperations(next,{operations}).project;for(const scene of next.scenes.filter(s=>targets.some(t=>t.id===s.id)))for(const layer of scene.layers.filter(l=>assets.some(m=>m.id===l.mediaId)&&l.id.includes('-added-'))){layer.role='game-logo';layer.width=assets.length>1?.42:.68;layer.height=next.format==='horizontal'?.2:.15;layer.animation='spring-pop';layer.animationAmount=.06;}return recordRevision(p,refreshStoryboard(next),r,operations,'Inserted exact Pokémon game logo(s)','Game logo library');}}
  if(/(?:sound effects?|sfx|whoosh|impact|reveal sound|victory sound|click sound)/i.test(r)&&/add|use|insert/i.test(r)&&!/(?:minecraft|villager|eating|creeper|chest)/i.test(r)){const audio=createAudioBed(path.join(workspace,'generated-audio')).map(m=>{persist(m);return url(m);});const cue=/victory|win/i.test(r)?'victory':/impact|hit|attack/i.test(r)?'impact':/click/i.test(r)?'click':/pop|reveal/i.test(r)?'reveal':/whoosh/i.test(r)?'whoosh':null;if(cue){const m=[...library(),...audio].find(m=>m.assetRole==='sound-effect'&&m.license&&new RegExp('\\b'+cue+'\\b','i').test(m.tags));if(!m)throw Error('No matching sound effect available');const start=Number(r.match(/at\s+(\d+(?:\.\d+)?)\s*(?:seconds|s)?/i)?.[1]??context.time??0);return placeSound(p,m.id,start);}const next=automaticSounds({...p,autoSoundEffects:true},[...library(),...audio]);return recordRevision(p,next,r,[], 'Added '+next.soundEffectReport.automatic+' automatic sound accents','Sound cue planner');}
  if(/(?:sound|sfx)/i.test(r)&&/(?:minecraft|villager|eating|creeper|chest)/i.test(r)&&/add|use|replace/i.test(r)){
   const catalog=minecraft.soundStatus();if(!catalog)throw Error('Index a Minecraft version in Minecraft Sounds first. The original project is retained.');const event=/eat/i.test(r)?'entity.generic.eat':/level/i.test(r)?'entity.player.levelup':/chest/i.test(r)?'block.chest.open':/villager/i.test(r)?'entity.villager.ambient':/explosion|explod/i.test(r)?'entity.generic.explode':'entity.creeper.primed';const f=catalog.files.find(f=>f.events.includes(event));if(!f)throw Error('The selected version has no '+event+' sound');const m=await minecraft.importSound(f.id,true);const t=Number(r.match(/at\s+(\d+(?:\.\d+)?)\s*(?:seconds|s)?/i)?.[1]??context.time??0);
   let next=await placeSound(p,m.id,t);if(/instead|replace/i.test(r)){const prior=next.soundEffects.slice(0,-1).filter(f=>f.start>=p.scenes.find(s=>s.id===context.sceneId)?.start&&f.start<p.scenes.find(s=>s.id===context.sceneId)?.end).at(-1);if(prior)next.soundEffects=next.soundEffects.filter(f=>f!==prior);}return next;
  }return revisionAssets.apply(p,r,context,keys,settings);
 }
 async function generate(opts,progress=()=>{}){
  opts=resolveCreationBrief(opts);
  const stages=[],begin=Date.now();const quality=await localAI.begin(opts.quality||'balanced');let mark=Date.now();const stage=name=>{stages.push({name,seconds:(Date.now()-mark)/1000});mark=Date.now();};stage('Model discovery');
  const available=library();const voice=available.find(m=>m.id===opts.voiceId);if(!voice||voice.kind!=='audio')throw Error('Choose an imported audio voiceover');
  const allMedia=creationMedia(available,voice,opts);if(opts.backgroundMode==='upload'&&!opts.backgroundMediaId)throw Error('Choose a background');if(opts.backgroundMode==='generate'){if(!quality.settings.imageGeneration?.enabled)throw Error('Configure the local image model in Advanced AI settings');quality.settings={...quality.settings,imageGeneration:{...quality.settings.imageGeneration,prompt:opts.backgroundPrompt}};}else if(opts.backgroundMode)quality.settings={...quality.settings,imageGeneration:{...quality.settings.imageGeneration,enabled:false}};
  progress({stage:'Transcribing locally (first run downloads the Whisper model)'});
  const transcribed=await recognizeVoice(voice,{...opts,pokemon:opts.pokemon!==false&&['auto','multiple','pokemon'].includes(opts.gameSelection||'auto')},allMedia,progress,quality.signal),originalSegments=transcribed.segments;const suppliedScript=opts.script||extractAudioScript(opts.editingInstructions);const aligned=alignScript(originalSegments,suppliedScript);const segments=aligned.segments;
  stage('Word-level transcription');const media=Array.isArray(opts.selectedMediaIds)?allMedia:narrationAssets(allMedia,segments.map(s=>s.text).join(' '),voice);
  let project={id:crypto.randomUUID(),creativePassId:crypto.randomUUID(),editVersion:newEditVersion(),name:opts.name||'Untitled gaming video',voiceId:voice.id,...modeOptions(opts),duration:voice.duration,fps:Number(opts.editingInstructions?.match(/\b(30|60)\s*FPS\b/i)?.[1])||30,scenes:plan(segments,media,voice.duration),media,captionColor:'#8affcb',musicVolume:0.08,editingInstructions:upgradeDefaultInstructions(opts.editingInstructions),processingBudget:quality.cfg,creationBriefReport:opts.creationBriefReport,transcriptionInfo:transcribed.transcription,pokemonNameHints:String(opts.pokemonNames||'').slice(0,4000),suppliedScript:suppliedScript||'',originalTranscript:originalSegments,scriptAlignment:aligned.report,autoMinecraftSounds:opts.autoMinecraftSounds!==false,localAnimatorEnabled:opts.localAnimatorEnabled!==false,autoPokemonCries:opts.autoPokemonCries!==false,autoSoundEffects:opts.autoSoundEffects!==false,autoReactionGifs:opts.autoReactionGifs!==false,gamePatterns:opts.gamePatterns!==false,topic:/minecraft/i.test(segments.map(s=>s.text).join(' '))?'minecraft':undefined};
  project.creationAssets=Array.isArray(opts.selectedMediaIds)?{fileIds:opts.selectedMediaIds,imageIds:opts.selectedMediaIds.filter(id=>media.some(m=>m.id===id&&['image','pokemon'].includes(m.kind))&&id!==opts.backgroundMediaId),backgroundMediaId:opts.backgroundMode==='upload'?opts.backgroundMediaId:undefined,backgroundMode:opts.backgroundMode,clips:opts.gameplayClips||[]}:undefined;project.editingPreferences=parseInstructions(project.editingInstructions).preferences;
  project=gameProfile(project,opts.gameSelection||'auto');project=configureShortStyle(project,(project.gameSelection==='pokemon'||project.gameSelection==='auto'&&selectedGame(project)==='pokemon')?opts.shortStyle:undefined);project=applyGoldReferenceBrief(project);stage('Initial scene timing');const explicitBlueprint=(selectedGame(project)==='pokemon')&&readSceneBlueprints(project.editingInstructions).length>0;if(!explicitBlueprint)project=await localAI.analyze(project,quality,progress);stage('Narration analysis');
  if(opts.pokemon!==false)project=await enrichPokemon(project,segments.flatMap(s=>s.words),progress,opts.providerKeys);
  project=applyGoldReferenceBrief(gameProfile(project,opts.gameSelection||'auto'));stage('Exact Pokemon resolution');project=refineVisualBeats(project);project.visualInstructionPlan=explicitBlueprint?blueprintRequirements(project):await localAI.planVisualInstructions(project,project.editingInstructions,quality,progress);project=planAttention(project,retentionProfile());if(!explicitBlueprint){project=await enrichShortMechanics(project,pokemon,progress);project=await prepareStoryCastCandidates(project,{family:pokemon.family,progress,check:()=>localAI.check()});project=await localAI.author(project,quality,progress);}stage('Executable editorial recipes');
  project=await enrichVisuals(project,progress,opts.providerKeys,quality);project=await addMinecraftSounds(project,progress);stage('Asset search and composition');project.scenes=project.scenes.map((s,i)=>({...s,transition:i?'crossfade':undefined}));
  if(explicitBlueprint){
   project=refreshStoryboard(applyFinalInstructions(applyInstructions(project)));project=await applyRequiredVisuals(project,project.editingInstructions,quality,opts.providerKeys||{},progress,{requirements:project.visualInstructionPlan});project=await visualCries(project,progress);validateProject(project);project.processingReport={mode:quality.mode,aiConnection:{connected:!!quality.models.reasoning},inferenceEvents:quality.inferenceEvents||[],limitations:quality.limitations||[],layoutChanged:true,selectedPlan:'Executed current user scene blueprint'};project.visualDeliveryReport=auditVisualDelivery(project);project.pipelineReport=pipelineReport(project,stages);project.pipelineReport.provider='Provided scene blueprint';project.pipelineReport.totalSeconds=(Date.now()-begin)/1000;progress({stage:project.sceneBlueprintReport?.missing.length?'Storyboard rendered with disclosed missing sources - review scene evidence':'Scene blueprint ready',percent:100});return project;
  }
  if(opts.director?.model&&!quality.models.planning){progress({stage:'Directing visuals with configured Ollama model'});project=await applyAiDirection(project,opts.director);}
  project=refreshStoryboard(applyInstructions(project));try{project=await generateDecorativeBackground(project,quality,{folder:workspace,force:opts.backgroundMode==='generate',register:m=>{persist(m);return url(m);},progress});}catch(e){localAI.check();if(opts.backgroundMode==='generate')throw e;quality.limitations.push('Decorative background fallback: '+e.message);}project=refreshStoryboard(applyCreationAssets(project));const review=createReviewRenderer({root,folder:path.join(workspace,'processing',project.id),check:()=>localAI.check()});try{project=await localAI.direct(project,quality,progress,(p,frame,label)=>review.render(p,frame,label));}finally{await review.close();}project=refreshStoryboard(finishPresentation(applyReferenceShort(applyCreationAssets(project),{force:true})));stage('Model layout and rendered review');if(project.localAnimatorEnabled&&quality.mode!=='fast'){project=await localAI.animate(project,quality,retentionProfile(),progress);stage('Local animation and retention plan');}project=refreshStoryboard(applyAttention(project.attentionPlan?project:planAttention(project,retentionProfile())));stage('Executing planned two-second attention beats');
  if(quality.mode!=='fast'&&quality.models.reasoning){for(const scene of project.scenes){if(!project.actionMovieReport?.plans.some(a=>a.start<scene.end&&a.end>scene.start)&&/fight|battle|attack each other|thunderbolt|flamethrower|water[- ]gun/i.test(scene.text)&&fighters(scene,project).length>=2){try{progress({stage:'Choreographing narrated Pokémon battle: '+scene.id});const battle=await localAI.battle(project,scene.text,[scene.id],quality);project=refreshStoryboard(applyBattles(project,battle));}catch(e){localAI.check();quality.limitations.push('Battle choreography: '+e.message);}}}}project=refreshStoryboard(finishPresentation(await itemDirection(project,'',undefined,opts.providerKeys,progress)));project=applyEditVersion(applyFinalInstructions(project));project=await applyRequiredVisuals(project,project.editingInstructions,quality,opts.providerKeys||options.getProviderKeys?.()||{},progress,{requirements:project.visualInstructionPlan});project=await visualCries(project,progress);validateProject(project);project.visualDeliveryReport=auditVisualDelivery(project);project.pipelineReport=pipelineReport(project,stages);project.pipelineReport.totalSeconds=(Date.now()-begin)/1000;progress({stage:project.pipelineReport.fallbackUsed?'Edit ready with disclosed fallback - review Pipeline evidence':'Edit ready',percent:100});return project;
 }
 async function render(project,output,progress=()=>{}){
  project=await visualCries(project,progress);
  project=await prepareAudio(project,run);
  const health=projectHealth(project);if(!health.ready)throw Error('Export preflight failed: '+health.issues.filter(i=>i.severity==='error').map(i=>i.message).join('; '));validateProject(project);if(project.visualVersion===3){const audit=auditVisuals(project);if(audit.errors.length)throw Error('Visual validation failed: '+audit.errors.join('; '));}const usedPaths=project.scenes.flatMap(s=>visibleLayers(s).filter(l=>l.mediaId).map(l=>project.media.find(m=>m.id===l.mediaId)?.path));for(const file of usedPaths)if(!file||!fs.existsSync(file))throw Error('Selected visual file is missing: '+file);project={...project,media:project.media.map(url)};
  progress({stage:'Preparing Remotion composition'});
  const serveUrl=await cachedRenderBundle(root);
  const inputProps={project:renderProject(project)};const composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps});
  const temp=output+'.render.mp4',pcm=output+'.render.wav';const final=output+'.verified.mp4';const routes=audioRouting(project),hasAudio=!!routes.voice||!!routes.music||routes.effects.length>0;
  try{
   await renderExportStreams({composition,serveUrl,inputProps,temp,pcm,hasAudio,progress});
   progress({stage:'Normalizing audio and validating export'});
   if(!hasAudio)await run('ffmpeg',['-y','-i',temp,'-c:v','copy','-an','-movflags','+faststart',final]);
   else try{await run('ffmpeg',['-y','-i',temp,'-i',pcm,'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','aac','-b:a','192k','-movflags','+faststart',final]);}
   catch(e){if(!/NaN|\+?-Inf/i.test(e.message))throw e;progress({stage:'Keeping silent audio without loudness normalization'});await run('ffmpeg',['-y','-i',temp,'-i',pcm,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-b:a','192k','-movflags','+faststart',final]);}
   const info=JSON.parse(await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',final]));
   const v=info.streams.find(s=>s.codec_type==='video');const a=info.streams.find(s=>s.codec_type==='audio');
   if(!v||hasAudio&&!a||v.width!==composition.width||v.height!==composition.height||Math.abs(Number(info.format.duration)-project.duration)>0.5)throw Error('Export validation failed');
   fs.renameSync(final,output);const used=new Set([project.voiceId,project.musicId,...(project.soundEffects||[]).map(f=>f.mediaId),...project.scenes.flatMap(s=>s.layers?visibleLayers(s).map(l=>l.mediaId):[s.mediaId,...(s.pokemon||[]).map(p=>p.mediaId)])]);const credits=project.media.filter(m=>used.has(m.id)&&(m.license||m.attribution||m.rightsNotice||m.pokemon)).map(m=>({name:m.name,license:m.license||'',usageStatus:m.usageStatus,rightsNotice:m.rightsNotice,originalUrl:m.originalUrl,searchQuery:m.searchQuery,format:m.format,width:m.width,height:m.height,attribution:m.attribution||m.pokemon||{credit:m.license,source:m.identity?.source||'User-declared local asset',licenseUrl:''}}));fs.writeFileSync(output+'.attribution.json',JSON.stringify(credits,null,2));fs.writeFileSync(output+'.attribution.txt',credits.map(m=>`${m.name}\n${m.attribution.credit||m.attribution.attribution}\n${m.attribution.source||m.attribution.sourceUrl}\n${m.license||m.rightsNotice||'Reuse permission not verified'}\n${m.attribution.licenseUrl}\n${m.attribution.changes||''}`).join('\n\n'));progress({stage:'Export verified',percent:100});return {output,width:v.width,height:v.height,duration:Number(info.format.duration)};
  }finally{for(const f of [temp,pcm,final])if(fs.existsSync(f))fs.unlinkSync(f);}
 }
 async function analyzeReference(file){const stat=fs.statSync(file);const id=crypto.createHash('sha256').update(path.resolve(file)+stat.size+stat.mtimeMs+'v2').digest('hex').slice(0,20);const folder=path.join(workspace,'reference-analysis',id),report=path.join(folder,'analysis.json');if(!fs.existsSync(report))await run(python(),[path.join(root,'python','analyze_reference.py'),file,folder]);const data=JSON.parse(fs.readFileSync(report,'utf8'));return {...data,frames:data.frames.map((f,i)=>({...f,url:url({id:'analysis-'+id+'-'+i,path:f.path}).url}))};}
 return {prepareStoryCast:p=>prepareStoryCastCandidates(p,{family:pokemon.family}),voiceoverTools,thumbnailTools,finalizePresentation:finishPresentation,executeVisualInstructions:applyRequiredVisuals,validateEditResult:assertVisibleEdit,gameMusic,manualEdit:(p,c)=>{const next=refreshStoryboard(manualEdit(p,c)),voiced=applyVisualPokemonCries(next,library()),entry=next.revisionHistory.at(-1);return recordRevision(p,voiced,entry.request,entry.operations,entry.summary,entry.interpreter);},webImages:{...providers.web,async importUrl(value,metadata){const m=await providers.web.importUrl(value,metadata);persist(m);return url(m);},async download(c){return onlineDownload(c);},async apply(p,candidate,context,mode='add'){const m=candidate.path?library().find(a=>a.id===candidate.id):await onlineDownload(candidate);if(!m)throw Error('Imported image is missing');const next={...p,media:[...p.media.filter(a=>a.id!==m.id),m]};const operations=[mode==='replace'?{type:'replace',sceneIds:[context.sceneId],layerIds:[context.layerId],mediaId:m.id}:{type:'add',sceneIds:[context.sceneId],mediaId:m.id}];return cryRevision(p,recordRevision(p,refreshStoryboard(applyOperations(next,{operations}).project),'Web image '+mode,operations,m.name+' '+mode+'ed','Google Images'));}},remake:async(p,...args)=>cryRevision(p,await remake(p,...args),args[3]),repairSpeech,prepareAudio:p=>prepareAudio(p,run),health:projectHealth,retentionStatus:()=>retentionSummary(retentionProfile()),importRetention(file){const profile=parseRetention(fs.readFileSync(file,'utf8'));profile.filename=path.basename(file);fs.writeFileSync(retentionPath,JSON.stringify(profile,null,2));return retentionSummary(profile);},clearRetention(){if(fs.existsSync(retentionPath))fs.unlinkSync(retentionPath);return retentionSummary(null);},async animateProject(project,progress=()=>{},keys={}){const state=await localAI.begin('high');const contextual=await acquireContextMedia(planAttention(project,retentionProfile()),{search:onlineSearch,download:onlineDownload,keys,progress,check:()=>localAI.check()});const next=await itemDirection(applyAttention(await localAI.animate(planAttention(contextual,retentionProfile()),state,retentionProfile(),progress)),'',undefined,keys,progress);return recordRevision(project,await visualCries(refreshStoryboard(next),progress),'Local AI animator and retention plan',[],'Authored '+(next.animationPlan?.beats.reduce((n,b)=>n+b.moments.length,0)||0)+' animation cues using '+next.animationPlan.model,'Local animator');},fortniteAssets,pokemonCry,pokemonGames,minecraft,updateScript,storageStats:()=>({...storageStats}),packCatalog:()=>readPackCatalog(root,workspace),indexPacks,downloadPack,placeSound,localAI,library,importMedia,generate,render,analyzeReference,applyReferenceStyle(p,style){if(!style||![style.captionFontSize,style.captionWords,style.entranceSeconds,style.backgroundTravel,style.subjectSize].every(Number.isFinite)||style.captionFontSize<16||style.captionFontSize>100||style.captionWords<1||style.captionWords>12||style.entranceSeconds<.03||style.entranceSeconds>3||style.subjectSize<.5||style.subjectSize>1||style.backgroundTravel<0||style.backgroundTravel>.2)throw Error("Invalid reference style preset");return refreshStoryboard(applySourceMoveCards(directVisuals({...p,referenceStyle:style,scenes:p.scenes.map(s=>({...s,captionStyle:undefined,manualTemplate:false})),revisionHistory:[],revisionCursor:0})));},onlineSearch,onlineDownload,enrichVisuals,revise:async(p,...args)=>cryRevision(p,await revise(p,...args),args[4]),resumeRevision:async(p,...args)=>cryRevision(p,await resumeItem(p,...args)),assetSelection,replaceAsset,async editAudio(p,kind,index,values){const next=structuredClone(p);if(!Number.isFinite(values.start)||!Number.isFinite(values.end)||values.start<0||values.end>p.duration||values.end<=values.start)throw Error('Audio timing must fit inside the video');if(kind==='music')next.musicClip={...next.musicClip,start:values.start,end:values.end};else if(kind==='sfx'&&next.soundEffects?.[index])Object.assign(next.soundEffects[index],{start:values.start,end:values.end});else throw Error('Audio clip no longer exists');const {recordRevision}=await import('./revisions.mjs');return recordRevision(p,next,'Audio timeline edit',[],kind+' timing updated','Timeline');},applyLayerOperations:async(p,operations,label='Manual layer edit')=>{const {applyOperations,recordRevision}=await import('./revisions.mjs');return cryRevision(p,recordRevision(p,refreshStoryboard(applyOperations(p,{operations}).project),label,operations,label,'Properties / timeline'));},regenerateScene:async(p,r,c={},keys={})=>{const settings=await localAI.editingSettings();return regenerateSelected(p,r,c,async(sub,progress,k)=>{const quality=await localAI.begin('high');let rebuilt=await localAI.author(sub,quality,progress);rebuilt=await enrichVisuals(rebuilt,progress,k,quality);if(settings.model)rebuilt=await applyAiDirection(rebuilt,{...settings,geometryOnly:true});return rebuilt;},keys);},undoRedo,async regenerateInstructions(project,text,director){director=await localAI.editingSettings();const prefs=parseInstructions(text).preferences;const scenes=freshVisualDraft(project).scenes.map(s=>({...s,layers:undefined,reaction:s.reaction?{...s.reaction,entities:s.reaction.entities.map(e=>{if(e.type==='pokemon'||s.visualOverrides?.[e.id])return e;const m=selectInstructionAsset(project.media.filter(m=>!m.attribution),m=>entityAssetScore(e,m),prefs)||selectInstructionAsset(project.media,m=>entityAssetScore(e,m),prefs);return m?{...e,mediaId:m.id}:e;})}:undefined}));const quality=await localAI.begin('high');let next=await localAI.author({...freshVisualDraft(project),captionStyle:project.captionStyle,scenes,editingInstructions:text,editingPreferences:prefs,revisionHistory:[],revisionCursor:0},quality,()=>{});next=await enrichVisuals(next,()=>{},options.getProviderKeys?.()||{},quality);next=directVisuals(next);if(director?.model)next=await applyAiDirection(next,{...director,geometryOnly:true});const {recordRevision}=await import('./revisions.mjs');next=refreshStoryboard(finishPresentation(addGameLogoLayers(applyInstructions(next,text))));next=await applyRequiredVisuals(next,text,quality,options.getProviderKeys?.()||{},()=>{});return cryRevision(project,recordRevision(project,next,text,[],'Regenerated visuals using '+(director.model||'built-in planner'),'AI visual regeneration'));},configureOnlineLibrary:providers.configureLibrary,pokemonSearch:pokemon.search,pokemonInfo:pokemon.info,pokemonAsset,enrichPokemon,updateMedia(m){persist(m);return url(m);},hydrate(p){validateProject(p);p=pruneOrphanEffects(p);return {...p,media:p.media.map(m=>url(m.kind==='audio'&&[p.voiceId,p.musicId,...(p.soundEffects||[]).map(f=>f.mediaId)].includes(m.id)?audioIdentity(m):m)),...(p.pendingRevision?{pendingRevision:{...p.pendingRevision,candidates:p.pendingRevision.candidates.map(c=>c.origin==='library'?{...url(c),origin:c.origin,selection:c.selection}:c)}}:{})};},close(){thumbnailTools.close();publishedMechanics.close().catch(()=>{});backgroundCutouts.close();server.close();db.close();}};
}
