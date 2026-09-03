import { Volume2, Mic } from 'lucide-react';

interface AIInterviewerAvatarProps {
  state: 'idle' | 'speaking' | 'listening';
}

export default function AIInterviewerAvatar({
  state,
}: AIInterviewerAvatarProps) {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gray-950">
      
      {/* Concentric AI rings */}
      <div className="relative flex h-48 w-48 items-center justify-center">

        {/* Outer ring */}
        <div
          className={`absolute inset-0 rounded-full border transition-all duration-500 ${
            isSpeaking
              ? 'animate-ping border-primary-400/40'
              : isListening
              ? 'border-accent-400/20'
              : 'border-white/10'
          }`}
        />

        {/* Middle ring */}
        <div
          className={`absolute inset-4 rounded-full border transition-all duration-500 ${
            isSpeaking
              ? 'animate-pulse border-primary-400/50 bg-primary-500/5'
              : isListening
              ? 'animate-pulse border-accent-400/40 bg-accent-500/5'
              : 'border-white/10 bg-white/5'
          }`}
        />

        {/* Inner ring */}
        <div
          className={`absolute inset-10 rounded-full border-2 transition-all duration-300 ${
            isSpeaking
              ? 'scale-110 border-primary-400 bg-primary-500/20 shadow-[0_0_45px_rgba(99,102,241,0.45)]'
              : isListening
              ? 'border-accent-400 bg-accent-500/20 shadow-[0_0_35px_rgba(16,185,129,0.3)]'
              : 'border-white/20 bg-white/10'
          }`}
        />

        {/* AI center */}
        <div
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
            isSpeaking
              ? 'scale-110'
              : isListening
              ? 'scale-100'
              : 'scale-100'
          }`}
        >
          <span
            className={`text-2xl font-bold transition-all duration-300 ${
              isSpeaking
                ? 'scale-110 text-white'
                : isListening
                ? 'text-white'
                : 'text-white/80'
            }`}
          >
            AI
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="relative z-10 mt-2 flex items-center gap-2">
        {isSpeaking && (
          <>
            <Volume2 className="h-4 w-4 animate-pulse text-primary-300" />
            <span className="text-sm font-medium text-white">
              Speaking...
            </span>
          </>
        )}

        {isListening && (
          <>
            <Mic className="h-4 w-4 animate-pulse text-accent-300" />
            <span className="text-sm font-medium text-white">
              Listening...
            </span>
          </>
        )}

        {state === 'idle' && (
          <span className="text-sm text-white/50">
            AI Interviewer
          </span>
        )}
      </div>
    </div>
  );
}