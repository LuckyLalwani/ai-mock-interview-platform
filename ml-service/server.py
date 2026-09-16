from pathlib import Path
import io
import threading
import time
from pydantic import BaseModel
from fusion_engine_new import FusionEngine
import cv2
import numpy as np
import librosa
import subprocess

from face_verifier import FaceVerifier
from text_inference import text_predictor
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
face_verifier = None


@app.on_event("startup")
def load_models():
    global facial_model, voice_model, face_verifier

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

    face_verifier = FaceVerifier(threshold=0.70)

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

@app.post("/proctor/register")
async def register_proctor_face(file: UploadFile = File(...)):
    contents = await file.read()

    temp_path = BASE_DIR / f"proctor_register_{time.time_ns()}.jpg"

    try:
        temp_path.write_bytes(contents)

        result = face_verifier.register(str(temp_path))

        return result

    except Exception as e:
        print(f"[Proctor] Registration error: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
        }

    finally:
        if temp_path.exists():
            temp_path.unlink()

@app.post("/proctor/verify")
async def verify_proctor_face(file: UploadFile = File(...)):
    if face_verifier is None:
        return {
            "status": "ERROR",
            "message": "Face verifier is not loaded",
        }

    contents = await file.read()
    temp_path = BASE_DIR / f"proctor_verify_{time.time_ns()}.jpg"

    try:
        temp_path.write_bytes(contents)

        result = face_verifier.verify(str(temp_path))

        return result

    except Exception as e:
        print(f"[Proctor] Verification error: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
        }

    finally:
        if temp_path.exists():
            temp_path.unlink()

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

@app.post("/predict/text")
async def predict_text(request: dict):
    try:
        text = request.get("text", "").strip()

        if not text:
            return {
                "success": False,
                "error": "No text provided"
            }

        result = text_predictor.predict(text)

        return result

    except Exception as e:
        print(f"[ML Service] ❌ Text prediction error: {e}")

        return {
            "success": False,
            "error": str(e)
        }
        
class FusionRequest(BaseModel):
    face: dict[str, float] | None = None
    voice: dict[str, float] | None = None
    text: dict[str, float] | None = None


@app.post("/fusion")
def fuse_emotions(request: FusionRequest):
    try:
        fusion = FusionEngine()

        result = fusion.fuse(
            face=request.face,
            voice=request.voice,
            text=request.text,
        )

        return result

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