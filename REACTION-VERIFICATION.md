# Narration-driven editing revision

The old planner split speech into word-count chunks, searched a small hardware/game expression, and chose largely identical sprite cards. The new free/local reaction engine groups word-timed sentences, preserves contrast clauses, resolves named subjects, binds literal numbers to their labels, and selects distinct visual compositions and backgrounds.

## Working behavior

- Classification: people, characters, games, Pokemon, mechanics, rankings, comparisons, statistics/numbers, history/timeline, news, list items, emphasis and reveals. Context determines the primary reaction. Explicit topic changes do not retain unrelated Pokemon or subjects from earlier scenes.
- Asset priority: identity-matched declared-rights local media, cached assets/exact Pokemon sprites, permitted catalogs, Commons, then configured stock providers. Single named-entity local images now qualify without needing two unrelated keywords. Custom local identities can use tags such as `character:Sonic`, `person:Clix`, or `game:Your Game`.
- Identity filtering rejects game keyword mentions on advertisements, unrelated signs, player portraits standing in for a game, and blurred copyright-redacted game feeds. A missing match produces a designed topic graphic and an inspector warning. Metadata matching still requires human review; it is not computer vision identification or independent rights auditing.
- Background palettes/graphics react to platformer characters, Pokemon battles, esports, arena games, analysis, leaderboards, news, and documentary subjects. Permitted gameplay can also supply a subtle blurred backdrop. These backgrounds are authored procedural graphics, not copied commercial game art.
- Independent subjects, labels, accent shapes, animated percentage rings, numeric/stat cards and bars, before/after line graphs, ranking reveals and timeline graphics. Statistics are literal narrated values or exact matching PokeAPI base stats. Conflicting narrated base stats are retained as narrated claims with a review warning. No competitive usage or win statistics are inferred from a Pokemon's base stats.
- Named subjects and numeric/ranking reveals use their original word cues. Genuine GIF frame animation is preserved. General images receive directional entrances rather than repeated universal zooms.
- Existing projects retain their saved layers/legacy renderer. New projects contain reaction metadata and editable layers. Manual Pokemon replacement/timing, selected templates and online visual replacement remain available. Export credits now include actually used assets rather than every cached library file.
- Optional Ollama direction receives the reaction metadata and known assets. Schema/timing/identity/chart-value checks reject unsupported numeric visuals and fall back to deterministic compositions. Core behavior requires no paid AI API.

## Actual acceptance exports

All five use Windows speech audio, real faster-whisper `tiny.en`, automatic planning/sourcing, and actual H.264/AAC 1080 x 1920 MP4 rendering:

| Case | Narration | Verified visual response |
|---|---|---|
| A | Mario is one of the most iconic characters in gaming. | Automatically downloaded Commons photo of a Mario statue, platformer graphic background, directional entrance, captions and attribution |
| B | Charizard is iconic, but Incineroar dominates VGC. | Two exact animated sprites, contrast/comparison layout, separate timed entrances, battle-inspired background |
| C | Regieleki has a base Speed of 200. | Regieleki sprite, actual 200 Speed matched against cached PokeAPI metadata, animated stat bar and callout |
| D | Fortnite takes second place, but Melee takes number one. | Explicit #2 Fortnite / #1 Melee ranking cards with timed reveals and leaderboard background; inappropriate online images were rejected |
| E | This player had a 70% win rate. | Animated 70% ring and stat labeling from the narration; no unnamed-player portrait invented |

Artifacts: `workspace/reaction-tests/A.mp4` through `E.mp4`, matching editable `.gaming.json` files and extracted `*-frame-*.png`; `evidence.json` records reactions and pixel-change checks. The **21.4-second combined** `combined.mp4` is generated from the concatenated narration through one fresh transcription/planning/export pipeline. Its five scenes automatically switch platformer -> battle -> analysis -> leaderboard -> analysis. `combined.gaming.json` can be reopened. `review.html` displays actual frames and videos.

Additional export: `workspace/reaction-line/line.mp4` renders the narrated 40% -> 70% change as an animated line graph. It uses only those two stated data points; it does not invent intervening measurements. The small Whisper model transcribes "win rate" as "when rate" in this extra fixture; raw caption correction remains a review task.

`workspace/pokemon-smoke/reaction-animation-proof.mp4` freezes all layout transforms while the original Charizard, Mega Charizard Y, Incineroar and Delibird GIFs keep animating. Corresponding `reaction-animation-verification.json` records source/form IDs and large actual pixel changes between sampled MP4 frames.

The desktop harness opened a visible Electron window, reopened all five reaction scenes, verified changing Pokemon canvas pixels during playback, displayed the percentage graph and checked the reaction inspector. Screenshots: `workspace/reaction-tests/desktop-comparison.png` and `desktop-percentage.png`.

## Reproduce

```text
npm test
npm run build
npm run smoke:reactions
npm run verify:reaction-sequence
npm run verify:reaction-animation
npm run check:reactions-desktop
npm run smoke:reaction-line
```

20 tests pass. Existing horizontal looping video/music export regression also runs via `node scripts/smoke-media.mjs`.

## Practical limits

The active free/local semantic path is an inspectable contextual rule engine plus entity catalog/local-library identities, not an unrestricted learned world model. It does not identify every arbitrary person/title automatically. Optional real Ollama generation and credentialed stock requests still need configured services. Cloud planning remains unimplemented. Long/implicit rankings, obscure names and pronouns require review; explicit positions are never replaced with invented rankings. Conservatively sourced Fortnite/Melee artwork was unavailable for Case D, so its real ranking graphics serve as the visual explanation. No stock filler or fabricated asset was substituted.

Scene layouts are materially different and actual rendered graphics have been inspected; this does not guarantee YouTube retention or professional editorial quality for every narration. Broader semantic recognition and additional reviewed template variants remain future improvements.
