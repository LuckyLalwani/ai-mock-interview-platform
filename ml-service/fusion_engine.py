# ============================================================
# FUSION ENGINE — with Anxiety, Nervousness, Confidence
# ============================================================

import numpy as np
import threading
import time
from collections import deque
from typing import List, Dict


class FusionEngine:
    WEIGHTS = {'face': 0.45, 'voice': 0.45, 'text': 0.10}

    # ── Stress weights ────────────────────────────────────────
    STRESS_WEIGHTS = {
        'fear': 1.0, 'angry': 0.5, 'sad': 0.5,
        'disgust': 0.3, 'surprise': 0.2,
        'neutral': 0.0, 'happy': 0.0,
        'anger': 0.5, 'sadness': 0.5, 'joy': 0.0,
    }

    # ── Anxiety weights (fear-heavy + sad) ───────────────────
    ANXIETY_WEIGHTS = {
        'fear': 1.0, 'sad': 0.6, 'surprise': 0.4,
        'disgust': 0.2, 'angry': 0.3,
        'neutral': 0.0, 'happy': 0.0,
        'anger': 0.3, 'sadness': 0.6, 'joy': 0.0,
    }

    # ── Nervousness = fear + surprise + instability ───────────
    NERVOUSNESS_WEIGHTS = {
        'fear': 0.9, 'surprise': 0.7, 'angry': 0.4,
        'disgust': 0.3, 'sad': 0.3,
        'neutral': 0.0, 'happy': 0.0,
        'anger': 0.4, 'sadness': 0.3, 'joy': 0.0,
    }

    # ── Confidence = inverse of fear/sad/surprise ─────────────
    # High happy + neutral = confident
    CONFIDENCE_WEIGHTS = {
        'happy'  : 1.0,
        'neutral': 0.7,
        'surprise': -0.3,
        'sad'    : -0.6,
        'angry'  : -0.4,
        'fear'   : -0.9,
        'disgust': -0.3,
        'joy'    : 1.0,
        'sadness': -0.6,
        'anger'  : -0.4,
    }

    WINDOW_SEC    = 5
    SMOOTH_WINDOW = 3

    def __init__(self, timeline: list, timeline_lock: threading.Lock,
                 session_state=None):
        print("\n[FusionEngine] ── Initializing ──────────────────────")

        self.timeline      = timeline
        self.lock          = timeline_lock
        self.session_state = session_state

        self.fused_timeline   = []
        self.stress_history   = deque(maxlen=self.SMOOTH_WINDOW)
        self.anxiety_history  = deque(maxlen=self.SMOOTH_WINDOW)
        self.nervous_history  = deque(maxlen=self.SMOOTH_WINDOW)
        self.conf_history     = deque(maxlen=self.SMOOTH_WINDOW)

        self._stop_event  = threading.Event()
        self._thread      = None
        self.fusion_count = 0
        self.start_time   = None

        print(f"  Window: {self.WINDOW_SEC}s | Smoothing: {self.SMOOTH_WINDOW}")
        print("[FusionEngine] ── Ready ─────────────────────────────\n")

    def start(self):
        self.start_time = time.time()
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._fusion_loop, daemon=True, name="FusionThread"
        )
        self._thread.start()
        print("[FusionEngine] ▶ Started")

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=8)
        print(f"[FusionEngine] ⏹ Stopped | fusions={self.fusion_count}")

    def get_fused_timeline(self) -> list:
        return list(self.fused_timeline)

    def get_current_scores(self) -> dict:
        """Latest smoothed scores for live dashboard."""
        return {
            'stress'     : round(float(np.mean(self.stress_history))  * 100, 1)
                           if self.stress_history  else 0.0,
            'anxiety'    : round(float(np.mean(self.anxiety_history)) * 100, 1)
                           if self.anxiety_history else 0.0,
            'nervousness': round(float(np.mean(self.nervous_history)) * 100, 1)
                           if self.nervous_history else 0.0,
            'confidence' : round(float(np.mean(self.conf_history))    * 100, 1)
                           if self.conf_history    else 50.0,
        }

    # ── Fusion loop ───────────────────────────────────────────
    def _fusion_loop(self):
        print(f"[FusionEngine] Running every {self.WINDOW_SEC}s")

        while not self._stop_event.is_set():
            time.sleep(self.WINDOW_SEC)

            now          = time.time()
            window_start = now - self.WINDOW_SEC

            with self.lock:
                window = [e for e in self.timeline
                          if e['timestamp'] >= window_start]

            if not window:
                continue

            face_events  = [e for e in window if e['modality'] == 'face']
            voice_events = [e for e in window if e['modality'] == 'voice']

            face_avg  = self._average_emotions(face_events)
            voice_avg = self._average_emotions(voice_events)

            # ── Compute all four scores per modality ──────────
            def score(avg, weight_dict):
                if not avg:
                    return None
                raw = sum(avg.get(e, 0.0) * w
                          for e, w in weight_dict.items())
                return float(np.clip(raw, 0.0, 1.0))

            def conf_score(avg):
                """Confidence can be negative — normalize to 0-1."""
                if not avg:
                    return None
                raw = sum(avg.get(e, 0.0) * w
                          for e, w in self.CONFIDENCE_WEIGHTS.items())
                return float(np.clip((raw + 1.0) / 2.0, 0.0, 1.0))

            f_stress = score(face_avg,  self.STRESS_WEIGHTS)
            v_stress = score(voice_avg, self.STRESS_WEIGHTS)
            f_anx    = score(face_avg,  self.ANXIETY_WEIGHTS)
            v_anx    = score(voice_avg, self.ANXIETY_WEIGHTS)
            f_nerv   = score(face_avg,  self.NERVOUSNESS_WEIGHTS)
            v_nerv   = score(voice_avg, self.NERVOUSNESS_WEIGHTS)
            f_conf   = conf_score(face_avg)
            v_conf   = conf_score(voice_avg)

            stress      = self._fuse(f_stress, v_stress)
            anxiety     = self._fuse(f_anx,    v_anx)
            nervousness = self._fuse(f_nerv,   v_nerv)
            confidence  = self._fuse(f_conf,   v_conf)

            # Temporal smoothing
            self.stress_history.append(stress)
            self.anxiety_history.append(anxiety)
            self.nervous_history.append(nervousness)
            self.conf_history.append(confidence)

            sm_stress = float(np.mean(self.stress_history))
            sm_anx    = float(np.mean(self.anxiety_history))
            sm_nerv   = float(np.mean(self.nervous_history))
            sm_conf   = float(np.mean(self.conf_history))

            all_avg  = self._merge([face_avg, voice_avg], [0.5, 0.5])
            dominant = max(all_avg, key=all_avg.get) if all_avg else "unknown"

            elapsed = now - self.start_time
            result  = {
                'timestamp'         : now,
                'elapsed_sec'       : round(elapsed, 1),
                'face_emotions'     : face_avg,
                'voice_emotions'    : voice_avg,
                'stress_score'      : round(sm_stress  * 100, 1),
                'anxiety_score'     : round(sm_anx     * 100, 1),
                'nervousness_score' : round(sm_nerv    * 100, 1),
                'confidence_score'  : round(sm_conf    * 100, 1),
                'face_stress'       : round(f_stress   * 100, 1) if f_stress  is not None else None,
                'voice_stress'      : round(v_stress   * 100, 1) if v_stress  is not None else None,
                'dominant_emotion'  : dominant,
                'face_samples'      : len(face_events),
                'voice_samples'     : len(voice_events),
            }

            self.fused_timeline.append(result)
            self.fusion_count  += 1

            # Update session state for Streamlit
            if self.session_state:
                with self.session_state.fusion_lock:
                    self.session_state.latest_fusion = result
                with self.session_state.history_lock:
                    self.session_state.stress_history.append(sm_stress * 100)
                    self.session_state.anxiety_history.append(sm_anx   * 100)
                    self.session_state.confidence_history.append(sm_conf * 100)
                    self.session_state.time_history.append(round(elapsed, 1))

            # Console log
            print(f"\n[Fusion #{self.fusion_count}] t={elapsed:.0f}s")
            print(f"  Stress={sm_stress*100:.1f} | "
                  f"Anxiety={sm_anx*100:.1f} | "
                  f"Nervousness={sm_nerv*100:.1f} | "
                  f"Confidence={sm_conf*100:.1f}")
            print(f"  Dominant={dominant} | "
                  f"Face samples={len(face_events)} | "
                  f"Voice samples={len(voice_events)}")

    # ── Helpers ───────────────────────────────────────────────
    def _average_emotions(self, events: List[Dict]) -> Dict:
        if not events:
            return {}
        keys = set(k for e in events for k in e.get('emotions', {}))
        return {
            k: float(np.mean([e['emotions'].get(k, 0.0)
                               for e in events if 'emotions' in e]))
            for k in keys
        }

    def _fuse(self, face_s, voice_s) -> float:
        scores, weights = [], []
        if face_s  is not None:
            scores.append(face_s);  weights.append(self.WEIGHTS['face'])
        if voice_s is not None:
            scores.append(voice_s); weights.append(self.WEIGHTS['voice'])
        if not scores:
            return 0.0
        w = np.array(weights); w = w / w.sum()
        return float(np.dot(scores, w))

    def _merge(self, dicts, weights) -> Dict:
        dicts = [d for d in dicts if d]
        if not dicts:
            return {}
        keys   = set(k for d in dicts for k in d)
        total  = sum(weights[:len(dicts)])
        return {
            k: sum(d.get(k, 0.0) * weights[i]
                   for i, d in enumerate(dicts)) / total
            for k in keys
        }