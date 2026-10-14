# Manual editing and game music

Open **Edit → Manual Edit**, or click a preview object. Drag a free-standing
object in the preview to reposition it. The toolbar duplicates, splits at the
playhead, replaces or deletes the selection. Add an image/GIF/video from the
library or import it, choose its ending time, and add it at the playhead. Text
overlays use the same timing. Each manual action is a reversible history entry.
Ctrl+Z undoes, Ctrl+Shift+Z redoes, Delete removes the selected object and Ctrl+D
duplicates it; shortcuts do not run while typing in a field.

Entrance/exit controls replace inherited AI opacity tracks, so a manual fade
can actually make an AI-generated object visible. Custom movement uses poses
saved at the playhead, with smooth interpolation between them. Splitting a clip
retains its source offset and animation clock. Manual edits are protected during
ordinary automatic finishing; a whole-video remake still intentionally builds
a fresh edit. Narration is kept separate from all music and sound operations.

**Audio** provides music selection, video start/end, source offset, volume,
fade in/out, looping, and automatic ducking under narration. Sound clips can be
added at the playhead, replaced, moved, trimmed, adjusted or deleted. The same
music settings are evaluated in preview and export, including continuous fades.

**Game Music** contains 17 Pokemon tracks from the actual Showdown music catalog
and 5 Battle for Wesnoth tracks, plus music from the indexed Minecraft Java
assets (86 tracks in the installed 1.21.8 index). Tracks are previewable and cached after download.
The original source and credit accompany the files. Pokemon soundtracks remain
copyrighted; their availability does not confer a reuse license. Wesnoth track
licenses/credits follow its per-file `copyrights.csv`. Imported local music can
also be selected. This does not relabel game OST files as royalty-free music.

Sources:
- https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/battle-animations.ts
- https://github.com/wesnoth/wesnoth/blob/master/copyrights.csv

Validation: `tests/manual-editor.test.mjs`, the isolated Electron integration
check `scripts/check-manual-editor-desktop.cjs`, and actual download/decoding
checks in `scripts/verify-game-music.mjs`.
