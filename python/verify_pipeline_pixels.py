"""Acceptance checks against decoded MP4s, not animation metadata."""
from pathlib import Path
import json, subprocess
import cv2
import numpy as np
folder=Path(__file__).resolve().parents[1]/'workspace/pipeline-audit'
def frame(name,index):
    cap=cv2.VideoCapture(str(folder/(name+'.mp4')));cap.set(cv2.CAP_PROP_POS_FRAMES,index);ok,f=cap.read();cap.release()
    assert ok,(name,index)
    cv2.imwrite(str(folder/f'{name}-{index:03}.png'),f)
    return f
def box(f,kind):
    b,g,r=cv2.split(f)
    mask={'red':(r>200)&(g<90)&(b<90),'pink':(r>220)&(b>220)&(g<40),'yellow':(r>220)&(g>220)&(b<40),'cyan':(b>220)&(g>220)&(r<50),'green':(g>220)&(r<40)&(b<40)}[kind]
    y,x=np.where(mask);assert len(x),(kind,'No pixels')
    return {'x':int(x.min()),'y':int(y.min()),'width':int(x.max()-x.min()+1),'height':int(y.max()-y.min()+1),'count':len(x),'center':[float(x.mean()),float(y.mean())]}
a,b=frame('renderer-diagnostic',3),frame('renderer-diagnostic',60)
red=[box(f,'red') for f in (a,b)];pink=[box(f,'pink') for f in (a,b)]
assert red[1]['center'][0]-red[0]['center'][0]>200,red
assert pink[1]['center'][1]-pink[0]['center'][1]>250,pink
def stripe(f):
    row=f[80];mask=(row[:,0]>200)&(row[:,1]<120)&(row[:,2]<80);x=np.where(mask)[0];return int(x[x<180].mean())
stripe_shift=stripe(b)-stripe(a);assert abs(stripe_shift)>30,stripe_shift
early,late=frame('renderer-diagnostic',12),frame('renderer-diagnostic',36)
bars=[box(f,'yellow') for f in (early,late)];assert bars[1]['width']>bars[0]['width']*3,bars
stat=[box(f[1400:1800],'cyan') for f in (early,late)];assert stat[1]['count']>stat[0]['count']*2,stat
transition=[frame('renderer-diagnostic',n)[80,50].tolist() for n in (90,93,97)]
assert np.mean(transition[0])<80 and 90<np.mean(transition[1])<190 and np.mean(transition[2])>225,transition
control,instructed=frame('control',45),frame('instructed',45)
changed=int((np.abs(control.astype(float)-instructed.astype(float)).sum(2)>60).sum())
green=box(instructed,'green');assert changed>1_000_000 and green['count']>1_000_000
def skin(f):
    hsv=cv2.cvtColor(f[:1450],cv2.COLOR_BGR2HSV);mask=(hsv[:,:,0]>8)&(hsv[:,:,0]<35)&(hsv[:,:,1]>120)&(hsv[:,:,2]>205)
    y,x=np.where(mask);return {'x':int(x.min()),'right':int(x.max()),'height':int(y.max()-y.min()+1),'center':float(x.mean())}
sizes=[skin(f) for f in (control,instructed)];ratio=sizes[1]['height']/sizes[0]['height'];assert 1.8<ratio<2.2,sizes
slide=[skin(frame('instructed',n)) for n in (12,24)];assert slide[1]['center']-slide[0]['center']>90,slide
audio={}
for name in ('control','instructed','minecraft','ultra'):
    pcm=subprocess.run(['ffmpeg','-v','error','-i',str(folder/(name+'.mp4')),'-f','f32le','-ar','48000','pipe:1'],capture_output=True,check=True).stdout
    samples=np.frombuffer(pcm,np.float32);rms=float(np.sqrt(np.mean(samples**2)));peak=float(np.abs(samples).max());assert rms>.01 and peak<1,(name,rms,peak)
    audio[name]={'rms':rms,'peak':peak,'seconds':len(samples)/96000}
result={'characterPixelsMoved':red[1]['center'][0]-red[0]['center'][0],'independentLayerPixelsMoved':pink[1]['center'][1]-pink[0]['center'][1],'backgroundStripePixelsMoved':stripe_shift,'comparisonBarWidths':bars,'animatedStatisticPixels':stat,'crossfadePixelSamples':transition,'instructionChangedPixels':changed,'instructionGreenPixels':green['count'],'characterHeightRatio':ratio,'slideCenters':slide,'audio':audio}
(folder/'pixel-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result,indent=2))
