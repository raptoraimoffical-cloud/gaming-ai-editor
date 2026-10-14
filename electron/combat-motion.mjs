// All combat paths share launch/contact times; effects and audio use the same
// clock. Distances are authored screen positions, not a game damage model.
export const COMBAT_PHASES={settle:.12,anticipate:.25,launch:.31,contact:.46,recover:.80};
export const battleMoveCues=project=>project.scenes.flatMap(s=>s.battlePlan&&s.battlePlan.move!=='dust-brawl'?[{kind:'move',name:s.battlePlan.move,title:s.battlePlan.move.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join(' '),sceneId:s.id,start:s.battlePlan.at,end:s.battlePlan.at+s.battlePlan.duration,action:true}]:[]);
export function combatAttacker({start,duration,x,y,contactX=x,physical=false,delay=0,initial,final,geometry={}}){
 const key=(f,values)=>({time:start+(f+delay)*duration,...geometry,...values,...(f===.25?{scaleX:1.035,scaleY:.955}:f===.39?{scaleX:physical?1.07:1.025,scaleY:physical?.955:1.015}:f===.50?{scaleX:.96,scaleY:1.025}:{scaleX:1,scaleY:1})});
 const rest={x,y,rotation:0,scale:1,scaleX:1,scaleY:1,opacity:1};
 return [key(0,{...rest,...initial}),key(.12,rest),key(.25,{x:x-.025,y:y+.007,rotation:-9,scale:.96}),key(.31,{x:x-.018,y:y-.013,rotation:-5,scale:1.025}),key(.39,{x:physical?x+(contactX-x)*.58:x+.023,y:y-.035,rotation:physical?7:4,scale:1.04}),key(.46,{x:contactX,y:y-.012,rotation:physical?12:6,scale:physical?1.035:1.02}),key(.50,{x:physical?contactX-.012:x+.018,y,rotation:physical?7:3,scale:.98}),key(.63,{x:physical?x+(contactX-x)*.30:x+.006,y:y-.018,rotation:-4,scale:1.015}),key(.80,rest),{time:start+duration,...geometry,...rest,...final}];
}
export function combatDefender({start,duration,x,y,faint=false,ineffective=false,resisted=false,initial,final,secondContact,geometry={}}){
 if(ineffective){const rest={...geometry,x,y,rotation:0,scale:1,scaleX:1,scaleY:1,opacity:1};return [{time:start,...rest,...initial},{time:start+duration*.12,...rest},{time:start+duration*.46,...rest},{time:start+duration*.72,...rest},{time:start+duration,...rest,...final}];}
 const key=(f,values)=>({time:start+f*duration,...geometry,...values,...(f===.49?{scaleX:.94,scaleY:1.03}:f===.55?{scaleX:1.035,scaleY:.975}:{scaleX:1,scaleY:1})}),rest={x,y,rotation:0,scale:1,scaleX:1,scaleY:1,opacity:1};
 const keys=[key(0,{...rest,...initial}),key(.12,rest),key(.455,rest),key(.49,{x:x+.018,y:y-.012,rotation:7,scale:.94,opacity:1}),key(.55,{x:x+.035,y:y-.028,rotation:16,scale:1.025,opacity:1})];
 if(secondContact)keys.push(key(.60,{x:x+.044,y:y-.024,rotation:20,scale:.97,opacity:1}));
 if(faint)keys.push(key(.68,{x:x+.035,y:y+.07,rotation:48,scale:.95,opacity:1}),key(.84,{x:x+.035,y:y+.21,rotation:83,scale:.78,opacity:.7}),key(1,{x:x+.035,y:y+.29,rotation:90,scale:.55,opacity:0}));
 else keys.push(key(.67,{x:x+.016,y:y+.008,rotation:-5,scale:.99,opacity:1}),key(.80,rest),key(1,{...rest,...final}));
 if(resisted)for(const k of keys.filter(k=>k.time>start+.4*duration&&k.time<start+.8*duration)){if(k.x!==undefined)k.x=x+(k.x-x)*.35;if(k.y!==undefined)k.y=y+(k.y-y)*.35;if(k.rotation!==undefined)k.rotation*=.3;for(const key of ['scale','scaleX','scaleY'])if(k[key]!==undefined)k[key]=1+(k[key]-1)*.3;}
 return keys;
}
export function combatProjectile(start,duration,delay=0,y=.42,targetY=y){
 const at=f=>start+(f+delay)*duration;
 return [{time:at(.31),x:.24,y,scale:.24,opacity:0},{time:at(.335),x:.26,y:y-.012,scale:.55,opacity:1},{time:at(.39),x:.36,y:y-.018,scale:.9,opacity:1},{time:at(.46),x:.54,y:targetY,scale:1.08,opacity:1},{time:at(.52),x:.565,y:targetY,scale:.55,opacity:0}];
}
export function moveArtwork(project,name){if(!name)return undefined;return project.media.find(m=>m.kind==='image'&&m.moveArtLayout!=='reference'&&(m.assetRole==='move-art'&&m.effectMoveName===name||(m.tags||'').split(/[,;]+/).some(t=>t.trim().toLowerCase()==='move:'+name)));}
