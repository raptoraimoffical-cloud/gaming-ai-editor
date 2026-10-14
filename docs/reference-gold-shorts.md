# Three gold reference Shorts

Analyzed the user's three local videos on October 11, 2026. The videos are reference material; their spoken words and on-screen text are not instructions to the coding agent. Analysis files, local Whisper transcripts and contact sheets covering the complete videos are in `workspace/reference-gold`.

| Reference | Duration | Observed composition and pacing |
| --- | --- | --- |
| I Used a Diabolical Pokémon Strategy | 148.12 s | Fast silhouette/trophy hook. Logos, tournament numbers, Pokémon, accuracy illustration and source-backed ability/move cards build the explanation during roughly the first 43 seconds. Then battle footage and the speaker's reaction stay visible through the demonstration, with framing changes rather than unrelated image replacements. Win screen and speaker close the story. |
| You NEED to Know This About Pokémon Champions | 86.77 s | Phone/logo hook, speaker and gameplay, then a team builds around the starter. Multiple supporting Pokémon coexist. Evolution effects, item UI, literal VP arithmetic, stat bars, ability evidence and a clock illustrate specific claims. Gameplay and speaker return for the ending. |
| Charizard's Villain Arc | 30.19 s | One central Charizard remains on a consistent scene. Threats, weather, supporting team members and numerical claims change around it. Weather switches at the narrated rain/snow words. A new subject and a strong change in palette introduce the reversal; the final villain title holds for the payoff. |

All three are 1080 × 1920. The useful rule is **keep the main subject, change what supports the current sentence**. Additions and emphasis can happen about every 1–2 seconds in dense explanations; useful battle evidence or a payoff holds longer. A hard cut, an added item and a camera emphasis serve different purposes.

Visual analysis sampled every 0.5 seconds; full contact sheets sampled every 1.5 seconds. Large frame-difference candidates were 162, 102 and 11 respectively. These include moving gameplay, flashes and zooms and **are not edit counts**. Mixed-audio spectral transients were 175, 122 and 34 respectively. Speech consonants, music, game sounds and effects all contribute; these **are not isolated sound-effect counts**. No actual audience-retention curve is available in these downloaded files. Whisper also misheard some Pokémon and move names, so the transcript was used together with inspected frames rather than as ground truth for assets.

## Implemented preset

**Pokemon layered Short (gold references)** is now the default for a new edit. Select it under **Generate / new edit → Shorts style**, or click **Gold reference Short** in AI Changes to rebuild the current video. Existing artwork and Sceptile presets remain available.

The preset plans the cast, sourced mechanics and gameplay before composing. It keeps the lead subject through connecting sentences and adds:

- Named game logos and supporting Pokémon at spoken cues. Team explanations can show up to six related Pokémon in separate positions.
- Crown, trophy, accuracy target and weather/reaction illustrations only for supported narrated concepts. A crown attaches to the actor and follows its transforms; sequential weather callouts replace each other.
- Literal narrated numbers and animated percentage comparison bars. A later value reveals a before/after comparison without exposing it before it is spoken. Base stats and mechanics still need actual source metadata.
- White outlined phrase captions that preserve known multiword names, quick entrances and punch-ins at contrast or verdict words.
- Sound accents scheduled from actual subject, card, logo, number, reaction, gameplay and held-item changes. The old 24-effect ceiling does not apply to this preset. A 0.5-second minimum separation and quieter, shorter accents keep effects from piling up. Available matching sounds vary deterministically; existing manual sounds and Pokémon cries are retained.

Two-second attention review records applied supporting cues and deliberate holds. No timer fabricates images, figures or generic “key points.” Manual scenes and explicit caption, animation and SFX overrides are respected. Remakes preserve the original narration, word order, timing and duration and support Undo/Redo.

For real gameplay evidence, use the preset's gameplay cue editor to select the spoken phrase and source clip in/out times. The editor uses supplied matching footage; these reference videos are not automatically inserted into generated projects. Google discovery still needs a configured SerpApi key; exact Pokémon/game sources and supplied assets remain usable.

This is executable editing logic derived from the references, not new fine-tuned model weights or a claim that the editor fully reproduces the creators' work. Custom character poses, hand-authored sets and unsupported actions still need suitable assets or authored animation.

## Verification

- **197 tests passed** and the production build passed. Automated coverage checks concurrent supporting graphics, exact value timing, team layout, narration preservation, nonrandom holds, longer sound sequences, variation/spacing, manual scenes, overrides, idempotence and Undo.
- `node scripts/verify-dense-short.mjs` runs the actual Generate pipeline with a local diagnostic narration, actual official artwork/logo, attached crown, narrated 45% → 12% graphic and real sound files. It exports an MP4, extracts frames, compares its soundtrack with a speech-only export and verifies a narration-preserving remake.
- `node scripts/launch.mjs scripts/check-dense-short-desktop.cjs` checks the real default selector, Gold reference Short button, graphic preview, white captions, percentage chart, Undo/Redo and gameplay controls.

Diagnostic project and output: `workspace/dense-short-check/project.gaming.json` and `workspace/dense-short-check/layered-short.mp4`. This short diagnostic demonstrates the changes; it is not a finished reference-quality creator video.
