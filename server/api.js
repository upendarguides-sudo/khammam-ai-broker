import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import Groq from 'groq-sdk'
import { answerListingQuestion, loadAllHostels } from './hostels.js'

const app = express()
const port = Number(process.env.API_PORT) || 3002

app.use(cors())
app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (req, res) => {
  try {
    const hostelCount = loadAllHostels().length
    return res.json({
      service: 'khammam-ai-room-broker',
      status: 'ok',
      port,
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      hostelCount,
    })
  } catch (error) {
    console.error('Room broker health check failed:', error)
    return res.status(503).json({
      service: 'khammam-ai-room-broker',
      status: 'error',
      error: 'Hostel listing data could not be loaded.',
    })
  }
})

app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) {
    return res.status(400).json({ error: 'Please enter a question about rooms in Khammam.' })
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Your question must be 2,000 characters or fewer.' })
  }

  const history = Array.isArray(req.body.history) ? req.body.history : []
  if (history.length > 20 || history.some((entry) => (
    !entry ||
    !['user', 'assistant'].includes(entry.role) ||
    typeof entry.content !== 'string' ||
    entry.content.length > 2000
  ))) {
    return res.status(400).json({ error: 'Chat history is invalid. Please start a new conversation.' })
  }

  try {
    const hostels = loadAllHostels()
    const listingReply = answerListingQuestion(message, hostels)
    if (listingReply) {
      return res.json({ reply: listingReply })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'The room assistant is not configured. Add GROQ_API_KEY to the server environment.' })
    }

    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      temperature: 0.3,
      max_completion_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are Khammam AI, a friendly local room broker. You must ALWAYS respond in natural, conversational Telugu written in the English alphabet (Tanglish). Be warm, polite, and use local friendly terms. If returning room data, format it as a clean Markdown table, but keep the surrounding conversation in Tanglish.',
        },
        {
          role: 'system',
          content: [
            'You are Khammam AI Room Broker, a friendly local room-finding assistant.',
            'Answer using only the hostel listing data below. Do not invent availability, amenities, contact information, or policies.',
            'If there is no suitable listing or a requested detail is not present, say so clearly.',
            'Be concise and compare hostel name, location, sharing, AC status, price in rupees, and available beds when relevant.',
            'Never provide or invent phone numbers, WhatsApp contacts, or unrelated hostel promotions.',
            `Hostel listings: ${JSON.stringify(hostels)}`,
          ].join('\n'),
        },
        ...history,
        { role: 'user', content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content
    if (typeof reply !== 'string' || !reply.trim()) {
      console.error('Groq returned an empty room-assistant response')
      return res.status(502).json({ error: 'The room assistant returned an empty response. Please try again.' })
    }

    return res.json({ reply })
  } catch (error) {
    const errorHeaders = error?.headers
    console.error('Room assistant request failed:', {
      route: '/api/chat',
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      status: error?.status,
      code: error?.code,
      requestId: error?.requestID ??
        error?.request_id ??
        errorHeaders?.get?.('x-request-id') ??
        errorHeaders?.get?.('request-id'),
      providerMessage: error?.error?.message,
      stack: error instanceof Error ? error.stack : undefined,
      cause: error?.cause instanceof Error
        ? { message: error.cause.message, stack: error.cause.stack }
        : error?.cause,
    })
    return res.status(error?.status ? 502 : 500).json({
      error: 'Unable to search room listings right now. Please try again.',
    })
  }
})

app.listen(port, () => {
  console.log(`Khammam AI API listening on http://localhost:${port}`)
})
