
# AI Mock Interview Platform

An AI-powered mock interview platform that simulates technical and behavioral interviews while analyzing **answer quality, facial emotion, voice emotion, text emotion, behavioral signals, and interview proctoring events**.

The project combines a React + TypeScript frontend, Supabase authentication/database/Edge Functions, OpenRouter-powered AI evaluation, and a local Python ML service for multimodal emotion analysis and face verification.

---

## ✨ Features

### 🎯 AI-Powered Mock Interviews

- Create customized mock interviews
- Generate interview questions dynamically using AI
- Quick Mock mode for rapid interview practice
- Save interview questions and answers
- Generate an AI-powered evaluation after completion

### 🤖 AI Interview Evaluation

The AI evaluates:

- Individual answers
- Overall interview performance
- Strengths
- Areas for improvement
- Question-specific feedback
- Overall score

Evaluation is performed through a Supabase Edge Function using OpenRouter.

### 🧠 Multimodal Emotion Analysis

Three modalities are analyzed:

```text
Face ───────┐
            │
Voice ──────┼──> Fusion Engine ──> Behavioral Metrics
            │
Text ───────┘
````

Supported emotions:

```text
anger
disgust
fear
happiness
sadness
surprise
neutral
```

The system produces a unified emotion distribution, dominant emotion, and behavioral metrics.

### 📊 Behavioral Metrics

The fusion engine calculates:

* Stress
* Nervousness
* Confidence
* Fluency
* Composure
* Engagement
* Stability
* Recovery
* Frustration
* Adaptability

### 🎥 Face Verification & Proctoring

The interview can periodically verify the candidate's face using:

* MTCNN face detection
* InceptionResnetV1 embeddings
* VGGFace2 pretrained weights
* Similarity-based verification

The system records verification events and detects repeated unauthorized-face checks.

### 🎙️ Voice Interview Mode

* Speech recognition/transcription
* Voice emotion analysis
* Text emotion analysis from transcripts
* Multimodal emotion fusion
* Voice interview completion workflow

### 📈 Interview Summary

The final summary can show:

* AI performance score
* Overall AI feedback
* Strengths
* Areas to improve
* Question-level scores
* Question-level feedback
* Dominant emotion
* Behavioral metrics
* Emotion analysis
* Proctoring analysis

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      React + Vite    │
                         │   TypeScript Frontend│
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
           ┌─────────────────┐              ┌─────────────────┐
           │    Supabase     │              │  Local ML API   │
           │ Auth + Database │              │    FastAPI      │
           └────────┬────────┘              └────────┬────────┘
                    │                                │
                    ▼                                ├── Face Emotion
           ┌─────────────────────┐                   ├── Voice Emotion
           │ Supabase Edge       │                   ├── Text Emotion
           │ Functions           │                   ├── Fusion Engine
           ├─────────────────────┤                   └── Face Verification
           │ generate-interview  │
           │ evaluate-interview  │
           └──────────┬──────────┘
                      │
                      ▼
              ┌───────────────┐
              │  OpenRouter   │
              │      AI       │
              └───────────────┘
```

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Vite
* CSS
* Supabase JavaScript Client

## Backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Edge Functions
* Deno

## AI

* OpenRouter
* Configurable OpenRouter model
* AI question generation
* AI interview evaluation

## Machine Learning

* Python
* FastAPI
* PyTorch
* Hugging Face Transformers
* MTCNN
* InceptionResnetV1
* Wav2Vec2

---

# 🧠 ML Models

## Face Emotion

Model:

```text
trpakov/vit-face-expression
```

Seven emotion classes:

```text
anger
disgust
fear
happiness
sadness
surprise
neutral
```

The implementation uses the original image and a horizontally flipped image for test-time augmentation, averaging the resulting predictions.

## Voice Emotion

Model:

```text
ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
```

Audio is processed at 16 kHz. The current implementation uses Wav2Vec2 representations with temporal attention pooling and classification.

## Text Emotion

Model:

```text
j-hartmann/emotion-english-distilroberta-base
```

The model runs locally and classifies emotions from interview answers or voice transcripts.

## Face Verification

Face verification uses:

```text
MTCNN
InceptionResnetV1
VGGFace2
```

