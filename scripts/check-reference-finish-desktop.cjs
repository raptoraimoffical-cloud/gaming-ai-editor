const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const dir = path.join(__dirname, '../workspace/reference-comparison/desktop');
fs.mkdirSync(dir, {recursive: true}); app.setPath('userData', path.join(dir, 'user-data')); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  await require('./desktop-fixtures.cjs').registerProjectServices();
  const {createBackend} = await import('../electron/backend.mjs');
  const b = await createBackend({workspace: path.join(dir, 'backend')}); let win;
  try {
    const p = b.hydrate(JSON.parse(fs.readFileSync(path.join(__dirname, '../workspace/move-effects-check/project.gaming.json'), 'utf8')));
    p.revisionHistory = []; p.revisionCursor = 0;
    // Deliberately unusual current settings catch accidental preset resets.
    p.captionStyle = {...p.captionStyle, fontSize: 47, bottom: .19};
    for (const s of p.scenes) s.captionStyle = {...s.captionStyle, fontSize: 47, bottom: .19};
    let next, context;
    ipcMain.handle('open', () => p); ipcMain.handle('library', () => p.media);
    ipcMain.handle('revision-remake', async (_, p, r, c) => {context = c; next = await b.remake(p, r, c); return next;});
    ipcMain.handle('revision-history', (_, p, d) => b.undoRedo(p, d));
    win = new BrowserWindow({show: false, width: 1500, height: 980, webPreferences: {backgroundThrottling: false, preload: path.join(__dirname, '../electron/preload.cjs'), contextIsolation: true}});
    await win.loadFile(path.join(__dirname, '../dist/index.html'));
    const js = s => win.webContents.executeJavaScript(s), pause = () => js('new Promise(r=>setTimeout(r,150))');
    const click = async label => {await js('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.textContent===' + JSON.stringify(label) + ');if(!b||b.disabled)throw Error("Button unavailable");b.click()})()'); await pause();};
    const captionView = () => js('(()=>{const c=document.querySelector("[data-captions]");if(!c)throw Error("Caption missing");const s=getComputedStyle(c);return {text:c.textContent,fontSize:s.fontSize,bottom:s.bottom,lineHeight:s.lineHeight,shadow:s.textShadow,spans:[...c.querySelectorAll("span")].map(e=>({text:e.textContent,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}))}})()');
    await click('Open project'); await click('+1s'); await click('+1s'); const before = await captionView();
    await js('document.querySelector(`[aria-label="Use trained AI for changes"]`).click()');
    await click('Match examples - keep captions');
    for (let i = 0; i < 400 && !next; i++) await pause(); assert.ok(next); await pause();
    assert.equal(context.preserveCaptions, true); assert.equal(context.referenceMatch, true); assert.equal(context.useAI, false);
    assert.deepEqual(next.captionStyle, p.captionStyle); assert.deepEqual(next.scenes.map(s => s.words), p.scenes.map(s => s.words));
    assert.deepEqual(await captionView(), before, 'Visible caption appearance changed');
    await click('+1s'); assert.ok(!await js('!!document.querySelector(`[data-setup-graphic="move-badge"], [data-setup-graphic="move"], [data-setup-graphic="ability"]`)'), 'Homemade mechanic graphic rendered');
    await click('Undo'); assert.ok(!await js('!!document.querySelector(`[data-setup-graphic="move"]`)'), 'Legacy homemade move card rendered');
    await click('Redo'); assert.ok(!await js('!!document.querySelector(`[data-setup-graphic="move-badge"]`)'));
    fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify({actualButton: true, captionSettingsUnchanged: true, visibleCaptionTextAndAppearanceUnchanged: true, homemadeMechanicCardsSuppressed: true, sourcedImages: next.sourceMoveCardReport, undoRedo: true}, null, 2));
    console.log('PASS actual Match examples button, unchanged visible captions, sourced mechanic image policy and Undo/Redo');
  } finally {win?.destroy(); b.close(); app.quit();}
}).catch(e => {console.error(e); app.exit(1);});
