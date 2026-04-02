"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface CodeBlockProps {
  code: string
  language?: string
  theme?: string
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function CodeBlock({ code, language = 'javascript', theme = 'github-dark' }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHighlight = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/highlight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, lang: language, theme })
        })
        const data = await res.json()
        if (data.html) {
          setHtml(data.html)
        } else {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
        }
      } catch (_e) {
        setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
      } finally {
        setLoading(false)
      }
    }

    fetchHighlight()
  }, [code, language, theme])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-[var(--surface-container-lowest)] rounded-xl min-h-[50px]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div 
      className="shiki-container rounded-xl overflow-hidden text-sm font-inter"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  )
}
