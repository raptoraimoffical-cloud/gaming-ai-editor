export const ANIMATION_PRESETS:string[];
export function placementFor(layer:any,layers:any[],media:any[],time:number,width:number,height:number,fps?:number,frozen?:boolean,seen?:string[]):{motion:ReturnType<typeof motionFor>;width:number;height:number};
export function propertyAt(layer:any,key:string,time:number,fallback?:number):number;
export function motionFor(layer:any,time:number,fps?:number,frozen?:boolean):{x:number;y:number;scale:number;scaleX:number;scaleY:number;rotation:number;opacity:number;dx:number;dy:number;reveal:number};
