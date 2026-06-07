# Guardrails

Input validation layer that runs before any message reaches Ollama.
Implemented in `guardrails.js`, wired into `server.js`.

---

## Implemented

### 1. Empty / Whitespace-Only Block
Rejects blank or whitespace-only submissions before anything else runs.

### 2. Minimum Message Length
Blocks messages under 2 characters — low signal, wastes rate limit quota.

### 3. Maximum Message Length
Hard cap at 2000 characters. Long prompts can hang or crash Ollama.
Enforced on the backend; frontend should mirror this in a future pass.

### 4. Block While Response In Progress
Prevents sending a new message while Ollama is still streaming.
Overlapping messages would cause interleaved tokens on the frontend.

### 5. Profanity Filter
Uses the `bad-words` npm package. Hard block — no warning first.

### 6. Duplicate Request Block
Blocks a message after the same string has been sent 3 times in the same session.
Counter resets when the message changes.

### 7. Rate Limiting
Cap: **20 requests per 10 minutes** per socket session.
Remaining count is sent to the frontend and displayed below the input after each message.
> Note: "per day" requires a database. This is per-session until persistence is added.

### 8. Input Sanitization
Strips HTML and script tags from messages before forwarding to Ollama.

---

## Guardrail Order (matters)

Checks run in this order — cheapest and most obvious first:

1. Empty check
2. Min length
3. Max length
4. In-progress check
5. Profanity filter
6. Duplicate check
7. Rate limit

State is only committed after all checks pass — no partial state mutations on failure.

---

## Frontend Behaviour

- **Blocked message:** inline red error shown above the input, dismisses on next keystroke. The empty assistant bubble is removed; the user message stays in chat.
- **Rate info:** remaining request count shown below the input after every successful send.

---

## Open Questions
- Should max message length also be enforced on the frontend with a character counter?
- Should the duplicate counter persist across reconnects (requires session ID)?
