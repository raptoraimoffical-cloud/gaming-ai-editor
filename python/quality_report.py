"""Actual exported-frame checks and a local, reviewable before/after report."""
import cv2, numpy as np, json, subprocess, html
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
out=ROOT/'workspace/visual-quality'
old=ROOT/'workspace/media/46e0f326-077e-4fb0-b9b1-5de1079a6e86.mp4'
def frame(file,t):
    cap=cv2.VideoCapture(str(file));cap.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,img=cap.read();cap.release()
    if not ok:raise RuntimeError(f'Cannot decode {file} at {t}')
    return img
def sheet(file,times,name):
    images=[]
    for i,t in enumerate(times):
        full=frame(file,t);cv2.imwrite(str(out/f'{name}-{i}.png'),full)
        img=cv2.resize(full,(270,480));cv2.putText(img,f'{t:.2f}s',(12,27),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),2)
        images.append(img)
    cols=3;rows=(len(images)+cols-1)//cols;canvas=np.zeros((rows*480,cols*270,3),np.uint8)
    for i,img in enumerate(images):canvas[(i//cols)*480:(i//cols+1)*480,(i%cols)*270:(i%cols+1)*270]=img
    cv2.imwrite(str(out/f'{name}-contact.jpg'),canvas)
    return images
times=[.3,1.5,3.6,4.5,7.2,8.15]
sheet(old,times,'before');sheet(out/'upgraded.mp4',times,'after')
sheet(out/'evolution.mp4',[.5,1.25,1.60,1.8,2.25,4.5],'evolution')
checks={}
for name,points in [('upgraded',[1,4,7.2,8.15]),('evolution',[.5,1.25,2.25,4.5])]:
    file=out/f'{name}.mp4';probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]))
    v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'])==(1080,1920) and a['codec_name']=='aac' and v['codec_name']=='h264'
    # Spatial fingerprints distinguish changed subject shapes even when both characters share a palette.
    fingerprints=[cv2.resize(frame(file,t)[:1536],(24,40)).astype(float) for t in points]
    variation=max(float(np.mean(np.abs(x-y))) for x in fingerprints for y in fingerprints)
    first=frame(file,3.6 if name=='upgraded' else 2.4);second=frame(file,4.2 if name=='upgraded' else 2.9)
    # Exclude captions and credits: only pixels in the main visual region count.
    diff=np.abs(first[200:1500,80:1000].astype(int)-second[200:1500,80:1000].astype(int)).sum(axis=2)
    changed=int((diff>45).sum());assert changed>1000,f'{name} has no visible visual movement beyond captions'
    assert variation>10,f'{name} has little visual variation'
    checks[name]={'dimensions':[v['width'],v['height']],'duration':float(probe['format']['duration']),'videoCodec':v['codec_name'],'audioCodec':a['codec_name'],'visualRegionChangedPixels':changed,'spatialFingerprintVariation':round(variation,2)}
animation=json.loads((out/'animation-verification.json').read_text()) if (out/'animation-verification.json').exists() else {}
checks['nativeGifAnimation']=animation
(out/'frame-verification.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
project=json.loads((out/'upgraded.gaming.json').read_text(encoding='utf-8'))
scene_rows=''.join(f"<tr><td>{s['start']:.2f}–{s['end']:.2f}s</td><td>{html.escape(s['text'])}</td><td>{html.escape(s['compositionFamily'])}</td><td>{html.escape(s['backgroundConcept'])}</td></tr>" for s in project['scenes'])
measured={}
for name in ['previous','reference','upgraded']:
    f=out/f'{name}-analysis/analysis.json'
    if f.exists():measured[name]=json.loads(f.read_text())['summary']
keys=['medianShotSeconds','compositionFingerprintGroups','brightness','activeTileOccupancy','foregroundColorProxy','motionPixelsProxy']
metric_rows=''.join('<tr><td>'+k+'</td>'+''.join('<td>'+str(measured.get(n,{}).get(k,'not measured'))+'</td>' for n in ['previous','upgraded','reference'])+'</tr>' for k in keys)
page=f'''<!doctype html><meta charset="utf-8"><title>Gaming AI Editor — actual visual verification</title>
<style>body{{background:#0b1017;color:#e6edf5;font:16px system-ui;max-width:1250px;margin:40px auto;padding:20px}}h1,h2{{color:#8affcb}}.comparison{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}img{{max-width:100%}}video{{max-height:540px;width:100%;background:#000}}table{{border-collapse:collapse;width:100%}}td,th{{text-align:left;border-bottom:1px solid #354258;padding:10px}}pre{{white-space:pre-wrap;background:#182231;padding:20px}}a{{color:#8affcb}}small{{color:#9dafc2}}</style>
<h1>Actual before / after exports</h1><p>These frames were decoded from the supplied old MP4 and newly exported MP4s. The reference was inspected and measured; its footage/artwork was never inserted into the exports.</p>
<div class="comparison"><article><h2>Previous supplied output</h2><img src="before-contact.jpg"></article><article><h2>Upgraded same narration</h2><img src="after-contact.jpg"></article></div>
<p>Matched timestamps: {', '.join(str(t)+'s' for t in times)}. The actual voiceover explicitly says Pikachu at 7.65s. It is confined to the final dedicated Pokémon beat; none appears during Minecraft beats.</p>
<h2>Actual Minecraft export</h2><video src="upgraded.mp4" controls></video><table><tr><th>Interval</th><th>Actual transcript</th><th>Family</th><th>Environment</th></tr>{scene_rows}</table>
<h2>Verified Wartortle → Blastoise evolution</h2><video src="evolution.mp4" controls></video><img src="evolution-contact.jpg"><p>PokéAPI direct evolution verified. Native Showdown GIFs remain animated; frame-based shrink, rotation, iris reveal and a short flash coordinate the transition at 1.56s.</p>
<h2>Measured reference comparison</h2><table><tr><th>Measurement / proxy</th><th>Previous</th><th>Upgraded</th><th>Reference</th></tr>{metric_rows}</table><p>Foreground measurements are color-connectivity proxies, not identified character bounds. Optical flow includes both camera and character movement. Sampling can mistake flashes for cuts and artwork for captions. The longer reference is not directly equivalent to this short fixture.</p>
<h2>Automated exported-frame checks</h2><pre>{html.escape(json.dumps(checks,indent=2))}</pre>
<h2>Real desktop preview</h2><img src="desktop-storyboard.png"><p><a href="desktop-reference.png">Reference analyzer screenshot</a> · <a href="evolution-horizontal.mp4">Horizontal evolution export</a> · <a href="native-gif-animation.mp4">Native GIF proof (all transforms and captions disabled)</a></p>
<h2>Known visual limitations</h2><p>Minecraft mobs here are original, explicitly labeled block-style diagrams, not authentic game model renders. Pokémon sprites have crisp, enlarged source pixels; they cannot provide the reference’s detailed HD illustration quality. Supply your own matching gameplay or permitted artwork for that quality level. Environments are original vector settings and are identified as such in the storyboard. This is rule-based semantic planning; ambiguous subjects and forms still need review. The same-voice fixture uses the old MP4’s existing audio mix because an isolated narration source was not available.</p>
'''
(out/'report.html').write_text(page,encoding='utf-8');print(json.dumps(checks,indent=2))
