import { useRef, useState } from 'react';
import { predictVoice } from '@/lib/emotion';

export default function VoiceTest() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        });

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
  type: 'audio/webm',
});

        setLoading(true);
        setResult('');

        try {
          const prediction = await predictVoice(audioBlob);

          if (!prediction.success) {
            throw new Error(
              prediction.error || 'Voice prediction failed.'
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

      mediaRecorderRef.current = recorder;
      recorder.start();

      setRecording(true);
      setResult('');
    } catch (error) {
      console.error(error);
      setResult(
        'Could not access microphone. Please allow microphone access.'
      );
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Voice Emotion Model Test
        </h1>

        <p className="mb-6 text-gray-600">
          Test browser microphone → FastAPI → old voice emotion model.
        </p>

        <div className="rounded-2xl bg-gray-900 p-10 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary-500/20">
            <span className="text-4xl">
              {recording ? '🎙️' : '🎤'}
            </span>
          </div>

          <p className="mb-6 text-white">
            {recording
              ? 'Recording... Speak now'
              : 'Click the button and speak'}
          </p>

          {!recording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Start Recording'}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white"
            >
              Stop Recording
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