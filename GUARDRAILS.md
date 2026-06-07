# Guardrails Plan

Input validation layer that runs before any message reaches Ollama.
Implementation lives in `guardrails.js`.

---

## Decided

### 1. Duplicate Request Block
Block a message if the user has sent the exact same string 3 or more times in the same session.
Counter resets when the message changes.

### 2. Rate Limiting
Cap: **20 requests per 10 minutes** per socket session.
Show the user how many requests they have remaining.
> Note: "per day" requires a database. This is per-session until persistence is added.

### 3. Profanity Filter
Use the `bad-words` npm package to reject messages containing blocked words.
Decision: hard block (not a warning first).

---

## Proposed (not yet decided)

### 4. Block While Response In Progress
Prevent sending a new message while Ollama is still streaming a response.
Overlapping messages cause interleaved tokens on the frontend.
> Priority: high — this is a bug risk, not just a guardrail.

### 5. Max Message Length
Cap at ~2000 characters. Long prompts can hang or crash Ollama.
Enforce on both frontend (UX) and backend (safety).

### 6. Empty / Whitespace-Only Messages
Reject blank or whitespace-only submissions.
Currently nothing blocks this.

### 7. Minimum Message Length
Block single-character or very short sends (e.g. "a", "?").
Low signal, wastes rate limit quota.

### 8. Input Sanitization
Strip HTML and script tags from messages before forwarding to Ollama.
Not a risk now, but will be if responses are ever rendered as HTML.

---

## Open Questions
- What should the UI look like when a guardrail blocks a message? Toast? Inline error?
- Should the duplicate counter reset after a session ends or persist?
- Do we want a warning before a hard block on profanity, or straight rejection?
