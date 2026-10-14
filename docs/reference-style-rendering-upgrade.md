# Reference-driven rendering upgrade

The reference was `C:\Users\Eli\Downloads\This-Move-Changes-SnapYT.App (1).mp4`: approximately 149 seconds, 360 × 640, 30 FPS. Six contact sheets sampled the whole clip every 1.25 seconds, with closer inspection of its explanations and transitions. Its footage was inspected as a style reference and was not inserted into the generated Eric Rios edit.

## What the reference does well

- Large subjects, source description panels and stat diagrams share an intentional composition. The viewer can identify the subject immediately.
- A visible, slowly moving Pokémon pattern provides continuity while the foreground changes.
- Positions and effects explain mechanics: order changes, reversals, roster reveals and impacts have meaning in the narration.
- The edit changes the visual treatment when the argument changes, rather than applying the same entrance repeatedly.
- Gameplay, diagrams and character artwork serve different explanations. Pauses hold useful information; effects emphasize the payoff.

## Implemented changes

`reference-stage.mjs` and `ReferenceSet.tsx` add a visible, slowly moving Pokémon set with narration-related palettes. Uploaded, generated and manually placed backgrounds are protected. Disabling game patterns restores the original background. Caption settings and words are unchanged.

`artwork-framing.mjs` removes transparent padding from automatically composed blueprint characters, retaining original pixels and converting attachment coordinates. Larger foreground layouts now use the visible artwork instead of giving most of the box to transparent margins. Manually placed artwork is preserved.

`scene-action-motion.mjs`, `blueprint-scenes.mjs` and `BlueprintEffect.tsx` coordinate anticipation, acceleration, contact, recoil and recovery. Effects follow fitted actor coordinates rather than fixed screen locations. Redirection follows the target and protector, wind affects the allied side, and real coin icons travel toward both opponents. Impact sounds share the animation's contact timing. Owner removal or hiding removes its effect.

Published move and ability screenshots retain their original pixels. `SourceEvidence.tsx` frames the title and first complete Effects paragraph, omitting page navigation. The full original screenshot and description remain available. The blueprint layouts keep labels outside the source panel and move held items away from the opposing actor.

`source-move-cards.mjs` now searches for in-game Google Images descriptions before accepting a cached website fallback, when Google and visual verification are available. A fallback cached in an earlier run can no longer block that search. This behavior was tested with a controlled provider; the isolated native run did not have a Google API key and used actual published-page captures. No live Google API success is claimed.

These changes alter rendering, layout and asset selection. They do not train model weights or add episode-specific examples to the default editing instructions.

## Verification

- Application production build passed.
- Full test suite: 565 passed, 0 failed.
- A fresh native generation using the original `1012 (1).MP3` completed all 12 supplied storyboard scenes.
- Full export: 1080 × 1920, 60 FPS, approximately 43.95 seconds.
- 22 distinct foreground source pictures, 69 sound cues, including 25 Pokémon cries. Cropped derivatives are counted as their original source, not extra pictures.
- Original recording hash unchanged; no authored project saved automatically.
- Inspected composition stills and decoded frames from the exported MP4. Corrected a move-label overlap and an item overlapping the opponent before the final export.

Output: `workspace/reference-style-final/verified-blueprint-short.mp4`.

This is a concrete improvement for the supplied storyboard and shared Pokémon presentation pipeline. The reference also uses genuine gameplay and presenter footage; the illustrative battle sequences do not reproduce that footage or establish that every future generated edit will match a human editor's quality. The test recording still ends mid-sentence, as supplied.
