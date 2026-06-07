// Imports
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { runGuardrails, clearState, setInProgress } = require('./guardrails');

const OLLAMA_MODEL = 'qwen2.5-coder:7b';

const app = express();
app.use(cors()); // allows the React frontend (port 5173) to make requests to this server (port 3001)
app.get('/', (req, res) => res.send('Backend is running')); // health check — confirms the server is up in a browser
const server = http.createServer(app); // socket.io needs a raw Node HTTP server, not just the Express app
const io = new Server(server, { cors: { origin: '*' } }); // attaches socket.io to the same HTTP server; cors here covers WebSocket connections specifically

// fires every time a new client (React app) opens a WebSocket connection
io.on('connection', (socket) => {

    // listens for a 'message' event sent by the frontend
    socket.on('message', (userMessage) => {
        console.log('Received message:', userMessage);

        const guardrail = runGuardrails(userMessage, socket.id);
        if (!guardrail.allowed) {
            console.log('Guardrail blocked:', guardrail.reason);
            socket.emit('guardrail', { reason: guardrail.reason });
            return;
        }

        // Emit remaining request count so the frontend can show it
        socket.emit('rateInfo', { remaining: guardrail.remaining });

        // config for the HTTP request to Ollama
        const options = {
            hostname: '127.0.0.1',
            port: 11434,           // Ollama's default port
            path: '/api/generate', // Ollama's text generation endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        setInProgress(socket.id, true);

        // open a streaming HTTP request to Ollama
        const req = http.request(options, (res) => {
            // Ollama sends NDJSON — chunks don't always align with newlines, so buffer
            // and split manually to avoid JSON.parse crashing on a partial object
            let buffer = '';

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep the last (possibly incomplete) line for the next chunk

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.response) {
                            process.stdout.write(parsed.response + '|'); // print token with | separator
                            socket.emit('token', parsed.response); // forward the token to the frontend in real time
                        }
                        if (parsed.done) {
                            process.stdout.write('\n'); // newline after response completes
                            setInProgress(socket.id, false);
                            socket.emit('done'); // tell the frontend the full response is complete
                        }
                    } catch (e) {
                        console.error('Failed to parse Ollama line:', line);
                    }
                }
            });

            res.on('error', (err) => {
                console.error('Ollama response error:', err.message);
                setInProgress(socket.id, false);
                socket.emit('error', 'Ollama response stream failed');
            });
        });

        // send the sanitized prompt; stream:true tells Ollama to send tokens as generated
        req.write(JSON.stringify({ model: OLLAMA_MODEL, prompt: guardrail.sanitizedMessage, stream: true }));
        req.end(); // signals we're done writing the request body — Ollama starts processing

        // catches network-level errors e.g. Ollama not running
        req.on('error', (err) => {
            console.error('Ollama error:', err.message);
            setInProgress(socket.id, false);
            socket.emit('error', 'Failed to reach Ollama');
        });
    });

    // free memory when the client disconnects
    socket.on('disconnect', () => {
        clearState(socket.id);
    });
});

server.listen(3001, () => console.log('Backend running on port 3001'));
