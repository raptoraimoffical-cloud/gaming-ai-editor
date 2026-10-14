"""Inspect the supplied move-explainer reference, without modifying the source."""
import json
from pathlib import Path
import cv2
import numpy as np

source = Path(r'C:\Users\Eli\Downloads\This-Move-Changes-SnapYT.App (1).mp4')
out = Path('workspace/reference-move-changes')
out.mkdir(parents=True, exist_ok=True)
cap = cv2.VideoCapture(str(source))
fps = cap.get(cv2.CAP_PROP_FPS)
duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps
times = np.arange(.1, duration, 1.25)
for page in range((len(times) + 19) // 20):
    sheet = np.zeros((5 * 410, 4 * 216, 3), np.uint8)
    for index, t in enumerate(times[page*20:(page+1)*20]):
        cap.set(cv2.CAP_PROP_POS_MSEC, float(t)*1000)
        ok, frame = cap.read()
        if not ok:
            continue
        x, y = index % 4 * 216, index // 4 * 410
        sheet[y:y+384, x:x+216] = cv2.resize(frame, (216, 384))
        cv2.putText(sheet, f'{t:.2f}s', (x+5, y+404), cv2.FONT_HERSHEY_SIMPLEX, .5, (255,255,255), 1)
    cv2.imwrite(str(out / f'contact-{page}.jpg'), sheet)
cap.release()
(out / 'metadata.json').write_text(json.dumps({'file': str(source), 'duration': duration, 'fps': fps, 'sampleInterval': 1.25}, indent=2))
print(json.dumps({'duration': duration, 'sheets': (len(times)+19)//20}))
