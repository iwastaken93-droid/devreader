"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { LinkIcon, Loader2, Save, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function Home() {
  const { data: session } = useSession()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [article, setArticle] = useState<any>(null)
  const [isArticleSaved, setIsArticleSaved] = useState(false)
  const [savingArticle, setSavingArticle] = useState(false)
  
  // Snippet capture state
  const [selection, setSelection] = useState("")
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const [showPopover, setShowPopover] = useState(false)
  const [savingSnippet, setSavingSnippet] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    if (!session) {
      setError("Please sign in to parse and save articles.")
      return
    }

    setLoading(true)
    setError("")
    setArticle(null)

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse article")
      }

      setArticle(data)
      setIsArticleSaved(data.saved || false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle text selection for snippet capture
  useEffect(() => {
    const handleMouseUp = () => {
      if (!articleRef.current) return;
      
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 0 && articleRef.current.contains(selection?.anchorNode || null)) {
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setSelection(text);
          setPopoverPos({
            top: rect.top + window.scrollY - 50,
            left: rect.left + window.scrollX + (rect.width / 2) - 60
          });
          setShowPopover(true);
        }
      } else {
        setShowPopover(false);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [article]);

  const saveSnippet = async () => {
    if (!selection || !article) return;
    setSavingSnippet(true);
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selection,
          sourceUrl: url,
          articleId: article.article.id,
          // Extract language if selected from a code block, default to 'plaintext' for now
          language: "plaintext" 
        }),
      });
      if (res.ok) {
        setShowPopover(false);
        // Optionally show a toast notification here
      }
    } catch (err) {
      console.error("Failed to save snippet", err);
    } finally {
      setSavingSnippet(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const toggleSaveArticle = async () => {
    if (!article?.article?.id) return;
    setSavingArticle(true);
    try {
      const res = await fetch("/api/articles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: article.article.id,
          saved: !isArticleSaved
        }),
      });
      if (res.ok) {
        setIsArticleSaved(!isArticleSaved);
      }
    } catch (err) {
      console.error("Failed to toggle save article", err);
    } finally {
      setSavingArticle(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-12 py-10">
      
      {/* Search/URL Input Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-2xl text-center space-y-6"
      >
        <h1 className="text-4xl md:text-5xl font-bold font-spaceGrotesk text-[var(--on-surface)]">
          The Sublime Console
        </h1>
        <p className="text-lg text-[var(--on-surface-variant)] font-manrope">
          Paste a link to any technical documentation, GitHub README, or blog to read without distractions.
        </p>

        <form onSubmit={handleParse} className="relative group mt-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <LinkIcon className="h-5 w-5 text-[var(--outline-variant)]" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/..."
            className="w-full pl-12 pr-32 py-4 bg-[var(--surface-container-highest)] border-b border-[var(--outline-variant)] focus:border-[var(--primary)] text-[var(--on-surface)] rounded-t-md outline-none transition-all placeholder:text-[var(--outline-variant)] font-inter text-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute inset-y-2 right-2 px-6 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)] text-[var(--on-primary)] font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[100px]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Fetch"}
          </button>
        </form>
        {error && <p className="text-[var(--error)] text-sm mt-2">{error}</p>}
      </motion.div>

      {/* Article Content */}
      <AnimatePresence mode="wait">
        {article && (
          <motion.div
            key={article.article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-3xl bg-[var(--surface-container)] p-8 md:p-12 rounded-2xl shadow-2xl relative"
          >
            <div className="mb-10 pb-6 border-b border-[var(--surface-container-high)] flex items-center justify-between">
               <div>
                  <h2 className="text-3xl font-spaceGrotesk font-bold text-[var(--on-surface)] mb-2">
                    {article.title}
                  </h2>
                  <div className="flex items-center gap-4">
                    <a href={article.article.url} target="_blank" rel="noopener noreferrer" className="text-sm font-inter text-[var(--primary)] hover:underline flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" /> Original Source
                    </a>
                    <button 
                      onClick={toggleSaveArticle}
                      disabled={savingArticle}
                      className={`text-sm font-medium px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                        isArticleSaved 
                        ? 'bg-[var(--primary)] text-[var(--on-primary)]' 
                        : 'bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)]'
                      }`}
                    >
                      {savingArticle ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isArticleSaved ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      {isArticleSaved ? "Saved to Library" : "Save to Library"}
                    </button>
                  </div>
               </div>
               <div className="bg-[var(--surface-container-lowest)] p-3 rounded-xl border border-[var(--surface-container-high)]">
                  <FileText className="h-6 w-6 text-[var(--outline-variant)]" />
               </div>
            </div>
            
            <div 
              ref={articleRef}
              className="prose prose-invert prose-lg max-w-none font-manrope 
                prose-headings:font-spaceGrotesk prose-headings:text-[var(--on-surface)] 
                prose-p:text-[var(--on-background)] prose-p:leading-relaxed
                prose-a:text-[var(--primary)]
                prose-pre:bg-[var(--surface-container-lowest)] prose-pre:border-none prose-pre:rounded-xl prose-pre:p-4
                prose-code:font-inter prose-code:text-[var(--secondary)]
                selection:bg-[var(--primary-container)] selection:text-[var(--on-primary-container)]"
            >
              <ReactMarkdown>{article.markdown}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snippet Capture Popover */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ position: 'absolute', top: popoverPos.top, left: popoverPos.left }}
            className="z-50"
          >
            <button
              onClick={saveSnippet}
              disabled={savingSnippet}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--surface-bright)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-[var(--outline-variant)] border-opacity-20 transition-all group"
            >
              {savingSnippet ? <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" /> : <Save className="h-4 w-4 text-[var(--primary)] group-hover:scale-110 transition-transform" />}
              <span className="font-inter text-sm font-medium">Save Snippet</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
