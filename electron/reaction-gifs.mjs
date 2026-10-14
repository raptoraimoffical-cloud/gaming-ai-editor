import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {downloadPublicImage,inspectImageBytes} from './web-image-download.mjs';
import {noMotion} from './game-presentation.mjs';
const reactions=[
 {id:'fast',words:/^(fast|faster|fastest|quick|quickly|speedy)$/i,query:'Sonic running fast reaction gif',sound:'whoosh',source:'https://giphy.com/gifs/regalmovies-sonic-the-hedgehog-movie-2-sonicmovie2-4V6WygyIPjzbttRpHB',url:'https://media.giphy.com/media/4V6WygyIPjzbttRpHB/giphy.gif',name:'Sonic running fast reaction'},
 {id:'slow',words:/^(slow|slower|slowest|slowly|sluggish)$/i,query:'Zootopia sloth slow reaction gif',sound:'pop',source:'https://tenor.com/view/zootopia-sloth-late-reaction-slow-gif-5158412',url:'https://media1.tenor.com/m/Od71-ZIjyB8AAAAC/zootopia-sloth.gif',name:'Slow sloth reaction'},
 {id:'strong',words:/^(strong|stronger|strongest|powerful|overpowered)$/i,query:'strong flex reaction gif',sound:'pop',source:'https://tenor.com/view/strong-flex-gronk-tough-show-off-gif-20310210',url:'https://media1.tenor.com/m/qSoTJXyRhOUAAAAC/strong-flex.gif',name:'Strong flex reaction'},
 {id:'fear',words:/^(scary|scared|terrifying|terrified|frightening|frightened|spooky|fear|dangerous|risky)$/i,query:'scared dog teeth chattering reaction gif',sound:'chatter',source:'https://tenor.com/en-CA/view/dog-chattering-teeth-scared-spooky-gif-22755553',url:'https://media1.tenor.com/m/4DlkNXNupfQAAAAC/dog-chattering.gif',name:'Scared dog with chattering teeth'},
 {id:'surprise',words:/^(shocking|shocked|surprised|astonishing|unbelievable|absurd)$/i,query:'surprised shocked reaction gif',sound:'pop',source:'https://tenor.com/view/shocked-gasp-cats-gif-5762916',url:'https://media1.tenor.com/m/V6AloNnye-YAAAAC/shocked-gasp.gif',name:'Surprised cat reaction'},
 {id:'confusion',words:/^(confusing|confused|baffling)$/i,query:'confused reaction gif',sound:'click',source:'https://tenor.com/view/old-man-confused-idk-clueless-help-gif-14043805',url:'https://media1.tenor.com/m/k7yDItBha68AAAAC/old-man-confused.gif',name:'Confused reaction'},
 {id:'laughter',words:/^(hilarious|laughing|ridiculous|funny)$/i,query:'laughing funny reaction gif',sound:'pop',source:'https://tenor.com/view/byuntear-meme-react-funny-dog-gif-25019867',url:'https://media1.tenor.com/m/bN2IkZ5vzxIAAAAC/byuntear-meme.gif',name:'Laughing dog reaction'}
];
export function reactionCues(project){
 if(project.autoReactionGifs===false||noMotion(project)||/\b(?:no|without|disable|remove)\s+(?:reaction\s+)?(?:gifs|memes|reactions)\b/i.test(project.editingInstructions||''))return [];
 const cues=[];
 for(const s of project.scenes){if(s.manualTemplate||s.battlePlan)continue;for(const [i,w] of (s.words||[]).entries()){
  const word=w.text.replace(/[^a-z]/gi,''),phrase=(s.words||[]).slice(i,i+6).map(w=>w.text.toLowerCase().replace(/[^a-z ]/g,'')).join(' '),prior=project.scenes.filter(p=>p.end>w.start-10&&p.start<=w.start).map(p=>p.text).join(' ');
  const comic=/^(?:one problem|one catch|the catch|bad idea)\b/.test(phrase)?'confusion':/^(?:nobody expects|nobody expected|plot twist|out of nowhere)\b/.test(phrase)?'surprise':/^(?:it worked|somehow won|still wins)\b/.test(phrase)&&/ridiculous|shouldnt|shouldn't|not supposed|bad idea|unlikely|impossible/i.test(prior)?'surprise':null;
  const r=comic?reactions.find(r=>r.id===comic):reactions.find(r=>r.words.test(word));
  // Narrated speed belongs to the current actor, not an unrelated running
  // character laid over it. Story motion illustrates that claim directly.
  if(r&&['fast','slow'].includes(r.id)&&(project.pokemonMentions||[]).some(m=>m.status==='ready'&&m.end<=w.start&&(s.layers||[]).some(l=>l.role==='subject'&&l.mediaId===m.mediaId&&l.start<=w.start&&l.end>w.start)))continue;
  if(!r||/\b(?:not|never|isnt|isn't|without|no)\b/i.test((s.words||[]).slice(Math.max(0,i-2),i).map(w=>w.text).join(' '))||cues.some(c=>w.start-c.start<1.8))continue;
  const end=Math.min(s.end,w.start+1.6);if(end-w.start<.35)continue;
  if((s.layers||[]).some(l=>['gameplay','chart'].includes(l.role)&&l.start<=w.start&&l.end>w.start))continue;
  cues.push({...r,sceneId:s.id,start:w.start,end,quote:w.text});
 }}return cues;
}
const animation=m=>!!(m?.animationInfo?.animated||m?.pokemon?.animated);
function reactionMatches(m,cue){const hay=[m.name,m.tags,m.attribution?.description].join(' ').toLowerCase();return animation(m)&&m.license&&(m.reaction?.kind===cue.id||new RegExp('\\b'+cue.id+'\\b').test(hay)||cue.words.test(hay.split(/[^a-z]+/).find(w=>cue.words.test(w))||''));}
export function createReactionGifs(folder,{register,search,download,fetchImpl,lookup}={}){
 fs.mkdirSync(folder,{recursive:true});
 async function curated(cue){
  const record=path.join(folder,cue.id+'.json');if(fs.existsSync(record)){const m=JSON.parse(fs.readFileSync(record,'utf8'));if(fs.existsSync(m.path)&&animation(m))return register(m);}
  const result=await downloadPublicImage(cue.url,{fetchImpl,lookup}),info=await inspectImageBytes(result.bytes);
  if(!info.animationInfo?.animated)throw Error('Reaction source is static, not a GIF');
  const hash=crypto.createHash('sha256').update(result.bytes).digest('hex'),file=path.join(folder,hash+'.gif');fs.writeFileSync(file,result.bytes);
  const m={...info,id:'reaction-'+hash.slice(0,24),path:file,kind:'image',name:cue.name,assetRole:'reaction-gif',provider:'curated-reaction',tags:'reaction gif '+cue.id+' '+cue.query,duration:0,license:'Reaction clip belongs to its source rights holder. Public source retained; no blanket reuse license is asserted.',reaction:{kind:cue.id,sound:cue.sound},identity:{franchise:'reaction',subject:cue.id,source:cue.source,confidence:1},attribution:{source:cue.source,credit:'Original uploader via '+(cue.source.includes('giphy.com')?'GIPHY':'Tenor'),licenseUrl:cue.source,changes:'Short contextual reaction overlay'}};
  fs.writeFileSync(record,JSON.stringify(m,null,2));return register(m);
 }
 async function acquire(project,{library=[],keys={},progress=()=>{},check=()=>{}}={}){
  const cues=reactionCues(project),next={...project,media:[...project.media],reactionGifPlan:[],reactionGifWarnings:[]};
  for(const cue of cues){check();let m=[...next.media,...library].find(m=>reactionMatches(m,cue));
   if(!m&&cue.url)try{progress({stage:'Caching reaction GIF: '+cue.name});m=await curated(cue);}catch(e){check();next.reactionGifWarnings.push(cue.id+': '+e.message);}
   if(!m&&search)for(const provider of [...(keys['google-images']?['google-images']:[]),'permitted','commons']){
    try{const results=await search(cue.query,provider,keys[provider],{type:'GIF',exactQuery:true,purpose:'reaction'});
     const c=results.find(c=>(c.license||provider==='google-images'&&c.webAssessment?.autoEligible)&&cue.query.split(' ').filter(w=>!['reaction','gif'].includes(w)).some(w=>new RegExp('\\b'+w+'\\b','i').test(c.name+' '+c.tags))&&(/\.gif(?:\?|$)/i.test(c.url)||c.animationInfo?.animated));
     if(c){const imported=await download(c);if(animation(imported)){m=imported;break;}}
    }catch(e){check();next.reactionGifWarnings.push(cue.id+' '+provider+': '+e.message);}
   }
   if(!m){next.reactionGifWarnings.push('No animated '+cue.id+' reaction found; import a GIF tagged "reaction '+cue.id+'".');continue;}
   if(!next.media.some(a=>a.id===m.id))next.media.push(m);next.reactionGifPlan.push({sceneId:cue.sceneId,mediaId:m.id,start:cue.start,end:cue.end,quote:cue.quote,kind:cue.id,sound:cue.sound});
  }return next;
 }
 return {acquire};
}
export function applyReactionGifs(project){
 return {...project,scenes:project.scenes.map(s=>{
  const layers=(s.layers||[]).filter(l=>!l.id.startsWith(s.id+'-reaction-gif-'));
  if(s.manualTemplate||s.battlePlan||project.autoReactionGifs===false||noMotion(project))return {...s,layers};
  for(const [i,c] of (project.reactionGifPlan||[]).filter(c=>c.sceneId===s.id).entries()){
   if(!project.media.some(m=>m.id===c.mediaId&&animation(m)))continue;
   const actor=layers.some(l=>l.role==='subject'&&l.start<=c.start&&l.end>c.start),evidence=layers.some(l=>['mechanic-card','moveset-card'].includes(l.role)&&l.start<=c.start&&l.end>c.start);
   layers.push({id:s.id+'-reaction-gif-'+i,role:'reaction-gif',type:'image',mediaId:c.mediaId,start:c.start,end:c.end,x:actor||evidence?.72:.18,y:evidence?.56:actor?.42:.24,width:evidence?.24:actor?.32:.64,height:evidence?.13:actor?.18:.34,z:65,fit:'contain',animation:'scale-reveal',entranceDuration:.12,enter:'none',exit:'fade',exitDuration:.12});
  }return {...s,layers};
 })};
}
