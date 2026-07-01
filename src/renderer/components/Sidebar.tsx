import { Dispatch, SetStateAction } from 'react'
import { sections, sectionLabels } from '../utils/constants'

type SidebarProps = {
  active: 'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'TRACKER' | 'NOTES' | 'SETTINGS'
  onChange: Dispatch<SetStateAction<'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'TRACKER' | 'NOTES' | 'SETTINGS'>>
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  currentUserEmail: string
  onLogout: () => void
  isOpen: boolean
  onToggle: () => void
}

function Sidebar({ active, onChange, theme, onThemeToggle, currentUserEmail, onLogout, isOpen, onToggle }: SidebarProps) {
  const getIndicatorColor = (key: string) => {
    switch (key) {
      case 'VARC':
        return 'bg-[#3B82F6]'
      case 'LRDI':
        return 'bg-[#8B5CF6]'
      case 'QUANTS':
        return 'bg-[#10B981]'
      case 'ANALYTICS':
        return 'bg-[#EC4899]'
      case 'TRACKER':
        return 'bg-[#38BDF8]'
      case 'NOTES':
        return 'bg-[#14B8A6]'
      case 'SETTINGS':
        return 'bg-[#F59E0B]'
      default:
        return 'bg-slate-400'
    }
  }

  return (
    <aside className={`border-r border-appBorder bg-appBg-secondary p-4 flex flex-col justify-between transition-all duration-300 ${
      isOpen ? 'w-60 opacity-100' : 'w-0 p-0 opacity-0 border-r-0 pointer-events-none overflow-hidden'
    }`}>
      <div className="text-appText-primary">
        <div className="flex items-center justify-between mb-4 pl-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#38BDF8]">
            Prep Sections
          </h2>
          <button
            type="button"
            onClick={onToggle}
            className="text-appText-muted hover:text-appText-primary transition-colors p-1 cursor-pointer flex items-center justify-center rounded-lg hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40"
            title="Collapse Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        <div className="space-y-1.5">
          {sections.map((key) => {
            const isActive = active === key
            return (
              <button
                key={key}
                className={`relative w-full rounded-xl pl-7 pr-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white border border-[#c5c1b8] text-slate-800 shadow-sm dark:bg-[#273449] dark:border-slate-800 dark:text-slate-100 font-bold'
                    : 'bg-transparent border border-transparent text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
                }`}
                onClick={() => onChange(key)}
              >
                {isActive && (
                  <span
                    className={`absolute left-3 top-3.5 w-1 h-3 rounded-full ${getIndicatorColor(key)}`}
                  />
                )}
                {sectionLabels[key]}
              </button>
            )
          })}
          <button
            className={`relative w-full rounded-xl pl-7 pr-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
              active === 'ANALYTICS'
                ? 'bg-white border border-[#c5c1b8] text-slate-800 shadow-sm dark:bg-[#273449] dark:border-slate-800 dark:text-slate-100 font-bold'
                : 'bg-transparent border border-transparent text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
            }`}
            onClick={() => onChange('ANALYTICS')}
          >
            {active === 'ANALYTICS' && (
              <span
                className={`absolute left-3 top-3.5 w-1 h-3 rounded-full ${getIndicatorColor('ANALYTICS')}`}
              />
            )}
            Analytics
          </button>
          <button
            className={`relative w-full rounded-xl pl-7 pr-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
              active === 'TRACKER'
                ? 'bg-white border border-[#c5c1b8] text-slate-800 shadow-sm dark:bg-[#273449] dark:border-slate-800 dark:text-slate-100 font-bold'
                : 'bg-transparent border border-transparent text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
            }`}
            onClick={() => onChange('TRACKER')}
          >
            {active === 'TRACKER' && (
              <span
                className={`absolute left-3 top-3.5 w-1 h-3 rounded-full ${getIndicatorColor('TRACKER')}`}
              />
            )}
            Study Tracker
          </button>
          <button
            className={`relative w-full rounded-xl pl-7 pr-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
              active === 'NOTES'
                ? 'bg-white border border-[#c5c1b8] text-slate-800 shadow-sm dark:bg-[#273449] dark:border-slate-800 dark:text-slate-100 font-bold'
                : 'bg-transparent border border-transparent text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
            }`}
            onClick={() => onChange('NOTES')}
          >
            {active === 'NOTES' && (
              <span
                className={`absolute left-3 top-3.5 w-1 h-3 rounded-full ${getIndicatorColor('NOTES')}`}
              />
            )}
            My Notes
          </button>
          {/* Settings */}
          <button
            className={`relative w-full rounded-xl pl-7 pr-3.5 py-2.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
              active === 'SETTINGS'
                ? 'bg-white border border-[#c5c1b8] text-slate-800 shadow-sm dark:bg-[#273449] dark:border-slate-800 dark:text-slate-100 font-bold'
                : 'bg-transparent border border-transparent text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
            }`}
            onClick={() => onChange('SETTINGS')}
          >
            {active === 'SETTINGS' && (
              <span
                className={`absolute left-3 top-3.5 w-1 h-3 rounded-full ${getIndicatorColor('SETTINGS')}`}
              />
            )}
            Settings
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-appBorder flex flex-col gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-appBg-primary/40 border border-appBorder/50 dark:border-transparent">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3B82F6] text-[11px] font-bold text-white uppercase shadow-sm">
            {currentUserEmail.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-appText-muted leading-none font-bold uppercase tracking-wider">Account</p>
            <p className="text-xs font-semibold text-appText-primary truncate leading-tight mt-0.5" title={currentUserEmail}>
              {currentUserEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onThemeToggle}
          className="w-full rounded-full px-4 py-2 text-center text-xs font-bold bg-[#eae7e1] border border-[#d5d1c8] text-[#1a1a1a] hover:bg-[#dfdbd3] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-full px-4 py-2 text-center text-xs font-bold bg-red-500/10 border border-red-500/25 text-red-650 hover:bg-red-500/20 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/20 transition-all duration-200 cursor-pointer"
        >
          🚪 Sign Out
        </button>

        <div className="text-[10px] text-appText-disabled pl-2 font-mono">
          v0.1.0
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
