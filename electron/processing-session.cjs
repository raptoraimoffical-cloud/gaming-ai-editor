const {randomUUID}=require('node:crypto');
exports.createProcessingSession=()=>{
 let current;
 return {
  start(label){if(current)throw Error('Another processing job is running');const controller=new AbortController();current={id:randomUUID(),label,controller,signal:controller.signal};return current;},
  stop(){if(!current)return false;current.controller.abort(Error('Editing stopped by you. The previous video is unchanged.'));return true;},
  finish(task){if(current===task)current=undefined;},
  active:()=>current
 };
};
