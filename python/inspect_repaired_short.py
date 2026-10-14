"""Check the finished MP4 rather than trusting composition-only previews."""
import json
import sys
from pathlib import Path
import cv2
import numpy as np

folder=Path(sys.argv[1] if len(sys.argv)>1 else 'workspace/current-short-delivery')
source=folder/'verified-blueprint-short.mp4'
cap=cv2.VideoCapture(str(source))
fps=cap.get(cv2.CAP_PROP_FPS)
duration=cap.get(cv2.CAP_PROP_FRAME_COUNT)/fps
frames=[]
for t in [.3,1.8,4.8,8.9,11.9,15.3,23.45,24.2,28.7,31.3,34.7,38.65,41.6]:
    cap.set(cv2.CAP_PROP_POS_MSEC,t*1000)
    ok,image=cap.read()
    if not ok: raise RuntimeError(f'Exported frame missing at {t}')
    file=folder/f'export-{t}.jpg'
    cv2.imwrite(str(file),image)
    frames.append({'time':t,'path':str(file)})
sheet=np.zeros((3*412,4*216,3),np.uint8)
for i,t in enumerate(np.linspace(23.4,24.5,12)):
    cap.set(cv2.CAP_PROP_POS_MSEC,float(t)*1000)
    ok,image=cap.read()
    if not ok: raise RuntimeError('Missing exported action frame')
    x,y=i%4*216,i//4*412
    sheet[y:y+384,x:x+216]=cv2.resize(image,(216,384))
    cv2.putText(sheet,f'{t:.2f}s',(x+4,y+404),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1)
cv2.imwrite(str(folder/'export-action-sequence.jpg'),sheet)
cap.release()
(folder/'finished-export-review.json').write_text(json.dumps({'fps':fps,'duration':duration,'frames':frames,'actionSheet':str(folder/'export-action-sequence.jpg')},indent=2))
print(json.dumps({'fps':fps,'duration':duration,'inspectedExportFrames':len(frames)}))
