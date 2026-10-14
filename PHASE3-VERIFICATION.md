# Visual editor implementation and evidence

The old composition rendered one fixed headline, one optional background asset and Pokemon overlays. The new scene schema has independent timed layers, and generated projects now use this renderer.

Implemented: images/PNG, frame-synchronized GIF/WebP, silent looping video, text, shapes/gradients, SVG, bars, particles, clip-path masks, parent transforms, position/scale/rotation/opacity, z-order, start/end, linear/eased keyframes, directional/fade/spring entrances and fade/slide/scale exits. Inspector controls support adding/removing layers, media replacement, geometry, parent, mask, easing and keyframe JSON. Parent coordinates use canvas units relative to their parent origin. Invalid project timing/references and cyclic parents are rejected on export.

New automatic edits contain an original locally generated electronic underscore and transition accents. Narration timestamps drive music ducking; final audio retains the existing FFmpeg loudness normalization. Existing saved projects are not automatically rewritten.

## Online media

Commons is the first key-free working provider. Search requests imageinfo metadata; unknown/non-approved rights are excluded. Accepted declarations are CC0, Public domain, CC BY and CC BY-SA. Attribution includes author, file page, license URL when supplied, and editing changes. Cache stores media bytes and metadata; searches are cached for 24 hours, with stale-cache fallback on network failures. Requests are serialized, timed out and retried on transient errors/429. Only candidates returned by the provider service can be downloaded; renderer-supplied license claims cannot authorize arbitrary downloads.

Automatic selection prefers relevant indexed local assets and exact Pokemon sprites, then explicitly configured permitted catalogs, Commons, and configured stock providers. Queries currently recognize a conservative set of gaming/hardware entities. Full subject-token matches and usable resolution are required; ranking also records identity, aspect ratio, resolution and permissions. Generic stock is not inserted merely to fill time. This is metadata scoring, not computer vision verification.

**Online media / Settings** supports real searches, previews and selected-scene replacement. Pexels/Pixabay image and video adapters are implemented; API keys are encrypted using Electron safeStorage/Windows and never returned to the renderer. Search acts as the connectivity test. Their live responses were not tested because no credentials were provided.

Permitted image catalogs are JSON files selected through the application. Example:

```json
{"assets":[{"name":"Nintendo Game Boy", "url":"https://your-approved-host.example/image.jpg", "width":1200,"height":1800,"license":"CC BY 4.0","author":"Asset author","source":"https://your-approved-host.example/source","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","tags":"Nintendo Game Boy"}]}
```

Catalog licenses are user declarations, not independently audited ownership. Each entry needs HTTPS, author, source and an approved explicit license. Additional providers can be added to the adapter registry. Export writes attribution JSON and text sidecars for publication credits, including Pokemon source notices.

## Direction and templates

Optional Ollama direction uses a structured JSON schema, existing exact asset IDs and timings, semantic validation, and deterministic fallback on failure. Configure a URL/model in Settings; the URL may point to the RTX 5080 desktop. No local model installation or cloud subscription is required for the core editor. Structured success/failure were tested with fixture responses, not a real installed model. Cloud model integration remains future work.

The template registry includes comparison, ranking, showcase, news, player, hardware, statistics, top-five, split-screen, picture-in-picture, collage, parallax, documentary reveal, timeline and infographic variants. Assets are interchangeable through template subject selection and rebuilding layers. Some variants share base geometry. Statistics come from Pokemon API values or literal narrated numeric units; no competitive ranking or external statistics are invented. These are extensible foundational layouts; the entire template catalog has not received professional visual review.

## Actual verified artifacts

- `workspace/commons-smoke/gaming.mp4`: approximately 24.1 seconds, 1080 x 1920, H.264/AAC, real Windows speech -> faster-whisper -> automatic Commons/Pokemon sourcing -> animated layered export. Includes a permitted Game Boy photograph, Charizard/Incineroar attack comparison (84/115), exact Mega Charizard Y and Delibird, captions, generated music and transition accents.
- `workspace/commons-smoke/project.gaming.json`: reopenable/editable project using cached assets.
- `workspace/commons-smoke/frame-*.png`: extracted actual output frames inspected for image visibility, composition and sprite presence.
- `workspace/commons-smoke/comparison.html`: previous Phase 1 frame beside upgraded image and comparison frames. Narrations differ; this compares renderer capabilities, not an identical editorial cut.
- `workspace/pokemon-smoke/layer-animation-proof.mp4` and `layer-animation-verification.json`: all card transforms frozen. Original GIF pixels change for Charizard, Mega Charizard Y, Incineroar and Delibird; each has tens of thousands of changed pixels in the sampled region.
- `workspace/commons-smoke/desktop-preview.png` and `desktop-online-library.png`: actual visible Electron UI. Desktop automation opened the project, searched Commons, downloaded/cached a result and replaced imagery in real layers.
- `workspace/startup-verification.json`: `npm start` opened a visible non-minimized Electron window with the preload bridge and mounted UI.
- Existing horizontal regression: `workspace/smoke/horizontal-media.mp4`, 1920 x 1080, 2.005 seconds, looping video/music and validated audio.

Run `npm test`, `npm run smoke:commons`, `npm run verify:layer-animation`, `npm run check:commons-desktop`, and `npm run render:visual-sample` to reproduce relevant checks. Build warnings are limited to dependency directives/chunk size; TypeScript passes.

Remaining limits: stock-provider live credentials, real Ollama model verification, cloud adapters, broad narration concept extraction, fully reviewed template designs, animated WebP/SVG/particles/parent-transform export coverage beyond schema implementation, exact footage in/out editing, and installer packaging. The sample demonstrates a working media-rich foundation, not completion of every original long-term editor requirement.
