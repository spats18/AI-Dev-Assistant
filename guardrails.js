// Guardrails — input validation before a message reaches Ollama
// Each function receives the message and a per-socket state object,
// and returns { allowed: bool, reason: string }

// Tracks per-socket state; keyed by socket.id
const socketState = new Map();

function getState(socketId) {
    if (!socketState.has(socketId)) {
        socketState.set(socketId, {
            lastMessage: null,
            requestCount: 0,
        });
    }
    return socketState.get(socketId);
}

// Call this when a socket disconnects to free memory
function clearState(socketId) {
    socketState.delete(socketId);
}

// --- Guardrail 1: Duplicate requests ---
// Prevents the user from sending the exact same message twice in a row
function checkDuplicate(message, state) {
    // TODO: decide if this should be consecutive-only or any repeat in session
    // TODO: decide if comparison should be case-sensitive
}

// --- Guardrail 2: Rate limiting ---
// Caps the number of requests a socket can make per session
// NOTE: "per day" requires persistent storage (file or DB) — not implemented yet
// For now, this is per session (resets when server restarts or socket reconnects)
function checkRateLimit(state) {
    // TODO: decide on the request cap (e.g. 20 per session)
    // TODO: decide whether to expose the remaining count to the frontend
}

// --- Guardrail 3: Profanity filter ---
// Rejects messages containing blocked words before they reach Ollama
function checkProfanity(message) {
    // TODO: decide between a hardcoded word list vs. an npm package (e.g. 'bad-words')
    // TODO: decide on response — hard block or a warning first?
}

// --- Master check ---
// Run all guardrails in order; return the first failure or allow
function runGuardrails(message, socketId) {
    const state = getState(socketId);

    // TODO: wire up the three checks above and update state on pass
}

module.exports = { runGuardrails, clearState };
