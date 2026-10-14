import React,{useEffect,useState} from 'react';
import type {Project} from './types';
export function ProjectHealth({project,onSeek}:{project:Project;onSeek:(time:number)=>void}){
 const [report,setReport]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setReport(null);setError('');window.editor.health(project).then(r=>{if(active)setReport(r);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[project]);
 return <details className="pipeline-evidence" aria-label="Project quality check"><summary>Quality Check · {error?'Unavailable':!report?'Checking…':report.ready?'Ready to export':'Fix before export'}{report?.issues.length?' · '+report.issues.length+' findings':''}</summary>
 {error&&<p role="alert">{error}</p>}{report&&<><p>{report.canvas?.label} · {report.canvas?.width} × {report.canvas?.height}. Checks cover timeline continuity, caption timing, referenced files, audio and visual structure.</p>{!report.issues.length&&<p>No structural or missing-file problems found. Review the preview for visual and editorial quality.</p>}{report.issues.map((i:any,n:number)=><p key={n} className={i.severity==='error'?'needs-review':'note'}><strong>{i.severity==='error'?'Fix':'Review'}:</strong> {i.message} {i.sceneId&&<button onClick={()=>onSeek(project.scenes.find(s=>s.id===i.sceneId)?.start||0)}>Go to scene</button>}</p>)}</>}
 </details>;
}
