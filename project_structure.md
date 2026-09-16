```text
project/
├── .bolt
│   ├── config.json
│   └── prompt
├── .env
├── .env.example
├── .gitignore
├── PROJECT_OVERVIEW.md
├── SYSTEM_ARCHITECTURE.md
├── eslint.config.js
├── fusion_test.json
├── generate_tree.py
├── index.html
├── ml-service
│   ├── face_verifier.py
│   ├── facial_inference.py
│   ├── facial_inference_old.py
│   ├── fusion_engine.py
│   ├── harvard.wav
│   ├── models
│   │   ├── best_facial_model.pth
│   │   ├── best_voice_model.pth
│   │   ├── facial_emotion_classes.npy
│   │   ├── facial_emotion_model.pt
│   │   ├── text_emotion_model
│   │   │   ├── config.json
│   │   │   ├── emotion_config.json
│   │   │   ├── model.safetensors
│   │   │   ├── tokenizer.json
│   │   │   ├── tokenizer_config.json
│   │   │   └── training_args.bin
│   │   ├── vit_facial_emotion_classes.npy
│   │   ├── voice_emotion_model.pt
│   │   ├── voice_features_v1.pkl
│   │   ├── voice_model_config.json
│   │   └── voice_scaler.pkl
│   ├── server.py
│   ├── test_face.jpg
│   ├── test_fusion.py
│   ├── test_new_voice_model.py
│   ├── test_two_faces.jpg
│   ├── test_voice.wav
│   └── voice_inference.py
├── package-lock.json
├── package.json
├── postcss.config.js
├── src
│   ├── App.tsx
│   ├── components
│   │   ├── AIInterviewerAvatar.tsx
│   │   ├── Navbar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── Skeleton.tsx
│   │   └── VoiceInterviewModal.tsx
│   ├── index.css
│   ├── lib
│   │   ├── ai.ts
│   │   ├── auth.tsx
│   │   ├── emotion.ts
│   │   ├── questions.ts
│   │   ├── router.tsx
│   │   └── supabase.ts
│   ├── main.tsx
│   ├── pages
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
│   ├── types
│   │   ├── index.ts
│   │   └── speech.d.ts
│   └── vite-env.d.ts
├── supabase
│   ├── .temp
│   │   ├── cli-latest
│   │   ├── gotrue-version
│   │   ├── linked-project.json
│   │   ├── pooler-url
│   │   ├── postgres-version
│   │   ├── project-ref
│   │   ├── rest-version
│   │   ├── storage-migration
│   │   └── storage-version
│   ├── functions
│   │   ├── evaluate-interview
│   │   │   └── index.ts
│   │   └── generate-interview
│   │       └── index.ts
│   └── migrations
│       ├── 20260831113456_create_interview_schema.sql
│       └── supabase
│           └── migrations
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vite.config.ts.timestamp-1788366864254-826ec6ec05e038.mjs

```