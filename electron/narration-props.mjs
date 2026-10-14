import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {planMoveEffects} from './move-effects.mjs';
import {battleMoveCues} from './combat-motion.mjs';
const manifestPath=new URL('./data/narration-props/context-manifest.json',import.meta.url);
export const isEmojiArt=m=>/twemoji|noto.?emoji|emoji/i.test([m?.provider,m?.identity?.source,m?.attribution?.source,m?.name].join(' '))||/^narration-art-.*-v1$/.test(m?.id||'');
export function bundledNarrationArt(){const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[];return manifest.map(a=>({id:'narration-art-'+a.kind+'-v2',kind:'image',name:a.name,path:path.resolve(import.meta.dirname,'data','narration-props',a.file),url:'',assetRole:'narration-prop',tags:'prop:'+a.kind,width:a.width,height:a.height,transparent:!a.animated,decoded:true,...(a.animated?{animationInfo:{animated:true}}:{}),duration:0,license:a.license,identity:{franchise:'illustration',subject:a.kind,source:'Published original artwork',confidence:1},attribution:{source:a.source,credit:a.credit,licenseUrl:a.licenseUrl,changes:a.changes}}));}
export function narrationProp(project,kind){return project.media.find(m=>m.id===project.narrationAssetPlan?.[kind]&&!isEmojiArt(m))||project.media.find(m=>m.assetRole==='narration-prop'&&m.identity?.subject===kind&&!isEmojiArt(m));}
const atmosphere=new Set(['rain','snow','confetti']);
const queries={rain:'rain falling transparent overlay gif -emoji -icon',snow:'snow falling transparent overlay gif -emoji -icon',confetti:'celebration confetti falling transparent gif -emoji -icon','question-mark':'Pokemon whos that Pokemon question mark transparent PNG -emoji',fire:'real flame fire transparent PNG -emoji -icon',water:'water splash transparent PNG -emoji -icon',ice:'ice crystal frost transparent PNG -emoji -icon',paper:'blank sheet of paper transparent png -emoji -icon',leaf:'green leaf transparent png -emoji',lightning:'lightning bolt transparent png -emoji',sad:'crying sad cat face reaction transparent png -emoji -smiley',ruler:'measurement ruler transparent png -emoji',phone:'smartphone blank screen transparent png -emoji',clock:'analog clock transparent png -emoji',trophy:'trophy cup photograph transparent png -emoji',crown:'gold royal crown transparent png -emoji'};
const neededProp=(kind,text)=>kind==='rain'?/\b(?:rain|raining)\b/i.test(text):kind==='snow'?/\b(?:snow|snowing)\b/i.test(text):kind==='confetti'?/\b(?:won|winning|victory)\b/i.test(text):kind==='question-mark'?/\b(?:these|this|those|which|secret|mystery)\s+(?:\w+\s+){0,2}pok[e\u00e9]mon\b|who.s that pok[e\u00e9]mon/i.test(text):kind==='fire'?/\b(fire|flames?|flamethrower|burning)\b/i.test(text):kind==='water'?/\b(water|splash|surf)\b/i.test(text):kind==='ice'?/\b(ice|frost|frozen|freezing)\b/i.test(text):kind==='paper'||kind==='crumpled-paper'?/on paper|in theory/i.test(text):kind==='leaf'?/leaf storm|leaves/i.test(text):kind==='lightning'?/lightning|thunderbolt/i.test(text):kind==='sad'?/\b(bad|terrible|useless|awful|disappointing)\b/i.test(text):kind==='ruler'?/\b(small|smaller|smallest|tiny|little|miniature|big|bigger|huge|massive)\b/i.test(text):kind==='phone'?/\b(mobile|phone|smartphone)\b/i.test(text):kind==='clock'?/\b(minutes|hours|seconds|wait|waiting|timer)\b/i.test(text):kind==='trophy'?/\b(won|winner|champion|victory)\b/i.test(text):kind==='crown'?/\b(king|queen|crowned|kingpin|dethrones?|dethroned|ousted)\b/i.test(text):false;
export function createNarrationProps(folder,{register=m=>m,search,download,cutout,verifyMove}={}){
 fs.mkdirSync(folder,{recursive:true});const inflight=new Map();
 async function acquire(project,{library=[],keys={},progress=()=>{},check=()=>{},state}={}){
  const next={...project,media:[...project.media],narrationAssetPlan:{},narrationAssetReport:[]},pool=[...project.media,...library],text=project.scenes.map(s=>(s.words||[]).map(w=>w.captionText??w.text).join(' ')).join(' ');
  const bundledArts=bundledNarrationArt(),moves=[...planMoveEffects(next),...battleMoveCues(next)];
  for(const kind of [...Object.keys(queries),'crumpled-paper']){
   if(!neededProp(kind,text)&&!moves.some(c=>c.action&&({fire:'fire',water:'water',ice:'ice',grass:'leaf',electric:'lightning'}[c.type]===kind)))continue;
   const bundled=bundledArts.find(m=>m.identity.subject===kind),explicit=pool.find(m=>m.kind==='image'&&(m.transparent||kind==='sad'||atmosphere.has(kind))&&fs.existsSync(m.path||'')&&!isEmojiArt(m)&&m.id!==bundled?.id&&(m.tags||'').split(/[,;]+/).some(t=>t.trim().toLowerCase()==='prop:'+kind));let selected=explicit,source='user prop';
   const needed=true;
   if(!selected&&needed&&queries[kind]&&keys['google-images']&&search&&download){
    const record=path.join(folder,kind+'-google-v2.json');try{const prior=JSON.parse(fs.readFileSync(record,'utf8'));if(fs.existsSync(prior.path)&&!isEmojiArt(prior)){selected=await register(prior);source='cached Google original';}}catch{}
    if(!selected){const choose=async()=>{progress({stage:'Finding narration prop: '+kind});check();const results=await search(queries[kind],'google-images',keys['google-images'],{exactQuery:true,type:atmosphere.has(kind)?'GIF':'PNG',purpose:'prop'});
      for(const c of results.slice(0,6)){const title=(c.name+' '+c.attribution?.description).toLowerCase();if(!new RegExp('\\b'+(atmosphere.has(kind)?kind+'|falling':kind==='question-mark'?'question|pokemon':kind==='fire'?'fire|flame':kind==='water'?'water|splash':kind==='ice'?'ice|frost|crystal':kind==='sad'?'sad|crying':kind==='leaf'?'leaf|leaves':kind==='lightning'?'lightning|bolt':kind==='ruler'?'ruler':kind==='phone'?'phone|smartphone':kind==='clock'?'clock|timer':kind==='trophy'?'trophy|cup':kind==='crown'?'crown':'paper')+'\\b').test(title)||/emoji|emoticon|twemoji|wallpaper|poster|merch|shirt|logo|watermark/i.test(title))continue;
       try{check();let m=await download(c);const tooSmall=kind==='ruler'?Math.max(m.width,m.height)<256||Math.min(m.width,m.height)<32:m.width<128||m.height<128;if(!m.decoded||tooSmall||m.animationInfo?.animated&&!atmosphere.has(kind))continue;if(!m.transparent&&!atmosphere.has(kind)){if(!cutout)continue;m=await cutout(m);}
        if(kind==='ruler'&&m.width>m.height){const hash=crypto.createHash('sha256').update(fs.readFileSync(m.path)).digest('hex').slice(0,20),file=path.join(folder,'ruler-upright-'+hash+'.png');if(!fs.existsSync(file))await sharp(m.path).rotate(90).png().toFile(file);m={...m,id:m.id+'-upright-ruler',path:file,width:m.height,height:m.width,attribution:{...m.attribution,changes:[m.attribution?.changes,'Original ruler rotated vertically; no measurement marks changed'].filter(Boolean).join('; ')}};}
        m=await register({...m,assetRole:'narration-prop',tags:'prop:'+kind,identity:{franchise:'illustration',subject:kind,source:'Literal image result; original source retained',confidence:.8}});fs.writeFileSync(record,JSON.stringify(m));return m;}catch(e){check();next.narrationAssetReport.push({kind,warning:e.message});}
      }return undefined;
     };let task=inflight.get(kind);if(!task){task=choose();inflight.set(kind,task);}try{selected=await task;source='Google original';}catch(e){check();next.narrationAssetReport.push({kind,warning:e.message});}finally{inflight.delete(kind);}
    }
   }
   if(!selected&&bundled){selected=await register(bundled);source='cached sourced original';}
   if(!selected){next.narrationAssetReport.push({kind,status:'missing',warning:keys['google-images']?'No suitable sourced prop found; actor motion can still illustrate the narration.':'Google Images is not configured; no emoji substituted.'});continue;}
   if(!next.media.some(m=>m.id===selected.id))next.media.push(selected);next.narrationAssetPlan[kind]=selected.id;next.narrationAssetReport.push({kind,mediaId:selected.id,source});
  }
  for(const move of [...new Map(moves.map(c=>[c.name,c])).values()]){
   let selected=pool.find(m=>m.kind==='image'&&m.path&&fs.existsSync(m.path)&&(m.effectMoveName===move.name&&m.assetRole==='move-art'||new RegExp('(?:^|[,;])\\s*move:'+move.name+'(?:[,;]|$)','i').test(m.tags||'')));
   const record=path.join(folder,'move-'+move.name+'-v1.json');
   if(!selected)try{const cached=JSON.parse(fs.readFileSync(record,'utf8'));if(cached.kind==='image'&&cached.assetRole==='move-art'&&cached.effectMoveName===move.name&&fs.existsSync(cached.path)&&!isEmojiArt(cached)&&(cached.moveArtLayout!=='reference'||cached.moveArtInspection?.accepted))selected=await register(cached);}catch{}
   if(!selected&&keys['google-images']&&search&&download){
    try{progress({stage:'Finding actual move artwork: '+move.title});const query='Pokemon '+move.title+' move effect transparent PNG -card -wallpaper -TM';const results=await search(query,'google-images',keys['google-images'],{exactQuery:true,type:'PNG',purpose:'move-effect'});
     for(const c of results.slice(0,6)){const title=(c.name+' '+c.attribution?.description).toLowerCase();if(!title.includes(move.title.toLowerCase())||!/pokemon|pok\u00e9mon/i.test(title)||/trading card|wallpaper|merch|shirt|watermark/i.test(title))continue;
      try{check();let m=await download(c);if(!m.decoded||m.width<128||m.height<128||isEmojiArt(m)||m.animationInfo?.animated&&!m.transparent)continue;if(!m.transparent){if(!cutout||/screenshot|gameplay|summary|description|battle scene/i.test(title))continue;m=await cutout(m);}selected=await register({...m,assetRole:'move-art',moveArtLayout:'overlay',effectMoveName:move.name,tags:'move:'+move.name});fs.writeFileSync(record,JSON.stringify(selected));break;}catch(e){check();next.narrationAssetReport.push({move:move.name,warning:e.message});}
     }
    }catch(e){check();next.narrationAssetReport.push({move:move.name,warning:e.message});}
   }
   // An actual battle still/GIF is a readable reference, never cut out or
   // stretched into a projectile. Verify the visual subject before using it.
   if(!selected&&keys['google-images']&&search&&download&&verifyMove&&state?.models?.vision?.capabilities?.includes('vision')){
    try{const results=await search('Pokemon "'+move.title+'" move attack animation gameplay screenshot -"trading card" -wallpaper','google-images',keys['google-images'],{exactQuery:true,purpose:'move-reference'});
     for(const c of results.slice(0,5)){check();const title=[c.name,c.attribution?.description].join(' ');if(!title.toLowerCase().includes(move.title.toLowerCase())||!/pok[e\u00e9]mon/i.test(title)||/trading card|merch|shirt|emoji|wallpaper/i.test(title))continue;
      try{const m=await download(c);if(!m.decoded||m.width<256||m.height<144||isEmojiArt(m))continue;const result=await verifyMove(state,move,m.path);check();if(!result?.available||!result.accepted){next.narrationAssetReport.push({move:move.name,rejected:c.id,warning:result?.reason||'Move picture not verified'});continue;}
       selected=await register({...m,assetRole:'move-art',moveArtLayout:'reference',effectMoveName:move.name,moveArtInspection:result,tags:'move-reference:'+move.name});fs.writeFileSync(record,JSON.stringify(selected));break;
      }catch(e){check();next.narrationAssetReport.push({move:move.name,warning:e.message});}
     }
    }catch(e){check();next.narrationAssetReport.push({move:move.name,warning:e.message});}
   }
   if(selected){if(!next.media.some(m=>m.id===selected.id))next.media.push(selected);next.narrationAssetReport.push({move:move.name,mediaId:selected.id,source:'sourced move image',layout:selected.moveArtLayout||'overlay'});}
   else next.narrationAssetReport.push({move:move.name,status:'missing',warning:'No suitable actual move image found; no invented move information card substituted.'});
  }return next;
 }return {acquire};
}
