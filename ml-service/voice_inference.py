# ============================================================
# VOICE EMOTION INFERENCE
#
# Model:
# ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
#
# Input : raw audio waveform, float32, 16 kHz
# Output: dict {emotion: confidence}
# ============================================================

import torch
import torch.nn as nn
import numpy as np
from transformers import Wav2Vec2Model
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

MODEL_NAME = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"

TARGET_CLASSES = [
    "anger",
    "disgust",
    "fear",
    "happiness",
    "sadness",
    "surprise",
    "neutral",
]


# ─────────────────────────────────────────────────────────────
# Temporal Attention Pooling
# ─────────────────────────────────────────────────────────────

class TemporalAttentionPooling(nn.Module):

    def __init__(self, hidden_dim):
        super().__init__()

        self.query = nn.Sequential(
            nn.Linear(hidden_dim, 256),
            nn.Tanh(),
            nn.Linear(256, 1)
        )

    def forward(self, hidden_states, mask=None):

        scores = self.query(hidden_states)

        if mask is not None:

            if mask.size(1) != hidden_states.size(1):

                stride = max(
                    1,
                    mask.size(1) // hidden_states.size(1)
                )

                sub_mask = mask[:, ::stride][
                    :, :hidden_states.size(1)
                ]

            else:
                sub_mask = mask

            scores = scores.masked_fill(
                sub_mask.unsqueeze(-1) == 0,
                -1e4
            )

        weights = torch.softmax(scores, dim=1)

        context = torch.sum(
            hidden_states * weights,
            dim=1
        )

        return context


# ─────────────────────────────────────────────────────────────
# New Voice Emotion Model
# ─────────────────────────────────────────────────────────────

class SOTAProductionVoiceEmotionModel(nn.Module):

    def __init__(
        self,
        pretrained_name=MODEL_NAME,
        num_classes=7
    ):
        super().__init__()

        self.wav2vec2 = Wav2Vec2Model.from_pretrained(
            pretrained_name
        )

        hidden_dim = self.wav2vec2.config.hidden_size

        # Same as training architecture
        self.wav2vec2.feature_extractor._freeze_parameters()

        self.attention_pool = TemporalAttentionPooling(
            hidden_dim
        )

        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_dim),
            nn.Dropout(p=0.3),
            nn.Linear(hidden_dim, 512),
            nn.GELU(),
            nn.Dropout(p=0.2),
            nn.Linear(512, num_classes)
        )

    def forward(
        self,
        input_values,
        attention_mask=None
    ):

        outputs = self.wav2vec2(
            input_values,
            attention_mask=attention_mask
        )

        hidden_states = outputs.last_hidden_state

        pooled = self.attention_pool(
            hidden_states,
            mask=attention_mask
        )

        logits = self.classifier(pooled)

        return logits


# ─────────────────────────────────────────────────────────────
# Voice Inference
# ─────────────────────────────────────────────────────────────

