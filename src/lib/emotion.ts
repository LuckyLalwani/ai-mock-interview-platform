const ML_SERVICE_URL = 'http://127.0.0.1:8000';

export interface EmotionPrediction {
  success: boolean;
  emotion?: string;
  confidence?: number;
  predictions?: Record<string, number>;
  error?: string;
}

export interface FusionResult {
  success: boolean;
  stress_score?: number;
  anxiety_score?: number;
  nervousness_score?: number;
  confidence_score?: number;
  dominant_emotion?: string;
  error?: string;
}

/**
 * Send a camera image to the Python facial emotion model.
 */
export async function predictFace(
  imageBlob: Blob
): Promise<EmotionPrediction> {
  const formData = new FormData();

  formData.append(
    'file',
    imageBlob,
    'face.jpg'
  );

  const response = await fetch(
    `${ML_SERVICE_URL}/predict/face`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Face prediction failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Send an audio recording to the Python voice emotion model.
 */
export async function predictVoice(
  audioBlob: Blob
): Promise<EmotionPrediction> {
  const formData = new FormData();

  formData.append(
    'file',
    audioBlob,
    'voice.wav'
  );

  const response = await fetch(
    `${ML_SERVICE_URL}/predict/voice`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Voice prediction failed: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Combine facial and voice emotion probabilities
 * using the Python FusionEngine.
 */
export async function fuseEmotions(
  face: Record<string, number> | null,
  voice: Record<string, number> | null
): Promise<FusionResult> {
  const response = await fetch(
    `${ML_SERVICE_URL}/fusion`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face,
        voice,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Fusion failed: ${response.status}`
    );
  }

  return response.json();
}