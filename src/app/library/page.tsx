"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Filter, Code2, Clock, Trash2, Copy, ExternalLink, BookOpen, Folder } from "lucide-react"
import CodeBlock from "@/components/code-block"

interface Collection {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  domain: string | null;
  url: string;
  updatedAt: string;
  collection: Collection | null;
}

interface Snippet {
  id: string;
  code: string;
  language: string | null;
  sourceUrl: string | null;
  createdAt: string;
  article: { title: string } | null;
  collection: Collection | null;
}

function SkeletonSnippetCard() {
  return (
    <div className="bg-[var(--surface-container)] rounded-2xl overflow-hidden shadow-lg border border-[var(--surface-container-high)] flex flex-col animate-pulse">
      <div className="p-4 border-b border-[var(--surface-container-high)] flex justify-between items-center bg-[var(--surface-container-low)]">
        <div className="flex items-center space-x-2">
          <div className="w-12 h-5 bg-[var(--surface-variant)] rounded-full"></div>
          <div className="w-32 h-4 bg-[var(--surface-container-highest)] rounded-md"></div>
        </div>
        <div className="flex space-x-1">
          <div className="w-6 h-6 bg-[var(--surface-container-highest)] rounded-md"></div>
          <div className="w-6 h-6 bg-[var(--surface-container-highest)] rounded-md"></div>
        </div>
      </div>
      <div className="p-4 bg-[var(--surface-container-lowest)] flex-1 min-h-[120px]">
        <div className="w-3/4 h-4 bg-[var(--surface-container-highest)] rounded-md mb-2"></div>
        <div className="w-1/2 h-4 bg-[var(--surface-container-highest)] rounded-md mb-2"></div>
        <div className="w-5/6 h-4 bg-[var(--surface-container-highest)] rounded-md"></div>
      </div>
      <div className="p-3 bg-[var(--surface-container-low)] border-t border-[var(--surface-container-high)] flex justify-between items-center">
        <div className="w-20 h-3 bg-[var(--surface-container-highest)] rounded-md"></div>
      </div>
    </div>
  )
}

function SkeletonArticleCard() {
  return (
    <div className="bg-[var(--surface-container)] rounded-2xl overflow-hidden shadow-lg border border-[var(--surface-container-high)] flex flex-col animate-pulse min-h-[200px]">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2">
            <div className="w-16 h-5 bg-[var(--surface-container-high)] rounded-md"></div>
            <div className="w-20 h-3 bg-[var(--surface-container-highest)] rounded-md"></div>
          </div>
          <div className="w-6 h-6 bg-[var(--surface-container-highest)] rounded-md"></div>
        </div>
        <div className="w-full h-6 bg-[var(--surface-container-highest)] rounded-md mb-3"></div>
        <div className="w-3/4 h-6 bg-[var(--surface-container-highest)] rounded-md mb-4"></div>
        <div className="w-full h-4 bg-[var(--surface-container-highest)] rounded-md mb-2"></div>
        <div className="w-full h-4 bg-[var(--surface-container-highest)] rounded-md mb-2"></div>
        <div className="w-5/6 h-4 bg-[var(--surface-container-highest)] rounded-md mb-4"></div>
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--surface-container-high)]">
          <div className="w-20 h-3 bg-[var(--surface-container-highest)] rounded-md"></div>
          <div className="w-12 h-3 bg-[var(--surface-container-highest)] rounded-md"></div>
        </div>
      </div>
    </div>
  )
}

