import type {VisualLayer,Project} from '../src/types';
export function activeEffectOwner(layer:VisualLayer,layers:VisualLayer[],time:number):VisualLayer|undefined;
export function pruneOrphanEffects(project:Project):Project;
