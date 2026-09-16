from pathlib import Path
import io
import threading
import time
from pydantic import BaseModel
from fusion_engine import FusionEngine
import cv2
import numpy as np
import librosa
import subprocess

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"


app = FastAPI(
    title="Interview Emotion ML Service",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


facial_model = None
voice_model = None


@app.on_event("startup")
def load_models():
    global facial_model, voice_model

    print("\n[ML Service] Loading old ML models...")

    from facial_inference import FacialInference
    from voice_inference import VoiceInference

    facial_model = FacialInference(
        str(MODELS_DIR / "best_facial_model.pth"),
        str(MODELS_DIR / "vit_facial_emotion_classes.npy"),
    )   

    voice_model = VoiceInference(
        str(MODELS_DIR / "best_voice_model.pth"),
    )

    print("[ML Service] ✅ Facial model loaded")
    print("[ML Service] ✅ Voice model loaded")
    print("[ML Service] ✅ ML service ready\n")


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Interview Emotion ML Service",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "facial_model_loaded": facial_model is not None,
        "voice_model_loaded": voice_model is not None,
    }


@app.post("/predict/face")
async def predict_face(file: UploadFile = File(...)):
    if facial_model is None:
        return {
            "success": False,
            "error": "Facial model is not loaded",
        }

    try:
        image_bytes = await file.read()

        if not image_bytes:
            return {
                "success": False,
                "error": "Empty image received",
            }

        # Convert uploaded bytes → NumPy array
        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        # Decode image using OpenCV
        image_bgr = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image_bgr is None:
            return {
                "success": False,
                "error": "Could not decode image",
            }

        # OpenCV uses BGR, but FacialInference expects RGB
        image_rgb = cv2.cvtColor(
            image_bgr,
            cv2.COLOR_BGR2RGB,
        )

        # Run the OLD trained model
        predictions = facial_model.predict(image_rgb)

        # Find dominant emotion
        dominant_emotion = max(
            predictions,
            key=predictions.get,
        )

        confidence = predictions[dominant_emotion]

        return {
            "success": True,
            "emotion": dominant_emotion,
            "confidence": confidence,
            "predictions": predictions,
        }

    except Exception as e:
        print(f"[ML Service] ❌ Face prediction error: {e}")

        return {
            "success": False,
            "error": str(e),
        }


@app.post("/predict/voice")
async def predict_voice(file: UploadFile = File(...)):
    audio_bytes = await file.read()

    input_path = None
    output_path = None

    try:
        input_path = BASE_DIR / f"temp_input_{time.time_ns()}.webm"
        output_path = BASE_DIR / f"temp_output_{time.time_ns()}.wav"

        input_path.write_bytes(audio_bytes)

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-ar",
                str(voice_model.SR),
                "-ac",
                "1",
                "-sample_fmt",
                "s16",
                str(output_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )

        audio, _ = librosa.load(
            str(output_path),
            sr=voice_model.SR,
            mono=True,
        )

        audio = audio.astype(np.float32)

        result = voice_model.predict(audio)

        if not result:
            raise ValueError("Voice model returned no predictions.")

        emotion = max(result, key=result.get)
        confidence = float(result[emotion])

        return {
            "success": True,
            "emotion": emotion,
            "confidence": confidence,
            "predictions": {
                emotion_name: float(score)
                for emotion_name, score in result.items()
            },
        }

    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": f"FFmpeg conversion failed: {e.stderr}",
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }

    finally:
        if input_path and input_path.exists():
            input_path.unlink()

        if output_path and output_path.exists():
            output_path.unlink()

        
class FusionRequest(BaseModel):
    face: dict[str, float] | None = None
    voice: dict[str, float] | None = None


@app.post("/fusion")
def fuse_emotions(request: FusionRequest):
    try:
        timeline = []
        lock = threading.Lock()

        fusion = FusionEngine(
            timeline=timeline,
            timeline_lock=lock,
        )

        # Add face prediction
        if request.face:
            timeline.append({
                "timestamp": time.time(),
                "modality": "face",
                "emotions": request.face,
            })

        # Add voice prediction
        if request.voice:
            timeline.append({
                "timestamp": time.time(),
                "modality": "voice",
                "emotions": request.voice,
            })

        # Calculate averages directly using the same
        # weighting logic as the original FusionEngine.
        face_avg = fusion._average_emotions(
            [e for e in timeline if e["modality"] == "face"]
        )

        voice_avg = fusion._average_emotions(
            [e for e in timeline if e["modality"] == "voice"]
        )

        def score(avg, weight_dict):
            if not avg:
                return None

            raw = sum(
                avg.get(emotion, 0.0) * weight
                for emotion, weight in weight_dict.items()
            )

            return float(np.clip(raw, 0.0, 1.0))

        def confidence_score(avg):
            if not avg:
                return None

            raw = sum(
                avg.get(emotion, 0.0) * weight
                for emotion, weight
                in fusion.CONFIDENCE_WEIGHTS.items()
            )

            return float(
                np.clip((raw + 1.0) / 2.0, 0.0, 1.0)
            )

        face_stress = score(
            face_avg,
            fusion.STRESS_WEIGHTS,
        )

        voice_stress = score(
            voice_avg,
            fusion.STRESS_WEIGHTS,
        )

        face_anxiety = score(
            face_avg,
            fusion.ANXIETY_WEIGHTS,
        )

        voice_anxiety = score(
            voice_avg,
            fusion.ANXIETY_WEIGHTS,
        )

        face_nervousness = score(
            face_avg,
            fusion.NERVOUSNESS_WEIGHTS,
        )

        voice_nervousness = score(
            voice_avg,
            fusion.NERVOUSNESS_WEIGHTS,
        )

        face_confidence = confidence_score(face_avg)
        voice_confidence = confidence_score(voice_avg)

        stress = fusion._fuse(
            face_stress,
            voice_stress,
        )

        anxiety = fusion._fuse(
            face_anxiety,
            voice_anxiety,
        )

        nervousness = fusion._fuse(
            face_nervousness,
            voice_nervousness,
        )

        confidence = fusion._fuse(
            face_confidence,
            voice_confidence,
        )

        merged = fusion._merge(
            [face_avg, voice_avg],
            [0.5, 0.5],
        )

        dominant = (
            max(merged, key=merged.get)
            if merged
            else "unknown"
        )

        return {
            "success": True,
            "stress_score": round(stress * 100, 1),
            "anxiety_score": round(anxiety * 100, 1),
            "nervousness_score": round(nervousness * 100, 1),
            "confidence_score": round(confidence * 100, 1),
            "dominant_emotion": dominant,
        }

    except Exception as e:
        print(f"[ML Service] ❌ Fusion error: {e}")

        return {
            "success": False,
            "error": str(e),
        }
        
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )