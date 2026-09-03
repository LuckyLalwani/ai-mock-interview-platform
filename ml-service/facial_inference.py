# ============================================================
# FACIAL INFERENCE
# Loads trained EfficientNetB0 model
# Input : cropped face image (numpy RGB)
# Output: dict {emotion: confidence}
# ============================================================

import torch
import torch.nn as nn
import numpy as np
import timm
import cv2
from pathlib import Path


# ── Must match Notebook 1 architecture exactly ───────────────
class FacialEmotionModel(nn.Module):
    def __init__(self, num_classes=7, dropout=0.4):
        super().__init__()
        self.backbone   = timm.create_model(
            'efficientnet_b0', pretrained=False, num_classes=0
        )
        feat_dim        = self.backbone.num_features   # 1280
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(feat_dim, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(dropout / 2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.classifier(self.backbone(x))


class FacialInference:

    # ImageNet normalization — same as Notebook 1 training
    MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __init__(self, model_path: str, classes_path: str):
        print("\n[FacialInference] ── Initializing ──────────────────")

        # ── Validate paths ────────────────────────────────────
        for label, path in [("model",   model_path),
                             ("classes", classes_path)]:
            if not Path(path).exists():
                raise FileNotFoundError(
                    f"[FacialInference] ❌ {label} file not found: {path}\n"
                    f"  Make sure you copied it from Google Drive to models/"
                )
            size_mb = Path(path).stat().st_size / 1e6
            print(f"  ✅ {label} file found: {path}  ({size_mb:.2f} MB)")

        # ── Device ────────────────────────────────────────────
        self.device = torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu'
        )
        print(f"  Device: {self.device}")

        # ── Load classes ──────────────────────────────────────
        self.classes = np.load(classes_path, allow_pickle=True).tolist()
        print(f"  Classes ({len(self.classes)}): {self.classes}")

        # ── Load model ────────────────────────────────────────
        try:
            self.model = FacialEmotionModel(num_classes=len(self.classes))
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.to(self.device).eval()
            print(f"  ✅ Model loaded successfully")
        except Exception as e:
            raise RuntimeError(
                f"[FacialInference] ❌ Failed to load model weights: {e}\n"
                f"  Common cause: model architecture mismatch with saved weights"
            )

        # ── Warmup forward pass ───────────────────────────────
        try:
            dummy = torch.zeros(1, 3, 224, 224).to(self.device)
            with torch.no_grad():
                out = self.model(dummy)
            assert out.shape == (1, len(self.classes)), \
                f"Expected (1,{len(self.classes)}), got {out.shape}"
            print(f"  ✅ Warmup forward pass OK — output shape: {out.shape}")
        except Exception as e:
            raise RuntimeError(f"[FacialInference] ❌ Warmup failed: {e}")

        print("[FacialInference] ── Ready ──────────────────────────\n")

    def preprocess(self, face_rgb: np.ndarray) -> torch.Tensor:
        """
        face_rgb : H×W×3 numpy uint8 RGB (already cropped)
        Returns  : (1, 3, 224, 224) float32 tensor
        """
        img = cv2.resize(face_rgb, (224, 224)).astype(np.float32) / 255.0
        img = (img - self.MEAN) / self.STD
        img = img.transpose(2, 0, 1)            # HWC → CHW
        return torch.tensor(img, dtype=torch.float32).unsqueeze(0).to(self.device)

    @torch.no_grad()
    def predict(self, face_rgb: np.ndarray) -> dict:
        """
        Returns emotion probability dict.
        Returns all-zero dict if face is invalid.
        """
        if face_rgb is None or face_rgb.size == 0:
            return {c: 0.0 for c in self.classes}

        try:
            tensor = self.preprocess(face_rgb)
            logits = self.model(tensor)
            probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

            # Validate output
            if not np.isfinite(probs).all():
                print("[FacialInference] ⚠️  Non-finite probabilities — returning zeros")
                return {c: 0.0 for c in self.classes}

            return dict(zip(self.classes, probs.tolist()))

        except Exception as e:
            print(f"[FacialInference] ⚠️  Prediction error: {e}")
            return {c: 0.0 for c in self.classes}