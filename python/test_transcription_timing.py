import unittest
from transcription_timing import audit_words, merge_windows, recognition_windows


def word(text, start, end):
    return dict(text=text, start=start, end=end)


class TimingTests(unittest.TestCase):
    def test_saved_freeze_detected(self):
        words = [word('paralyze', 39.74, 59.88), word('the', 59.88, 59.88), word('enemy.', 59.88, 59.88)]
        issues = audit_words(words, 35, 85, [dict(start=35, end=85)])
        self.assertTrue(any(i['kind'] == 'stretched-word' for i in issues))
        self.assertTrue(any(i['kind'] == 'missing-speech' for i in issues))

    def test_genuine_silence_is_not_missing_speech(self):
        words = [word('hello', 0, .5), word('again', 20, 20.5)]
        self.assertEqual(audit_words(words, 0, 21, [dict(start=0, end=.5), dict(start=20, end=20.5)]), [])

    def test_only_clustered_collapsed_words_require_recovery(self):
        words = [word('one', 1, 1), word('two', 12, 12), word('three', 23, 23)]
        self.assertEqual(audit_words(words, 0, 24, []), [])
        self.assertTrue(audit_words([word('a', 1, 1), word('b', 1, 1), word('c', 1, 1)], 0, 2, []))

    def test_overlap_keeps_real_repetition_without_duplicate_boundary_word(self):
        merged = merge_windows([(0, 2, [word('very', .5, .8), word('very', .9, 1.1), word('good', 1.7, 2.2)]),
                                (2, 4, [word('good', 1.9, 2.3), word('Pokemon', 2.4, 2.8)])], 4)
        self.assertEqual([w['text'] for w in merged], ['very', 'very', 'good', 'Pokemon'])
        self.assertTrue(all(a['end'] <= b['start'] for a, b in zip(merged, merged[1:])))

    def test_all_recording_is_covered_by_small_windows(self):
        windows = recognition_windows(87.12127, [1]*4356)
        self.assertEqual(windows[0][0], 0)
        self.assertAlmostEqual(windows[-1][1], 87.12127)
        self.assertTrue(all(b-a <= 19 for a, b in windows))
        self.assertTrue(all(a[1] == b[0] for a, b in zip(windows, windows[1:])))

    def test_invalid_timestamp_rejected(self):
        self.assertTrue(audit_words([word('bad', float('nan'), 1)], 0, 2, []))


if __name__ == '__main__':
    unittest.main()
