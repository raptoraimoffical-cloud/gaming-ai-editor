import fs from 'node:fs';import {PNG} from 'pngjs';
export function inspectTransparency(file){if(!/\.png$/i.test(file))return /\.svg$/i.test(file);try{const p=PNG.sync.read(fs.readFileSync(file));for(let i=3;i<p.data.length;i+=4)if(p.data[i]<245)return true;}catch{}return false;}
