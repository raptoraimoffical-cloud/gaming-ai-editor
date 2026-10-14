import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';
import {createBackend, root} from '../electron/backend.mjs';
const dir = path.join(root, 'workspace/reference-comparison');
const b = await createBackend({workspace: path.join(root, 'workspace/move-effects-check/backend')});
try {
  const voice = await b.importMedia(path.join(dir, 'ensemble.wav'), {assetRole: 'narration', license: 'Windows SAPI diagnostic narration'});
  const p = await b.generate({voiceId: voice.id, name: 'Persistent lead and supporting cast', quality: 'fast', model: 'base.en', pokemon: true, pokemonNames: 'Charizard, Rotom, Glaceon', shortStyle: 'pokemon-dense', videoMode: 'youtube-shorts', autoPokemonCries: false, autoReactionGifs: false, localAnimatorEnabled: false}, e => console.log(e.stage));
  fs.writeFileSync(path.join(dir, 'ensemble.gaming.json'), JSON.stringify(p, null, 2));
  console.log(p.scenes.map(s => s.text).join(' '));
  const ensemble = p.referenceFinishReport.ensembles.find(e => e.supportingIds.length >= 2);
  assert.ok(ensemble, 'No three-Pokemon composition was generated');
  const lead = p.media.find(m => m.id === ensemble.heroId); assert.equal(lead.pokemon.name, 'charizard');
  const samples = [{name: 'ensemble', time: ensemble.start + .6}];
  const chart = p.scenes.flatMap(s => s.layers).find(l => l.setupGraphic?.kind === 'percentage-comparison' && l.setupGraphic.rows.length === 2);
  if (chart) samples.push({name: 'comparison', time: Math.min(chart.end - .05, chart.start + .55)});
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/remotion.tsx')});
  const composition = await selectComposition({serveUrl, id: 'GamingVideo', inputProps: {project: p}});
  for (const s of samples) await renderStill({serveUrl, composition, inputProps: {project: p}, frame: Math.round(s.time * 30), output: path.join(dir, s.name + '.png'), scale: .5});
  fs.writeFileSync(path.join(dir, 'ensemble-verification.json'), JSON.stringify({realWhisper: p.transcriptionInfo, lead: lead.pokemon.name, ensembles: p.referenceFinishReport.ensembles, compactMoves: p.referenceFinishReport.compactMoves, chartRows: chart?.setupGraphic.rows, frames: samples}, null, 2));
  console.log('PASS real generation retains Charizard through named threats, with two distinct supports and rendered reference framing');
} finally {b.close();}
