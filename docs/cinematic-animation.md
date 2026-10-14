# Cinematic Pokémon scenes

The supplied Charizard Short is the standing animation and presentation reference. Its story is not a default script. The app adds general cinematic direction to Pokémon projects and applies an executable finishing pass after choreography, source-card placement and overlay layout. Shorts retain their existing gold-reference planning rules. Captions and narration are unchanged.

## What the reference contributed

The clip retains a grounded lead and one continuing environment while supporting characters assemble, threats arrive and the atmosphere changes. Frame sequences inspected at 0–0.48, 4.55–5.03, 6.22–6.70 and 18.82–19.30 seconds show arrivals, travel, contact accents and a reveal within a coherent stage. These are motion-design observations, not retention statistics or a template that forces the same Pokémon, setting or opening onto other videos.

## Executable changes

- Fighters, projectiles, attached props and ground shadows share a world camera. Source backgrounds move at a slower depth. Camera envelopes track current visible artwork and return to rest; contact lighting uses the existing attack clock. An ineffective attack gets no contact flash.
- Fast character movement gets bounded directional shutter blur. Idle art, move descriptions and manual framing stay sharp and steady.
- Real item icons activate with a short eased flight, rotation and glow, then settle onto the existing attachment. Transparent source type/ability icons can activate too. Anatomical placement still uses measured/verified anchors; this is not a new guessed anatomy system.
- Spoken weather cues start rain, snow, sunlight or wind motion and atmospheric lighting. Existing animated source weather is reused without duplicate procedural rain. Neither an attack keyword nor a future weather mention changes the environment early.
- Continuing casts use match cuts; new casts receive a short camera settle with a coordinated whoosh. Explicit user transitions and hard-cut instructions retain priority.
- The existing Google Images integration finds clean source scenery. Originals are decoded and checked; high/ultra modes use the configured vision model. Without vision, documented empty scenery is required. Busy gameplay screenshots are rejected. An accepted cached source image can be reused, while its composition, camera and animation decisions are rebuilt.
- Source scenery, atmosphere and lighting layers are editable/deletable. Full-canvas weather layers remain selectable in the timeline while preview clicks reach the Pokémon underneath. Manual edits survive finishing, deletions stay deleted, and the Manual edit cinematic checkbox supports Undo. Scoped remakes splice camera/weather windows without changing neighboring seconds.

## Verification and limits

`tests/cinematic-scenes.test.mjs` covers phase timing, attachment/world affinity, source-card stability, weather negation, fresh rebuilds, clean scenery checks, manual deletion/Undo and scoped camera windows. `scripts/verify-cinematic-scenes.mjs` renders actual source Pokémon artwork, a real item icon, source scenery and a published move screenshot through the production composition. It saves diagnostic PNGs and reports, not editor projects. The diagnostic script/timing are synthetic and its narration is muted.

`scripts/verify-cinematic-plan.mjs` checks a real connected trained model producing current-instruction actions that reach the cinematic executor. It does not fine-tune a model. The scene system animates 2D source artwork and GIFs; it does not articulate character joints or simulate a 3D battle. Rendered checks establish the new behavior, not guaranteed equivalence to a human motion designer in every future scene.
