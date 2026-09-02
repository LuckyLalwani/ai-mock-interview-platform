import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { evaluateInterview } from '@/lib/ai';
import type { InterviewQuestion, Interview } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertCircle,
  Loader2,
  Square,
  X,
  Mic,
  Camera,
  VideoOff,
  CameraOff,
  RefreshCw,
} from 'lucide-react';
import VoiceInterviewModal from '@/components/VoiceInterviewModal';

export default function InterviewSession() {
  const params = useParams('/interview/:id');
  const id = params?.id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    'unknown' | 'granted' | 'denied' | 'loading'
  >('unknown');
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const answerRef = useRef('');

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // Load interview and questions
  useEffect(() => {
    async function loadData() {
      if (!id || !user) return;

      setLoading(true);
      setError(null);

      try {
        const { data: interviewData, error: interviewError } =
          await supabase
            .from('interviews')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (interviewError) {
          console.error('Interview loading error:', interviewError);
          setError('Failed to load interview.');
          setLoading(false);
          return;
        }

        if (!interviewData) {
          setError('Interview not found.');
          setLoading(false);
          return;
        }

        setInterview(interviewData as Interview);
        setCameraEnabled(Boolean(interviewData.camera_enabled));

        const { data: questionData, error: questionError } =
          await supabase
            .from('interview_questions')
            .select('*')
            .eq('interview_id', id)
            .order('question_index', { ascending: true });

        if (questionError) {
          console.error('Question loading error:', questionError);
          setError('Failed to load interview questions.');
          setLoading(false);
          return;
        }

        if (!questionData || questionData.length === 0) {
          setError('No questions were generated for this interview.');
          setLoading(false);
          return;
        }

        const loadedQuestions = questionData as InterviewQuestion[];

        setQuestions(loadedQuestions);
        setAnswer(loadedQuestions[0].answer_text ?? '');

        const start = interviewData.started_at
          ? new Date(interviewData.started_at).getTime()
          : Date.now();

        startTimeRef.current = start;

        // If the interview was created without a start timestamp,
        // initialize it now.
        if (!interviewData.started_at) {
          await supabase
            .from('interviews')
            .update({
              started_at: new Date().toISOString(),
              status: 'in_progress',
            })
            .eq('id', id);
        }
      } catch (loadError) {
        console.error('Interview load error:', loadError);
        setError('Failed to load interview. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, user]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(
          Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraStreamActive(false);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!cameraEnabled) return;

    try {
      setCameraPermission('loading');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          deviceId: selectedDeviceId
            ? { exact: selectedDeviceId }
            : undefined,
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Video play error:', playError);
        }
      }

      setCameraStreamActive(true);
      setCameraPermission('granted');

      const devices = await navigator.mediaDevices.enumerateDevices();

      setCameraDevices(
        devices.filter((device) => device.kind === 'videoinput')
      );
    } catch (cameraError) {
      console.error('Camera access error:', cameraError);
      setCameraPermission('denied');
      setCameraStreamActive(false);
    }
  }, [cameraEnabled, selectedDeviceId]);

  // Camera lifecycle
  useEffect(() => {
    if (!cameraEnabled) {
      stopCamera();
      setCameraPermission('unknown');
      return;
    }

    if (
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      startCamera();
    }

    return () => stopCamera();
  }, [
    cameraEnabled,
    selectedDeviceId,
    startCamera,
    stopCamera,
  ]);

  // Ensure video element has the active stream
  useEffect(() => {
    if (
      videoRef.current &&
      streamRef.current &&
      cameraStreamActive
    ) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [cameraStreamActive, cameraEnabled]);

  // Save answer
  const saveAnswer = useCallback(
    async (questionId: string, answerText: string) => {
      const trimmedAnswer = answerText.trim();

      const { error: saveError } = await supabase
        .from('interview_questions')
        .update({
          answer_text: answerText,
          answer_status: trimmedAnswer ? 'answered' : 'unanswered',
          answered_at: trimmedAnswer
            ? new Date().toISOString()
            : null,
        })
        .eq('id', questionId);

      if (saveError) {
        console.error('Answer save error:', saveError);
        throw new Error('Failed to save your answer.');
      }
    },
    []
  );

  // Camera toggle
  const handleCameraToggle = async () => {
    if (cameraEnabled) {
      setCameraEnabled(false);
      stopCamera();
      return;
    }

    setCameraEnabled(true);
  };

  // Camera device switch
  const handleCameraDeviceSwitch = async () => {
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return;
    }

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(
      (device) => device.kind === 'videoinput'
    );

    if (videoDevices.length <= 1) return;

    const currentIndex = videoDevices.findIndex(
      (device) => device.deviceId === selectedDeviceId
    );

    const nextDevice =
      videoDevices[
        (currentIndex + 1) % videoDevices.length
      ];

    setSelectedDeviceId(nextDevice.deviceId);
  };

  // Navigate between questions
  const goToQuestion = async (index: number) => {
    if (index < 0 || index >= questions.length || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const currentQ = questions[currentIndex];

      if (currentQ) {
        await saveAnswer(currentQ.id, answerRef.current);
      }

      const updated = [...questions];

      if (updated[currentIndex]) {
        updated[currentIndex] = {
          ...updated[currentIndex],
          answer_text: answerRef.current,
          answer_status: answerRef.current.trim()
            ? 'answered'
            : 'unanswered',
          answered_at: answerRef.current.trim()
            ? new Date().toISOString()
            : null,
        };
      }

      setQuestions(updated);
      setCurrentIndex(index);
      setAnswer(updated[index].answer_text ?? '');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save your answer.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Finish interview and request AI evaluation
  const handleEnd = async () => {
    if (!id || !interview || ending) return;

    setEnding(true);
    setError(null);

    try {
      // Save current answer first
      const currentQ = questions[currentIndex];

      if (currentQ) {
        await saveAnswer(currentQ.id, answerRef.current);

        const updatedQuestions = [...questions];

        updatedQuestions[currentIndex] = {
          ...updatedQuestions[currentIndex],
          answer_text: answerRef.current,
          answer_status: answerRef.current.trim()
            ? 'answered'
            : 'unanswered',
          answered_at: answerRef.current.trim()
            ? new Date().toISOString()
            : null,
        };

        setQuestions(updatedQuestions);
      }

      // Stop camera before leaving the interview
      stopCamera();

      // Calculate interview duration
      const durationSeconds = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );

      // Mark interview as completed
      const { error: completeError } = await supabase
        .from('interviews')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', id);

      if (completeError) {
        console.error(
          'Interview completion error:',
          completeError
        );

        throw new Error(
          'Failed to complete the interview. Please try again.'
        );
      }

      // Ask the secure Edge Function to evaluate the interview.
      // OpenRouter is called only from the server.
      await evaluateInterview(id);

      navigate(`/summary/${id}`, { replace: true });
    } catch (endError) {
      console.error('Interview completion error:', endError);

      setError(
        endError instanceof Error
          ? endError.message
          : 'We could not finish evaluating your interview. Please try again.'
      );

      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-3 text-sm text-gray-500">
            Loading interview...
          </p>
        </div>
      </div>
    );
  }

  if (error && !interview) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-error-400" />

          <p className="mt-3 text-base font-medium text-gray-900">
            {error}
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary mt-6"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-error-400" />

          <p className="mt-3 text-base font-medium text-gray-900">
            No questions were generated for this interview.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary mt-6"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress =
    ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 animate-fade-in">
      {voiceMode && (
        <VoiceInterviewModal
          questions={questions.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            question_index: q.question_index,
            category: q.category,
          }))}
          onClose={() => setVoiceMode(false)}
          onComplete={async (voiceAnswers) => {
            setVoiceMode(false);
            setEnding(true);
            setError(null);

            try {
              // Save voice answers
              const updatePromises = questions.map((q) => {
                const ans = voiceAnswers[q.id] ?? '';
                const trimmedAnswer = ans.trim();

                return supabase
                  .from('interview_questions')
                  .update({
                    answer_text: ans,
                    answer_status: trimmedAnswer
                      ? 'answered'
                      : 'unanswered',
                    answered_at: trimmedAnswer
                      ? new Date().toISOString()
                      : null,
                  })
                  .eq('id', q.id);
              });

              const results = await Promise.all(updatePromises);

              const failedUpdate = results.find(
                (result) => result.error
              );

              if (failedUpdate?.error) {
                throw new Error(
                  'Failed to save voice answers.'
                );
              }

              // Stop camera if active
              stopCamera();

              // Calculate duration
              const durationSeconds = Math.floor(
                (Date.now() - startTimeRef.current) / 1000
              );

              // Complete interview
              const { error: completeError } =
                await supabase
                  .from('interviews')
                  .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    duration_seconds: durationSeconds,
                  })
                  .eq('id', id!);

              if (completeError) {
                throw new Error(
                  'Failed to complete the interview.'
                );
              }

              // AI evaluation
              await evaluateInterview(id!);

              navigate(`/summary/${id}`, {
                replace: true,
              });
            } catch (voiceError) {
              console.error(
                'Voice interview completion error:',
                voiceError
              );

              setError(
                voiceError instanceof Error
                  ? voiceError.message
                  : 'Failed to evaluate the interview.'
              );

              setEnding(false);
            }
          }}
        />
      )}

      {/* Top bar */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                Question {currentIndex + 1} of {questions.length}
              </span>

              <span className="text-xs text-gray-400">
                ·
              </span>

              <span className="text-sm text-gray-500 capitalize">
                {currentQ.category?.replace('_', ' ') ||
                  currentQ.topic ||
                  'general'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5">
                <Clock className="h-4 w-4 text-gray-500" />

                <span className="text-sm font-mono font-medium text-gray-700">
                  {formatTime(elapsed)}
                </span>
              </div>

              <button
                onClick={() => setVoiceMode(true)}
                disabled={ending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
                title={
                  cameraEnabled
                    ? 'Record voice answer while camera is on'
                    : 'Switch to voice mode'
                }
              >
                <Mic className="h-3.5 w-3.5" />
                Voice Mode
              </button>

              <button
                onClick={() => setShowEndConfirm(true)}
                disabled={ending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error-200 bg-white px-3 py-1.5 text-sm font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5" />
                End
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full rounded-full bg-gray-100">
            <div
              className="h-1 rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className={`grid gap-6 ${
            cameraEnabled
              ? 'lg:grid-cols-[1.5fr_0.8fr]'
              : ''
          }`}
        >
          <div
            className="card p-6 sm:p-8 animate-slide-up"
            key={currentIndex}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {currentIndex + 1}
              </span>

              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {currentQ.category?.replace('_', ' ') ||
                  currentQ.topic ||
                  'general'}
              </span>
            </div>

            <h2 className="text-xl font-semibold leading-relaxed text-gray-900 sm:text-2xl">
              {currentQ.question_text}
            </h2>

            <div className="mt-6">
              <label
                className="label-text"
                htmlFor="answer"
              >
                Your answer
              </label>

              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here. Take your time and be as detailed as you can."
                className="input-field min-h-[200px] resize-y leading-relaxed"
                autoFocus
                disabled={ending}
              />

              <p className="helper-text">
                {answer.trim().length > 0
                  ? `${answer
                      .trim()
                      .split(/\s+/)
                      .length} words`
                  : 'Take your time. You can navigate between questions and your answers are saved automatically.'}
              </p>
            </div>
          </div>

          {/* Camera */}
          {cameraEnabled && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Camera className="h-4 w-4 text-primary-600" />
                  Camera
                </div>

                {cameraStreamActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-error-700">
                    <span className="h-2 w-2 rounded-full bg-error-500" />
                    Recording
                  </span>
                )}
              </div>

              <div
                className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                style={{ height: '224px' }}
              >
                {cameraPermission === 'denied' ? (
                  <div className="flex h-56 flex-col items-center justify-center bg-gray-100 p-4 text-center text-sm text-gray-600">
                    <VideoOff className="mb-2 h-8 w-8 text-gray-400" />
                    Camera access denied. Please enable camera
                    access in your browser settings.
                  </div>
                ) : cameraPermission === 'loading' ? (
                  <div className="flex h-56 items-center justify-center bg-gray-100 text-sm text-gray-600">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting camera access...
                  </div>
                ) : cameraStreamActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#000',
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-600">
                    Camera off
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleCameraToggle}
                  disabled={ending}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    cameraStreamActive
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {cameraStreamActive ? (
                    <CameraOff className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}

                  {cameraStreamActive
                    ? 'Turn off'
                    : 'Turn on'}
                </button>

                {cameraDevices.length > 1 && (
                  <button
                    onClick={handleCameraDeviceSwitch}
                    disabled={ending}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Switch camera
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error while ending/evaluating */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() =>
              goToQuestion(currentIndex - 1)
            }
            disabled={currentIndex === 0 || saving || ending}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {questions.map((question, i) => (
              <button
                key={question.id}
                onClick={() => goToQuestion(i)}
                disabled={saving || ending}
                className={`h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-6 bg-primary-600'
                    : question.answer_text
                    ? 'w-2 bg-accent-500'
                    : 'w-2 bg-gray-300'
                }`}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => setShowEndConfirm(true)}
              disabled={saving || ending}
              className="btn-primary"
            >
              Finish & Review
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() =>
                goToQuestion(currentIndex + 1)
              }
              disabled={saving || ending}
              className="btn-primary"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="card max-w-md p-6 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error-50">
                <X className="h-5 w-5 text-error-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  End interview?
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Your answers will be saved and the AI will
                  evaluate your interview. You'll then see your
                  feedback summary.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                disabled={ending}
                className="btn-secondary"
              >
                Keep practicing
              </button>

              <button
                onClick={handleEnd}
                disabled={ending}
                className="btn-primary bg-error-600 hover:bg-error-700"
              >
                {ending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI evaluating...
                  </>
                ) : (
                  'End & view results'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

