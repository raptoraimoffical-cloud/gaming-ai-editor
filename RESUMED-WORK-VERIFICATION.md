# Work resumed after the credit limit

Resumed in the existing Gaming AI Editor on October 9, 2026. The earlier editor rebuild and missing-asset revision workflow remain intact. No dawn-cut files, user gameplay, downloaded sprites, or existing projects were deleted.

## Implemented in this continuation

- High/Ultra now propose distinct layout alternatives using the configured planning model. They compare validated geometry findings, and compare actual rendered candidate frames when an image-capable review model is available. An unchanged or unsuccessful proposal does not displace the existing valid plan.
- Frame review samples three timestamps per reviewed scene. It records actual PNGs and structured vision findings when configured. Geometry findings are explicit proxies, not aesthetic quality scores or visual identity verification.
- A bounded correction loop changes supported geometry/motion only, rerenders the affected scene, and accepts a correction only if defects decrease without introducing new validated defects. Failed or inconclusive vision reinspection retains the earlier scene. Correct scenes stop consuming revision passes.
- Exact media IDs, layer content, SVGs, chart values, original narration intervals, Pokémon forms, and manual layers are protected from model rewrites. Untouched scene/storyboard objects remain intact.
- High/Ultra online candidate evaluation can send a real 640-pixel image proxy to the configured asset-understanding model. Wrong/uncertain candidates are rejected, retained as rejected in the shared cache/library, and do not become automatic matches on the next generation. This does not grant reuse permission; existing provider license checks still apply.
- Successfully validated planning results are cached for unchanged input/model/settings. Intermediate plans, alternatives, corrections, and final reports remain under `workspace/processing/<project-id>`.
- Advanced AI settings expose four model roles, endpoint discovery, quantization of installed models, CPU/server-GPU preference, RAM selection budget, context size, candidate ceiling, alternatives, review passes, and correction budgets. Remote server hardware is not inferred from the laptop's readings. Model unloading requests remain sequential between inference stages.
- An optional Stable Diffusion WebUI API adapter generates one explicitly requested decorative background, caches it, registers it in the existing SQLite library, and inserts it into supported compositions. It is disabled by default, requires declared output permission, rejects known exact-character prompts, and preserves real footage and explicit Minecraft/forest backgrounds. Its output is labeled generated decorative imagery. No model installation or weights download is performed.
- Generation shows actual stages without invented percentages. Export progress uses Remotion's measured frame-render progress; unknown-duration normalization/verification stages show activity without a percentage.
- The Storyboard panel displays saved processing evidence, findings, corrections, limitations, and buttons to reveal actual review frames after reopening a project.

## Verification completed

**70 tests pass**, including all 57 previous tests. Added cases cover selective corrections, unchanged scenes, manual layer protection, factual-content rejection, candidate comparison, cached plans, cancellation, vision/network failures, rejection reuse, advanced-setting validation, and optional image-provider cache/rights behavior.

`npm run build` passes TypeScript checking and the production Vite build. Existing nonfatal dependency directive/chunk-size warnings remain.

`npm run verify:quality-recovery` uses the existing actual comparison/statistic voiceover and assets, inserts a deliberately clipped orange diagnostic image, renders real before/after review frames through Remotion, and exports both complete 1080×1920 MP4s with audio. OpenCV then decodes the files independently:

| Encoded image bounds | Before | Corrected |
|---|---:|---:|
| Left edge | 864 px | 702 px |
| Visible width | 216 px | 378 px |
| Visible height | 346 px | 346 px |

The correction moves the diagnostic layer **162 pixels left** and restores **162 pixels of clipped width**. This is a geometry regression fixture, not a claim that an orange test rectangle improves the video's artistic quality. Unrelated scenes, duration, and narration remain unchanged.

Evidence: `workspace/quality-recovery-tests/verification.json`, `before.mp4`, `corrected.mp4`, decoded PNGs, and editable before/corrected `.gaming.json` files.

`npm run verify:editor-modes` regenerated the same gaming narration in Fast, Balanced, and High, with exact Charizard/Incineroar assets, an animated comparison, minimal captions, and independently verified Regieleki base speed of 200. All three actual MP4s pass audio/video/duration/dimension validation. This continuation's measured totals were approximately **26.6 / 30.1 / 58.0 seconds**. These runs overlapped the diagnostic export, so they are not controlled performance benchmarks or evidence of subjective quality differences. High produced real frame-review images. Ultra correctly reported missing installed models.

`npm run check:quality-settings-desktop` opened a visible Electron window using the production React build, real preload bridge, and real backend. It exercised all four model-role controls, saved review budgets in an isolated workspace, rejected an invalid budget with a readable application error, reopened the corrected project, and displayed saved review/correction evidence. Screenshots and results are in `workspace/quality-recovery-tests/desktop-*`.

`npm run check:asset-upload-desktop` again passed the real production AI Changes panel's missing-candidate request, pending Save/Open, shared-library upload, automatic original-request resumption, animation, and reopen workflow. The native file picker uses the documented fixture substitution; import/resume use the actual backend.

## Configuration still required for model-driven features

This RTX 3050 laptop reports **4 GB VRAM** and approximately 32 GB system RAM. There is no reachable configured Ollama server and no installed image-generation backend available for real inference testing. Consequently:

- Fast/Balanced generation and High's structural review/correction fallback were tested with actual rendered/exported media.
- Model-driven reasoning, image understanding, semantic candidate/layout ranking, and iterative vision correction have integration/regression tests using explicitly controlled API responses. They have **not** been validated against real installed model weights on this laptop or the RTX 5080 desktop.
- Ultra has not been exported on this machine. The application refuses to pretend that Ultra ran without its required reasoning and image-capable models.
- The optional image-generation adapter has controlled API/cache/PNG tests, not a real neural generation test. Configure an already installed WebUI API and declare that model's output reuse permission before enabling it.
- The RAM budget guides model selection; it is not a hard operating-system allocation limit. Server GPU preference delegates compatible offloading to the inference server. Model weight size is a rough estimate; context and runtime allocations require extra memory.
- Frame budgets inspect a subset of scenes and timestamps. Long videos are not exhaustively reviewed. Geometry proxies omit parented-layer coordinate analysis, precise glyph bounds, rotation bounds, and full animation trajectories. Unsupported/identity defects remain visible findings for manual asset correction.
- Cancellation aborts editor requests/transcription. A shared external inference/image server may finish its own in-flight computation; the editor does not interrupt unrelated server work.
- The optional background adapter rejects known character names and labels outputs honestly; it is not a semantic guarantee about arbitrary names or model output. Exact-character assets continue to use the existing asset sourcing/approval workflow.

Configure models through **Generate / new edit → Advanced AI settings**. Install/download models separately only after choosing appropriate hardware and reuse terms. An explicit remote Ollama endpoint can use the desktop; its hardware and security settings must be managed there.

Primary API references: [Ollama chat and unloading](https://docs.ollama.com/api/chat), [Ollama context and CPU/GPU offloading](https://docs.ollama.com/faq), [Stable Diffusion WebUI API](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API).

## Reproduce

```powershell
npm run build
npm test
npm run verify:quality-recovery
npm run verify:editor-modes
npm run check:quality-settings-desktop
npm run check:asset-upload-desktop
npm start
```

Before/after mode and desktop tests use isolated libraries. Real startup visibility is checked by the existing `GAMING_EDITOR_VERIFY_STARTUP=1` main-process probe; see `workspace/startup-verification.json` and `workspace/startup-window.png`.
