
import { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { generateInterviewQuestions } from '@/lib/ai';
import type {
  Difficulty,
  ExperienceLevel,
  InterviewType,
} from '@/types';
import {
  Plus,
  X,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

const SUGGESTED_TOPICS = [
  'Data Structures',
  'Algorithms',
  'System Design',
  'Behavioral',
  'Databases',
  'Web Development',
  'Machine Learning',
  'Product Management',
];

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Product Manager',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'Engineering Manager',
  'System Design Engineer',
];

const LEVELS: ExperienceLevel[] = [
  'Junior',
  'Mid',
  'Senior',
];

const DURATIONS = [15, 30, 45];

const INTERVIEW_TYPES: {
  value: InterviewType;
  label: string;
}[] = [
  {
    value: 'technical',
    label: 'Technical',
  },
  {
    value: 'behavioral',
    label: 'Behavioral',
  },
  {
    value: 'system_design',
    label: 'System Design',
  },
  {
    value: 'mixed',
    label: 'Mixed',
  },
];

const DIFFICULTIES: {
  value: Difficulty;
  label: string;
}[] = [
  {
    value: 'easy',
    label: 'Easy',
  },
  {
    value: 'medium',
    label: 'Medium',
  },
  {
    value: 'hard',
    label: 'Hard',
  },
  {
    value: 'mixed',
    label: 'Mixed',
  },
];

export default function CreateInterview() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState('');

  const [role, setRole] = useState(
    profile?.default_role ?? '',
  );

  const [level, setLevel] = useState<
    ExperienceLevel | ''
  >('');

  const [duration, setDuration] = useState(
    profile?.default_interview_length ?? 30,
  );

  const [interviewType, setInterviewType] =
    useState<InterviewType>('technical');

  const [difficulty, setDifficulty] =
    useState<Difficulty>('mixed');

  const [cameraEnabled, setCameraEnabled] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [loading, setLoading] =
    useState(false);

  const addTopic = (topic: string) => {
    const trimmed = topic.trim();

    if (
      trimmed &&
      !topics.some(
        (t) =>
          t.toLowerCase() ===
          trimmed.toLowerCase(),
      )
    ) {
      setTopics([
        ...topics,
        trimmed,
      ]);
    }

    setTopicInput('');
  };

  const removeTopic = (
    topic: string,
  ) => {
    setTopics(
      topics.filter(
        (t) => t !== topic,
      ),
    );
  };

  const handleTopicKeyDown = (
    e: React.KeyboardEvent,
  ) => {
    if (
      e.key === 'Enter' &&
      topicInput.trim()
    ) {
      e.preventDefault();
      addTopic(topicInput);
    }
  };

  const questionCount = Math.max(
    3,
    Math.min(
      12,
      Math.floor(duration / 5),
    ),
  );

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setError(null);

    if (topics.length === 0) {
      setError(
        'Please add at least one topic.',
      );
      return;
    }

    if (!level) {
      setError(
        'Please select an experience level.',
      );
      return;
    }

    if (
      !DURATIONS.includes(duration)
    ) {
      setError(
        'Please select a valid interview duration.',
      );
      return;
    }

    if (
      !Number.isInteger(
        questionCount,
      ) ||
      questionCount <= 0
    ) {
      setError(
        'Unable to determine the number of questions.',
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await generateInterviewQuestions({
          topics,
          role: role || undefined,
          experienceLevel: level,
          interviewType,
          difficulty,
          duration,
          questionCount,
          cameraEnabled,
        });

      if (
        !result?.interviewId
      ) {
        throw new Error(
          'The generated interview was incomplete. Please retry.',
        );
      }

      navigate(
        `/interview/${result.interviewId}`,
      );
    } catch (err) {
      console.error(
        'Failed to generate interview:',
        err,
      );

      if (
        err instanceof Error
      ) {
        setError(err.message);
      } else {
        setError(
          'We couldn’t generate the interview right now. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Create custom interview
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Define your topics and preferences. The AI will generate targeted questions for you.
        </p>
      </div>

      <div className="card p-6 sm:p-8 space-y-6">

        {/* Topics */}
        <div>
          <label className="label-text">
            Topics{' '}
            <span className="text-error-500">
              *
            </span>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) =>
                setTopicInput(
                  e.target.value,
                )
              }
              onKeyDown={
                handleTopicKeyDown
              }
              placeholder="Type a topic and press Enter"
              className="input-field"
              disabled={loading}
            />

            <button
              type="button"
              onClick={() =>
                addTopic(
                  topicInput,
                )
              }
              disabled={
                loading ||
                !topicInput.trim()
              }
              className="btn-secondary flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map(
                (topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700"
                  >
                    {topic}

                    <button
                      type="button"
                      onClick={() =>
                        removeTopic(
                          topic,
                        )
                      }
                      disabled={
                        loading
                      }
                      className="text-primary-400 hover:text-primary-600"
                      aria-label={`Remove ${topic}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ),
              )}
            </div>
          )}

          <div className="mt-3">
            <p className="helper-text mb-2">
              Suggested topics:
            </p>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS
                .filter(
                  (s) =>
                    !topics.some(
                      (t) =>
                        t.toLowerCase() ===
                        s.toLowerCase(),
                    ),
                )
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      addTopic(s)
                    }
                    disabled={
                      loading
                    }
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-700 disabled:opacity-50"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Role */}
        <div>
          <label
            className="label-text"
            htmlFor="role"
          >
            Role (optional)
          </label>

          <select
            id="role"
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value,
              )
            }
            disabled={loading}
            className="input-field cursor-pointer"
          >
            <option value="">
              Any role
            </option>

            {ROLES.map((r) => (
              <option
                key={r}
                value={r}
              >
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Experience level */}
        <div>
          <label className="label-text">
            Experience level{' '}
            <span className="text-error-500">
              *
            </span>
          </label>

          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() =>
                  setLevel(
                    level === l
                      ? ''
                      : l,
                  )
                }
                disabled={loading}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  level === l
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Interview type */}
        <div>
          <label className="label-text">
            Interview type
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INTERVIEW_TYPES.map(
              (type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setInterviewType(
                      type.value,
                    )
                  }
                  disabled={
                    loading
                  }
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    interviewType ===
                    type.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="label-text">
            Difficulty
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFFICULTIES.map(
              (item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setDifficulty(
                      item.value,
                    )
                  }
                  disabled={
                    loading
                  }
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    difficulty ===
                    item.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Camera toggle */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label className="label-text mb-0">
                Camera Interview
              </label>

              <p className="mt-1 text-xs text-gray-500">
                If enabled, your video will be recorded during the interview.
              </p>
            </div>

            <button
              type="button"
              aria-label="Toggle camera interview"
              aria-checked={
                cameraEnabled
              }
              role="switch"
              onClick={() =>
                setCameraEnabled(
                  (prev) =>
                    !prev,
                )
              }
              disabled={loading}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                cameraEnabled
                  ? 'bg-primary-600'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  cameraEnabled
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="label-text">
            Interview length
          </label>

          <div className="flex gap-2">
            {DURATIONS.map(
              (d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setDuration(d)
                  }
                  disabled={
                    loading
                  }
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                    duration === d
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {d} min
                </button>
              ),
            )}
          </div>
        </div>

        {/* AI preview */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />

            <p className="text-sm text-gray-600">
              The AI will generate approximately{' '}
              <span className="font-semibold text-gray-900">
                {questionCount}{' '}
                questions
              </span>{' '}
              based on your selected topics
              {role &&
                ` for a ${role} role`}
              {level &&
                ` at the ${level} level`}
              {` using ${interviewType.replace(
                '_',
                ' ',
              )} interview style.`}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {error}
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={
            handleSubmit
          }
          disabled={
            loading ||
            topics.length === 0
          }
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating personalized questions...
            </>
          ) : (
            <>
              Generate & Start Interview
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
