# Project Overview
The project is a **Mock Interview Application** built using **React 18, TypeScript, Vite, and Tailwind CSS**. It utilizes **Supabase** for user authentication, PostgreSQL database storage, and secure serverless backend logic (Edge Functions). The application integrates **OpenRouter AI** to dynamically generate personalized interview questions and evaluate the user's answers.

---

## System Architecture & Flow

The application follows a secure client-server architecture where sensitive operations (like contacting the AI API) are offloaded to backend Edge Functions.

### 1. Authentication & Setup
- Users land on the site and authenticate via Supabase Auth.
- Upon logging in, they are directed to the **Dashboard**, which displays their interview history and statistics.

### 2. Interview Creation (Frontend ↔ Backend ↔ OpenRouter)
- The user creates an interview either via a custom form (`CreateInterview.tsx`) or by selecting a preset (`QuickMock.tsx`).
- The frontend calls the `generateInterviewQuestions()` helper from `src/lib/ai.ts`.
- This helper invokes the **Supabase Edge Function** `generate-interview`.
- The Edge Function securely communicates with **OpenRouter API** to generate structured JSON interview questions based on the user's configuration.
- The generated questions are validated, saved into the Supabase database (`interviews` and `interview_questions` tables), and the interview ID is returned to the frontend.

### 3. Interview Session (Frontend ↔ Database)
- The user is redirected to the `InterviewSession.tsx` page.
- The frontend loads the saved questions from Supabase and presents them one by one.
- The user types (or speaks) their answers. The frontend autosaves the answers directly to the Supabase database.
- Optional camera/video features are supported directly on the client side.

### 4. Evaluation & Summary (Frontend ↔ Backend ↔ OpenRouter)
- Once the user submits their final answer, the frontend invokes `evaluateInterview()` from `src/lib/ai.ts`.
- This calls the **Supabase Edge Function** `evaluate-interview`.
- The Edge Function retrieves the user's answers from the database and sends them to OpenRouter to be evaluated against the question's rubric and expected points.
- The AI generates per-question scores/feedback and an overall summary.
- The Edge Function saves this evaluation back into Supabase.
- The user is then redirected to `InterviewSummary.tsx`, which fetches and displays the detailed AI evaluation and scores.

---

## File System Structure

The file system is logically divided between the frontend source code and the backend Supabase configuration/functions.

```text
d:\careerhub\project-bolt-sb1-nakjygq3\project\
├── src/                               # Frontend source code
│   ├── components/                    # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Skeleton.tsx
│   │   └── VoiceInterviewModal.tsx
│   ├── lib/                           # Core utilities and API clients
│   │   ├── ai.ts                      # Client helpers for Supabase AI Edge Functions
│   │   ├── auth.tsx                   # Supabase authentication context/hooks
│   │   ├── questions.ts               # Legacy/fallback hardcoded question logic
│   │   ├── router.tsx                 # Application routing logic
│   │   └── supabase.ts                # Supabase client initialization
│   ├── pages/                         # Application views/pages
│   │   ├── CreateInterview.tsx        # Custom interview configuration form
│   │   ├── Dashboard.tsx              # User dashboard & history
│   │   ├── InterviewSession.tsx       # Active interview screen (shows questions/captures answers)
│   │   ├── InterviewSummary.tsx       # Post-interview AI evaluation results
│   │   ├── Landing.tsx                # Marketing/landing page
│   │   ├── Login.tsx                  # Authentication pages
│   │   ├── QuickMock.tsx              # Pre-configured interview templates
│   │   ├── Settings.tsx               
│   │   └── Signup.tsx                 
│   ├── types/                         # TypeScript definitions
│   │   └── index.ts                   # Core data models (Interview, Question, Evaluation)
│   ├── App.tsx                        # Main application component & router setup
│   ├── index.css                      # Global Tailwind CSS styles
│   └── main.tsx                       # React application entry point
├── supabase/                          # Backend configurations and Edge Functions
│   ├── functions/                     # Deno-based serverless functions
│   │   ├── evaluate-interview/        
│   │   │   └── index.ts               # Edge function for evaluating answers via OpenRouter
│   │   └── generate-interview/        
│   │       └── index.ts               # Edge function for generating questions via OpenRouter
│   └── migrations/                    # Database schemas and Row Level Security policies
│       └── 20260831113456_create_interview_schema.sql
├── package.json                       # Dependencies & scripts
├── tailwind.config.js                 # Tailwind styling configuration
├── tsconfig.json                      # TypeScript configuration
└── vite.config.ts                     # Vite bundler configuration
```

## Key Security Implementations
- **API Key Protection:** The OpenRouter API key (`OPENROUTER_API_KEY`) is never exposed to the browser. It exists solely as a secret securely accessed within the Supabase Edge Functions.
- **Row Level Security (RLS):** Supabase database policies ensure that users can only read, update, or delete interview data that belongs to them. The Edge Functions enforce these same ownership checks before evaluating or modifying data.
