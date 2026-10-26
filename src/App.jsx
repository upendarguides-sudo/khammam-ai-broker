import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const suggestions = [
  'Show me AC rooms under ₹8,000',
  'Find a men’s PG near Khammam bus stand',
  'Which hostels have beds available?',
]

function SparkleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" fill="currentColor" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 3 10.8 13.2M21 3l-6.5 18-3.7-7.8L3 9.5 21 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChatPanel() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [selectedSuggestion, setSelectedSuggestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  async function sendMessage(event) {
    event.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((current) => [...current, { role: 'user', content: message }])
    setInput('')
    setSelectedSuggestion('')
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'The room assistant could not respond. Please try again.')
      }
      if (typeof result.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The room assistant returned an empty reply. Please try again.')
      }
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }])
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the room assistant. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function selectSuggestion(suggestion) {
    setSelectedSuggestion(suggestion)
    setInput(suggestion)
  }

  function onInputChange(event) {
    setInput(event.target.value)
    if (selectedSuggestion && event.target.value !== selectedSuggestion) {
      setSelectedSuggestion('')
    }
  }

  return (
    <section className="chat-card" aria-label="AI room finder">
      <div className="chat-header">
        <div className="assistant-avatar"><SparkleIcon size={20} /></div>
        <div className="assistant-heading">
          <strong>Khammam AI</strong>
          <span><i className="online-dot" /> Your room-finding assistant</span>
        </div>
        <span className="powered-badge">AI POWERED</span>
      </div>

      <div className="chat-body" aria-live="polite">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="message-avatar"><SparkleIcon size={16} /></div>
            <div className="message-content">
              <span className="message-name">Khammam AI <time>just now</time></span>
              <p>Hi there! I can help you find a comfortable place to stay in Khammam. What are you looking for?</p>
              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={selectedSuggestion === suggestion ? 'is-selected' : ''}
                    aria-pressed={selectedSuggestion === suggestion}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}<span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && <div className="message-avatar"><SparkleIcon size={16} /></div>}
                <div className="message-content">
                  {message.role === 'assistant' && <span className="message-name">Khammam AI</span>}
                  {message.role === 'assistant' ? (
                    <div className="assistant-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="chat-message assistant loading-message">
            <div className="message-avatar"><SparkleIcon size={16} /></div>
            <div className="typing-indicator" role="status" aria-label="Finding rooms">
              <i /><i /><i />
            </div>
          </div>
        )}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="room-question">Ask about rooms in Khammam</label>
        <input
          id="room-question"
          value={input}
          onChange={onInputChange}
          placeholder="Ask about rooms, prices, locations..."
          disabled={isLoading}
        />
        <button type="submit" aria-label="Send message" disabled={!input.trim() || isLoading}>
          <SendIcon />
        </button>
      </form>
      <p className="chat-footnote">Room recommendations, made simple <span>✦</span></p>
    </section>
  )
}

function App() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Khammam AI home">
          <span className="brand-mark"><SparkleIcon size={19} /></span>
          <span>khammam<span className="brand-accent">.</span><small>AI ROOM BROKER</small></span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#room-finder">Find a room</a>
        </nav>
        <a className="nav-cta" href="#room-finder">Start searching <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span /> A BETTER WAY TO FIND YOUR STAY</div>
          <h1>Your next stay<br />starts <em>right here.</em></h1>
          <p className="hero-description">
            Finding a room in Khammam shouldn’t feel like work. Tell our AI what you need, and discover a place that feels like yours.
          </p>
          <div className="hero-actions">
            <a href="#room-finder" className="primary-button">Find your room <span aria-hidden="true">↗</span></a>
            <div className="trust-note">
              <div className="trust-avatars"><span>R</span><span>S</span><span>A</span></div>
              <span><strong>Local stays,</strong><br />thoughtfully matched</span>
            </div>
          </div>
          <div className="hero-stats">
            <div><strong>03</strong><span>trusted local partners</span></div>
            <i />
            <div><strong>1:1</strong><span>personalised suggestions</span></div>
          </div>
        </div>

        <div className="hero-visual" id="room-finder">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="floating-note"><span className="note-icon">⌖</span><span>Made for Khammam<br /><strong>Local knowledge, real options</strong></span></div>
          <ChatPanel />
          <div className="availability-tag"><span /> Helping you find your fit</div>
        </div>
      </section>

      <section className="feature-strip" id="how-it-works" aria-label="Why use Khammam AI">
        <div className="feature-intro"><span>ROOM HUNTING, REIMAGINED</span><h2>Less searching.<br /><em>More settling in.</em></h2></div>
        <article className="feature-item">
          <span className="feature-number">01</span>
          <div className="feature-icon">⌕</div>
          <h3>Just tell us what you need</h3>
          <p>Budget, location, sharing—say it naturally. No complicated filters.</p>
        </article>
        <article className="feature-item">
          <span className="feature-number">02</span>
          <div className="feature-icon">✳</div>
          <h3>Get a thoughtful match</h3>
          <p>Our AI looks across local hostel listings to find options that fit.</p>
        </article>
        <article className="feature-item">
          <span className="feature-number">03</span>
          <div className="feature-icon">⌂</div>
          <h3>Feel at home, sooner</h3>
          <p>Compare real availability and pricing from Khammam stay partners.</p>
        </article>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#" aria-label="Khammam AI home">
          <span className="brand-mark"><SparkleIcon size={17} /></span>
          <span>khammam<span className="brand-accent">.</span></span>
        </a>
        <p>A little closer to feeling at home.</p>
        <span>KHAMMAM, TELANGANA <span className="footer-dot">•</span> MADE FOR YOU</span>
      </footer>
    </main>
  )
}

export default App
