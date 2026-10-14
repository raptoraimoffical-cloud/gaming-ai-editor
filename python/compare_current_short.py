"""Inspect the user's actual export and supplied references, read-only."""
import json
from pathlib import Path
import cv2
import numpy as np

downloads = Path('C:/Users/Eli/Downloads')
out = Path('workspace/current-short-comparison')
out.mkdir(parents=True, exist_ok=True)
inputs = [('current', downloads/'Current ai exsample.mp4')]
for key, token in [('strategy','xOPvJql78OA'),('champions','Nstw1MbZN44'),('charizard','L8vnRyKN2oI')]:
    matches = list(downloads.glob(f'*{token}*.mp4'))
    inputs.append((key, matches[0]))
results = []
for key, file in inputs:
    folder = out/key
    folder.mkdir(exist_ok=True)
    cap = cv2.VideoCapture(str(file))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT)/fps
    times = np.arange(.1, duration, 1.5)
    for page in range((len(times)+19)//20):
        sheet = np.zeros((5*412,4*216,3),np.uint8)
        for i,t in enumerate(times[page*20:(page+1)*20]):
            cap.set(cv2.CAP_PROP_POS_MSEC,float(t)*1000)
            ok,frame=cap.read()
            if not ok: continue
            x,y=i%4*216,i//4*412
            sheet[y:y+384,x:x+216]=cv2.resize(frame,(216,384))
            cv2.putText(sheet,f'{t:.2f}s',(x+4,y+404),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1)
        cv2.imwrite(str(folder/f'contact-{page}.jpg'),sheet)
    # Denser opening/action samples expose timing and actual motion.
    opening = np.zeros((3*412,4*216,3),np.uint8)
    for i,t in enumerate(np.arange(.1,3,.25)):
        cap.set(cv2.CAP_PROP_POS_MSEC,float(t)*1000)
        ok,frame=cap.read()
        if ok:
            x,y=i%4*216,i//4*412
            opening[y:y+384,x:x+216]=cv2.resize(frame,(216,384))
            cv2.putText(opening,f'{t:.2f}s',(x+4,y+404),cv2.FONT_HERSHEY_SIMPLEX,.55,(255,255,255),1)
    cv2.imwrite(str(folder/'opening.jpg'),opening)
    cap.release()
    results.append({'id':key,'path':str(file),'duration':duration,'fps':fps,'sampleEverySeconds':1.5})
(out/'metadata.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
