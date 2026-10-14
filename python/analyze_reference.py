"""Measured visual proxies, not semantic segmentation or artistic understanding."""
import argparse, json, subprocess
from pathlib import Path
import cv2
import numpy as np

p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('output');p.add_argument('--interval',type=float,default=.5);a=p.parse_args()
folder=Path(a.output);folder.mkdir(parents=True,exist_ok=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',a.video]))
duration=float(probe['format']['duration']);stream=next(s for s in probe['streams'] if s['codec_type']=='video')
cap=cv2.VideoCapture(a.video);samples=[];cuts=[];previous=None;fingerprints=[];frames=[]
for index,t in enumerate(np.arange(.1,duration,a.interval)):
 cap.set(cv2.CAP_PROP_POS_MSEC,float(t)*1000);ok,frame=cap.read()
 if not ok:continue
 h,w=frame.shape[:2];small=cv2.resize(frame,(180,round(h/w*180)));gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY);hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV)
 edges=cv2.Canny(gray,70,140);active=[]
 for y in range(0,gray.shape[0]-20,20):
  for x in range(0,gray.shape[1]-20,20):active.append(float(np.std(small[y:y+20,x:x+20]))>22 and float(edges[y:y+20,x:x+20].mean())>3)
 # Central foreground proxy: border-color distance and edges, bounded to usable frame.
 lab=cv2.cvtColor(small,cv2.COLOR_BGR2LAB).astype(float);border=np.concatenate([lab[:15].reshape(-1,3),lab[-15:].reshape(-1,3),lab[:,:10].reshape(-1,3),lab[:,-10:].reshape(-1,3)])
 distance=np.linalg.norm(lab-np.median(border,axis=0),axis=2);mask=((distance>40)&(hsv[:,:,1]>35)).astype(np.uint8)
 mask[:int(gray.shape[0]*.08)]=0;mask[int(gray.shape[0]*.88):]=0
 count,labels,stats,_=cv2.connectedComponentsWithStats(mask,8);component=stats[1:][np.argmax(stats[1:,cv2.CC_STAT_AREA])] if count>1 else np.zeros(5)
 white=((hsv[:,:,1]<45)&(hsv[:,:,2]>215)).astype(np.uint8);_,_,text_stats,_=cv2.connectedComponentsWithStats(white,8)
 rows=[(r[1]+r[3]/2)/gray.shape[0] for r in text_stats[1:] if 2<=r[2]<=65 and 3<=r[3]<=18 and r[4]>5]
 difference=float(np.abs(small.astype(float)-previous.astype(float)).mean()) if previous is not None else 0
 cut=difference>28
 if cut:cuts.append(round(float(t),3))
 motion=zoom=0
 if previous is not None and not cut:
  flow=cv2.calcOpticalFlowFarneback(cv2.cvtColor(previous,cv2.COLOR_BGR2GRAY),gray,None,.5,3,15,2,5,1.2,0);magnitude=np.linalg.norm(flow,axis=2);motion=float(np.percentile(magnitude,75))
  yy,xx=np.indices(gray.shape);rx=xx-gray.shape[1]/2;ry=yy-gray.shape[0]/2;radial=(flow[:,:,0]*rx+flow[:,:,1]*ry)/(rx*rx+ry*ry+100);zoom=float(np.median(radial))
 fp=cv2.resize(small,(6,10)).astype(float).flatten();fingerprints.append(fp)
 samples.append({'time':round(float(t),3),'brightness':round(float(hsv[:,:,2].mean()),2),'saturation':round(float(hsv[:,:,1].mean()),2),'edgeOccupancy':round(float((edges>0).mean()),4),'activeTileOccupancy':round(float(np.mean(active)),4),'foregroundColorProxy':round(float(component[4]/gray.size),4),'foregroundWidthProxy':round(float(component[2]/gray.shape[1]),4),'foregroundHeightProxy':round(float(component[3]/gray.shape[0]),4),'frameDifference':round(difference,3),'motionPixelsProxy':round(motion,3),'radialZoomProxy':round(zoom,5),'whiteTextRowProxy':round(float(np.median(rows)),3) if rows else None})
 if index % max(1,round(duration/a.interval/12))==0:
  file=folder/f'frame-{index:04}.jpg';cv2.imwrite(str(file),cv2.resize(frame,(270,round(h/w*270))));frames.append({'time':round(float(t),3),'path':str(file.resolve())})
 previous=small
cap.release()
centers=[]
for fp in fingerprints:
 if not any(np.mean(np.abs(fp-c))<18 for c in centers):centers.append(fp)
boundaries=[0]+cuts+[duration];shots=np.diff(boundaries)
median=lambda key:round(float(np.median([s[key] for s in samples if s[key] is not None])),4)
summary={'duration':duration,'sampleInterval':a.interval,'cutCandidates':cuts,'medianShotSeconds':round(float(np.median(shots)),3),'compositionFingerprintGroups':len(centers),'brightness':median('brightness'),'saturation':median('saturation'),'activeTileOccupancy':median('activeTileOccupancy'),'foregroundColorProxy':median('foregroundColorProxy'),'foregroundWidthProxy':median('foregroundWidthProxy'),'foregroundHeightProxy':median('foregroundHeightProxy'),'motionPixelsProxy':median('motionPixelsProxy'),'whiteTextRowProxy':median('whiteTextRowProxy') if any(s['whiteTextRowProxy'] is not None for s in samples) else None}
preset={'name':'Subject-first environmental edit','captionFontSize':40,'captionWords':4 if summary['medianShotSeconds']>5 else 3,'entranceSeconds':round(max(.15,min(.35,.08+summary['medianShotSeconds']*.04)),3),'backgroundTravel':.025 if summary['motionPixelsProxy']<1 else .045,'subjectSize':round(max(.65,min(.96,.66+.3*max(summary['foregroundWidthProxy'],summary['foregroundHeightProxy']))),3),'suggestedShotSeconds':max(1,min(5,summary['medianShotSeconds']))}
result={'version':1,'source':str(Path(a.video).resolve()),'width':stream['width'],'height':stream['height'],'summary':summary,'samples':samples,'frames':frames,'suggestedPreset':preset,'limitations':['Foreground size is a color-connectivity proxy, not an identified character bounding box.','Cut candidates can include flashes, rapid zooms or moving characters. Slow dissolves may be missed.','White-component rows approximate text placement and can include bright artwork.','Optical flow measures image movement; it cannot reliably separate camera motion from subject motion.','Analysis media is for inspection only and is never inserted into generated videos.']}
(folder/'analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(summary))
