import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {openBrowser} from '@remotion/renderer';
import {createBackend,root} from '../electron/backend.mjs';import {createReviewRenderer} from '../electron/review-renderer.mjs';
const folder=path.join(root,'workspace/feature-audit/review');let opened=0;
const b=await createBackend({workspace:path.join(root,'workspace/move-effects-check/backend')}),review=createReviewRenderer({root,folder,scale:.25,open:async(_,options)=>{opened++;return openBrowser('chrome',options);}});
const pixels=file=>sharp(file).raw().toBuffer();
try{
 const p=b.hydrate(JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8'))),next=structuredClone(p);next.scenes[0].layers.find(l=>l.role==='subject').width*=.8;
 const first=await review.render(p,105,'original'),changed=await review.render(next,105,'candidate'),last=await review.render(p,105,'original-again');
 assert.ok((await pixels(first.path)).equals(await pixels(path.join(root,'workspace/feature-audit/render/full-props-3.5.png'))),'Reusable review changed original render pixels');
 assert.ok(!(await pixels(first.path)).equals(await pixels(changed.path)),'Review reused stale candidate props');assert.ok((await pixels(first.path)).equals(await pixels(last.path)));assert.equal(opened,1);
 fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({chromiumInstances:opened,frames:3,originalPixelsPreserved:true,changedCandidateActuallyRendered:true},null,2));console.log('PASS three actual AI review frames, one Chromium instance, preserved pixels and fresh candidate props');
}finally{await review.close();b.close();}
