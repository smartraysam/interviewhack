# InterviewHack — AI Interview Answer Agent

> Real-time AI-powered interview assistant. Speak your interview question into the mic; get a structured, expert-quality answer streamed instantly to your screen.

---

## Features

- **Mic-to-Answer pipeline** — tap the mic button, say the question, read the streamed answer
- **Real-time token streaming** — GPT-4o answers stream word-by-word (typewriter effect) via SSE
- **Dual speech modes** — Browser Web Speech API (no backend cost) or OpenAI Whisper (server-side, all browsers) switchable via a single env var
- **Auto interview-type detection** — answers are auto-labelled as Technical, Behavioral/STAR, System Design, or General
- **Copy to clipboard** — one-tap copy of the full answer
- **History panel** — last 5 questions and answers, tap any to revisit
- **Mobile responsive** — designed first for 375px (iPhone SE), works beautifully on all screen sizes
- **Error handling** — mic denied, network failure, API errors all shown gracefully

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19 + Vite + TypeScript        |
| Styling   | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons     | Lucide React                        |
| Backend   | Go 1.22 + Fiber v2                  |
| LLM       | OpenAI GPT-4o (streaming SSE)       |
| Speech    | Web Speech API (browser) or OpenAI Whisper (server) |

---

## Prerequisites

| Tool      | Version | Purpose                                  |
|-----------|---------|------------------------------------------|
| Node.js   | ≥ 18    | Run the frontend dev server              |
| Go        | ≥ 1.22  | Run the backend API server               |
| OpenAI key| —       | Powers GPT-4o answers + Whisper (if used)|

Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

---

## Project Structure

```
interviewhack/
├── backend/                      # Go + Fiber API server
│   ├── main.go                   # Entry point: Fiber setup, CORS, routes
│   ├── handlers/
│   │   ├── answer.go             # POST /api/answer — streams GPT-4o tokens via SSE
│   │   └── transcribe.go         # POST /api/transcribe — Whisper audio-to-text
│   ├── go.mod                    # Go module dependencies
│   └── .env.example              # Backend environment variable template
│
└── frontend/                     # React + Vite + TypeScript SPA
    ├── src/
    │   ├── components/
    │   │   ├── MicButton.tsx     # Animated mic toggle button
    │   │   ├── AnswerDisplay.tsx # Streaming answer card with copy + type badge
    │   │   ├── StatusBar.tsx     # Speech mode + connection status bar
    │   │   ├── HistoryPanel.tsx  # Collapsible Q&A history (last 5)
    │   │   └── ErrorBanner.tsx   # Dismissible error notification
    │   ├── hooks/
    │   │   ├── useBrowserSpeech.ts  # Web Speech API hook (browser mode)
    │   │   └── useWhisperSpeech.ts  # MediaRecorder → Whisper hook (whisper mode)
    │   ├── App.tsx               # Root: orchestrates speech, streaming, history
    │   ├── main.tsx              # React entry point
    │   └── index.css             # Tailwind CSS import + CSS variables
    ├── .env.example              # Frontend environment variable template
    └── vite.config.ts            # Vite config: Tailwind plugin + /api proxy
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/interviewhack.git
cd interviewhack
```

### 2. Set up the backend

```bash
cd backend

# Copy and edit environment variables
cp .env.example .env
# Open .env and set OPENAI_API_KEY=sk-...

# Install Go dependencies
go mod tidy

# Run the server (default port 8080)
go run .
```

You should see:
```
🚀 InterviewHack backend running on :8080
```

### 3. Set up the frontend

Open a **new terminal tab**:

```bash
cd frontend

# Copy and edit environment variables (optional for dev)
cp .env.example .env

# Install Node dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge.

### 4. Use the app

1. Click the **microphone button**
2. Say your interview question (e.g. *"What is the difference between a process and a thread?"*)
3. Click the mic button again to stop
4. The answer streams onto the screen — read it aloud!

---

## Environment Variables

### Backend — `backend/.env`

| Variable          | Required | Default                                          | Description                                                   |
|-------------------|----------|--------------------------------------------------|---------------------------------------------------------------|
| `OPENAI_API_KEY`  | **Yes**  | —                                                | Your OpenAI secret key. Get one at platform.openai.com        |
| `PORT`            | No       | `8080`                                           | Port the Go server listens on                                 |
| `SPEECH_MODE`     | No       | `browser`                                        | `browser` — no transcription needed; `whisper` — enables `/api/transcribe` |
| `ALLOWED_ORIGINS` | No       | `http://localhost:5173,http://localhost:4173`     | Comma-separated CORS allowed origins for production deployments |

### Frontend — `frontend/.env`

| Variable             | Required | Default    | Description                                                                   |
|----------------------|----------|------------|-------------------------------------------------------------------------------|
| `VITE_SPEECH_MODE`   | No       | `browser`  | `browser` — Web Speech API; `whisper` — sends audio to `/api/transcribe`      |
| `VITE_API_BASE_URL`  | No       | `""`       | Backend base URL for production (e.g. `https://api.example.com`). In dev, Vite proxies `/api` automatically |

> **Note:** All `VITE_` variables are embedded into the client bundle at build time. Never put secret keys in `VITE_` variables.

---

## Speech Modes

### Browser Speech API (`VITE_SPEECH_MODE=browser`) — Default

- Uses the browser's built-in `SpeechRecognition` API
- **Zero latency** — transcription happens locally in real time, including live interim text while you speak
- **No audio is sent to the backend** — fully private transcription
- **Limitations:** Only works in **Chrome and Edge** (desktop and Android). Not supported on Firefox or Safari.
- No extra cost beyond the GPT-4o API call

