# Live Hebrew-to-English Translation

Near real-time translation system for keynotes and presentations. Captures Hebrew speech, transcribes it, and displays English captions for viewers.

## Features

- **Live Transcription** — Records audio in chunks and transcribes Hebrew speech using OpenAI Whisper
- **Natural Translation** — Translates to fluent English, handling slang and idioms (not literal word-for-word)
- **Real-time Viewer** — Auto-scrolling caption display for audience members
- **Admin Controls** — Start/stop events, adjust chunk duration, manage glossary
- **Glossary Support** — Custom term mappings for consistent translation of names/products

## Tech Stack

- **Next.js 16** — React framework with App Router
- **Firebase** — Authentication + Firestore for real-time data
- **OpenAI** — Whisper for transcription, GPT-4o-mini for translation
- **Tailwind CSS** — Styling
- **Netlify** — Deployment (optional)

## Setup

### 1. Install Dependencies

```bash
npm install firebase firebase-admin openai
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `OPENAI_API_KEY` — Your OpenAI API key
- `NEXT_PUBLIC_FIREBASE_*` — Firebase web app config
- `FIREBASE_*` — Firebase Admin SDK credentials (from service account JSON)

### 3. Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** with Email/Password provider
3. Enable **Firestore Database** (start in test mode)
4. Create an admin user in Authentication
5. Generate a service account key (Project Settings → Service Accounts)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Admin Flow

1. Go to `/admin` and sign in
2. Create a new event
3. (Optional) Add glossary terms for consistent translation
4. Adjust chunk duration (3-15 seconds)
5. Click "Start Live" — recording begins automatically
6. Share the viewer link with audience

### Viewer Flow

1. Open the viewer link (`/view/[eventId]`)
2. English captions appear in real-time as the speaker talks

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── events/          # Event CRUD endpoints
│   │   └── transcribe/      # Audio processing endpoint
│   ├── admin/               # Admin dashboard
│   ├── event/[eventId]/     # Event control page
│   └── view/[eventId]/      # Public viewer page
├── components/
│   └── AudioRecorder.tsx    # MediaRecorder component
├── hooks/
│   ├── useAuth.ts           # Firebase auth hook
│   └── useEvent.ts          # Event & chunks hooks
├── lib/
│   ├── firebase.ts          # Client-side Firebase
│   ├── firebase-admin.ts    # Server-side Firebase Admin
│   └── openai.ts            # Transcription & translation
└── types/
    └── index.ts             # TypeScript interfaces
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events` | GET | List all events |
| `/api/events` | POST | Create new event |
| `/api/events/[id]` | GET | Get event with chunks |
| `/api/events/[id]` | PATCH | Update event status/glossary |
| `/api/events/[id]/chunks` | GET | Poll for new chunks |
| `/api/transcribe` | POST | Process audio chunk |

## Configuration

### Chunk Duration

Adjustable from 3-15 seconds. Shorter = more responsive, longer = fewer API calls.

### Glossary

Add Hebrew→English term mappings in the event settings. Format: `hebrew=english` (one per line).

Example:
```
חברת ABC=ABC Company
מנכ"ל=CEO
```

## Deployment (Netlify)

The project includes `netlify.toml` for deployment:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Set environment variables in Netlify dashboard.

## Known Limitations

- Whisper may hallucinate "thank you" during silence (filtered automatically)
- Each chunk needs ~2-5 seconds for processing
- Browser must stay open for recording (runs client-side)
