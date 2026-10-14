# Editing Instructions and AI Changes

Implemented in the existing Electron editor. Enter **Editing Instructions** before Generate. After generation, **AI Changes** edits real scene layers; it does not re-transcribe narration or retrieve media. Use **Save** to persist instructions, edits and the last 30 revisions, including undo/redo patches.

## Instructions

The built-in instruction interpreter supports dark backgrounds, Pokemon battle accents, mention-timed character entrances, dramatic ranking reveals, small/minimal captions, restrained documentary motion, quick entrances/exits, no shake, and preferring images. Image preference chooses among confident relevant assets while retaining local-library priority and exact Pokemon sprites. Missing assets produce warnings instead of unrelated replacements. Instructions are also sent to the configured visual director. Unknown clauses produce a visible warning.

**Regenerate visuals with instructions** reuses the transcript and available assets, rebuilds the visual layers, and resets AI revision history. It intentionally replaces individual layer edits; the UI explains this. Use AI Changes for corrections that should preserve other edits. Narration duration is retained; quick transitions change visual entrance/exit duration rather than cutting spoken audio.

## Revision commands

Commands use explicit scene numbers, a timestamp (`At 0:08`), exact available asset names/forms, or an unambiguous image/sprite reference. Examples:

- `Make Charizard 30% bigger.` Base Charizard is distinct from Mega Charizard Y.
- `Change Scene 2's background to dark red.` Hex colors also work.
- `Change Scene 2's background to Mario.` Requires that exact asset in the project.
- `Remove the title in Scene 3.` Removes that title layer, preserving captions, sprites and stats.
- `Change the title in Scene 2 to Battle report.`
- `Move Charizard in Scene 1 to the left.` Explicit normalized coordinates: `x=0.1 y=0.3`.
- `Replace the image in Scene 3 with Mario.` Available assets only; import/download first.
- `Add Mario to Scene 3.`
- `Make the Pokemon appear earlier.` Shifts layer entrances earlier by 0.35 seconds, bounded by the scene. A seconds value can be specified.
- `Use a fade entrance for Charizard in Scene 1.`
- `Make the ranking reveal more dramatic.`
- `Make captions smaller throughout the video.` Also supports size in pixels, minimal, hide/show and hex accent color.
- `Reduce the amount of sound effects.` Sets SFX volume to 0.04. Explicit volume percentages are supported.

Multiple sentences, semicolons and coordinated commands can form one atomic revision. Multiple scenes can be addressed using `Scenes 1 and 2` or `Scenes 1 through 3`. Unknown/ambiguous elements, missing media, invalid operations, unsupported synthesis and no-op requests return errors rather than claiming success. Generic text removal removes scene text graphics above the credit area; captions are controlled separately.

With a model configured in **Online media / Settings → Visual director and AI Changes**, requests go to that Ollama server with project context and a structured operation/error schema. Every response passes operation and project validation, including target scope and exact form checks. Without a model, the UI identifies the built-in command interpreter. Model failure applies no changes. This installation has no running Ollama server, so model transport, malformed output and wrong-target behavior were tested using injected responses; live model quality is not verified. Commercial cloud-provider/authentication adapters are not implemented. A separately hosted Ollama server, including the user's desktop, can be configured by URL.

The schema follows [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs). Entrance timing uses [Remotion spring duration](https://www.remotion.dev/docs/spring). Ollama's managed Cloud currently does not support structured outputs; it is not an interchangeable endpoint for this adapter.

## Undo and persistence

Before committing a revision, field-level before/after patches are captured. Undo/redo restores those fields, preserves unrelated manual edits, and refuses to overwrite a conflicting manual change. Structural removal/addition captures the affected layer array. After saving/reopening, history remains available. A new revision after undo discards the abandoned redo branch. Media files are not copied by revision operations. The existing export pipeline renders the modified project; scene-level render caching is not implemented.

## Verification completed

- `npm test`: 34 passing tests, including all prior transcription/planning/Pokemon/media/visual tests plus instruction effects, exact-form targeting, timestamp edits, atomic operations, all operation families, persisted undo/redo, manual-edit conflicts, multiple requests, missing elements, model errors and unrelated/wrong-form output rejection.
- `npm run build`: TypeScript and production Vite build pass. Existing bundle-size and Remotion `use client` warnings remain non-fatal.
- `npm run verify:revisions`: actual generated Windows speech WAV → faster-whisper `tiny.en` → exact Charizard, Incineroar and Regieleki assets → instruction-conditioned scenes → Remotion/FFmpeg MP4s. Artifacts in `workspace/revision-tests`.
- Actual 1080×1920, 30 fps H.264/AAC videos: `baseline.mp4`, `instructed.mp4`, `revised.mp4`, `revised-live.mp4`. All pass the normal export validation. The narration is 10.073 seconds; container duration is 10.2 seconds.
- Decoded source-sprite bounds changed from 660×418 to 860×540 pixels for `Make Charizard 30% bigger`. This is approximately 1.3× in each dimension, measured in the actual MP4, not inferred from data alone.
- Scene 2 red-background pixels verified; Scene 3 title region changed while the sprite and verified Speed 200 graphics remained in its layer data and output.
- Diagnostic exports freeze layer transforms for reproducible measurements while preserving original GIF animation. `revised-live.mp4` enables all entrances/exits/chart animation. Its sprite region changes by 175,922 pixels across two sampled frames, verifying real animation in the MP4.
- Undo/redo, saved reopen and unsupported requests verified against project data.
- `npm run check:revisions-desktop`: visible Electron window and real React controls verified sprite CSS scale 1.3, dark-red preview background, 30px captions, title removal, undo/redo, save/reopen, errors and instruction regeneration. Screenshots and `desktop-verification.json` retained.

Open `workspace/revision-tests/review.html` for the exported videos and before/after frames. Open `revised-live.gaming.json` in the editor for the editable sample with full animation.
