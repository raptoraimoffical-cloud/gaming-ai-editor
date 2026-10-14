# Gaming AI Editor — Visual editor

Windows desktop application with local word-timestamp transcription, a SQLite media index, narration-driven scene planning, Remotion preview/rendering, animated captions, project persistence, and normalized 1080p H.264/AAC MP4 output.

## Run

Double-click `Launch Gaming AI Editor.cmd`, or run `npm start`, to build and open the desktop app. Node and FFmpeg/FFprobe must be on PATH.

The project-local Python runtime and faster-whisper dependencies are installed under `.runtime`. Run `scripts/setup.ps1` to recreate its virtual environment using the bundled runtime. Whisper models download on first use, then work locally. Default CPU int8 avoids CUDA setup on the RTX 3050 laptop. CUDA mode requires compatible NVIDIA CUDA/cuDNN libraries; no system GPU changes are performed by this project. Use multilingual `base` or `small` model names in the backend for languages other than English; the current UI presets use English models.

## Workflow

1. Import a voiceover. Add descriptive tags and a rights/license reference before importing gameplay, images, or music.
2. Choose voiceover, format, and Whisper model. Generate the edit.
3. Review the real Remotion preview. Select timeline scenes to edit headlines or replace visuals. Select an imported licensed music track and adjust its level.
4. Save a project or export MP4. Exports run with two render workers and are normalized and checked for dimensions, audio, and duration.

Imported assets are copied into `workspace/media`; SQLite stores the library metadata. Project JSON references these copies. Keep the workspace folder when moving projects. Do not import untrusted project JSON. Short clips loop to fill their scenes.

## Implemented scope and limitations

The core workflow uses local Whisper transcription, rights-aware local library matching, exact Pokemon identification, layered Remotion visual templates and conservative online entity queries. Existing projects retain their legacy renderer; new generated projects use independent visual layers. A local footage match requires two indexed keywords and declared rights. No confident match produces a designed graphic fallback. Review matches before publishing.

Remaining development includes broader entity/concept extraction, movable scene boundaries, clip in/out controls, and distributable installer packaging. Pexels/Pixabay live requests need configured API keys; local Ollama models are installed and live inference/Ultra export is verified (see LOCAL-MODELS-ASSETS-VERIFICATION.md). Stock-provider credentials remain unverified. Optional Ollama can run on your desktop; rendering remains on this machine. Template variants are foundational designs, not a claim that every narration will receive professional editorial quality.

## Verification

`npm test` checks rights-aware matching and timing validation. `npm run build` checks TypeScript and builds the desktop UI. `npm run smoke` generates a spoken test WAV using Windows speech, transcribes it with faster-whisper, renders a real 1080×1920 MP4, normalizes audio, and verifies the output using FFprobe. `node scripts/smoke-media.mjs` verifies horizontal rendering with a generated test-pattern clip and test music, including short-clip looping. `npm run check-desktop` checks Electron startup and reopening the smoke project. Artifacts are in `workspace/smoke`.

Verification includes 74 unit tests, real vertical and horizontal MP4 exports, four exact animated Pokemon forms, downloaded Commons imagery in a 24.1-second vertical gaming MP4, and a visible Electron desktop search/replacement workflow. See PHASE3-VERIFICATION.md for evidence and limits.

Remotion's license terms should be reviewed for your usage: https://www.remotion.dev/license . This project does not assume Remotion is unrestricted open-source software.

## Pokémon integration

Pokémon detection is enabled by default when generating an edit. The service caches the PokéAPI Pokémon and form catalogs, individual Pokémon/species/form responses, sprite bytes, source metadata, and the sprite repository's license text in `workspace/pokemon-cache`. HTTP requests are serialized, spaced by 300 ms, time out after 20 seconds, and retry transient failures/429s with bounded backoff. Cached resources work offline and are not repeatedly downloaded. A first-time uncached lookup requires internet access. A network failure leaves a review warning and keeps the rest of the video editable/exportable.

The planner matches canonical names, regional/Mega/form aliases, curated Whisper spelling corrections, and unique conservative edit-distance matches. Original timestamps are retained. Corrected identifications are marked for review; ambiguous Mega/regional forms and unavailable exact sprites are left unresolved instead of substituting the base form. This is best-effort transcript identification, not a guarantee that every possible Whisper error is recognized. Unknown spellings can be fixed manually in the Asset Library.

