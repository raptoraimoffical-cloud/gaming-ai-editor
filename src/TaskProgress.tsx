import React,{useEffect,useRef,useState} from 'react';

export type TaskProgressEvent={stage?:string;percent?:number;jobId?:string;state?:'started'|'running'|'completed'|'failed'|'cancelled';estimatedSeconds?:number;label?:string};
export function durationLabel(seconds:number){
 const value=Math.max(0,Math.ceil(seconds));
 if(value<60)return `${value}s`;
 if(value<3600)return `${Math.floor(value/60)}m ${value%60}s`;
 return `${Math.floor(value/3600)}h ${Math.floor(value%3600/60)}m`;
}
export function TaskProgress({busy}:{busy:boolean}){
 const [task,setTask]=useState<TaskProgressEvent|null>(null),[now,setNow]=useState(Date.now());
 const started=useRef(0),sample=useRef<{stage?:string;percent:number;time:number}|null>(null),stageEta=useRef<number|null>(null);
 useEffect(()=>window.editor.onProgress(event=>{
  const t=Date.now();
  if(event.state==='completed'||event.state==='failed'||event.state==='cancelled'){setTask(null);started.current=0;sample.current=null;stageEta.current=null;return;}
  if(event.state==='started'||!started.current){started.current=t;sample.current=null;stageEta.current=null;}
  if(typeof event.percent==='number'&&Number.isFinite(event.percent)){
   const p=Math.max(0,Math.min(100,event.percent)),s=sample.current;
   if(!s||s.stage!==event.stage||p<s.percent){sample.current={stage:event.stage,percent:p,time:t};stageEta.current=null;}
   else if(p>s.percent+1&&t-s.time>=1000){stageEta.current=p<100?(100-p)*(t-s.time)/(p-s.percent)/1000:0;}
  }else {sample.current=null;stageEta.current=null;}
  setTask(previous=>({...previous,...event,percent:typeof event.percent==='number'&&Number.isFinite(event.percent)?Math.max(0,Math.min(100,event.percent)):undefined}));setNow(t);
 }),[]);
 useEffect(()=>{
  if(busy&&!started.current){started.current=Date.now();setNow(started.current);}
  if(!busy&&!task){started.current=0;sample.current=null;stageEta.current=null;}
 },[busy,task]);
 const visible=busy||!!task;
 useEffect(()=>{if(!visible)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[visible]);
 if(!visible)return null;
 const elapsed=Math.max(0,(now-(started.current||now))/1000),historical=task?.estimatedSeconds;
 const eta=historical&&historical>elapsed?historical-elapsed:stageEta.current;
 const etaText=eta!==null&&eta!==undefined?(eta<1?'Finishing…':`~${durationLabel(eta)} remaining${historical&&historical>elapsed?' (estimated)':' in this stage'}`):historical&&elapsed>=historical?'Taking longer than previous runs':'Estimating time remaining…';
 return <aside className="task-progress" aria-label="Task progress" aria-busy="true">
  <div className="task-progress-heading"><strong>{task?.label||'Working'}</strong><span>{task?.percent!==undefined?`${Math.round(task.percent)}%`:'In progress'}</span></div>
  <p role="status">{task?.stage||'Preparing task…'}</p>
  <progress aria-label="Current task progress" max={100} {...(task?.percent!==undefined?{value:task.percent}:{})}/>
  <button className="danger" aria-label="Stop editing" onClick={()=>window.localAI.cancel()}>Stop editing</button><div className="task-progress-timing"><span>Elapsed {durationLabel(elapsed)}</span><span>{etaText}</span></div>
 </aside>;
}
