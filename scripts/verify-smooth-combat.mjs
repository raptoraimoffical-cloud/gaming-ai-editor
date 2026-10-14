import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {createBackend,root} from '../electron/backend.mjs';
import {applyActionMovie} from '../electron/action-movie.mjs';
import {applyMoveEffects} from '../electron/move-effects.mjs';
import {applySourceMoveCards} from '../electron/source-move-cards.mjs';
import {bundledNarrationArt} from '../electron/narration-props.mjs';
import {automaticSounds} from '../electron/automatic-sounds.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
import {measureProjectArtwork} from '../electron/artwork-geometry.mjs';
const folder=path.join(root,'workspace/smooth-battle-check');fs.mkdirSync(folder,{recursive:true});
const b=await createBackend({workspace:path.join(folder,'backend')}),review=createReviewRenderer({root,folder,scale:.5});
try{
 const source=JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8')),lead=source.media.find(m=>m.name==='Mega Sceptile'),rotom=source.media.find(m=>m.pokemon?.name==='rotom');assert.ok(fs.existsSync(lead.path)&&fs.existsSync(rotom.path));
 const lines=['Rotom uses Thunderbolt on Mega Sceptile.','Mega Sceptile hits Rotom with Close Combat.','Mega Sceptile uses Leaf Storm on Rotom.'],mentions=[],scenes=lines.map((text,i)=>{
  const start=i*6,end=start+6,words=text.split(' ').map((text,j)=>({text,start:start+j*.35,end:start+j*.35+.3}));
  for(let j=0;j<words.length;j++){const w=words[j];if(/^Rotom[.!]?$/i.test(w.text))mentions.push({name:'rotom',mediaId:rotom.id,status:'ready',start:w.start,end:w.end});if(w.text==='Mega')mentions.push({name:'sceptile-mega',mediaId:lead.id,status:'ready',start:w.start,end:words[j+1].end});}
  return {id:'s'+i,start,end,text,words,layers:[...source.scenes[0].layers.filter(l=>['background','environment-depth'].includes(l.role)).map(l=>({...l,id:l.id+'-'+i,start,end})),...[rotom,lead].map((m,j)=>({id:'actor-'+i+'-'+j,type:'image',role:'subject',mediaId:m.id,x:j?.54:.035,y:.30,width:.42,height:.36,z:30+j,start:Math.max(start,mentions.find(mn=>mn.mediaId===m.id)?.start??start),end,animation:'none',exit:'none',fit:'contain'}))]};
 });
 let p={id:'smooth-combat-diagnostic',name:'Smooth combat diagnostic',duration:18,format:'vertical',voiceId:source.voiceId,gameSelection:'pokemon',captionStyle:source.captionStyle,captionColor:source.captionColor,editingInstructions:'Animate the stated attacks; retain exact narration and caption styling.',pokemonMentions:mentions,media:[...source.media.filter(m=>[lead.id,rotom.id,source.voiceId].includes(m.id)||m.assetRole==='background'),...bundledNarrationArt()],scenes,soundEffects:[]};
 p=await measureProjectArtwork(p);const signature=JSON.stringify([p.captionStyle,p.captionColor,p.scenes.map(s=>s.words)]);
 let n=automaticSounds(applySourceMoveCards(applyActionMovie(applyMoveEffects(p))),b.library());n=b.hydrate(n);assert.equal(n.actionMovieReport.plans.length,3);assert.equal(JSON.stringify([n.captionStyle,n.captionColor,n.scenes.map(s=>s.words)]),signature);
 const frames=[];for(const [i,plan] of n.actionMovieReport.plans.entries())for(const phase of [.12,.25,.36,.44,.50,.61,.80,.97]){const time=plan.start+plan.duration*phase,label=i+'-'+phase,file=await review.render(n,Math.round(time*30),label);frames.push({i,phase,time,path:file.path});}
 const cells=await Promise.all(frames.map(async f=>({input:await sharp(f.path).resize(180,320).png().toBuffer(),left:Math.round(f.phase===.12?0:[.12,.25,.36,.44,.50,.61,.80,.97].indexOf(f.phase)*180),top:f.i*320})));
 const sheet=path.join(folder,'attack-phases.png');await sharp({create:{width:1440,height:960,channels:4,background:'#17202a'}}).composite(cells).png().toFile(sheet);
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(n,null,2));fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({plans:n.actionMovieReport.plans,sounds:n.soundEffects.map(f=>({start:f.start,cue:f.cue,reason:f.reason})),frames,captionsUnchanged:true,limitations:['Synthetic narration/timestamps and existing actual character/element images.','No live Google or new trained-model inference; the acquisition path is exercised separately with controlled tests.','No move-description screenshot was present in these cached diagnostic assets.']},null,2));
 console.log('PASS three rendered attacks, all phases, actual artwork and unchanged captions: '+sheet);
}finally{await review.close();b.close();}
