# Smooth cutout combat and sourced move pictures

Combat uses bounded cubic interpolation with continuous velocity, anticipation,
arcing acceleration, small squash/stretch, recoil and recovery. It shares launch
(31%) and contact (46%) phases with projectile effects and audio. Paired attackers
stagger their contacts. Narrated actions carry the same absolute motion through
sentence cuts, blend into their original framing, and reserve room for existing
caption placement and sourced mechanic images. No speech or caption appearance
is changed. Generated prop gags, actor reactions and local animator tracks also
use the continuous curves rather than stopping at every intermediate key.

Both narrated actions and explicit battle revisions use actual move artwork when
available. Description images remain intact and persist through the attack.
Google acquisition also accepts a vision-checked actual gameplay still or GIF
when the description-image search fails. These reference pictures are kept intact,
credited and cached; they are never cut out, tiled into screen effects, or stretched
into beams. Transparent attack artwork can be a projectile. Missing images are
reported; automatic homemade move information panels remain prohibited.

Additional effects include charge light, travel trails, short contact flashes,
expanding rings, particles and elemental edge effects. These are illustrative
animation effects, not official move footage or damage simulation. A single
character PNG remains a cutout; this does not create a fully articulated character
rig or promise animation-studio output.

Validation: `node --test tests/smooth-combat.test.mjs`, complete test suite and
`npm run build`. `node scripts/verify-smooth-combat.mjs` renders controlled attacks
with existing published character/element artwork in an isolated diagnostic
workspace. Its words/timestamps are synthetic; it does not modify a user's video,
claim live Google results, or measure viewer retention.
