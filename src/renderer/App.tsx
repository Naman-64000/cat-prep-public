import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import SectionPage from './components/SectionPage'
import StudyTracker from './components/StudyTracker'
import Analytics from './components/Analytics'
import CollegeTracker from './components/CollegeTracker'

function App() {
  const [activePage, setActivePage] = useState<'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'FMS_SIMULATOR' | 'TRACKER'>('VARC')
  const [apiError, setApiError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (!window.electron) {
      setApiError('Electron API not available. The app must run inside Electron.')
    }
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
    if (activePage === 'TRACKER') {
      return <StudyTracker />
    }
    if (activePage === 'ANALYTICS') {
      return <Analytics />
    }
    if (activePage === 'FMS_SIMULATOR') {
      return <CollegeTracker />
    }
    return <SectionPage section={activePage} />
  }, [activePage])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-appBg-primary text-appText-primary font-sans transition-colors duration-200">
      <div className="flex h-screen overflow-hidden">
        <Sidebar active={activePage} onChange={setActivePage} theme={theme} onThemeToggle={toggleTheme} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <header className="mb-4 flex items-center justify-between border-b border-appBorder pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#3B82F6] dark:text-[#60A5FA] font-bold">
                  CAT Prep Vault
                </p>
                <h1 className="mt-0.5 text-base font-semibold text-appText-primary">
                  Exam Practice & AI Solutions
                </h1>
              </div>
              <p className="hidden sm:block text-[11px] text-appText-muted font-medium">
                Private archive & revision tracker
              </p>
            </header>

            {apiError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-250 text-red-200">
                <strong>Error:</strong> {apiError}
              </div>
            ) : (
              content
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
