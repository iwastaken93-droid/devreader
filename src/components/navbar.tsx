"use client"

import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Moon, Sun, BookOpen, LogOut } from "lucide-react"

export default function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  return (
    <nav className="border-b border-[var(--surface-container-high)] bg-[var(--surface)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-[var(--primary)] font-bold text-xl font-spaceGrotesk">
              <BookOpen className="h-6 w-6" />
              <span>DevReader</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] transition-colors"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {session ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/library"
                  className="text-sm font-medium text-[var(--on-surface)] hover:text-[var(--primary)] transition-colors font-inter"
                >
                  Library
                </Link>
                <div className="flex items-center space-x-2">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-8 w-8 rounded-full border border-[var(--outline-variant)]"
                    />
                  )}
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-[var(--on-surface-variant)] hover:text-[var(--error)] transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="flex items-center space-x-2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dim)] text-[var(--on-primary)] px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                <span>Sign in with GitHub</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
