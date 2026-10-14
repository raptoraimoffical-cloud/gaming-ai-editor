import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {openBrowser} from '@remotion/renderer';
// Capture the publisher's unchanged page. No template, recreated description,
// injected styling or game branding is painted by the editor.
export function createPublishedMechanics(folder,{open=openBrowser,register=m=>m}={}){
 fs.mkdirSync(folder,{recursive:true});let browser,opening;const flights=new Map();
 async function capture(cue){
  if(!['move','ability'].includes(cue.kind)||!/^[a-z0-9-]+$/.test(cue.name))return;
  const source='https://pokemondb.net/'+cue.kind+'/'+cue.name,record=path.join(folder,cue.kind+'-'+cue.name+'.json');
  try{const old=JSON.parse(fs.readFileSync(record,'utf8'));if(old.captureVersion===5&&old.originalUrl===source&&old.moveCard?.verified&&old.moveCard.name.toLowerCase().replace(/[^a-z0-9]/g,'')===cue.title.toLowerCase().replace(/[^a-z0-9]/g,'')&&fs.existsSync(old.path)&&Date.now()-old.capturedAt<30*86400000)return register(old);}catch{}
  if(!browser){opening??=open('chrome',{forceDeviceScaleFactor:2});try{browser=await opening;}finally{opening=undefined;}}
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  try{
   await page.setViewport({width:1100,height:1600,deviceScaleFactor:2});await page.goto({url:source,timeout:25000,options:{waitUntil:'load'}});
   const data=await page.evaluate(async()=>{
    await document.fonts.ready;
    const main=document.querySelector('main'),title=main?.querySelector('h1');if(!main||!title)return null;
    const headings=[...main.querySelectorAll('h2,h3')],effect=headings.find(h=>/^Effects?$/i.test(h.textContent.trim()));if(!effect)return null;
    const paragraphs=[];for(let el=effect.nextElementSibling;el&&!/^H[23]$/.test(el.tagName);el=el.nextElementSibling){if(el.textContent.trim())paragraphs.push(el);}
    if(!paragraphs.length)return null;
    const targetHeading=headings.find(h=>/^Move target$/i.test(h.textContent.trim())),targetNodes=[];for(let el=targetHeading?.nextElementSibling;el&&!/^H[23]$/.test(el.tagName);el=el.nextElementSibling){for(const p of [el,...el.querySelectorAll('p')])if(p.tagName==='P'&&/\b(?:targets?|affects?)\b/i.test(p.textContent)&&p.textContent.trim())targetNodes.push(p);}
    const target=targetNodes.at(-1),targetRange=document.createRange();if(target)targetRange.selectNodeContents(target);const targetBox=target?targetRange.getBoundingClientRect():undefined;
    const boxes=[title,...paragraphs].map(el=>el.getBoundingClientRect()).concat(targetBox?[targetBox]:[]),x=Math.max(0,Math.min(...boxes.map(b=>b.left))-12),y=Math.max(0,Math.min(...boxes.map(b=>b.top))-12),right=Math.min(innerWidth,Math.max(...boxes.map(b=>b.right))+12),bottom=Math.max(...boxes.map(b=>b.bottom))+12;
    const range=document.createRange();range.selectNodeContents(title);const glyph=range.getBoundingClientRect(),effectBoxes=[effect,...paragraphs].map(el=>el.getBoundingClientRect());const normalized=(left,top,w,h)=>({x:(left-x)/(right-x),y:(top-y)/(bottom-y),width:w/(right-x),height:h/(bottom-y)});
    const ex=Math.min(...effectBoxes.map(b=>b.left)),ey=Math.min(...effectBoxes.map(b=>b.top)),er=Math.max(...effectBoxes.map(b=>b.right)),eb=Math.max(...effectBoxes.map(b=>b.bottom));
    return {name:title.textContent.trim().replace(/\s*\((?:move|ability)\)\s*$/i,''),description:[...paragraphs,...(target?[target]:[])].map(el=>el.textContent.trim()).join(' '),clip:{x,y,width:right-x,height:bottom-y},regions:{title:normalized(glyph.left,glyph.top,glyph.width,glyph.height),effects:normalized(ex,ey,er-ex,eb-ey),...(targetBox?{target:normalized(targetBox.left,targetBox.top,targetBox.width,targetBox.height)}:{})},pageUrl:location.href};
   });
   if(!data||data.pageUrl!==source||data.name.toLowerCase().replace(/[^a-z0-9]/g,'')!==cue.title.toLowerCase().replace(/[^a-z0-9]/g,'')||data.description.length<20||data.clip.height>1300||data.clip.width<300)throw Error('The published mechanic page did not expose a readable matching name and Effects section.');
   // CDP captures the real rendered pixels, including the publisher's original
   // layout between the name and Effects section, rather than rebuilding it.
   const shot=await page._client().send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...data.clip,scale:1}}),png=shot.value.data;if(typeof png!=='string')throw Error('Published page screenshot returned no pixels.');const bytes=Buffer.from(png,'base64'),hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=path.join(folder,hash+'.png');fs.writeFileSync(file,bytes);
   const m={id:'published-mechanic-'+hash.slice(0,24),captureVersion:5,kind:'image',name:data.name+' · published '+cue.kind+' reference',path:file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),duration:0,decoded:true,transparent:false,provider:'published-page',originalUrl:source,assetRole:cue.kind==='move'?'move-card':'ability-card',capturedAt:Date.now(),moveCard:{kind:cue.kind,name:data.name,description:data.description,regions:data.regions,verified:true,model:'Exact publisher page and visible DOM text'},license:'Published webpage excerpt; reuse permission is not verified',usageStatus:'unverified',identity:{franchise:'pokemon',subject:cue.name,source,confidence:1},attribution:{source,credit:'Pokemon Database',changes:'Unchanged published page captured; name, complete Effects and target summary pixels can be framed without page navigation'}};
   fs.writeFileSync(record,JSON.stringify(m,null,2));return register(m);
  }finally{await page.close();}
 }
 return {async capture(cue){const key=cue.kind+'/'+cue.name;if(flights.has(key))return flights.get(key);const task=capture(cue);flights.set(key,task);try{return await task;}finally{flights.delete(key);}},async close(){const b=browser;browser=undefined;if(b)await b.close({silent:true});}};
}
