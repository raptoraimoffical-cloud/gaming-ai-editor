# Expressions, sourced interactions and reuse

Use **AI Changes > Animate story & fix names** to rebuild an existing project.
The pass also runs during new generation. Caption appearance, source speech
and word timings remain unchanged during this remake; recognized display
spellings can be corrected. Undo/Redo restores the actual scene changes.

The narrator's “on paper” or “in theory” gets a sheet of paper behind the
character. It folds into a published crumpled-paper image at “but”, “actually”,
“practice” or “reality”, or after a short hold. Paired Pokémon appear beside
each other after both names are spoken. “Bad”, “terrible”, “useless”, “awful”
and “disappointing” can add a brief sad-face sticker that tracks the current
character. Negations, ambiguous pairs, gameplay, charts and locked subjects
are protected. These are supported phrase interpretations, not a guarantee of
understanding every possible expression.

The speech-bubble fallback and its duplicate Pokémon picture are removed.
Quiet gaps instead move the established actor; meaningful descriptions use
sourced props, and existing contextual GIFs remain available. Complete actions
and useful explanations can hold their composition.

Move facts now retain `damageClass` as well as type. The offline catalog contains
937 records from the [primary PokéAPI data repository](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv).
Physical moves lunge and make contact; special moves use a type-colored
projectile. Leaf Storm uses a spiral of sourced leaf images. Thunderbolt uses
a sourced lightning bolt. Uploaded art tagged `move:leaf-storm` (or another
exact move identifier) takes precedence. Status moves and descriptive statements
such as “that is a special attack” do not fabricate damaging battles. Named
attacks wait for the opponent name; a new sentence cannot silently provide an
unrelated target. Knockouts are illustrated only when the narration claims one.

Props prefer transparent uploads tagged `prop:paper`, `prop:leaf`,
`prop:lightning` or `prop:sad`. With Google Images enabled and a configured
SerpApi key, acquisition can search and decode original prop/move images,
reject unrelated merchandise, and remove opaque backgrounds locally. Sources
and rights notices remain attached. Search results are not automatically
claimed to be official move footage. With no usable external image, the app
uses bundled published art: [Twemoji graphics](https://github.com/jdecked/twemoji)
under CC-BY 4.0 and [Degri's crumpled paper](https://commons.wikimedia.org/wiki/File:Ball_of_paper.svg)
under CC0. The bundle contains 22 transparent images, not newly generated
replacement drawings. Current live Google acquisition still needs a configured
key; the diagnostic used bundled props and actual Pokémon artwork.

Opaque cutouts use the local trained
[IS-Net general-use model via rembg](https://github.com/danielgatis/rembg).
`requirements.txt` pins the dependency. Its weights download once under
`.runtime/models/segmentation`; this workspace has them installed. The worker
keeps the model loaded, changes only alpha, preserves original RGB/resolution,
and rejects empty/unchanged segmentation. This is segmentation, not generative
image synthesis; complex pictures can still need a different source or review.

Reuse optimizations preserve the processing and export settings:

- Content-keyed cutouts, persisted selected prop/move originals and existing
  download caches avoid repeated model inference and image research.
- Pokémon JSON parsing and the canonical-name index are reused until cached
  files change. Catalog merging uses a set rather than repeated list scans.
- Re-registering unchanged library entries skips SQLite export/write. Library
  snapshots invalidate on writes or an external database update.
- Remotion compilation is shared by preview/review/export in the running app.
  A source-content fingerprint invalidates it after code, style or data changes;
  concurrent requests share compilation and failures remain retryable.

The measured diagnostic cutout took about 5.6 seconds on its first pass and
7.4 milliseconds from cache, at the same 768×768 dimensions and unchanged RGB.
This is a cutout-stage measurement, not a promise of that speedup for a whole
video. Resolution, frame rate, CRF, audio quality, transcription model, candidate
budget and review passes were not reduced.

Verification: `npm test`, `npm run build`,
`node scripts/verify-narration-expressions.mjs --reuse`,
`node scripts/verify-story-movie.mjs --reuse` and
`node scripts/launch.mjs scripts/check-story-movie-desktop.cjs`.
The expression diagnostic uses real local Whisper transcription of Windows SAPI
speech with an explicitly supplied aligned script, then the actual remake,
rendered stills and MP4 export. Reports and frames are under
`workspace/expression-check`; it checks caption appearance, speech timings,
exact actors, move categories, removal of bubble filler, and Undo/Redo.
