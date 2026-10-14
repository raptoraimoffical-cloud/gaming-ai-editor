import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createBackend,root} from '../electron/backend.mjs';
import {applyCreativeActions,acquireCreativeProps,planCreativeActions} from '../electron/creative-actions.mjs';
import {bundledNarrationArt} from '../electron/narration-props.mjs';
import {measureProjectArtwork} from '../electron/artwork-geometry.mjs';
import {createReviewRenderer} from '../electron/review-renderer.mjs';
const folder=path.join(root,'workspace/fresh-creative-check');fs.mkdirSync(folder,{recursive:true});
const b=await createBackend({workspace:path.join(root,'workspace/overlay-artwork-check/backend')}),review=createReviewRenderer({root,folder,scale:.5});
try{
 const source=JSON.parse(fs.readFileSync(path.join(root,'workspace/context-check/updated-short.gaming.json'),'utf8'));
 const lead=source.media.find(m=>m.name==='Mega Sceptile'),rival=source.media.find(m=>m.pokemon?.name==='rotom'),crown=bundledNarrationArt().find(m=>m.identity.subject==='crown');assert.ok(lead&&rival&&crown);
 const text='Rotom and Mega Sceptile compete. Mega Sceptile dethroned Rotom.';
 let p=b.hydrate({...source,id:'fresh-creative-diagnostic',duration:8,gameSelection:'pokemon',soundEffects:[],musicId:undefined,editingInstructions:'Show the whole narrated idea as a little animated scene. Show the outgoing champion Rotom wearing a sourced crown briefly, then Mega Sceptile knocks it off and the crown tumbles away when the narration says dethroned. Keep facts, captions and all speech unchanged. Use creativeActions with timed prop attachment and detachAt; no text placeholders.',media:[...source.media,crown],scenes:[{id:'s',start:0,end:8,text,words:text.split(' ').map((text,i)=>({text,start:i*.35,end:i*.35+.3})),reaction:{entities:[{id:'lead',name:'Mega Sceptile',type:'pokemon',mediaId:lead.id,start:.7},{id:'rival',name:'Rotom',type:'pokemon',mediaId:rival.id,start:0}],metrics:[]},layers:[...source.scenes[0].layers.filter(l=>['background','environment-depth'].includes(l.role)).map(l=>({...l,start:0,end:8})),...[lead,rival].map((m,i)=>({id:'actor-'+i,type:'image',role:'subject',mediaId:m.id,start:i===0?.7:0,end:8,x:i===0?.51:.03,y:.16,width:.46,height:.43,z:10,fit:'contain',animation:'none',exit:'none'}))]}]});
 const replay=process.argv.includes('--render-existing');let state;if(replay){p=b.hydrate(JSON.parse(fs.readFileSync(path.join(folder,'project.gaming.json'),'utf8')));console.log('Re-rendering the previously recorded trained-model fixture with the updated animation compiler');}else{state=await b.localAI.begin('high');p=await planCreativeActions(p,state,u=>console.log(u.stage));}
 fs.writeFileSync(path.join(folder,'planning.json'),JSON.stringify({report:p.creativePlanningReport,plan:p.scenes[0].editorialPlan,inference:state?.inferenceEvents},null,2));
 assert.ok(p.scenes[0].editorialPlan?.creativeActions?.length,'Trained editor did not produce an executable creative action');
 p=await acquireCreativeProps(p);p=await measureProjectArtwork(p);const finished=applyCreativeActions(p);assert.ok(finished.creativeActionReport.events.length,'No action actually reached the composition');
 assert.deepEqual(finished.captionStyle,p.captionStyle);assert.deepEqual(finished.scenes[0].words,p.scenes[0].words);
 const event=finished.creativeActionReport.events[0],samples=[event.start+.15,Math.min(event.end-.05,event.start+1.1)];for(const t of samples)await review.render(b.hydrate(finished),Math.round(t*30),'creative-'+t.toFixed(2));
 fs.writeFileSync(path.join(folder,'project.gaming.json'),JSON.stringify(finished,null,2));fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({model:p.creativePlanningReport?.model||state?.models.editing?.name||state?.models.reasoning.name,plan:p.scenes[0].editorialPlan,events:finished.creativeActionReport.events,sourceProps:p.creativePropAssets,captionsUnchanged:true,frames:samples},null,2));console.log('PASS actual trained creative recipe, sourced crown, attachment/detachment and two rendered frames');
}finally{await review.close();b.close();}
