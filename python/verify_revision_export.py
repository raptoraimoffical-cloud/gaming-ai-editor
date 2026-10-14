"""Verify decoded video pixels against the actual cached revision asset."""
from pathlib import Path
import json
import cv2

folder = Path(__file__).resolve().parents[1] / 'workspace/revision-assets-tests'
project = json.loads((folder / 'desktop-saved.gaming.json').read_text(encoding='utf-8'))
layer = project['scenes'][0]['layers'][-1]
asset = next(m for m in project['media'] if m['id'] == layer['mediaId'])
source = cv2.imread(asset['path'])
scale = min(layer['width'] * 1080 / source.shape[1], layer['height'] * 1920 / source.shape[0])
resized = cv2.resize(source, None, fx=scale, fy=scale)
h, w = resized.shape[:2]
template = cv2.cvtColor(resized[round(h*.2):round(h*.85), round(w*.35):round(w*.65)], cv2.COLOR_BGR2GRAY)
capture = cv2.VideoCapture(str(folder / 'mario-slide-in.mp4'))
results = []
for index in (8, 30, 54):
    capture.set(cv2.CAP_PROP_POS_FRAMES, index)
    ok, frame = capture.read()
    assert ok, f'MP4 frame {index} could not be decoded'
    cv2.imwrite(str(folder / f'export-frame-{index:03}.png'), frame)
    scores = cv2.matchTemplate(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), template, cv2.TM_CCOEFF_NORMED)
    _, confidence, _, location = cv2.minMaxLoc(scores)
    results.append({'frame': index, 'time': index/30, 'matchConfidence': confidence, 'location': location})
capture.release()
# The early entrance is deliberately translucent. Later opaque frames must be close matches.
assert results[0]['matchConfidence'] > .35 and all(r['matchConfidence'] > .95 for r in results[1:]), results
pixels = results[1]['location'][0] - results[0]['location'][0]
assert pixels > 140 and abs(results[1]['location'][1] - results[0]['location'][1]) < 3, results
evidence = {'method': 'Template matching decoded MP4 frames against the actual cached image', 'frames': results, 'slidePixels': pixels}
(folder / 'export-pixel-verification.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
print(json.dumps(evidence, indent=2))
