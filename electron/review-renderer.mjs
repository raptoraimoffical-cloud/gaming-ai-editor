import fs from 'node:fs';import path from 'node:path';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {cachedRenderBundle} from './render-bundle-cache.mjs';
import {renderProject} from './render-project.mjs';
export function createReviewRenderer({root,folder,scale=1,check=()=>{},build=cachedRenderBundle,open=openBrowser,select=selectComposition,still=renderStill}) {
 let browser,url;const metadata=new Map();
 return {
  async render(project,frame,label='review') {
   check();url??=await build(root);browser??=await open('chrome',{forceDeviceScaleFactor:scale});check();
   const inputProps={project:renderProject(project)},key=JSON.stringify([project.duration,project.format,project.videoMode]);
   let composition=metadata.get(key);if(!composition){composition=await select({serveUrl:url,id:'GamingVideo',inputProps,puppeteerInstance:browser});metadata.set(key,composition);}
   // Metadata may be reused, but each candidate must supply its own actual props.
   composition={...composition,props:{...composition.props,...inputProps}};check();
   fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'preview-'+String(label).replace(/[^\w.-]/g,'_')+'-'+frame+'.png');
   await still({serveUrl:url,composition,inputProps,frame,output:file,scale,puppeteerInstance:browser});check();return {path:file};
  },
  async close(){if(browser){const prior=browser;browser=undefined;await prior.close({silent:true});}}
 };
}
