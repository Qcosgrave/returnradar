'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Trash2, Bot, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const SUGGESTED_QUESTIONS = [
  'Why were Fridays slow last month?',
  'Who is my best-performing bartender?',
  'What are my top 3 items by revenue?',
  'What days of the week make the most money?',
  'How did last week compare to the week before?',
]

export default function ChatInterface({
  initialMessages,
  barName,
}: {
  initialMessages: Message[]
  barName?: string
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.upgrade) {
          toast.error('Ask Tavernbuddy requires the Pro plan')
        } else {
          toast.error(data.error || 'Failed to get response')
        }
        setMessages((prev) => prev.slice(0, -1))
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      toast.error('Connection error. Please try again.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    if (!confirm('Clear all chat history?')) return
    await fetch('/api/chat', { method: 'DELETE' })
    setMessages([])
    toast.success('Chat cleared')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Hey, I&apos;m Tavernbuddy 👋</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-8">
              Ask me anything about {barName ? `${barName}&apos;s` : 'your'} data. I&apos;ll give you straight answers with real numbers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left bg-[#1a1f2e] hover:bg-[#2d3748] border border-[#2d3748] hover:border-amber-500/30 rounded-lg px-4 py-2.5 text-sm text-slate-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === 'assistant' ? 'bg-amber-500/20' : 'bg-slate-700'
                }`}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-amber-500/10 border border-amber-500/20 text-slate-200'
                    : 'bg-[#1a1f2e] border border-[#2d3748] text-slate-300'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse-amber" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse-amber" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse-amber" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#2d3748] p-4 lg:p-6">
        {messages.length > 0 && (
          <div className="flex justify-end mb-3">
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear chat
            </button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your bar... (Enter to send)"
            rows={1}
            className="flex-1 bg-[#1a1f2e] border border-[#2d3748] focus:border-amber-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 text-sm resize-none focus:outline-none transition-colors"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0f1117] p-3 rounded-xl transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-2 text-center">
          Tavernbuddy uses your last 30 days of data to answer questions.
        </p>
      </div>
    </div>
  )
}