The live face embedding is compared with the registered candidate embedding.

---

# 🧩 Project Structure

```text
ai-mock-interview-platform/
│
├── .env
├── .env.example
├── PROJECT_OVERVIEW.md
├── SYSTEM_ARCHITECTURE.md
├── package.json
├── eslint.config.js
│
├── supabase/
│   ├── functions/
│   │   ├── evaluate-interview/
│   │   │   └── index.ts
│   │   └── generate-interview/
│   │       └── index.ts
│   │
│   └── migrations/
│
├── src/
│   ├── components/
│   │   ├── AIInterviewerAvatar.tsx
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Skeleton.tsx
│   │   └── VoiceInterviewModal.tsx
│   │
│   ├── lib/
│   │   ├── ai.ts
│   │   ├── auth.tsx
│   │   ├── emotion.ts
│   │   ├── questions.ts
│   │   ├── router.tsx
│   │   └── supabase.ts
│   │
│   ├── pages/
│   │   ├── CreateInterview.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EmotionTest.tsx
│   │   ├── FusionTest.tsx
│   │   ├── InterviewSession.tsx
│   │   ├── InterviewSummary.tsx
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── QuickMock.tsx
│   │   ├── Settings.tsx
│   │   ├── Signup.tsx
│   │   └── VoiceTest.tsx
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
└── ml-service/
    ├── server.py
    ├── face_verifier.py
    ├── facial_inference.py
    ├── voice_inference.py
    ├── text_inference.py
    ├── fusion_engine.py
    ├── fusion_engine_new.py
    └── models/
        └── text/
```

> **Note:** The local text model is intentionally excluded from Git because it is large. It should be downloaded locally when setting up the ML service.

---

# 🔄 Interview Flow

```text
User Sign In
     │
     ▼
Create / Quick Mock
     │
     ▼
AI Question Generation
     │
     ▼
Interview Session
     │
     ├──────────────┐
     │              │
     ▼              ▼
  Camera        Microphone
     │              │
     ▼              ▼
Face Emotion    Voice Emotion
     │              │
     └───────┬──────┘
             │
             ▼
        Candidate Answer
             │
             ▼
        Text Emotion
             │
             ▼
       Fusion Engine
             │
             ▼
    Behavioral Metrics
             │
             ▼
        Save Results
             │
             ▼
      AI Evaluation
             │
             ▼
     Interview Summary
```

---

# 🧠 Multimodal Emotion Fusion

The fusion engine combines probability distributions from available modalities.

Default weights:

| Modality | Weight |
| -------- | -----: |
| Face     |   0.45 |
| Voice    |   0.45 |
| Text     |   0.10 |

If a modality is unavailable, its weight is removed and the remaining weights are renormalized.

Example:

```text
Face   = 45%
Voice  = 45%
Text   = 10%
```

If text is unavailable:

```text
Face   = 50%
Voice  = 50%
```

The engine produces a normalized seven-emotion distribution and determines the dominant emotion.

---

# 📊 Behavioral Scoring

The fusion engine converts the fused emotion distribution into behavioral metrics on a 0–100 scale.

The current behavioral score uses:

```text
25% Confidence
20% Composure
20% Fluency
15% Engagement
10% Adaptability
10% Inverse Stress
```

Conceptually:

```text
Behavioral Score =
    0.25 × Confidence
  + 0.20 × Composure
  + 0.20 × Fluency
  + 0.15 × Engagement
  + 0.10 × Adaptability
  + 0.10 × (100 - Stress)
```

The behavioral/emotion score is kept separate from the AI answer-performance score.

> **Important:** Metrics such as fluency and recovery are currently derived from emotion distributions. They are behavioral proxies rather than direct measurements of speaking pauses, filler words, vocabulary, or temporal recovery.

---

# 🤖 AI Interview Evaluation

AI evaluation is handled by:

```text
supabase/functions/evaluate-interview/index.ts
```

The evaluation uses information including:

* Interview question
* Expected answer points
* Evaluation criteria
* Candidate answer

The AI produces:

```text
Overall Score
Overall Feedback
Strengths
Areas To Improve
Question Score
Question Feedback
```

The two evaluation systems have different purposes:

