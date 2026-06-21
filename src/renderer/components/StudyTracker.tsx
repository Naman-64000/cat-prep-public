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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      !/[0-9]/.test(e.key) &&
      e.key !== 'Backspace' &&
      e.key !== 'Delete' &&
      e.key !== 'Tab' &&
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'Home' &&
      e.key !== 'End' &&
      !e.metaKey &&
      !e.ctrlKey
    ) {
      e.preventDefault()
    }
  }

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
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => {
        const val = e.target.value
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

function StudyTracker() {
  const [hours, setHours] = useState<number | ''>(0)
  const [minutes, setMinutes] = useState<number | ''>(0)
  
  // Gemini key configuration states
  const [geminiKeyInput, setGeminiKeyInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<{ success?: boolean; message?: string } | null>(null)
  const [isHoveredInfo, setIsHoveredInfo] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })

  const [section, setSection] = useState('')
  const [tag, setTag] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [records, setRecords] = useState<StudyRecord[]>([])
  const [showRecords, setShowRecords] = useState(false)

  const availableTags = useMemo(() => {
    if (section === 'VARC') {
      return ['motivational video', 'sectional mock', 'varc1000', 'the hindu', 'aeon', 'work power easy', 'RC practice']
    }
    if (section === 'DILR') {
      return ['sectional mock', 'Anastasis Academy', 'Aptitude jab']
    }
    if (section === 'QUANTS') {
      return ['Rodha youtube', 'sectional mock']
    }
    if (section === 'ALL') {
      return ['mock', 'mock analysis']
    }

    return []
  }, [section])
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
    window.electron.invoke('settings:get').then((res: any) => {
      if (res && res.success && res.settings?.geminiApiKey) {
        setGeminiKeyInput(res.settings.geminiApiKey)
      }
    })
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
        const rDateStr = r.date instanceof Date 
          ? r.date.toISOString().slice(0, 10) 
          : new Date(r.date).toISOString().slice(0, 10)
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
  const handleSaveKey = async () => {
    if (!geminiKeyInput.trim()) {
      setIsVerifying(true)
      setVerifyStatus(null)
      try {
        const saveRes: any = await window.electron.invoke('settings:save', '')
        if (saveRes.success) {
          setVerifyStatus({ success: true, message: 'API key cleared. System will use environment key if set.' })
        } else {
          setVerifyStatus({ success: false, message: `Failed to clear key: ${saveRes.error}` })
        }
      } catch (err: any) {
        setVerifyStatus({ success: false, message: err.message })
      } finally {
        setIsVerifying(false)
      }
      return
    }

    setIsVerifying(true)
    setVerifyStatus(null)

    try {
      const verifyRes: any = await window.electron.invoke('settings:verifyKey', geminiKeyInput.trim())
      if (verifyRes.success) {
        const saveRes: any = await window.electron.invoke('settings:save', geminiKeyInput.trim())
        if (saveRes.success) {
          setVerifyStatus({ success: true, message: 'Key verified and saved successfully!' })
        } else {
          setVerifyStatus({ success: false, message: `Verified, but failed to save: ${saveRes.error}` })
        }
      } else {
        setVerifyStatus({ success: false, message: `Verification failed: ${verifyRes.error || 'Invalid API Key'}` })
      }
    } catch (err: any) {
      setVerifyStatus({ success: false, message: `Error: ${err.message}` })
    } finally {
      setIsVerifying(false)
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
          <label className="space-y-1 w-32">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Section</span>
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value)
                setTag('')
              }}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 cursor-pointer"
            >
              <option value="">Select...</option>
              <option value="VARC">VARC</option>
              <option value="DILR">DILR</option>
              <option value="QUANTS">QUANTS</option>
              <option value="ALL">ALL</option>
            </select>
          </label>
          <label className="space-y-1 w-44">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Topic Tag</span>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              disabled={!section}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select tag...</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
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
        {message && <p className="mt-3 text-[10px] text-appText-secondary font-medium">{message}</p>}
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
          <div className="mt-3 space-y-2">
            {records.length === 0 ? (
              <div className="rounded-xl border border-appBorder bg-appBg-secondary p-3 text-[10px] text-appText-muted italic text-center">
                No study records yet.
              </div>
            ) : (
              [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
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

      {/* Gemini API Key Configuration Card */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200 mt-6 relative">
        <div className="flex items-center justify-between border-b border-appBorder pb-2.5 mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary flex items-center gap-1.5">
              <span>Gemini API Integration</span>
              <div 
                className="relative inline-block cursor-help group"
                onMouseEnter={() => setIsHoveredInfo(true)}
                onMouseLeave={() => setIsHoveredInfo(false)}
              >
                <svg className="w-3.5 h-3.5 text-appText-muted hover:text-sky-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                
                {isHoveredInfo && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-72 p-4 bg-appBg-primary border border-appBorder rounded-xl shadow-xl z-20 text-[10px] text-appText-secondary space-y-2 pointer-events-auto normal-case font-normal">
                    <p className="font-bold text-appText-primary">How to get your Gemini API Key:</p>
                    <ol className="list-decimal list-inside space-y-1 text-appText-muted">
                      <li>Go to Google AI Studio.</li>
                      <li>Sign in with your Google account.</li>
                      <li>Click the "Create API Key" button.</li>
                      <li>Choose a Google Cloud Project to generate the key.</li>
                      <li>Copy the key and paste it here!</li>
                    </ol>
                    <div className="pt-1.5 border-t border-appBorder">
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sky-550 text-sky-500 hover:underline font-bold flex items-center gap-0.5"
                      >
                        <span>Go to Google AI Studio</span>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </h2>
            <p className="text-[10px] text-appText-muted mt-0.5">
              Configure your private Gemini API key. Custom key takes precedence over the default fallback.
            </p>
          </div>
          <span className="text-[9px] font-mono text-indigo-500 bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20 rounded uppercase font-bold tracking-wider">
            Custom Key Setup
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="password"
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="Enter your Gemini Public API Key (e.g. AIzaSy...)"
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3.5 py-2 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 font-mono"
            />
          </div>
          
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={isVerifying}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isVerifying 
                ? 'bg-appBg-secondary text-appText-disabled cursor-not-allowed border border-appBorder' 
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-indigo-600/10'
            }`}
          >
            {isVerifying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-appText-disabled/30 border-t-appText-disabled rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Save Key</span>
            )}
          </button>
        </div>

        {verifyStatus && (
          <div className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 animate-fadeIn ${
            verifyStatus.success 
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-450' 
              : 'border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-450'
          }`}>
            {verifyStatus.success ? (
              <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="font-semibold">{verifyStatus.message}</div>
          </div>
        )}
      </section>
    </div>
  )
}

export default StudyTracker
