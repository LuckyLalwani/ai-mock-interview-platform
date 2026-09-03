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
import AIInterviewerAvatar from '@/components/AIInterviewerAvatar';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
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
  const [voicePhase, setVoicePhase] = useState<
  'idle' | 'speaking' | 'listening'
>('idle');

const [transcript, setTranscript] = useState('');
const [interimTranscript, setInterimTranscript] = useState('');

const recognitionRef =
  useRef<SpeechRecognitionInstance | null>(null);

const transcriptRef = useRef('');

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

  const startListening = useCallback(() => {
  const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    console.warn(
      'Speech recognition is not supported in this browser.'
    );
    setVoicePhase('listening');
    return;
  }

  // Stop any previous recognition instance.
  if (recognitionRef.current) {
    try {
      recognitionRef.current.abort();
    } catch {
      // Ignore cleanup errors.
    }
  }

  const recognition = new SpeechRecognitionAPI();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  transcriptRef.current = '';
  setTranscript('');
  setInterimTranscript('');

  recognition.onresult = (event) => {
    let finalText = transcriptRef.current;
    let interimText = '';

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      const result = event.results[i];
      const text = result[0].transcript;

      if (result.isFinal) {
        finalText += text + ' ';
      } else {
        interimText += text;
      }
    }

    transcriptRef.current = finalText.trim();

setTranscript(transcriptRef.current);
setInterimTranscript(interimText);

// Keep the existing answer state in sync
setAnswer(
  `${transcriptRef.current}${
    interimText ? ` ${interimText}` : ''
  }`.trim()
);
  };

  recognition.onerror = (event) => {
    console.error(
      'Speech recognition error:',
      event.error,
      event.message || ''
    );

    // Do not aggressively restart recognition.
    if (
      event.error === 'not-allowed' ||
      event.error === 'service-not-allowed'
    ) {
      setError(
        'Microphone access was denied. Please allow microphone access in your browser.'
      );
    }

    setInterimTranscript('');
    setVoicePhase('listening');
  };

  recognition.onend = () => {
    setInterimTranscript('');
  };

  recognitionRef.current = recognition;

  try {
    recognition.start();
    setVoicePhase('listening');
  } catch (recognitionError) {
    console.error(
      'Could not start speech recognition:',
      recognitionError
    );

    setVoicePhase('listening');
  }
}, []);
const stopListening = useCallback(() => {
  if (recognitionRef.current) {
    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore cleanup errors.
    }

    recognitionRef.current = null;
  }

  setInterimTranscript('');
}, []);

  const speakQuestion = useCallback(
  (questionText: string) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis is not supported.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      questionText
    );

    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setVoicePhase('speaking');
    };

    utterance.onend = () => {
  startListening();
};

    utterance.onerror = (event) => {
      console.error(
        'Speech synthesis error:',
        event
      );

      setVoicePhase('listening');
    };

    window.speechSynthesis.speak(utterance);
  },
  [startListening]
);

useEffect(() => {
  return () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore cleanup errors.
      }
    }

    window.speechSynthesis?.cancel();
  };
}, []);


useEffect(() => {
  if (!cameraEnabled || loading || questions.length === 0) {
    return;
  }

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion?.question_text) {
    return;
  }

  const timer = window.setTimeout(() => {
    speakQuestion(currentQuestion.question_text);
  }, 500);

  return () => {
    window.clearTimeout(timer);
    window.speechSynthesis.cancel();
  };
}, [
  cameraEnabled,
  loading,
  questions,
  currentIndex,
  speakQuestion,
]);

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
    if (cameraEnabled) {
  stopListening();
  window.speechSynthesis.cancel();
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
      stopListening();
      window.speechSynthesis.cancel();
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

              {cameraEnabled && (
  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700">
    <Mic className="h-3.5 w-3.5" />
    Voice Interview
  </span>
)}

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
        <div className="space-y-6">
          {cameraEnabled && (
            <div className="card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    AI Interview
                  </p>
                  <p className="text-xs text-gray-500">
                    Camera and voice interview
                  </p>
                </div>

                {cameraStreamActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-error-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-error-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-error-500" />
                    Live
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* User camera */}
                <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
                  {cameraPermission === 'denied' ? (
                    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                      <VideoOff className="mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-300">
                        Camera access denied
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Allow camera access in your browser settings.
                      </p>
                    </div>
                  ) : cameraPermission === 'loading' ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      <span className="text-sm text-white/70">
                        Starting camera...
                      </span>
                    </div>
                  ) : cameraStreamActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover -scale-x-100"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <VideoOff className="h-8 w-8 text-white/30" />
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">
                      You
                    </span>
                  </div>
                </div>

                {/* AI interviewer */}
                <div className="relative aspect-video overflow-hidden rounded-xl">
                  <AIInterviewerAvatar state={voicePhase} />
                </div>
              </div>

              {/* Voice transcript */}
              {(voicePhase === 'listening' ||
                transcript ||
                interimTranscript) && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary-600" />

                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Your answer
                    </span>

                    {voicePhase === 'listening' && (
                      <span className="ml-auto text-xs font-medium text-primary-600">
                        Listening...
                      </span>
                    )}
                  </div>

                  <p className="min-h-[48px] whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {transcript}

                    {interimTranscript && (
                      <span className="italic text-gray-400">
                        {' '}
                        {interimTranscript}
                      </span>
                    )}

                    {!transcript && !interimTranscript && (
                      <span className="text-gray-400">
                        Start speaking...
                      </span>
                    )}
                  </p>
                </div>
              )}

    {/* Camera controls */}
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
          ? 'Turn off camera'
          : 'Turn on camera'}
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

          {/* Camera + AI Interviewer */}
          
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

