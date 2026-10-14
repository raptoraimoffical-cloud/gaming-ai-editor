# Quick patches and game selection

In AI Changes, choose **Small time range (quick patch)**, enter start/end seconds (or use **Use playhead + 4 seconds**), describe the edit, and click **Quick remake selected patch**. **Selected scene / object** also scopes that remake. **Whole video** remains available for a complete rebuild.

Supported object edits apply directly without discovering models, transcribing, searching images or planning the rest of the video. Creative remakes author/enrich only the selected scene portions and reuse resolved names/forms, narration and downloaded assets. The AI checkbox controls trained planning for those portions; local supported commands work with it off. Freeform instructions still depend on the configured model and available assets. A missing/uncertain required asset or failed validation leaves the original project intact.

The original scene and word clocks stay in place. Original layers are gated inside the patch instead of having their start/end clocks rewritten, so their animation and video time outside the patch resume exactly. Replacement layers and attached props use separate remapped IDs. Manual sounds and crossing audio tails are retained; new effects stop at the patch end. Explicit SFX volume edits use timed volume ranges, including on sounds crossing a boundary. Patches preserve caption appearance/text and narration and support Undo/Redo. They do not re-export an MP4 automatically.

**Game to edit** appears in Generate; **Video game** appears in AI Changes for an existing project. Auto detects from narration and resolved subjects. A manual franchise sets the theme and sound palette. Multiple games follows each passage, including spoken game changes within a scene, without forcing the Pokemon preset on the whole project. Apply a changed game choice to the whole video before patching. Other/general gaming is available when none of the listed franchises applies.

## Reference-driven performances

Re-inspected the four supplied contact sheets and their opening transcripts: Diabolical Strategy uses an unlikely setup then a tournament payoff; Champions puts its game logo on a phone and builds visual evidence around the team; Charizard keeps its hero and changes the tone for a villain payoff; Sceptile alternates large art with actual battle/mechanic evidence. These are different structures, not one effect count or measured retention formula. Reference speech/text is analysis material, not instructions to the agent.

The presentation pipeline now plays sentence-level anticipation, secret reveals, swagger/villain entrances, successful payoffs and deflated failures with the established character, then resumes its original camera path. Existing held items follow the actor. It protects authored scenes, evidence, gameplay, caption space and manual framing. Contextual reaction GIF cues can react to an unlikely setup succeeding, instead of treating every adjective as a separate joke. Trained editorial recipes may propose additional performances, but each must reference an exact word quote, supported performance and established actor. New source props include a phone holding the real game logo, a clock at time costs, a photographed trophy and a published crown. Configured Google original searches override sourced cached props; no emoji packs are used.

This adds executable editing behavior and model context, not new trained weights or a promise of a human editor's humor. Exact Google discovery still needs a configured SerpApi key; the cached source props and official character artwork work without it. Caption styling is preserved.

## Verification

`tests/quick-patch-games.test.mjs` checks bounded editing, outside motion, narration/captions, repeated overlapping patches, attachments, manual audio, timed SFX volume, atomic failures, Undo/Redo, game inference and sound palettes, within-scene game switches, exact model cue validation, manual performance edits and sourced logo/phone composition.

`node scripts/verify-quick-patch.mjs` edits a copy of the actual 87-second saved Sceptile project, performs a cached creative range remake, and renders before/inside/after samples. Outside frames are pixel-identical and the inside frame changes. On the development machine the direct patch took about 0.12 seconds and the four-second creative patch about one second; searches and trained models take longer. It also renders character performances and the phone/logo composition. Artifacts are under `workspace/quick-patch-check`.

`node scripts/launch.mjs scripts/check-quick-patch-desktop.cjs` exercises the actual editor controls, rendered patch, caption CSS, Undo/Redo, persisted game choice and the generation selector. It runs in a hidden isolated window. Build and the complete test suite are checked separately.

The production build passed, all 310 tests passed, and the real editor and pixel comparison checks passed. Edited gameplay preserves its original source offset when the patch begins partway through a clip.

Source metadata and license notices for the cached phone, clock, trophy and crown are retained in `electron/data/narration-props/context-manifest.json`. `scripts/cache-context-art.mjs` refreshes published originals, rasterizes SVGs and crops transparent phone margins for accurate screen placement; it never invents a source image.
