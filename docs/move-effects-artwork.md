# Move effects, artwork and denser edits

Generate and the actual AI Changes remake pipeline now finish with narrated move effects, smooth visual transitions and matching sounds. For an existing project, use **AI Changes → Rebuild hooks, natures & effects**. Undo/Redo restores the rebuilt layers and reports.

## Narrated moves

A performed attack such as “Charizard uses Flamethrower” produces a word-timed move title and an animated screen effect. Fire has rising flames, embers and a lingering scorched edge; electric attacks have lightning, water attacks have waves and droplets, ice attacks have crystals and cracked edges. Grass, psychic/ghost and other attacks have their own illustrative effects. Captions render above these effects. The animation can continue across sentence boundaries without restarting and ends before the next move.

Learning, explaining or negating a move produces its relevant title without pretending an attack happened. Existing sourced move cards avoid duplicate titles. Explicit limits on effects or motion, manual layouts and supplied gameplay are respected. These are locally rendered illustrative animations, not official move footage or a battle simulator. Context detection remains a rule system and can require review for complicated sentences.

Move metadata comes from PokéAPI. Ten sourced core moves are bundled for offline fallback: Flamethrower, Thunderbolt, Water Gun, Ice Beam, Surf, Hydro Pump, Tackle, Leaf Blade, Psychic and Shadow Ball. The online move catalog supports additional named moves. Caption-only repairs handle split “flam thrower” and “flamthrower”; the original spoken words and timestamps stay intact.

## Pictures and backgrounds

Ordinary Pokémon narration prefers clean artwork. With a configured SerpApi key, automatic discovery tries Google Images first, using the exact species/form and artwork query. Only candidates with source evidence and a successfully decoded original that passes eligibility checks are automatically used. Downloaded Google images keep their original source and rights information; they do not inherit the sprite repository’s license.

When Google is unavailable or has no suitable result, the editor uses exact official artwork, then an available front model render/static source. Ordinary narration does not automatically fall back to Showdown. Narration or a specific user directive about Showdown/sprites, model renders or the Pokémon’s back selects that context. A model render is a static image, not a newly generated 3D model. Uploaded and explicitly selected images remain authoritative. Missing exact artwork is reported for review.

Quiet, slowly moving game patterns now also reflect narrated fire, water, electricity, ice, forests or psychic/ghost topics. Supplied backgrounds and gameplay are preserved. Short visual crossfades and softer noise-based swooshes accompany actual scene changes. Move-specific original sound accents play below narration, alongside the existing pops, game sounds and cries. Transitions blend visuals without playing the outgoing voice again.

## Default instructions

The new default brief asks for a planned visual story, a busy layered opening hook, plenty of relevant pictures and coordinated effects throughout, a meaningful focus change about every two seconds with useful holds, contextual items/nature mints/memes, move consequences, sourced numeric graphics, moving topic backgrounds and smooth audio accents. It keeps captions readable and honors explicit user limits.

The exact old default is upgraded when loading or rebuilding a project. Other custom instructions are preserved, including appended reference-style instructions. The brief guides planning; it does not guarantee a precise visual count or access to unavailable images.

## Verification

- `npm test`: 242 tests passed, including artwork policy, configured Google transport fixtures, default migration, attack/negation context, cross-scene effects, opt-outs, timing preservation and transition sounds.
- `npm run build`: passed.
- `node scripts/verify-move-effects.mjs`: real `base.en` transcription, generation, an actual remake of a stripped project, official artwork, fire/electric/water/ice effects, matching sound events, moving backgrounds, unchanged narration timing, Undo and a rendered MP4. Rendered frames were visually inspected.
- `node scripts/launch.mjs scripts/check-move-effects-desktop.cjs`: actual rebuild button, live fire effect in preview, source reports, default migration and Undo/Redo passed.

Evidence is under `workspace/move-effects-check` and `workspace/move-effects-desktop-check`. No Google Images key was configured during verification. Google-first acquisition was tested with mocked configured transport; the real generation and export used official-artwork fallback. Live Google search remains unverified until a SerpApi key is configured.
