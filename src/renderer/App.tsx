import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import SectionPage from './components/SectionPage'
import StudyTracker from './components/StudyTracker'
import Analytics from './components/Analytics'
import AuthPage from './components/AuthPage'
import Settings from './components/Settings'

function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState<'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'TRACKER' | 'SETTINGS'>('VARC')
  const [apiError, setApiError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (!window.electron) {
      setApiError('Electron API not available. The app must run inside Electron.')
      setLoadingSession(false)
      return
    }

    const checkSession = async () => {
      try {
        const response = await window.electron.invoke('auth:currentUser') as {
          success: boolean
          user?: { id: string; email: string } | null
          error?: string
        }
        if (response.success && response.user) {
          setCurrentUser(response.user)
          // Don't redirect on session restore — keep them where they were
        }
      } catch (err) {
        console.error('Session check failed:', err)
      } finally {
        setLoadingSession(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const content = useMemo(() => {
    if (activePage === 'SETTINGS') {
      return <Settings currentUserEmail={currentUser?.email || ''} />
    }
    if (activePage === 'TRACKER') {
      return <StudyTracker currentUserEmail={currentUser?.email || ''} />
    }
    if (activePage === 'ANALYTICS') {
      return <Analytics currentUserEmail={currentUser?.email || ''} />
    }
    if (activePage === 'VARC' || activePage === 'LRDI' || activePage === 'QUANTS') {
      return <SectionPage section={activePage} />
    }
    return <SectionPage section="VARC" />
  }, [activePage, currentUser])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleLogout = async () => {
    try {
      const response = await window.electron.invoke('auth:signout') as { success: boolean }
      if (response.success) {
        setCurrentUser(null)
      }
    } catch (err) {
      console.error('Failed to log out:', err)
    }
  }

  if (loadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-appBg-primary text-appText-primary">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#3B82F6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-xs font-semibold tracking-wider text-appText-secondary">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-appBg-primary text-appText-primary flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <strong className="text-red-400">Error:</strong> {apiError}
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-appBg-primary text-appText-primary transition-colors duration-200">
        <AuthPage
          onAuthSuccess={(user) => {
            setCurrentUser(user)
            setActivePage('SETTINGS') // Always land on Settings after login/signup
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-appBg-primary text-appText-primary font-sans transition-colors duration-200">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          active={activePage}
          onChange={setActivePage}
          theme={theme}
          onThemeToggle={toggleTheme}
          currentUserEmail={currentUser.email}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <header className="mb-4 flex items-center justify-between border-b border-appBorder pb-3">
              <div className="flex items-center gap-3.5">
                {!isSidebarOpen && (
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="rounded-xl border border-appBorder bg-cardBg-default p-2 text-appText-muted hover:text-appText-primary transition-all duration-200 shadow-sm cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                    title="Expand Sidebar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#3B82F6] dark:text-[#60A5FA] font-bold">
                    CAT Prep Vault
                  </p>
                  <h1 className="mt-0.5 text-base font-semibold text-appText-primary">
                    Exam Practice & AI Solutions
                  </h1>
                </div>
              </div>
              <p className="hidden sm:block text-[11px] text-appText-muted font-medium">
                Private archive & revision tracker
              </p>
            </header>

            {content}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
