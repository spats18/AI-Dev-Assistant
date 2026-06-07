const BadWords = require('bad-words');
const filter = new BadWords();

const DUPLICATE_THRESHOLD = 3;   // block after this many consecutive identical messages
const MAX_LENGTH = 2000;
const MIN_LENGTH = 2;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Per-socket state, keyed by socket.id
const socketState = new Map();

function getState(socketId) {
    if (!socketState.has(socketId)) {
        socketState.set(socketId, {
            lastMessage: null,
            duplicateCount: 0,
            requestCount: 0,
            windowStart: Date.now(),
            inProgress: false,
        });
    }
    return socketState.get(socketId);
}

function clearState(socketId) {
    socketState.delete(socketId);
}

function setInProgress(socketId, value) {
    const state = getState(socketId);
    state.inProgress = value;
}

// Strip HTML/script tags before the message reaches Ollama
function sanitize(message) {
    return message.replace(/<[^>]*>/g, '').trim();
}

function checkEmpty(message) {
    if (!message || !message.trim()) {
        return { allowed: false, reason: 'Message cannot be empty.' };
    }
    return { allowed: true };
}

function checkMinLength(message) {
    if (message.trim().length < MIN_LENGTH) {
        return { allowed: false, reason: `Message must be at least ${MIN_LENGTH} characters.` };
    }
    return { allowed: true };
}

function checkMaxLength(message) {
    if (message.length > MAX_LENGTH) {
        return { allowed: false, reason: `Message exceeds ${MAX_LENGTH} character limit.` };
    }
    return { allowed: true };
}

function checkInProgress(state) {
    if (state.inProgress) {
        return { allowed: false, reason: 'Please wait for the current response to finish.' };
    }
    return { allowed: true };
}

function checkProfanity(message) {
    if (filter.isProfane(message)) {
        return { allowed: false, reason: 'Message contains blocked language.' };
    }
    return { allowed: true };
}

// Returns allowed + newDuplicateCount so state is only committed after all checks pass
function checkDuplicate(message, state) {
    if (message === state.lastMessage) {
        const newCount = state.duplicateCount + 1;
        if (newCount >= DUPLICATE_THRESHOLD) {
            return { allowed: false, reason: `You've sent this message ${DUPLICATE_THRESHOLD} times. Try rephrasing.`, newDuplicateCount: newCount };
        }
        return { allowed: true, newDuplicateCount: newCount };
    }
    return { allowed: true, newDuplicateCount: 1 };
}

// Returns allowed + remaining so state is only committed after all checks pass
function checkRateLimit(state) {
    const now = Date.now();
    if (now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
        state.requestCount = 0;
        state.windowStart = now;
    }
    const remaining = RATE_LIMIT_MAX - state.requestCount;
    if (remaining <= 0) {
        const resetInMin = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - state.windowStart)) / 60000);
        return { allowed: false, reason: `Rate limit reached. Try again in ${resetInMin} minute(s).`, remaining: 0 };
    }
    return { allowed: true, remaining: remaining - 1 };
}

// Runs all checks in order. On pass, commits state and returns sanitized message + remaining count.
function runGuardrails(message, socketId) {
    const state = getState(socketId);

    let result;

    result = checkEmpty(message);
    if (!result.allowed) return result;

    result = checkMinLength(message);
    if (!result.allowed) return result;

    result = checkMaxLength(message);
    if (!result.allowed) return result;

    result = checkInProgress(state);
    if (!result.allowed) return result;

    result = checkProfanity(message);
    if (!result.allowed) return result;

    const dupResult = checkDuplicate(message, state);
    if (!dupResult.allowed) return dupResult;

    const rateResult = checkRateLimit(state);
    if (!rateResult.allowed) return rateResult;

    // All checks passed — commit state
    state.lastMessage = message;
    state.duplicateCount = dupResult.newDuplicateCount;
    state.requestCount++;

    return {
        allowed: true,
        sanitizedMessage: sanitize(message),
        remaining: rateResult.remaining,
    };
}

module.exports = { runGuardrails, clearState, setInProgress };
