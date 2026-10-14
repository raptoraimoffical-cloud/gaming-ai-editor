# AI Changes image and supplied-team repair

The failed request was: `add a picture of the guy im talking abt at the start when i say his name`.

The application now resolves that informal reference against the actual narration and current instructions, inserts the original image at the spoken name cue, and moves the editor preview to the changed moment. Static WebP photos use the still-image renderer; they previously could leave an empty animation canvas.

Quick Draft no longer rejects an otherwise accepted original named photo solely because its search score falls below the former artwork threshold. Original source identity matching is recorded separately from vision inspection and reuse permission. Search candidates are decoded and checked. The existing Google Images provider remains in use; its search budget is already unlimited. Download concurrency is bounded, which does not cap the number of images.

Concrete picture and full-team instructions have a required execution pass after ordinary visual finishing. Structured supplied sets are parsed directly, including items, abilities, natures, moves, Level and SP/EV distributions. They cannot disappear merely because the model omitted the group requirement. Missing required assets are reported rather than labeled as successful additions. General default/reference style text is excluded from this pass.

Long custom briefs retain their opening instead of losing it to the former 12,000-character tail slice. The limit is now 64,000 characters. Local model context is allocated for long input. Team data does not enter global defaults. Fresh builds still discard previous timelines, while original source files may be cached.

## Verification

- `npm run build`: passed.
- `npm test`: 525 passed, zero failed.
- `scripts/check-code-red-ai-changes.cjs`: production IPC, actual React/Electron preview and original WebP image decoding passed. Its image-provider response and model proposal are controlled fixtures. Navigation does not cancel the edit; explicit Stop does. It creates no automatic project files.
- `scripts/verify-eric-required-visuals.mjs`: actual `1012 (1).MP3` timing, actual Qwen 3.5 4B planning and configured editing-model inference, original Eric Rios publisher photo, all six exact supplied sets/items, Mega Garchomp Z and Mega Raichu Y, caption appearance and original audio preservation passed. It rendered the photo/team frames and a 2160 × 3840 build PNG. The incomplete audio ending is flagged.
- `scripts/check-eric-ai-changes-live.cjs`: the exact failed request passed through production desktop IPC with the real configured model, real recording and original source photograph. The loaded photo pixels appeared automatically at 8.67 seconds. The resulting preview was visually inspected. No project was saved.
- Undo/Redo of required image/team layers, data reports and publication warnings passed.

The live recording regression uses the photo/build portions of the supplied master brief. It does not certify every requested battle animation or a finished export of that complete brief. A live Google API call was not tested because this workspace has no saved API key; the provider path was tested with controlled responses, and the actual photograph was fetched from its identified original publisher. This limitation is recorded in the verification artifacts.

Original photo source: [Movistar eSports identifies Eric Rios](https://movistaresports.com/riopaser-hace-historia-campeon-en-frankfurt/).

The original photograph is cached in the editor's source library, without saving a project or reusing an authored timeline.
