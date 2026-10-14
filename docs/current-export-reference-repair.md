# Repairing the actual empty export

The supplied `Current ai exsample.mp4` is 43.97 seconds at 30 FPS. Inspection of the complete export confirmed an opening dominated by logos on a flat red background, no Eric photo, no full build at the pause cue, small isolated later characters, and weak visual continuity. The references instead coordinate a continuing cast, changing evidence/props, moving environments, meaningful interactions, and audio timed to those events. Contact sheets of the export and all three references are in `workspace/current-short-comparison`.

## Cause and repair

The user confirmed that the master guide was pasted into **5. Editing instructions → Script ? optional**. Generation previously used that field for transcript alignment and only took visual directions from the separate Editing Instructions field. Consequently the full scene plan, person request, and supplied builds could fail to enter the visual instruction pipeline.

`creation-brief.mjs` now recognizes a combined guide in either field. It extracts the quoted narration and keeps the production directions as the active visual brief. Ordinary spoken-only scripts stay spoken scripts; separate custom directions remain intact. Narration, Voiceover, and Script headings are supported, and scene-only guides use the recording's existing transcript rather than aligning visual directions as speech. This is a general input repair; Eric, his team, and this story were not added to the default brief.

Generation records where it found the guide and how many scene instructions and team members it parsed. The UI explains this in Pipeline evidence. The Script placeholder now describes the accepted combined-guide format.

The delivered timeline receives an independent check for the requested person's visible photo, complete concurrent team/items/facts, executed scene passages, missing sources, and prolonged logo-only stretches. Downloaded but excluded or microscopic photos do not count as delivered. Genuine numeric graphics are recognized as meaningful visuals. These findings appear in the generation report and pipeline warnings rather than a missing request being described as successfully applied.

## Rendered quality fixes

- Existing source-based scene construction now receives the actual directions: immediate Champions imagery and player counter, anonymous-player anticipation, Eric at his spoken name, the record reveal, organized team/held-item entrances, the pauseable build, three separate Fake Out demonstrations, redirection, allied Tailwind, Nasty Plot, coin attacks on two opponents, and a recap.
- Published mechanic images retain the complete Effects section and the publisher's move-target summary. Target crops use text glyph bounds so a wide blank margin does not shrink the useful text. Real Google/game description images remain preferred when available; the published-page capture is a fallback. The [Make It Rain publisher page](https://pokemondb.net/move/make-it-rain) places its targeting information in a separate section, which the earlier crop omitted.
- Reviewing the encoded MP4 exposed a build-sheet wrap: “No Guard” overflowed into the nature row. Instruction text now measures its rendered Arial width, fits its assigned box, and stays on its authored row. Width measurements are cached across frames. This also keeps long item names on one line. Captions use their existing renderer.

## Verification and limits

A native fresh generation used the original `1012 (1).MP3`, with the master-style fixture deliberately submitted through Script. The fixture retains all twelve requested scene passages and all six complete builds. It is a regression fixture condensed from the user's longer guide, not a raw-video training exercise.

The result contains all twelve scene passages, Eric's identified source photo, all six correct forms and items, exact supplied build data, **22 distinct visible foreground source images**, 69 audio cues including 25 recorded Pokémon cries, and no long logo-only intervals. The legacy diagnostic's raw image-layer count is 23 because it also counts an effect sheet; the independent delivery report excludes effect sheets and shadows.

The original recording's hash remained unchanged. Its incomplete final sentence remains incomplete and flagged. Constructed battles are illustrations, not claims of actual Eric match footage. Source downloads and original files may be cached; this generation made a new timeline and did not save a project.

The complete export is `workspace/current-short-verified/verified-blueprint-short.mp4`, 1080×1920 at 60 FPS. Composition previews and finished-export frames were inspected, including the opening, named photo, build hold, and attack sequences. A standalone 2160×3840 build PNG was also generated from the supplied data.

590 core tests, the production build, and twelve desktop workflows passed. The new desktop test pastes the guide into the actual Script textarea, checks that the scene/team directions reach generation, verifies recognition evidence, and measures long instruction text to ensure it fits without wrapping into another row.

The isolated diagnostic used cached originals and live publisher/native sources, with no fresh SerpApi search. The reference footage, music, and creator's likeness were not inserted into this edit. These checks demonstrate the repaired behavior; they do not establish equal creativity to every reference scene or measured viewer retention.

Re-run the targeted checks with:

```powershell
npm test
npm run build
node scripts/launch.mjs scripts/check-combined-guide-desktop.cjs
$env:BLUEPRINT_GUIDE_IN_SCRIPT='1'
$env:BLUEPRINT_CHECK_FOLDER='workspace/current-short-verified'
node scripts/verify-blueprint-short.mjs
```
