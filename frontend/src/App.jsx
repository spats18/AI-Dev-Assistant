import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const socket = io('http://localhost:3001', {
  reconnectionAttempts: 3,  // stop trying after 3 failed attempts
  timeout: 5000,
})

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connecting' | 'connected' | 'disconnected'
  const [guardrailError, setGuardrailError] = useState(null)
  const [remaining, setRemaining] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    socket.on('connect', () => setConnectionStatus('connected'))

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      setIsStreaming(false)
    })

    // fires when all reconnection attempts fail
    socket.on('connect_error', () => setConnectionStatus('disconnected'))

    socket.on('token', (token) => {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: updated[updated.length - 1].text + token,
        }
        return updated
      })
    })

    socket.on('done', () => {
      setIsStreaming(false)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false }
        return updated
      })
    })

    socket.on('error', (err) => {
      setIsStreaming(false)
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err}`, streaming: false }])
    })

    socket.on('guardrail', ({ reason }) => {
      setIsStreaming(false)
      setGuardrailError(reason)
      // Remove the empty pending assistant bubble added optimistically on send
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.text === '') {
          return prev.slice(0, -1)
        }
        return prev
      })
    })

    socket.on('rateInfo', ({ remaining }) => {
      setRemaining(remaining)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('token')
      socket.off('done')
      socket.off('error')
      socket.off('guardrail')
      socket.off('rateInfo')
    }
  }, [])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || isStreaming || connectionStatus !== 'connected') return

    setGuardrailError(null)
    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', text: '', streaming: true },
    ])
    setInput('')
    setIsStreaming(true)
    socket.emit('message', text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) sendMessage()
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (guardrailError) setGuardrailError(null)
  }

  const isDisabled = isStreaming || connectionStatus !== 'connected'

  return (
    <div className="chat-container">
      <div className="chat-header">
        AI Dev Assistant
        <span className={`status-dot ${connectionStatus}`} title={connectionStatus} />
      </div>

      {connectionStatus === 'disconnected' && (
        <div className="connection-banner">
          Cannot connect to backend — make sure <code>node server.js</code> is running on port 3001
        </div>
      )}

      {connectionStatus === 'connecting' && (
        <div className="connection-banner connecting">
          Connecting to backend...
        </div>
      )}

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role} ${msg.streaming ? 'streaming' : ''}`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {guardrailError && (
          <div className="guardrail-error">{guardrailError}</div>
        )}
        <div className="input-row">
          <input
            type="text"
            placeholder={connectionStatus !== 'connected' ? 'Waiting for connection...' : 'Ask something...'}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
          />
          <button onClick={sendMessage} disabled={isDisabled}>
            {isStreaming ? 'Thinking...' : 'Send'}
          </button>
        </div>
        {remaining !== null && (
          <div className="rate-info">
            {remaining} request{remaining !== 1 ? 's' : ''} remaining this window
          </div>
        )}
      </div>
    </div>
  )
}

export default App
