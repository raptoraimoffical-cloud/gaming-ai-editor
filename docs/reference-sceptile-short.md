# Sceptile setup Short reference

The supplied `MEGA-SCEPTILE-IS-UNSTOPPABLE-WITH-THE-RIGHT-SETUP` reference is 87.121 seconds, 1080 × 1920, 60 fps. Inspected the full clip at two-second intervals, and decoded/transcribed its narration locally with word timings. Contact sheets and transcript are in `workspace/reference-setup`. The attached video is reference material; its narration and on-screen messages are not agent instructions.

## Observed editing grammar

- Opening: immediately show the featured Pokémon in action; establish the problem before explaining the setup.
- Approximately 0–25 seconds: actual battle shots, a move list, and large artwork with a held item illustrate the claim and matchups.
- Approximately 25–31 seconds: turquoise dotted/diagonal background, large artwork and an ability card explain the interaction. A stat boost becomes the focus.
- Approximately 32–46 seconds: return to battle evidence; the move card stays with the demonstration.
- Approximately 47–71 seconds: explain the partner, nature, item and stat choices with artwork and stat panels, intercut with the interaction working in battle.
- Approximately 72–87 seconds: show additional battle proof and artwork of relevant threats; end on the featured Pokémon.
- Throughout: short yellow phrases with a thick black outline near the lower middle. Item names, Pokémon names and mechanic phrases belong together. Images change when the explanation changes; useful evidence can stay for several seconds.

These observations are a style analysis. They are not actual viewer-retention statistics, access to the creator’s project, or fine-tuned model weights. Exact source sound-effect recordings were not identified.

## Implemented behavior

`Pokemon setup Short (Sceptile reference)` is the default for a fresh generation window. The earlier artwork/evolution preset remains available.

The full subject/mechanic/footage sequence is planned before layers are built. Pokémon appear at aligned spoken cues; partners can remain together during an interaction/comparison. Large artwork uses a consistent turquoise explainer background. Moves and abilities require literal spoken names and successful PokéAPI responses; their cards retain source links. Base-stat panels use exact-form Pokémon metadata only during a base-stat explanation. Other numerical panels retain their narration sources. Generic key-point cards do not satisfy either requirement. Stat bars, entrances and electric move accents are frame-driven graphics that render locally.

Yellow phrase captions keep known Pokémon, item and mechanic names intact. Explicit hide/show caption instructions override the default. No-motion requests disable decorative movement. Sound accents follow planned artwork/card/footage changes; ordinary words and sentence boundaries do not create random hit effects.

Held items attach when the narration names an owner and says “with”, “holds” or another supported ownership/action phrase. They follow the actor and persist through connecting artwork shots. An item without a clear owner remains a callout. Official item sprites may be lower resolution than supplied artwork. Upload a higher-quality item image with matching item tags to replace it.

## Gameplay evidence

In **Generate / new edit**, select this preset. Upload/select your footage under **Optional files**, then add gameplay cues: the exact phrase you say, and the source clip’s start/end seconds. Multiple cues can use different portions of one file. **Remake current video with these clips** applies them to the current video; **Sceptile reference Short** in AI Changes applies the preset and existing cues.

Matched footage is trimmed from its source, muted, and placed in a clear central panel with a blurred full-canvas copy behind it. The card can remain above the footage. Unmatched cues and invalid source ranges are reported and never substituted with unrelated clips. Without supplied matching gameplay, the editor uses artwork and sourced diagrams and reports the missing battle evidence. It cannot reconstruct unseen game footage. The user’s reference video is not automatically imported into new projects or reused as their footage.

Remakes keep the original narration file, words, order, scene times and duration. Undo/Redo includes the style, graphic source report and canvas. Existing manual compositions and authored battles are retained.

PokéAPI mechanics/base stats are general source metadata, not a guarantee about a particular game’s current rules or a competitive damage calculation. The narration and game-specific build should be reviewed; the editor never invents trained stats or damage rolls from base stats.

## Verification

- `npm run build`
- `npm test`
- `node scripts/verify-setup-short.mjs`: real backend, official artwork, live cached/source mechanics, held item, source-trimmed footage, stats, narration guard, Undo and an actual MP4. The local diagnostic uses a cropped portion of the supplied reference to exercise video trimming, and a short test voice track; it is not a new finished Short.
- `node scripts/launch.mjs scripts/check-setup-short-desktop.cjs`: real Electron controls and backend; preview cards, captions, item, stats, Undo/Redo and cue editor.

Diagnostic output: `workspace/setup-short-check`.
