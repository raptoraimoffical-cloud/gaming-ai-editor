export const VIDEO_MODES={
 'youtube-shorts':{label:'YouTube Shorts',format:'vertical',width:1080,height:1920,aspect:'9:16',planning:'Plan for mobile Shorts: a clear opening hook, one readable visual focus per beat, concise visual explanations and a clear payoff. Preserve the supplied narration and its full timing; respect user instructions.'},
 'youtube-standard':{label:'Standard YouTube',format:'horizontal',width:1920,height:1080,aspect:'16:9',planning:'Plan for standard widescreen YouTube: establish context, develop explanations in a coherent sequence, use the wide canvas for comparisons and charts, and finish with a clear payoff. Preserve the supplied narration and its full timing; respect user instructions.'},
 vertical:{label:'Vertical video',format:'vertical',width:1080,height:1920,aspect:'9:16',planning:''},
 horizontal:{label:'Widescreen video',format:'horizontal',width:1920,height:1080,aspect:'16:9',planning:''}
};
export function videoMode(project){
 const key=project.videoMode??project.format??'vertical';
 if(!Object.hasOwn(VIDEO_MODES,key))throw Error('Unknown video mode');
 const mode=VIDEO_MODES[key];
 if(project.videoMode&&project.format&&project.format!==mode.format)throw Error('Video mode and canvas format do not match');
 return {id:key,...mode};
}
export function modeOptions(options){const mode=videoMode(options);return {videoMode:mode.id,format:mode.format};}
export function videoFPS(project={}){const fps=project.fps??30;if(![30,60].includes(fps))throw Error('Choose 30 or 60 FPS');return fps;}
