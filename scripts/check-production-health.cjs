const {app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.GAMING_EDITOR_HEADLESS_CHECK='1';process.env.GAMING_EDITOR_CHECK_WORKSPACE=path.resolve(__dirname,'../workspace/feature-audit/production-'+Date.now()+'-'+process.pid);app.setPath('sessionData',path.join(process.env.GAMING_EDITOR_CHECK_WORKSPACE,'session'));
require('../electron/main.cjs');
app.whenReady().then(async()=>{
 let win;const deadline=Date.now()+30000;while(Date.now()<deadline){win=BrowserWindow.getAllWindows()[0];if(win&&!win.webContents.isLoading()&&await win.webContents.executeJavaScript("!!document.querySelector('header')").catch(()=>false))break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(win);const p=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../workspace/ai-changes-live/project.gaming.json'),'utf8'));p.id='production-health';p.name='Recovery integration test';
 const js=s=>win.webContents.executeJavaScript(s);await js(`window.editor.autosave(${JSON.stringify(p)})`);const restored=await js('window.editor.recover()');assert.equal(restored,null);assert.ok(!fs.existsSync(path.join(process.env.GAMING_EDITOR_CHECK_WORKSPACE,'autosaves')));
 const report=await js(`window.editor.health(${JSON.stringify(p)})`);assert.equal(report.ready,true,JSON.stringify(report.issues));const broken={...p,soundEffects:[{mediaId:'missing-sound',start:1,volume:.2}]};const failure=await js(`window.editor.health(${JSON.stringify(broken)})`);assert.equal(failure.ready,false);assert.ok(failure.issues.some(i=>i.code==='missing-asset'));
 console.log('PASS production IPC, no automatic project writes, session project validation and export preflight');win.close();
}).catch(e=>{console.error(e);app.exit(1);});
