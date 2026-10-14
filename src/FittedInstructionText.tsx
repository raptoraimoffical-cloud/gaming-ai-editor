import React from 'react';
// Build-sheet rows are already wrapped by the layout compiler. Browser wrapping
// must not create a second line over the next ability/nature/stat row.
let context:CanvasRenderingContext2D|null=null;
const widths=new Map<string,number>();
function measuredWidth(text:string,size:number){
 const key=size+'\0'+text;const old=widths.get(key);if(old!==undefined)return old;
 context??=document.createElement('canvas').getContext('2d');if(!context)return text.length*size*.65;
 context.font=`800 ${size}px Arial`;const width=Math.max(0,context.measureText(text).width-Math.max(0,text.length-1));
 if(widths.size>=3000)widths.clear();widths.set(key,width);return width;
}
export function FittedInstructionText({text,width,height,fontSize,color}:{text:string;width:number;height:number;fontSize:number;color:string}){
 const measured=measuredWidth(text,fontSize),size=Math.min(fontSize,height/1.1,fontSize*Math.max(1,width-2)/Math.max(1,measured));
 return <div style={{color,fontFamily:'Arial',fontSize:size,fontWeight:800,lineHeight:1.1,letterSpacing:-1,whiteSpace:'nowrap',textShadow:'0 2px 12px #0008'}}>{text}</div>;
}
