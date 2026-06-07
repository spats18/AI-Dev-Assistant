# AI Dev Assistant

A personal AI coding assistant with a React frontend, Node.js backend, and a locally hosted LLM via Ollama. No cloud costs, no API keys — runs entirely on your machine.

## Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express + WebSocket (socket.io)
- **LLM:** Ollama running locally
- **Model:** `qwen2.5-coder:7b`

## How It Works

```
React (5173)  →  WebSocket  →  Node.js (3001)  →  Ollama (11434)
                                                        ↓
React         ←  tokens     ←  Node.js          ←  streams response
```

1. User types a message in the React chat UI
2. Message passes through input guardrails on the backend
3. Backend forwards it to Ollama at `localhost:11434`
4. Ollama streams tokens back one by one
5. Backend pipes each token over WebSocket to React in real time

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org)
- [Ollama](https://ollama.com) installed and running

### 1. Pull the model
```bash
ollama pull qwen2.5-coder:7b
```

### 2. Start Ollama
```bash
ollama serve
```

### 3. Start the backend
```bash
npm install
node server.js
```

### 4. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Guardrails

Input validation runs on every message before it reaches Ollama. See [`GUARDRAILS.md`](GUARDRAILS.md) for details.

| Guardrail | Detail |
|---|---|
| Empty / whitespace block | Rejected before anything else runs |
| Minimum length | 2 characters |
| Maximum length | 2000 characters |
| In-progress block | Cannot send while a response is streaming |
| Profanity filter | Hard block via `bad-words` |
| Duplicate block | Same message blocked after 3 sends in a session |
| Rate limiting | 20 requests per 10 minutes — remaining count shown in UI |
| Input sanitization | HTML/script tags stripped before reaching Ollama |

## Screenshots

**Chat UI — connected and ready**

![Chat UI connected](docs/screenshots/chat-connected_cropped.png)

**Chatting with the assistant**

![Request and response](docs/screenshots/Request%20and%20Response.png)

**Error state — backend not running**

![Backend disconnected](docs/screenshots/chat-disconnected_cropped.png)
