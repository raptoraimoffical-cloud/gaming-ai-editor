import {spawn} from 'node:child_process';
import electron from 'electron';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const entry=process.argv[2]?path.resolve(projectRoot,process.argv[2]):projectRoot;
const checkProfile=process.argv[2]&&/^(?:check-|verify-google-live)/.test(path.basename(entry))?['--user-data-dir='+path.join(projectRoot,'workspace','feature-audit','profiles',Date.now()+'-'+process.pid)]:[];
// Electron is a GUI application. windowsHide hides its desktop window on Windows.
const child=spawn(electron,[...checkProfile,entry,...process.argv.slice(3)],{cwd:projectRoot,stdio:'inherit',env,windowsHide:false});
child.on('exit',(code,signal)=>{if(code!==0)console.error(`Electron exited: ${signal||code}`);process.exit(code??1);});
child.on('error',e=>{console.error('Unable to launch Electron:',e);process.exit(1);});
