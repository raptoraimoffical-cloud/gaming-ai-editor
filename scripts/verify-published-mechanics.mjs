import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createPublishedMechanics} from '../electron/published-mechanics.mjs';
import {createCompetitiveCast} from '../electron/competitive-cast.mjs';
const folder=path.resolve('workspace/simple-changes-check'),service=createPublishedMechanics(path.join(folder,'published-mechanics'));
try{const result=[];for(const cue of [{kind:'move',name:'trick-room',title:'Trick Room'},{kind:'ability',name:'intimidate',title:'Intimidate'}]){const m=await service.capture(cue);assert.ok(m.moveCard.verified&&m.width>500&&m.height>100);result.push({kind:cue.kind,path:m.path,name:m.moveCard.name,width:m.width,height:m.height,source:m.originalUrl});console.log('Captured actual published '+cue.kind+' reference: '+m.moveCard.name);}
 const roster=await createCompetitiveCast(path.join(folder,'competitive-cast')).load({topic:'Pokemon Champions',scenes:[]});assert.ok(roster.rows.length>10);console.log('Loaded actual '+roster.month+' competitive usage: '+roster.rows.length+' examples');
 fs.writeFileSync(path.join(folder,'published-verification.json'),JSON.stringify({images:result,competitiveUsage:{source:roster.source,month:roster.month,format:roster.format,examples:roster.rows.length}},null,2));
}finally{await service.close();}
