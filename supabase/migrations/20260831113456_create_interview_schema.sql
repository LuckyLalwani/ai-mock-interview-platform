/*
# AI Mock Interview Platform - Core Schema

## Overview
Creates the database schema for an AI mock interview platform where authenticated users
can start quick mock interviews or create custom interviews with AI-generated questions,
answer them, and receive feedback.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per user, matches their auth account
- `display_name` (text) — user's chosen display name
- `default_role` (text, nullable) — e.g. "Software Engineer"
- `default_interview_length` (int, default 30) — preferred interview duration in minutes
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### interviews
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `type` (text) — 'quick' or 'custom'
- `topics` (text[]) — array of topic strings, e.g. {"Data Structures","Behavioral"}
- `role` (text, nullable) — target role, e.g. "Product Manager"
- `experience_level` (text, nullable) — 'Junior', 'Mid', or 'Senior'
- `planned_duration` (int, default 30) — planned length in minutes
- `status` (text, default 'in_progress') — 'in_progress', 'completed', 'abandoned'
- `started_at` (timestamptz, default now())
- `ended_at` (timestamptz, nullable)
- `duration_seconds` (int, nullable) — actual duration
- `feedback` (jsonb, nullable) — AI-generated summary feedback { strengths, improvements, overall }
- `created_at` (timestamptz, default now())

### interview_questions
- `id` (uuid, PK)
- `interview_id` (uuid, references interviews ON DELETE CASCADE)
- `question_text` (text) — the question prompt
- `question_index` (int) — order within the interview (0-based)
- `category` (text, nullable) — 'technical', 'behavioral', 'system_design'
- `answer_text` (text, nullable) — user's answer
- `answered_at` (timestamptz, nullable)
- `question_feedback` (jsonb, nullable) — per-question feedback { score, notes }
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on all tables.
- profiles: users can CRUD their own profile row (id = auth.uid()).
- interviews: owner-scoped CRUD via user_id = auth.uid().
- interview_questions: scoped through parent interviews table via EXISTS check.

## Notes
1. profiles.id defaults to auth.uid() so a profile is auto-created on first insert.
2. interviews.user_id defaults to auth.uid() so inserts omitting user_id succeed.
3. interview_questions are scoped through the parent interview's ownership.
4. Indexes added on user_id and interview_id for query performance.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  default_role text,
  default_interview_length int NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'custom',
  topics text[] NOT NULL DEFAULT '{}',
  role text,
  experience_level text,
  planned_duration int NOT NULL DEFAULT 30,
  camera_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  feedback jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_interviews" ON interviews;
CREATE POLICY "select_own_interviews" ON interviews FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_interviews" ON interviews;
CREATE POLICY "insert_own_interviews" ON interviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_interviews" ON interviews;
CREATE POLICY "update_own_interviews" ON interviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_interviews" ON interviews;
CREATE POLICY "delete_own_interviews" ON interviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);

-- Interview questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_index int NOT NULL DEFAULT 0,
  category text,
  answer_text text,
  answered_at timestamptz,
  question_feedback jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_questions" ON interview_questions;
CREATE POLICY "select_own_questions" ON interview_questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_questions" ON interview_questions;
CREATE POLICY "insert_own_questions" ON interview_questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_questions" ON interview_questions;
CREATE POLICY "update_own_questions" ON interview_questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_questions" ON interview_questions;
CREATE POLICY "delete_own_questions" ON interview_questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM interviews WHERE interviews.id = interview_questions.interview_id AND interviews.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_questions_interview_id ON interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_questions_index ON interview_questions(question_index);

-- Auto-create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();