export type VideoMode={id:string;label:string;format:string;width:number;height:number;aspect:string;planning:string};
export const VIDEO_MODES:Record<string,Omit<VideoMode,'id'>>;
export function videoMode(project:{videoMode?:string;format?:string}):VideoMode;
export function modeOptions(options:{videoMode?:string;format?:string}):{videoMode:string;format:string};

export function videoFPS(project?:{fps?:number}):number;
