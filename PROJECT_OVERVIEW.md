# Project Overview

This project is a React + TypeScript + Vite application for mock interview practice. It allows users to create custom or quick interview sessions, answer questions, and review performance summaries.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase for authentication and database storage
- React Router for navigation
- Lucide React icons

## Main Purpose

The app helps users prepare for interviews by:

- creating interview sessions based on topics and difficulty
- generating interview questions from a local question bank
- answering those questions in a guided flow
- tracking status and completion
- reviewing summary and feedback after the session

## Folder Structure

```text
src/
  App.tsx
  main.tsx
  index.css
  vite-env.d.ts
  components/
    Navbar.tsx
    ProtectedRoute.tsx
    Skeleton.tsx
    VoiceInterviewModal.tsx
  lib/
    auth.tsx
    questions.ts
    router.tsx
    supabase.ts
  pages/
    CreateInterview.tsx
    Dashboard.tsx
    InterviewSession.tsx
    InterviewSummary.tsx
    Landing.tsx
    Login.tsx
    QuickMock.tsx
    Settings.tsx
    Signup.tsx
  types/
    index.ts
    speech.d.ts
supabase/
  migrations/
    20260831113456_create_interview_schema.sql
```

## Core App Flow

### 1. Landing / Auth
- Users begin on the landing page.
- They can sign up or log in through the auth flow.
- Protected routes restrict access to authenticated users.

### 2. Dashboard
- The dashboard shows the user’s current status and recent interviews.
- It loads interview records from Supabase and displays summary stats such as:
  - total interviews taken
  - completed sessions
  - total practice time

File: `src/pages/Dashboard.tsx`

### 3. Create Interview
- Users can create a custom mock interview by choosing:
  - topic(s)
  - role (optional)
  - experience level
  - duration
- The app generates a list of questions using the logic in `src/lib/questions.ts`.
- The interview and generated questions are saved in the database.

File: `src/pages/CreateInterview.tsx`

### 4. Quick Mock
- Users can start a quick interview from preset modes like:
  - Technical – Data Structures
  - Behavioral
  - System Design
  - Algorithms
  - Databases
  - Web Development
  - Machine Learning
  - Product Management

File: `src/pages/QuickMock.tsx`

### 5. Interview Session
- The active interview loads its assigned questions from `interview_questions`.
- User answers are saved as they navigate through the interview.
- Feedback is generated per question and overall summaries are computed.
- The app tracks progress and navigation between questions.

File: `src/pages/InterviewSession.tsx`

### 6. Summary / Review
- After the interview, the summary page displays:
  - completion stats
  - question-by-question answers
  - feedback summary
  - performance notes

File: `src/pages/InterviewSummary.tsx`

## Question Generation

The question source is currently not an external AI API. Instead, the app uses a local bank of predefined interview questions.

Important file:
- `src/lib/questions.ts`

Inside that file:
- `QUESTION_BANK` contains a large list of question templates grouped by topic/category
- `generateQuestions()` filters and selects questions based on the user’s selected topics and optional category
- `getQuickModeTopics()` and `getQuickModeCategory()` map quick modes to the right question pools

This means the app currently generates interview prompts from static in-code content instead of a live LLM or backend service.

## Supabase Integration

The project does connect to Supabase for data persistence and auth.

Main config:
- `src/lib/supabase.ts`

It reads these environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The app uses Supabase to store:
- users / profiles (via auth and app logic)
- interview sessions
- interview questions
- answers and feedback

The database schema is defined in:
- `supabase/migrations/20260831113456_create_interview_schema.sql`

## Routing

The app uses React Router to navigate between pages.

Key route handling is in:
- `src/lib/router.tsx`

Typical pages include:
- `/` landing
- `/login`
- `/signup`
- `/dashboard`
- `/create`
- `/quick`
- `/interview/:id`
- `/summary/:id`

## Auth and Protected Access

The auth layer is in:
- `src/lib/auth.tsx`

This manages:
- user session state
- profile details
- access protection for private pages

The `ProtectedRoute` component ensures only logged-in users can access protected screens.

## Styling

The project uses Tailwind CSS with custom theme styles.

Key styling file:
- `src/index.css`

Custom reusable classes include:
- `.btn-primary`
- `.btn-secondary`
- `.card`
- `.input-field`
- `.skeleton`

## Current State of the Project

Right now, the app is a functioning mock interview app with:

- custom interview creation
- quick mode interview generation
- question answering flow
- persisted session records in Supabase
- summary and feedback evaluation
- dashboard metrics and recent history

It is a strong prototype for interview practice, but it still relies on a predefined question library rather than dynamic AI-generated content.

## Possible Next Improvements

Some natural next steps could include:

- integrating an actual AI API for live question generation
- adding richer analytics and score tracking
- improving interview audio / voice features
- adding per-user session history filters and search
- expanding onboarding and profile customization
- improving accessibility and mobile polish

## Summary

This project is a mock interview preparation platform built with React, TypeScript, Tailwind, and Supabase. It currently generates questions from a local bank, stores interview data in Supabase, and lets users practice and review their answers in a structured workflow.
