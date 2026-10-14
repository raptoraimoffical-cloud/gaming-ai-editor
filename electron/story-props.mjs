// A source image can be a carried object or an explainer. Its use in this
// passage, rather than a global asset label, determines whether it is a lead.
export const sameSourceImage=(a,b)=>!!a&&!!b&&(a.id===b.id||!!a.path&&a.path===b.path||!!a.originalUrl&&a.originalUrl===b.originalUrl);
export function heldStorySources(scene,project){
 const ids=new Set();
 for(const [i,a] of (scene.editorialPlan?.creativeActions||[]).entries())for(const p of a.props||[]){if(p.anchor==='stage')continue;const m=project.media.find(m=>m.id===project.creativePropAssets?.[scene.id+'/'+i+'/'+p.id]);if(m)for(const asset of project.media)if(sameSourceImage(asset,m))ids.add(asset.id);}
 return project.media.filter(m=>ids.has(m.id)&&!m.pokemon);
}
export function activeHeldPicture(scene,media,start,end,project){
 return (scene.layers||[]).some(l=>l.attachment&&!l.manual&&!l.instructionLocked&&l.start<end&&l.end>start&&sameSourceImage(media,project.media.find(m=>m.id===l.mediaId)));
}
