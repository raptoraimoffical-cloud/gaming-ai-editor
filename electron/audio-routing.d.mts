import type {Project,Media} from '../src/types';
export function sameAudio(a:Media|undefined,b:Media|undefined):boolean;
export function audioRouting(project:Project):{voice:Media|undefined;music:Media|undefined;effects:NonNullable<Project['soundEffects']>};
export function effectVolumeAt(effect:NonNullable<Project['soundEffects']>[number],time:number,project?:Project):number;
export function musicVolumeAt(project:Project,time:number):number;
