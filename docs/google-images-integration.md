# Google Images in Gaming AI Editor

Open **Settings → Google Images · SerpApi**, save your key, and test the connection. The desktop backend stores it using Electron `safeStorage` (Windows encryption). Project files, search caches and logs contain no SerpApi key. The provider uses the [SerpApi Google Images API](https://serpapi.com/google-images-api), and its connection check uses the [account API](https://serpapi.com/account-api).

**Edit → Search Web Images** searches original game images. Choose a game and image type, preview a result, open its publisher page, import it, add it to the selected scene, or replace the selected object. Favorites and rejected results persist. **Properties → Find Better Image** opens that search for the selected asset.

Generate and AI Changes use the same provider, downloader and cache. Existing exact game sources and suitable cached assets take priority. New Google queries are limited to one per subject and a configurable maximum of 2–12 per generation (default 8). Search results expire after a day; imported original files remain cached and deduplicate by content hash. Clearing results keeps imported files.

Examples: `Add Mario`, `Replace that picture with a better Minecraft pig PNG`, `Find a Charizard GIF`, `Find an animated Pikachu`, `Use a transparent PNG`, and `Replace the background with the Minecraft Nether`. A pending request also accepts `Use the second search result`. Undo restores scene edits. Missing or uncertain matches remain pending for identity approval.

Original downloads validate public DNS addresses, pin the connection to a validated address, and recheck redirects. Private/internal targets, unsupported formats, HTML, corrupt files, oversized downloads and excessive decoded pixels are rejected. Sharp decodes PNG/JPEG/GIF/WebP, checks actual transparent pixels, and records animation frames and timing. GIF and animated WebP originals remain animated in Remotion.

Automatic identity selection requires documented game-specific sources plus an entity match in the original URL. Titles alone do not qualify. Merchandise and obvious mismatches are excluded. High/Ultra generation can use a configured vision model to inspect otherwise ambiguous originals. Other uncertain matches need a choice in the editor; this is not a claim of perfect visual recognition.

Google discovery does **not** grant reuse rights. Unverified images retain an empty license, original URL, publisher page, query, attribution and a rights notice. Export sidecars retain that information even when a license is unknown. Review the original publisher's restrictions.

Without a key, cached/game-specific assets still work. Browse Google Images using `udm=2`, import a direct original URL or local file, confirm the image's identity, and continue the pending edit. No Google scraping or CAPTCHA bypass is used.

## Verification performed on 2026-10-10

- **188 automated tests passed**, including seven specific query styles; missing/invalid key and quota responses; wrong subjects/merchandise; corrupt and unsupported files; opaque versus transparent PNG; animated GIF/WebP; private DNS and redirect blocking; cancellation; retry; caching; deduplication; AI Changes, second-result selection and Undo.
- Desktop checks passed for Windows-encrypted key storage, enable/disable, quota display, original import, timeline insertion, favorite/reject, cache clearing, and resuming a no-key pending edit from a real original URL. These checks deliberately simulated the SerpApi response; the original Minecraft image downloads were real.
- The actual Generate path transcribed a Windows speech diagnostic voiceover, retrieved real Minecraft chicken/pig/creeper images and a Plains screenshot, animated their spoken cues, and exported a **1080 × 1920 MP4**. Exported frames were extracted and visually inspected. The pig original decoded as a transparent **726 × 673 PNG**. The comparison measured **925,784 changed pixels** between distinct subjects. AI Changes then replaced the selected picture. **SerpApi transport was simulated**, so this verifies editor integration, original retrieval, rendering and editing, not live Google search quality.
- A real Pikachu GIF was downloaded directly from the PokeAPI sprite repository (not Google), decoded as **33 frames / 1.32 seconds**, and exported through Remotion. Its sampled output frames changed **942,435 pixels**, verifying that the actual original remained animated. The silent diagnostic also verified the export fallback when loudness normalization produces non-finite samples.
- No key was found in the editor's provider settings or common SerpApi environment variables at process/user/machine scope. Therefore **all seven live SerpApi searches are recorded as NOT RUN**. Actual live Google result identities, account validity and remaining quota cannot be verified until a key is configured.

Artifacts are under `workspace/google-pipeline-check`, `workspace/google-desktop-check`, and `workspace/google-live-check`. The editable diagnostic project is `workspace/google-pipeline-check/project.gaming.json`; its output is `three-real-game-images.mp4`.

After configuring a key, run `npm run verify:google-live`. It records the exact seven queries, returned candidates and source evidence, tries suitable originals, and inserts successful assets into a diagnostic project. With at least three suitable imports, it exports a real MP4 and extracts frames for visual review. It leaves uncertain identities unresolved rather than substituting arbitrary results.

Other checks: `npm test`, `npm run build`, `npm run check:google-desktop`, and `npm run verify:google-pipeline`. The last two deliberately use simulated SerpApi transport and real originals. The pipeline check requires `workspace/google-pipeline-check/narration.wav`; the included verification run used Windows SAPI narration, not a user recording.
