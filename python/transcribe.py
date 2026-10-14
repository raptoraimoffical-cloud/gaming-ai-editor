"""Local word-level recognition, with bounded decoding and timing recovery."""
import argparse
import hashlib
import json
import os
import time
from pathlib import Path

from transcription_timing import audit_words, merge_windows, recognition_windows


def progress(stage, percent):
    print(json.dumps({'stage': stage, 'percent': percent}), flush=True)


def transcribe(audio_path, model_name, device, names, terms, all_takes=False):
    import numpy as np
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio
    from faster_whisper.vad import get_speech_timestamps, VadOptions

    samples = decode_audio(audio_path, sampling_rate=16000)
    duration = len(samples) / 16000
    speech = [{'start': s['start'] / 16000, 'end': s['end'] / 16000}
              for s in get_speech_timestamps(samples, VadOptions(min_silence_duration_ms=250))]
    model = WhisperModel(model_name, device=device,
                         compute_type='int8' if device == 'cpu' else 'int8_float16',
                         download_root=str(Path(__file__).resolve().parent.parent / '.runtime/models'))
    # Prefer a nearby quiet boundary; overlap supplies context when speech is continuous.
    energy = np.sqrt(np.mean(np.square(samples[:len(samples)//320*320].reshape(-1, 320)), axis=1))
    windows = recognition_windows(duration, energy.tolist(), maximum=6 if all_takes else 18)
    language = 'en' if not model.model.is_multilingual else None
    retries = []

    def decode(start, end, hinted=True):
        nonlocal language
        padded_start, padded_end = max(0, start - (.15 if all_takes else .8)), min(duration, end + (.15 if all_takes else .8))
        segments, info = model.transcribe(
            samples[round(padded_start*16000):round(padded_end*16000)],
            language=language, word_timestamps=True, vad_filter=False, beam_size=5,
            condition_on_previous_text=False,
            initial_prompt='Narration featuring the supplied proper names and terminology.' if hinted and names else None,
            hotwords=', '.join(names+terms)[:4000] if hinted and names else None)
        language = info.language
        words = []
        for segment in segments:
            for word in segment.words or []:
                a, b = max(0, word.start + padded_start), min(duration, word.end + padded_start)
                if word.word.strip():
                    words.append({'start': round(a, 6), 'end': round(max(a, b), 6), 'text': word.word.strip()})
        return words

    decoded = []
    for index, (start, end) in enumerate(windows):
        progress('Recognizing speech: section %d of %d' % (index+1, len(windows)), 5+70*index/max(1, len(windows)))
        if not any(s['start'] < end and s['end'] > start for s in speech):
            decoded.append((start, end, []))
            continue
        words = decode(start, end)
        issues = audit_words(words, start, end, speech)
        if issues:
            progress('Recovering missed speech and caption timing at %.1fs' % start, 5+70*index/max(1, len(windows)))
            # Retry only suspect sections. Smaller independent windows prevent a
            # bad timestamp token from swallowing the rest of the narration.
            parts = []
            for a, b in recognition_windows(end-start, maximum=6):
                parts.append((a+start, b+start, decode(a+start, b+start, hinted=False)))
            recovered = merge_windows(parts, duration)
            recovered_issues = audit_words(recovered, start, end, speech)
            if len(recovered_issues) < len(issues):
                words, issues = recovered, recovered_issues
            retries.append({'start': start, 'end': end, 'remainingIssues': issues})
        if issues:
            raise RuntimeError('Speech timing could not be recovered at %.1f-%.1fs. Try small.en or supply a clearer narration. Details: %s' % (start, end, json.dumps(issues)))
        decoded.append((start, end, words))

    words = merge_windows(decoded, duration)
    issues = audit_words(words, 0, duration, speech)
    if issues:
        raise RuntimeError('Transcript has unrecovered speech timing: '+json.dumps(issues))
    if not words:
        raise RuntimeError('No speech was recognized. Check the narration file.')
    # Group by actual words, never retain a decoder segment's inflated endpoint.
    segments, pending = [], []
    for word in words:
        if pending and word['start']-pending[-1]['end'] > .8:
            segments.append(pending)
            pending = []
        pending.append(word)
        if len(pending) >= 32 or word['text'].endswith(('.', '!', '?')):
            segments.append(pending)
            pending = []
    if pending:
        segments.append(pending)
    return {'segments': [{'start': ws[0]['start'], 'end': ws[-1]['end'],
                          'text': ' '.join(w['text'] for w in ws), 'words': ws} for ws in segments],
            'language': language, 'transcription': {'model': model_name, 'vocabularyPrompted': bool(names),
            'hintCount': len(names), 'termHintCount': len(terms), 'timingVersion': 2,
            'allTakes': all_takes, 'windowSeconds': 6 if all_takes else 18, 'windows': len(windows), 'recoveredSections': retries,
            'timingVerified': True, 'speechSeconds': round(sum(s['end']-s['start'] for s in speech), 2)}}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('audio'); p.add_argument('output')
    p.add_argument('--model', default='base.en'); p.add_argument('--device', default='cpu')
    p.add_argument('--all-takes', action='store_true'); p.add_argument('--vocabulary-json'); p.add_argument('--cache-dir')
    a = p.parse_args()
    names, terms = [], []
    if a.vocabulary_json:
        vocabulary = json.loads(Path(a.vocabulary_json).read_text(encoding='utf-8'))
        if vocabulary.get('domain') in ('pokemon', 'general'):
            names = [n for n in vocabulary.get('names', []) if isinstance(n, str) and 0 < len(n) < 80][:35]
            terms = [n for n in vocabulary.get('terms', []) if isinstance(n, str) and 0 < len(n) < 80][:80]
    cache = None
    if a.cache_dir:
        digest = hashlib.sha256()
        with open(a.audio, 'rb') as source:
            for block in iter(lambda: source.read(1024*1024), b''):
                digest.update(block)
        digest.update(Path(__file__).read_bytes())
        digest.update(Path(__file__).with_name('transcription_timing.py').read_bytes())
        digest.update(json.dumps([a.model, a.device, names, terms]+(['all-takes-v1'] if a.all_takes else [])).encode())
        cache = Path(a.cache_dir) / (digest.hexdigest()+'.json')
    start = time.monotonic()
    result = None
    if cache and cache.exists():
        try:
            cached = json.loads(cache.read_text(encoding='utf-8'))
            if cached['transcription'].get('timingVerified') and (not a.all_takes or cached['transcription'].get('allTakes')):
                result = cached
        except (ValueError, KeyError):
            pass
    cache_hit = result is not None
    if result is None:
        result = transcribe(a.audio, a.model, a.device, names, terms, all_takes=a.all_takes)
        if cache:
            cache.parent.mkdir(parents=True, exist_ok=True)
            temp = cache.with_suffix('.%d.tmp' % os.getpid())
            temp.write_text(json.dumps(result), encoding='utf-8')
            os.replace(temp, cache)
    result['transcription'].update(cacheHit=cache_hit, elapsedSeconds=round(time.monotonic()-start, 2))
    Path(a.output).write_text(json.dumps(result), encoding='utf-8')
    progress('Speech and caption timing verified'+(' (cached)' if cache_hit else ''), 80)


if __name__ == '__main__':
    main()
