"""Timing checks and overlap reconciliation; independent of model inference."""
import math
import re


def recognition_windows(duration, energy=None, maximum=18):
    windows, start = [], 0
    while start < duration-.001:
        end = min(duration, start+maximum)
        if end < duration and energy:
            lo, hi = max(start+maximum*.7, end-1), min(duration, end+1)
            indices = range(math.ceil(lo/.02), min(len(energy), math.floor(hi/.02)))
            if indices:
                end = min(indices, key=lambda i: (energy[i], abs(i*.02-end)))*.02
        windows.append((round(start, 6), round(end, 6)))
        start = end
    return windows


def audit_words(words, start, end, speech):
    invalid = [w for w in words if not all(math.isfinite(w[k]) for k in ('start', 'end')) or w['end'] < w['start']]
    if invalid:
        return [{'kind': 'invalid-word', 'start': start}]
    owned = [w for w in words if start <= (w['start']+w['end'])/2 < end]
    issues = []
    for w in owned:
        if not all(math.isfinite(w[k]) for k in ('start', 'end')) or w['end'] < w['start']:
            issues.append({'kind': 'invalid-word', 'start': w['start']})
        elif w['end']-w['start'] > 2.5:
            issues.append({'kind': 'stretched-word', 'start': w['start'], 'end': w['end'], 'text': w['text']})
    collapsed = [w for w in owned if w['end']-w['start'] < .015]
    if any(sum(abs(other['start']-w['start']) < .3 for other in collapsed) >= 3 for w in collapsed):
        issues.append({'kind': 'collapsed-words', 'start': start})
    spans = sorted((max(start, w['start']-.35), min(end, w['end']+.35)) for w in words if w['end'] >= start and w['start'] <= end)
    cursor, gaps = start, []
    for a, b in spans:
        if a > cursor:
            gaps.append((cursor, a))
        cursor = max(cursor, b)
    if cursor < end:
        gaps.append((cursor, end))
    for a, b in gaps:
        voiced = sum(max(0, min(b, s['end'])-max(a, s['start'])) for s in speech)
        if voiced > 2:
            issues.append({'kind': 'missing-speech', 'start': round(a, 3), 'end': round(b, 3)})
    return issues


def merge_windows(windows, duration):
    words = []
    normalize = lambda t: re.sub(r'[^\w]', '', t).casefold()
    for start, end, candidates in windows:
        selected = [dict(w) for w in candidates if start <= (w['start']+w['end'])/2 < end]
        for word in selected:
            # Overlap decoding can put the same boundary word on both sides.
            # Only discard when the actual timestamp spans intersect: genuine
            # repeated words at distinct times ("very, very") must survive.
            if words and normalize(word['text']) == normalize(words[-1]['text']) and word['start'] < words[-1]['end']-.02:
                continue
            word['start'] = max(0, min(duration, word['start']))
            word['end'] = max(word['start'], min(duration, word['end']))
            if words and word['start'] < words[-1]['end']:
                words[-1]['end'] = max(words[-1]['start'], word['start'])
            words.append(word)
    return words
