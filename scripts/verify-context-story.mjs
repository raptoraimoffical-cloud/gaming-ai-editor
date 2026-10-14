import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {cachedRenderBundle} from '../electron/render-bundle-cache.mjs';
import {renderStill,selectComposition} from '@remotion/renderer';
import {applyStoryShots} from '../electron/story-shots.mjs';
import {applyActionMovie} from '../electron/action-movie.mjs';
import {applyNarrationExpressions} from '../electron/narration-expressions.mjs';
import {applyMoveEffects} from '../electron/move-effects.mjs';
import {bundledNarrationArt,isEmojiArt} from '../electron/narration-props.mjs';
const folder=path.join(root,'workspace/context-check');fs.mkdirSync(folder,{recursive:true});
const b=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')});
try{
 const source=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/speech-timing-check/repaired.gaming.json'),'utf8')));
 const begin=performance.now(),n=await b.remake(source,'',{useAI:false,preserveCaptions:true,correctNames:true},{},e=>console.log(e.stage));
 const raw=p=>p.scenes.map(s=>[s.id,s.start,s.end,s.text,s.words.map(w=>[w.text,w.start,w.end])]);
 assert.deepEqual(raw(n),raw(source));assert.deepEqual(n.captionStyle,source.captionStyle);
 assert.ok(!n.shortMechanics.cues.some(c=>c.name==='plus'),'Conjunction became ability Plus');
 assert.ok(n.pokemonMentions.some(m=>m.name==='staraptor-mega'),'Mega Staraptor was not identified');
 const used=n.scenes.flatMap(s=>s.layers||[]).map(l=>l.mediaId);assert.ok(!n.media.filter(isEmojiArt).some(m=>used.includes(m.id)),'Emoji still on screen');
 fs.writeFileSync(path.join(folder,'updated-short.gaming.json'),JSON.stringify(n,null,2));
 const base=structuredClone(n);base.revisionHistory=[];base.revisionCursor=0;
 // Keep the real hydrated images and renderer. Deterministic cue fixtures let
 // us inspect the exact requested interactions independently of ASR timing.
 const pictures=['rotom','sceptile-mega','basculegion-male'];
 for(const name of pictures)if(!base.media.some(m=>m.pokemon?.name===name))base.media.push(await b.pokemon.asset(name));
 for(const m of bundledNarrationArt())if(!base.media.some(a=>a.id===m.id))base.media.push(m);
 const mediaId=name=>base.media.find(m=>m.pokemon?.name===name&&['image','pokemon'].includes(m.kind))?.id;
 const duration=24,word=(text,start)=>({text,start,end:start+.34}),scene=(id,start,end,text,ws,ids)=>({id,start,end,text,words:ws,layers:[{id:id+'-bg',role:'background',type:'shape',color:'#12323a',x:0,y:0,width:1,height:1,z:0,start,end,animation:'none',exit:'none'},...ids.map((name,i)=>({id:id+'-'+i,type:'image',role:'subject',mediaId:mediaId(name),x:ids.length>1?(i===0?.035:i===1?.53:.3):.1,y:ids.length>1?(i<2?.18:.5):.18,width:ids.length>1?.42:.7,height:ids.length>1?.29:.4,z:20,start:ids.length>1?start+(i===0?0:i===1?1.2:2.4):start,end,animation:'none',exit:'none'}))]});
 base.duration=duration;base.autoPokemonCries=false;base.soundEffects=[];base.musicId=undefined;
 base.scenes=[scene('size',0,6,'Mega Sceptile is small.',[word('Mega',0),word('Sceptile',.4),word('is',1),word('small.',1.5)],['sceptile-mega']),scene('running',6,12,'Sceptile is fast.',[word('Sceptile',6),word('is',6.5),word('fast.',7)],['sceptile-mega']),scene('stats',12,18,'Sceptile has bad stats.',[word('Sceptile',12),word('has',12.5),word('bad',13),word('stats.',13.5)],['sceptile-mega']),scene('attack',18,24,'Rotom and Mega Sceptile can OHKO Basculegion.',[word('Rotom',18),word('and',18.4),word('Mega',18.8),word('Sceptile',19.2),word('can',19.6),word('OHKO',20),word('Basculegion.',20.4)],pictures)];
 base.scenes[2].layers.push({id:'real-stats',type:'group',role:'chart',setupGraphic:{kind:'stats',title:'Base stats',rows:[{label:'Attack',value:110},{label:'Sp. Atk',value:145},{label:'Speed',value:145}],source:'https://pokeapi.co/api/v2/pokemon/sceptile-mega/'},x:.07,y:.47,width:.86,height:.26,z:40,start:12,end:18,animation:'none',exit:'none'});
 base.pokemonMentions=[{name:'sceptile-mega',mediaId:mediaId('sceptile-mega'),status:'ready',start:0,end:.74},{name:'sceptile-mega',mediaId:mediaId('sceptile-mega'),status:'ready',start:6,end:6.34},{name:'sceptile-mega',mediaId:mediaId('sceptile-mega'),status:'ready',start:12,end:12.34},{name:'rotom',mediaId:mediaId('rotom'),status:'ready',start:18,end:18.34},{name:'sceptile-mega',mediaId:mediaId('sceptile-mega'),status:'ready',start:18.8,end:19.54},{name:'basculegion-male',mediaId:mediaId('basculegion-male'),status:'ready',start:20.4,end:20.74}];
 delete base.storyShotReport;delete base.actionMovieReport;delete base.expressionReport;
 const visual=b.hydrate(applyStoryShots(applyNarrationExpressions(applyActionMovie(applyMoveEffects(base)))));
 assert.ok(visual.storyShotReport.events.some(e=>e.kind==='speed'));
 const action=visual.actionMovieReport.plans[0];assert.equal(action.attackerIds.length,2);
 const samples=[{name:'ruler',time:1.85},{name:'running-a',time:7.21},{name:'running-b',time:7.63},{name:'sad-stats',time:13.35},{name:'team-attack',time:action.start+action.duration*.48},{name:'target-gone',time:action.end+.2}];
 const serveUrl=await cachedRenderBundle(root),composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps:{project:visual}});
 for(const s of samples)await renderStill({serveUrl,composition,inputProps:{project:visual},frame:Math.round(s.time*30),output:path.join(folder,s.name+'.png'),scale:.5});
 fs.writeFileSync(path.join(folder,'visual-fixtures.gaming.json'),JSON.stringify(visual,null,2));
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({actualUserProject:true,remakeMs:performance.now()-begin,captionAppearanceUnchanged:true,rawNarrationUnchanged:true,noUsedEmojis:true,names:n.pokemonMentions.map(m=>({name:m.name,spoken:m.spoken,recognition:m.recognition,status:m.status})),oldSounds:source.soundEffects?.length,newSounds:n.soundEffects?.length,soundCues:n.soundEffectReport,actions:visual.actionMovieReport,story:visual.storyShotReport,statsReaction:visual.expressionReport,samples},null,2));
 console.log('PASS real saved-short remake, names, no emoji, preserved captions/narration, and six actual Remotion frames');
}finally{b.close();}
