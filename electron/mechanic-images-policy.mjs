// Published artwork and game screenshots own mechanic information. Animation
// and charts of actual narrated values remain editable code-based visuals.
export const MECHANIC_IMAGE_KINDS=['move','move-badge','ability','type','nature'];
export function isGeneratedMechanicCard(layer){
 return !layer.manual&&MECHANIC_IMAGE_KINDS.includes(layer.setupGraphic?.kind);
}
export const mechanicImageKind=kind=>kind==='move-badge'?'move':kind;
export const mechanicImageRole=kind=>mechanicImageKind(kind)+'-card';
const norm=s=>String(s||'').normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function findMechanicImage(project,kind,title){
 return project.media.find(m=>m.kind==='image'&&m.assetRole===mechanicImageRole(kind)&&m.moveCard?.verified&&norm(m.moveCard.name)===norm(title)&&(kind==='type'||typeof m.moveCard.description==='string'&&m.moveCard.description.trim().length>=20)&&!/(?:original programmatic|generated illustration|procedural)/i.test(m.identity?.source||''));
}
export function sourceMechanicGeometry(media,kind,project){
 const width=project.format==='horizontal'?1920:1080,height=project.format==='horizontal'?1080:1920,icon=kind==='type',w=icon?.22:.86,regions=media.moveCard?.regions,effects=regions?.primaryEffects||regions?.effects,ratio=regions?(Math.max(regions.title.width,effects.width)*media.width+48)/((regions.title.height+effects.height)*media.height+64):(media.width||1000)/(media.height||400);
 return {x:.07,y:icon?.065:.05,width:w,height:Math.min(icon?.10:.32,Math.max(icon?.055:.16,w*width/ratio/height))};
}
