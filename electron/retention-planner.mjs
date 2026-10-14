export function parseRetention(text){
 let rows;try{const json=JSON.parse(text);rows=Array.isArray(json)?json:json.points;if(!Array.isArray(rows))throw Error();}catch{
  const lines=text.trim().split(/\r?\n/),headers=lines.shift().split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  rows=lines.filter(Boolean).map(line=>Object.fromEntries(line.split(',').map((v,i)=>[headers[i],Number(v.trim().replace(/^"|"$/g,''))])));
 }
 const points=rows.map(r=>({position:Number(r.position??r.elapsedVideoTimeRatio),retention:r.audienceWatchRatio!==undefined?Number(r.audienceWatchRatio)*100:Number(r.retention??r.retentionPercent)}));
 if(points.length<3||points.length>10000||points.some(p=>!Number.isFinite(p.position)||p.position<0||p.position>1||!Number.isFinite(p.retention)||p.retention<0||p.retention>1000))throw Error('Use CSV columns position,retention (0–1 position, percent retention), or elapsedVideoTimeRatio,audienceWatchRatio. At least 3 valid points are required.');
 points.sort((a,b)=>a.position-b.position);if(new Set(points.map(p=>p.position)).size!==points.length)throw Error('Retention positions must be unique');
 return {version:1,points,source:'User-imported historical audience retention',importedAt:new Date().toISOString()};
}
export function retentionSummary(profile){
 if(!profile?.points?.length)return {basis:'Editorial heuristics; no viewer data imported',measured:false,dips:[],areaUnderCurve:null,notice:'No measured viewer-retention statistics. Planning suggestions are not retention predictions.'};
 const points=parseRetention(JSON.stringify(profile)).points,dips=[];let area=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];area+=(b.position-a.position)*(a.retention+b.retention)/2;if(a.retention-b.retention>=5)dips.push({position:b.position,dropPoints:Number((a.retention-b.retention).toFixed(2)),retention:b.retention});}
 const span=points.at(-1).position-points[0].position;
 return {basis:profile.source||'Imported historical curve',measured:true,pointCount:points.length,coverage:[points[0].position,points.at(-1).position],areaUnderCurve:span?Number((area/span).toFixed(2)):null,dips:dips.sort((a,b)=>b.dropPoints-a.dropPoints).slice(0,8),notice:'Historical curve area is a descriptive statistic, not a prediction for this edit. Dips are percentage-point changes; relative position maps to this video’s duration.'};
}
export function retentionBrief(project,profile){const summary=retentionSummary(profile);return {...summary,videoDuration:project.duration,hookWindow:Math.min(3,project.duration),riskWindows:summary.dips.map(d=>({...d,time:d.position*project.duration})),sceneRisks:project.scenes.map(s=>({id:s.id,start:s.start,end:s.end,wordsPerSecond:(s.words?.length||s.text.split(/\s+/).length)/(s.end-s.start),longVisualHold:s.end-s.start>8,nearHistoricalDip:summary.dips.some(d=>d.position*project.duration>=s.start&&d.position*project.duration<s.end)}))};}
