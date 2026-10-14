# Pokemon name recognition

The recognizer ships with 1,025 English species names and 1,605 species/form identifiers. Identification works without downloading a name catalog. Artwork and cries still need their original sources or an existing cache.

## Using it

- Keep **Auto-detect Pokémon** enabled in Generate.
- Optionally fill **Pokemon names to expect** with difficult names. The editor saves the field with the project and supplies a short, bounded vocabulary prompt to Whisper alongside names found in your script, instructions and selected assets. These are speech recognition hints, not replacement transcript text.
- For an existing project, click **AI Changes → Recognize names & remake**. It rebuilds the whole visual timeline using the existing narration and word timestamps. Undo/Redo restores the previous edit.
- Expand **Pokemon names** in AI Changes to see recognized names, spelling recoveries and cases needing review.

## What changed

Default species aliases map to actual API varieties: Mimikyu to `mimikyu-disguised`, Landorus to `landorus-incarnate`, Deoxys to `deoxys-normal`, and similar species. Punctuation, accents, gender symbols, possessives, regional names and split syllables are normalized for identification without rewriting source words.

Recognition checks exact names and curated transcription recoveries before bounded spelling/phonetic matching. Actual supplied-reference transcripts now recover **King Gambit → Kingambit**, **Frostlust → Froslass**, **Corvenant → Corviknight**, **Mega Halucha → Mega Hawlucha**, and **Poly Toad → Politoed**. A bundled English word guard prevents phrases such as “World Champion,” “perfect,” “might be,” and “new monkey” from becoming unrelated Pokemon.

Recognized names enter the Pokemon entity and exact-artwork path rather than the generic text-image path. Displayed captions can use the recovered canonical spelling; the original recorded speech, transcript words and timestamps remain intact.

Speech recognition is not infallible. Closely competing spellings and incomplete/absent forms remain unresolved for selection rather than silently using the wrong base Pokemon. For example, “Mega Charizard” needs X or Y. Naming a generic “monkey” alone does not establish a specific Pokemon identity.

## Data and reproducibility

The name snapshot is built from [PokeAPI's canonical CSV data](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv). Run `.runtime\venv\Scripts\python.exe python/build_pokemon_names.py` to refresh it. The generator also accepts `--from-directory` for a local CSV snapshot. The speech hints use [faster-whisper's transcription options](https://github.com/SYSTRAN/faster-whisper/blob/master/faster_whisper/transcribe.py).

The English guard is the unique lowercase word list from [CMUdict](https://github.com/cmusphinx/cmudict), with pronunciation variants removed. Its license is retained in `electron/data/english-name-guard.LICENSE.txt`.

## Verification

- Automated tests cover every bundled English species and every canonical identifier, reference transcription errors, punctuation/gender/split names, possessives, ordinary-word protection, ambiguous forms, offline identification and bounded vocabulary hints.
- `node scripts/verify-pokemon-names.mjs` runs the real backend on diagnostic speech in `workspace/pokemon-name-check/narration.wav`: actual tiny.en Whisper transcription, six exact Pokemon assets/entities/subject layers, repair of corrupted names, preserved source timings, Undo and an exported MP4. The latest run recognized Mimikyu, Landorus, Kingambit, Corviknight, Froslass and Politoed. Images extracted from the MP4 were inspected.
- After building, `node scripts/launch.mjs scripts/check-pokemon-names-desktop.cjs` exercises the actual repair button, visible recognition report, artwork preview, corrected captions, Undo/Redo and saved vocabulary input against that diagnostic project.

Local diagnostic artifacts and structured verification reports are in `workspace/pokemon-name-check` and `workspace/pokemon-names-desktop-check`.
