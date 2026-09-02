import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Volume2, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface VoiceInterviewModalProps {
  questions: { id: string; question_text: string; question_index: number; category: string | null }[];
  onClose: () => void;
  onComplete: (answers: Record<string, string>) => void;
}

type Phase = 'intro' | 'asking' | 'listening' | 'processing' | 'done';

export default function VoiceInterviewModal({ questions, onClose, onComplete }: VoiceInterviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');

  const currentQuestion = questions[currentIdx];

  // Camera setup
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError(true);
      }
    }
    setupCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // Request microphone permission
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream - we just needed to request permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
      return false;
    }
  }, []);

  // Text-to-speech: speak a question
  const speakQuestion = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    finalTranscriptRef.current = '';
    setInterimText('');
    setFinalText('');
    setError(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Try to use the existing audio stream if available
    try {
      if ((recognition as any).mediaStream === undefined) {
        // Some browsers don't support mediaStream property
        // Just proceed with default audio input
      }
    } catch (e) {
      // Ignore
    }

    let recognitionStarted = false;
    let networkErrorCount = 0;

    recognition.onstart = () => {
      recognitionStarted = true;
      networkErrorCount = 0;
      console.log('Speech recognition started - listening for audio...');
    };

    recognition.onresult = (event: any) => {
      console.log('Got speech results:', event.results.length);
      networkErrorCount = 0; // Reset error count on successful result
      let interim = '';
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final;
      setFinalText(final);
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected yet - keep speaking...');
        return;
      }
      
      if (event.error === 'network') {
        // Network errors are transient - suppress and auto-restart
        networkErrorCount++;
        console.warn(`Network error ${networkErrorCount} - restarting...`);
        
        // Only show error to user after multiple failures
        if (networkErrorCount > 3) {
          setError('Speech recognition having connectivity issues. You can type your answer instead.');
          return;
        }
        
        // Auto-restart after delay
        setTimeout(() => {
          try {
            console.log('Restarting speech recognition...');
            recognition.start();
          } catch (e) {
            console.error('Failed to restart:', e);
          }
        }, 500);
        return;
      }

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please check your browser microphone permissions.');
      } else if (event.error === 'audio-capture') {
        setError('No microphone detected. Please check your audio device.');
      } else if (event.error === 'aborted') {
        // User stopped or manually aborted - don't show error
        return;
      } else {
        setError(`Speech recognition error: ${event.error}. You can type your answer instead.`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // Auto-restart if still listening
      if (recognitionStarted) {
        console.log('Restarting continuous listening...');
        setTimeout(() => {
          try {
            if (recognitionRef.current === recognition) {
              recognition.start();
            }
          } catch (e) {
            // Already started
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to start speech recognition. Please try typing your answer instead.');
    }
  }, [finalText, interimText]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Start the interview
  const handleStart = useCallback(async () => {
    setError(null);
    
    // Request microphone permission first
    const permissionGranted = await requestMicPermission();
    if (!permissionGranted) {
      return;
    }

    setPhase('asking');
    await speakQuestion(currentQuestion.question_text);
    setPhase('listening');
    startListening();
  }, [currentQuestion, speakQuestion, startListening, requestMicPermission]);

  // Move to next question or finish
  const handleNext = useCallback(async () => {
    stopListening();

    // Use manual answer if speech-to-text is empty
    const answer = (finalText || manualAnswer).trim();
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      setPhase('done');
      onComplete(newAnswers);
      return;
    }

    setCurrentIdx(currentIdx + 1);
    setPhase('asking');
    setInterimText('');
    setFinalText('');
    setManualAnswer('');
    finalTranscriptRef.current = '';

    // Speak next question
    const nextQ = questions[currentIdx + 1];
    await speakQuestion(nextQ.question_text);
    setPhase('listening');
    startListening();
  }, [stopListening, answers, currentQuestion.id, currentIdx, questions, onComplete, speakQuestion, startListening, finalText, manualAnswer]);

  // Re-ask current question and retry listening
  const handleReplay = useCallback(async () => {
    stopListening();
    setError(null);
    setPhase('asking');
    await speakQuestion(currentQuestion.question_text);
    setPhase('listening');
    // Small delay before starting listening again
    setTimeout(() => {
      startListening();
    }, 500);
  }, [stopListening, speakQuestion, currentQuestion, startListening]);

  // Reset transcription and start fresh
  const handleReset = useCallback(() => {
    setError(null);
    setFinalText('');
    setInterimText('');
    setManualAnswer('');
    finalTranscriptRef.current = '';
    console.log('Transcription reset - ready to listen again');
  }, []);

  // Skip question
  const handleSkip = useCallback(() => {
    stopListening();
    const newAnswers = { ...answers, [currentQuestion.id]: '' };
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      setPhase('done');
      onComplete(newAnswers);
      return;
    }

    setCurrentIdx(currentIdx + 1);
    setInterimText('');
    setFinalText('');
    setManualAnswer('');
    finalTranscriptRef.current = '';
  }, [stopListening, answers, currentQuestion.id, currentIdx, questions, onComplete]);

  const progress = ((currentIdx + (phase === 'done' ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 animate-fade-in">
      {/* Close button */}
      <button
        onClick={() => {
          stopListening();
          window.speechSynthesis.cancel();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Close voice interview"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main content */}
      <div className="flex h-full w-full max-w-5xl flex-col p-4 sm:p-8">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-white">Voice Interview</span>
            </div>
            <span className="text-sm text-white/60">
              Question {Math.min(currentIdx + 1, questions.length)} of {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                cameraOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/5 text-white/30'
              }`}
              aria-label="Toggle camera"
            >
              {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1 w-full rounded-full bg-white/10">
          <div
            className="h-1 rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Camera + Question area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:flex-row lg:items-start">
          {/* Camera feed */}
          <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-gray-800 border border-white/10">
            {cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-white/40">
                <VideoOff className="h-8 w-8" />
                <p className="text-sm">Camera unavailable</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover -scale-x-100"
              />
            )}
            {/* Status overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              {phase === 'listening' && (
                <>
                  <Mic className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                  <span className="text-xs font-medium text-white">Listening...</span>
                </>
              )}
              {phase === 'asking' && (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-primary-400 animate-pulse" />
                  <span className="text-xs font-medium text-white">Speaking...</span>
                </>
              )}
              {phase === 'intro' && (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-white/40" />
                  <span className="text-xs font-medium text-white/60">Ready</span>
                </>
              )}
            </div>
          </div>

          {/* Question & transcript */}
          <div className="flex-1 max-w-lg">
            {phase === 'intro' && (
              <div className="flex flex-col items-center justify-center text-center lg:items-start lg:text-left">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/20">
                  <Mic className="h-7 w-7 text-primary-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Voice Interview Mode</h2>
                <p className="mt-2 text-sm text-white/60">
                  The AI will ask you each question out loud. Speak your answers naturally —
                  your speech will be transcribed in real time. Your camera will stay on throughout.
                </p>
                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-500/20 px-4 py-3 text-sm text-error-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button onClick={handleStart} className="btn-primary mt-6">
                  <Mic className="h-4 w-4" /> Start Voice Interview
                </button>
              </div>
            )}

            {(phase === 'asking' || phase === 'listening') && (
              <div className="animate-fade-in">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/20 text-xs font-bold text-primary-300">
                    {currentIdx + 1}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                    {currentQuestion.category?.replace('_', ' ') || 'general'}
                  </span>
                </div>
                <h2 className="text-lg font-semibold leading-relaxed text-white sm:text-xl">
                  {currentQuestion.question_text}
                </h2>

                {phase === 'asking' && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-primary-300">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    <span>Speaking question...</span>
                  </div>
                )}

                {phase === 'listening' && (
                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-white/40">
                        Your answer {error ? '(type or speak)' : '(transcribed)'}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleReset}
                          className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleReplay}
                          className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                          Replay question
                        </button>
                      </div>
                    </div>
                    
                    {/* Speech recognition output */}
                    {!error && (
                      <div className="min-h-[120px] rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm leading-relaxed text-white/80">
                          {finalText}
                          <span className="text-white/40 italic">{interimText}</span>
                          {!finalText && !interimText && (
                            <span className="text-white/30">Start speaking...</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Manual text input when speech fails */}
                    {error && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <textarea
                          value={manualAnswer}
                          onChange={(e) => setManualAnswer(e.target.value)}
                          placeholder="Type your answer here..."
                          className="h-[120px] w-full resize-none bg-transparent text-sm text-white placeholder-white/30 outline-none"
                        />
                      </div>
                    )}
                    
                    {error && (
                      <div className="mt-3 flex flex-col gap-2 rounded-lg bg-error-500/20 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-error-300" />
                          <span className="text-xs text-error-300">{error}</span>
                        </div>
                        <button
                          onClick={handleReplay}
                          className="self-start rounded bg-error-500/40 px-2 py-1 text-xs text-error-200 hover:bg-error-500/60 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {phase === 'done' && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-500/20">
                  <CheckCircle2 className="h-7 w-7 text-success-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Interview Complete</h2>
                <p className="mt-2 text-sm text-white/60">
                  Processing your answers and generating feedback...
                </p>
                <Loader2 className="mt-4 h-6 w-6 animate-spin text-primary-400" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        {(phase === 'listening' || phase === 'asking') && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleSkip}
              className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="btn-primary"
            >
              {currentIdx + 1 >= questions.length ? (
                <>Finish <CheckCircle2 className="h-4 w-4" /></>
              ) : (
                <>Next Question <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
