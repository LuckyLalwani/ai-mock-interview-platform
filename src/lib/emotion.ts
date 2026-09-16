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

  weights?: {
    face: number;
    voice: number;
    text: number;
  };

  emotions?: Record<string, number>;

  dominant_emotion?: string;

  behavioral_metrics?: {
    stress: number;
    nervousness: number;
    confidence: number;
    fluency: number;
    composure: number;
    engagement: number;
    stability: number;
    recovery: number;
    frustration: number;
    adaptability: number;
  };

  overall_score?: number;

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

export async function predictText(
  text: string
): Promise<EmotionPrediction> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Text prediction failed: ${response.status}`);
  }

  return response.json();
}
/**
 * Combine facial and voice emotion probabilities
 * using the Python FusionEngine.
 */
export async function fuseEmotions(
  face: Record<string, number> | null,
  voice: Record<string, number> | null,
  text: Record<string, number> | null
): Promise<FusionResult> {
  const response = await fetch(`${ML_SERVICE_URL}/fusion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      face,
      voice,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Fusion failed: ${response.status}`);
  }

  return response.json();
}

export interface ProctorResult {
  status: 'VERIFIED' | 'NO_FACE' | 'MULTIPLE_FACES' | 'UNAUTHORIZED_FACE' | 'ERROR';
  similarity?: number;
  faces_detected?: number;
  is_match?: boolean;
  message?: string;
}

export async function registerProctorFace(
  imageBlob: Blob
): Promise<ProctorResult> {
  const formData = new FormData();
  formData.append('file', imageBlob, 'proctor-register.jpg');

  const response = await fetch(`${ML_SERVICE_URL}/proctor/register`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Proctor registration failed: ${response.status}`);
  }

  return response.json();
}

export async function verifyProctorFace(
  imageBlob: Blob
): Promise<ProctorResult> {
  const formData = new FormData();
  formData.append('file', imageBlob, 'proctor-verify.jpg');

  const response = await fetch(`${ML_SERVICE_URL}/proctor/verify`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Proctor verification failed: ${response.status}`);
  }

  return response.json();
}