import {noMotion,backgroundTopic} from './game-presentation.mjs';import {sceneGame,selectedGame} from './game-selection.mjs';
const palettes={game:['#25475c','#132637'],fire:['#663e32','#262733'],water:['#3e7183','#213e60'],electric:['#68684a','#2c3a48'],grass:['#4c7965','#253e49'],psychic:['#65536e','#303249'],ghost:['#55516e','#282c48'],ice:['#58798b','#34465f'],steel:['#536779','#263746']};
export function applyReferenceStage(project){
 const p=structuredClone(project),report={scenes:[],captionsChanged:false};
 for(const s of p.scenes){for(const l of s.layers||[])if(l.referenceSetHidden!==undefined){if(l.opacity===0)l.opacity=l.referenceSetHidden;delete l.referenceSetHidden;}s.layers=(s.layers||[]).filter(l=>!l.referenceSet||l.manual);if(s.manualTemplate||sceneGame(p,s,selectedGame(p))!=='pokemon'||p.gamePatterns===false)continue;
  const protectedBackground=['upload','generate'].includes(p.creationAssets?.backgroundMode)||(s.layers||[]).some(l=>l.role==='background'&&l.manual&&!l.blueprintVisual);if(protectedBackground)continue;
  const backgrounds=(s.layers||[]).filter(l=>l.role==='background'&&(l.blueprintVisual||l.id?.includes('presentation-pattern')));if(!backgrounds.length)continue;
  const topic=s.layers.find(l=>l.blueprintEffect?.theme)?.blueprintEffect.theme||backgroundTopic(s,p),colors=palettes[topic]||palettes.game,explicit=p.editingPreferences?.backgroundColor;
  for(const b of backgrounds){b.referenceSetHidden??=b.opacity??1;b.opacity=0;}
  s.layers.push({id:s.id+'-reference-set',type:'group',role:'background',referenceSet:true,start:s.start,end:s.end,x:0,y:0,width:1,height:1,z:3,animation:'none',exit:'none',cinematicDepthOverride:0,referenceStage:{colors:explicit?[explicit,explicit]:colors,topic,width:p.format==='horizontal'?1920:1080,height:p.format==='horizontal'?1080:1920,motion:!noMotion(p)&&!p.freezePokemonMotion,floor:!!s.layers.some(l=>l.blueprintEffect),intensity:.26}});report.scenes.push(s.id);
 }
 p.referenceStageReport=report;return p;
}
