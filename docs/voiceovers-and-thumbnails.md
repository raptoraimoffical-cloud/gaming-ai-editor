The main navigation now has Edit, Voiceovers, Thumbnail Creator, Assets and
Settings. Storyboard/reference and animation tools are available from the
Workspace selector inside Edit. Game libraries are grouped under Assets;
model and online-image configuration are grouped under Settings.

In Voiceovers, upload the original uncut recording or select an existing one.
Natural and relaxed modes retain their spacing styles. Tight / Shorts closes
every confidently detected non-speech gap of at least 28 ms, including short
gaps and head/tail silence, leaving a very small phonetic margin and a 12 ms
interior spacing target. Explicit pause-to-read/hold cues remain protected; any
individual cut can be unchecked to restore it.

Recognition uses small.en and independent six-second passages to capture all
takes instead of dropping repeated starts. Unmodified transcription data can be
cached; cleanup decisions and audio are always rendered afresh. Tight VAD has
no hidden 400 ms padding. Waveform-confirmed silence can be removed even when
a speech timestamp spans that pause. Very quiet words and voiced consonants
are protected. Isolated speech onsets/tails align discarded-take boundaries
without crossing neighboring retained speech.

The connected local or hosted reasoning model reviews exact repeated/fragment
take candidates. A removal must name the later matching replacement kept in
the recording. Candidate IDs carry actual source ranges and quotes, avoiding
model counting/copy errors; other proposals can resolve only against literal
source quotes. Unique narration, intentional repetition and uncertain repairs
remain. The cleaned transcript shows retained words, with the original
transcript available in the result data. No new spoken audio is generated.

Voice tone is preserved: no FFT noise subtraction, EQ or dynamic loudness
normalization. Optional Balance volume measures the edited signal and applies
one constant gain capped at a -1.5 dBFS sample peak. Breath reduction uses smooth
sample ramps only in detected non-speech regions. Four-millisecond Tight joins
and eight-millisecond Natural joins avoid hard splice clicks. Intermediate
rendering uses float WAV; the final export is 48 kHz PCM WAV.

The original recording remains untouched. Compare recordings, restore cuts,
update the preview, and export WAV or explicitly use the cleaned take in a
video. Imported clean takes retain their original source and readable filename;
re-cleaning them uses that original when available instead of stacking cleanup.
Missing models/uncertain retakes display a warning rather than inventing edits.

In Thumbnail Creator, paste instructions, optionally paste the script, choose
Shorts or regular YouTube, and optionally supply your own images and headline.
The connected local or hosted reasoning model plans this specific composition.
Explicitly requested Pokemon forms and quoted headline/secondary text are
preserved even if the model omits them. Missing required source images report an
explicit error instead of accepting a partial team. Optional model color and
geometry fields are normalized without discarding subject identities. Duplicate
headline/subtitle labels are removed before composition. There is no six-subject or four-image
fallback limit. Source images, foreground focus, supporting characters, items,
custom labels and the background are separate editable layers.

The compositor changes source pixels locally: silhouettes preserve transparency
and turn the actor black; question marks follow that actor; background removal,
crop, mirroring, rotation, grayscale, tint and normalized placements are
supported. Items can attach to a named character's head, face, neck or hand.
A mystery trainer is built from an original game trainer sprite, blacked out,
with the requested question mark. It never searches only for a nonexistent
finished mystery image. When that source is unavailable, an original anonymous
trainer illustration can be constructed offline. Missing stadium backgrounds
can use an original illustrated tournament arena rather than a game menu/UI.

Use the Edit this thumbnail textbox and Apply changes to revise the current
design. Existing source layers and secondary text are retained unless changed.
A request which produces identical pixels reports an error instead of claiming
success. Make a new version always starts a new plan and render from the current
creation brief. New requests never load an old finished thumbnail by prompt.
Each has a fresh variant, with changed staging, trainer poses and lighting.
Cached unmodified source assets can be reused to avoid repeated downloads.

Silhouettes and source composition need no image-generation service. New bitmap
art uses the optional local or remote Stable Diffusion WebUI API configured under
Settings (enable its API and supply the endpoint). Create new artwork with my
image model supports fresh text-to-image artwork, or image-to-image when an
uploaded source is supplied. The endpoint must be running; reasoning models do
not themselves synthesize bitmap images. Named Pokemon forms still use exact
original assets. See https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API.

Preview, review sources and export a JPEG. Only the current result is held in
memory for editing/export; replaced composites are removed and private preview
images are cleaned up when the backend closes. No thumbnail project is saved or
automatically recovered. Export explicitly copies the image to the chosen path.
No click-through score is invented.

The format sizes follow YouTube's current guidance: Shorts 2160 by 3840 and
regular video 3840 by 2160. Custom Shorts thumbnails are uploaded through
YouTube Studio on a computer. See https://support.google.com/youtube/answer/72431.

Both workflows show the existing progress/Stop controls. Switching tabs
preserves the tool's result and does not cancel its background task. Generated
audio/images use private working files for preview. They do not save or recover
video projects; Export and Use are explicit actions.
