import {defineConfig} from 'vite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?files(path.join(dir,f.name)):[path.join(dir,f.name)]);}
const id=createHash('sha256').update(files('src').concat(files('electron')).sort().map(f=>readFileSync(f)).join('')).digest('hex').slice(0,12);
export default defineConfig({base:'./',define:{'BUILD_ID':JSON.stringify(id)},plugins:[{name:'build-evidence',generateBundle(){this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify({id,builtAt:new Date().toISOString()})});}}]});
