import test from 'node:test';
import assert from 'node:assert/strict';
import {creationMedia,applyCreationAssets} from '../electron/creation-assets.mjs';
test('explicit selection excludes unrelated files and rejects missing assets',()=>{
 const all=[{id:'voice'},{id:'image'},{id:'unused'},{id:'bg',kind:'image'}];
 assert.deepEqual(creationMedia(all,all[0],{selectedMediaIds:['image'],backgroundMediaId:'bg',backgroundMode:'upload'}).map(m=>m.id),['voice','image','bg']);
 assert.throws(()=>creationMedia(all,all[0],{selectedMediaIds:['missing']}),/missing/);
});
test('uploaded images and background persist as timed layers without mutating the source',()=>{
 const p={voiceId:'voice',creationAssets:{imageIds:['image'],backgroundMediaId:'bg'},media:[{id:'image',kind:'image'},{id:'bg',kind:'video'}],scenes:[{id:'s',start:1,end:4,layers:[{id:'old',role:'background'},{id:'caption',role:'caption'}]}]};
 const next=applyCreationAssets(p),layers=next.scenes[0].layers;
 assert.equal(layers[0].mediaId,'bg');assert.equal(layers[0].type,'video');
 assert.ok(layers.some(l=>l.mediaId==='image'&&l.start===1&&l.end===4));
 assert.ok(layers.some(l=>l.id==='caption'));assert.equal(p.scenes[0].layers[0].id,'old');
 assert.equal(applyCreationAssets(next).scenes[0].layers.length,layers.length);
});
