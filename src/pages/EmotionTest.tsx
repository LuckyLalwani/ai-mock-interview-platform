import { useRef, useState } from 'react';
import { predictFace } from '@/lib/emotion';

export default function EmotionTest() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
      setResult('');
    } catch (error) {
      console.error(error);
      setResult('Could not access camera.');
    }
  };

  const captureAndPredict = async () => {
    if (!videoRef.current) {
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const video = videoRef.current;

      const canvas = document.createElement('canvas');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not create canvas context.');
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          resolve,
          'image/jpeg',
          0.85
        );
      });

      if (!blob) {
        throw new Error('Could not create image.');
      }

      const prediction = await predictFace(blob);

      if (!prediction.success) {
        throw new Error(
          prediction.error || 'Face prediction failed.'
        );
      }

      setResult(
        `${prediction.emotion} — ${(
          (prediction.confidence || 0) * 100
        ).toFixed(1)}%`
      );
    } catch (error) {
      console.error(error);

      setResult(
        error instanceof Error
          ? error.message
          : 'Prediction failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Emotion Model Test
        </h1>

        <p className="mb-6 text-gray-600">
          Test browser camera → FastAPI → old facial model.
        </p>

        <div className="overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
          />
        </div>

        <div className="mt-6 flex gap-3">
          {!cameraActive && (
            <button
              onClick={startCamera}
              className="rounded-lg bg-primary-600 px-5 py-3 font-medium text-white"
            >
              Start Camera
            </button>
          )}

          {cameraActive && (
            <button
              onClick={captureAndPredict}
              disabled={loading}
              className="rounded-lg bg-primary-600 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? 'Analyzing...'
                : 'Analyze Face'}
            </button>
          )}
        </div>

        {result && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Prediction
            </p>

            <p className="mt-1 text-xl font-semibold text-gray-900">
              {result}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}