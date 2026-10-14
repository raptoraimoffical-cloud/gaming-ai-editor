import type {Project,Scene} from '../src/types';
export const GAME_OPTIONS:Record<string,string>;
export function validateGameSelection(value?:string):string;
export function selectedGame(project:Project):string;
export function sceneGame(project:Project,scene:Scene,fallback?:string):string;
export function gameProfile(project:Project,value?:string):Project;
