import unittest
import numpy as np
from voiceover_analyze import analyze

class BreathTests(unittest.TestCase):
    def test_speech_is_never_a_breath_candidate(self):
        sr=16000
        audio=np.random.default_rng(7).normal(0,.03,3*sr).astype(np.float32)
        result=analyze(audio,[{'start':.9,'end':1.3}], [{'start':1.8,'end':2.4}])
        self.assertTrue(result['breaths'])
        for region in result['gaps']+result['breaths']:
            self.assertFalse(region['start']<1.385-1e-8 and region['end']>.815+1e-8)
            self.assertFalse(region['start']<2.445-1e-8 and region['end']>1.755+1e-8)

    def test_silence_is_not_misreported_as_breathing(self):
        result=analyze(np.zeros(32000,dtype=np.float32),[],[])
        self.assertEqual(result['breaths'],[])
        self.assertEqual(result['duration'],2)
        self.assertEqual(result['gaps'],[{'start':0,'end':2}])

    def test_a_hallucinated_word_over_exact_silence_does_not_prevent_pause_cleanup(self):
        result=analyze(np.zeros(32000,dtype=np.float32),[{'start':.5,'end':1.3}],[])
        self.assertEqual(result['silentWordIndexes'],[0])
        self.assertEqual(result['gaps'],[{'start':0,'end':2}])
        quiet=np.full(32000,1e-5,dtype=np.float32)
        self.assertEqual(analyze(quiet,[{'start':.5,'end':1.3}],[])['silentWordIndexes'],[])

class TightTests(unittest.TestCase):
    def test_short_pauses_are_detected_between_protected_words(self):
        sr=16000
        samples=np.zeros(sr,dtype=np.float32)
        samples[1600:4800]=.08
        samples[6400:9600]=.08
        words=[{'start':.1,'end':.3},{'start':.4,'end':.6}]
        speech=[{'start':.1,'end':.3},{'start':.4,'end':.6}]
        result=analyze(samples,words,speech,pacing='tight')
        middle=[g for g in result['gaps'] if g['start']>.2 and g['end']<.5]
        self.assertEqual(len(middle),1)
        self.assertLess(middle[0]['end']-middle[0]['start'],.1)
        self.assertGreater(middle[0]['end']-middle[0]['start'],.06)

    def test_separate_audio_onset_and_tail_correct_late_and_early_asr_edges(self):
        samples=np.full(32000,.03,dtype=np.float32)
        words=[{'start':.12,'end':.85},{'start':1.1,'end':1.8}]
        result=analyze(samples,words,[{'start':.02,'end':.94},{'start':1.08,'end':1.83}],pacing='tight')
        self.assertLessEqual(result['wordBoundaries'][0]['audioStart'],.02)
        self.assertGreaterEqual(result['wordBoundaries'][0]['audioEnd'],.94)
        self.assertLess(result['wordBoundaries'][0]['audioEnd'],words[1]['start'])
        self.assertGreater(result['wordBoundaries'][1]['audioStart'],words[0]['end'])

class StretchedWordTests(unittest.TestCase):
    def test_confirmed_quiet_inside_a_stretched_word_is_not_protected(self):
        sr=16000
        audio=np.zeros(sr,dtype=np.float32)
        audio[:6400]=.05
        audio[11200:]=.05
        result=analyze(audio,[{'start':0,'end':1}], [{'start':0,'end':.4},{'start':.7,'end':1}],pacing='tight')
        gaps=[g for g in result['gaps'] if g['start']>.35 and g['end']<.75]
        self.assertEqual(len(gaps),1)
        self.assertTrue(gaps[0]['verifiedQuiet'])
        self.assertGreater(gaps[0]['end']-gaps[0]['start'],.25)

    def test_an_isolated_stammer_onset_can_be_far_earlier_than_the_asr_token(self):
        audio=np.full(48000,.02,dtype=np.float32)
        words=[{'start':0,'end':.5},{'start':1.6,'end':2.0},{'start':2.5,'end':2.9}]
        result=analyze(audio,words,[{'start':1.05,'end':1.9}],pacing='tight')
        self.assertLessEqual(result['wordBoundaries'][1]['audioStart'],1.05)
        self.assertGreater(result['wordBoundaries'][1]['audioStart'],words[0]['end'])

if __name__=='__main__': unittest.main()
