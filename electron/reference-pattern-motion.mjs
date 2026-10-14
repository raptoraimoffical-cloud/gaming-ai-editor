const wrap=(n,tile)=>((n%tile)+tile)%tile;
// Absolute recording time and wrap in tile coordinates keep preview/export
// continuous at sentence boundaries and when a tile exits the canvas.
export function referencePatternMotion(time,motion=true){
 const t=motion?Math.max(0,time):0,tile=230;
 return {tile,ballX:wrap(t*22,tile),ballY:wrap(-t*13,tile),checkX:wrap(t*6,tile),checkY:wrap(-t*3.5,tile)};
}