class VoiceInference:

    SR = 16000
    DURATION = 3.0

    def __init__(self, model_path: str, *args):

        print(
            "\n[VoiceInference] ── Initializing New Wav2Vec2 Model ──"
        )

        model_path = Path(model_path)

        # ── Validate model path ───────────────────────────────

        if not model_path.exists():

            raise FileNotFoundError(
                f"[VoiceInference] ❌ Model file not found: "
                f"{model_path}"
            )

        size_mb = model_path.stat().st_size / (1024 * 1024)

        print(
            f"  Model file found: "
            f"{model_path} ({size_mb:.2f} MB)"
        )

        # ── Device ────────────────────────────────────────────

        self.device = torch.device(
            "cuda" if torch.cuda.is_available()
            else "cpu"
        )

        print(f"  Device: {self.device}")

        # ── Classes ───────────────────────────────────────────

        self.classes = TARGET_CLASSES.copy()

        print(
            f"  Classes ({len(self.classes)}): "
            f"{self.classes}"
        )

        print(f"  Sample rate: {self.SR} Hz")
        print(f"  Duration: {self.DURATION} seconds")

        # ── Load model ────────────────────────────────────────

        try:

            print(
                f"  Loading backbone: {MODEL_NAME}"
            )

            self.model = SOTAProductionVoiceEmotionModel(
                pretrained_name=MODEL_NAME,
                num_classes=len(self.classes)
            )

            print("  Loading trained checkpoint...")

            state_dict = torch.load(
                model_path,
                map_location=self.device,
                weights_only=True
            )

            self.model.load_state_dict(
                state_dict,
                strict=True
            )

            self.model.to(self.device)
            self.model.eval()

            print(
                "  ✅ New voice model weights loaded"
            )

        except Exception as e:

            raise RuntimeError(
                f"[VoiceInference] ❌ "
                f"Failed to load model: {e}"
            )

        # ── Warmup ────────────────────────────────────────────

        try:

            dummy_audio = torch.zeros(
                1,
                int(self.SR * self.DURATION),
                dtype=torch.float32
            ).to(self.device)

            dummy_mask = torch.ones(
                1,
                int(self.SR * self.DURATION),
                dtype=torch.float32
            ).to(self.device)

            with torch.no_grad():

                output = self.model(
                    dummy_audio,
                    attention_mask=dummy_mask
                )

            expected_shape = (
                1,
                len(self.classes)
            )

            if tuple(output.shape) != expected_shape:

                raise RuntimeError(
                    f"Unexpected output shape: "
                    f"{output.shape}, "
                    f"expected {expected_shape}"
                )

            print(
                f"  ✅ Warmup forward pass OK — "
                f"output shape: {output.shape}"
            )

        except Exception as e:

            raise RuntimeError(
                f"[VoiceInference] ❌ "
                f"Warmup failed: {e}"
            )

        print(
            "[VoiceInference] ── New Model Ready ─────────────\n"
        )

    # ─────────────────────────────────────────────────────────
    # Audio preprocessing
    # ─────────────────────────────────────────────────────────

    def preprocess_audio(
        self,
        audio: np.ndarray
    ):

        target_length = int(
            self.SR * self.DURATION
        )

        if audio is None or len(audio) == 0:

            return None

        audio = np.asarray(
            audio,
            dtype=np.float32
        )

        # Remove NaN / infinity
        audio = np.nan_to_num(
            audio,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        # Normalize excessive amplitude
        max_value = np.max(
            np.abs(audio)
        )

        if max_value > 1.0:

            audio = audio / max_value

        # ── Pad or truncate to exactly 3 seconds ─────────────

        if len(audio) < target_length:

            padding = target_length - len(audio)

            audio = np.pad(
                audio,
                (0, padding),
                mode="constant"
            )

        else:

            audio = audio[:target_length]

        return audio.astype(
            np.float32
        )

    # ─────────────────────────────────────────────────────────
    # Prediction
    # ─────────────────────────────────────────────────────────

    @torch.no_grad()
    def predict(
        self,
        audio_segment: np.ndarray
    ) -> dict:

        if (
            audio_segment is None
            or len(audio_segment) == 0
        ):

            return {
                emotion: 0.0
                for emotion in self.classes
            }

        try:

            audio = self.preprocess_audio(
                audio_segment
            )

            if audio is None:

                return {
                    emotion: 0.0
                    for emotion in self.classes
                }

            # Convert waveform to tensor
            input_values = torch.tensor(
                audio,
                dtype=torch.float32
            ).unsqueeze(0).to(self.device)

            # Full 3-second audio is valid
            attention_mask = torch.ones(
                1,
                input_values.shape[1],
                dtype=torch.long
            ).to(self.device)

            # ── Forward pass ────────────────────────────────

            logits = self.model(
                input_values,
                attention_mask=attention_mask
            )

            probabilities = torch.softmax(
                logits,
                dim=1
            )

            probabilities = (
                probabilities
                .squeeze(0)
                .cpu()
                .numpy()
            )

            # ── Validate output ─────────────────────────────

            if not np.isfinite(
                probabilities
            ).all():

                print(
                    "[VoiceInference] ⚠️ "
                    "Non-finite probabilities"
                )

                return {
                    emotion: 0.0
                    for emotion in self.classes
                }

            return {
                emotion: float(probability)
                for emotion, probability
                in zip(
                    self.classes,
                    probabilities
                )
            }

        except Exception as e:

            print(
                f"[VoiceInference] ⚠️ "
                f"Prediction error: {e}"
            )

            return {
                emotion: 0.0
                for emotion in self.classes
            }