# Guardrails

Input validation layer in `guardrails.js`, wired into `server.js`. Runs on every message before it reaches Ollama.

---

## Checks

### 1. Empty / Whitespace-Only Block
Rejects blank or whitespace-only submissions before anything else runs.

### 2. Minimum Message Length
Blocks messages under 2 characters.

### 3. Maximum Message Length
Hard cap at 2000 characters.

### 4. Block While Response In Progress
Prevents sending a new message while Ollama is still streaming.

### 5. Profanity Filter
Uses the `bad-words` npm package. Hard block — no warning first.

### 6. Duplicate Request Block
Blocks a message after the same string has been sent 3 times in a session.
Counter resets when the message changes.

### 7. Rate Limiting
20 requests per 10 minutes per socket session.
Remaining count is sent to the frontend and shown below the input after each message.

### 8. Input Sanitization
Strips HTML and script tags from messages before forwarding to Ollama. Silent — no error shown to the user.

---

## Check Order

Cheapest and most obvious checks run first. State is only committed after all checks pass.

1. Empty
2. Min length
3. Max length
4. In-progress
5. Profanity
6. Duplicate
7. Rate limit

---

## Frontend Behaviour

- **Blocked message:** red inline error above the input, dismisses on next keystroke. The empty assistant bubble is removed; the user message stays in chat.
- **Rate info:** remaining request count shown below the input after every successful send.