| System         | Measures                                 |
| -------------- | ---------------------------------------- |
| AI Evaluation  | Answer content and interview performance |
| Emotion Fusion | Emotional/behavioral signals             |

---

# 🗄️ Database

The project uses Supabase PostgreSQL.

Interview question records can contain:

```text
answer_text
answer_status
answered_at
score
feedback
question_feedback
face_emotion
voice_emotion
text_emotion
fusion_result
```

Emotion and fusion results are stored as JSONB objects so probability distributions and behavioral metrics can be preserved.

## Proctoring Events

Proctoring events contain fields such as:

```text
interview_id
status
similarity
faces_detected
is_match
message
created_at
```

Row Level Security policies restrict access to user interview and proctoring data.

---

# 🎥 Proctoring Pipeline

```text
Camera
   │
   ▼
Face Detection
   │
   ▼
Face Embedding
   │
   ▼
Compare With Registered Face
   │
   ▼
Similarity + Match
   │
   ▼
Store Event
   │
   ▼
Interview Summary
```

The frontend periodically verifies the candidate.

When three consecutive unauthorized-face checks are detected, a `VIOLATION` event is recorded.

> The current registered face embedding is kept in ML-service runtime memory, so restarting the ML server clears the registration.

---

# 🎙️ Voice Interview Mode

```text
Microphone
    │
    ▼
Speech Recognition
    │
    ▼
Transcript
    │
    ├───────────────┐
    ▼               ▼
Text Emotion     Voice Emotion
    │               │
    └───────┬───────┘
            │
            ▼
       Fusion Engine
            │
            ▼
      Saved Analysis
```

The voice interview workflow saves:

```text
answer_text
face_emotion
voice_emotion
text_emotion
fusion_result
```

for the corresponding question.

---

# 🔐 Authentication

Authentication is handled through Supabase Auth.

Protected application routes use:

```text
src/components/ProtectedRoute.tsx
```

Authenticated users can:

* Sign up
* Log in
* Create interviews
* Complete interviews
* View previous interviews
* View interview summaries
* Access settings

---

# ⚙️ Environment Variables

Create a `.env` file for the frontend.

Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ML_SERVICE_URL=http://127.0.0.1:8000
```

Supabase Edge Functions use secrets such as:

```text
APP_URL
OPENROUTER_API_KEY
OPENROUTER_MODEL
```

### Security

Never expose:

```text
OPENROUTER_API_KEY
```

in frontend code.

The OpenRouter API key is stored as a Supabase secret and accessed by the Edge Functions.

---

# 🚀 Installation

## 1. Clone the repository

```bash
git clone https://github.com/LuckyLalwani/ai-mock-interview-platform.git
cd ai-mock-interview-platform
```

## 2. Install frontend dependencies

```bash
npm install
```

## 3. Configure environment variables

Create:

```text
.env
```

and configure the required Supabase and ML service variables.

---

# 🧠 ML Service Setup

Enter the ML service directory:

```bash
cd ml-service
```

Create a virtual environment.

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the required Python packages:

```text
fastapi
uvicorn
torch
transformers
numpy
Pillow
opencv-python
facenet-pytorch
librosa
soundfile
```

Start the service:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

The ML API will be available at:

```text
http://127.0.0.1:8000
```

---

# 🗃️ Supabase Setup

Create or connect a Supabase project.

Apply the SQL migrations in:

```text
supabase/migrations/
```

Deploy the Edge Functions:

```bash
supabase functions deploy generate-interview
supabase functions deploy evaluate-interview
```

Configure the required secrets:

```bash
supabase secrets set OPENROUTER_API_KEY=your_key
supabase secrets set OPENROUTER_MODEL=your_model
supabase secrets set APP_URL=your_app_url
```

---

# ▶️ Running the Application

Two services are required for the complete local experience.

### Terminal 1 — ML Service

```bash
cd ml-service
uvicorn server:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — Frontend

```bash
npm run dev
```

Open the Vite URL displayed in the terminal.

---

# 🧪 Testing

Dedicated frontend pages are available for testing:

```text
EmotionTest.tsx
FusionTest.tsx
VoiceTest.tsx
```

They can be used to verify:

