import { useEffect, useState, useMemo } from 'react'

type StudyRecord = {
  id: number
  date: string
  hours: number
  minutes: number
  section: string
  tag: string
  note: string
}

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = []
  const current = new Date(startStr)
  const end = new Date(endStr)
  
  current.setHours(12, 0, 0, 0)
  end.setHours(12, 0, 0, 0)
  
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

interface NumberInputProps {
  value: number | ''
  disabled?: boolean
  onChange: (val: number | '') => void
  className?: string
}

function NumberInput({ value, disabled, onChange, className }: NumberInputProps) {
  const handleFocus = () => {
    if (value === 0) {
      onChange('')
    }
  }

  const handleBlur = () => {
    if (value === '') {
      onChange(0)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      disabled={disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9]/g, '')
        if (val === '') {
          onChange('')
        } else {
          const parsed = parseInt(val, 10)
          if (!isNaN(parsed)) {
            onChange(parsed)
          }
        }
      }}
      className={className}
    />
  )
}

function StudyTracker({ currentUserEmail }: { currentUserEmail: string }) {
  const [hours, setHours] = useState<number | ''>(0)
  const [minutes, setMinutes] = useState<number | ''>(0)
  


  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })

  const [section, setSection] = useState('')
  const [tag, setTag] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [records, setRecords] = useState<StudyRecord[]>([])
  const [showRecords, setShowRecords] = useState(false)

  // Custom tags editing state
  const [customTags, setCustomTags] = useState<Record<string, string[]>>({
    VARC: ['sectional mock'],
    DILR: ['sectional mock'],
    QUANTS: ['sectional mock'],
    ALL: ['mock']
  })
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (!currentUserEmail) return
    const saved = localStorage.getItem(`customTags_${currentUserEmail}`)
    if (saved) {
      try {
        setCustomTags(JSON.parse(saved))
      } catch (err) {
        // fallback
      }
    } else {
      setCustomTags({
        VARC: ['sectional mock'],
        DILR: ['sectional mock'],
        QUANTS: ['sectional mock'],
        ALL: ['mock']
      })
    }
  }, [currentUserEmail])

  const [showKey, setShowKey] = useState(false)
  const [filterSection, setFilterSection] = useState('')
  const [filterTag, setFilterTag] = useState('')

  const filterTagsList = useMemo(() => {
    const allTags = new Set<string>()

    if (filterSection) {
      const secKey = filterSection === 'DILR' ? 'DILR' : filterSection
      const cTags = customTags[secKey] || []
      cTags.forEach((t) => allTags.add(t))

      records.forEach((r) => {
        if (r.section === filterSection && r.tag) {
          allTags.add(r.tag)
        }
      })
    } else {
      Object.values(customTags).flat().forEach((t) => allTags.add(t))
      records.forEach((r) => {
        if (r.tag) {
          allTags.add(r.tag)
        }
      })
    }

    return Array.from(allTags).sort()
  }, [filterSection, customTags, records])

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterSection && r.section !== filterSection) return false
      if (filterTag && r.tag !== filterTag) return false
      return true
    })
  }, [records, filterSection, filterTag])

  const totalStudyTime = useMemo(() => {
    const totalMinutes = filteredRecords.reduce((acc, r) => acc + (r.hours * 60) + r.minutes, 0)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return { hours, mins }
  }, [filteredRecords])

  const handleAddTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    const secKey = section === 'DILR' ? 'DILR' : section
    if (!secKey) return
    
    const existing = customTags[secKey] || []
    if (existing.includes(trimmed)) {
      setMessage('Tag already exists.')
      return
    }
    
    const updated = {
      ...customTags,
      [secKey]: [...existing, trimmed]
    }
    setCustomTags(updated)
    if (currentUserEmail) {
      localStorage.setItem(`customTags_${currentUserEmail}`, JSON.stringify(updated))
    }
    setTag(trimmed)
    setNewTag('')
  }

  const handleDeleteTag = (tagToDelete: string) => {
    const secKey = section === 'DILR' ? 'DILR' : section
    if (!secKey || !tagToDelete) return
    
    const existing = customTags[secKey] || []
    const updatedTags = existing.filter(t => t !== tagToDelete)
    
    const updated = {
      ...customTags,
      [secKey]: updatedTags
    }
    setCustomTags(updated)
    if (currentUserEmail) {
      localStorage.setItem(`customTags_${currentUserEmail}`, JSON.stringify(updated))
    }
    setTag('')
  }

  const availableTags = useMemo(() => {
    if (!section) return []
    const secKey = section === 'DILR' ? 'DILR' : section
    return customTags[secKey] || []
  }, [section, customTags])
  // Report Date Filter States
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().slice(0, 10)
  })

  // Fetch records list
  const fetchRecords = async () => {
    const result: any = await window.electron.invoke('study:list')
    if (result.success) {
      setRecords(result.records)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [message])

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
    return utcDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function formatDateLabel(dateString: string) {
    const date = new Date(dateString)
    const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
    return utcDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle Start Date change with automatic end date shift
  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    const start = new Date(val)
    const todayStr = new Date().toISOString().slice(0, 10)
    const today = new Date(todayStr)
    
    // Automatically set end date to start date + 6 days (total 7 days)
    const targetEnd = new Date(start)
    targetEnd.setDate(targetEnd.getDate() + 6)
    
    if (targetEnd > today) {
      setEndDate(todayStr)
    } else {
      setEndDate(targetEnd.toISOString().slice(0, 10))
    }
  }

  // End date max limit calculation (max 7 days from start date)
  const maxEndDate = useMemo(() => {
    const start = new Date(startDate)
    const todayStr = new Date().toISOString().slice(0, 10)
    const today = new Date(todayStr)
    
    const limit = new Date(start)
    limit.setDate(limit.getDate() + 6)
    
    if (limit > today) {
      return todayStr
    }
    return limit.toISOString().slice(0, 10)
  }, [startDate])

  // Validation for date range gap
  const dateGapError = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const utc1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
    const utc2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
    const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return 'Start date must be before or equal to end date.'
    }
    if (diffDays > 6) {
      return 'Date range gap cannot exceed 7 days.'
    }
    return null
  }, [startDate, endDate])

  // Get date range list
  const chartDates = useMemo(() => {
    if (dateGapError) return []
    return getDatesInRange(startDate, endDate)
  }, [startDate, endDate, dateGapError])

  // Map dates to hours using normalized comparison
  const chartData = useMemo(() => {
    return chartDates.map(dateStr => {
      const dayRecords = records.filter(r => {
        const rDateStr = new Date(r.date).toISOString().slice(0, 10)
        return rDateStr === dateStr
      })
      const totalHours = dayRecords.reduce((sum, r) => sum + r.hours + r.minutes / 60, 0)
      return {
        date: dateStr,
        hours: totalHours
      }
    })
  }, [chartDates, records])

  // Calculate dynamic axis max limit
  const maxHours = useMemo(() => {
    if (chartData.length === 0) return 0
    return Math.max(...chartData.map(d => d.hours))
  }, [chartData])

  const xAxisMax = useMemo(() => {
    return Math.ceil(maxHours) + 1
  }, [maxHours])

  // Calculate dynamic ticks
  const ticks = useMemo(() => {
    const list = []
    const step = xAxisMax <= 10 ? 1 : xAxisMax <= 20 ? 2 : 3
    for (let i = 0; i <= xAxisMax; i += step) {
      list.push(i)
    }
    if (list[list.length - 1] !== xAxisMax) {
      list.push(xAxisMax)
    }
    return list
  }, [xAxisMax])
  async function handleSave() {
    if (!section) {
      setMessage('Please select a study section.')
      return
    }
    if (!tag) {
      setMessage('Please select a topic tag.')
      return
    }
    const hrs = hours === '' ? 0 : hours
    const mins = minutes === '' ? 0 : minutes

    if (hrs < 0 || mins < 0 || mins > 59) {
      setMessage('Please enter a valid study duration. Minutes must be 0-59.')
      return
    }
    if (hrs === 0 && mins === 0) {
      setMessage('Study duration cannot be 0 hours and 0 minutes.')
      return
    }
    if (hrs > 24 || (hrs === 24 && mins > 0)) {
      setMessage('Study time cannot exceed 24 hours for a single day.')
      return
    }

    const response: any = await window.electron.invoke('study:save', {
      date: selectedDate,
      hours: hrs,
      minutes: mins,
      section,
      tag,
      note
    })

    if (response.success) {
      setMessage('Saved study session successfully.')
      setHours(0)
      setMinutes(0)
      setSection('')
      setTag('')
      setNote('')
      fetchRecords()
    } else {
      setMessage(`Error: ${response.error}`)
    }
  }

  async function handleDeleteRecord(id: number) {
    if (!window.confirm('Delete this study log permanently?')) {
      return
    }
    const response: any = await window.electron.invoke('study:delete', id)
    if (response.success) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
      setMessage('Study record deleted.')
    } else {
      setMessage(`Delete failed: ${response.error}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Save Session Form */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Study Tracker</h2>
        <p className="mt-1 text-[10px] text-appText-muted">Log your CAT study duration for any date.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 w-36">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          <label className="space-y-1 w-20">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Hours</span>
            <NumberInput
              value={hours}
              onChange={setHours}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          <label className="space-y-1 w-20">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Minutes</span>
            <NumberInput
              value={minutes}
              onChange={setMinutes}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Section</span>
            <div className="flex gap-1 bg-appBg-secondary border border-appBorder rounded-xl p-0.5 select-none h-[34px] items-center">
              {(['VARC', 'DILR', 'QUANTS', 'ALL'] as const).map((sec) => {
                const isActive = section === sec
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setSection(sec)
                      setTag('')
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer select-none ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-indigo-650 dark:text-white shadow-sm'
                        : 'text-appText-muted hover:text-appText-primary'
                    }`}
                  >
                    {sec}
                  </button>
                )
              })}
            </div>
          </label>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <div className="text-[10px] text-appText-muted font-bold uppercase tracking-wider flex items-center gap-2 select-none">
              <span>Topic Tag</span>
              {tag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTag(tag)
                  }}
                  className="text-[9px] text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-rose-500/10 transition"
                  title="Delete this tag"
                >
                  Delete tag
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 py-1 items-center min-h-[34px]">
              {!section ? (
                <span className="text-[10px] text-appText-disabled italic select-none">Select a section to see tags...</span>
              ) : availableTags.length === 0 ? (
                <span className="text-[10px] text-appText-disabled italic select-none">No tags. Create one on the right!</span>
              ) : (
                availableTags.map((t) => {
                  const isSelected = tag === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-sky-500 border-sky-500 text-white font-extrabold shadow-sm'
                          : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:text-appText-primary'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {section && (
            <label className="space-y-1 w-44">
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Add custom tag</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="New tag..."
                  className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 transition"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 active:scale-95 transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </label>
          )}
          <label className="space-y-1 flex-1 min-w-[240px]">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you did in one sentence. Ex - mock 12, arithmetic."
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          <div>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 px-5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer"
            >
              Save Session
            </button>
          </div>
        </div>
        {message && (
          <p className={`mt-3 text-[10px] font-bold ${
            message.toLowerCase().includes('please') ||
            message.toLowerCase().includes('invalid') ||
            message.toLowerCase().includes('cannot') ||
            message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('failed')
              ? 'text-rose-500 dark:text-rose-455 dark:text-rose-400'
              : 'text-appText-secondary'
          }`}>
            {message}
          </p>
        )}
      </section>

      {/* Report Graph Panel */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Study Hours Report</h3>
        <p className="mt-0.5 text-[10px] text-appText-muted">Analyze your study durations (last 7 days by default, up to 7 days gap max).</p>

        {/* Date filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="space-y-1 w-36">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Start Date</span>
            <input
              type="date"
              value={startDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          <label className="space-y-1 w-36">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">End Date</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={maxEndDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150"
            />
          </label>
          {dateGapError && (
            <span className="text-[10px] text-rose-500 font-semibold mt-4">
              ⚠️ {dateGapError}
            </span>
          )}
        </div>

        {/* Vertical Bar Chart */}
        {!dateGapError && chartData.length > 0 ? (
          <div className="mt-6 pt-4 border-t border-appBorder">
            {/* Chart Container (Y-axis + Plot area) */}
            <div className="flex gap-4 mt-2">
              {/* Y-axis Labels (Vertical line of ticks) */}
              <div className="w-12 h-[180px] flex flex-col justify-between text-right text-[10px] text-appText-muted font-mono font-bold pt-2 pb-0 shrink-0">
                {ticks.slice().reverse().map((tick) => (
                  <span key={tick}>{tick}h</span>
                ))}
              </div>

              {/* Plot Area */}
              <div className="flex-1 relative">
                {/* Horizontal Background Grid Lines */}
                <div className="absolute inset-0 h-[180px] flex flex-col justify-between pointer-events-none pt-2 pb-0">
                  {ticks.slice().reverse().map((tick) => (
                    <div
                      key={tick}
                      className="w-full border-t border-appBorder/15 dark:border-appBorder/10 border-dashed"
                      style={{
                        height: '0px',
                        visibility: tick === 0 ? 'hidden' : 'visible'
                      }}
                    />
                  ))}
                </div>

                {/* Bars Area */}
                <div className="flex items-end justify-around border-b border-l border-appBorder bg-[#38BDF8]/[0.02] dark:bg-[#38BDF8]/[0.04] px-6 pt-2 pb-0 h-[180px] relative">
                  {chartData.map((item) => {
                    const heightPct = xAxisMax > 0 ? (item.hours / xAxisMax) * 100 : 0
                    return (
                      <div key={item.date} className="flex flex-col items-center group/bar w-16 h-full justify-end relative">
                        {/* Bar Value Tooltip */}
                        {item.hours > 0 && (
                          <span
                            className="opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded absolute z-30 whitespace-nowrap shadow"
                            style={{ bottom: `${heightPct}%`, marginBottom: '10px' }}
                          >
                            {item.hours.toFixed(1)}h
                          </span>
                        )}
                        
                        {/* Vertical Bar */}
                        {item.hours > 0 ? (
                          <div
                            className="bg-sky-400 hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 w-full rounded-t-md transition-all duration-500 ease-out shadow-sm"
                            style={{ height: `${heightPct}%` }}
                          />
                        ) : (
                          // No graph, no outline, no background for 0h days
                          <div className="w-full h-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* X-Axis labels */}
            <div className="flex gap-4 mt-2">
              {/* Y-axis offset placeholder */}
              <div className="w-12 shrink-0" />

              {/* Labels Area matching plot area padding & layout */}
              <div className="flex-1 flex justify-around px-6">
                {chartData.map((item) => (
                  <div
                    key={item.date}
                    className="w-16 text-center text-[10px] text-appText-secondary font-bold uppercase tracking-wider font-sans whitespace-nowrap"
                  >
                    {formatDateLabel(item.date)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          !dateGapError && (
            <div className="mt-4 rounded-xl border border-dashed border-appBorder bg-appBg-secondary/50 p-6 text-center text-xs text-appText-muted italic">
              No days in current range.
            </div>
          )
        )}
      </section>

      {/* Study Records List */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Study Records</h3>
            <p className="mt-0.5 text-[10px] text-appText-muted">View logged study history.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRecords((value) => !value)}
            className="rounded-full border border-appBorder bg-appBg-secondary text-appText-primary hover:bg-cardBg-hover transition-colors px-4 py-1.5 text-[10px] font-semibold cursor-pointer"
          >
            {showRecords ? 'Hide Records' : 'View Records'}
          </button>
        </div>

        {showRecords && (
          <div className="mt-3 space-y-4">
            {/* Filters Area */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-appBorder bg-appBg-secondary/35 text-[10px] font-bold">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-appText-muted uppercase tracking-wider">Filter Section:</span>
                  <div className="flex flex-wrap gap-1 select-none">
                    {[
                      { value: '', label: 'Show All' },
                      { value: 'VARC', label: 'VARC' },
                      { value: 'DILR', label: 'DILR' },
                      { value: 'QUANTS', label: 'QUANTS' },
                      { value: 'ALL', label: 'ALL (General)' }
                    ].map((opt) => {
                      const isActive = filterSection === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFilterSection(opt.value)
                            setFilterTag('')
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border transition cursor-pointer select-none ${
                            isActive
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                              : 'bg-appBg-secondary border-appBorder text-appText-muted hover:text-appText-primary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-appText-muted uppercase tracking-wider">Filter Tag:</span>
                  <div className="flex flex-wrap gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setFilterTag('')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border transition cursor-pointer select-none ${
                        filterTag === ''
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                          : 'bg-appBg-secondary border-appBorder text-appText-muted hover:text-appText-primary'
                      }`}
                    >
                      All Tags
                    </button>
                    {filterTagsList.map((t) => {
                      const isActive = filterTag === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFilterTag(t)}
                          className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase transition cursor-pointer select-none ${
                            isActive
                              ? 'bg-sky-500 border-sky-500 text-white font-extrabold shadow-sm'
                              : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:text-appText-primary'
                          }`}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto shrink-0 bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 px-3 py-1 rounded-full border border-sky-500/20">
                <span className="uppercase tracking-wider text-[9px] opacity-80">Total:</span>
                <span className="font-extrabold text-[11px]">{totalStudyTime.hours}h {totalStudyTime.mins}m</span>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="rounded-xl border border-appBorder bg-appBg-secondary p-3 text-[10px] text-appText-muted italic text-center">
                {records.length === 0 ? 'No study records yet.' : 'No study records match the selected filters.'}
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl border border-appBorder bg-appBg-secondary p-3 flex items-center justify-between transition-all duration-200 hover:border-sky-500/30 dark:hover:border-sky-500/20"
                >
                  <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mr-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-appText-secondary font-mono">{formatDate(record.date)}</span>
                      <span className="rounded-full bg-sky-500/[0.08] border border-sky-500/20 text-sky-600 dark:text-sky-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-sans">
                        {record.section || 'ALL'}
                      </span>
                      {record.tag && (
                        <span className="rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider font-sans ml-1">
                          {record.tag}
                        </span>
                      )}
                      <span className="font-semibold text-xs text-appText-primary ml-2">{record.hours}h {record.minutes}m</span>
                    </div>
                    {record.note && (
                      <p className="text-[11px] text-appText-muted italic font-sans md:text-right flex-1 break-words max-w-[500px]">
                        "{record.note}"
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(record.id)}
                    className="text-[10px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-350 font-bold px-2 py-0.5 cursor-pointer rounded-full hover:bg-rose-500/10 transition-colors shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default StudyTracker
