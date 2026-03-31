"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Command, Moon, Sun, BookOpen, Library, LogOut, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const toggle = useCallback(() => setIsOpen(open => !open), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggle()
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  const actions = [
    { id: 'home', title: 'Go to Home', icon: BookOpen, action: () => router.push('/') },
    { id: 'library', title: 'Go to Library', icon: Library, action: () => router.push('/library') },
    { id: 'theme-dark', title: 'Switch to Dark Mode', icon: Moon, action: () => setTheme('dark') },
    { id: 'theme-light', title: 'Switch to Light Mode', icon: Sun, action: () => setTheme('light') },
    { id: 'logout', title: 'Sign Out', icon: LogOut, action: () => signOut() },
  ]

  const filteredActions = query === "" 
    ? actions 
    : actions.filter(action => action.title.toLowerCase().includes(query.toLowerCase()))

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
            className="relative w-full max-w-xl bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-[var(--outline-variant)]/20">
              <Search className="h-5 w-5 text-[var(--outline-variant)] mr-3" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[var(--on-surface)] placeholder:text-[var(--outline-variant)] font-inter text-lg"
              />
              <div className="flex items-center gap-1 bg-[var(--surface-container-low)] px-1.5 py-0.5 rounded border border-[var(--outline-variant)]/20 text-[var(--outline-variant)] text-xs font-medium">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredActions.length > 0 ? (
                filteredActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action()
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center px-3 py-3 rounded-xl hover:bg-[var(--primary)] group transition-all text-left"
                  >
                    <div className="p-2 bg-[var(--surface-container-low)] rounded-lg group-hover:bg-[var(--on-primary)]/20 transition-colors mr-3">
                      <action.icon className="h-5 w-5 text-[var(--outline-variant)] group-hover:text-[var(--on-primary)]" />
                    </div>
                    <span className="font-medium text-[var(--on-surface)] group-hover:text-[var(--on-primary)] font-inter">
                      {action.title}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-10 text-center text-[var(--outline-variant)]">
                  No commands found for "{query}"
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-[var(--surface-container-low)] border-t border-[var(--outline-variant)]/20 flex justify-between items-center text-[var(--outline-variant)] text-xs font-inter">
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
