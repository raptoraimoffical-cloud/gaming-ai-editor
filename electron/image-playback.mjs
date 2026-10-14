export function imagePlayback(media){
 const file=media.path||'',knownStatic=media.animationInfo?.animated===false||media.pokemon?.animated===false&&media.pokemon?.frameCount===1;
 if(knownStatic)return 'still';
 if(/\.gif$/i.test(file)||media.pokemon?.animated&&media.animationInfo?.format!=='webp')return 'gif';
 if(media.animationInfo?.animated)return 'animated';
 // A static WebP has one zero-duration frame. Sending it through the
 // animation decoder can leave a blank canvas during paused preview.
 return 'still';
}
