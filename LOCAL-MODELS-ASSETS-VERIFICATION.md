# Installed local models and game assets — October 9, 2026

The existing desktop editor now has actual local inference weights and 17 downloaded, indexed asset packs. No Windows service, PATH, driver, or firewall changes were made.

## Models and laptop configuration

- Portable Ollama 0.40.2 is installed under `.runtime/ollama`; the official GitHub release checksum was checked during setup. Model data is project-local under `.runtime/ollama-models`.
- Ultra script reasoning: `qwen3.5:4b` (Q4_K_M).
- Ultra planning, asset inspection and post-render review: `qwen3.5:2b-q4_K_M`. The initially downloaded `qwen3.5:2b` Q8 model remains available as an alternative.
- Sequential inference, one loaded model at a time, 4,096 context tokens, 120-second idle retention, two layout alternatives, two review passes and two maximum corrections. Exact assets/forms, timestamps, facts and manual edits remain protected.
- Compact geometry requests omit large SVG bodies and constrain generated scene/layer IDs to existing IDs. Rejected proposals preserve the valid original composition and are disclosed in processing evidence.
- The project-local runtime automatically restarts when model discovery is requested for `http://127.0.0.1:11535`. Explicit desktop endpoint settings remain supported.

The first 4B-planning experiment took about 11 minutes, returned incorrect scene IDs and timed out on one proposal. The laptop configuration above completed a subsequent actual Ultra processing run in **78.488 seconds** for a 5.14-second voiceover, followed by a verified **1080×1920, 5.2-second MP4**. Both local layout alternatives passed validation and three real rendered images received successful inference responses. The project contained five media records rather than the entire 8,000-plus-record library.

Small vision models made inaccurate identity/interpretation observations in this fixture. Successful inference is not proof of correct image understanding or professional editorial quality. Observations remain unverified model findings; they cannot replace verified sprite identity, invent facts, or silently rewrite the edit. Review important decisions manually, or select a stronger installed model/desktop endpoint.

Evidence:

- `workspace/local-models/installed-models.json`, `laptop-quantization.json`, `runtime-release.json`, `autostart-verification.json` and runtime logs.
- `workspace/installed-ultra-tests/ultra.gaming.json`, `verification.json`, `ultra.mp4`, and its attribution files.
- Intermediate projects and actual frame PNGs under `workspace/processing/<project-id>`.

Sources: [Ollama Windows portable runtime](https://docs.ollama.com/windows), [Qwen model tags](https://ollama.com/library/qwen3.5/tags), [4B model](https://ollama.com/library/qwen3.5:4b), [2B Q4 model](https://ollama.com/library/qwen3.5:2b-q4_K_M).

## Downloaded library

**8,478 assets** are cached across 17 packs:

| Content | Count | Source / scope |
| --- | ---: | --- |
| Exact Pokémon sprite variants | 5,524 | PokeAPI Showdown numeric IDs: normal/shiny, front/back, female and available alternate forms |
| Original game graphics | 2,143 | Kenney platformer, town, dungeon, farm, battle, shmup and monochrome packs; includes 28 backgrounds and 1,201 pixel-art images |
| Original game/retro sound effects | 811 | Kenney audio, SubspaceAudio’s 512 retro sounds, and bart’s platformer sounds |

The **Game Assets** tab supports search, pack/category filters, pagination, original GIF previews, audio auditioning, animated subject insertion, background insertion, playhead sound placement and retries for incomplete downloads. These records use the existing SQLite library; generation and AI revision sourcing share it. Only selected/relevant assets enter project JSON and inference prompts. Narration cues can select sparse, low-volume licensed sound effects.

Source pages, downloaded archives, license evidence, SHA-256 archive digests and manifests are retained in `workspace/asset-packs`. Individual assets retain provenance and attribution; exports include attribution JSON/text. Existing Pokémon metadata lookup reuses bulk sprite bytes, and enriches exact forms/stats when needed.

Most original packs declare CC0. **bart’s 8-bit pack is CC-BY-3.0**, not CC0; the installer initially rejected the mistaken license classification, then the catalog was corrected and attribution retained. Pokémon’s repository license also identifies the image contents as copyrighted; its full notice remains attached. Nonnumeric Pokémon filenames without an exact ID mapping are excluded from the bulk catalog rather than guessed. The existing exact-form service remains available for uncached variants.

This is **not** a universal official sprite/background/SFX collection for every YouTube-popular game. Mario, Sonic, Zelda, Fortnite, Minecraft and other listed franchises require individually permitted assets or your own imported media. Generic packs are not labeled as those characters/games and do not satisfy exact-franchise matches. Sounds are original retro-style effects, not an unlicensed collection of extracted Nintendo/other game audio.

Sources: [Kenney asset catalog](https://kenney.nl/assets), [512 original retro sounds](https://opengameart.org/content/512-sound-effects-8-bit-style), [bart platformer sounds and attribution](https://opengameart.org/content/8-bit-platformer-sfx), [Pokémon repository license](https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt).

## Actual desktop and export checks

- `npm test`: **74 passed**; includes compact layout protection, catalog isolation, sparse sound matching, escaping paths, corrupt/empty GIF rejection and honest single-frame classification, alongside existing functionality.
- `npm run build`: TypeScript and Vite passed.
- `npm run check:game-assets-desktop`: visible production Electron UI browsed the shared library, loaded and inserted Charizard with slide-in/out animation, auditioned a real coin sound, inserted it, saved/reopened, inserted original pixel art, showed the Remotion preview and exported MP4. Evidence: `workspace/game-assets-tests/verification.json`, desktop screenshots, `saved.gaming.json`, `sprites-and-retro-sounds.mp4`.
- `npm run verify:game-assets-export`: disabled all programmed sprite transforms and captions, then decoded two actual diagnostic MP4s. Native GIF changes covered **120,708 subject pixels**; the original pixel asset covered **46,669 non-background pixels**. Adding the selected sound changed encoded audio by **0.01141 RMS** against the otherwise identical no-sound export. Evidence: `export-verification.json`, `native-animation-and-sound.mp4`, `native-animation-no-sound.mp4`, decoded PNG/audio files.
- `npm run verify:installed-ultra`: actual voiceover → Whisper → exact sprites → live local reasoning → valid local geometry proposals → actual rendered-frame vision → verified MP4. No mocked inference server.
- Portable runtime was stopped and automatically restarted successfully; installed model capability discovery was checked again.
- `npm start`: actual production main entry created and showed a desktop window, loaded the new UI and verified the preload bridge. `workspace/startup-verification.json` records PID 18564, `visible: true`, `minimized: false`; `startup-window.png` captures the actual window.

Recreate downloads with `npm run setup:local-models` and `npm run assets:download`. Keep `.runtime` and `workspace` when moving this installation; source downloads and model weights are intentionally outside Git.
