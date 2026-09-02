import { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { generateInterviewQuestions } from '@/lib/ai';
import { Zap, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { Difficulty, InterviewType } from '@/types';

const MODE_DESCRIPTIONS: Record<string, string> = {
  'Technical – Data Structures': 'Arrays, linked lists, trees, graphs, and more',
  'Behavioral': 'Tell me about a time... leadership, teamwork, and challenges',
  'System Design': 'Scalability, architecture, and distributed systems',
  'Algorithms': 'Sorting, searching, complexity, and problem-solving',
  'Databases': 'SQL, NoSQL, indexing, normalization, and transactions',
  'Web Development': 'HTTP, APIs, caching, rendering, and security',
  'Machine Learning': 'Supervised learning, metrics, and model evaluation',
  'Product Management': 'Prioritization, metrics, and product strategy',
};

const MODE_CONFIG: Record<
  string,
  {
    interviewType: InterviewType;
    difficulty: Difficulty;
  }
> = {
  'Technical – Data Structures': {
    interviewType: 'technical',
    difficulty: 'medium',
  },
  Behavioral: {
    interviewType: 'behavioral',
    difficulty: 'medium',
  },
  'System Design': {
    interviewType: 'system_design',
    difficulty: 'medium',
  },
  Algorithms: {
    interviewType: 'technical',
    difficulty: 'medium',
  },
  Databases: {
    interviewType: 'technical',
    difficulty: 'medium',
  },
  'Web Development': {
    interviewType: 'technical',
    difficulty: 'medium',
  },
  'Machine Learning': {
    interviewType: 'technical',
    difficulty: 'medium',
  },
  'Product Management': {
    interviewType: 'behavioral',
    difficulty: 'medium',
  },
};

export default function QuickMock() {
  const navigate = useNavigate();

  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!selectedMode) {
      setError('Please select an interview mode.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const config = MODE_CONFIG[selectedMode];

      if (!config) {
        throw new Error('Invalid interview mode selected.');
      }

      const result = await generateInterviewQuestions({
        topics: [selectedMode],
        role: undefined,
        experienceLevel: 'intermediate',
        interviewType: config.interviewType,
        difficulty: config.difficulty,
        duration: 30,
        questionCount: 8,
        cameraEnabled,
      });

      navigate(`/interview/${result.interviewId}`);
    } catch (error) {
      console.error('Quick mock generation error:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Failed to start interview. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Quick mock interview
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Pick a mode and start practicing immediately. Each session has 8
          AI-generated questions.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="label-text mb-0">
              Camera Interview
            </label>

            <p className="mt-1 text-xs text-gray-500">
              Enable webcam recording for this quick mock session.
            </p>
          </div>

          <button
            type="button"
            aria-label="Toggle quick mock camera interview"
            aria-checked={cameraEnabled}
            role="switch"
            onClick={() => setCameraEnabled((prev) => !prev)}
            disabled={loading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              cameraEnabled ? 'bg-primary-600' : 'bg-gray-300'
            } ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                cameraEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.keys(MODE_DESCRIPTIONS).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setSelectedMode(mode);
              setError(null);
            }}
            disabled={loading}
            className={`w-full card p-5 text-left transition-all duration-200 ${
              selectedMode === mode
                ? 'border-primary-600 ring-2 ring-primary-500/20'
                : 'hover:border-gray-300 hover:shadow-sm'
            } ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                    selectedMode === mode
                      ? 'bg-primary-600'
                      : 'bg-gray-100'
                  }`}
                >
                  <Zap
                    className={`h-5 w-5 ${
                      selectedMode === mode
                        ? 'text-white'
                        : 'text-gray-500'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {mode}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {MODE_DESCRIPTIONS[mode]}
                  </p>
                </div>
              </div>

              {selectedMode === mode && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!selectedMode || loading}
        className="btn-primary mt-6 w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating AI Interview...
          </>
        ) : (
          <>
            Start Now
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}