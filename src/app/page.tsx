"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion"
import { LinkIcon, Loader2, Save, FileText, Menu, ChevronRight, Sparkles, BrainCircuit, X as CloseIcon, FolderPlus, Folder } from "lucide-react"
import ReactMarkdown from "react-markdown"
import CodeBlock from "@/components/code-block"

export default function Home() {
  const { data: session } = useSession()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [article, setArticle] = useState<any>(null)
  const [isArticleSaved, setIsArticleSaved] = useState(false)
  const [savingArticle, setSavingArticle] = useState(false)
  
  // AI State
  const [summary, setSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)

  // Collections State
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")

  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Snippet capture state
  const [selection, setSelection] = useState("")
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })
  const [showPopover, setShowPopover] = useState(false)
  const [savingSnippet, setSavingSnippet] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session) {
      fetchCollections()
    }
  }, [session])

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections")
      if (res.ok) {
        const data = await res.json()
        setCollections(data)
      }
    } catch (e) {
      console.error("Failed to fetch collections", e)
    }
  }

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
      setSummary(null)
      setExplanation(null)
      setSelectedCollection(data.article?.collectionId || "")
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
          language: "plaintext",
          collectionId: selectedCollection || null
        }),
      });
      if (res.ok) {
        setShowPopover(false);
      }
    } catch (err) {
      console.error("Failed to save snippet", err);
    } finally {
      setSavingSnippet(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSummarize = async () => {
    if (!article?.markdown) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: article.markdown }),
      });
      const data = await res.json();
      if (res.ok) setSummary(data.summary);
    } catch (err) {
      console.error("Failed to summarize", err);
    } finally {
      setSummarizing(false);
    }
  };

  const handleExplain = async () => {
    if (!selection) return;
    setExplaining(true);
    setShowPopover(false);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: selection,
          context: article?.title 
        }),
      });
      const data = await res.json();
      if (res.ok) setExplanation(data.explanation);
    } catch (err) {
      console.error("Failed to explain", err);
    } finally {
      setExplaining(false);
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
          saved: !isArticleSaved,
          collectionId: selectedCollection || null
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

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCollectionName) return
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCollectionName }),
      })
      if (res.ok) {
        const data = await res.json()
        setCollections([...collections, data])
        setSelectedCollection(data.id)
        setNewCollectionName("")
        setIsCreatingCollection(false)
        
        // Auto-save article to this new collection if it exists
        if (article?.article?.id) {
          handleSetCollection(data.id);
        }
      }
    } catch (e) {
      console.error("Failed to create collection", e)
    }
  }

  const handleSetCollection = async (collectionId: string) => {
    if (!article?.article?.id) return;
    setSelectedCollection(collectionId);
    try {
      await fetch("/api/articles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: article.article.id,
          collectionId: collectionId || null,
          saved: true 
        }),
      });
      setIsArticleSaved(true);
    } catch (e) {
      console.error("Failed to set collection", e)
    }
  };

  return (
    <div className="flex flex-col items-center space-y-12 py-10 relative">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[var(--primary)] z-[60] origin-left"
        style={{ scaleX }}
      />
      
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

      {/* Article Content Wrapper */}
      <div className="w-full flex justify-center gap-8 relative px-4">
        <AnimatePresence mode="wait">
          {article && (
            <>
              {/* TOC Sidebar */}
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden xl:block w-64 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto"
              >
                <div className="p-4 bg-[var(--surface-container-low)] rounded-2xl border border-[var(--outline-variant)]/10">
                  <h3 className="text-sm font-bold font-spaceGrotesk text-[var(--on-surface)] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Menu className="h-4 w-4 text-[var(--primary)]" />
                    Contents
                  </h3>
                  <div className="space-y-1">
                    {article.toc?.map((item: any) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block text-sm py-1.5 px-2 rounded-lg transition-all hover:bg-[var(--surface-container-highest)] hover:text-[var(--primary)] font-inter ${
                          item.level === 1 ? 'font-bold' : item.level === 2 ? 'pl-4 opacity-80' : 'pl-6 opacity-60 text-xs'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                </div>
              </motion.aside>

              <motion.div
                key={article.article.id}
                layoutId={`article-${article.article.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-3xl bg-[var(--surface-container)] p-6 md:p-12 rounded-2xl shadow-2xl relative"
              >
                <div className="mb-10 pb-6 border-b border-[var(--surface-container-high)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div>
                      <h2 className="text-2xl md:text-3xl font-spaceGrotesk font-bold text-[var(--on-surface)] mb-2">
                        {article.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3">
                        <a href={article.article.url} target="_blank" rel="noopener noreferrer" className="text-sm font-inter text-[var(--primary)] hover:underline flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" /> Original Source
                        </a>
                        <button 
                          onClick={handleSummarize}
                          disabled={summarizing || !!summary}
                          className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--surface-container-high)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {summary ? "Summary Generated" : "AI Summarize"}
                        </button>
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
                          {isArticleSaved ? "Saved" : "Save to Library"}
                        </button>

                        <div className="flex items-center gap-1">
                          <select
                            value={selectedCollection}
                            onChange={(e) => handleSetCollection(e.target.value)}
                            className="text-sm bg-[var(--surface-container-high)] text-[var(--on-surface)] px-3 py-1 rounded-full border-none outline-none focus:ring-1 focus:ring-[var(--primary)] font-inter"
                          >
                            <option value="">No Collection</option>
                            {collections.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setIsCreatingCollection(true)}
                            className="p-1.5 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] rounded-full transition-colors"
                            title="New Collection"
                          >
                            <FolderPlus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                   </div>
                   <div className="hidden md:block bg-[var(--surface-container-lowest)] p-3 rounded-xl border border-[var(--surface-container-high)]">
                      <FileText className="h-6 w-6 text-[var(--outline-variant)]" />
                   </div>
                </div>

                {/* AI Summary Section */}
                <AnimatePresence>
                  {summary && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mb-8 p-6 bg-[var(--surface-container-low)] rounded-2xl border-l-4 border-[var(--primary)] overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-3 text-[var(--primary)] font-spaceGrotesk font-bold text-sm uppercase tracking-widest">
                        <Sparkles className="h-4 w-4" />
                        AI Summary
                      </div>
                      <div className="prose prose-sm prose-invert max-w-none text-[var(--on-surface-variant)] font-manrope">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Explanation Section */}
                <AnimatePresence>
                  {explanation && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-8 p-6 bg-[var(--surface-container-highest)] rounded-2xl border border-[var(--primary)]/30 relative"
                    >
                      <button 
                        onClick={() => setExplanation(null)}
                        className="absolute top-4 right-4 text-[var(--outline-variant)] hover:text-[var(--on-surface)]"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2 mb-3 text-[var(--secondary)] font-spaceGrotesk font-bold text-sm uppercase tracking-widest">
                        <BrainCircuit className="h-4 w-4" />
                        Code Explanation
                      </div>
                      <div className="prose prose-sm prose-invert max-w-none text-[var(--on-surface-variant)] font-manrope">
                        <ReactMarkdown>{explanation}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div 
                  ref={articleRef}
                  className="prose prose-invert prose-lg max-w-none font-manrope 
                    prose-headings:font-spaceGrotesk prose-headings:text-[var(--on-surface)] 
                    prose-headings:scroll-mt-24
                    prose-p:text-[var(--on-background)] prose-p:leading-relaxed
                    prose-a:text-[var(--primary)]
                    prose-pre:bg-transparent prose-pre:p-0
                    prose-code:font-inter prose-code:text-[var(--secondary)]
                    selection:bg-[var(--primary-container)] selection:text-[var(--on-primary-container)]"
                >
                  <ReactMarkdown 
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <CodeBlock
                            code={String(children).replace(/\n$/, '')}
                            language={match[1]}
                            theme="github-dark"
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {article.markdown}
                  </ReactMarkdown>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Snippet Capture Popover */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ position: 'absolute', top: popoverPos.top, left: popoverPos.left }}
            className="z-50 flex gap-2"
          >
            <button
              onClick={saveSnippet}
              disabled={savingSnippet}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--surface-bright)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-[var(--outline-variant)] border-opacity-20 transition-all group"
            >
              {savingSnippet ? <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" /> : <Save className="h-4 w-4 text-[var(--primary)] group-hover:scale-110 transition-transform" />}
              <span className="font-inter text-sm font-medium">Save</span>
            </button>

            <button
              onClick={handleExplain}
              disabled={explaining}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--surface-bright)] hover:bg-[var(--surface-container-highest)] text-[var(--primary)] rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-[var(--outline-variant)] border-opacity-20 transition-all group"
            >
              {explaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4 group-hover:scale-110 transition-transform" />}
              <span className="font-inter text-sm font-medium">Explain</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Collection Modal */}
      <AnimatePresence>
        {isCreatingCollection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingCollection(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[var(--surface-container-highest)] p-6 rounded-2xl border border-[var(--outline-variant)] shadow-2xl"
            >
              <h3 className="text-xl font-spaceGrotesk font-bold text-[var(--on-surface)] mb-4">New Collection</h3>
              <form onSubmit={handleCreateCollection} className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., React Research"
                  className="w-full bg-[var(--surface-container-low)] border-none outline-none p-3 rounded-xl text-[var(--on-surface)] font-inter"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[var(--primary)] text-[var(--on-primary)] font-bold py-2 rounded-xl"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCollection(false)}
                    className="flex-1 bg-[var(--surface-container-high)] text-[var(--on-surface)] font-bold py-2 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
