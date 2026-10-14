import {noMotion} from './game-presentation.mjs';
import {planMoveEffects} from './move-effects.mjs';

const supported = new Set(['pokemon-dense', 'pokemon-setup', 'pokemon-artwork']);
const editable = l => !l.manual && !l.manualFraming && !l.instructionLocked;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fields = ['x', 'y', 'width', 'height', 'z', 'animation', 'animationStart', 'entranceDuration', 'keyframes', 'setupGraphic'];
const overlap = (a, b) => a.start < b.end && a.end > b.start;
const sameBox = (a, b) => ['x', 'y', 'width', 'height'].every(k => Math.abs(a[k] - b[k]) < .002);

// This pass never writes caption settings, word text or captionText. It works
// with actual narrated actors and source cards, not timer-generated filler.
export function applyReferenceFinish(project) {
  if (!supported.has(project.shortStyle)) return project;
  const next = structuredClone(project), motion = !noMotion(next), moves = planMoveEffects(next);
  const report = {version: 1, references: 5, compactMoves: [], ensembles: [], continuations: [], soundBeats: [], captionsChanged: false};
  for (const scene of next.scenes) {
    scene.layers = (scene.layers || []).filter(l => !l.referenceDecoration);
    if (scene.manualTemplate || scene.battlePlan) continue;
    const layers = scene.layers;
    // Restore the authored geometry before each pass, so remakes/finishing are
    // idempotent and a newly edited manual object is never reset.
    for (const l of layers.filter(editable)) {
      if (l.referenceSource) for (const key of fields) {
        if (Object.hasOwn(l.referenceSource, key)) l[key] = structuredClone(l.referenceSource[key]);
        else delete l[key];
      }
      delete l.referenceContinuation;
    }
    const remember = l => {l.referenceSource ??= Object.fromEntries(fields.filter(k => Object.hasOwn(l, k)).map(k => [k, structuredClone(l[k])]));};
    const explanation = /\b(?:power|accuracy|chance|percent|damage|effect|burns? the target|special attack|special defense|base stats?|ability|abilities)\b/i.test(scene.text);
    for (const card of layers.filter(l => editable(l) && l.setupGraphic?.kind === 'move')) {
      const move = moves.find(c => c.sceneId === scene.id && c.action && norm(c.title) === norm(card.setupGraphic.title) && overlap(c, card));
      if (!move || explanation || layers.some(l => l.role === 'gameplay' && overlap(l, card))) continue;
      remember(card);
      card.setupGraphic = {...card.setupGraphic, kind: 'move-badge', motion};
      Object.assign(card, {x: .14, y: .64, width: .72, height: .085});
      report.compactMoves.push({sceneId: scene.id, start: card.start, title: move.title, reason: 'Performed move: emphasize the attack and artwork, not unspoken stats.'});
    }
    const actors = layers.filter(l => editable(l) && l.role === 'subject' && !l.attachment);
    for (const start of [...new Set(actors.map(l => l.start))]) {
      const group = actors.filter(l => l.start === start);
      const panel = layers.some(l => l.setupGraphic && !['move-badge', 'electric-flow'].includes(l.setupGraphic.kind) && overlap(l, group[0]));
      if (layers.some(l => ['gameplay', 'chart'].includes(l.role) && overlap(l, group[0]))) continue;
      if (group.length === 1 && !panel && next.shortStyle !== 'pokemon-artwork') {
        remember(group[0]); Object.assign(group[0], {x: .04, y: .12, width: .92, height: .56});
      } else if (group.length > 2 && !panel) {
        const shot = next.shortStyleReport?.shots.find(s => s.sceneId === scene.id && s.start <= start && s.end > start);
        const heroId = shot?.subjects.find(s => s.entityId === shot.anchorEntityId)?.mediaId || shot?.subjects[0]?.mediaId;
        const hero = group.find(l => l.mediaId === heroId) || group[0], partners = group.filter(l => l !== hero);
        const boxes = [[.025, .20, .26, .27], [.715, .20, .26, .27], [.10, .49, .24, .20], [.38, .51, .24, .20], [.66, .49, .24, .20]];
        remember(hero); Object.assign(hero, {x: .25, y: .12, width: .50, height: .40, z: 16});
        for (const [i, actor] of partners.entries()) {
          remember(actor); const [x, y, width, height] = boxes[i % boxes.length];
          Object.assign(actor, {x, y, width, height, z: 12 + i});
        }
        report.ensembles.push({sceneId: scene.id, start, heroId: hero.mediaId, supportingIds: partners.map(l => l.mediaId)});
      }
    }
  }
  // A sentence boundary is not a new image reveal. Match touching actor spans
  // globally, retaining the exact camera path while suppressing repeat pops.
  const entries = next.scenes.flatMap(s => !s.manualTemplate && !s.battlePlan ? (s.layers || []).filter(l => editable(l) && l.role === 'subject').map(l => ({s, l})) : []).sort((a, b) => a.l.start - b.l.start);
  for (const {s, l} of entries) {
    const prior = entries.filter(p => p.l !== l && p.l.mediaId === l.mediaId && Math.abs(p.l.end - l.start) < .025 && p.l.start < l.start && sameBox(p.l, l)).at(-1);
    if (prior) {
      l.referenceContinuation = true; l.animation = 'none'; l.animationStart = prior.l.animationStart ?? prior.l.start;
      if (motion && prior.l.keyframes) l.keyframes = structuredClone(prior.l.keyframes);
      report.continuations.push({sceneId: s.id, layerId: l.id, start: l.start, mediaId: l.mediaId});
    }
    // Ground the cutout in a coherent scene without copying reference artwork.
    if (next.shortStyle === 'pokemon-artwork' || !l.mediaId || l.width < .35) continue;
    s.layers.push({id: l.id + '-reference-ground', referenceDecoration: true, type: 'svg', role: 'editorial-depth',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100"><defs><radialGradient id="ground"><stop stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="300" cy="50" rx="285" ry="43" fill="url(#ground)"/></svg>',
      attachment: {targetId:l.id,anchor:'ground',x:.5,y:1,size:.72,contentBounds:true},
      x: l.x + l.width * .1, y: l.y + l.height - .035, width: l.width * .8, height: .045, z: l.z - 1, start: l.start, end: l.end, animation: 'none', exit: 'none'});
  }
  next.referenceFinishReport = report;
  return next;
}
