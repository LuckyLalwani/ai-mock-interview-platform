"""
Standalone Face Recognition & Verification Model for Proctored Web Interviews.
Accepts images directly from browser webcams (Base64 data URI, bytes, PIL, or NumPy)
and returns exact integrity states: VERIFIED, NO_FACE, MULTIPLE_FACES, UNAUTHORIZED_FACE.
"""

import base64
import io
import os
from typing import Union, Optional, Dict, Any, List
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from facenet_pytorch import MTCNN, InceptionResnetV1


class FaceVerifier:
    """
    High-accuracy face verification engine using Inception-ResNet-v1 (FaceNet VGGFace2)
    and MTCNN face alignment.
    
    States:
        - VERIFIED: Single face detected that matches the registered candidate.
        - NO_FACE: No face detected in the frame.
        - MULTIPLE_FACES: More than one face detected in the frame.
        - UNAUTHORIZED_FACE: Exactly one face detected, but identity does not match.
    """

    # Exact status constants
    VERIFIED = "VERIFIED"
    NO_FACE = "NO_FACE"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    UNAUTHORIZED_FACE = "UNAUTHORIZED_FACE"

    def __init__(
        self,
        threshold: float = 0.70,
        device: Optional[str] = None
    ):
        """
        Args:
            threshold: Cosine similarity threshold for identity match (default 0.70).
            device: 'cuda', 'cpu', or None (auto-detect).
        """
        self.threshold = threshold
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        
        # MTCNN for face detection, localization, and landmark alignment
        self.detector = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            post_process=True,
            keep_all=True,
            device=self.device
        )
        
        # Inception-ResNet-v1 FaceNet feature extractor (pretrained on VGGFace2)
        self.model = InceptionResnetV1(
            pretrained="vggface2",
            classify=False
        ).eval().to(self.device)

        # Registered candidate embedding cache (512-D float array)
        self.registered_embedding: Optional[np.ndarray] = None

    def _load_image(self, image_input: Union[str, bytes, np.ndarray, Image.Image]) -> Image.Image:
        """
        Converts any input into a standardized PIL RGB Image.
        Handles:
          - Browser Base64 data URIs ("data:image/jpeg;base64,...")
          - Raw Base64 strings
          - Image file paths
          - Raw bytes / byte buffers
          - NumPy arrays (OpenCV BGR or RGB)
          - PIL Image objects
        """
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")

        elif isinstance(image_input, np.ndarray):
            # If OpenCV BGR array
            if image_input.ndim == 3 and image_input.shape[2] == 3:
                return Image.fromarray(image_input[:, :, ::-1])
            elif image_input.ndim == 2:
                return Image.fromarray(image_input).convert("RGB")
            return Image.fromarray(image_input).convert("RGB")

        elif isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input)).convert("RGB")

        elif isinstance(image_input, str):
            # Check for Base64 format from browser webcam
            if image_input.startswith("data:image") or ";base64," in image_input or len(image_input) > 500:
                if "," in image_input:
                    image_input = image_input.split(",", 1)[1]
                raw_bytes = base64.b64decode(image_input)
                return Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            
            # Otherwise assume local file path
            if os.path.exists(image_input):
                return Image.open(image_input).convert("RGB")
            raise FileNotFoundError(f"Image path not found: {image_input}")

        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

    def _extract_embeddings(self, img_pil: Image.Image) -> List[np.ndarray]:
        """Detects faces and extracts 512-D L2-normalized embeddings for each face."""
        boxes, probs = self.detector.detect(img_pil)
        if boxes is None or len(boxes) == 0:
            return []

        # Filter boxes by confidence
        valid_indices = [i for i, p in enumerate(probs) if p is not None and p >= 0.85]
        if len(valid_indices) == 0:
            return []

        # Extract aligned crops
        crops = self.detector(img_pil)
        if crops is None or len(crops) == 0:
            return []

        if crops.dim() == 3:
            crops = crops.unsqueeze(0)

        with torch.no_grad():
            raw_embeddings = self.model(crops.to(self.device))
            normalized = F.normalize(raw_embeddings, p=2, dim=1).cpu().numpy()

        return [normalized[i] for i in valid_indices if i < len(normalized)]

    def register(
        self,
        image_input: Union[str, bytes, np.ndarray, Image.Image]
    ) -> Dict[str, Any]:
        """
        Registers the candidate from an initial photo or browser webcam snapshot.
        Enforces that exactly 1 face is present.
        
        Returns:
            Dict with "success", "status", "message", and "embedding" (512-D vector as list).
        """
        img_pil = self._load_image(image_input)
        embeddings = self._extract_embeddings(img_pil)

        if len(embeddings) == 0:
            return {
                "success": False,
                "status": self.NO_FACE,
                "message": "No face detected in registration image. Please face the camera directly.",
                "embedding": None
            }
        elif len(embeddings) > 1:
            return {
                "success": False,
                "status": self.MULTIPLE_FACES,
                "message": f"Multiple faces detected ({len(embeddings)}). Ensure only one person is in the frame.",
                "embedding": None
            }
        else:
            self.registered_embedding = embeddings[0]
            return {
                "success": True,
                "status": self.VERIFIED,
                "message": "Candidate face successfully registered.",
                "embedding": self.registered_embedding.tolist()
            }

    def verify(
        self,
        image_input: Union[str, bytes, np.ndarray, Image.Image],
        registered_embedding: Optional[Union[np.ndarray, List[float]]] = None
    ) -> Dict[str, Any]:
        """
        Verifies an incoming frame from the browser webcam against the registered candidate.
        
        Args:
            image_input: Incoming webcam frame (Base64 data URI, bytes, PIL, or NumPy).
            registered_embedding: Optional 512-D embedding vector. If None, uses
                                  the embedding saved during self.register().
                                  
        Returns:
            Dict containing:
              - "status": One of "VERIFIED", "NO_FACE", "MULTIPLE_FACES", "UNAUTHORIZED_FACE"
              - "similarity": Cosine similarity score (0.0 to 1.0)
              - "faces_detected": Number of faces detected in the frame
              - "is_match": True if VERIFIED, False otherwise
              - "message": Human-readable description
        """
        # Determine reference embedding
        ref = registered_embedding if registered_embedding is not None else self.registered_embedding
        if ref is None:
            raise ValueError("No registered candidate embedding found. Please call register() first or supply registered_embedding.")

        ref_vec = np.asarray(ref, dtype=np.float32).flatten()
        norm = np.linalg.norm(ref_vec)
        if norm > 0:
            ref_vec = ref_vec / norm

        # Process incoming webcam frame
        img_pil = self._load_image(image_input)
        embeddings = self._extract_embeddings(img_pil)
        face_count = len(embeddings)

        # State 1: NO_FACE
        if face_count == 0:
            return {
                "status": self.NO_FACE,
                "similarity": 0.0,
                "faces_detected": 0,
                "is_match": False,
                "message": "No face detected in webcam frame."
            }

        # State 2: MULTIPLE_FACES
        elif face_count > 1:
            # Check highest similarity among detected faces
            sims = [float(np.clip(np.dot(ref_vec, emb), -1.0, 1.0)) for emb in embeddings]
            best_sim = max(0.0, max(sims)) if sims else 0.0
            return {
                "status": self.MULTIPLE_FACES,
                "similarity": round(best_sim, 4),
                "faces_detected": face_count,
                "is_match": False,
                "message": f"Multiple faces detected ({face_count}). Only one person is authorized."
            }

        # State 3 & 4: Exactly 1 face (Check VERIFIED vs UNAUTHORIZED_FACE)
        else:
            curr_vec = embeddings[0]
            cosine_sim = float(np.clip(np.dot(ref_vec, curr_vec), -1.0, 1.0))
            is_match = bool(cosine_sim >= self.threshold)

            if is_match:
                return {
                    "status": self.VERIFIED,
                    "similarity": round(max(0.0, cosine_sim), 4),
                    "faces_detected": 1,
                    "is_match": True,
                    "message": f"Candidate verified ({cosine_sim * 100:.1f}% match)."
                }
            else:
                return {
                    "status": self.UNAUTHORIZED_FACE,
                    "similarity": round(max(0.0, cosine_sim), 4),
                    "faces_detected": 1,
                    "is_match": False,
                    "message": f"Identity mismatch: Unrecognized person ({cosine_sim * 100:.1f}% match < {self.threshold * 100:.0f}%)."
                }
