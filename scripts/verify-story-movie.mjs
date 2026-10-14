import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {createBackend,root} from '../electron/backend.mjs';
import {createReactionGifs} from '../electron/reaction-gifs.mjs';
import {clearActionMovie} from '../electron/action-movie.mjs';
const dir=path.join(root,'workspace/story-movie-check');fs.mkdirSync(dir,{recursive:true});
const b=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')});
const raw=p=>p.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words.map(w=>[w.text,w.start,w.end])]);
try{
 const cached=process.argv.includes('--reuse')&&fs.existsSync(path.join(dir,'generated.gaming.json'));
 const voice=cached?null:await b.importMedia(path.join(dir,'narration.wav'),{assetRole:'narration',license:'Windows SAPI diagnostic narration'});
 const source=cached?b.hydrate(JSON.parse(fs.readFileSync(path.join(dir,'generated.gaming.json'),'utf8'))):await b.generate({voiceId:voice.id,name:'Narration movie diagnostic',quality:'fast',model:'base.en',pokemon:true,pokemonNames:'Mega Sceptile, Basculegion',shortStyle:'pokemon-dense',videoMode:'youtube-shorts',autoPokemonCries:false,autoReactionGifs:true,localAnimatorEnabled:false},e=>console.log(e.stage));
 const p=cached?await b.remake(source,'',{useAI:false,preserveCaptions:true,correctNames:true},{},e=>console.log(e.stage)):source;
 fs.writeFileSync(path.join(dir,'generated.gaming.json'),JSON.stringify(p,null,2));
 console.log('Real transcript:',p.scenes.map(s=>s.text).join(' '));
 assert.ok(p.pokemonMentions.some(m=>m.name==='sceptile-mega'&&m.status==='ready'),'Real speech did not recover Mega Sceptile');
 assert.ok(p.pokemonMentions.some(m=>m.name==='basculegion-male'&&m.status==='ready'),'Real speech did not recover Basculegion');
 // Replay the reported ASR spellings through the actual remake, retaining all
 // original audio timings. This is a deliberately damaged transcript fixture.
 const broken=clearActionMovie(p);broken.revisionHistory=[];broken.revisionCursor=0;
 for(const s of broken.scenes){for(const w of s.words){if(/^megasceptile\W*$/i.test(w.text)){w.text='Mega Setile';delete w.captionText;}else if(/^sceptile\W*$/i.test(w.text)){w.text='Setile';delete w.captionText;}if(/^basculegion\W*$/i.test(w.text)){w.text='Basky Legion';delete w.captionText;}if(/^bascule$/i.test(w.text)){w.text='Basky';delete w.captionText;}if(/^jun\W*$/i.test(w.text)){w.text='Legion.';delete w.captionText;}}s.text=s.words.map(w=>w.text).join(' ');}
 broken.captionStyle={...broken.captionStyle,fontSize:47,bottom:.19};for(const s of broken.scenes)s.captionStyle={...s.captionStyle,fontSize:47,bottom:.19};
 fs.writeFileSync(path.join(dir,'repair-source.gaming.json'),JSON.stringify(broken,null,2));
 const before=structuredClone(broken),n=await b.remake(broken,'',{useAI:false,referenceMatch:true,preserveCaptions:true,correctNames:true},{},e=>console.log(e.stage));
 assert.deepEqual(broken,before);assert.deepEqual(raw(n),raw(broken));assert.deepEqual(n.captionStyle,broken.captionStyle);assert.deepEqual(n.scenes.map(s=>s.captionStyle),broken.scenes.map(s=>s.captionStyle));
 assert.ok(n.pokemonRecognitionReport.corrected>0);assert.ok(n.actionMovieReport.plans.length,'No actual action animation');assert.ok(n.storyShotReport.events.some(e=>e.kind==='small'));assert.ok(n.reactionGifPlan.length,'No actual decoded GIFs');
 assert.ok(!n.scenes.flatMap(s=>s.layers).some(l=>l.role?.includes('hook-teaser')));
 for(const m of n.pokemonMentions.filter(m=>m.status==='ready')){const first=Math.min(...n.pokemonMentions.filter(a=>a.mediaId===m.mediaId).map(a=>a.start));assert.ok(n.scenes.flatMap(s=>s.layers).filter(l=>l.mediaId===m.mediaId&&!l.manual&&l.role!=='background').every(l=>l.start>=first-.01),'Future named image preview');}
 assert.deepEqual(b.undoRedo(n,'undo').scenes,broken.scenes);assert.deepEqual(b.undoRedo(b.undoRedo(n,'undo'),'redo').scenes,n.scenes);
 n.musicId=undefined;n.musicVolume=0;fs.writeFileSync(path.join(dir,'project.gaming.json'),JSON.stringify(n,null,2));
 // Decode the additional public reaction sources through the production importer.
 const gifs=createReactionGifs(path.join(dir,'reaction-sources'),{register:m=>m});
 const gp=await gifs.acquire({media:[],duration:12,scenes:[{id:'g',start:0,end:12,words:[{text:'fast',start:1,end:1.3},{text:'slow',start:4,end:4.3},{text:'strong',start:7,end:7.3}],layers:[]}]},{progress:e=>console.log(e.stage)});
 assert.equal(gp.reactionGifPlan.length,3,JSON.stringify(gp.reactionGifWarnings));
 fs.writeFileSync(path.join(dir,'reaction-sources.json'),JSON.stringify(gp,null,2));
 const a=n.actionMovieReport.plans[0],concept=n.storyShotReport.events.find(e=>e.kind==='small'),reaction=n.reactionGifPlan[0];
 const samples=[{name:'hook',time:.3},{name:'small',time:concept.start+.25},{name:'gif',time:reaction.start+.45},{name:'beam',time:a.start+a.duration*.4},{name:'impact',time:a.start+a.duration*.58},{name:'faint',time:a.start+a.duration*.9}];
 const serveUrl=await bundle({entryPoint:path.join(root,'src/remotion.tsx')}),composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:n}});
 for(const sample of samples)await renderStill({serveUrl,composition,inputProps:{project:n},frame:Math.round(sample.time*30),output:path.join(dir,sample.name+'.png'),scale:.5});
 const output=await b.render(n,path.join(dir,'story-movie.mp4'),e=>{if(e.percent===undefined)console.log(e.stage);});
 fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({realWhisper:p.transcriptionInfo,damagedASRFixture:true,narrationTimingUnchanged:true,captionAppearanceUnchanged:true,inputUnchanged:true,undoRedo:true,names:n.pokemonRecognitionReport,story:n.storyShotReport,actions:n.actionMovieReport,reveals:n.spokenRevealReport,gifs:gp.reactionGifPlan,sounds:n.soundEffectReport,output:output.output,samples},null,2));
 console.log('PASS real Whisper/generation/remake, name recovery, contextual pictures/GIF decoding, action sequence, unchanged captions/audio, Undo/Redo and export');
}finally{b.close();}
