import { useState } from 'react';
import { fuseEmotions } from '@/lib/emotion';

export default function FusionTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [details, setDetails] = useState<{
    stress_score?: number;
    anxiety_score?: number;
    nervousness_score?: number;
    confidence_score?: number;
    dominant_emotion?: string;
  } | null>(null);

  const testFusion = async () => {
    setLoading(true);
    setResult('');
    setDetails(null);

    try {
      const face = {
        angry: 0.05,
        disgust: 0.10,
        fear: 0.08,
        happy: 0.20,
        neutral: 0.40,
        sad: 0.07,
        surprise: 0.10,
      };

      const voice = {
        angry: 0.08,
        disgust: 0.12,
        fear: 0.10,
        happy: 0.18,
        neutral: 0.36,
        sad: 0.06,
        surprise: 0.10,
      };

      const fusion = await fuseEmotions(face, voice);

      if (!fusion.success) {
        throw new Error(fusion.error || 'Fusion failed.');
      }

      setDetails(fusion);
    } catch (error) {
      console.error(error);
      setResult(
        error instanceof Error ? error.message : 'Fusion failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Emotion Fusion Test
        </h1>

        <p className="mb-6 text-gray-600">
          Test React → FastAPI → old fusion engine.
        </p>

        <button
          onClick={testFusion}
          disabled={loading}
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Test Fusion'}
        </button>

        {result && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-700">{result}</p>
          </div>
        )}

        {details && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <p className="mb-4 text-lg font-semibold text-gray-900">
              Fusion Result
            </p>

            <div className="space-y-3 text-gray-700">
              <p>
                <strong>Stress:</strong>{' '}
                {details.stress_score?.toFixed(1)}
              </p>

              <p>
                <strong>Anxiety:</strong>{' '}
                {details.anxiety_score?.toFixed(1)}
              </p>

              <p>
                <strong>Nervousness:</strong>{' '}
                {details.nervousness_score?.toFixed(1)}
              </p>

              <p>
                <strong>Confidence:</strong>{' '}
                {details.confidence_score?.toFixed(1)}
              </p>

              <p>
                <strong>Dominant Emotion:</strong>{' '}
                {details.dominant_emotion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}