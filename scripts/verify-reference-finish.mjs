import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {isGeneratedMechanicCard} from '../electron/mechanic-images-policy.mjs';
import {createBackend, root, run} from '../electron/backend.mjs';
const dir = path.join(root, 'workspace/reference-comparison');
fs.mkdirSync(dir, {recursive: true});
// Use the real speech/artwork project rendered before the comparison upgrade.
// References remain analysis material and are never imported as generated clips.
const b = await createBackend({workspace: path.join(root, 'workspace/move-effects-check/backend')});
const captions = p => ({color: p.captionColor, style: p.captionStyle, research: p.captionResearch, scenes: p.scenes.map(s => ({id: s.id, style: s.captionStyle, accent: s.captionAccent, manual: s.captionColorManual, words: s.words}))});
try {
  const p = b.hydrate(JSON.parse(fs.readFileSync(path.join(root, 'workspace/move-effects-check/project.gaming.json'), 'utf8')));
  const before = structuredClone(p);
  const n = await b.remake(p, '', {useAI: false, referenceMatch: true, preserveCaptions: true}, {}, e => console.log(e.stage));
  assert.deepEqual(p, before, 'Remake mutated its input');
  assert.deepEqual(captions(n), captions(p), 'Caption preservation failed');
  assert.ok(!n.scenes.flatMap(s=>s.layers||[]).some(isGeneratedMechanicCard), 'Homemade mechanic panel returned');
  assert.ok(n.moveEffectReport.cues.some(c=>c.title==='Flamethrower'));
  assert.ok(n.sourceMoveCardReport.some(c=>c.move==='flamethrower'));
  assert.ok(n.referenceFinishReport.continuations.length > 0);
  assert.ok(n.scenes.flatMap(s => s.layers).some(l => l.role === 'subject' && l.height > .5));
  assert.deepEqual(JSON.parse(JSON.stringify(b.undoRedo(n, 'undo').scenes)), JSON.parse(JSON.stringify(p.scenes)));
  assert.deepEqual(JSON.parse(JSON.stringify(b.undoRedo(b.undoRedo(n, 'undo'), 'redo').scenes)), JSON.parse(JSON.stringify(n.scenes)));
  n.musicId = undefined; n.musicVolume = 0;
  fs.writeFileSync(path.join(dir, 'before.gaming.json'), JSON.stringify(p, null, 2));
  fs.writeFileSync(path.join(dir, 'after.gaming.json'), JSON.stringify(n, null, 2));
  const result = await b.render(n, path.join(dir, 'matched-examples.mp4'), e => {if (e.percent === undefined) console.log(e.stage);});
  const fire = n.moveEffectReport.cues.find(c => c.effect === 'screen-fire' && c.action);
  const samples = [{label: 'hook', time: .9}, {label: 'fire', time: fire.start + .7}, {label: 'continuation', time: 4.2}, {label: 'electric', time: 7.4}, {label: 'water', time: 9.4}, {label: 'ice', time: 11.6}];
  for (const sample of samples) {
    for (const [name, input] of [['before', path.join(root, 'workspace/move-effects-check/move-effects.mp4')], ['after', result.output]]) {
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(sample.time), '-i', input, '-frames:v', '1', '-vf', 'scale=540:960', path.join(dir, name + '-' + sample.label + '.png')]);
    }
  }
  const verification = {referenceInputs: JSON.parse(fs.readFileSync(path.join(dir, 'inputs.json'), 'utf8')).map(r => ({id: r.id, duration: r.duration})), realBackendRemake: true, captionsUnchanged: true, narrationUnchanged: true, inputUnchanged: true, undoRedo: true, finish: n.referenceFinishReport, sounds: n.soundEffectReport, output: result.output, samples};
  fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(verification, null, 2));
  console.log('PASS real remake/export, larger attack artwork, sourced mechanic image policy, continuity, exact caption preservation and Undo/Redo');
} finally {b.close();}