```text
Face → Emotion
Voice → Emotion
Text → Emotion
Face + Voice + Text → Fusion
```

The `/fusion` endpoint can also be tested directly with JSON containing face, voice, and text probability distributions.

---

# 🏭 Production Build

Build the frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 📁 Important Files

| File                                             | Purpose                      |
| ------------------------------------------------ | ---------------------------- |
| `src/pages/InterviewSession.tsx`                 | Main interview experience    |
| `src/pages/InterviewSummary.tsx`                 | Results and analysis         |
| `src/lib/ai.ts`                                  | AI Edge Function integration |
| `src/lib/emotion.ts`                             | ML service integration       |
| `src/components/VoiceInterviewModal.tsx`         | Voice interview workflow     |
| `ml-service/server.py`                           | FastAPI ML server            |
| `ml-service/fusion_engine_new.py`                | Multimodal emotion fusion    |
| `ml-service/text_inference.py`                   | Text emotion inference       |
| `ml-service/facial_inference.py`                 | Facial emotion inference     |
| `ml-service/voice_inference.py`                  | Voice emotion inference      |
| `ml-service/face_verifier.py`                    | Face verification            |
| `supabase/functions/generate-interview/index.ts` | AI question generation       |
| `supabase/functions/evaluate-interview/index.ts` | AI interview evaluation      |

---

# 🔒 Security & Privacy Considerations

* OpenRouter credentials are stored as Supabase secrets.
* User-specific database access is protected with Row Level Security.
* The local ML service is intended primarily for development unless additional production security is configured.
* Camera and microphone access requires browser permissions.
* Large ML model files are excluded from Git.
* Production deployment should include appropriate biometric-data consent, retention, encryption, and access-control policies.

---

# ⚠️ Current Limitations

### Local ML Service

Emotion analysis depends on the Python ML service being available.

### Face Registration

The registered face embedding currently exists in ML-service runtime memory and is lost after a server restart.

### Emotion Metrics

Some behavioral metrics are emotion-derived proxies rather than direct measurements.

### Browser Permissions

The interview requires camera and microphone access for the corresponding features.

### Text Model

The local text emotion model is not included in the repository because of its size.

---

# 🔮 Future Improvements

Potential improvements include:

* Persistent face embeddings
* Cloud deployment of the ML service
* Real-time emotion graphs
* Temporal emotion tracking
* Direct speech-fluency analysis
* Filler-word detection
* Pause detection
* Speaking-rate analysis
* Advanced voice-prosody analysis
* Improved recovery detection across multiple answers
* Adaptive interview difficulty
* Resume-based interview generation
* Company-specific interview modes
* Performance trend analysis
* Candidate benchmarking
* Advanced anti-cheating detection
* Automated PDF interview reports
* Production-grade monitoring and logging

---

# 🧭 Development Workflow

Recommended workflow:

```text
Feature
   ↓
Implement
   ↓
npm run build
   ↓
Manual Runtime Test
   ↓
git status
   ↓
git add
   ↓
git commit
   ↓
git push
```

For frontend changes, verify the production build before committing.

---

# 📌 Project Status

Current implementation includes:

* ✅ React + TypeScript frontend
* ✅ Vite development/build setup
* ✅ Supabase authentication
* ✅ Supabase PostgreSQL database
* ✅ Supabase Row Level Security
* ✅ AI interview generation
* ✅ AI interview evaluation
* ✅ Face emotion detection
* ✅ Voice emotion detection
* ✅ Text emotion detection
* ✅ Multimodal emotion fusion
* ✅ Behavioral metrics
* ✅ Voice interview mode
* ✅ Face verification
* ✅ Interview proctoring
* ✅ Proctoring event storage
* ✅ Interview summary analytics
* ✅ GitHub version control

---

# 👨‍💻 Author

## Lucky Lalwani

Electronics & Computer Science Engineering Student

Interests:

* Software Engineering
* Artificial Intelligence / Machine Learning
* Full-Stack Development
* Embedded Systems
* IoT
* UI/UX

---

## ⭐ Acknowledgements

This project uses open-source technologies and pretrained machine-learning models from the Python, PyTorch, Hugging Face, and broader open-source communities.

If you find the project useful, consider giving the repository a ⭐.

```
