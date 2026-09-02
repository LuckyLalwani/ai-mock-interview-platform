export type InterviewType =
  | 'technical'
  | 'behavioral'
  | 'system_design'
  | 'mixed'
  | 'custom';

export type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'mixed';

export type QuestionType =
  | 'technical'
  | 'behavioral'
  | 'scenario'
  | 'system_design'
  | 'problem_solving';

export type InterviewStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

export type GenerationStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed';

export type AnswerStatus =
  | 'unanswered'
  | 'answered';


// ============================================================
// Interview generation
// ============================================================

export interface InterviewGenerationConfig {
  topics: string[];
  role?: string;
  experienceLevel: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  duration: number;
  questionCount: number;
  cameraEnabled: boolean;
}


// ============================================================
// AI-generated question
// ============================================================

export interface GeneratedInterviewQuestion {
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  topic: string;
  difficulty: Exclude<Difficulty, 'mixed'>;
  expectedAnswerPoints: string[];
  evaluationCriteria: string[];
  estimatedMinutes: number;
}

export interface GeneratedInterviewResponse {
  title: string;
  description: string;
  questions: GeneratedInterviewQuestion[];
}


// ============================================================
// AI evaluation
// ============================================================

export interface QuestionEvaluation {
  questionId: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  missedPoints: string[];
}

export interface InterviewEvaluationResponse {
  overallScore: number;
  overallFeedback: string;
  strengths: string[];
  areasToImprove: string[];
  questionEvaluations: QuestionEvaluation[];
}


// ============================================================
// Interview database model
// ============================================================

export interface Interview {
  id: string;
  user_id: string;

  title: string | null;
  role: string | null;
  topics: string[];

  experience_level: string | null;
  interview_type: InterviewType | null;
  difficulty: Difficulty | null;

  duration_minutes: number | null;
  question_count: number | null;
  camera_enabled: boolean;

  generation_status: GenerationStatus;
  status: InterviewStatus;

  created_at: string;
  started_at: string | null;
  completed_at: string | null;

  overall_score: number | null;
  overall_feedback: string | null;

  strengths: string[];
  areas_to_improve: string[];
}


// ============================================================
// Interview question database model
// ============================================================

export interface InterviewQuestion {
  id: string;
  interview_id: string;

  question_index: number;
  question_text: string;

  question_type: QuestionType | null;
  topic: string | null;
  difficulty: Exclude<Difficulty, 'mixed'> | null;

  expected_answer_points: string[];
  evaluation_criteria: string[];

  estimated_minutes: number | null;

  answer_text: string | null;
  answer_status: AnswerStatus;

  score: number | null;
  feedback: string | null;

  question_feedback?: string | null;

  created_at: string;
  answered_at: string | null;
}


// ============================================================
// API responses
// ============================================================

export interface GenerateInterviewResult {
  interviewId: string;
}

export interface EvaluateInterviewResult {
  success: boolean;
}