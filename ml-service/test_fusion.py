import sys
import threading
import time

sys.path.insert(0, "ml-service")

from fusion_engine import FusionEngine


timeline = []
timeline_lock = threading.Lock()

engine = FusionEngine(
    timeline=timeline,
    timeline_lock=timeline_lock,
)

face_scores = {
    "angry": 0.0263,
    "disgust": 0.1238,
    "fear": 0.0502,
    "happy": 0.1391,
    "neutral": 0.0354,
    "sad": 0.0381,
    "surprise": 0.5871,
}

voice_scores = {
    "angry": 0.1105,
    "disgust": 0.4118,
    "fear": 0.1962,
    "happy": 0.0477,
    "neutral": 0.0224,
    "sad": 0.1129,
    "surprise": 0.0986,
}

print("Starting fusion test...")

# Start the engine FIRST
engine.start()

# Then generate events so their timestamps fall inside
# the first 5-second fusion window.
time.sleep(0.2)

now = time.time()

with timeline_lock:
    for i in range(3):
        timeline.append({
            "timestamp": now - i,
            "modality": "face",
            "emotions": face_scores,
            "dominant": "surprise",
        })

        timeline.append({
            "timestamp": now - i,
            "modality": "voice",
            "emotions": voice_scores,
            "dominant": "disgust",
        })

print("Added test face + voice events.")

# Wait for the fusion engine's first 5-second cycle
time.sleep(6)

engine.stop()

print("\n========== FUSION RESULT ==========")

result = engine.get_fused_timeline()

if result:
    latest = result[-1]

    print("Stress:        ", latest["stress_score"])
    print("Anxiety:       ", latest["anxiety_score"])
    print("Nervousness:   ", latest["nervousness_score"])
    print("Confidence:    ", latest["confidence_score"])
    print("Dominant:      ", latest["dominant_emotion"])
    print("Face samples:  ", latest["face_samples"])
    print("Voice samples: ", latest["voice_samples"])
else:
    print("❌ No fusion result produced.")