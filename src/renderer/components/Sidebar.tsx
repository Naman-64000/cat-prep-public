import { Dispatch, SetStateAction } from 'react'
import { sections, sectionLabels } from '../utils/constants'

type SidebarProps = {
  active: 'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'TRACKER'
  onChange: Dispatch<SetStateAction<'VARC' | 'LRDI' | 'QUANTS' | 'ANALYTICS' | 'TRACKER'>>
  theme: 'light' | 'dark'
  onThemeToggle: () => void
}

function Sidebar({ active, onChange, theme, onThemeToggle }: SidebarProps) {
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
      default:
        return 'bg-slate-400'
    }
  }

  return (
    <aside className="w-60 border-r border-appBorder bg-appBg-secondary p-4 flex flex-col justify-between transition-colors duration-250">
      <div className="text-appText-primary">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#38BDF8] pl-2">
          Prep Sections
        </h2>
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
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-appBorder flex flex-col gap-3">
        <button
          type="button"
          onClick={onThemeToggle}
          className="w-full rounded-full px-4 py-2 text-center text-xs font-bold bg-[#eae7e1] border border-[#d5d1c8] text-[#1a1a1a] hover:bg-[#dfdbd3] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
        <div className="text-[10px] text-appText-disabled pl-2 font-mono">
          v0.1.0 • Adult Target
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
