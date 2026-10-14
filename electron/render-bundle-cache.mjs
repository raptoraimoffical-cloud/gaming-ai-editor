import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {bundle} from '@remotion/bundler';
const entries=new Map();
function fingerprint(root){const hash=crypto.createHash('sha256');function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(tsx?|mjs|mts|json|css)$/.test(entry.name)){hash.update(path.relative(root,file));hash.update(fs.readFileSync(file));}}}walk(path.join(root,'src'));walk(path.join(root,'electron'));for(const name of ['package-lock.json','package.json','tsconfig.json'])if(fs.existsSync(path.join(root,name)))hash.update(fs.readFileSync(path.join(root,name)));return hash.digest('hex');}
export async function cachedRenderBundle(root,{build=bundle,onProgress}={}){
 const key=root+':'+fingerprint(root),prior=entries.get(key);if(prior){const url=await prior;if(fs.existsSync(url))return url;entries.delete(key);}
 const task=build({entryPoint:path.join(root,'src','remotion.tsx'),onProgress});entries.set(key,task);try{const url=await task;for(const old of entries.keys())if(old.startsWith(root+':')&&old!==key)entries.delete(old);return url;}catch(e){entries.delete(key);throw e;}
}
