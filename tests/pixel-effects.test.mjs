import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {PNG} from 'pngjs';
import {readPixelEffects,applyPixelEffects} from '../electron/pixel-effects.mjs';
import {discoverNamedPeople} from '../electron/person-mentions.mjs';
import {analyzeReaction} from '../electron/reactions.mjs';
import {composeReaction} from '../electron/subject-visuals.mjs';
import {bundledNarrationArt} from '../electron/narration-props.mjs';
import {auditVisuals} from '../electron/storyboard.mjs';
import {placementFor} from '../electron/layer-motion.mjs';
import {COMBAT_PHASES} from '../electron/combat-motion.mjs';
const pack=readPixelEffects(),trophy=bundledNarrationArt().find(m=>m.identity.subject==='trophy');
function fixture(text){const words=text.split(' ').map((text,i)=>({text,start:i*.35,end:i*.35+.3})),duration=words.length*.35+.7;return {id:'p',duration,voiceId:'v',format:'vertical',gameSelection:'pokemon',shortStyle:'pokemon-dense',captionColor:'yellow',captionStyle:{fontSize:70},media:[{id:'v',kind:'audio'},{id:'mon',kind:'image',width:600,height:800,pokemon:{name:'charizard',displayName:'Charizard',speciesName:'Charizard'}}],scenes:[{id:'s',start:0,end:duration,text,words,reaction:{entities:[{id:'charizard',name:'Charizard',type:'pokemon',start:0,mediaId:'mon'}]},layers:[{id:'hero',role:'subject',type:'image',mediaId:'mon',x:.12,y:.2,width:.6,height:.45,z:30,start:0,end:duration,animation:'none',exit:'none'}]}]};}
test('all 25 downloaded animations decode with transparent frames and retained source attribution',()=>{
 assert.equal(pack.length,25);assert.equal(new Set(pack.map(m=>m.path)).size,25);for(const m of pack){const png=PNG.sync.read(fs.readFileSync(m.path));assert.equal(png.width,m.width);assert.equal(png.height,m.height);assert.ok(m.spriteSheet.columns*m.spriteSheet.frameWidth<=png.width);assert.ok(Math.ceil(m.spriteSheet.frames/m.spriteSheet.columns)*m.spriteSheet.frameHeight<=png.height);assert.ok(png.data.some((v,i)=>i%4===3&&v===0));assert.ok(png.data.some((v,i)=>i%4===3&&v>100));assert.ok(m.attribution.source.startsWith('https://'));}
});
test('gold aura appears at the spoken stat buff, tracks its actor, and does not change captions',()=>{
 const p=fixture('Charizard raises its attack and becomes strong.'),n=applyPixelEffects(p,pack),a=n.scenes[0].layers.find(l=>l.pixelEffect?.kind==='power-up');assert.ok(a);assert.equal(a.start,.35);assert.equal(a.pixelEffect.tint,'gold');assert.ok(a.z<30);assert.equal(a.attachment.targetId,'hero');assert.deepEqual(n.captionStyle,p.captionStyle);assert.deepEqual(n.scenes[0].words,p.scenes[0].words);assert.equal(placementFor(a,n.scenes[0].layers,n.media,.8,1080,1920).motion.opacity>0,true);assert.deepEqual(applyPixelEffects(n,pack),n);
 const hidden={...n.scenes[0].layers[0],excludedRanges:[{start:0,end:n.duration}]};assert.equal(placementFor(a,[hidden,a],n.media,.8,1080,1920).motion.opacity,0);
});
test('weather follows narration but Make It Rain and negative praise do not create irrelevant effects',()=>{
 const n=applyPixelEffects(fixture('Charizard enters the rain then the snow and fog.'),pack);assert.deepEqual(n.pixelEffectReport.events.map(e=>e.kind),['rain','snow','fog']);assert.ok(n.scenes[0].layers.filter(l=>l.pixelEffect?.tile).every(l=>l.height<.8));
 for(const text of ['Charizard is not good.','Charizard has Good as Gold.','Charizard uses Make It Rain.'])assert.equal(applyPixelEffects(fixture(text),pack).pixelEffectReport.events.some(e=>['rain','power-up'].includes(e.kind)),false,text);
});
test('actual self-boost moves activate the aura and a stat debuff does not',()=>{
 const n=applyPixelEffects(fixture('Charizard uses Swords Dance.'),pack);assert.ok(n.pixelEffectReport.events.some(e=>e.kind==='power-up'&&e.cue==='stat-boost'));
 assert.equal(applyPixelEffects(fixture('Charizard uses Growl.'),pack).pixelEffectReport.events.some(e=>e.kind==='power-up'),false);
});
test('named people omitted by planning become searchable subjects, but game and move names do not',()=>{
 const p=fixture('Eric Rios won the event.'),s=p.scenes[0],people=discoverNamedPeople(s,p);assert.deepEqual(people.map(e=>e.name),['Eric Rios']);assert.equal(people[0].start,0);s.aiSubjects=people;assert.equal(analyzeReaction(s,p).entities[0].type,'person');assert.equal(discoverNamedPeople(s,p).length,0);
 assert.deepEqual(discoverNamedPeople(fixture('Mega Charizard uses Shadow Ball and Fake Out.').scenes[0],p),[]);
 const another=fixture('The creator Jane Smith said this was excellent.');assert.equal(discoverNamedPeople(another.scenes[0],another)[0].name,'Jane Smith');
});
test('a narrated winner gets a sourced trophy attached to the photo and passes franchise preflight',()=>{
 const p=fixture('Eric Rios won the tournament.'),s=p.scenes[0];p.media.push({id:'eric',kind:'image',path:'fixture-original-photo.png',name:'Eric Rios photo',width:600,height:800,identity:{franchise:'unknown',subject:'eric-rios'},license:'Source photo'});s.reaction.entities=[{id:'eric-rios',name:'Eric Rios',type:'person',mediaId:'eric',start:0}];s.layers[0].mediaId='eric';const n=applyPixelEffects(p,[...pack,trophy]),a=n.scenes[0].layers.find(l=>l.pixelEffect?.kind==='trophy');assert.ok(a);assert.equal(a.mediaId,trophy.id);assert.equal(a.attachment.targetId,'hero');assert.equal(a.start,.7);assert.deepEqual(auditVisuals(n).errors,[]);
 const composed=composeReaction({...s,reaction:{...s.reaction,intent:'person'}},p);assert.ok(composed.layers.some(l=>l.role==='subject'&&l.mediaId==='eric'));
});
test('manual edits and deliberate deletion of an effect survive another finishing pass',()=>{
 const n=applyPixelEffects(fixture('Charizard is good.'),pack),s=n.scenes[0],fx=s.layers.find(l=>l.pixelEffectAuto);fx.manual=true;const edited=applyPixelEffects(n,pack).scenes[0].layers;assert.ok(edited.some(l=>l.id===fx.id&&l.manual));assert.equal(edited.filter(l=>l.id===fx.id).length,1);
 delete fx.manual;s.deletedLayerIds=[fx.id];s.layers=s.layers.filter(l=>l.id!==fx.id);assert.equal(applyPixelEffects(n,pack).scenes[0].layers.some(l=>l.id===fx.id),false);
 assert.equal(applyPixelEffects({...fixture('Charizard is good.'),autoPixelEffects:false},pack).pixelEffectReport.events.length,0);
});
test('downloaded attack accents use the actual defender and shared contact clock, never a guessed second character',()=>{
 const p=fixture('Charizard uses Flamethrower on Blastoise.'),s=p.scenes[0];p.media.push({id:'foe',kind:'image',width:500,height:600,pokemon:{name:'blastoise',displayName:'Blastoise'}});s.layers.push({...s.layers[0],id:'defender',mediaId:'foe',x:.62,width:.34});assert.equal(applyPixelEffects(p,pack).pixelEffectReport.events.some(e=>e.kind==='elemental-impact'),false);
 p.actionMovieReport={plans:[{sceneId:'s',moveName:'flamethrower',spokenAt:.7,start:.5,duration:2,defenderId:'foe',outcome:'recoil'}]};const result=applyPixelEffects(p,pack),accent=result.pixelEffectReport.events.find(e=>e.kind==='elemental-impact');assert.ok(accent);assert.equal(accent.targetId,'defender');assert.equal(accent.start,.5+2*COMBAT_PHASES.contact);
 p.actionMovieReport.plans[0].outcome='ineffective';assert.equal(applyPixelEffects(p,pack).pixelEffectReport.events.some(e=>e.kind==='elemental-impact'),false);
});
