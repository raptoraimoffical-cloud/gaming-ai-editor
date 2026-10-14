# Comparison with all five supplied Shorts

Compared the five original MP4s in Downloads with the editor's previous real move-effects export on October 11, 2026. New opening/middle/end contact sheets and input details are under `workspace/reference-comparison`; earlier full contact sheets and transcripts remain under `workspace/reference-gold` and `workspace/reference-setup`. The reference narration and on-screen text were treated as examples, not instructions.

| Example | Useful visual behavior | Adjustment in the editor |
| --- | --- | --- |
| Diabolical Pokémon Strategy | An illustrated hook, named logos/numbers, supporting characters and ability/move evidence, then a long gameplay demonstration. | Preserve the lead while named threats join it. Use real supporting images and keep gameplay/evidence readable rather than restarting entrances at sentence cuts. |
| Pokémon Champions | A phone/logo hook, then a main Pokémon with a growing supporting team; evolution, item UI, numbers and a clock illustrate particular claims. | Give the lead more space than supporting team members, arrange supports separately and reveal them at their spoken cues. Keep existing item, number and gameplay functionality. |
| Charizard's Villain Arc | A stable lead and setting, with threats, weather and team members building around it; the reversal changes the tone. | Keep named counters beside the established hero, carry backgrounds through connecting speech, and retain purposeful weather/action changes. |
| Mega Sceptile setup | Battle evidence alternates with large artwork and concise sourced mechanic panels. | A performed move uses a compact title, leaving space for the character and attack. A narrated accuracy, power, ability or stat explanation still keeps its full evidence panel. |
| Pokémon That Look Worse When They Evolve | Large clean artwork, short entrances, soft scenery and deliberate comparison holds. | Increase artwork size during simple attack spans, keep continuous camera paths and retain the artwork preset's distinct comparison/scenery behavior. |

The examples differ in density and use of gameplay. The common rule is a clear subject with relevant supporting changes. They do not justify random picture replacement on a strict timer. Downloaded mixed audio does not provide isolated sound-effect stems or viewer-retention measurements.

## What changed

`reference-finish.mjs` runs in the actual generation/remake presentation pipeline for all three Pokémon reference styles. It adjusts editable artwork/card framing, gives larger ensembles a lead and distinct supports, and adds a subtle grounding shadow. It does not create unspoken Pokémon, numbers or stock footage. Existing manual objects, framed assets, authored battles, gameplay and chart evidence are protected by this finishing pass.

A touching span of the same subject at the same framing inherits its previous camera path and does not trigger another entrance pop. Named counters/threats directed at the established subject join its cast; an unrelated new example changes the lead. Game patterns hold their topic during connecting speech and change when a new topic/subject is introduced. Actual attack sounds and useful transitions still play.

The compact move label retains the original source metadata. It hides the unspoken power/accuracy/body text during a simple performed attack; it does not delete those facts or replace a real explanation with a title.

## Captions

This change does not alter the caption renderer or default palette. Use **AI Changes → Match examples - keep captions** for an existing edit. The button performs a real remake, retaining the current reference preset (or using the layered preset if none is selected), and restores the original project/scene caption settings and each displayed word after all model, style and finishing stages. Caption text, timing, font size, position, colors and enabled state are preserved. Undo/Redo includes the result.

Other existing preset buttons retain their existing behavior. A remake request explicitly saying “don't change captions” also enables caption preservation. Match examples honors its caption-preserving behavior even if a reference preset has different caption defaults.

## Verification

- All **250 tests** and the production build passed. Coverage includes lead/support planning, exact spoken reveals, attack-versus-explanation cards, continuous camera/no repeated entrance cue, idempotence, manual protection, background continuity and caption-preserving rebuild/Undo.
- `node scripts/verify-reference-finish.mjs` runs the real backend on the previously rendered speech/artwork project, performs the remake, checks unchanged captions/narration and an unchanged input, verifies Undo/Redo, renders a new MP4 and extracts matching before/after frames. The extracted hook, attack and continuation frames were visually inspected.
- `node scripts/launch.mjs scripts/check-reference-finish-desktop.cjs` clicks the actual new button and compares visible caption text and computed appearance before/after. It checks the compact move in preview and Undo/Redo. This passed with deliberately nondefault caption size/position.
- `node scripts/verify-reference-ensemble.mjs` passed with real diagnostic narration: Charizard remains the lead when Rotom and Glaceon are named as threats. The three-character composition and narrated 45% → 12% comparison were rendered and visually inspected. An initial synthetic-voice run misheard Pikachu as separate syllables; the final diagnostic uses the clearly transcribed Rotom/Glaceon narration. This verification does not claim perfect speech recognition.

The exported comparison is `workspace/reference-comparison/matched-examples.mp4`. These are diagnostic edits, not claims of matching the creators' complete production quality. Suitable user footage, alternate poses and specific sourced images remain necessary where the narration calls for them. Reference footage is not inserted into generated videos.
