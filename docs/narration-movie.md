# Narration-led picture sequences and actions

Open an existing project and use **AI Changes → Animate story & fix names**.
This runs a full remake with local composition rules, image acquisition and
word-timed animations. It preserves caption appearance and original speech
timings while correcting recognized Pokémon display spellings. Undo/Redo
restore/reapply the complete edit. **Match examples - keep captions** still
preserves caption text as well as appearance exactly.

## Name recovery

The bundled 1,025-species / 1,605-identifier vocabulary now recovers Mega base
name misspellings before resolving the exact Mega form. Examples include
“Mega Setile”, “Megga Salmence”, “Mega Gardeviour”, “Mega meta gross”, “Basky
Legion” and the actual diagnostic Whisper result “Bascule Jun”. Common English
words cannot be consumed as extra name syllables. Ambiguous Mega Charizard
without X/Y and unavailable forms still require review; recognition is not
guaranteed for every possible mishearing. Audio and raw transcript timings
remain intact.

## Visual planning

- Future Pokémon cast previews have been removed. A final reveal pass clamps
  automatic character artwork to its first actual spoken mention.
- Literal descriptions can receive uploaded or published sourced pictures: small/large, speed/slowness, strength/weakness, time, money,
  strategy/ideas and questions. Small narration visibly shrinks an editable
  actor. There are no “KEY POINT” placeholder graphics.
- Actual word-timed visual changes are reviewed across sentence boundaries at
  roughly two-second intervals. When no new subject is spoken, a brief camera
  emphasis can refocus the existing actor without duplicating its image. A reveal due within 0.35 seconds
  gets a short grace period instead of competing filler. Complete actions,
  charts, specific explanations, gameplay and manual compositions take priority.
- Fast, slow and strong reactions join the existing fear/surprise/confusion/
  laughter GIFs. Each download is decoded and must contain multiple frames.
  Reaction clips cannot be treated as permanent characters or carried into an
  unrelated sentence. Missing images/GIFs and unfilled gaps remain visible in
  reports rather than being filled by unrelated characters.

The additional reaction sources are [Sonic moving quickly via GIPHY](https://giphy.com/gifs/regalmovies-sonic-the-hedgehog-movie-2-sonicmovie2-4V6WygyIPjzbttRpHB),
[Zootopia's slow sloth](https://tenor.com/view/zootopia-sloth-late-reaction-slow-gif-5158412)
and [a strong flex reaction](https://tenor.com/view/strong-flex-gronk-tough-show-off-gif-20310210).
Source attribution and rights-holder notices travel with each asset; the
importer does not assert a blanket reuse license.

## Narrated actions

One-shot, OHKO, knockout, wipe-out and beam phrases can produce choreography
when the exact attacker and opponent are identifiable. An explicit “it” can
refer to one unambiguous, already introduced opponent. The sequence waits for
both names and shows category-appropriate contact or a projectile, impact and
recoil/faint. Unspecified one-shot claims use an illustrative contact attack;
explicit beams use the attacker primary type. Named moves use real move data.
Keyframes and effect progress continue across sentence cuts. A fainted target
does not automatically return until it is mentioned again. A beam claim alone
does not invent a knockout. “One shot” is an action idiom, not a fabricated
number-1 card.

Negated or ambiguous claims, missing assets, too-short action windows, manual
layouts, gameplay evidence, charts and no-motion instructions are protected.
Choreography illustrates narration; it is not a damage calculator, legality
check or game simulation. Beam/contact sounds take priority over generic reveal
pops and remain below narration.

## Verification

`tests/story-movie.test.mjs` covers exact forms, sentence-word boundaries,
English-word guards, reveal timing, cross-scene attacks, faint persistence,
negation/protection, picture spacing, GIF evidence, caption appearance and
Undo/Redo. The full test suite and TypeScript/Vite build pass.

`scripts/verify-story-movie.mjs` transcribes a real Windows SAPI voice through
Whisper, acquires exact artwork/GIFs, remakes a deliberately damaged transcript
containing the reported name spellings, renders sample frames and exports an
MP4. `scripts/check-story-movie-desktop.cjs` clicks the actual button and verifies
displayed name corrections, caption CSS, visible animated actors and Undo/Redo.
Evidence is in `workspace/story-movie-check/`, including `verification.json`,
`desktop/verification.json`, sample PNGs and `story-movie.mp4`.

Automatic Google Images still requires the editor's SerpApi setting. These
checks use exact artwork and validated public reaction sources without that
key. This update changes the planner and renderer; it does not train new model
weights or claim measured viewer-retention improvements.

See [expressions, sourced move art and quality-preserving caches](narration-expressions.md) for the current interaction pass. The old speech-bubble picture filler has been removed.
