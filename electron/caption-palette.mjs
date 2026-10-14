// Readability default, not a claimed statistically optimal retention color.
export const CAPTION_PALETTE={text:'#ffffff',accent:'#fff025',backing:'#101722',outline:'#000000'};
export function contrastRatio(foreground,background){const lum=h=>{const c=h.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};const a=lum(foreground),b=lum(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
export function applyCaptionPalette(project){
 const next=structuredClone(project),explicit=/\b(?:red|blue|green|purple|pink|cyan|all yellow|yellow only)\s+(?:captions|subtitles)|\b(?:captions|subtitles)\s+(?:in\s+)?(?:red|blue|green|purple|pink|cyan|all yellow)\b/i.test((project.editingInstructions||'').replace(/^REFERENCE SHORT STYLE:.*$/gm,''));
 if(explicit)return next;
 next.captionStyle={...next.captionStyle,style:'contrast-phrase'};
 for(const s of next.scenes)if(!s.manualTemplate){if((next.revisionHistory||[]).some(r=>(r.operations||[]).some(o=>o.type==='captions'&&o.color===s.captionAccent&&(!o.sceneIds||o.sceneIds.includes(s.id)))))s.captionColorManual=true;s.captionStyle={...s.captionStyle,style:'contrast-phrase'};}
 next.captionResearch={version:1,palette:CAPTION_PALETTE,evidence:'High contrast supports readability; no verified controlled gaming Shorts study establishes a universally best caption color or retention lift.',sources:['https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum','https://support.google.com/youtube/answer/9314415?hl=en']};return next;
}
export function captionWordColor({style,accent},word,active,scene,project){
 if(scene.captionAccent&&(scene.captionColorManual||scene.manualTemplate))return scene.captionAccent;
 if(style==='yellow-phrase')return '#fff025';if(style==='outlined-phrase')return '#ffffff';
 const normalized=String(word.captionText||word.text).toLowerCase().replace(/[^a-z0-9]/g,'');
 const relevant=/\d/.test(normalized)||(project.pokemonMentions||[]).some(m=>m.start<=word.start+.02&&m.end>=word.end-.02)||(project.naturePlan||[]).some(c=>c.sceneId===scene.id&&c.start<=word.start&&c.end>=word.end&&c.name===normalized)||scene.reaction?.emphasis?.some(e=>e.toLowerCase().split(/\W+/).includes(normalized));
 return active&&relevant?(style==='contrast-phrase'?CAPTION_PALETTE.accent:accent||CAPTION_PALETTE.accent):CAPTION_PALETTE.text;
}
