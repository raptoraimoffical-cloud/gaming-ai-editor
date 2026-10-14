// New project services for isolated UI fixtures; production IPC is checked separately.
exports.registerProjectServices=async()=>{
 const {ipcMain}=require('electron');const {projectHealth}=await import('../electron/project-health.mjs');
 ipcMain.handle('runtime-version',()=>({needsRestart:false}));ipcMain.handle('project-health',(_,p)=>projectHealth(p));ipcMain.handle('project-autosave',(_,p)=>p);ipcMain.handle('project-recover',()=>null);
};
exports.navigateWorkbench=async(win,section)=>{
 const routes={'AI Models':['Settings','Settings section','ai-models'],'Settings':['Settings','Settings section','settings'],'Fortnite Assets':['Assets','Asset library section','fortnite'],'Pok\u00e9mon':['Assets','Asset library section','pokemon'],'Pokemon':['Assets','Asset library section','pokemon'],'Storyboard / Reference':['Edit','Editing workspace','storyboard'],'Animator':['Edit','Editing workspace','animator']},route=routes[section];
 if(!route)throw Error('Unknown workbench section '+section);
 await win.webContents.executeJavaScript(`[...document.querySelectorAll('nav[aria-label="Main navigation"] button')].find(b=>b.textContent===${JSON.stringify(route[0])}).click()`);
 await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await win.webContents.executeJavaScript(`(()=>{const s=document.querySelector('[aria-label="'+${JSON.stringify(route[1])}+'"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(route[2])});s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await win.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
};