export default function Library() {
  const { data: session } = useSession()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeTab, setActiveTab] = useState<'snippets' | 'articles'>('snippets')
  const [selectedCollection, setSelectedCollection] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

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

  const fetchSnippets = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/snippets/list?search=${encodeURIComponent(search)}`
      if (selectedCollection !== 'all') url += `&collectionId=${selectedCollection}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSnippets(data)
      }
    } catch (error) {
      console.error("Failed to fetch snippets", error)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCollection])

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/articles/list?search=${encodeURIComponent(search)}`
      if (selectedCollection !== 'all') url += `&collectionId=${selectedCollection}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    } catch (error) {
      console.error("Failed to fetch articles", error)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCollection])

  useEffect(() => {
    if (session) {
      if (activeTab === 'snippets') {
        fetchSnippets()
      } else {
        fetchArticles()
      }
    }
  }, [session, search, activeTab, selectedCollection, fetchSnippets, fetchArticles])

  const deleteSnippet = async (id: string) => {
    // Optimistic UI update: use functional state update to prevent race conditions
    setSnippets(prev => prev.filter(s => s.id !== id))

    try {
      const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        // Revert on failure by fetching latest
        fetchSnippets()
        console.error("Failed to delete snippet on server")
      }
    } catch (error) {
      // Revert on failure by fetching latest
      fetchSnippets()
      console.error("Failed to delete snippet", error)
    }
  }

  const deleteArticle = async (id: string) => {
    // Optimistic UI update: use functional state update to prevent race conditions
    setArticles(prev => prev.filter(a => a.id !== id))

    try {
      const res = await fetch("/api/articles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, saved: false }),
      })
      if (!res.ok) {
        // Revert on failure by fetching latest
        fetchArticles()
        console.error("Failed to delete article on server")
      }
    } catch (error) {
      // Revert on failure by fetching latest
      fetchArticles()
      console.error("Failed to delete article", error)
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
          <h1 className="text-4xl font-bold font-spaceGrotesk text-[var(--on-surface)]">Library</h1>
          <p className="text-[var(--on-surface-variant)] mt-2">Your personal collection of saved knowledge.</p>
        </div>
        
        <div className="relative w-full md:w-auto flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--outline-variant)]" />
          </div>
          <input
            type="text"
            placeholder={activeTab === 'snippets' ? "Search in code..." : "Search in articles..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface-container-highest)] border border-[var(--surface-container-high)] focus:border-[var(--primary)] text-[var(--on-surface)] rounded-xl outline-none transition-colors font-inter"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 p-1 bg-[var(--surface-container-low)] rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('snippets')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'snippets'
                ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
            }`}
          >
            Snippets
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'articles'
                ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'
            }`}
          >
            Articles
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)] font-inter">
          <Filter className="h-4 w-4" />
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="bg-[var(--surface-container-low)] border-none outline-none py-1.5 px-3 rounded-lg focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="all">All Collections</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={activeTab === 'snippets' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {activeTab === 'snippets'
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonSnippetCard key={i} />)
            : Array.from({ length: 6 }).map((_, i) => <SkeletonArticleCard key={i} />)
          }
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'snippets' ? (
            <motion.div 
              key="snippets-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {snippets.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Code2 className="h-16 w-16 mx-auto text-[var(--surface-container-highest)] mb-4" />
                  <h3 className="text-xl font-spaceGrotesk text-[var(--on-surface)] mb-2">No snippets found</h3>
                </div>
              ) : (
                snippets.map((snippet, idx) => (
                  <motion.div
                    key={snippet.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[var(--surface-container)] rounded-2xl overflow-hidden shadow-lg border border-[var(--surface-container-high)] flex flex-col hover:border-[var(--primary)] transition-all"
                  >
                    <div className="p-4 border-b border-[var(--surface-container-high)] flex justify-between items-center bg-[var(--surface-container-low)]">
                      <div className="flex items-center space-x-2 truncate">
                        <div className="px-2 py-1 bg-[var(--surface-variant)] text-[var(--on-surface-variant)] text-[10px] font-bold rounded-full uppercase tracking-wider font-inter">
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
                      <CodeBlock code={snippet.code} language={snippet.language || 'javascript'} theme="github-dark" />
                    </div>
                    <div className="p-3 bg-[var(--surface-container-low)] border-t border-[var(--surface-container-high)] flex justify-between items-center text-[10px] text-[var(--outline-variant)] font-inter">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(snippet.createdAt).toLocaleDateString()}
                      </div>
                      {snippet.collection && (
                        <div className="flex items-center text-[var(--primary)]">
                          <Folder className="h-3 w-3 mr-1" />
                          {snippet.collection.name}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="articles-grid"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {articles.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <BookOpen className="h-16 w-16 mx-auto text-[var(--surface-container-highest)] mb-4" />
                  <h3 className="text-xl font-spaceGrotesk text-[var(--on-surface)] mb-2">No articles found</h3>
                </div>
              ) : (
                articles.map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[var(--surface-container)] rounded-2xl overflow-hidden shadow-lg border border-[var(--surface-container-high)] flex flex-col group hover:border-[var(--primary)] transition-all"
                  >
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-1">
                          <div className="px-2 py-1 bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-[10px] font-bold rounded-md uppercase tracking-widest font-inter w-fit">
                            {article.domain || 'Article'}
                          </div>
                          {article.collection && (
                            <div className="flex items-center text-[var(--primary)] text-[10px] font-bold">
                              <Folder className="h-3 w-3 mr-1" />
                              {article.collection.name}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => deleteArticle(article.id)}
                          className="p-1.5 text-[var(--outline-variant)] hover:text-[var(--error)] hover:bg-[var(--surface-container-highest)] rounded-md transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h3 className="text-lg font-bold font-spaceGrotesk text-[var(--on-surface)] line-clamp-2 mb-3">
                        {article.title}
                      </h3>
                      <p className="text-sm text-[var(--on-surface-variant)] line-clamp-3 mb-4 font-manrope">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--surface-container-high)]">
                        <span className="text-[10px] font-inter text-[var(--outline-variant)] flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(article.updatedAt).toLocaleDateString()}
                        </span>
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-[var(--primary)] flex items-center hover:underline"
                        >
                          READ <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
