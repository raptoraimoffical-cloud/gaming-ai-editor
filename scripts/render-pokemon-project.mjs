import fs from 'node:fs';import path from 'node:path';import {createBackend,root} from '../electron/backend.mjs';
const folder=path.join(root,'workspace','pokemon-smoke');const b=await createBackend({workspace:path.join(folder,'library')});
try{const p=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8')));console.log(await b.render(p,path.join(folder,'pokemon.mp4'),x=>{if(x.percent>85||x.percent<6)console.log(x);}));}finally{b.close();}
