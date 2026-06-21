import { Dispatch, SetStateAction, useState, useEffect, useRef } from 'react'
import { SectionFilter, SECTION_FLAIRS, QUANTS_TOPIC_MAP, LRDI_TOPIC_MAP, VARC_TOPIC_MAP } from '../utils/constants'

type SearchFilterBarProps = {
  filter: SectionFilter
  section: 'VARC' | 'LRDI' | 'QUANTS'
  selectedFlairs: string[]
  selectedSubtopicFilter: string | null
  selectedTopicFilter: string | null
  onFilterChange: Dispatch<SetStateAction<SectionFilter>>
  onSelectedFlairsChange: Dispatch<SetStateAction<string[]>>
  onSelectedTopicFilterChange: (subtopic: string | null, topic: string | null) => void
}

const activeFlairStyles = {
  VARC: 'bg-[#3B82F6]/[0.1] border-[#3B82F6]/40 text-[#2563EB] dark:text-[#60A5FA]',
  LRDI: 'bg-[#8B5CF6]/[0.1] border-[#8B5CF6]/40 text-[#7C3AED] dark:text-[#A78BFA]',
  QUANTS: 'bg-[#10B981]/[0.1] border-[#10B981]/40 text-[#059669] dark:text-[#34D399]'
}

function SearchFilterBar({
  filter,
  section,
  selectedFlairs,
  selectedSubtopicFilter,
  selectedTopicFilter,
  onFilterChange,
  onSelectedFlairsChange,
  onSelectedTopicFilterChange
}: SearchFilterBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [activeSubtopicFilter, setActiveSubtopicFilter] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const flairsList = SECTION_FLAIRS[section] || []

  const topicMap =
    section === 'VARC'
      ? VARC_TOPIC_MAP
      : section === 'LRDI'
      ? LRDI_TOPIC_MAP
      : QUANTS_TOPIC_MAP

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown if filter is changed away from FLAIR or TOPIC
  useEffect(() => {
    if (filter !== 'FLAIR' && filter !== 'TOPIC') {
      setIsDropdownOpen(false)
    }
  }, [filter])

  useEffect(() => {
    if (isDropdownOpen && filter === 'TOPIC') {
      setActiveSubtopicFilter(selectedSubtopicFilter)
    }
  }, [isDropdownOpen, filter, selectedSubtopicFilter])

  const handleToggleFlair = (flair: string) => {
    onSelectedFlairsChange((prev) =>
      prev.includes(flair) ? prev.filter((f) => f !== flair) : [...prev, flair]
    )
  }

  const handleClearFlairs = () => {
    onSelectedFlairsChange([])
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div className="flex gap-1 rounded-xl border border-appBorder bg-appBg-secondary p-1">
        {(['ALL', 'SOLVED', 'UNSOLVED', 'BOOKMARKED', 'FLAIR', 'TOPIC'] as SectionFilter[]).map((item) => {
          const isActive = filter === item
          const isFlairWithActive = item === 'FLAIR' && selectedFlairs.length > 0
          const isTopicWithActive = item === 'TOPIC' && (selectedSubtopicFilter || selectedTopicFilter)
          
          let tabLabel = item
          if (item === 'FLAIR' && selectedFlairs.length > 0) {
            tabLabel = `FLAIR (${selectedFlairs.length})`
          } else if (item === 'TOPIC') {
            if (selectedTopicFilter) {
              tabLabel = `${selectedSubtopicFilter} › ${selectedTopicFilter}`
            } else if (selectedSubtopicFilter) {
              tabLabel = `${selectedSubtopicFilter} (ALL)`
            }
          }
          
          return (
            <button
              key={item}
              className={`rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white border border-[#c5c1b8] text-[#1a1a1a] shadow-sm dark:bg-slate-800 dark:border-slate-700/40 dark:text-slate-100'
                  : isFlairWithActive || isTopicWithActive
                  ? 'text-sky-500 hover:text-sky-600 hover:bg-white/40 dark:hover:bg-slate-850/50'
                  : 'text-appText-disabled hover:text-appText-primary hover:bg-white/40 dark:hover:bg-slate-850/50'
              }`}
              onClick={() => {
                if (item === 'FLAIR' || item === 'TOPIC') {
                  onFilterChange(item)
                  setIsDropdownOpen((prev) => !prev)
                } else {
                  onFilterChange(item)
                  setIsDropdownOpen(false)
                }
              }}
            >
              {tabLabel}
            </button>
          )
        })}
      </div>

      {/* Absolute Dropdown Popover */}
      {isDropdownOpen && filter === 'FLAIR' && (
        <div className="absolute left-full top-0 ml-2 z-50 w-72 rounded-2xl border border-appBorder bg-cardBg-default p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-appBorder/60 pb-2">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider">
              Filter by Flairs
            </span>
            <div className="flex items-center gap-2">
              {selectedFlairs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearFlairs}
                  className="text-[9px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer transition"
                >
                  Clear ({selectedFlairs.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="text-[10px] text-appText-muted hover:text-appText-primary font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {flairsList.map((flair) => {
              const isSelected = selectedFlairs.includes(flair)
              return (
                <button
                  key={flair}
                  type="button"
                  onClick={() => handleToggleFlair(flair)}
                  className={`rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide transition cursor-pointer border ${
                    isSelected
                      ? activeFlairStyles[section]
                      : 'bg-appBg-secondary/50 border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                  }`}
                >
                  {flair}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Absolute Topic Dropdown Popover */}
      {isDropdownOpen && filter === 'TOPIC' && (
        <div className="absolute left-full top-0 ml-2 z-50 w-72 rounded-2xl border border-appBorder bg-cardBg-default p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-appBorder/60 pb-2">
            <div className="flex items-center gap-1.5">
              {activeSubtopicFilter && (
                <button
                  type="button"
                  onClick={() => setActiveSubtopicFilter(null)}
                  className="text-xs text-appText-muted hover:text-appText-primary font-bold cursor-pointer pr-1"
                  title="Back to subtopics"
                >
                  ←
                </button>
              )}
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider">
                {activeSubtopicFilter ? `${activeSubtopicFilter} Topics` : 'Filter by Topic'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(selectedSubtopicFilter || selectedTopicFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectedTopicFilterChange(null, null)
                    setIsDropdownOpen(false)
                    setActiveSubtopicFilter(null)
                  }}
                  className="text-[9px] font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer transition"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false)
                  setActiveSubtopicFilter(null)
                }}
                className="text-[10px] text-appText-muted hover:text-appText-primary font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {!activeSubtopicFilter && (
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(topicMap).map((sub) => {
                const isSelected = selectedSubtopicFilter === sub
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setActiveSubtopicFilter(sub)}
                    className={`rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide transition cursor-pointer border ${
                      isSelected
                        ? activeFlairStyles[section]
                        : 'bg-appBg-secondary/50 border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                    }`}
                  >
                    {sub}
                  </button>
                )
              })}
            </div>
          )}

          {activeSubtopicFilter && (
            <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  onSelectedTopicFilterChange(activeSubtopicFilter, null)
                  setIsDropdownOpen(false)
                  setActiveSubtopicFilter(null)
                }}
                className={`rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide transition cursor-pointer border ${
                  selectedSubtopicFilter === activeSubtopicFilter && !selectedTopicFilter
                    ? activeFlairStyles[section]
                    : 'bg-appBg-secondary/50 border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                }`}
              >
                All {activeSubtopicFilter}
              </button>

              {(topicMap[activeSubtopicFilter as keyof typeof topicMap] || []).map((t) => {
                const isSelected = selectedSubtopicFilter === activeSubtopicFilter && selectedTopicFilter === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onSelectedTopicFilterChange(activeSubtopicFilter, t)
                      setIsDropdownOpen(false)
                      setActiveSubtopicFilter(null)
                    }}
                    className={`rounded-full px-2.5 py-1 text-[9px] font-semibold tracking-wide transition cursor-pointer border ${
                      isSelected
                        ? activeFlairStyles[section]
                        : 'bg-appBg-secondary/50 border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilterBar

