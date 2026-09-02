import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QuestionRow {
  id: string;
  question_text: string;
  question_index: number;
  category: string | null;
  question_type: string | null;
  topic: string | null;
  difficulty: string | null;
  expected_answer_points: unknown;
  evaluation_criteria: unknown;
  answer_text: string | null;
}

interface EvaluationQuestion {
  questionId: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  missedPoints: string[];
}

interface EvaluationResponse {
  overallScore: number;
  overallFeedback: string;
  strengths: string[];
  areasToImprove: string[];
  questionEvaluations: EvaluationQuestion[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    // Some models may wrap JSON in markdown fences.
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  }
}

function validateEvaluation(
  value: unknown,
  questionIds: string[],
): EvaluationResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('AI returned an invalid evaluation.');
  }

  const raw = value as Record<string, unknown>;

  const overallScore = Number(raw.overallScore);

  if (
    !Number.isFinite(overallScore) ||
    overallScore < 0 ||
    overallScore > 100
  ) {
    throw new Error('AI returned an invalid overall score.');
  }

  if (typeof raw.overallFeedback !== 'string') {
    throw new Error('AI returned invalid overall feedback.');
  }

  const rawEvaluations = Array.isArray(raw.questionEvaluations)
    ? raw.questionEvaluations
    : [];

  const evaluations: EvaluationQuestion[] = [];

  for (const questionId of questionIds) {
    const rawEvaluation = rawEvaluations.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).questionId === questionId,
    ) as Record<string, unknown> | undefined;

    if (!rawEvaluation) {
      throw new Error(
        `AI evaluation is missing question ${questionId}.`,
      );
    }

    const score = Number(rawEvaluation.score);

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error(
        `AI returned an invalid score for question ${questionId}.`,
      );
    }

    if (typeof rawEvaluation.feedback !== 'string') {
      throw new Error(
        `AI returned invalid feedback for question ${questionId}.`,
      );
    }

    evaluations.push({
      questionId,
      score: Math.round(score),
      feedback: rawEvaluation.feedback.trim(),
      strengths: normalizeStringArray(rawEvaluation.strengths),
      improvements: normalizeStringArray(
        rawEvaluation.improvements,
      ),
      missedPoints: normalizeStringArray(
        rawEvaluation.missedPoints,
      ),
    });
  }

  return {
    overallScore: Math.round(overallScore),
    overallFeedback: raw.overallFeedback.trim(),
    strengths: normalizeStringArray(raw.strengths),
    areasToImprove: normalizeStringArray(raw.areasToImprove),
    questionEvaluations: evaluations,
  };
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<unknown> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 45000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer':
          Deno.env.get('APP_URL') || 'http://localhost:5173',
        'X-Title': 'AI Mock Interview Platform',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 5000,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content: `
You are an expert technical and behavioral interview evaluator.

Evaluate interview answers fairly and consistently.

Important rules:
- Evaluate only the candidate's answer against the question and provided evaluation criteria.
- Do not evaluate protected personal traits or infer them.
- Do not make assumptions about age, gender, race, ethnicity, religion, disability, health, nationality, or other protected characteristics.
- Do not reward or penalize writing style unless communication quality is explicitly part of the evaluation criteria.
- Do not invent facts about the candidate.
- Do not invent expected answer points that were not provided.
- Be constructive and specific.
- Scores must be integers from 0 to 100.
- Return ONLY valid JSON.
            `.trim(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        'OpenRouter error:',
        response.status,
        responseText,
      );

      throw new Error(
        'The AI evaluation service is temporarily unavailable.',
      );
    }

    let data: {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error('The AI returned an invalid response.');
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('The AI returned an empty evaluation.');
    }

    return parseJsonContent(content);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'The AI evaluation took too long. Please try again.',
      );
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'The AI evaluation took too long. Please try again.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Method not allowed.',
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  const model =
    Deno.env.get('OPENROUTER_MODEL') || DEFAULT_MODEL;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !openRouterApiKey
  ) {
    console.error(
      'Missing required Edge Function environment variables.',
    );

    return jsonResponse(
      {
        error: 'Server configuration error.',
      },
      500,
    );
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return jsonResponse(
      {
        error: 'Authentication required.',
      },
      401,
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Your session has expired. Please sign in again.',
        },
        401,
      );
    }

    let body: {
      interviewId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error: 'Invalid request body.',
        },
        400,
      );
    }

    const interviewId = body.interviewId;

    if (
      !interviewId ||
      typeof interviewId !== 'string'
    ) {
      return jsonResponse(
        {
          error: 'A valid interview ID is required.',
        },
        400,
      );
    }

    // Verify ownership before loading any interview data.
    const { data: interview, error: interviewError } =
      await supabase
        .from('interviews')
        .select(
          'id, user_id, status, generation_status, title, role, topics, experience_level, interview_type, difficulty',
        )
        .eq('id', interviewId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (interviewError) {
      console.error(
        'Interview lookup error:',
        interviewError,
      );

      return jsonResponse(
        {
          error: 'Unable to load the interview.',
        },
        500,
      );
    }

    if (!interview) {
      return jsonResponse(
        {
          error: 'Interview not found.',
        },
        404,
      );
    }

    const { data: questions, error: questionsError } =
      await supabase
        .from('interview_questions')
        .select(
          'id, question_text, question_index, category, question_type, topic, difficulty, expected_answer_points, evaluation_criteria, answer_text',
        )
        .eq('interview_id', interviewId)
        .order('question_index', {
          ascending: true,
        });

    if (questionsError) {
      console.error(
        'Question lookup error:',
        questionsError,
      );

      return jsonResponse(
        {
          error: 'Unable to load interview questions.',
        },
        500,
      );
    }

    if (!questions || questions.length === 0) {
      return jsonResponse(
        {
          error: 'This interview has no questions to evaluate.',
        },
        400,
      );
    }

    const questionRows = questions as QuestionRow[];

    const evaluationInput = questionRows.map((question) => ({
      questionId: question.id,
      questionNumber: question.question_index + 1,
      question: question.question_text,
      questionType: question.question_type,
      topic: question.topic || question.category,
      difficulty: question.difficulty,
      expectedAnswerPoints:
        Array.isArray(question.expected_answer_points)
          ? question.expected_answer_points
          : [],
      evaluationCriteria:
        Array.isArray(question.evaluation_criteria)
          ? question.evaluation_criteria
          : [],
      candidateAnswer:
        question.answer_text?.trim() || '(No answer provided)',
    }));

    const prompt = `
Evaluate the following mock interview.

Interview context:
${JSON.stringify(
  {
    title: interview.title,
    role: interview.role,
    topics: interview.topics,
    experienceLevel: interview.experience_level,
    interviewType: interview.interview_type,
    difficulty: interview.difficulty,
  },
  null,
  2,
)}

Questions and candidate answers:
${JSON.stringify(evaluationInput, null, 2)}

Return JSON with EXACTLY this structure:

{
  "overallScore": 0,
  "overallFeedback": "Concise overall assessment of the candidate's performance.",
  "strengths": [
    "Specific strength"
  ],
  "areasToImprove": [
    "Specific improvement area"
  ],
  "questionEvaluations": [
    {
      "questionId": "exact-question-id",
      "score": 0,
      "feedback": "Specific feedback about this answer.",
      "strengths": [
        "What the candidate did well"
      ],
      "improvements": [
        "What the candidate should improve"
      ],
      "missedPoints": [
        "Important expected point that was missing"
      ]
    }
  ]
}

Requirements:
- Include exactly one questionEvaluations entry for every question.
- Use the exact questionId values provided.
- Score every question from 0 to 100.
- overallScore must be from 0 to 100.
- If an answer is missing, evaluate it as an unanswered question and explain that clearly.
- Use the expectedAnswerPoints and evaluationCriteria provided for each question.
- Do not invent candidate information.
- Keep feedback actionable and interview-focused.
- Return JSON only.
    `.trim();

    const rawEvaluation = await callOpenRouter(
      openRouterApiKey,
      model,
      prompt,
    );

    const evaluation = validateEvaluation(
      rawEvaluation,
      questionRows.map((question) => question.id),
    );

    // Save per-question AI evaluation.
    for (const questionEvaluation of evaluation.questionEvaluations) {
      const { error: updateQuestionError } =
        await supabase
          .from('interview_questions')
          .update({
            score: questionEvaluation.score,
            feedback: questionEvaluation.feedback,

            // Keep the existing question_feedback field populated
            // as well for compatibility with the current summary UI.
            question_feedback: {
              score: questionEvaluation.score,
              feedback: questionEvaluation.feedback,
              strengths: questionEvaluation.strengths,
              improvements:
                questionEvaluation.improvements,
              missedPoints:
                questionEvaluation.missedPoints,
            },
          })
          .eq('id', questionEvaluation.questionId)
          .eq('interview_id', interviewId);

      if (updateQuestionError) {
        console.error(
          'Question evaluation save error:',
          updateQuestionError,
        );

        throw new Error(
          'Failed to save the AI evaluation.',
        );
      }
    }

    // Save overall evaluation.
    const { error: interviewUpdateError } =
      await supabase
        .from('interviews')
        .update({
          overall_score: evaluation.overallScore,
          overall_feedback: evaluation.overallFeedback,
          strengths: evaluation.strengths,
          areas_to_improve: evaluation.areasToImprove,

          // Keep legacy feedback populated for compatibility.
          feedback: {
            overallScore: evaluation.overallScore,
            overallFeedback:
              evaluation.overallFeedback,
            strengths: evaluation.strengths,
            areasToImprove:
              evaluation.areasToImprove,
          },
        })
        .eq('id', interviewId)
        .eq('user_id', user.id);

    if (interviewUpdateError) {
      console.error(
        'Interview evaluation save error:',
        interviewUpdateError,
      );

      throw new Error(
        'Failed to save the overall evaluation.',
      );
    }

    return jsonResponse({
      success: true,
      overallScore: evaluation.overallScore,
    });
  } catch (error) {
    console.error('Evaluation function error:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to evaluate the interview right now.';

    return jsonResponse(
      {
        error: message,
      },
      500,
    );
  }
});