"""Inspect supplied references; audio transients are candidates, never SFX counts."""
import json, subprocess
from pathlib import Path
import cv2
import numpy as np

root = Path('workspace/reference-gold')
for row in json.loads((root / 'inputs.json').read_text(encoding='utf-8')):
    folder = root / row['id']; folder.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(row['file'])
    duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
    times = np.arange(.15, duration, 1.5)
    # Multiple sheets cover the complete video, with readable timestamps.
    for page in range((len(times) + 29) // 30):
        sheet = np.zeros((6 * 302, 5 * 162, 3), np.uint8)
        for index, t in enumerate(times[page*30:(page+1)*30]):
            cap.set(cv2.CAP_PROP_POS_MSEC, float(t)*1000)
            ok, frame = cap.read()
            if not ok: continue
            image = cv2.resize(frame, (162, 288))
            x, y = (index % 5)*162, (index // 5)*302
            sheet[y:y+288, x:x+162] = image
            cv2.putText(sheet, f'{t:.2f}s', (x+3, y+300), cv2.FONT_HERSHEY_SIMPLEX, .4, (255,255,255), 1)
        cv2.imwrite(str(folder / f'contact-{page}.jpg'), sheet)
    cap.release()
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',row['file'],'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'])
    audio = np.frombuffer(raw, dtype='<f4')
    hop, window = 160, 640
    frames = np.lib.stride_tricks.sliding_window_view(audio, window)[::hop]
    spectrum = np.abs(np.fft.rfft(frames * np.hanning(window), axis=1))
    flux = np.maximum(0, np.diff(spectrum, axis=0)).mean(axis=1)
    rms = np.sqrt(np.mean(frames**2, axis=1))
    threshold = float(np.percentile(flux, 94))
    peaks = []
    for i in range(1,len(flux)-1):
        if flux[i] < threshold or flux[i] < max(flux[i-1],flux[i+1]): continue
        time = round((i+1)*hop/16000,3)
        if peaks and time-peaks[-1]['time'] < .35:
            if flux[i] > peaks[-1]['flux']: peaks[-1] = {'time':time,'flux':float(flux[i])}
        else: peaks.append({'time':time,'flux':float(flux[i])})
    result = {'duration':duration,'audioTransientCandidates':peaks,'medianCandidateGap':float(np.median(np.diff([p['time'] for p in peaks]))) if len(peaks)>1 else None,'rmsMedian':float(np.median(rms)), 'limitations':['Spectral transients include consonants, music beats, game audio and effects. They are NOT isolated sound effects or a reliable effect count.','Contact sheets sample every 1.5 seconds; brief inserts can fall between samples.','No viewer-retention data is available from a downloaded video.']}
    (folder/'audio-analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(row['id'], round(duration,2), 'seconds;', len(peaks), 'mixed-audio transient candidates', flush=True)