Automatic edits prefer verified Google artwork when configured, then exact-form official artwork. Showdown sprites are reserved for relevant spoken contexts or specific user directives; model and back views are likewise contextual. The Pok?mon Asset Library still allows explicit sprite selection. GIFs are decoded and synchronized with the Remotion video frame using `@remotion/gif`; their original frame delays and looping are retained at the video's 30 fps sampling. A static PNG stays explicitly labeled static and receives entrance, scale, float, and exit motion effects. Comparison cards display API base stats; ranking labels follow list order and do not claim inferred competitive rankings. Team/comparison/ranking contexts carry already mentioned sprites across scenes, introducing new ones at their narration timestamp. Layouts support up to six sprites; oversized groups produce review warnings.

Open **Pokémon Asset Library**, search a name/form, choose the exact form and sprite source (including available shiny/back/static sources), and preview its animation. Replace a selected scene sprite or unresolved mention without deleting the rest of a team, or add a team member. The scene inspector offers layout, individual replacement, removal, and sprite start/end timing controls. Save/reopen uses the same local cached assets and refreshes media-server URLs.

Attribution, source URLs, exact form IDs, National Pokédex numbers, GIF frame counts, and available source URLs are retained in assets and project JSON. The repository's `LICENCE.txt` states CC0 1.0 for the repository and identifies image contents as Copyright The Pokémon Company; the application records both statements and does not mark Pokémon artwork as freely licensed stock footage. Sources: https://pokeapi.co/docs/v2 , https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt , https://www.remotion.dev/docs/gif .

### Pokémon verification

- `npm run smoke:pokemon`: generates a spoken WAV mentioning Charizard, Mega Charizard Y, Incineroar, and Delibird, runs real faster-whisper transcription, checks exact sprite IDs 6 / 10035 / 727 / 225, and exports a 1080×1920 MP4. The actual tiny-model output includes “In Cineror” and “Dellybird”; both are correctly identified and marked as corrected.
- `npm run verify:pokemon-animation`: exports a diagnostic MP4 with every card transform frozen and checks colored sprite pixels and frame-to-frame changes for all four GIFs. Evidence is in `workspace/pokemon-smoke/animation-verification.json`.
- `npm run verify:pokemon-layouts`: verifies automatic six-member team planning across scene boundaries, exact Alolan Ninetales, an explicitly selected static Fire Arceus source, and renders comparison/ranking/team/static layout PNGs. The missing-animation fallback path is separately tested with a 404 GIF fixture.
- `npm run check:pokemon-desktop`: opens a visible Electron window, reopens the Pokémon project, verifies advancing GIF canvas pixels, searches Mega Charizard Y, and checks its form selection and animation preview.
- `npm test`: also covers form ambiguity, timestamped Whisper corrections, cache deduplication/offline reuse, static fallback, 429 retries, and missing forms. Existing Phase 1 vertical/horizontal exports remain covered by their smoke scripts.

Test assets and projects use isolated libraries under `workspace/pokemon-smoke` and `workspace/smoke`. The four-Pokémon sample is `workspace/pokemon-smoke/pokemon.mp4`.


## Narration-driven visual reactions

New edits use sentence-level reactions to named subjects, contrast, statistics, explicit rankings and reveal cues. Topic-aware backgrounds, automatic character/media insertion, percentage rings, verified Pokemon base-stat graphics and before/after line graphs now drive the composition. The inspector shows the reaction and missing-source warnings. Use typed local tags such as `character:Sonic`, `person:Clix` and `game:Your Game` for additional identities.

See [REACTION-VERIFICATION.md](REACTION-VERIFICATION.md) for the five actual voiceover acceptance exports, combined topic-switching video, preview checks, commands and current limits.

## Editing Instructions and AI Changes

Enter instructions before Generate, or regenerate visual layers from the existing transcript. The AI Changes panel edits existing layers with scene/time targeting, actual confirmations, errors, persisted revision history, undo and redo. It uses a configured Ollama model or the clearly labeled built-in command interpreter. See [REVISION-VERIFICATION.md](REVISION-VERIFICATION.md) for supported commands, model configuration, limits and real MP4/desktop verification. The editable acceptance sample and fully animated export are in `workspace/revision-tests/revised-live.gaming.json` and `revised-live.mp4`.


