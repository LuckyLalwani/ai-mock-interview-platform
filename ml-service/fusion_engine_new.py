from typing import Dict, Optional, Any
import numpy as np


class FusionEngine:
    """
    Multimodal emotion fusion engine.

    Combines:
        - Facial emotion probabilities
        - Voice emotion probabilities
        - Text emotion probabilities

    into a single multimodal emotional state and
    derived behavioral metrics.
    """

    EMOTIONS = [
        "anger",
        "disgust",
        "fear",
        "happiness",
        "sadness",
        "surprise",
        "neutral",
    ]

    # Base modality weights
    BASE_WEIGHTS = {
        "face": 0.45,
        "voice": 0.45,
        "text": 0.10,
    }

    def __init__(self):
        self.base_weights = self.BASE_WEIGHTS.copy()

    # ============================================================
    # Utility
    # ============================================================

    def _clean_predictions(
        self,
        predictions: Optional[Dict[str, float]]
    ) -> Optional[Dict[str, float]]:
        """
        Validate and normalize an emotion probability dictionary.
        """

        if not predictions:
            return None

        cleaned = {}

        for emotion in self.EMOTIONS:
            value = predictions.get(emotion, 0.0)

            try:
                value = float(value)
            except (TypeError, ValueError):
                value = 0.0

            if not np.isfinite(value):
                value = 0.0

            cleaned[emotion] = max(0.0, value)

        total = sum(cleaned.values())

        if total <= 0:
            return None

        return {
            emotion: value / total
            for emotion, value in cleaned.items()
        }

    # ============================================================
    # Dynamic modality weights
    # ============================================================

    def _calculate_weights(
        self,
        face: Optional[Dict[str, float]],
        voice: Optional[Dict[str, float]],
        text: Optional[Dict[str, float]],
    ) -> Dict[str, float]:

        available = {
            "face": face is not None,
            "voice": voice is not None,
            "text": text is not None,
        }

        raw_weights = {
            modality: (
                self.base_weights[modality]
                if available[modality]
                else 0.0
            )
            for modality in self.base_weights
        }

        total = sum(raw_weights.values())

        if total <= 0:
            return {
                "face": 0.0,
                "voice": 0.0,
                "text": 0.0,
            }

        return {
            modality: round(weight / total, 4)
            for modality, weight in raw_weights.items()
        }

    # ============================================================
    # Emotion fusion
    # ============================================================

    def _fuse_emotions(
        self,
        face: Optional[Dict[str, float]],
        voice: Optional[Dict[str, float]],
        text: Optional[Dict[str, float]],
        weights: Dict[str, float],
    ) -> Dict[str, float]:

        fused = {
            emotion: 0.0
            for emotion in self.EMOTIONS
        }

        modalities = {
            "face": face,
            "voice": voice,
            "text": text,
        }

        for modality, predictions in modalities.items():

            if predictions is None:
                continue

            weight = weights.get(modality, 0.0)

            for emotion in self.EMOTIONS:
                fused[emotion] += (
                    weight * predictions.get(emotion, 0.0)
                )

        # Final normalization
        total = sum(fused.values())

        if total > 0:
            fused = {
                emotion: value / total
                for emotion, value in fused.items()
            }

        return {
            emotion: round(float(value), 6)
            for emotion, value in fused.items()
        }

    # ============================================================
    # Behavioral metrics
    # ============================================================

    def _calculate_metrics(
        self,
        fused: Dict[str, float]
    ) -> Dict[str, float]:

        anger = fused.get("anger", 0.0)
        disgust = fused.get("disgust", 0.0)
        fear = fused.get("fear", 0.0)
        happiness = fused.get("happiness", 0.0)
        sadness = fused.get("sadness", 0.0)
        surprise = fused.get("surprise", 0.0)
        neutral = fused.get("neutral", 0.0)

        # --------------------------------------------------------
        # Stress
        # --------------------------------------------------------

        stress = (
            0.40 * fear +
            0.35 * anger +
            0.25 * sadness
        )

        # --------------------------------------------------------
        # Nervousness
        # --------------------------------------------------------

        nervousness = (
            0.50 * fear +
            0.25 * surprise +
            0.25 * anger
        )

        # --------------------------------------------------------
        # Confidence
        # --------------------------------------------------------

        confidence = (
            0.60 * happiness +
            0.30 * neutral +
            0.10 * (1.0 - fear)
        )

        # --------------------------------------------------------
        # Composure
        # --------------------------------------------------------

        composure = (
            1.0 - (
                0.55 * stress +
                0.45 * nervousness
            )
        )

        # --------------------------------------------------------
        # Engagement
        # --------------------------------------------------------

        engagement = (
            0.45 * happiness +
            0.25 * surprise +
            0.20 * neutral +
            0.10 * (1.0 - sadness)
        )

        # --------------------------------------------------------
        # Frustration
        # --------------------------------------------------------

        frustration = (
            anger +
            0.60 * disgust
        )

        # --------------------------------------------------------
        # Emotional stability
        # --------------------------------------------------------

        stability = (
            neutral +
            0.50 * happiness +
            0.25 * (1.0 - surprise)
        )

        # --------------------------------------------------------
        # Fluency
        #
        # Emotion-only fusion cannot directly measure speech
        # pauses, fillers or vocabulary, so this is an emotional
        # proxy for now.
        # --------------------------------------------------------

        fluency = (
            0.50 * neutral +
            0.30 * happiness +
            0.20 * (1.0 - nervousness)
        )

        # --------------------------------------------------------
        # Recovery
        #
        # True recovery requires temporal history. For the first
        # version, use emotional balance as the baseline.
        # --------------------------------------------------------

        recovery = (
            0.50 * composure +
            0.30 * confidence +
            0.20 * stability
        )

        # --------------------------------------------------------
        # Adaptability
        # --------------------------------------------------------

        adaptability = (
            0.35 * composure +
            0.30 * confidence +
            0.20 * recovery +
            0.15 * engagement
        )

        metrics = {
            "stress": stress,
            "nervousness": nervousness,
            "confidence": confidence,
            "fluency": fluency,
            "composure": composure,
            "engagement": engagement,
            "stability": stability,
            "recovery": recovery,
            "frustration": frustration,
            "adaptability": adaptability,
        }

        return {
            key: round(
                float(np.clip(value * 100.0, 0.0, 100.0)),
                1
            )
            for key, value in metrics.items()
        }

    # ============================================================
    # Overall score
    # ============================================================

    def _calculate_overall_score(
        self,
        metrics: Dict[str, float]
    ) -> float:

        score = (
            0.25 * metrics["confidence"] +
            0.20 * metrics["composure"] +
            0.20 * metrics["fluency"] +
            0.15 * metrics["engagement"] +
            0.10 * metrics["adaptability"] +
            0.10 * (100.0 - metrics["stress"])
        )

        return round(
            float(np.clip(score, 0.0, 100.0)),
            1
        )

    # ============================================================
    # Public API
    # ============================================================

    def fuse(
        self,
        face: Optional[Dict[str, float]] = None,
        voice: Optional[Dict[str, float]] = None,
        text: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:

        # Clean inputs
        face_clean = self._clean_predictions(face)
        voice_clean = self._clean_predictions(voice)
        text_clean = self._clean_predictions(text)

        # Dynamic weights
        weights = self._calculate_weights(
            face_clean,
            voice_clean,
            text_clean,
        )

        # Multimodal emotion fusion
        fused_emotions = self._fuse_emotions(
            face_clean,
            voice_clean,
            text_clean,
            weights,
        )

        # Behavioral metrics
        metrics = self._calculate_metrics(
            fused_emotions
        )

        # Overall score
        overall_score = self._calculate_overall_score(
            metrics
        )

        # Dominant emotion
        dominant_emotion = (
            max(
                fused_emotions,
                key=fused_emotions.get
            )
            if fused_emotions
            else "unknown"
        )

        return {
            "success": True,

            "weights": weights,

            "emotions": fused_emotions,

            "dominant_emotion": dominant_emotion,

            "behavioral_metrics": metrics,

            "overall_score": overall_score,
        }