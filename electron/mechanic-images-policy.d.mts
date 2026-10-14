export const MECHANIC_IMAGE_KINDS:string[];
export function isGeneratedMechanicCard(layer:{manual?:boolean;setupGraphic?:{kind:string}}):boolean;
export function mechanicImageKind(kind:string):string;
export function mechanicImageRole(kind:string):string;
