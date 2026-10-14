# Audit and local reference training — October 13, 2026

This audit checked generation, AI Changes, asset ingestion, layout review, animation bindings, preview, save/recovery, desktop controls, and export. It adds eleven regression tests. It does not establish that every possible request or third-party service is bug-free.

## Fixed behavior

- AI layout responses no longer fail solely because a scene has fewer than four or more than sixty layers. The supplied layer identities, content, and timing remain protected.
- Temporary opponents and supporting pictures may leave before a scene ends. An obsolete validator required Pokémon to remain through the entire scene and rejected otherwise valid edits.
- Geometry-only model responses retain attachments, source-image metadata, effects, roles, and other authored properties. Previously the response could replace those properties with an incomplete object.
- Resizing a keyframed image updates its animated dimensions when the model retains the existing animation. Previously its old width/height keyframes could override the requested resize.
- Supplied build-sheet numbers remain intact during layout changes. Existing supplied text is not treated as an invented statistic just because it is absent from the spoken words.
- Text readability review uses an explicit font size when supplied. Its correction can edit that font size.
- Missing-image requests again offer a working upload-and-resume control. The existing request is completed after upload.
- Common sentence words such as “won” and “who” do not become named-person searches.
- Sprite sheets are excluded from character silhouette measurement; a sheet of animation frames is not one oversized character.
- Pipeline counts distinguish original source pictures from their framed variants and scene splits. Effects do not inflate the picture count. Hosted inference is labeled correctly.
- Desktop checks now wait for the editor to mount and use the current controls. The production check starts with a fresh isolated workspace and verifies that automatic project saving and recovery stay disabled. A previous fixture could pass by reopening an old diagnostic autosave.

## Reduced waste and measured results

Local inference now respects the configured idle retention across planning and vision calls. The default is 120 seconds; explicit zero still unloads immediately. It keeps the same model, context, image resolution, and review budget.

Four real requests to the installed Qwen 3.5 2B model measured 6.95 and 7.94 seconds with unloading, 7.51 seconds for the next cold retained request, and 0.139 seconds for the subsequent warm request. This small-request measurement demonstrates avoided loading overhead, not an equivalent speedup for a complete video.

Visual planning omits revision snapshots, obsolete scene data, raw SVG payloads, and unused media while retaining instructions, timing, entities, source flags, caption placement, and relevant geometry. In the representative 17-scene project, serialized scene input fell from 481,673 to 59,690 bytes, an 87.6% reduction. The complete compact request was 69,130 bytes.

Media and actor lookups use an index of the current array, without caching animation values. Seven benchmark samples of 300,000 lookups on the project's 76 media entries gave medians of 114.49 ms for `Array.find` and 23.22 ms for indexed lookup, about 4.9× faster. All 489 sampled attachment calculations matched the uncached implementation exactly. This measures lookup cost, not encoding speed.

Artwork metadata writes are batched in one transaction and database export per batch. Identical records and unchanged asset-pack indexing cause no export. Database replacement uses a temporary file and atomic rename. Presentation finishing reuses one library snapshot. Hosted requests respect the caller's output budget.

No output resolution, frame rate, CRF, narration, caption appearance, configured review budget, model size, or source-asset quality was reduced. User assets, models, saved projects, and exports were retained. Downloaded raw assets remain reusable; generated video plans are not cached by voiceover.

## What was actually trained

`python/train_reference_style.py` trains a small local TF-IDF scene classifier and pairwise editorial preference model using NumPy. The installed weights are approximately 154 KB. Training uses curated general annotations and paraphrases of the supplied reference editing patterns and requested behavior, with species and people represented as placeholders.

It chooses among battle demonstrations, general move explanations, stat setups, partnerships, named people, rankings, weather, team reveals, and neutral storytelling. Quick Draft and narration planning receive these learned hints. Layout review uses the learned preference score only after structural errors, findings, and warnings have been compared. Factual guards prevent a battle hint from inventing an attacker or opponent.

The classifier trained on 108 sentences. A separate development set informed feature selection. The final 27-sentence test scored 26/27 (96.3%). The preference model trained on 90 controlled composition comparisons and scored 30/30 on held-out controlled comparisons. One final classifier error remains recorded: “these pokemon have access to move” was classified as a partnership rather than a general move explanation.

These are small curated benchmarks. The preference examples are controlled feature comparisons, not human ratings of finished videos. They do not measure viewer retention, broad creativity, or equivalence to Wolfey's edits. **The existing large language models were not fine-tuned, and raw reference-video pixels were not used for weight training.** Their current weights still perform the broader editing and planning work. No episode-specific instructions were added to the default brief.

Training provenance, examples, evaluation, and weights are in `electron/data/reference-style-training.json` and `electron/data/reference-style-model.json`. Activation requires at least 85% scene-choice accuracy and 95% controlled-preference accuracy; failed evaluation leaves the installed weights unchanged.

## Verification

- 584 Node tests passed, including eleven new audit regressions.
- Six Python transcription-timing tests passed.
- TypeScript and production build passed. Existing bundle-size and Remotion module warnings remain.
- All eleven desktop workflows passed, including AI Changes updating the actual preview, asset upload/resume, progress, formats, settings, and production no-autosave checks.
- Dependency audit reported zero known vulnerabilities.
- The installed Qwen 3 8B model applied a selected 20% scale reduction through the AI Changes backend in 55.72 seconds, preserving captions, narration, and other scenes.
- A separate native layout test resized an animated character, preserved its intentionally temporary visibility and captions, produced visibly different rendered frames, and exported a four-second diagnostic at 1080×1920 / 60 FPS. This is a diagnostic, not a finished reference-quality Short.
- Live Google Images and hosted-provider inference were not exercised in this tooling session. Their existing integrations were preserved; automated transport and failure checks passed.

Artifacts: `workspace/audit-training/native-verification.json`, `performance-benchmark.json`, `training-report.json`, and `verified-ai-edit.mp4`; `workspace/feature-audit/desktop.json` and `trained.json`; final test/build logs in `workspace/code-red-check`.

Re-run with:

```powershell
npm test
npm run build
node scripts/audit-desktop.mjs
.runtime\venv\Scripts\python.exe python/train_reference_style.py
node scripts/benchmark-audit.mjs
node scripts/verify-audit-model.mjs
node scripts/verify-trained-audit.mjs
```

Native model diagnostics should run while the editor is idle because they use its installed local inference server.