### Whisper Mode (`VITE_SPEECH_MODE=whisper`)

- The frontend records audio via `MediaRecorder` and sends the blob to `POST /api/transcribe`
- The backend forwards it to the **OpenAI Whisper API** for server-side transcription
- **Works in all modern browsers** including Firefox and Safari
- Slightly higher latency (network round-trip + Whisper processing time)
- Costs a small amount per transcription (see [OpenAI Whisper pricing](https://openai.com/pricing))
- Set `SPEECH_MODE=whisper` in `backend/.env` too, to enable the endpoint guard

**How to switch:**

```bash
# frontend/.env
VITE_SPEECH_MODE=whisper

# backend/.env
SPEECH_MODE=whisper
```

Then restart both servers.

---

## API Reference

### `POST /api/answer`

Streams a GPT-4o answer for the given interview question via Server-Sent Events.

**Request**

```http
POST /api/answer
Content-Type: application/json

{
  "question": "Explain the CAP theorem."
}
```

**Response** — `text/event-stream`

```
event: token
data: "The"

event: token
data: " CAP"

event: token
data: " theorem..."

event: done
data: [DONE]
```

On error:
```
event: error
data: {"error": "Failed to connect to AI service"}
```

| Field      | Type   | Description                                                      |
|------------|--------|------------------------------------------------------------------|
| `question` | string | The interview question text. Must be non-empty. Max ~4000 tokens |

---

### `POST /api/transcribe`

Transcribes an audio recording using OpenAI Whisper. Only active when `SPEECH_MODE=whisper`.

**Request** — `multipart/form-data`

| Field   | Type | Description                                       |
|---------|------|---------------------------------------------------|
| `audio` | file | Audio blob (`.webm`, `.ogg`). Max size: **25 MB** |

**Response**

```json
{
  "transcript": "What is the difference between a process and a thread?"
}
```

**Error responses**

| Status | Meaning                                          |
|--------|--------------------------------------------------|
| 400    | Missing `audio` field                            |
| 403    | Endpoint disabled (SPEECH_MODE ≠ whisper)        |
| 413    | Audio file exceeds 25 MB limit                   |
| 500    | Whisper API error or missing OPENAI_API_KEY      |

### `GET /api/health`

Health check endpoint.

```json
{ "status": "ok", "version": "1.0.0" }
```

---

## Usage Guide

### Mic Button

| State     | Appearance                     | Action                           |
|-----------|-------------------------------|----------------------------------|
| Idle      | Blue, solid                    | Click to start listening         |
| Listening | Red + pulsing rings            | Click to stop and send question  |
| Processing| Spinning loader                | Wait — transcribing or streaming |
| Error     | Amber                          | Click to retry after fixing issue|

### Reading the Answer

- The answer streams token-by-token as soon as the model starts responding
- The first line `[Type: Technical]` is stripped from the display but used to colour-code the **type badge**
- A blinking cursor shows while streaming is in progress

### Copy to Clipboard

After streaming completes, a **Copy** button appears in the top-right corner of the answer card. Click it to copy the full answer text (type label stripped).

### History Panel

Appears below the answer card once you have at least one Q&A. Click the **History** header to expand/collapse. Click any entry to restore that Q&A to the main view.

---

## Mobile Usage

- The app is optimised for 375px+ screens (iPhone SE and above)
- The mic button is 96×96px for easy tap targeting
- On mobile Chrome (Android), Browser Speech API works natively
- On iOS Safari, **Whisper mode is required** — set `VITE_SPEECH_MODE=whisper`
- Answers are scrollable; use the copy button to paste into notes

---

## Troubleshooting

### Microphone access denied
> *"Microphone access was denied. Please allow mic access and try again."*

- In Chrome: click the lock icon in the address bar → **Microphone** → Allow → reload
- In macOS System Settings → Privacy & Security → Microphone → enable Chrome

### Speech recognition not supported
> *"Speech recognition is not supported in this browser."*

- Switch to Chrome or Edge, **or** set `VITE_SPEECH_MODE=whisper` to use Whisper instead

### CORS error in browser console
> *"Access to fetch at 'http://localhost:8080/api/...' from origin 'http://localhost:5173' has been blocked"*

- Make sure the backend is running (`go run .` in `backend/`)
- Check `ALLOWED_ORIGINS` in `backend/.env` includes `http://localhost:5173`
- In development, Vite's proxy (`/api → :8080`) should handle this automatically — ensure `vite.config.ts` proxy is present

### Invalid API key
> OpenAI returns `401 Unauthorized`

- Double-check `OPENAI_API_KEY` in `backend/.env` — it should start with `sk-`
- Make sure there are no extra spaces or quotes around the value

### Whisper audio too large
> *"Audio file too large: X bytes (max 25 MB)"*

- Keep recordings under 3–4 minutes for typical interview questions
- The 25 MB limit is enforced by both the backend and the OpenAI Whisper API

### Answers stop mid-stream
- This is usually a network interruption; the next question will start a fresh stream
- If persistent, check your OpenAI account has sufficient credits

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests where applicable
4. Commit with a descriptive message: `git commit -m "feat: add X"`
5. Open a pull request describing the change

Please follow the existing code style (Go: `gofmt`; TypeScript: no semicolons, single quotes).

---

## License

MIT © 2026 InterviewHack Contributors
