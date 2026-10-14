"""Non-speech spacing and conservative breath reduction candidates."""
import argparse,json
from pathlib import Path
import numpy as np
from faster_whisper.audio import decode_audio
from faster_whisper.vad import get_speech_timestamps,VadOptions

def analyze(samples,words,speech,sr=16000,pacing="natural"):
    duration=len(samples)/sr
    protected=[];silent_words=[];boundaries=[];quiet=[]
    if pacing=='tight' and len(samples)>=80:
        frames=samples[:len(samples)//80*80].reshape(-1,80)
        energy=np.sqrt(np.mean(frames*frames,axis=1)+1e-12)
        floor=float(np.percentile(energy,15))
        threshold=max(.00012,min(.0015,floor*2))
        start=None
        for i,is_quiet in enumerate(energy<=threshold):
            if is_quiet and start is None: start=i
            if start is not None and (not is_quiet or i==len(energy)-1):
                end=i+1 if is_quiet else i
                if (end-start)*.005>=.032: quiet.append((start*.005+.012,end*.005-.012))
                start=None
    word_padding=.012 if pacing=='tight' else .085
    speech_padding=.008 if pacing=='tight' else .045
    for i,w in enumerate(words):
        chunk=samples[max(0,round(w['start']*sr)):min(len(samples),round(w['end']*sr))]
        # Recognition can hallucinate a word over inserted digital silence.
        # Only exact silence is exempt; quiet speech remains protected.
        if len(chunk) and float(np.max(np.abs(chunk)))<=1e-7:
            silent_words.append(i)
        else:
            a,b=max(0,w['start']-word_padding),min(duration,w['end']+word_padding)
            spans=[(a,b)]
            # Whisper can stretch a word over a real pause. Only remove a
            # waveform-confirmed quiet interval; extremely quiet words keep
            # their full ASR protection.
            if pacing=='tight' and len(chunk) and float(np.max(np.abs(chunk)))>.006:
                for q0,q1 in quiet:
                    parts=[]
                    for x,y in spans:
                        if q1<=x or q0>=y: parts.append((x,y))
                        else:
                            if x<q0: parts.append((x,q0))
                            if y>q1: parts.append((q1,y))
                    spans=parts
            protected.extend(spans)
        lower=words[i-1]['end']+.004 if i else 0
        upper=words[i+1]['start']-.004 if i+1<len(words) else duration
        starts=[max(lower,s['start']-.012) for s in speech if lower<=s['start']<w['end'] and s['end']>w['start']]
        ends=[min(upper,s['end']+.012) for s in speech if w['start']<s['end']<=upper and s['start']<w['end']]
        # A separate VAD onset/tail can correct an early/late ASR boundary.
        # Never cross a neighboring retained word to gain a cleaner splice.
        overlaps=[s for s in speech if s['start']<w['end'] and s['end']>w['start']]
        owned=max(overlaps,key=lambda s:min(w['end'],s['end'])-max(w['start'],s['start'])) if overlaps else None
        boundaries.append({**({'speechOnset':owned['start'],'speechOffset':owned['end']} if owned else {}),'audioStart':max(0,lower,min([w['start']]+starts)),
                           'audioEnd':min(duration,upper,max([w['end']]+ends))})
    protected += [(max(0,s['start']-speech_padding),min(duration,s['end']+speech_padding)) for s in speech]
    merged=[]
    for start,end in sorted(protected):
        if merged and start<=merged[-1][1]: merged[-1][1]=max(merged[-1][1],end)
        else: merged.append([start,end])
    gaps=[];cursor=0
    for start,end in merged:
        if start-cursor>(.024 if pacing=='tight' else .04): gaps.append({'start':cursor,'end':start,**({'verifiedQuiet':True} if pacing=='tight' and any(q0<=cursor+.001 and q1>=start-.001 for q0,q1 in quiet) else {})})
        cursor=max(cursor,end)
    if duration-cursor>(.024 if pacing=='tight' else .04): gaps.append({'start':cursor,'end':duration,**({'verifiedQuiet':True} if pacing=='tight' and any(q0<=cursor+.001 and q1>=duration-.001 for q0,q1 in quiet) else {})})
    breaths=[]
    for gap in gaps:
        for start in np.arange(gap['start'],gap['end']-.11,.1):
            end=min(gap['end'],start+.12);chunk=samples[round(start*sr):round(end*sr)]
            rms=float(np.sqrt(np.mean(chunk*chunk)+1e-12));spectrum=np.abs(np.fft.rfft(chunk*np.hanning(len(chunk))))+1e-9
            frequencies=np.fft.rfftfreq(len(chunk),1/sr);centroid=float(np.sum(frequencies*spectrum)/np.sum(spectrum));flatness=float(np.exp(np.mean(np.log(spectrum)))/np.mean(spectrum))
            if .003<rms<.12 and centroid>1400 and flatness>.17:
                if breaths and start<=breaths[-1]['end']+.02: breaths[-1]['end']=end
                else: breaths.append({'start':float(start),'end':float(end)})
    return {'duration':duration,'gaps':gaps,'breaths':[b for b in breaths if b['end']-b['start']>=.14],'silentWordIndexes':silent_words,'wordBoundaries':boundaries,'speech':speech,'analysisVersion':2,'pacing':pacing}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('audio');parser.add_argument('words');parser.add_argument('output');parser.add_argument('--pacing',choices=['natural','tight','relaxed'],default='natural');args=parser.parse_args()
    samples=decode_audio(args.audio,sampling_rate=16000);words=json.loads(Path(args.words).read_text(encoding='utf-8'))
    speech=[{'start':s['start']/16000,'end':s['end']/16000} for s in get_speech_timestamps(samples,VadOptions(min_silence_duration_ms=45 if args.pacing=='tight' else 120,min_speech_duration_ms=32,speech_pad_ms=0))]
    Path(args.output).write_text(json.dumps(analyze(samples,words,speech,pacing=args.pacing)),encoding='utf-8')
