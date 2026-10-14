# Images, quiet game backgrounds, reaction GIFs and game sounds

New edits use **Subtle moving game patterns** and **Contextual reaction GIFs with matching sounds** by default. The controls are in Generate and are saved in the project. For existing edits, **AI Changes → Refresh game visuals & sounds** runs the real remake pipeline without requiring an editing model. Undo/Redo restores the old composition and sounds; narration and word timings remain unchanged.

## Pictures and backgrounds

Empty opening spans now receive an actual related game logo or a subject from the narrated topic. Pokemon uses the bundled English brand logo, including on a fresh install without a search key. Connecting speech can retain an established related picture. A missing specifically named subject stays reported; a different Pokemon is not substituted for it.

Pokemon explainers use a low-contrast Poke Ball pattern with slow, continuous movement. Minecraft explainers use a block pattern. These are editable SVG layers animated by the video renderer, so the background moves in preview and export. Uploaded/generated/manual backgrounds and supplied gameplay proof remain supported. Disable the pattern option to use scenery; a no-motion instruction stops decorative movement.

Automatic Pokemon selection prefers front-facing artwork or front sprites. Selected back-sprite uploads do not win automatic subject selection. Narration explicitly requesting a back/rear view can retrieve an exact back sprite. Manually authored compositions remain intact.

## Sounds

Most picture/card entrances use brief soft pops. Occasional Pokemon menu clicks and spoken choose/select/switch cues use a Pokemon Red menu effect rendered from its documented square-channel note parameters. This is a source-derived synthesis, with attribution, rather than a recording of the original console. Narrated impacts and authored battle actions can keep impact sounds. Cries are quieter and spaced at least six seconds apart, with one automatic cry per species per pass.

Minecraft sounds now follow action phrases, including **break stone blocks**, **break wood blocks** and **break glass blocks**, instead of the word “block” alone. If needed, the editor indexes the official asset catalog automatically, downloads the exact event recording and verifies its hash. Failures are recorded in the sound log. Replanning preserves these action sounds without inserting duplicates.

## Reaction GIFs

Positive fear, surprise, confusion and laughter cues can select brief animated reactions. A narrated “scary” cue can show the actual chattering-dog GIF with matching original chatter Foley. Other curated reactions include a surprised cat, a confused reaction and a funny dog. Your uploaded animated assets tagged `reaction fear`, `reaction surprise`, `reaction confusion` or `reaction laughter` take precedence. Source metadata is retained with downloaded clips.

The planner checks decoded animation, aligns the reaction to the spoken word, keeps it brief, leaves eight seconds between reactions, and avoids authored battle, gameplay proof and chart/card beats. Negated fear cues do not trigger reactions. Reaction audio requires the corresponding inserted GIF layer. Disable reactions or request no GIFs/no motion to stop them. Additional matching GIFs can come from the permitted library, Commons or configured Google Images; failed searches are visible rather than represented as completed work.

## Verification

The automated suite covers blank-hook coverage, movement and quiet pattern styling, explicit backgrounds, gameplay preservation, missing identities, front/back selection, offline logo availability, negation and reaction frequency, GIF/sound alignment, reaction-specific validation, material-specific Minecraft events, indexing and idempotence, pop/menu selection and real generated audio bytes.

`scripts/verify-game-presentation.mjs` runs actual tiny.en speech recognition and Generate, checks front artwork and the intro image, downloads and validates the 90-frame chattering-dog GIF, verifies pops/menu/cry/chatter placement, repairs an empty-layer project with Undo, exports MP4, extracts inspection frames, and retrieves an actual hash-verified Minecraft stone-breaking recording. It uses diagnostic narration in `workspace/game-presentation-check/narration.wav`.

`scripts/check-game-presentation-desktop.cjs` checks the real refresh button, preview logo, pattern, GIF, sound alignment, report, Undo/Redo and new Generate controls after building. Reports and the inspected sample export are in `workspace/game-presentation-check` and `workspace/game-presentation-desktop-check`.

## Asset sources

- [English Pokemon brand logo](https://commons.wikimedia.org/wiki/File:International_Pok%C3%A9mon_logo.svg), with source information bundled beside the image.
- [Pokemon Red A/B sound notes](https://github.com/pret/pokered/blob/master/audio/sfx/press_ab_1.asm), retained as note parameters with attribution.
- [Chattering dog](https://tenor.com/en-CA/view/dog-chattering-teeth-scared-spooky-gif-22755553), [surprised cat](https://tenor.com/view/shocked-gasp-cats-gif-5762916), [confused reaction](https://tenor.com/view/old-man-confused-idk-clueless-help-gif-14043805), and [funny dog](https://tenor.com/view/byuntear-meme-react-funny-dog-gif-25019867). Public availability does not establish a blanket reuse license; original source and rights-holder notices remain in the asset and export credits.
- Original Minecraft recordings use the official version and asset catalogs already supported by the editor, with hash verification and original-source metadata.
