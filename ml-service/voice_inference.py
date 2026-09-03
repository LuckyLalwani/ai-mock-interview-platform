# ============================================================
# VOICE INFERENCE
# Loads trained CNN+BiLSTM model
# Input : audio segment numpy float32 at SR=22050
# Output: dict {emotion: confidence}
# ============================================================

import torch
import torch.nn as nn
import numpy as np
import librosa
import pickle
import json
from pathlib import Path


# ── Must match Notebook 2 architecture exactly ───────────────
class VoiceEmotionModel(nn.Module):
    def __init__(self, input_size, num_classes=7, dropout=0.3):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(1, 128, kernel_size=5, padding=2),
            nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(dropout),
            nn.Conv1d(128, 256, kernel_size=5, padding=2),
            nn.BatchNorm1d(256), nn.ReLU(),
            nn.MaxPool1d(2), nn.Dropout(dropout),
            nn.Conv1d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm1d(256), nn.ReLU(), nn.MaxPool1d(2),
        )
        self.bilstm = nn.LSTM(
            input_size=256, hidden_size=128,
            num_layers=2, batch_first=True,
            bidirectional=True, dropout=dropout
        )
        self.attention = nn.Sequential(
            nn.Linear(256, 64), nn.Tanh(), nn.Linear(64, 1)
        )
        self.classifier = nn.Sequential(
            nn.Linear(256, 128), nn.BatchNorm1d(128),
            nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x           = self.cnn(x)
        x           = x.permute(0, 2, 1)
        lstm_out, _ = self.bilstm(x)
        attn        = torch.softmax(self.attention(lstm_out), dim=1)
        context     = (lstm_out * attn).sum(dim=1)
        return self.classifier(context)


class VoiceInference:
    SR       = 22050
    DURATION = 3
    N_MFCC   = 40

    def __init__(self, model_path: str, scaler_path: str, config_path: str):
        print("\n[VoiceInference] ── Initializing ───────────────────")

        # ── Validate paths ────────────────────────────────────
        for label, path in [("model",  model_path),
                             ("scaler", scaler_path),
                             ("config", config_path)]:
            if not Path(path).exists():
                raise FileNotFoundError(
                    f"[VoiceInference] ❌ {label} file not found: {path}"
                )
            size_mb = Path(path).stat().st_size / 1e6
            print(f"  ✅ {label} file found: {path}  ({size_mb:.4f} MB)")

        # ── Device ────────────────────────────────────────────
        self.device = torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu'
        )
        print(f"  Device: {self.device}")

        # ── Load config ───────────────────────────────────────
        with open(config_path) as f:
            config = json.load(f)
        self.classes    = config['classes']
        self.input_size = config['input_size']
        print(f"  Classes ({len(self.classes)}): {self.classes}")
        print(f"  Input size: {self.input_size}")

        # ── Load scaler + encoder ─────────────────────────────
        with open(scaler_path, 'rb') as f:
            saved = pickle.load(f)
        self.scaler        = saved['scaler']
        self.label_encoder = saved['label_encoder']
        print(f"  ✅ Scaler loaded — "
              f"mean shape: {self.scaler.mean_.shape}")

        # ── Load model ────────────────────────────────────────
        try:
            self.model = VoiceEmotionModel(
                self.input_size, len(self.classes)
            )
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.to(self.device).eval()
            print(f"  ✅ Model loaded successfully")
        except Exception as e:
            raise RuntimeError(
                f"[VoiceInference] ❌ Failed to load model: {e}"
            )

        # ── Warmup ────────────────────────────────────────────
        try:
            dummy = torch.zeros(1, 1, self.input_size).to(self.device)
            with torch.no_grad():
                out = self.model(dummy)
            assert out.shape == (1, len(self.classes))
            print(f"  ✅ Warmup forward pass OK — output shape: {out.shape}")
        except Exception as e:
            raise RuntimeError(f"[VoiceInference] ❌ Warmup failed: {e}")

        print("[VoiceInference] ── Ready ───────────────────────────\n")

    def extract_features(self, y: np.ndarray) -> np.ndarray:
        """
        Exact same pipeline as Notebook 2 training.
        Returns float32 numpy array of shape (input_size,)
        """
        sr     = self.SR
        target = sr * self.DURATION

        if len(y) == 0:
            return None
        if len(y) < target:
            y = np.pad(y, (0, target - len(y)), mode='reflect')
        else:
            y = y[:target]

        feats = []

        # MFCC mean + std
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.N_MFCC)
        feats.extend(np.mean(mfcc, axis=1))
        feats.extend(np.std(mfcc,  axis=1))

        # Delta + Delta-Delta
        feats.extend(np.mean(librosa.feature.delta(mfcc),          axis=1))
        feats.extend(np.mean(librosa.feature.delta(mfcc, order=2), axis=1))

        # Mel spectrogram mean + std
        mel    = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        feats.extend(np.mean(mel_db, axis=1))
        feats.extend(np.std(mel_db,  axis=1))

        # Chroma
        feats.extend(np.mean(
            librosa.feature.chroma_stft(y=y, sr=sr, n_chroma=12), axis=1
        ))

        # Spectral contrast
        feats.extend(np.mean(
            librosa.feature.spectral_contrast(y=y, sr=sr), axis=1
        ))

        # Tonnetz
        harmonic = librosa.effects.harmonic(y)
        feats.extend(np.mean(
            librosa.feature.tonnetz(y=harmonic, sr=sr), axis=1
        ))

        # Scalar features
        feats.append(float(np.mean(librosa.feature.zero_crossing_rate(y))))
        feats.append(float(np.mean(librosa.feature.rms(y=y))))
        feats.append(float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))))
        feats.append(float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))))

        result = np.array(feats, dtype=np.float32)
        result = np.nan_to_num(result, nan=0.0, posinf=0.0, neginf=0.0)

        # Validate feature size matches training
        if len(result) != self.input_size:
            print(f"[VoiceInference] ⚠️  Feature size mismatch: "
                  f"got {len(result)}, expected {self.input_size}")
            return None

        return result

    @torch.no_grad()
    def predict(self, audio_segment: np.ndarray) -> dict:
        """
        audio_segment : 1D float32 numpy at SR=22050
        Returns dict e.g. {'angry':0.1, 'fear':0.6, ...}
        """
        if audio_segment is None or len(audio_segment) == 0:
            return {c: 0.0 for c in self.classes}

        try:
            feat = self.extract_features(audio_segment)
            if feat is None:
                return {c: 0.0 for c in self.classes}

            feat_scaled = self.scaler.transform(feat.reshape(1, -1))
            tensor      = torch.tensor(
                feat_scaled, dtype=torch.float32
            ).unsqueeze(1).to(self.device)    # (1, 1, input_size)

            logits = self.model(tensor)
            probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

            if not np.isfinite(probs).all():
                print("[VoiceInference] ⚠️  Non-finite probs — returning zeros")
                return {c: 0.0 for c in self.classes}

            return dict(zip(self.classes, probs.tolist()))

        except Exception as e:
            print(f"[VoiceInference] ⚠️  Prediction error: {e}")
            return {c: 0.0 for c in self.classes}