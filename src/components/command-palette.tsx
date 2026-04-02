"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Command, Moon, Sun, BookOpen, Library, LogOut, Code2, Folder, ExternalLink, FileText, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react"

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
}

export default function CommandPalette() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<{articles: {id:string, title:string, domain:string, url:string}[], snippets: {id:string, language:string, code:string}[], collections: {id:string, name:string}[]}>({ articles: [], snippets: [], collections: [] })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => setIsOpen(open => !open), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  // Debounced Search
  useEffect(() => {
    if (!session || !isOpen) return;

    if (query.trim() === '') {
      setSearchResults({ articles: [], snippets: [], collections: [] })
      return;
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch (err) {
        console.error("Search failed", err)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, session, isOpen])

  const staticActions: SearchItem[] = [
    { id: 'home', title: 'Go to Home', group: 'Actions', icon: BookOpen, action: () => router.push('/') },
    { id: 'library', title: 'Go to Library', group: 'Actions', icon: Library, action: () => router.push('/library') },
    { id: 'theme-dark', title: 'Switch to Dark Mode', group: 'Actions', icon: Moon, action: () => setTheme('dark') },
    { id: 'theme-light', title: 'Switch to Light Mode', group: 'Actions', icon: Sun, action: () => setTheme('light') },
    { id: 'logout', title: 'Sign Out', group: 'Actions', icon: LogOut, action: () => signOut() },
  ]

  // Filter static actions
  const filteredActions = query === "" 
    ? staticActions
    : staticActions.filter(action => action.title.toLowerCase().includes(query.toLowerCase()))

  // Compile all items
  const allItems: SearchItem[] = [
    ...filteredActions,
    ...searchResults.articles.map(a => ({
      id: `article-${a.id}`,
      title: a.title,
      subtitle: a.domain,
      group: 'Articles',
      icon: FileText,
      action: () => window.open(a.url, '_blank')
    })),
    ...searchResults.snippets.map(s => ({
      id: `snippet-${s.id}`,
      title: s.language || 'Snippet',
      subtitle: s.code.substring(0, 40) + '...',
      group: 'Snippets',
      icon: Code2,
      action: () => router.push('/library') // Could be specific snippet if UI supported it
    })),
    ...searchResults.collections.map(c => ({
      id: `collection-${c.id}`,
      title: c.name,
      group: 'Collections',
      icon: Folder,
      action: () => router.push(`/library`) // Filter logic can be added later via params
    }))
  ]

  // Group items
  const groupedItems = allItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>)

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, searchResults])

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(allItems.length, 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + Math.max(allItems.length, 1)) % Math.max(allItems.length, 1))
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault()
      allItems[selectedIndex].action()
      setIsOpen(false)
    }
  }

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.querySelector('[aria-selected="true"]')
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, isOpen])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSearchResults({ articles: [], snippets: [], collections: [] })
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
          >
            <div className="flex items-center px-4 py-3 border-b border-[var(--outline-variant)]/20 shrink-0">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-[var(--primary)] mr-3 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-[var(--outline-variant)] mr-3" />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Search articles, snippets, or actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-[var(--on-surface)] placeholder:text-[var(--outline-variant)] font-inter text-lg"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-results"
                aria-activedescendant={allItems[selectedIndex] ? allItems[selectedIndex].id : undefined}
              />
              <div className="flex items-center gap-1 bg-[var(--surface-container-low)] px-1.5 py-0.5 rounded border border-[var(--outline-variant)]/20 text-[var(--outline-variant)] text-xs font-medium">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>

            <div
              ref={listRef}
              className="overflow-y-auto p-2 flex-1"
              role="listbox"
              id="command-palette-results"
            >
              {allItems.length > 0 ? (
                Object.entries(groupedItems).map(([group, items]) => (
                  <div key={group} className="mb-4 last:mb-0">
                    <div className="px-3 mb-1 text-xs font-bold text-[var(--outline-variant)] uppercase tracking-wider font-spaceGrotesk">
                      {group}
                    </div>
                    {items.map(action => {
                      const isSelected = globalIndex === selectedIndex;
                      const currentIndex = globalIndex;
                      globalIndex++;

                      return (
                        <button
                          key={action.id}
                          id={action.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            action.action()
                            setIsOpen(false)
                          }}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={`w-full flex items-center px-3 py-3 rounded-xl transition-all text-left ${
                            isSelected ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'hover:bg-[var(--surface-container-low)] text-[var(--on-surface)]'
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors mr-3 ${
                            isSelected ? 'bg-[var(--on-primary)]/20' : 'bg-[var(--surface-container-low)]'
                          }`}>
                            <action.icon className={`h-5 w-5 ${isSelected ? 'text-[var(--on-primary)]' : 'text-[var(--outline-variant)]'}`} />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-medium font-inter truncate">
                              {action.title}
                            </span>
                            {action.subtitle && (
                              <span className={`text-xs truncate ${isSelected ? 'text-[var(--on-primary)]/80' : 'text-[var(--outline-variant)]'}`}>
                                {action.subtitle}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-[var(--outline-variant)]">
                  No results found for &quot;{query}&quot;
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-[var(--surface-container-low)] border-t border-[var(--outline-variant)]/20 flex justify-between items-center text-[var(--outline-variant)] text-xs font-inter shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--surface-container-highest)] px-1 rounded border border-[var(--outline-variant)]/20">↑↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-[var(--surface-container-highest)] px-1 rounded border border-[var(--outline-variant)]/20">↵</kbd>
                  to select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="bg-[var(--surface-container-highest)] px-1 rounded border border-[var(--outline-variant)]/20">esc</kbd>
                to close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
