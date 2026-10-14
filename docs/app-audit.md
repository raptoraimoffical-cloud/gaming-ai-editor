# Bug and performance audit — October 11, 2026

Update: Fresh whole remakes now replace old patch edits by default, per the subsequent request. See [fresh creative edits](fresh-creative-edits.md) for current behavior. The patch-preservation checks below describe the earlier audit and the explicit preservation option.

The audit covered generation, deterministic and trained AI Changes, partial and full remakes, preview playback, assets, captions, sound routing, save/recovery, Undo/Redo, and export. Existing user projects and reference recordings were kept intact. Diagnostic outputs are under `workspace/feature-audit`.

## Bugs fixed

- Full remakes dropped local patches and included their time-specific requests in the global brief. Reviewed patch frames and sound portions now survive a remake; new explicit edits take priority. Switching to a different game clears incompatible protected passages. Undo restores the prior state.
- Old performance snapshots could restore the previous composition during a fresh remake. Full rebuilding now clears these snapshots.
- Clipped gameplay changed its source trim and loop period. Videos and GIFs now retain their original media clock across patch and loop boundaries.
- Clipped animations faded early and changed their zoom/slide phase. Their original motion duration and exit time now survive clipping. An explicitly requested new entrance starts within the selected patch.
- Very fast consecutive patches could reuse timestamp-based layer IDs. Patch IDs now use UUIDs.
- Fully replaced layers and redundant visibility gates accumulated with repeated patches. They are compacted; required attachment anchors remain available.
- Export checked files belonging to entirely hidden retired layers, but missed some visible effect-result images. Preflight now checks the actual visible visuals and effect results.
- Media serving mishandled suffix ranges, empty files, HEAD requests, WebM types, and stream failures. These cases are handled, and special characters in asset IDs are encoded correctly.
- Applying a time-range edit through Apply Changes omitted detailed progress. Its progress now reaches the desktop job reporter.

## Speed improvements without reduced quality settings

- Explicit model-free diagnostics and deterministic object edits skip inference. Quick Draft now runs a fresh compact trained storyboard pass; it skips alternative-layout and rendered-review loops.
- Trained-model capabilities are cached by server, model name, and actual weight digest. Different weights or endpoints trigger new inspection.
- Audio identity checks coalesce requests for the same file and run at most four FFmpeg processes per preparation. A failure stops new work and waits for active checks to finish.
- Animated sprite dimension inspection reads the ten-byte GIF header instead of the entire file.
- Export and AI frame review omit editor history, unused assets and regeneration snapshots from rendering props. Saved projects keep this information.
- AI frame review reuses one Chromium instance and composition metadata per job. Every candidate still supplies its own props and is rendered at the original review resolution.

Model budgets, review counts, output resolution, frame rate, CRF, audio encoding, caption appearance and narration were preserved. No asset pack or user file was deleted.

## Verification

- `npm test`: 323 tests, including 13 new audit regressions.
- Python transcription timing: six tests passed.
- `npm run build`: passed; existing Remotion/Vite directive and bundle-size warnings remain.
- Desktop audit: 11 workflows passed. Additional real quick-patch controls and preview playback checks passed.
- The installed Qwen 3 8B editing model applied a selected 20% scale reduction, preserving narration, captions and the other scenes.
- Real source-project frames verified local-patch preservation after a full remake, unchanged caption/imagery pixels with reduced render props, and video/GIF continuity through loop boundaries.
- A diagnostic MP4 exported at 1080×1920 and passed FFprobe validation; attribution files were written.
- Dependency audit reported zero known vulnerabilities.

The checked project's serialized render props fell from 2,413,190 bytes to 501,986 bytes (79.2% smaller). This measures data transfer, not an equivalent reduction in encoding time. A cached Fast visual remake of the 87-second reference project took about 4.5 seconds; transcription, downloads and trained-model work have separate costs.

Live Google Images was not exercised because no provider-settings file was present. Hosted inference was not exercised. Their transport, validation, cancellation and error cases remain covered by automated tests. The audit cannot establish that every possible edit request is bug-free.

Re-run the main diagnostics with:

```powershell
npm test
npm run build
node scripts/audit-desktop.mjs
node scripts/verify-app-audit.mjs
node scripts/verify-review-renderer.mjs
node scripts/verify-trained-audit.mjs
node scripts/launch.mjs scripts/check-quick-patch-desktop.cjs
node scripts/launch.mjs scripts/check-preview-playback.cjs workspace/context-check/updated-short.gaming.json
.runtime\venv\Scripts\python.exe python\test_transcription_timing.py
```

Run diagnostics using `workspace/move-effects-check/backend` sequentially, since they share its asset database.
