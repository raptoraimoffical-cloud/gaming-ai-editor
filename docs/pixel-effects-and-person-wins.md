# Downloaded pixel effects and person wins

The editor includes 25 distinct original sprite-sheet animations: 20 CodeManu effects, the Soluna power aura, and rain, snow, fog and falling leaves from Weather Overlays Free. Actual downloads and a reproducible installer are in `assets/pixel-effects` and `python/install_pixel_effects.py`. Source credits and license links are retained in each library entry and video attribution export.

The renderer selects frames at each pack's cadence and preserves transparency, including tiling weather across the background. It tints the downloaded aura gold at playback and improves alpha visibility, preserving the original file. This is a gold power-up treatment of the downloaded aura, not an official Dragon Ball asset or a newly generated picture.

`applyPixelEffects` runs in the shared finishing path and the supplied-storyboard path. It recognizes narrated weather, actual self-boosting Pokémon moves using the move database's stat changes and targets, explicit stat boosts, Pokémon praise, and person victories. Weather does not cover captions. Make It Rain does not trigger ordinary rain. Good as Gold and negated praise do not trigger a praise aura. Self-debuffs do not trigger a buff aura. Elemental attacks can use downloaded impact animations on their target. Effects and trophies follow the fitted subject coordinates; a narrow character's aura uses its height rather than its width. Overlapping repeats of the same aura are suppressed.

Person recognition primarily uses the existing model's named subjects. A new fallback recovers clear names in actual player/creator narration clauses when the model omits them, excludes Pokémon and move names, and sends those people through the existing source-image resolution path. Person photos remain subject layers rather than anonymous backgrounds, allowing an attached trophy at the spoken victory cue. Generic pronouns still use the existing previous-subject context. Unidentified people are not replaced with arbitrary photos.

Automatic effects can be manually moved or deleted. Manual claims are retained, deleted layer IDs are respected, and hidden or removed owners hide their effects. The new passes preserve captions and audio and never save a generated project automatically. Cached downloads are artwork only; every new timeline is authored separately.

Validation: production build passed; 573 tests passed. All 25 source PNGs decode with real transparent and visible pixels and valid frame bounds. Native Chromium stills and a 16-second 1080 × 1920 / 60 FPS export exercise downloaded rain, snow, the gold aura, a real cached player photograph, an attached trophy and sound cues. The diagnostic uses synthetic caption timing and muted original narration; it is an effects demonstration, not a finished edit of the recording. No live Google API search was performed by the diagnostic.

Demo: `workspace/pixel-effects-check/downloaded-effects-demo.mp4`.
