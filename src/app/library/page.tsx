"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Search, Filter, Code2, Clock, Trash2, Copy, ExternalLink, Loader2 } from "lucide-react"

export default function Library() {
  const { data: session } = useSession()
  const [snippets, setSnippets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (session) {
      fetchSnippets()
    }
  }, [session, search])

  const fetchSnippets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/snippets/list?search=${encodeURIComponent(search)}`)
      if (res.ok) {
        const data = await res.json()
        setSnippets(data)
      }
    } catch (error) {
      console.error("Failed to fetch snippets", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteSnippet = async (id: string) => {
    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSnippets(snippets.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete snippet", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-spaceGrotesk text-[var(--on-surface)]">Please sign in to view your library.</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--surface-container-high)] pb-6">
        <div>
          <h1 className="text-4xl font-bold font-spaceGrotesk text-[var(--on-surface)]">Snippet Library</h1>
          <p className="text-[var(--on-surface-variant)] mt-2">Your personal collection of saved code blocks.</p>
        </div>
        
        <div className="relative w-full md:w-auto flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--outline-variant)]" />
          </div>
          <input
            type="text"
            placeholder="Search in code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface-container-highest)] border border-[var(--surface-container-high)] focus:border-[var(--primary)] text-[var(--on-surface)] rounded-xl outline-none transition-colors font-inter"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : snippets.length === 0 ? (
        <div className="text-center py-20">
          <Code2 className="h-16 w-16 mx-auto text-[var(--surface-container-highest)] mb-4" />
          <h3 className="text-xl font-spaceGrotesk text-[var(--on-surface)] mb-2">No snippets found</h3>
          <p className="text-[var(--on-surface-variant)]">You haven't saved any snippets yet, or your search didn't match anything.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {snippets.map((snippet, idx) => (
            <motion.div
              key={snippet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--surface-container)] rounded-2xl overflow-hidden shadow-lg border border-[var(--surface-container-high)] flex flex-col"
            >
              <div className="p-4 border-b border-[var(--surface-container-high)] flex justify-between items-center bg-[var(--surface-container-low)]">
                <div className="flex items-center space-x-2 truncate">
                   <div className="px-2 py-1 bg-[var(--surface-variant)] text-[var(--on-surface-variant)] text-xs font-bold rounded-full uppercase tracking-wider font-inter">
                      {snippet.language || 'Code'}
                   </div>
                   <span className="text-sm text-[var(--on-surface)] truncate font-medium">
                     {snippet.article?.title || 'Unknown Source'}
                   </span>
                </div>
                <div className="flex space-x-1 text-[var(--outline-variant)]">
                  <button onClick={() => copyToClipboard(snippet.code)} className="p-1.5 hover:bg-[var(--surface-container-highest)] hover:text-[var(--primary)] rounded-md transition-colors" title="Copy">
                    <Copy className="h-4 w-4" />
                  </button>
                  {snippet.sourceUrl && (
                    <a href={snippet.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[var(--surface-container-highest)] hover:text-[var(--primary)] rounded-md transition-colors" title="Go to source">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => deleteSnippet(snippet.id)} className="p-1.5 hover:bg-[var(--surface-container-highest)] hover:text-[var(--error)] rounded-md transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-[var(--surface-container-lowest)] flex-1 overflow-x-auto">
                <pre className="text-sm font-inter text-[var(--secondary)]">
                  <code>{snippet.code}</code>
                </pre>
              </div>
              <div className="p-3 bg-[var(--surface-container-low)] border-t border-[var(--surface-container-high)] flex items-center text-xs text-[var(--outline-variant)] font-inter">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(snippet.createdAt).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
