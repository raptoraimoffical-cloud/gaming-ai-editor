# Captions, nature mints and motion

The default generated/remade gaming caption palette now uses white text, selective yellow emphasis, a black outline and a dark backing. Manual caption colors, caption visibility and authored scenes remain editable. Use **Rebuild hooks, natures & effects** in AI Changes to rebuild an existing video with these features and your current supported requests; Undo restores the previous edit.

## What the research supports

No controlled gaming YouTube Shorts study establishing a universally best caption hue or a statistical retention increase was found. The implemented palette is a readability choice, not a measured retention winner. [W3C's contrast guidance](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) specifies 4.5:1 for ordinary text and 3:1 for large text. White against the actual opaque `#101722` backing measures **17.98:1**; `#fff025` yellow measures **15.19:1**. These are color-contrast ratios, not retention percentages. The backing makes that pairing independent of moving game imagery.

[YouTube's audience retention documentation](https://support.google.com/youtube/answer/9314415?hl=en) recommends reviewing dips/spikes and experimenting with openings. Color should be evaluated on a channel's actual comparable Shorts, keeping script, pace, topic, font, placement and audio as comparable as possible. Viewer cohorts and recommendation exposure can confound comparisons. The app's existing retention CSV import still informs attention planning; it does not infer a proven color effect from unrelated videos.

## Nature recognition

All 25 English nature names plus EVs, IVs, STAB, Trick Room and other competitive terms are included in Whisper vocabulary hints. Contextual repair joins split names such as `Tim id` and `Ad a mant` near spoken nature/mint/build cues. Raw transcript words, voiceover and timestamps are preserved; only caption spelling is corrected. Ordinary adjectives such as “bold move” or “serious battle” do not qualify. Recognition is not guaranteed for arbitrary audio.

Nature stat relationships are bundled from the [PokeAPI nature CSV](https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/natures.csv). Timid raises Speed and lowers Attack. Neutral natures map to the real Serious Mint instead of fabricated Hardy/Docile/etc. mint items. Nature callouts use six original game bag icons (mints sharing a boosted stat share an icon), with exact source URLs and rights notices in `electron/data/nature-mints/sources.json`. The actual sprite and its stat label appear beside the active Pokémon at the spoken cue. They do not create a second held-item attachment. [Pokémon's official explanation](https://swordshield.pokemon.com/en-au/gameplay/features-raise-pokemon/) distinguishes a mint's stat-growth effect from changing the Pokémon's underlying nature.

## Motion, battles and humor

New visual entrances use short spring pops or directional slides. Opening hooks get brief speed lines/reveal rings and up to two previews of Pokémon actually named in the first four seconds. Cast previews give way to the narrated full-size actor. Continuing explanations retain the actor without repeating its entrance.

Two Pokémon named in the same scene can now perform locally authored Thunderbolt, Flamethrower, Water Gun, Tackle or dust-brawl actions at explicit narrated action cues, even in Fast mode without a trained planner configured. Gameplay evidence, numeric charts and manual compositions are protected. Actions must fit within the scene; incomplete actions are skipped. These are illustrative animations of existing assets, not battle simulations or official footage. When a move card is present, the action is framed above it.

Sound cues follow actual entrances, cast previews, reactions and contact: mostly brief pops, swooshes for slides/projectiles, impacts for battle contact, menu clicks for selections and comic boings for narrated failure asides. Local originals now include two additional swoosh variants, a boing and sparkle. Audio remains quiet under narration and respects automatic-SFX opt-outs. Reactions additionally recognize “absurd,” “unbelievable,” and “funny”; the app places occasional contextual GIFs or brief OOPS/NOPE asides, not invented jokes or random meme filler. No-motion and restrained documentary requests suppress the added motion.

## Validation

`tests/engagement-upgrade.test.mjs` exercises all 25 natures, real sprite bytes, context/negation guards, split-name repair, timed callouts, palette contrast, manual colors, local attacks, contextual humor, SFX, idempotence and Undo/Redo. `scripts/verify-engagement-upgrade.mjs` runs real base.en speech recognition, actual generation and remake, split-ASR repair, local battle/GIF acquisition and MP4 export. `scripts/check-engagement-upgrade-desktop.cjs` exercises the actual rebuild button, preview, palette and Undo/Redo in Electron.
