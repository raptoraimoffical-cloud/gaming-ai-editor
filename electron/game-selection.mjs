export const GAME_OPTIONS={auto:'Auto detect',multiple:'Multiple games',pokemon:'Pokemon',minecraft:'Minecraft',fortnite:'Fortnite',roblox:'Roblox',valorant:'Valorant','counter-strike':'Counter-Strike','league-of-legends':'League of Legends','apex-legends':'Apex Legends',overwatch:'Overwatch','rocket-league':'Rocket League','call-of-duty':'Call of Duty','dota-2':'Dota 2',other:'Other / general gaming'};
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function validateGameSelection(value='auto'){if(!Object.hasOwn(GAME_OPTIONS,value))throw Error('Choose a supported game or Multiple games.');return value;}
export function detectedGames(scene,project={}){
 const text=normalize(scene.text),found=[];
 for(const [id,label] of Object.entries(GAME_OPTIONS))if(!['auto','multiple','other'].includes(id)&&new RegExp('\\b'+normalize(label).replace(/-/g,'[- ]')+'\\b').test(text))found.push(id);
 if(/\bvgc\b|\bshowdown\b/.test(text)||scene.reaction?.entities?.some(e=>e.type==='pokemon')||(project.pokemonMentions||[]).some(m=>m.start<scene.end&&m.end>scene.start))found.push('pokemon');
 for(const e of scene.reaction?.entities||[])if(e.franchise&&Object.hasOwn(GAME_OPTIONS,e.franchise))found.push(e.franchise);
 return [...new Set(found)];
}
export function selectedGame(project){
 if(!project.gameSelection&&project.topic==='minecraft')return 'minecraft';
 const selection=validateGameSelection(project.gameSelection||'auto');
 if(selection!=='auto')return selection;
 const counts=new Map();for(const s of project.scenes||[])for(const game of detectedGames(s,project))counts.set(game,(counts.get(game)||0)+(s.end-s.start));
 if(counts.size>1)return 'multiple';
 return [...counts.keys()][0]||(project.topic==='minecraft'?'minecraft':'');
}
export function sceneGame(project,scene,fallback=''){
 if(!project.gameSelection&&project.topic==='minecraft')return 'minecraft';
 const selection=validateGameSelection(project.gameSelection||'auto');
 if(!['auto','multiple'].includes(selection))return selection==='other'?'':selection;
 const local=detectedGames(scene,project);return local[0]||(fallback==='multiple'?'':fallback)||'';
}
function gameEvents(project,scene){
 const words=scene.words||[],events=[];
 for(const [i,w] of words.entries())for(const [game,label] of Object.entries(GAME_OPTIONS)){
  if(['auto','multiple','other'].includes(game))continue;const phrase=normalize(label).replace(/-/g,' ').split(' '),spoken=normalize(words.slice(i,i+phrase.length).map(w=>w.text).join(' ')).replace(/[^a-z0-9 ]/g,'').trim();
  if(!normalize(scene.text).replace(/[^a-z0-9 ]/g,'').includes(phrase.join(' ')))continue;
  if(spoken===phrase.join(' '))events.push({start:w.start,game});
 }
 for(const e of scene.reaction?.entities||[])if(e.type==='game'&&!e.inherited&&Object.hasOwn(GAME_OPTIONS,e.franchise)&&Number.isFinite(e.start))events.push({start:e.start,game:e.franchise});
 for(const m of project.pokemonMentions||[])if(m.start>=scene.start&&m.start<scene.end)events.push({start:m.start,game:'pokemon'});
 return events.sort((a,b)=>a.start-b.start);
}
export function sceneGameAt(project,scene,time,fallback=''){
 if(!project.gameSelection&&project.topic==='minecraft')return 'minecraft';
 if(!['auto','multiple'].includes(project.gameSelection||'auto'))return sceneGame(project,scene,fallback);
 return gameEvents(project,scene).filter(e=>e.start<=time+.001).at(-1)?.game||sceneGame(project,scene,fallback);
}
export function gameSegments(project,scene,fallback=''){
 const segments=[{start:scene.start,end:scene.end,game:sceneGameAt(project,scene,scene.start,fallback)}];
 if(!project.gameSelection&&project.topic==='minecraft'||!['auto','multiple'].includes(project.gameSelection||'auto'))return segments;
 for(const e of gameEvents(project,scene)){const last=segments.at(-1);if(e.start<=scene.start||e.start>=scene.end||last.game===e.game)continue;if(e.start===last.start){last.game=e.game;continue;}last.end=e.start;segments.push({start:e.start,end:scene.end,game:e.game});}return segments;
}
export function gameProfile(project,value=project.gameSelection||'auto'){
 const gameSelection=validateGameSelection(value),next={...project,gameSelection};
 if(gameSelection==='minecraft')next.topic='minecraft';
 else if(gameSelection!=='auto')delete next.topic;
 // A Pokemon preset must not impose its captions, cast or sound palette on a
 // Minecraft edit or a multi-game essay. Explicit Pokemon scenes still resolve.
 const inferred=selectedGame(next);
 if(gameSelection!=='pokemon'&&(gameSelection!=='auto'||inferred&&inferred!=='pokemon')){
  delete next.shortStyle;delete next.shortStyleReport;
  next.editingInstructions=(next.editingInstructions||'').split('\n').filter(l=>!l.startsWith('REFERENCE SHORT STYLE:')).join('\n');
 }
 next.gameDetectionReport={selection:gameSelection,detected:selectedGame(next),scenes:(next.scenes||[]).map(s=>({sceneId:s.id,games:detectedGames(s,next)}))};return next;
}
