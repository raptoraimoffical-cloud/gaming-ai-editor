import fs from 'node:fs';import path from 'node:path';import {bundle} from '@remotion/bundler';import {renderStill,selectComposition} from '@remotion/renderer';
import {createBackend,root} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','pokemon-smoke');const b=await createBackend({workspace:path.join(folder,'library')});
try{const project=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8')));const inputProps={project};const serveUrl=await bundle({entryPoint:path.join(root,'src','remotion.tsx')});const composition=await selectComposition({serveUrl,id:'GamingVideo',inputProps});await renderStill({serveUrl,composition,inputProps,frame:30,output:path.join(folder,'fixed-charizard.png')});}finally{b.close();}
