import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { Interview, InterviewQuestion } from '@/types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Lightbulb,
  RotateCcw,
  Zap,
  Settings2,
  Calendar,
  Award,
} from 'lucide-react';

export default function InterviewSummary() {
  const params = useParams('/summary/:id');
  const id = params?.id;
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [proctorEvents, setProctorEvents] = useState<any[]>([]);
  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError('Interview ID is missing.');
        setLoading(false);
        return;
      }

      try {
        const { data: interviewData, error: interviewError } = await supabase
          .from('interviews')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (interviewError) {
          console.error('Failed to load interview:', interviewError);
          setError('Unable to load interview summary.');
          setLoading(false);
          return;
        }

        if (!interviewData) {
          setError('Interview not found.');
          setLoading(false);
          return;
        }

        setInterview(interviewData as Interview);

        const { data: questionData, error: questionError } = await supabase
          .from('interview_questions')
          .select('*')
          .eq('interview_id', id)
          .order('question_index', { ascending: true });

        if (questionError) {
          console.error('Failed to load questions:', questionError);
        }

        if (questionData) {
          setQuestions(questionData as InterviewQuestion[]);
        }
        const { data: proctorData, error: proctorError } = await supabase
          .from('interview_proctor_events')
          .select('*')
          .eq('interview_id', id)
          .order('created_at', { ascending: true });

        if (proctorError) {
          console.error('Failed to load proctor events:', proctorError);
        }

        if (proctorData) {
          setProctorEvents(proctorData);
        }
      } catch (err) {
        console.error('Summary loading error:', err);
        setError('Something went wrong while loading the interview.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);
const totalProctorChecks = proctorEvents.length;

const verifiedChecks = proctorEvents.filter(
  (event) => event.status === 'VERIFIED'
).length;

const noFaceEvents = proctorEvents.filter(
  (event) => event.status === 'NO_FACE'
).length;

const identityMismatchEvents = proctorEvents.filter(
  (event) => event.status === 'UNAUTHORIZED_FACE'
).length;

const multipleFaceEvents = proctorEvents.filter(
  (event) => event.status === 'MULTIPLE_FACES'
).length;

const proctorViolationCount = proctorEvents.filter(
  (event) => event.status === 'VIOLATION'
).length;
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-error-400" />

          <p className="mt-3 text-base font-medium text-gray-900">
            {error || 'Something went wrong.'}
          </p>

          <Link to="/dashboard" className="btn-secondary mt-6">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /*
   * New AI evaluation fields are stored directly on the interview:
   *
   * overall_score
   * overall_feedback
   * strengths
   * areas_to_improve
   *
   * The old implementation was reading interview.feedback, which caused
   * undefined.length errors when the new AI evaluation structure was used.
   */

  const strengths = Array.isArray(interview.strengths)
    ? interview.strengths
    : [];

  const areasToImprove = Array.isArray(interview.areas_to_improve)
    ? interview.areas_to_improve
    : [];

  const overallScore =
    typeof interview.overall_score === 'number'
      ? interview.overall_score
      : null;

  const overallFeedback =
    typeof interview.overall_feedback === 'string'
      ? interview.overall_feedback
      : null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '—';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const answeredCount = questions.filter(
    (q) => q.answer_text && q.answer_text.trim()
  ).length;
    const emotionQuestions = questions.filter(
    (q) =>
      q.fusion_result &&
      typeof q.fusion_result === 'object'
  );

  const averageEmotionMetric = (
  key:
    | 'stress'
    | 'nervousness'
    | 'confidence'
    | 'fluency'
    | 'composure'
    | 'engagement'
    | 'stability'
    | 'recovery'
    | 'frustration'
    | 'adaptability'
) => {
  const values = emotionQuestions
    .map((q) => {
      const fusion = q.fusion_result as Record<string, unknown>;
      const metrics = fusion.behavioral_metrics;

      if (!metrics || typeof metrics !== 'object') {
        return null;
      }

      const value = (metrics as Record<string, unknown>)[key];

      return typeof value === 'number' ? value : null;
    })
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
};

const averageStress = averageEmotionMetric('stress');
const averageNervousness =
  averageEmotionMetric('nervousness');
const averageConfidence =
  averageEmotionMetric('confidence');

const averageFluency = averageEmotionMetric('fluency');
const averageComposure = averageEmotionMetric('composure');
const averageEngagement = averageEmotionMetric('engagement');
const averageStability = averageEmotionMetric('stability');
const averageRecovery = averageEmotionMetric('recovery');
const averageFrustration =
  averageEmotionMetric('frustration');
const averageAdaptability =
  averageEmotionMetric('adaptability');

  const dominantEmotions = emotionQuestions
    .map((q) => {
      const fusion = q.fusion_result as Record<string, unknown>;
      return typeof fusion.dominant_emotion === 'string'
        ? fusion.dominant_emotion
        : null;
    })
    .filter((emotion): emotion is string => emotion !== null);

  const overallDominantEmotion =
    dominantEmotions.length > 0
      ? dominantEmotions.sort(
          (a, b) =>
            dominantEmotions.filter((e) => e === b).length -
            dominantEmotions.filter((e) => e === a).length
        )[0]
      : null;

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'Not evaluated';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs improvement';
  };

  const getScoreClasses = (score: number | null) => {
    if (score === null) {
      return 'bg-gray-50 text-gray-600';
    }

    if (score >= 80) {
      return 'bg-success-50 text-success-700';
    }

    if (score >= 60) {
      return 'bg-warning-50 text-warning-700';
    }

    return 'bg-error-50 text-error-700';
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in sm:px-6 lg:px-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/dashboard')}
        className="btn-ghost mb-4 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="card p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium capitalize text-primary-700">
            {interview.type === 'quick' ? (
              <Zap className="h-3 w-3" />
            ) : (
              <Settings2 className="h-3 w-3" />
            )}

            {interview.type || interview.interview_type || 'custom'}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {interview.title || 'Interview Summary'}
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          {interview.topics?.length
            ? interview.topics.join(', ')
            : 'Interview'}
        </p>

        {/* Overall Score */}
        {overallScore !== null && (
          <div className="mt-6 flex flex-col items-center rounded-xl bg-gray-50 p-6 text-center">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Award className="h-5 w-5" />
              Overall Score
            </div>

            <div className="mt-2 text-5xl font-bold text-gray-900">
              {Math.round(overallScore)}
              <span className="text-2xl font-medium text-gray-400">
                /100
              </span>
            </div>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getScoreClasses(
                overallScore
              )}`}
            >
              {getScoreLabel(overallScore)}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Questions</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {questions.length}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Answered</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {answeredCount}/{questions.length}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Duration</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatDuration(interview.duration_seconds)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Date</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatDate(interview.created_at)}
            </p>
          </div>
        </div>
      </div>
      
            {/* Overall Emotion Analysis */}
      {emotionQuestions.length > 0 && (
        <div className="card mt-6 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              Emotion Analysis
            </p>

            <h2 className="mt-1 text-base font-semibold text-gray-900">
              Interview presence
            </h2>

            {overallDominantEmotion && (
              <p className="mt-1 text-sm text-gray-500">
                Dominant emotion:{' '}
                <span className="font-semibold capitalize text-gray-700">
                  {overallDominantEmotion}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
  <div className="rounded-lg bg-error-50 p-4">
    <p className="text-xs text-gray-500">Stress</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageStress !== null ? averageStress.toFixed(1) : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-accent-50 p-4">
    <p className="text-xs text-gray-500">Nervousness</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageNervousness !== null
        ? averageNervousness.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-gray-50 p-4">
    <p className="text-xs text-gray-500">Confidence</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageConfidence !== null
        ? averageConfidence.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-primary-50 p-4">
    <p className="text-xs text-gray-500">Fluency</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageFluency !== null
        ? averageFluency.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-success-50 p-4">
    <p className="text-xs text-gray-500">Composure</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageComposure !== null
        ? averageComposure.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-primary-50 p-4">
    <p className="text-xs text-gray-500">Engagement</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageEngagement !== null
        ? averageEngagement.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-gray-50 p-4">
    <p className="text-xs text-gray-500">Stability</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageStability !== null
        ? averageStability.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-success-50 p-4">
    <p className="text-xs text-gray-500">Recovery</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageRecovery !== null
        ? averageRecovery.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-error-50 p-4">
    <p className="text-xs text-gray-500">Frustration</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageFrustration !== null
        ? averageFrustration.toFixed(1)
        : '—'}
    </p>
  </div>

  <div className="rounded-lg bg-warning-50 p-4">
    <p className="text-xs text-gray-500">Adaptability</p>
    <p className="mt-1 text-xl font-bold text-gray-900">
      {averageAdaptability !== null
        ? averageAdaptability.toFixed(1)
        : '—'}
    </p>
  </div>
</div>

          <p className="mt-4 text-xs text-gray-400">
            Based on multimodal emotion analysis from your interview responses.
          </p>
        </div>
      )}
      {/* Proctoring Analysis */}
<div className="card mt-6 p-6">
  <div className="mb-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
      Proctoring Analysis
    </p>

    <h2 className="mt-1 text-base font-semibold text-gray-900">
      Interview integrity
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      Webcam verification results recorded during the interview.
    </p>
  </div>

  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        Total Checks
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {totalProctorChecks}
      </p>
    </div>

    <div className="rounded-lg bg-green-50 p-4">
      <p className="text-xs text-gray-500">
        Verified
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {verifiedChecks}
      </p>
    </div>

    <div className="rounded-lg bg-error-50 p-4">
      <p className="text-xs text-gray-500">
        Violations
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {proctorViolationCount}
      </p>
    </div>

    <div className="rounded-lg bg-yellow-50 p-4">
      <p className="text-xs text-gray-500">
        No Face
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {noFaceEvents}
      </p>
    </div>

    <div className="rounded-lg bg-orange-50 p-4">
      <p className="text-xs text-gray-500">
        Identity Mismatch
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {identityMismatchEvents}
      </p>
    </div>

    <div className="rounded-lg bg-primary-50 p-4">
      <p className="text-xs text-gray-500">
        Multiple Faces
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {multipleFaceEvents}
      </p>
    </div>
  </div>

  <p className="mt-4 text-xs text-gray-400">
    Proctoring checks are performed periodically while the
    camera is active.
  </p>
</div>

      {/* Overall AI Feedback */}
      {overallFeedback && (
        <div className="card mt-6 p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Overall assessment
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {overallFeedback}
          </p>
        </div>
      )}

      {/* Strengths + Areas to Improve */}
      {(strengths.length > 0 || areasToImprove.length > 0) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="card p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-50">
                  <TrendingUp className="h-4 w-4 text-success-600" />
                </div>

                <h2 className="text-base font-semibold text-gray-900">
                  Strengths
                </h2>
              </div>

              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-500" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas to Improve */}
          {areasToImprove.length > 0 && (
            <div className="card p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-50">
                  <Lightbulb className="h-4 w-4 text-warning-600" />
                </div>

                <h2 className="text-base font-semibold text-gray-900">
                  Areas to improve
                </h2>
              </div>

              <ul className="space-y-2">
                {areasToImprove.map((area, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning-500" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Questions & Answers */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Questions & answers
        </h2>

        <div className="space-y-3">
          {questions.map((question, index) => {
            const answered =
              !!question.answer_text &&
              question.answer_text.trim().length > 0;

            const score =
              typeof question.score === 'number'
                ? question.score
                : null;

            return (
              <div
                key={question.id}
                className="card overflow-hidden"
              >
                {/* Question header */}
                <button
                  onClick={() =>
                    setExpandedQ(
                      expandedQ === index ? null : index
                    )
                  }
                  className="w-full p-5 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400 capitalize">
                          {(
                            question.question_type ||
                            question.category ||
                            'general'
                          ).replace('_', ' ')}
                        </span>

                        {answered ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Answered
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Skipped
                          </span>
                        )}

                        {score !== null && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreClasses(
                              score
                            )}`}
                          >
                            {Math.round(score)}/100
                          </span>
                        )}
                      </div>

                      <p className="line-clamp-2 text-sm font-medium text-gray-900">
                        {question.question_text}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {expandedQ === index && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 animate-fade-in">
                    <div className="pl-10">
                      {/* Your answer */}
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                        Your answer
                      </p>

                      {answered ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                          {question.answer_text}
                        </p>
                      ) : (
                        <p className="text-sm italic text-gray-400">
                          No answer provided.
                        </p>
                      )}

                      {/* AI feedback */}
                      {question.feedback && (
                        <div className="mt-4 rounded-lg bg-gray-50 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              AI Feedback
                            </p>

                            {score !== null && (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreClasses(
                                  score
                                )}`}
                              >
                                Score: {Math.round(score)}/100
                              </span>
                            )}
                          </div>

                          <p className="text-sm leading-relaxed text-gray-600">
                            {question.feedback}
                          </p>
                        </div>
                      )}

                      {/* Expected answer points */}
                      {Array.isArray(
                        question.expected_answer_points
                      ) &&
                        question.expected_answer_points.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                              Expected answer points
                            </p>

                            <ul className="space-y-1.5">
                              {question.expected_answer_points.map(
                                (point, pointIndex) => (
                                  <li
                                    key={pointIndex}
                                    className="flex items-start gap-2 text-sm text-gray-600"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                                    <span>{point}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Evaluation criteria */}
                      {Array.isArray(
                        question.evaluation_criteria
                      ) &&
                        question.evaluation_criteria.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                              Evaluation criteria
                            </p>

                            <ul className="space-y-1.5">
                              {question.evaluation_criteria.map(
                                (criterion, criterionIndex) => (
                                  <li
                                    key={criterionIndex}
                                    className="flex items-start gap-2 text-sm text-gray-600"
                                  >
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                                    <span>{criterion}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {questions.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-500">
                No questions were found for this interview.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/quick"
          className="btn-primary flex-1"
        >
          <RotateCcw className="h-4 w-4" />
          Try another interview
        </Link>

        <Link
          to="/create"
          className="btn-secondary flex-1"
        >
          <Settings2 className="h-4 w-4" />
          Create custom interview
        </Link>

        <Link
          to="/dashboard"
          className="btn-secondary"
        >
          <Calendar className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}