## Installed local models and game assets

Ultra is configured with actual project-local Qwen 3.5 weights: 4B for script reasoning and 2B Q4_K_M for planning, asset understanding and rendered-frame review. The portable runtime starts automatically when these settings are used. Advanced AI settings can instead point at your desktop server. Run `npm run setup:local-models` to recreate this configuration; this downloads model weights and the portable runtime without changing Windows services, drivers or PATH.

The editor’s Library contains the downloaded packs used by automatic editing. The separate Game Assets tab has been removed. Existing pack files and saved project media remain available.

Run `npm run assets:download` to download/reuse the curated packs. Restart the app or press Refresh packs to index them. Source pages, archives, licenses and manifests are retained under `workspace/asset-packs`. Most original packs are CC0; the bart sound pack is CC-BY-3.0 with attribution. Pokemon images retain the repository's separate image copyright notice.

This is not an official asset dump for every popular franchise. Generic pixel art and original retro-style sounds are clearly labeled; they cannot silently match Mario, Sonic, etc. Those games require your own gameplay or individually permitted assets. Unmapped nonnumeric Pokemon repository filenames are excluded from the bulk catalog; the existing exact-form service remains available. Model observations are advisory and can be wrong; validated facts, exact assets/forms, narration timing and manual edits remain protected.

See [LOCAL-MODELS-ASSETS-VERIFICATION.md](LOCAL-MODELS-ASSETS-VERIFICATION.md) for actual desktop, model and exported-video evidence.

## AI Models and post-edit changes

Open **AI Models** to discover the installed trained weights, install/verify another Ollama model, and select separate editing, reasoning, planning, vision and review roles. The project-local server uses `http://127.0.0.1:11535`. Generation, AI Changes and scene regeneration share the saved configuration. Precise supported edits run directly and work offline; freeform edits use the selected trained model. Select an object and scene before asking for a change, or choose Whole video in AI Changes. Every applied edit records undo history.

For hosted inference, select **Hosted chat API**, enter a provider base URL such as `https://openrouter.ai/api/v1`, save your API key, refresh available models, select roles and save configuration. Keys are encrypted with Windows safeStorage and are not included in project files. Hosted inference sends scene descriptions/layer information and, for vision passes, sampled images to the selected provider. Live hosted testing requires your own provider credentials.

## Fortnite Assets

