import { supabase } from './supabase';
import type {
  EvaluateInterviewResult,
  InterviewEvaluationResponse,
  InterviewGenerationConfig,
  GenerateInterviewResult,
} from '../types';

const GENERATE_FUNCTION = 'generate-interview';
const EVALUATE_FUNCTION = 'evaluate-interview';

interface EdgeFunctionError {
  message?: string;
  error?: string;
}

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error('Unable to verify your session.');
  }

  if (!user) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return user;
}

/**
 * Generate a new AI-powered interview.
 *
 * The OpenRouter API key is NOT used here.
 * The request is sent to the secure Supabase Edge Function.
 */
export async function generateInterviewQuestions(
  config: InterviewGenerationConfig
): Promise<GenerateInterviewResult> {
  await getAuthenticatedUser();

  // Basic client-side validation.
  // The Edge Function will perform the authoritative validation again.
  if (!config.topics || config.topics.length === 0) {
    throw new Error('Please select at least one interview topic.');
  }

  if (!config.experienceLevel) {
    throw new Error('Please select an experience level.');
  }

  if (!config.interviewType) {
    throw new Error('Please select an interview type.');
  }

  if (!config.difficulty) {
    throw new Error('Please select a difficulty level.');
  }

  if (!Number.isFinite(config.duration) || config.duration <= 0) {
    throw new Error('Please select a valid interview duration.');
  }

  if (
    !Number.isFinite(config.questionCount) ||
    config.questionCount <= 0
  ) {
    throw new Error('The interview must contain at least one question.');
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      GENERATE_FUNCTION,
      {
        body: {
          config,
        },
      }
    );

    if (error) {
      console.error('Interview generation error:', error);
      throw new Error(
        'We couldn’t generate the interview right now. Please try again.'
      );
    }

    const result = data as GenerateInterviewResult & EdgeFunctionError;

    if (!result || !result.interviewId) {
      const message =
        result?.message ||
        result?.error ||
        'The generated interview was incomplete. Please retry.';

      throw new Error(message);
    }

    return {
      interviewId: result.interviewId,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      'We couldn’t generate the interview right now. Please try again.'
    );
  }
}


/**
 * Evaluate all answers for a completed interview.
 *
 * The Edge Function:
 * - verifies the authenticated user
 * - verifies interview ownership
 * - loads the questions and answers
 * - calls OpenRouter
 * - validates the AI response
 * - saves scores and feedback
 */
export async function evaluateInterview(
  interviewId: string
): Promise<EvaluateInterviewResult> {
  await getAuthenticatedUser();

  if (!interviewId || typeof interviewId !== 'string') {
    throw new Error('Invalid interview ID.');
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      EVALUATE_FUNCTION,
      {
        body: {
          interviewId,
        },
      }
    );

    if (error) {
      console.error('Interview evaluation error:', error);

      throw new Error(
        'We couldn’t evaluate your interview right now. Please try again.'
      );
    }

    const result = data as EvaluateInterviewResult & EdgeFunctionError;

    if (!result || result.success !== true) {
      const message =
        result?.message ||
        result?.error ||
        'Your interview evaluation is not available yet. Please try again.';

      throw new Error(message);
    }

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      'We couldn’t evaluate your interview right now. Please try again.'
    );
  }
}


/**
 * Optional helper for retrieving an already-saved evaluation.
 *
 * This does NOT call OpenRouter.
 * It simply reads the saved evaluation from Supabase.
 */
export async function getInterviewEvaluation(
  interviewId: string
): Promise<InterviewEvaluationResponse | null> {
  await getAuthenticatedUser();

  if (!interviewId) {
    throw new Error('Invalid interview ID.');
  }

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select(
      `
        overall_score,
        overall_feedback,
        strengths,
        areas_to_improve
      `
    )
    .eq('id', interviewId)
    .maybeSingle();

  if (interviewError) {
    console.error('Failed to load interview evaluation:', interviewError);
    throw new Error('Unable to load the interview evaluation.');
  }

  if (!interview) {
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from('interview_questions')
    .select(
      `
        id,
        score,
        feedback
      `
    )
    .eq('interview_id', interviewId)
    .order('question_index', { ascending: true });

  if (questionsError) {
    console.error(
      'Failed to load question evaluations:',
      questionsError
    );

    throw new Error('Unable to load the question evaluations.');
  }

  if (
    interview.overall_score === null ||
    interview.overall_feedback === null
  ) {
    return null;
  }

  return {
    overallScore: Number(interview.overall_score),
    overallFeedback: interview.overall_feedback,
    strengths: Array.isArray(interview.strengths)
      ? interview.strengths
      : [],
    areasToImprove: Array.isArray(interview.areas_to_improve)
      ? interview.areas_to_improve
      : [],
    questionEvaluations: (questions ?? [])
      .filter(
        (
          question
        ): question is {
          id: string;
          score: number;
          feedback: string;
        } =>
          question.score !== null &&
          question.feedback !== null
      )
      .map((question) => ({
        questionId: question.id,
        score: Number(question.score),
        feedback: question.feedback,
        strengths: [],
        improvements: [],
        missedPoints: [],
      })),
  };
}