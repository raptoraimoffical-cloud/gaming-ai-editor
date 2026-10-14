import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root,run} from '../electron/backend.mjs';
const dir=path.join(root,'workspace/pokemon-name-check');fs.mkdirSync(dir,{recursive:true});
const b=await createBackend({workspace:path.join(dir,'backend')});
try{
 const voice=await b.importMedia(path.join(dir,'narration.wav'),{license:'Windows SAPI diagnostic narration',assetRole:'narration'});
 const p=await b.generate({voiceId:voice.id,name:'Pokemon name recognition verification',quality:'fast',model:'tiny.en',shortStyle:'pokemon-dense',videoMode:'youtube-shorts',pokemon:true,autoPokemonCries:false,autoSoundEffects:false,autoMinecraftSounds:false,localAnimatorEnabled:false,backgroundMode:'ai'},e=>console.log(e.stage));
 const expected=['mimikyu-disguised','landorus-incarnate','kingambit','corviknight','froslass','politoed'];
 for(const name of expected){assert.ok(p.pokemonMentions.some(m=>m.name===name&&m.status==='ready'),'Recognition and actual exact artwork required: '+name);assert.ok(p.scenes.some(s=>s.reaction?.entities.some(e=>e.id===name&&e.type==='pokemon')),'Must be a Pokemon entity, not generic text: '+name);assert.ok(p.scenes.some(s=>s.layers.some(l=>l.role==='subject'&&p.media.find(m=>m.id===l.mediaId)?.pokemon?.name===name)),'Actual onscreen subject missing: '+name);}
 assert.equal(p.transcriptionInfo.vocabularyPrompted,true);p.musicId=undefined;p.musicVolume=0;
 fs.writeFileSync(path.join(dir,'project.gaming.json'),JSON.stringify(p,null,2));
 // Exercise the repair path using the same voice and original words/timestamps.
 const source=structuredClone(p);source.scenes[2].text='King Gambit and Corvenant are partners.';
 const ws=source.scenes[2].words;ws[0].text='King Gambit';for(const w of ws)if(w.text==='Corviknight')w.text='Corvenant';source.pokemonMentions=[];for(const s of source.scenes){s.layers=[];s.pokemon=[];delete s.referenceShortApplied;}delete source.shortStyleReport;
 const fixed=await b.revise(source,'Recognize Pokemon names',{},{useAI:false});assert.ok(fixed.pokemonMentions.some(m=>m.name==='kingambit'&&m.corrected));assert.ok(fixed.pokemonMentions.some(m=>m.name==='corviknight'&&m.corrected));assert.deepEqual(fixed.scenes.map(s=>[s.start,s.end,s.words.map(w=>[w.text,w.start,w.end])]),source.scenes.map(s=>[s.start,s.end,s.words.map(w=>[w.text,w.start,w.end])]));assert.equal(b.undoRedo(fixed,'undo').pokemonMentions.length,0);
 fs.writeFileSync(path.join(dir,'repair-source.gaming.json'),JSON.stringify(source,null,2));fs.writeFileSync(path.join(dir,'repaired.gaming.json'),JSON.stringify(fixed,null,2));
 const output=await b.render(p,path.join(dir,'recognized-pokemon.mp4'),e=>{if(e.percent===undefined)console.log(e.stage);});const frames=[];
 for(const name of ['mimikyu-disguised','kingambit','politoed']){const mention=p.pokemonMentions.find(m=>m.name===name),file=path.join(dir,'frame-'+name+'.png');await run('ffmpeg',['-v','error','-y','-ss',String(Math.min(p.duration-.1,mention.start+.45)),'-i',output.output,'-frames:v','1','-vf','scale=540:960',file]);frames.push(file);}
 fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({realGenerate:true,realWhisper:true,model:p.transcriptionInfo,expected,identified:p.pokemonMentions,recognition:p.pokemonRecognitionReport,sourceImages:p.media.filter(m=>m.pokemon).map(m=>({name:m.pokemon.name,source:m.pokemon.sourceUrl})),repairActuallyChangesLayers:true,narrationAndTimingPreserved:true,undo:true,output:output.output,frames},null,2));console.log('PASS actual Whisper → six canonical Pokémon → exact artwork/entities/layers → repair button backend → Undo → MP4');
}finally{b.close();}
