# Repairing stuck captions and visuals

Some old quick edits contain broken Whisper timestamps: one word spans 20–28 seconds and later speech is missing. Visual planning then holds the same subject because it has no new spoken cues. Restarting playback cannot recover missing transcript words.

Restart the editor, open the affected project, and choose **AI Changes → Repair speech & timing**. It reads the original narration again, recovers word timestamps, and rebuilds subject images and effects from those words. The original narration, video duration and caption appearance stay the same. The change supports Undo and Redo.

New projects recognize overlapping sections of at most about 19 seconds, with independent decoding and a voice activity check. Suspect sections retry in smaller windows. Failed recovery stops generation with an error instead of silently producing frozen captions. Verified results are cached by audio content, model, device, vocabulary and recognition code.

Quality Check flags stretched or collapsed timestamps in old projects. Long gaps without recognized words are review warnings, since they can also be intentional silence. Old damaged words stop highlighting after a bounded interval in preview; repairing speech recovers the actual missing content. Remaking an edit with known damaged timestamps repairs speech first.

Verification:

- `npm run build`
- `npm test`
- `.runtime\venv\Scripts\python.exe python/test_transcription_timing.py`
- `node scripts/launch.mjs scripts/check-speech-timing-desktop.cjs path/to/affected.gaming.json`

The desktop check uses the actual repair button, verifies caption styling and Undo/Redo, and plays the whole 87-second regression recording to check changing captions, changing visual layers, narration continuity and picture synchronization.
