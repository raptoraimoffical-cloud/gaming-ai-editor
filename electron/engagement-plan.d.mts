import type {Project,Scene} from '../src/types';
export const ENGAGEMENT_RESEARCH:any;
export const ENGAGEMENT_POLICY:{version:number;targetSeconds:number;hookVisualBy:number;basis:string;rules:string[]};
export function shortform(project:Project):boolean;
export function engagementWindows(scene:Scene,project:Project):any[];
export function creativePassages(scene:Scene,project:Project,options?:{seconds?:number}):any[];
export function rebaseActions(actions:any[],passage:any):any[];
export function auditEngagement(project:Project):{enabled:boolean;version?:number;targetSeconds:number;toleranceSeconds?:number;firstVisualAt?:number;events:any[];holds:any[];gaps:any[];warnings:string[];prematureVisuals:any[];measured:boolean;notice?:string};
