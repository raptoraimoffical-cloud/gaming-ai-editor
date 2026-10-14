# AI Changes asset retrieval — implemented and verified

Verified October 9, 2026 in the Windows Electron application, using its production React panel, preload bridge, shared backend, SQLite asset library, Remotion player, and MP4 renderer.

## What changed

- AI Changes now checks project media and the indexed asset library, then the existing permitted-catalog / Wikimedia Commons / configured Pexels and Pixabay adapters. It uses the existing provider downloader and cache, not a second downloader.
- Mario queries include **Super Mario / Nintendo character** context. A photograph of a person merely named Mario is rejected. Character images favor transparency and useful dimensions. Pokémon remain exact-form assets.
- Assets with trustworthy declared identity can be imported automatically. Provider descriptions alone are not treated as visual recognition. Uncertain character depictions require an explicit image review.
- Missing or uncertain assets produce a persisted `pendingRevision` containing the original request, scope, search queries, provider errors, rejected matches, and permitted review candidates. The existing edit remains usable.
- The panel offers candidate approval, existing-library selection, upload with declared rights, retry, and cancellation. Selecting an asset resumes the original request and animation automatically. Network/download errors retain the pending request and show readable recovery messages.
- Downloaded and uploaded assets are registered in the same SQLite library used for initial generation. Cached Pokémon assets and original generated media are also registered there.
- Successful revisions and pending requests receive recovery snapshots under `workspace/autosaves`. Once a project has been opened or saved, revision results also update that project file. Manual Save/Open remain available.
- Export retains source/license sidecars and includes source credits for the inserted provider image. Requests can target a selected scene, layer, or explicit timestamp. Undo retains downloaded media and restores scene edits.

The editing interface now has a resizable real Remotion preview, scene/library sidebar, AI Changes inspector, properties, asset selection, and a multitrack timeline. Layer timing can be moved/trimmed; narration timing stays locked. The existing Pokémon, online-provider, reference-analysis, template, and advanced layer controls remain available. Thirteen motion choices include fade, slide, spring pop, reveal, zoom, parallax, emphasis, ranking, comparison, reposition, and background motion; they execute per frame in preview and export.

## Real missing-Mario test

`scripts/check-asset-revisions-desktop.cjs` opens a **visible Electron window** with a project and fresh library containing no Mario asset. In the real AI Changes panel it submits:

> Add Mario with a slide-in animation.

The live Commons search returned `Supermario Kungsbacka.jpg`, a statue photograph attributed to **Stefan Linder / CC BY-SA 3.0**. It was shown as a review candidate, not silently accepted as transparent character artwork. The test saves and reopens the pending request, explicitly approves the image, imports it through the existing downloader into the shared SQLite library, and resumes the original slide-in. The approved candidate?s subject identity is retained so another scene can reuse it automatically without a provider call. It then saves/reopens, verifies the loaded image and actual preview movement, tests Undo/Redo, and exports the complete video. Other scenes remain unchanged.

Evidence:

- `workspace/revision-assets-tests/desktop-verification.json`
- `workspace/revision-assets-tests/desktop-pending.png`
- `workspace/revision-assets-tests/desktop-resumed.png`
- `workspace/revision-assets-tests/desktop-saved.gaming.json`
- **`workspace/revision-assets-tests/mario-slide-in.mp4`** and its attribution files

`python/verify_revision_export.py` decodes the actual MP4 and matches a distinctive region against the actual downloaded image. The image moves **187 encoded-video pixels** between frames 8 and 30. Opaque frames 30 and 54 match the cached source at approximately **0.99 normalized correlation**. This verifies rendered pixels, rather than only changed project properties.

## No-candidate upload recovery test

`scripts/check-asset-upload-desktop.cjs` exercises the same real Electron panel with deliberately empty provider responses. It confirms that the request remains pending and survives Save/Open, then uses **Upload image & resume**. Only the native file picker is replaced with an explicitly selected licensed fixture path; the actual import, SQLite registration, original-request resumption, animation, preview, and reopening use the real application backend. See `workspace/revision-assets-tests/upload-fallback/verification.json`.

## Other verification

- `npm test`: **57 tests pass**, including existing Pokémon/forms, animation, sourcing, narration reactions, revisions and visual composition tests, plus new missing-asset, wrong-Mario, resume, shared-library, combined-command, timed-entrance, and undo regressions.
- `npm run build`: TypeScript and production Vite build pass.
- `npm start`: the actual main-process window was captured and verified **visible=true, minimized=false**, with the preload bridge loaded. Evidence: `workspace/startup-verification.json` and `workspace/startup-window.png`.
- Selective scene regeneration was checked against an existing Minecraft project: the requested chicken scene changes, unrelated scenes and narration remain intact, and Undo restores the serialized scenes. A shared-keyframe aliasing bug found during this check was fixed.
- The actual revision backend resolved ?Mega Charizard Y? to exact Pok?API form **10035**, retained its animated source, and registered it in the shared SQLite library. Ambiguous Mega and misleading alternate-form metadata are covered by tests.
- Actual voice-to-video regression generated and exported the same comparison/statistic narration in Fast, Balanced, and High modes. The independent Pokémon base-speed statistic remains verified at 200. Outputs are in `workspace/editor-rebuild-tests/modes/`.

## Configuration and limits

Wikimedia Commons needs no key. Pexels/Pixabay need optional keys in Settings; their existing encrypted credential storage remains in use. A permitted catalog can declare subject/franchise identity, source, author, dimensions and reuse license. Provider metadata does not establish blanket rights to every underlying copyrighted character. Search quality and permitted source availability still determine whether a usable image exists.

This laptop reports an RTX 3050 Laptop GPU with **4096 MB VRAM**, approximately 32 GB system RAM, and no reachable Ollama model server. No large model weights or paid services were used. Fast/Balanced use different candidate budgets; High additionally renders real frame samples and audits source/geometry, with its lack of semantic vision disclosed. Three real regression exports took approximately **26.6 / 26.6 / 31.4 seconds** including generation and export. They do not establish improved subjective quality in the absence of installed reasoning/vision models.

Ultra explicitly reports that installed reasoning and vision models are required, rather than pretending to run. Optional local-model planning/vision calls, model discovery, model-role selection, remote Ollama URL configuration and unload requests are implemented; they were not tested against installed models on this machine. A subsequent continuation implemented bounded iterative review/correction, alternative layout comparison, and an optional configured local background provider. See RESUMED-WORK-VERIFICATION.md for current behavior, real tests, and the installed-model verification limits. Unknown subjects remain pending for an explicitly confirmed asset rather than receiving unrelated stock media.

## Reproduce

```powershell
npm run build
npm test
npm run check:asset-revisions-desktop
npm run verify:revision-export
npm run check:asset-upload-desktop
npm run verify:editor-modes
npm start
```

Tests use separate workspaces. No dawn-cut files, existing Pokémon asset folders, or user source media were deleted or modified. The pre-change checkpoint is commit `e365b99`.
