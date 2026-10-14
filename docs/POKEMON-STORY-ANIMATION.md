# Pokémon scene upgrades

Pokémon Shorts use a cool checkerboard and repeated Poké Ball pattern. The
checkerboard and balls move at different constant speeds across the entire
recording. Tile coordinates wrap on the pattern lattice, so new balls enter
without a jump. Narrated elemental scenes can choose a contextual palette;
uploaded backgrounds, manual colors and no-motion instructions take priority.

Automatic Pokémon music follows the game or region named in the narration,
then the current instructions. Emerald/Ruby/Sapphire select available Hoenn
tracks; FireRed/LeafGreen select Kanto tracks. The present catalogue includes
Hoenn remake and Kanto battle arrangements, rather than every original game's
soundtrack. General Pokémon scripts choose from available Pokémon battle music
per fresh version. Imported/selected music, explicit removal and a zero music
volume remain user choices. Music loops and ducks under speech. Original files
and soundtrack metadata are cached; authored timelines are not reused.

The story planner can stage supporting roles from verified evolution-family
metadata when the actual narration needs them. They are illustrative cartoon
roles, not biological claims. `perform` executes authored physical keyframes
with sourced head/face/neck/hand props and phase sound cues. `depart` executes a
complete exit and holds the absence. Props follow the moving actor and continue
through subsequent actions. The lead remains visible through role entrances.

A focused motion inference fills incomplete physical performances from the
configured trained model. It chooses physical gestures, actual role IDs, raw
narration indexes, source props and sound phases. The animation engine supplies
smooth, bounded movement for collecting, reaching, carrying, reactions, hops,
slumps, looking back, floating, recoil and exits. Invalid/invented actor
bindings are rejected. An absolute clock can be converted to action-relative
phases without changing the narrated cue. There is no mandatory episode-specific
gag in the defaults.

Final layout, source-image recovery and automatic item placement preserve these
performances. A carried object does not also become a giant standalone noun
picture. Solo-picture promotion ends before a partner enters. Cropping converts
content-relative anatomical landmarks correctly; unchanged calibrated files
retain verified anchors. Captions and the original recording are preserved.

Run `npm test` and `npm run build`. The native integration check is
`node scripts/verify-pokemon-story-upgrade.mjs --renderer-only`; it exports a
muted synthetic-narration fixture using actual source artwork, props, game audio
and the production renderer. `scripts/isolated-story-model-check.mjs` can run the
trained-model version in a separate service. Renderer-only checks do not claim
trained inference or live Google search. These features improve the editing
pipeline; they do not retrain foundation-model weights or guarantee the quality
of every generated storyboard.