The **Fortnite Assets** tab browses the [Fortnite Wiki asset category](https://fortnite.fandom.com/wiki/Category:Images_-_Assets) through its public API. Search image filenames, browse subcategories, page through thumbnails, and import original images directly into the library or selected scene. Source pages and original copyright attribution are retained. Downloaded files can also be imported manually.

## Game logos, backgrounds and automatic sound

Open **Pokémon Logos & Assets** for the game catalog, original game logos, real gameplay backgrounds and the [Pokéos Champions archive](https://www.pokeos.com/archive/assets/champions). Search the Champions artwork by Pokémon name, species number or filename and filter default/shiny variants. Imports enter the regular library and can be inserted into the selected scene. Game names in narration automatically place matching logos at the spoken timestamp; paired titles use separate logos. Champions and Showdown use their official image sources. Other catalog games resolve exact English logo filenames through Bulbagarden Archives; unavailable artwork is reported in `gameAssetWarnings` rather than substituted.

**Generation settings → Automatic sound effects** is on by default. The planner adds sparse reveal, impact, victory, click and transition accents to narration cues and visual entrances, preferring matching installed recordings. It supplies original PCM sound files when no matching recording is installed. These are original editing effects, not official Pokémon game audio. Manual effects remain in place. AI Changes also supports requests such as “Add the Pokémon Showdown logo” and “Add an impact sound at 1 seconds,” with undo history.

**Settings → Google Images (SerpAPI)** searches Google image results using a SerpAPI key saved with Windows encryption. The **Open Google Images** button works without a key. Results retain their original publisher link; declare the image's reuse permission before importing. No API credentials are bundled, and Google results with unverified permission are excluded from automatic selection.

Verification: `npm test`, `npm run build`, `node scripts/launch.mjs scripts/check-game-media-desktop.cjs`, and `node scripts/verify-game-media.mjs`. The last check downloads actual Champions/Showdown assets, an Emerald English logo and Champions Pikachu artwork, then exports a 1080×1920 sample and checks decoded audio for audible automatic effects. Artifacts are under `workspace/game-media-check`.

Long-running jobs show a floating progress bar, current stage, elapsed time and estimated time remaining across tabs and dialogs. Download/render stage estimates use measured progress; generation, exports, model downloads and AI changes also learn from the last five successful runs on this computer (`workspace/progress-timings.json`). Until enough data is available, the bar stays indeterminate and shows “Estimating time remaining.” Estimates reset between stages and jobs, and the panel closes on completion or failure. Check these behaviors with `node scripts/launch.mjs scripts/check-progress-desktop.cjs`.

## Pokémon cries

The Pokémon library can load, preview and insert latest or legacy cries for the selected form. Recordings come from PokéAPI’s cry repository and retain their original game copyright. Generation adds sparse cries at identified Pokémon mentions by default; disable **Play Pokémon cries when they are mentioned** in Generation settings to opt out. AI Changes accepts requests such as “Add Pikachu cry at 2 seconds.” Unavailable cries are reported in `pokemonCryWarnings`; no unrelated cry is substituted. Source audio is cached locally and its actual format is detected, including MP3 recordings supplied with an `.ogg` URL.

Verify with `node scripts/launch.mjs scripts/check-cries-fortnite-desktop.cjs`.

## Executable AI editorial planning

High Quality is the default for new edits. The installed Qwen reasoning model now authors structured editing recipes in batches before asset selection: subject-specific image queries, data-grounded chart choices, subject motion, visual effects and sound accents. The local planning role uses the installed 4B model with an 8,192-token context; High/Ultra can try alternate layouts and inspect actual frames. These are processing passes, not artificial delays. An invalid recipe gets one additional model correction pass with the precise validation failure and available data before a disclosed fallback.

Recipes build real Remotion layers: animated bar comparisons, percentage rings, line graphs for explicitly narrated trends, slide/spring/mask/parallax entrances, spotlights and particles. Charts use existing narrated metrics, reject incompatible units and invented indices, and preserve manual edits. Line graphs require at least three ordered values; calendar years remain timeline labels rather than bar magnitudes. Sound planning matches installed recordings by cue synonyms and clips long effects to two seconds. Fortnite asset search can query the live Wiki source directly. Missing media and rejected model responses remain visible in Pipeline evidence.

Regenerate Scene and instruction regeneration author new recipes. AI Changes accepts “Add a line graph to this scene showing the narrated trend” when the narration supplies valid data, preserving other scenes and undo history. Pipeline evidence shows the actual model’s scene decisions and search log. Model judgment still needs review; an elapsed time or a valid JSON response alone does not prove that the edit is good.

`node scripts/verify-editorial-ai.mjs` tests actual installed-model inference and a diagnostic MP4 under `workspace/editorial-ai-check`. It checks chart/effect layers, changed graph pixels across decoded frames, and nonzero encoded sound. The sample uses illustrative data and a silent test voice track. `npm test` covers data validation, protected layers, idempotence, sound cues and rejected model output.

## Local AI animator and retention planning

The AI Animator tab uses the installed local Ollama reasoning model to plan the whole video’s hook, explanations, payoff and scene motion. It creates editable subject keyframes, entrances, focus pulses, drifts, orbits, chart reveals and vector motion trails using existing scene assets. This is local procedural animation directed by a trained model, rather than text-to-video character generation. Narration timing and protected manual layers are preserved. Generation enables it by default in Balanced, High and Ultra modes; Fast remains a quick draft. Existing projects can run it from the tab and undo the revision.

Import your historical audience-retention CSV or JSON to guide visual pacing around relative drop-off positions. CSV accepts `position,retention` (normalized position 0–1 and percentage) or YouTube API `elapsedVideoTimeRatio,audienceWatchRatio` (ratios). JSON accepts `{ "points": [{ "position": 0, "retention": 100 }, { "position": 0.5, "retention": 65 }, { "position": 1, "retention": 40 }] }`. At least three unique positions are required. The average curve value and dips describe the imported video; they do not predict or guarantee retention for a new edit. Without an import, the planner explicitly uses editorial heuristics. No analytics account is connected automatically. Format reference: https://developers.google.com/youtube/analytics/channel_reports

Verification: `node scripts/verify-local-animator.mjs` runs the installed local model on the editorial sample and compares encoded animation frames against a matching baseline. Its test curve is illustrative, not channel analytics.

## YouTube video modes

Choose **YouTube Shorts** (1080×1920, 9:16) or **Standard YouTube** (1920×1080, 16:9) in Generate / new edit → Video mode. The selected mode persists in saved projects, controls the preview and MP4 canvas, and supplies format-specific guidance to narration analysis, editorial planning and the local animator. Shorts prioritizes a mobile-readable hook and focused visual beats; standard mode uses widescreen comparisons and a developed explanation. Neither mode automatically cuts the supplied narration. Generic vertical and widescreen options remain available, and existing projects keep their original format.

## Contextual shot direction and continuity

Generation and AI Animator now run a trained whole-video shot pass before authoring local motion. It selects exact available scenery and supporting images, considers surrounding scenes, and records why each shot exists. Background discovery searches for game environment imagery independently of individual character mentions, records search outcomes, and retains uploaded/generated backgrounds. Supporting media uses fixed open composition slots and exact narration cues; occupied regions and unrelated media are rejected. Shared background camera movement, longer crossfades, and subject motion consolidation prevent repeated zoom/pop/float combinations and pre-cut fade-to-empty gaps. Existing projects can apply this pass through AI Animator → Plan video & create local animations, with Undo available. Missing source media still requires a successful provider search or an upload; model output never substitutes invented asset IDs.

## Model-backed AI Changes

AI Changes enables **Use trained AI to plan edits** by default. Its operation planner receives the full narration and compact selected scene/layer context, applies validated timeline operations, and retries a rejected plan once with the validation error. The panel displays the model, elapsed inference time and applied operation count. Unsupported, disconnected and unchanged results raise an error instead of a success message. Exact commands remain available by turning the option off. Undo/Redo still restore actual timeline changes.

AI Models includes install/use controls for Qwen 3 8B, Gemma 3 4B and Qwen 2.5 Coder 7B, plus custom Ollama names and searchable hosted model discovery. These are trained reasoning, vision or code models used to author edits that the local renderer executes; they are not pretrained end-to-end video editing systems. Model weights and hardware requirements vary. Official model references: https://ollama.com/library/qwen3:8b , https://ollama.com/library/gemma3:4b , https://ollama.com/library/qwen2.5-coder:7b . Hosted model discovery/API reference: https://openrouter.ai/docs/api/api-reference/models/get-models .

When the selected editing model supports image input, AI Changes renders the selected moment and includes that frame in the planning request. The evidence panel reports whether a frame was supplied. Local Qwen 3 8B and Gemma 3 4B weights are installed in this workspace; Qwen 2.5 Coder remains an installable option. `node scripts/verify-ai-changes-live.mjs` verifies real local inference, multiple applied operations, preserved graphics, Undo and encoded output differences.
### Quality checks and recovery

The preview now includes **Quality Check**. It inspects the current project for missing narration, music, sound effects and visual files; invalid audio timing or volume; timeline gaps and overlaps; caption timing; and visual structure. Errors block export before rendering. Source rights, pending asset selections, long shots and generation fallbacks are review notes. These checks do not substitute for watching the video or guarantee subjective editorial quality.

Project changes receive recovery snapshots, including manual music settings, generated edits, reference styling and visual rebuilds. **Recover last edit** opens the latest usable snapshot. Project and recovery writes use temporary files followed by atomic replacement; a failed write to an open project leaves its recovery snapshot available. Recovery opens independently of the original project file; use Save to choose its destination.

Playback follows the active scene in the inspector. The timeline includes text, charts and effects alongside image and video layers. Property and clip edits pause while an AI job is running, and selected library videos receive a video preview.

Run `npm run audit:desktop` for the deterministic desktop workflow checks, including production IPC and recovery. Reports are written to `workspace/feature-audit/desktop.json`. An additional live online asset-replacement check can be run with `node scripts/audit-desktop.mjs --online`; it depends on external asset search availability and existing verification fixtures. Run `npm test` for the core editing, inference and validation tests.

### Deliberate two-second attention planning

Generation now writes a whole-video attention schedule before the AI authors scene recipes. Each roughly two-second beat has narration context, a hook/explanation/payoff role and an editing purpose. The trained editorial and animation models receive that schedule. After rendering layers are authored, the execution pass keeps existing picture reveals and useful animation, prioritizes narrated charts or subjects, and fills otherwise quiet beats with restrained focus keyframes. Manual and locked layers, narration timestamps and no-motion requests remain authoritative. Missing suitable visuals are reported rather than replaced by unrelated images.

Historical retention curves inform planning when imported; the schedule does not predict watch time or guarantee viewer attention. Inspect the planned and executed beats under Pipeline evidence → Attention strategy. Generate a new edit, or run AI Animator to apply this workflow to an existing project. `node scripts/verify-attention.mjs` renders a test export and checks narration and media preservation.

### Sentence importance and YouTube guidance

Before visual authoring, the planner separates spoken clauses using available word timestamps. It labels connecting speech, named subjects, actions, comparisons, narrated evidence, and concrete game mechanics/environments. Connecting speech holds context. Pronouns retain the established subject. Important words and the reason for an image, demonstration, comparison or chart are supplied to the trained editorial and animation models. Relevant environment concepts also guide background searches. A missing subject image is reported instead of emphasizing a different character.

Shorts and standard YouTube receive different framing and narrative rules while retaining the two-second attention target. These are editing rules supplied to existing models, not fine-tuned weights or private algorithm knowledge. They follow YouTube's public emphasis on relevance, choosing to watch, viewing behavior and viewer satisfaction; no ranking weights or performance guarantees are invented. Sources are linked in Pipeline evidence → Sentence importance & YouTube format. Phrase timing falls back transparently to the scene when aligned narration words are unavailable.

## Asset battle choreography

Place two Pokémon assets or uploaded character images as subject layers in the same scene, with overlapping visible times. In **AI Changes**, ask “Make Pikachu and Charizard fight in a cartoon dust cloud” or “Have Pikachu use thunderbolt on Charizard.” The selected trained reasoning model plans the fighters, move and timing; the app validates the plan before applying it. Locked subjects cannot be changed.

Supported actions are a dust-cloud brawl, tackle, thunderbolt, flamethrower and water gun. These animate your existing images using paired motion keyframes, recoil, projectile and impact graphics. They are stylized sprite choreography; they do not generate articulated character footage or simulate game rules. The editable actions appear in preview and MP4 exports, retain revision Undo/Redo, and show their model and reasoning under Pipeline evidence. Use the timeline to refine timing.

Run `node scripts/verify-battle.mjs` for real model planning, an animated MP4 export and Undo verification.

## Narration-aligned motion and deliberate holds

The attention pass now respects accepted trained animation plans, including moments where the director chooses to hold the picture. It does not add periodic zoom pulses over those plans. Unauthored charts remain stationary so the viewer can read them. Animation quotes match complete narration tokens and use the occurrence spoken while the target is visible; an unavailable cue is rejected for correction instead of being silently shifted. No-motion instructions prevent new model-authored animation from being applied.

## Fix pacing in an existing edit

In **AI Changes**, use **Fix two-second visuals**, or ask “Switch visuals every 2 seconds across the whole video.” This applies actual timed subject-image changes and data-backed animated charts, retaining chart-reading time and ongoing action beats. Uploaded image selections rotate inside long scenes. Comparable narrated metrics can produce custom line, bar or percentage charts; unrelated units are rejected. Undo restores the previous timeline.

Preview and export share audio routing that prevents the narration source (including an alias of the same file) from playing again as music or an effect, and removes duplicate sound events. Selected unclassified audio is no longer automatically assigned as music. This addresses duplicate routing; it does not remove repetitions already present in a source recording.

## AI Changes request execution

Editing phrases such as “add animations” and “add smooth transitions” are routed to the timeline editor instead of being mistaken for missing image assets. Recognized existing-asset and background edits bypass asset discovery. Trained plans for supported precise requests are checked for omitted operations and requested values, with one correction attempt before a clear error. Explicit opacity edits override old opacity keyframes; disabling animation removes inherited movement and float. The panel shows elapsed time while the requested changes are being processed.

AI Changes has a **Wolfey-inspired edit** preset: it executes competitive explainer pacing and word-timed item callouts rather than just returning advice. It uses the two-second subject-image sequence with deliberate item-interaction holds. Pokémon item names and sprites come from the cached PokéAPI item catalogue. A named character holding/using an item gets a tracking accessory; hats use a head anchor. Anchor position and item size are editable in Selected object because character anatomy varies. The Pikachu Showdown front sprite has a measured default; other sprites start with an adjustable default. Narration and audio timing stay unchanged, and scene changes support Undo/Redo.

For other games, upload images with tags such as `item: Master Sword`. The item director also searches permitted sources, Commons and configured Google Images for explicitly narrated held/worn items. Google requires a SerpAPI key in Online Images. Results requiring publisher permission remain visible in an asset selection request; choosing/uploading an image resumes the actual placement and attachment. Failed downloads produce visible missing-asset notices. This preset is an executable editing rule system; it does not claim to reproduce Wolfey’s complete editing workflow or infer anatomical anchors for every character.

Check item behavior with `node scripts/verify-item-direction.mjs` (real backend, actual PokéAPI sprite, rendered moving hat, export and Undo), then `node scripts/launch.mjs scripts/check-item-direction-desktop.cjs` (real desktop button, preview, attachment controls, Undo/Redo).

## Remake the video from AI Changes

Enter your instructions in **AI Changes**, then click **Remake video with changes**. It rebuilds every scene, discovers narrated subjects, looks up relevant images, applies the current request and active earlier changes, and reconstructs the visual schedule. The original narration, scene boundaries and word timings stay unchanged. Undo/Redo restores the whole rebuild, including its instructions and plans. Leave the request blank to rebuild using the active changes.

The sequence shows actual subjects at their spoken mentions, with focus changes roughly every two seconds and longer holds for readable charts or ongoing actions. It no longer substitutes generic `KEY POINT` cards for missing images. Missing images are reported for selection or upload. New objects outside the built-in catalogue can be proposed by the trained model only when they appear in an exact narrated quote.

Preview narration owns the playback clock, so late visual frames catch up to speech instead of rewinding it. Pause, explicit seeking, mute, volume and playback speed remain connected to the player. Preview also keeps stable player inputs, limits inspector updates while playing and avoids rendering invisible image/GIF layers. Starting the normal editor twice focuses the existing window. Audio fingerprinting also blocks identical narration copied into a different lossless audio container from being routed as music or a sound effect.

Verify the actual rebuild and export with `node scripts/verify-video-remake.mjs`, and its desktop button, request, preview, Undo/Redo and playback with `node scripts/launch.mjs scripts/check-video-remake-desktop.cjs`.

## Pokemon artwork Shorts reference

Select **Pokemon artwork Short (reference)** under Generate → Shorts style, or ask AI Changes to match this reference style for an existing video. The preset comes from inspecting the supplied 71-second evolution Short: large official artwork, softened game scenery, vertically stacked comparisons, narrated entrances, restrained zooms and deliberate holds. Captions are off by default; ask to show captions to enable them. Your voiceover and word timings remain unchanged, and Undo restores the prior format and visuals. The saved style also survives later remakes.

The preset prefers exact-form official artwork, respects selected uploaded images and reports missing scenery or subjects. It uses your narration and assets rather than copying the source clip, soundtrack or creator branding. See [the reference analysis](docs/reference-pokemon-short.md) for observed timings and limitations. Verify the rendered result with `node scripts/verify-reference-short.mjs` and the desktop button with `node scripts/launch.mjs scripts/check-reference-short-desktop.cjs`.

For the saved-project preview regression, run `node scripts/launch.mjs scripts/check-preview-playback.cjs path/to/project.gaming.json`. The check forces a 700 ms visual stall, verifies one continuous narration element without backward audio seeks, and checks paused seeking.


## Sceptile setup Shorts reference

**Pokemon setup Short (Sceptile reference)** is available in Generate. It uses yellow phrase captions, large official artwork, tracked held items, source-backed move/ability cards, animated base-stat panels, and gameplay evidence at supplied spoken cues. Ask AI Changes to match the Sceptile reference to remake the current video. In Generate, upload/select footage under Optional files, add phrase and source in/out cues, then use **Remake current video with these clips**. Missing gameplay is reported; narration stays unchanged and Undo/Redo works.

See [reference analysis, implementation and verification](docs/reference-sceptile-short.md). Verify with `node scripts/verify-setup-short.mjs` and `node scripts/launch.mjs scripts/check-setup-short-desktop.cjs`.

### Google Images search

Configure **Settings ? Google Images ? SerpApi**, then use **Edit ? Search Web Images** or ask AI Changes to add/replace a named image. Generate shares this search and validated-original cache. See [implementation and test details](docs/google-images-integration.md).

### Layered reference Shorts

The **Pokemon layered Short (gold references)** preset uses the three additional supplied references to plan supporting images, narrated graphics and sound accents around the main subject. Ask AI Changes to match the gold reference style for an existing edit. See [analysis and verification](docs/reference-gold-shorts.md).

### Pokemon name recognition

Names are now recognized using an offline catalog of 1,025 species and 1,605 species/form identifiers, with speech vocabulary hints and recovery of split or misheard names. Ask AI Changes to repair names in existing edits, or supply optional **Pokemon names to expect** in Generate. The recognition report shows uncertain names/forms for review. See [behavior and verification](docs/pokemon-name-recognition.md).

### Pictures, game patterns and reactions

Use **AI Changes → Refresh game visuals & sounds** to rebuild an existing video with related intro pictures, quiet moving Pokemon/Minecraft patterns, front-facing Pokemon, brief pops/menu clicks, occasional cries and context-matched reaction GIFs. Generate has pattern/reaction controls. Narrated Minecraft block-breaking uses the original material-specific game sound. See [behavior, sources and verification](docs/game-presentation.md).

Read [caption research, nature mints and stronger hooks](docs/captions-natures-engagement.md) for the implemented palette, local battle behavior, source data and verification.

### Move effects and denser default instructions

Narrated attacks now drive full-screen fire, electricity, water, ice and other animated effects, with readable move titles, smoother transitions, matching sounds and slowly moving topic backgrounds. The old default brief upgrades to the fuller layered-edit instructions. Use **AI Changes ? Rebuild hooks, natures & effects** on an existing project. See [behavior, artwork policy and real verification](docs/move-effects-artwork.md).

### Match all five examples while keeping captions

The reference finishing pass now uses larger attack artwork, compact move labels, a clear lead with distinct supporting Pokemon and continuous framing across connecting sentences. Ask AI Changes to match the examples while keeping captions to rebuild an existing edit without changing caption text, timing or appearance. See [the comparison, adjustments and verification](docs/reference-comparison-adjustments.md).

Narration-led picture sequences, Mega-name recovery and beam/faint actions: see [docs/narration-movie.md](docs/narration-movie.md). Use **AI Changes > Animate story & fix names** to rebuild an existing project while keeping caption appearance.

Narrated expressions, side-by-side pairs, physical/special move animations and quality-preserving reuse: see [docs/narration-expressions.md](docs/narration-expressions.md). Use **AI Changes > Animate story & fix names** to remake existing projects.

Stuck captions and visuals in quick edits: use **AI Changes > Repair speech & timing** to recover missing narration words and rebuild visual timing without changing caption appearance. See [speech timing recovery](docs/speech-timing.md).


## Latest audit and learned scene direction

The October 13 audit fixes AI layout acceptance, animated resizing, metadata preservation and upload/resume, and removes repeated model loading and asset-database writes. A trained local scene selector and editorial preference model now guide reference-style choices without changing the large language-model weights. See [the audit, measured performance and training limits](docs/audit-and-reference-training.md). Verification passed 584 core tests, six transcription tests, eleven desktop workflows and native model/export checks.


### Combined guides in Script

A full production guide pasted into Script is now recognized as narration plus visual directions. The quoted script is aligned to the recording; scene instructions and supplied team data enter the visual pipeline. Pipeline evidence reports what was read and whether the requested images/build reached the generated timeline. See [the actual export comparison and repair](docs/current-export-reference-repair.md).
