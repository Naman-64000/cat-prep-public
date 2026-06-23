import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { QUANTS_TOPIC_MAP, LRDI_TOPIC_MAP, VARC_TOPIC_MAP } from '../utils/constants'

type AnalyticsData = {
  questions: {
    total: number
    varc: number
    lrdi: number
    quants: number
    distribution: Record<string, Record<string, Record<string, number>>>
  }
  topFlairs: Array<{ name: string; count: number }>
  studyHours: {
    all: number
    varc: number
    lrdi: number
    quants: number
  }
}

const subtopicsMap: Record<'QUANTS' | 'LRDI' | 'VARC', string[]> = {
  QUANTS: Object.keys(QUANTS_TOPIC_MAP),
  LRDI: Object.keys(LRDI_TOPIC_MAP),
  VARC: Object.keys(VARC_TOPIC_MAP)
}

interface ReportRow {
  topic: string
  subtopic: string
  total: number
  attempted: number
  correct: number
  incorrect: number
  notAnswered: number
  titaIncorrect?: number
  isTotal?: boolean
}

const varcReportData: ReportRow[] = [
  { topic: 'Reading Comprehension', subtopic: 'Science and Technology', total: 8, attempted: 6, correct: 4, incorrect: 2, notAnswered: 2 },
  { topic: '', subtopic: 'Culture / Arts and Museum', total: 4, attempted: 4, correct: 4, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Philosophy', total: 4, attempted: 0, correct: 0, incorrect: 0, notAnswered: 4 },
  { topic: 'Verbal Ability', subtopic: 'Odd One Out', total: 2, attempted: 2, correct: 0, incorrect: 2, notAnswered: 0 },
  { topic: '', subtopic: 'Para Summary', total: 2, attempted: 2, correct: 1, incorrect: 1, notAnswered: 0 },
  { topic: '', subtopic: 'Para Jumbles', total: 2, attempted: 1, correct: 1, incorrect: 0, notAnswered: 1 },
  { topic: '', subtopic: 'Para Completion', total: 2, attempted: 0, correct: 0, incorrect: 0, notAnswered: 2 },
  { topic: 'General', subtopic: 'Not Sure', total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
]

const dilrReportData: ReportRow[] = [
  { topic: 'Logical Reasoning', subtopic: 'Puzzles', total: 9, attempted: 9, correct: 8, incorrect: 1, notAnswered: 0 },
  { topic: '', subtopic: 'Quant based LR', total: 5, attempted: 2, correct: 1, incorrect: 1, notAnswered: 3 },
  { topic: 'Data Interpretation', subtopic: 'Charts', total: 4, attempted: 4, correct: 4, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Graphs', total: 4, attempted: 0, correct: 0, incorrect: 0, notAnswered: 4 },
  { topic: 'General', subtopic: 'Not Sure', total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
]

const qaReportData: ReportRow[] = [
  { topic: 'Algebra', subtopic: 'Linear & Quadratic Eq / Ineq', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Linear & Quadratic Equations', total: 2, attempted: 0, correct: 0, incorrect: 0, notAnswered: 2 },
  { topic: '', subtopic: 'Inequalities', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Functions & Graphs', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Logarithms', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Surds & Indices / Lin & Quad Eq', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: 'Arithmetic', subtopic: 'Averages', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'SI and CI', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Ratios & Proportions', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Ratios / Percentages', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Profit & Loss', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Time & Work', total: 1, attempted: 1, correct: 1, incorrect: 0, notAnswered: 0 },
  { topic: '', subtopic: 'Time, Speed & Distance', total: 1, attempted: 1, correct: 0, incorrect: 1, notAnswered: 0 },
  { topic: '', subtopic: 'Mixtures and Alligations', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: 'Geometry', subtopic: 'Triangles', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: '', subtopic: 'Circles', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: '', subtopic: 'Polygons / Quadrilaterals', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: 'Number System', subtopic: 'Properties of Numbers', total: 2, attempted: 2, correct: 1, incorrect: 1, notAnswered: 0 },
  { topic: '', subtopic: 'Properties of Numbers / Factors', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: 'Modern Maths', subtopic: 'Series and Progressions', total: 1, attempted: 0, correct: 0, incorrect: 0, notAnswered: 1 },
  { topic: 'General', subtopic: 'Not Sure', total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
]

interface ReportEntry {
  id: string
  name: string
  paperType: 'full' | 'sectional'
  sectionalType?: 'varc' | 'dilr' | 'quants'
  varcTotalQs: number
  dilrTotalQs: number
  qaTotalQs: number
  varcRows: ReportRow[]
  dilrRows: ReportRow[]
  qaRows: ReportRow[]
  totalAttempted?: number
  totalCorrect?: number
  totalIncorrect?: number
  marks?: number
}

interface ReportStats {
  totalQs: number
  attemptedQs: number
  correctQs: number
  incorrectQs: number
  notAnsweredQs: number
  accuracy: string
  attemptRate: string
  marksScored: number
  totalMarks: number
}

function calculateReportStats(report: ReportEntry, activeTab: 'ALL' | 'VARC' | 'DILR' | 'QA'): ReportStats {
  let varcRows: ReportRow[] = []
  let dilrRows: ReportRow[] = []
  let qaRows: ReportRow[] = []

  if (activeTab === 'ALL') {
    if (report.paperType === 'full') {
      varcRows = report.varcRows || []
      dilrRows = report.dilrRows || []
      qaRows = report.qaRows || []
    } else {
      if (report.sectionalType === 'varc') varcRows = report.varcRows || []
      else if (report.sectionalType === 'dilr') dilrRows = report.dilrRows || []
      else if (report.sectionalType === 'quants') qaRows = report.qaRows || []
    }
  } else if (activeTab === 'VARC') {
    varcRows = report.varcRows || []
  } else if (activeTab === 'DILR') {
    dilrRows = report.dilrRows || []
  } else if (activeTab === 'QA') {
    qaRows = report.qaRows || []
  }

  const combined = [...varcRows, ...dilrRows, ...qaRows]
  const totalQs = combined.reduce((sum, r) => sum + r.total, 0)
  const attemptedQs = combined.reduce((sum, r) => sum + r.attempted, 0)
  const correctQs = combined.reduce((sum, r) => sum + r.correct, 0)
  const incorrectQs = combined.reduce((sum, r) => sum + r.incorrect, 0)
  const notAnsweredQs = combined.reduce((sum, r) => sum + r.notAnswered, 0)

  const varcTitaIncorrect = varcRows.reduce((sum, r) => {
    if (r.subtopic === 'Odd One Out' || r.subtopic === 'Para Jumbles') {
      return sum + r.incorrect
    }
    if (r.subtopic === 'Not Sure') {
      return sum + (r.titaIncorrect || 0)
    }
    return sum
  }, 0)

  const dilrTitaIncorrect = dilrRows.reduce((sum, r) => sum + (r.titaIncorrect || 0), 0)
  const qaTitaIncorrect = qaRows.reduce((sum, r) => sum + (r.titaIncorrect || 0), 0)

  const titaIncorrectQs = varcTitaIncorrect + dilrTitaIncorrect + qaTitaIncorrect

  const accuracy = attemptedQs > 0 ? ((correctQs / attemptedQs) * 100).toFixed(1) : '0'
  const attemptRate = totalQs > 0 ? ((attemptedQs / totalQs) * 100).toFixed(1) : '0'

  // Score formula is +3 for Correct and -1 for Incorrect, except TITA incorrect which gets 0
  const marksScored = correctQs * 3 - (incorrectQs - titaIncorrectQs) * 1
  const totalMarks = totalQs * 3

  return {
    totalQs,
    attemptedQs,
    correctQs,
    incorrectQs,
    notAnsweredQs,
    accuracy,
    attemptRate,
    marksScored,
    totalMarks
  }
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

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getLocalDateString(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PROGRESS_BAR_COLORS = [
  '#8B0000', // 0-5% Dark Red
  '#FF0000', // 5-10% Red
  '#FF3F00', // 10-15% Red-Orange
  '#FF7F00', // 15-20% Dark Orange
  '#FFA500', // 20-25% Lighter Orange
  '#FFC000', // 25-30% Yellow-Orange
  '#FFD700', // 30-35% Gold
  '#FFE600', // 35-40% Bright Gold
  '#FFFF00', // 40-45% Yellow
  '#DFFF00', // 45-50% Lime Yellow
  '#ADFF2F', // 50-55% Green Yellow
  '#9ACD32', // 55-60% Yellow Green
  '#7FFF00', // 60-65% Chartreuse
  '#32CD32', // 65-70% Lime Green
  '#228B22', // 70-75% Forest Green
  '#008000', // 75-80% Green
  '#00A300', // 80-85% Bright Green
  '#00C800', // 85-90% Medium Green
  '#00E100', // 90-95% Lighter Green
  '#10B981'  // 95-100% Emerald Green
]

interface AnalyticsProps {
  currentUserEmail?: string
}

function Analytics({ currentUserEmail = '' }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storageKey = currentUserEmail ? `countdownStartDate_${currentUserEmail}` : 'countdownStartDate'

  const [startDateStr, setStartDateStr] = useState(() => {
    const saved = localStorage.getItem(storageKey) || '2026-06-22'
    const todayStr = getLocalDateString(new Date())
    if (saved > todayStr) {
      return todayStr
    }
    return saved
  })

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) || '2026-06-22'
    const todayStr = getLocalDateString(new Date())
    if (saved > todayStr) {
      setStartDateStr(todayStr)
    } else {
      setStartDateStr(saved)
    }
  }, [storageKey])
  const [isEditingStartDate, setIsEditingStartDate] = useState(false)

  // Target Hours states
  const targetStorageKey = currentUserEmail ? `studyTargetHours_${currentUserEmail}` : 'studyTargetHours'
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [studyTarget, setStudyTarget] = useState<number>(() => {
    const saved = localStorage.getItem(targetStorageKey)
    return saved ? Number(saved) : 0
  })

  useEffect(() => {
    const saved = localStorage.getItem(targetStorageKey)
    setStudyTarget(saved ? Number(saved) : 0)
  }, [targetStorageKey])

  const handleSaveTarget = () => {
    setIsEditingTarget(false)
    let val = targetInput.trim() === '' ? 0 : Number(targetInput)
    if (isNaN(val)) {
      val = studyTarget
    } else {
      val = Math.max(0, Math.min(1000, Math.round(val)))
    }
    setStudyTarget(val)
    localStorage.setItem(targetStorageKey, val.toString())
  }

  // Target Marks states
  const varcTargetKey = currentUserEmail ? `targetMarks_varc_${currentUserEmail}` : 'targetMarks_varc'
  const dilrTargetKey = currentUserEmail ? `targetMarks_dilr_${currentUserEmail}` : 'targetMarks_dilr'
  const qaTargetKey = currentUserEmail ? `targetMarks_qa_${currentUserEmail}` : 'targetMarks_qa'

  const [targetVarc, setTargetVarc] = useState<number>(() => {
    const saved = localStorage.getItem(varcTargetKey)
    return saved ? Number(saved) : 0
  })
  const [targetDilr, setTargetDilr] = useState<number>(() => {
    const saved = localStorage.getItem(dilrTargetKey)
    return saved ? Number(saved) : 0
  })
  const [targetQa, setTargetQa] = useState<number>(() => {
    const saved = localStorage.getItem(qaTargetKey)
    return saved ? Number(saved) : 0
  })

  useEffect(() => {
    setTargetVarc(Number(localStorage.getItem(varcTargetKey)) || 0)
    setTargetDilr(Number(localStorage.getItem(dilrTargetKey)) || 0)
    setTargetQa(Number(localStorage.getItem(qaTargetKey)) || 0)
  }, [varcTargetKey, dilrTargetKey, qaTargetKey])

  const [editingMarksSec, setEditingMarksSec] = useState<'varc' | 'dilr' | 'qa' | null>(null)
  const [marksInput, setMarksInput] = useState('')

  const handleSaveMarksTarget = (sec: 'varc' | 'dilr' | 'qa') => {
    setEditingMarksSec(null)
    let val = marksInput.trim() === '' ? 0 : Number(marksInput)
    if (isNaN(val)) return

    val = Math.max(0, Math.min(200, Math.round(val)))
    if (sec === 'varc') {
      setTargetVarc(val)
      localStorage.setItem(varcTargetKey, val.toString())
    } else if (sec === 'dilr') {
      setTargetDilr(val)
      localStorage.setItem(dilrTargetKey, val.toString())
    } else if (sec === 'qa') {
      setTargetQa(val)
      localStorage.setItem(qaTargetKey, val.toString())
    }
  }

  const [selectedSection, setSelectedSection] = useState<'MAIN' | 'VARC' | 'LRDI' | 'QUANTS'>('MAIN')
  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null)

  // Report Card states
  const [reports, setReports] = useState<ReportEntry[]>([])
  const [studyRecords, setStudyRecords] = useState<any[]>([])

  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({})
  
  const [reportTabs, setReportTabs] = useState<Record<string, 'ALL' | 'VARC' | 'DILR' | 'QA'>>({})

  const [reportFilter, setReportFilter] = useState<'ALL' | 'VARC' | 'DILR' | 'QUANTS' | 'FULL_MOCK'>('ALL')

  const [showSectionAnalysis, setShowSectionAnalysis] = useState(false)

  useEffect(() => {
    setShowSectionAnalysis(false)
  }, [reportFilter])

  // Modal forms states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newMockName, setNewMockName] = useState('')
  const [newPaperType, setNewPaperType] = useState<'full' | 'sectional'>('full')
  const [newSectionalType, setNewSectionalType] = useState<'varc' | 'dilr' | 'quants'>('varc')
  
  const [newVarcTotalQs, setNewVarcTotalQs] = useState<number | ''>(24)
  const [newDilrTotalQs, setNewDilrTotalQs] = useState<number | ''>(22)
  const [newQaTotalQs, setNewQaTotalQs] = useState<number | ''>(22)

  const [newVarcRows, setNewVarcRows] = useState<ReportRow[]>([])
  const [newDilrRows, setNewDilrRows] = useState<ReportRow[]>([])
  const [newQaRows, setNewQaRows] = useState<ReportRow[]>([])

  const [varcInputStyle, setVarcInputStyle] = useState<'detailed' | 'notsure'>('detailed')
  const [dilrInputStyle, setDilrInputStyle] = useState<'detailed' | 'notsure'>('detailed')
  const [qaInputStyle, setQaInputStyle] = useState<'detailed' | 'notsure'>('detailed')

  useEffect(() => {
    async function fetchAnalyticsAndReports() {
      try {
        const response: any = await window.electron.invoke('app:getAnalytics')
        if (response.success) {
          setData(response.data)
        } else {
          setError(response.error)
        }

        // Load reports from SQLite database
        const repResponse: any = await window.electron.invoke('report:list')
        if (repResponse.success) {
          let list = repResponse.reports || []
          
          // Check if any default seeded reports exist and delete them
          const defaultIds = ['cat_2025_slot2', 'aimcat-2520']
          const defaultReportsInDb = list.filter((r: ReportEntry) => defaultIds.includes(r.id))
          if (defaultReportsInDb.length > 0) {
            for (const r of defaultReportsInDb) {
              await window.electron.invoke('report:delete', r.id)
            }
            // Fetch the updated list
            const updatedResponse: any = await window.electron.invoke('report:list')
            if (updatedResponse.success) {
              list = updatedResponse.reports || []
            }
          }
          
          setReports(list)
          
          const newExpanded: Record<string, boolean> = {}
          const newTabs: Record<string, 'ALL' | 'VARC' | 'DILR' | 'QA'> = {}
          list.forEach((r: ReportEntry) => {
            newExpanded[r.id] = false
            newTabs[r.id] = r.paperType === 'sectional'
              ? (r.sectionalType === 'quants' ? 'QA' : (r.sectionalType === 'varc' ? 'VARC' : 'DILR'))
              : 'ALL'
          })
          setExpandedReports(newExpanded)
          setReportTabs(newTabs)
        }
        // Load study logs
        const studyResponse: any = await window.electron.invoke('study:list')
        if (studyResponse.success) {
          setStudyRecords(studyResponse.records || [])
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalyticsAndReports()
  }, [])

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (reportFilter === 'ALL') return true
      // Full mocks only appear under ALL and FULL_MOCK — not under sectional filters
      if (reportFilter === 'FULL_MOCK') return r.paperType === 'full'
      // Sectional filters: only show matching sectional mocks (full mocks excluded)
      if (r.paperType === 'full') return false
      if (r.paperType === 'sectional') {
        const matchKey = reportFilter === 'QUANTS' ? 'quants' : reportFilter.toLowerCase()
        return r.sectionalType === matchKey
      }
      return false
    })
  }, [reports, reportFilter])

  const sectionAggregateStats = useMemo(() => {
    if (reportFilter === 'ALL' || filteredReports.length === 0) return null

    let totalQs = 0
    let attemptedQs = 0
    let correctQs = 0
    let incorrectQs = 0
    let notAnsweredQs = 0
    let totalMarksScored = 0
    let totalMaxMarks = 0

    filteredReports.forEach((report) => {
      const tab: 'ALL' | 'VARC' | 'DILR' | 'QA' =
        reportFilter === 'FULL_MOCK'
          ? 'ALL'
          : reportFilter === 'QUANTS'
          ? 'QA'
          : (reportFilter as 'VARC' | 'DILR')

      const stats = calculateReportStats(report, tab)
      totalQs += stats.totalQs
      attemptedQs += stats.attemptedQs
      correctQs += stats.correctQs
      incorrectQs += stats.incorrectQs
      notAnsweredQs += stats.notAnsweredQs
      totalMarksScored += stats.marksScored
      totalMaxMarks += stats.totalMarks
    })

    const avgMarksScored = totalMarksScored / filteredReports.length
    const avgTotalMarks = totalMaxMarks / filteredReports.length

    const avgAccuracy = attemptedQs > 0 ? ((correctQs / attemptedQs) * 100).toFixed(1) : '0'
    const avgAttemptRate = totalQs > 0 ? ((attemptedQs / totalQs) * 100).toFixed(1) : '0'

    return {
      avgMarksScored,
      avgTotalMarks,
      avgAccuracy,
      avgAttemptRate,
      totalCorrect: correctQs,
      totalIncorrect: incorrectQs,
      totalNotAnswered: notAnsweredQs,
    }
  }, [filteredReports, reportFilter])

  const mockChartData = useMemo(() => {
    return reports.map(r => {
      const stats = calculateReportStats(r, 'ALL')
      const percent = stats.totalMarks > 0 ? (stats.marksScored / stats.totalMarks) * 100 : 0
      return {
        id: r.id,
        name: r.name,
        score: stats.marksScored,
        maxScore: stats.totalMarks,
        percentage: percent
      }
    })
  }, [reports])

  // Input styles handlers
  const handleVarcInputStyleChange = (style: 'detailed' | 'notsure') => {
    setVarcInputStyle(style)
    const varcVal = newVarcTotalQs === '' ? 0 : newVarcTotalQs
    if (style === 'notsure') {
      setNewVarcRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: varcVal, attempted: 0, correct: 0, incorrect: 0, notAnswered: varcVal }
        }
        return { ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
      }))
    }
  }

  const handleDilrInputStyleChange = (style: 'detailed' | 'notsure') => {
    setDilrInputStyle(style)
    const dilrVal = newDilrTotalQs === '' ? 0 : newDilrTotalQs
    if (style === 'notsure') {
      setNewDilrRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: dilrVal, attempted: 0, correct: 0, incorrect: 0, notAnswered: dilrVal }
        }
        return { ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
      }))
    }
  }

  const handleQaInputStyleChange = (style: 'detailed' | 'notsure') => {
    setQaInputStyle(style)
    const qaVal = newQaTotalQs === '' ? 0 : newQaTotalQs
    if (style === 'notsure') {
      setNewQaRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: qaVal, attempted: 0, correct: 0, incorrect: 0, notAnswered: qaVal }
        }
        return { ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0 }
      }))
    }
  }

  // Total questions change handlers
  const handleVarcTotalChange = (val: number | "") => {
    setNewVarcTotalQs(val)
    const num = val === '' ? 0 : val
    if (varcInputStyle === 'notsure') {
      setNewVarcRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: num, notAnswered: num - r.attempted }
        }
        return r
      }))
    }
  }

  const handleDilrTotalChange = (val: number | "") => {
    setNewDilrTotalQs(val)
    const num = val === '' ? 0 : val
    if (dilrInputStyle === 'notsure') {
      setNewDilrRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: num, notAnswered: num - r.attempted }
        }
        return r
      }))
    }
  }

  const handleQaTotalChange = (val: number | "") => {
    setNewQaTotalQs(val)
    const num = val === '' ? 0 : val
    if (qaInputStyle === 'notsure') {
      setNewQaRows(prev => prev.map(r => {
        if (r.subtopic === 'Not Sure') {
          return { ...r, total: num, notAnswered: num - r.attempted }
        }
        return r
      }))
    }
  }

  const handlePaperTypeChange = (type: 'full' | 'sectional') => {
    setNewPaperType(type)
    if (type === 'sectional') {
      setNewSectionalType('varc')
    }
  }

  const handleSectionalTypeChange = (sec: 'varc' | 'dilr' | 'quants') => {
    setNewSectionalType(sec)
  }

  // Section level errors
  const varcVal = newVarcTotalQs === '' ? 0 : newVarcTotalQs
  const dilrVal = newDilrTotalQs === '' ? 0 : newDilrTotalQs
  const qaVal = newQaTotalQs === '' ? 0 : newQaTotalQs

  const varcTotalError = (newPaperType === 'full' || newSectionalType === 'varc')
    ? (varcVal < 20 || varcVal > 35 ? 'VARC questions must be between 20 and 35.' : '')
    : ''

  const dilrTotalError = (newPaperType === 'full' || newSectionalType === 'dilr')
    ? (dilrVal !== 20 && dilrVal !== 22 ? 'DILR questions must be 20 or 22.' : '')
    : ''

  const qaTotalError = (newPaperType === 'full' || newSectionalType === 'quants')
    ? (qaVal !== 22 ? 'Quants questions must be exactly 22.' : '')
    : ''

  const isFormValid = () => {
    if (!newMockName.trim()) return false
    if (varcTotalError || dilrTotalError || qaTotalError) return false

    // Check VARC section
    if (newPaperType === 'full' || newSectionalType === 'varc') {
      const sum = newVarcRows.reduce((s, r) => s + r.total, 0)
      if (sum !== varcVal) return false

      const hasRowError = newVarcRows.some(
        r => r.attempted > r.total || r.correct > r.attempted || r.total < 0 || r.attempted < 0 || r.correct < 0
      )
      if (hasRowError) return false
    }

    // Check DILR section
    if (newPaperType === 'full' || newSectionalType === 'dilr') {
      const sum = newDilrRows.reduce((s, r) => s + r.total, 0)
      if (sum !== dilrVal) return false

      const hasRowError = newDilrRows.some(
        r => r.attempted > r.total || r.correct > r.attempted || r.total < 0 || r.attempted < 0 || r.correct < 0
      )
      if (hasRowError) return false
    }

    // Check QA section
    if (newPaperType === 'full' || newSectionalType === 'quants') {
      const sum = newQaRows.reduce((s, r) => s + r.total, 0)
      if (sum !== qaVal) return false

      const hasRowError = newQaRows.some(
        r => r.attempted > r.total || r.correct > r.attempted || r.total < 0 || r.attempted < 0 || r.correct < 0
      )
      if (hasRowError) return false
    }

    return true
  }

  const openAddModal = () => {
    setNewMockName('')
    setNewPaperType('full')
    setNewSectionalType('varc')
    setNewVarcTotalQs(24)
    setNewDilrTotalQs(22)
    setNewQaTotalQs(22)
    setVarcInputStyle('detailed')
    setDilrInputStyle('detailed')
    setQaInputStyle('detailed')

    setNewVarcRows(varcReportData.map(r => ({ ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0, titaIncorrect: 0 })))
    setNewDilrRows(dilrReportData.map(r => ({ ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0, titaIncorrect: 0 })))
    setNewQaRows(qaReportData.map(r => ({ ...r, total: 0, attempted: 0, correct: 0, incorrect: 0, notAnswered: 0, titaIncorrect: 0 })))

    setIsAddModalOpen(true)
  }

  const handleSaveMock = () => {
    if (!isFormValid()) return

    const newReport: ReportEntry = {
      id: `report_${Date.now()}`,
      name: newMockName.trim(),
      paperType: newPaperType,
      sectionalType: newPaperType === 'sectional' ? newSectionalType : undefined,
      varcTotalQs: (newPaperType === 'full' || newSectionalType === 'varc') ? Number(newVarcTotalQs) || 0 : 0,
      dilrTotalQs: (newPaperType === 'full' || newSectionalType === 'dilr') ? Number(newDilrTotalQs) || 0 : 0,
      qaTotalQs: (newPaperType === 'full' || newSectionalType === 'quants') ? Number(newQaTotalQs) || 0 : 0,
      varcRows: (newPaperType === 'full' || newSectionalType === 'varc') ? newVarcRows : [],
      dilrRows: (newPaperType === 'full' || newSectionalType === 'dilr') ? newDilrRows : [],
      qaRows: (newPaperType === 'full' || newSectionalType === 'quants') ? newQaRows : []
    }

    const stats = calculateReportStats(newReport, 'ALL')
    newReport.totalAttempted = stats.attemptedQs
    newReport.totalCorrect = stats.correctQs
    newReport.totalIncorrect = stats.incorrectQs
    newReport.marks = stats.marksScored

    window.electron.invoke('report:save', newReport).then((res: any) => {
      if (res.success) {
        const updated = [...reports, newReport]
        setReports(updated)
        setExpandedReports(prev => ({ ...prev, [newReport.id]: false }))
        setReportTabs(prev => ({
          ...prev,
          [newReport.id]: newPaperType === 'sectional' ? (newSectionalType === 'quants' ? 'QA' : (newSectionalType === 'varc' ? 'VARC' : 'DILR')) : 'ALL'
        }))
        setIsAddModalOpen(false)
      } else {
        alert('Failed to save mock report card: ' + res.error)
      }
    })
  }

  const handleDeleteMock = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this report card? This action cannot be undone.')) {
      window.electron.invoke('report:delete', id).then((res: any) => {
        if (res.success) {
          const updated = reports.filter(r => r.id !== id)
          setReports(updated)
        } else {
          alert('Failed to delete mock report card: ' + res.error)
        }
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-appText-muted font-semibold tracking-wider uppercase animate-pulse">
            Calculating Prep Analytics...
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 p-6 text-center">
        <p className="text-sm font-semibold text-rose-500">Failed to load analytics: {error || 'No data'}</p>
      </div>
    )
  }

  const { questions, topFlairs, studyHours } = data
  const questionTotal = questions.total || 1 // Avoid division by zero

  const varcQuestionsPct = Math.round((questions.varc / questionTotal) * 100)
  const lrdiQuestionsPct = Math.round((questions.lrdi / questionTotal) * 100)
  const quantsQuestionsPct = Math.round((questions.quants / questionTotal) * 100)

  const totalLoggedHours = studyHours.varc + studyHours.lrdi + studyHours.quants + studyHours.all || 1
  const varcHoursPct = Math.round((studyHours.varc / totalLoggedHours) * 100)
  const lrdiHoursPct = Math.round((studyHours.lrdi / totalLoggedHours) * 100)
  const quantsHoursPct = Math.round((studyHours.quants / totalLoggedHours) * 100)
  const allHoursPct = Math.max(0, 100 - varcHoursPct - lrdiHoursPct - quantsHoursPct)

  // Countdown calculations
  const TARGET_DATE = new Date('2026-11-29T00:00:00')
  const START_DATE = new Date(startDateStr + 'T00:00:00')
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const timeDiff = TARGET_DATE.getTime() - todayMidnight.getTime()
  const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
  const totalDays = Math.max(1, Math.round((TARGET_DATE.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24)))
  const countdownPct = Math.min(1, Math.max(0, daysLeft / totalDays))
  const circumference = 326.72 // 2 * Math.PI * 52

  // Study Target Goals Calculations
  const actualStudyHours = studyHours.varc + studyHours.lrdi + studyHours.quants + studyHours.all
  const goalProgressPct = studyTarget > 0 ? Math.min(100, (actualStudyHours / studyTarget) * 100) : 0
  const progressColorIndex = Math.min(19, Math.floor(goalProgressPct / 5))
  const goalProgressColor = PROGRESS_BAR_COLORS[progressColorIndex]

  // Days Completed Calculations
  const daysCompleted = Math.max(0, totalDays - daysLeft)
  const daysPct = Math.min(100, (daysCompleted / totalDays) * 100)

  // Full Mock averages calculations
  const fullMocks = reports.filter(r => r.paperType === 'full')
  const totalFullMocks = fullMocks.length

  const avgVarcMarks = totalFullMocks > 0
    ? fullMocks.reduce((sum, r) => sum + calculateReportStats(r, 'VARC').marksScored, 0) / totalFullMocks
    : 0

  const avgDilrMarks = totalFullMocks > 0
    ? fullMocks.reduce((sum, r) => sum + calculateReportStats(r, 'DILR').marksScored, 0) / totalFullMocks
    : 0

  const avgQaMarks = totalFullMocks > 0
    ? fullMocks.reduce((sum, r) => sum + calculateReportStats(r, 'QA').marksScored, 0) / totalFullMocks
    : 0

  // 5 Days Study Consistency Calculations
  const last5DaysLogs = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (4 - i)) // chronological: index 0 is 4 days ago, index 4 is today
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const logs = studyRecords.filter(r => {
      if (!r.date) return false
      try {
        const rDateStr = new Date(r.date).toISOString().slice(0, 10)
        return rDateStr === dateStr
      } catch (e) {
        return false
      }
    })
    const totalHours = logs.reduce((sum, r) => sum + (r.hours || 0) + (r.minutes || 0) / 60, 0)
    
    // label formatting: e.g. "Jun 23"
    const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    
    return {
      dateStr,
      dayLabel,
      hours: Number(totalHours.toFixed(1)),
      hasActivity: totalHours > 0
    }
  })

  const totalLast5DaysHours = last5DaysLogs.reduce((sum, day) => sum + day.hours, 0)
  const avgLast5DaysHours = totalLast5DaysHours / 5


  // Subtopic lists getter
  const getSubtopicsForSection = (sec: 'QUANTS' | 'LRDI' | 'VARC') => {
    return [...subtopicsMap[sec], 'Unassigned']
  }

  // Topic lists getter
  const getTopicsForSubtopic = (sec: 'QUANTS' | 'LRDI' | 'VARC', sub: string) => {
    if (sub === 'Unassigned') {
      return ['Unassigned']
    }
    const map =
      sec === 'VARC'
        ? VARC_TOPIC_MAP
        : sec === 'LRDI'
        ? LRDI_TOPIC_MAP
        : QUANTS_TOPIC_MAP

    const predefined = (map as any)[sub] || []
    return [...predefined, 'Unassigned']
  }

  // Helper count methods
  const getSubtopicCount = (sec: string, sub: string) => {
    const subObj = questions.distribution[sec]?.[sub] || {}
    return Object.values(subObj).reduce((sum, count) => sum + count, 0)
  }

  const getTopicCount = (sec: string, sub: string, top: string) => {
    return questions.distribution[sec]?.[sub]?.[top] || 0
  }

  const renderReportTable = (title: string, rows: ReportRow[], sectionName: 'VARC' | 'DILR' | 'QA') => {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-appText-secondary border-l-2 border-indigo-500 pl-2">
          {title}
        </h4>
        <div className="overflow-x-auto rounded-xl border border-appBorder bg-appBg-secondary/35">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-appBorder bg-appBg-secondary/80 text-[10px] uppercase font-bold text-appText-muted select-none">
                <th className="p-3">Topic</th>
                <th className="p-3">Subtopic</th>
                <th className="p-3 text-center">Total Qs</th>
                <th className="p-3 text-center">Attempted</th>
                <th className="p-3 text-center">Correct</th>
                <th className="p-3 text-center">Incorrect</th>
                <th className="p-3 text-center">Not Answered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isTotal = row.isTotal
                const rowClass = isTotal
                  ? 'font-bold bg-appBg-secondary/70 border-t border-appBorder text-appText-primary'
                  : 'border-b border-appBorder/40 hover:bg-appBg-secondary/50 transition duration-150'
                
                let titaInc = 0
                if (sectionName === 'VARC') {
                  if (row.subtopic === 'Odd One Out' || row.subtopic === 'Para Jumbles') {
                    titaInc = row.incorrect
                  }
                } else {
                  titaInc = row.titaIncorrect || 0
                }

                return (
                  <tr key={idx} className={rowClass}>
                    <td className="p-3 font-semibold text-appText-primary">{row.topic}</td>
                    <td className="p-3 text-appText-secondary">{row.subtopic}</td>
                    <td className="p-3 text-center font-mono font-bold text-appText-primary">{row.total}</td>
                    <td className="p-3 text-center font-mono text-appText-secondary">{row.attempted}</td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {row.correct}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                      {row.incorrect}
                      {titaInc > 0 && (
                        <span className="text-[10px] text-indigo-500 font-semibold ml-1.5 whitespace-nowrap" title={`${titaInc} TITA questions were incorrect`}>
                          ({titaInc} TITA)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-appText-disabled">{row.notAnswered}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const getSectionTotalRow = (title: string, rows: ReportRow[], sectionName: 'VARC' | 'DILR' | 'QA'): ReportRow => {
    let titaInc = 0
    if (sectionName === 'VARC') {
      titaInc = rows.reduce((sum, r) => {
        if (r.subtopic === 'Odd One Out' || r.subtopic === 'Para Jumbles') {
          return sum + r.incorrect
        }
        return sum
      }, 0)
    } else {
      titaInc = rows.reduce((sum, r) => sum + (r.titaIncorrect || 0), 0)
    }

    return {
      topic: title,
      subtopic: '',
      total: rows.reduce((sum, r) => sum + r.total, 0),
      attempted: rows.reduce((sum, r) => sum + r.attempted, 0),
      correct: rows.reduce((sum, r) => sum + r.correct, 0),
      incorrect: rows.reduce((sum, r) => sum + r.incorrect, 0),
      notAnswered: rows.reduce((sum, r) => sum + r.notAnswered, 0),
      titaIncorrect: titaInc,
      isTotal: true
    }
  }

  const renderRowInputFields = (
    sectionName: string,
    rows: ReportRow[],
    setRows: React.Dispatch<React.SetStateAction<ReportRow[]>>,
    isQuickInput: boolean,
    sectionTotalQs: number
  ) => {
    const visibleRows = isQuickInput
      ? rows.filter(r => r.subtopic === 'Not Sure')
      : rows

    const currentSumTotalQs = rows.reduce((sum, r) => sum + r.total, 0)
    const hasSumError = !isQuickInput && currentSumTotalQs !== sectionTotalQs

    const handleRowChange = (idx: number, field: 'total' | 'attempted' | 'correct' | 'titaIncorrect', value: number | '') => {
      const rowToUpdate = visibleRows[idx]
      const originalIdx = rows.findIndex(r => r.topic === rowToUpdate.topic && r.subtopic === rowToUpdate.subtopic)
      
      const newRows = [...rows]
      const r = { ...newRows[originalIdx] }

      r[field] = value as any
      
      const rowTotal = (r.total as any) === '' ? 0 : r.total
      const rowAttempted = (r.attempted as any) === '' ? 0 : r.attempted
      const rowCorrect = (r.correct as any) === '' ? 0 : r.correct

      r.incorrect = rowAttempted - rowCorrect
      r.notAnswered = rowTotal - rowAttempted

      if (r.titaIncorrect !== undefined) {
        const limit = (sectionName === 'VARC' && isQuickInput)
          ? Math.min(r.incorrect, rowAttempted >= 8 ? 8 : rowAttempted)
          : r.incorrect
        r.titaIncorrect = Math.max(0, Math.min(limit, r.titaIncorrect))
      }

      newRows[originalIdx] = r
      setRows(newRows)
    }

    const isDilrOrQa = sectionName === 'DILR' || sectionName === 'QA' || sectionName === 'QUANTS' || sectionName.toLowerCase() === 'quants' || sectionName.toLowerCase() === 'dilr'
    const showTita = isDilrOrQa || (sectionName === 'VARC' && isQuickInput)

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-appBorder/50 bg-appBg-secondary/20">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-appBorder bg-appBg-secondary/50 text-[9px] uppercase font-bold text-appText-muted select-none">
                <th className="p-2 w-1/3">Subtopic</th>
                <th className="p-2 text-center w-16">Total Qs</th>
                <th className="p-2 text-center w-16">Attempted</th>
                <th className="p-2 text-center w-16">Correct</th>
                <th className="p-2 text-center w-16">Incorrect</th>
                <th className="p-2 text-center w-16">Not Answered</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => {
                const rowTotal = isQuickInput ? sectionTotalQs : row.total
                const isAttemptedInvalid = row.attempted > rowTotal || row.attempted < 0 || rowTotal < 0
                const isCorrectInvalid = row.correct > row.attempted || row.correct < 0
                const hasError = isAttemptedInvalid || isCorrectInvalid

                return (
                  <tr key={idx} className="border-b border-appBorder/30 hover:bg-appBg-secondary/20">
                    <td className="p-2 font-medium text-appText-primary">
                      <div>
                        {row.topic ? `${row.topic} - ` : ''}{row.subtopic}
                        {hasError && (
                          <span className="text-[9px] text-rose-500 block font-semibold mt-0.5">
                            {isAttemptedInvalid ? 'Attempted cannot exceed Total.' : 'Correct cannot exceed Attempted.'}
                          </span>
                        )}
                        {/* TITA input for Quants, DILR, and VARC quick input */}
                        {row.incorrect > 0 && showTita && (() => {
                          const titaLimit = (sectionName === 'VARC' && isQuickInput)
                            ? Math.min(row.incorrect, row.attempted >= 8 ? 8 : row.attempted)
                            : row.incorrect
                          return titaLimit > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 bg-appBg-secondary/30 p-1.5 rounded-lg border border-appBorder/40 select-none">
                              <span className="text-[9px] text-appText-muted uppercase tracking-wider font-bold">Mark TITA Incorrect?</span>
                              {Array.from({ length: titaLimit }).map((_, qIdx) => {
                                const isTita = qIdx < (row.titaIncorrect || 0)
                                return (
                                  <button
                                    key={qIdx}
                                    type="button"
                                    onClick={() => {
                                      const nextTitaCount = isTita 
                                        ? Math.max(0, (row.titaIncorrect || 0) - 1) 
                                        : Math.min(titaLimit, (row.titaIncorrect || 0) + 1)
                                      handleRowChange(idx, 'titaIncorrect', nextTitaCount)
                                    }}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all border cursor-pointer ${
                                      isTita 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-extrabold' 
                                        : 'bg-appBg-secondary border-appBorder text-appText-muted hover:text-appText-secondary'
                                    }`}
                                  >
                                    Q{qIdx + 1}: {isTita ? 'YES' : 'NO'}
                                  </button>
                                )
                              })}
                            </div>
                          ) : null
                        })()}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={isQuickInput ? sectionTotalQs : row.total}
                        disabled={isQuickInput}
                        onChange={(val) => handleRowChange(idx, 'total', val)}
                        className={`w-14 text-center bg-appBg-secondary border rounded p-1 font-mono text-[11px] text-appText-primary focus:outline-none focus:border-indigo-500 ${
                          isQuickInput ? 'opacity-70 bg-appBg-secondary/50 cursor-not-allowed border-appBorder' : 'border-appBorder'
                        }`}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={row.attempted}
                        onChange={(val) => handleRowChange(idx, 'attempted', val)}
                        className={`w-14 text-center bg-appBg-secondary border rounded p-1 font-mono text-[11px] text-appText-primary focus:outline-none focus:border-indigo-500 ${
                          isAttemptedInvalid ? 'border-rose-500 text-rose-500 bg-rose-500/5' : 'border-appBorder'
                        }`}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <NumberInput
                        value={row.correct}
                        onChange={(val) => handleRowChange(idx, 'correct', val)}
                        className={`w-14 text-center bg-appBg-secondary border rounded p-1 font-mono text-[11px] text-appText-primary focus:outline-none focus:border-indigo-500 ${
                          isCorrectInvalid ? 'border-rose-500 text-rose-500 bg-rose-500/5' : 'border-appBorder'
                        }`}
                      />
                    </td>
                    <td className="p-2 text-center font-mono text-rose-600 dark:text-rose-400 font-semibold select-none">
                      {Math.max(0, row.attempted - row.correct)}
                    </td>
                    <td className="p-2 text-center font-mono text-appText-disabled select-none">
                      {Math.max(0, rowTotal - row.attempted)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!isQuickInput && (
          <div className="flex items-center justify-between text-[10px] px-1 font-bold">
            <span className={hasSumError ? 'text-rose-500' : 'text-appText-muted'}>
              Allocated Questions: {currentSumTotalQs} / {sectionTotalQs}
            </span>
            {hasSumError && (
              <span className="text-rose-500 font-semibold">
                Sum of subtopic questions must equal the section total ({sectionTotalQs}).
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Accents */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-colors duration-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Preparation Summary</h2>
        <p className="mt-0.5 text-[10px] text-appText-muted">
          Aggregated insights across practice questions, study tracker logs, and flairs. Click on rows to drill down from Sections to Subtopics, and Subtopics to specific Topics.
        </p>
      </section>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Countdown Card (Fixed Height Card) */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between transition-colors duration-200 min-h-[360px] h-[360px]">
          <div className="space-y-4 flex flex-col items-center justify-center h-full">
            <div className="text-center w-full">
              <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Exam Countdown</h3>
              <p className="text-[10px] text-appText-disabled">Target Date: Nov 29, 2026</p>
            </div>

            {/* Circular Ring Container */}
            <div className="relative flex items-center justify-center my-2">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  stroke="url(#countdown-grad)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - countdownPct)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="countdown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" /> {/* Pink */}
                    <stop offset="100%" stopColor="#6366f1" /> {/* Indigo */}
                  </linearGradient>
                </defs>
              </svg>
              {/* Text in the Center */}
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-appText-primary leading-none block font-mono">
                  {daysLeft}
                </span>
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-wider block mt-0.5 animate-pulse">
                  {daysLeft === 1 ? 'Day Left' : 'Days Left'}
                </span>
              </div>
            </div>

            <div className="text-center w-full">
              <span className="text-[10px] font-bold text-appText-secondary bg-appBg-secondary px-3 py-1.5 rounded-full border border-appBorder inline-block">
                {Math.round(countdownPct * 100)}% Duration Remaining
              </span>
              <div className="mt-2 text-[10px] font-semibold text-appText-muted">
                {isEditingStartDate ? (
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <input
                      type="date"
                      value={startDateStr}
                      min="2026-01-01"
                      max={getLocalDateString(new Date()) < '2026-11-15' ? getLocalDateString(new Date()) : '2026-11-15'}
                      onChange={(e) => {
                        const val = e.target.value
                        const todayStr = getLocalDateString(new Date())
                        if (val) {
                          if (val <= todayStr) {
                            setStartDateStr(val)
                            localStorage.setItem(storageKey, val)
                          } else {
                            setStartDateStr(todayStr)
                            localStorage.setItem(storageKey, todayStr)
                          }
                        }
                      }}
                      onBlur={() => setIsEditingStartDate(false)}
                      className="bg-appBg-secondary border border-appBorder rounded px-1.5 py-0.5 text-[10px] font-mono text-appText-primary outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingStartDate(false)}
                      className="text-indigo-500 hover:text-indigo-600 font-bold px-1 py-0.5 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingStartDate(true)}
                    className="hover:text-indigo-500 transition-colors cursor-pointer border border-dashed border-appBorder rounded-lg px-2.5 py-1 bg-appBg-secondary/30 mt-1 inline-block"
                    title="Click to edit start date"
                  >
                    Start Date: <span className="font-mono text-appText-primary">{formatDate(startDateStr)}</span> (Edit)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions Breakdown (Auto Height Card) */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col transition-colors duration-200 min-h-[360px]">
          <div className="space-y-4">
            <div className="flex justify-between items-start h-12">
              {selectedSection === 'MAIN' ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Total Questions</h3>
                  <p className="text-[10px] text-appText-disabled">Cumulative uploaded vault questions</p>
                </div>
              ) : !selectedSubtopic ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedSection('MAIN')}
                    className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition flex items-center gap-1 cursor-pointer select-none"
                  >
                    ← Back to Sections
                  </button>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted mt-1">
                    {selectedSection} Subtopics
                  </h3>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubtopic(null)}
                    className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition flex items-center gap-1 cursor-pointer select-none"
                  >
                    ← Back to {selectedSection}
                  </button>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted mt-1">
                    {selectedSubtopic} Topics
                  </h3>
                </div>
              )}
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent select-none">
                {selectedSection === 'MAIN'
                  ? questions.total
                  : !selectedSubtopic
                  ? selectedSection === 'VARC'
                    ? questions.varc
                    : selectedSection === 'LRDI'
                    ? questions.lrdi
                    : questions.quants
                  : getSubtopicCount(selectedSection, selectedSubtopic)}
              </span>
            </div>

            {/* Split Progress Bar (Fixed Height) */}
            <div className="h-4 flex items-center">
              {selectedSection === 'MAIN' ? (
                <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden flex border border-appBorder">
                  {questions.varc > 0 && (
                    <div
                      className="bg-[#3B82F6] h-full transition-all duration-500"
                      style={{ width: `${varcQuestionsPct}%` }}
                      title={`VARC: ${varcQuestionsPct}%`}
                    />
                  )}
                  {questions.lrdi > 0 && (
                    <div
                      className="bg-[#8B5CF6] h-full transition-all duration-500"
                      style={{ width: `${lrdiQuestionsPct}%` }}
                      title={`LRDI: ${lrdiQuestionsPct}%`}
                    />
                  )}
                  {questions.quants > 0 && (
                    <div
                      className="bg-[#10B981] h-full transition-all duration-500"
                      style={{ width: `${quantsQuestionsPct}%` }}
                      title={`QUANTS: ${quantsQuestionsPct}%`}
                    />
                  )}
                </div>
              ) : (
                <div className="h-2 w-full rounded-full overflow-hidden flex border border-appBorder" style={{ backgroundColor: '#1e293b' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: '100%',
                      backgroundColor: selectedSection === 'VARC' ? '#3B82F6' : selectedSection === 'LRDI' ? '#8B5CF6' : '#10B981'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Counts Breakdown List (No scroller, expands vertically if needed) */}
            <div className="space-y-1.5 pt-1">
              {selectedSection === 'MAIN' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedSection('VARC')}
                    className="w-full flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                      <span className="font-semibold text-appText-secondary">VARC</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-appText-primary">
                      <span>{questions.varc}</span>
                      <span className="text-[10px] text-appText-disabled">→</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSection('LRDI')}
                    className="w-full flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                      <span className="font-semibold text-appText-secondary">LRDI</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-appText-primary">
                      <span>{questions.lrdi}</span>
                      <span className="text-[10px] text-appText-disabled">→</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSection('QUANTS')}
                    className="w-full flex items-center justify-between text-xs p-2 rounded-xl hover:bg-appBg-secondary transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span className="font-semibold text-appText-secondary">QUANTS</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-appText-primary">
                      <span>{questions.quants}</span>
                      <span className="text-[10px] text-appText-disabled">→</span>
                    </div>
                  </button>
                </>
              ) : !selectedSubtopic ? (
                // Level 2: Subtopics Breakdown
                getSubtopicsForSection(selectedSection).map((sub) => {
                  const subColor = selectedSection === 'VARC' ? 'bg-[#3B82F6]' : selectedSection === 'LRDI' ? 'bg-[#8B5CF6]' : 'bg-[#10B981]'
                  const subCount = getSubtopicCount(selectedSection, sub)
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubtopic(sub)}
                      className="w-full flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${subColor}`} />
                        <span className="font-semibold text-appText-secondary">{sub}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-appText-primary">
                        <span>{subCount}</span>
                        <span className="text-[10px] text-appText-disabled">→</span>
                      </div>
                    </button>
                  )
                })
              ) : (
                // Level 3: Topics Breakdown
                getTopicsForSubtopic(selectedSection, selectedSubtopic).map((top) => {
                  const subColor = selectedSection === 'VARC' ? 'bg-[#3B82F6]' : selectedSection === 'LRDI' ? 'bg-[#8B5CF6]' : 'bg-[#10B981]'
                  const topCount = getTopicCount(selectedSection, selectedSubtopic, top)
                  return (
                    <div
                      key={top}
                      className="flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary/40 transition text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${subColor}`} />
                        <span className="font-semibold text-appText-secondary">{top}</span>
                      </div>
                      <span className="font-bold text-appText-primary">{topCount}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Study Hours Breakdown */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between transition-colors duration-200 min-h-[360px] h-[360px]">
          <div className="space-y-4">
            <div className="flex justify-between items-start h-12">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Study Duration</h3>
                <p className="text-[10px] text-appText-disabled">Total logged study tracker hours</p>
              </div>
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent select-none">
                {(studyHours.varc + studyHours.lrdi + studyHours.quants + studyHours.all).toFixed(1)}h
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="h-4 flex items-center">
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden flex border border-appBorder">
                {studyHours.all > 0 && (
                  <div
                    className="bg-sky-400 h-full transition-all duration-500"
                    style={{ width: `${allHoursPct}%` }}
                    title={`General Logs: ${allHoursPct}%`}
                  />
                )}
                {studyHours.varc > 0 && (
                  <div
                    className="bg-[#3B82F6] h-full transition-all duration-500"
                    style={{ width: `${varcHoursPct}%` }}
                    title={`VARC: ${varcHoursPct}%`}
                  />
                )}
                {studyHours.lrdi > 0 && (
                  <div
                    className="bg-[#8B5CF6] h-full transition-all duration-500"
                    style={{ width: `${lrdiHoursPct}%` }}
                    title={`LRDI: ${lrdiHoursPct}%`}
                  />
                )}
                {studyHours.quants > 0 && (
                  <div
                    className="bg-[#10B981] h-full transition-all duration-500"
                    style={{ width: `${quantsHoursPct}%` }}
                    title={`QUANTS: ${quantsHoursPct}%`}
                  />
                )}
              </div>
            </div>

            {/* Counts Breakdown List (Height constrained to prevent resizing) */}
            <div className="h-[210px] overflow-y-auto pr-1 space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary/40 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="font-semibold text-appText-secondary">ALL General Logs</span>
                </div>
                <span className="font-bold text-appText-primary">{studyHours.all}h</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary/40 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="font-semibold text-appText-secondary">VARC Focus</span>
                </div>
                <span className="font-bold text-appText-primary">{studyHours.varc}h</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-appBorder/40 pb-2 p-2 rounded-xl hover:bg-appBg-secondary/40 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  <span className="font-semibold text-appText-secondary">LRDI Focus</span>
                </div>
                <span className="font-bold text-appText-primary">{studyHours.lrdi}h</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-appBg-secondary/40 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="font-semibold text-appText-secondary">QUANTS Focus</span>
                </div>
                <span className="font-bold text-appText-primary">{studyHours.quants}h</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Row Card 1: Goals & Progress */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-colors duration-200 min-h-[360px] h-[360px]">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Preparation Goals</h3>
              <p className="text-[10px] text-appText-disabled">Study target hours and day countdown</p>
            </div>

            {/* Study Goal Target section */}
            <div className="space-y-2 pt-1">
              {/* Heading row: label left, value/button right */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-appText-secondary uppercase tracking-wider">Study Goal Target</span>
                {isEditingTarget ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={targetInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        if (val.length <= 4) setTargetInput(val)
                      }}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTarget()
                        else if (e.key === 'Escape') setIsEditingTarget(false)
                      }}
                      onBlur={handleSaveTarget}
                      className="bg-appBg-secondary border border-appBorder rounded px-1.5 py-0.5 text-xs font-mono text-appText-primary outline-none focus:border-indigo-500 w-16 text-center"
                      autoFocus
                    />
                    <span className="text-xs text-appText-muted">hrs</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetInput(studyTarget > 0 ? studyTarget.toString() : '')
                      setIsEditingTarget(true)
                    }}
                    className="text-[10px] font-bold text-appText-primary hover:text-[#3B82F6] transition-colors cursor-pointer"
                    title="Click to edit study hours target"
                  >
                    {studyTarget > 0 ? `${studyTarget} hrs` : 'Set →'}
                  </button>
                )}
              </div>
              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden border border-appBorder">
                {studyTarget > 0 && (
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{ width: `${goalProgressPct}%`, backgroundColor: goalProgressColor }}
                  />
                )}
              </div>
              {/* Sub-stats */}
              <div className="flex justify-between text-[10px] text-appText-muted font-mono px-0.5">
                {studyTarget > 0 ? (
                  <>
                    <span>{goalProgressPct.toFixed(1)}% complete</span>
                    <span><span className="text-appText-primary font-bold">{actualStudyHours.toFixed(1)}</span> / {studyTarget} hrs</span>
                  </>
                ) : (
                  <span className="italic">No study hours target set. Click Set →</span>
                )}
              </div>
            </div>

            {/* Days Progress section */}
            <div className="space-y-2">
              {/* Heading row: label left, value right */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-appText-secondary uppercase tracking-wider">Days Progress</span>
                <span className="text-[10px] font-bold text-appText-primary font-mono">{daysCompleted} / {totalDays} days</span>
              </div>
              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden border border-appBorder">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${daysPct}%`, background: 'linear-gradient(to right, #ec4899, #6366f1)' }}
                />
              </div>
              {/* Sub-stats */}
              <div className="flex justify-between text-[10px] text-appText-muted font-mono px-0.5">
                <span>{daysPct.toFixed(1)}% complete</span>
                <span>Target: Nov 29, 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Row Card 2: Mock Target Scores */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between transition-colors duration-200 min-h-[360px] h-[360px]">
          <div className="space-y-3.5 flex-1 flex flex-col justify-between pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Mock Target Scores</h3>
              <p className="text-[10px] text-appText-disabled">Sectional score goals vs full mock average</p>
            </div>

            {/* VARC Target Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-appText-secondary uppercase tracking-wider">VARC Target Marks</span>
                {editingMarksSec === 'varc' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={marksInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        if (val.length <= 3) setMarksInput(val)
                      }}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveMarksTarget('varc')
                        else if (e.key === 'Escape') setEditingMarksSec(null)
                      }}
                      onBlur={() => handleSaveMarksTarget('varc')}
                      className="bg-appBg-secondary border border-appBorder rounded px-1 py-0.5 text-xs font-mono text-appText-primary outline-none focus:border-indigo-500 w-12 text-center"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMarksInput(targetVarc > 0 ? targetVarc.toString() : '')
                      setEditingMarksSec('varc')
                    }}
                    className="text-[10px] font-bold text-appText-primary hover:text-[#3B82F6] transition-colors cursor-pointer"
                    title="Click to edit VARC target marks"
                  >
                    {targetVarc > 0 ? `${targetVarc} marks` : 'Set →'}
                  </button>
                )}
              </div>
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden border border-appBorder">
                {targetVarc > 0 && (
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, (avgVarcMarks / targetVarc) * 100)}%`,
                      backgroundColor: '#3B82F6'
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-appText-muted font-mono px-0.5">
                <span>{targetVarc > 0 ? `${Math.min(100, (avgVarcMarks / targetVarc) * 100).toFixed(1)}% met` : '0.0% met'}</span>
                <span>
                  Avg: <span className="text-appText-primary font-bold">{avgVarcMarks.toFixed(1)}</span>
                  {targetVarc > 0 && (
                    <span className="ml-1">
                      ({(avgVarcMarks - targetVarc) >= 0 ? 'Met' : `Lag: ${(avgVarcMarks - targetVarc).toFixed(1)}`})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* DILR Target Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-appText-secondary uppercase tracking-wider">DILR Target Marks</span>
                {editingMarksSec === 'dilr' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={marksInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        if (val.length <= 3) setMarksInput(val)
                      }}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveMarksTarget('dilr')
                        else if (e.key === 'Escape') setEditingMarksSec(null)
                      }}
                      onBlur={() => handleSaveMarksTarget('dilr')}
                      className="bg-appBg-secondary border border-appBorder rounded px-1 py-0.5 text-xs font-mono text-appText-primary outline-none focus:border-indigo-500 w-12 text-center"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMarksInput(targetDilr > 0 ? targetDilr.toString() : '')
                      setEditingMarksSec('dilr')
                    }}
                    className="text-[10px] font-bold text-appText-primary hover:text-[#8B5CF6] transition-colors cursor-pointer"
                    title="Click to edit DILR target marks"
                  >
                    {targetDilr > 0 ? `${targetDilr} marks` : 'Set →'}
                  </button>
                )}
              </div>
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden border border-appBorder">
                {targetDilr > 0 && (
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, (avgDilrMarks / targetDilr) * 100)}%`,
                      backgroundColor: '#8B5CF6'
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-appText-muted font-mono px-0.5">
                <span>{targetDilr > 0 ? `${Math.min(100, (avgDilrMarks / targetDilr) * 100).toFixed(1)}% met` : '0.0% met'}</span>
                <span>
                  Avg: <span className="text-appText-primary font-bold">{avgDilrMarks.toFixed(1)}</span>
                  {targetDilr > 0 && (
                    <span className="ml-1">
                      ({(avgDilrMarks - targetDilr) >= 0 ? 'Met' : `Lag: ${(avgDilrMarks - targetDilr).toFixed(1)}`})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* QA Target Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-semibold text-appText-secondary uppercase tracking-wider">QA Target Marks</span>
                {editingMarksSec === 'qa' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={marksInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        if (val.length <= 3) setMarksInput(val)
                      }}
                      onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault() }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveMarksTarget('qa')
                        else if (e.key === 'Escape') setEditingMarksSec(null)
                      }}
                      onBlur={() => handleSaveMarksTarget('qa')}
                      className="bg-appBg-secondary border border-appBorder rounded px-1 py-0.5 text-xs font-mono text-appText-primary outline-none focus:border-indigo-500 w-12 text-center"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMarksInput(targetQa > 0 ? targetQa.toString() : '')
                      setEditingMarksSec('qa')
                    }}
                    className="text-[10px] font-bold text-appText-primary hover:text-[#10B981] transition-colors cursor-pointer"
                    title="Click to edit QA target marks"
                  >
                    {targetQa > 0 ? `${targetQa} marks` : 'Set →'}
                  </button>
                )}
              </div>
              <div className="h-3 w-full rounded-full bg-appBg-secondary overflow-hidden border border-appBorder">
                {targetQa > 0 && (
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, (avgQaMarks / targetQa) * 100)}%`,
                      backgroundColor: '#10B981'
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-appText-muted font-mono px-0.5">
                <span>{targetQa > 0 ? `${Math.min(100, (avgQaMarks / targetQa) * 100).toFixed(1)}% met` : '0.0% met'}</span>
                <span>
                  Avg: <span className="text-appText-primary font-bold">{avgQaMarks.toFixed(1)}</span>
                  {targetQa > 0 && (
                    <span className="ml-1">
                      ({(avgQaMarks - targetQa) >= 0 ? 'Met' : `Lag: ${(avgQaMarks - targetQa).toFixed(1)}`})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom info text pushed to absolute bottom */}
          <div className="pt-2.5 border-t border-appBorder/40">
            <p className="text-[10px] text-appText-muted font-medium italic leading-normal text-left">
              Marks are automatically populated from full mock reports in the Exam Reports & Mocks section.
            </p>
          </div>
        </div>

        {/* New Row Card 3: Study Consistency */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-colors duration-200 min-h-[360px] h-[360px]">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Study Consistency</h3>
              <p className="text-[10px] text-appText-disabled">Last 5 days activity tracker</p>
            </div>

            {/* Average studied value */}
            <div className="py-1">
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent select-none">
                {avgLast5DaysHours.toFixed(1)}
              </span>
              <span className="text-[10px] text-appText-muted font-bold uppercase ml-1.5">hrs/day</span>
              <p className="text-[10px] text-appText-disabled mt-0.5">Average Daily Hours (Last 5 Days)</p>
            </div>

            {/* 5-day grid */}
            <div className="grid grid-cols-5 gap-2 pt-3 border-t border-appBorder/30">
              {last5DaysLogs.map((day) => (
                <div key={day.dateStr} className="flex flex-col items-center text-center">
                  {/* Colored status box */}
                  <div
                    className={`w-7 h-7 rounded-md shadow-sm transition-all ${
                      day.hasActivity
                        ? 'bg-emerald-500 shadow-emerald-500/10'
                        : 'bg-rose-500 shadow-rose-500/10'
                    }`}
                    title={`${day.hours} hrs studied on ${day.dayLabel}`}
                  />
                  <span className="text-[9px] font-semibold text-appText-secondary mt-2 whitespace-nowrap">
                    {day.dayLabel}
                  </span>
                  <span className="text-[10px] font-bold text-appText-primary font-mono mt-0.5">
                    {day.hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Common Flairs */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm space-y-4 md:col-span-2 lg:col-span-3 transition-colors duration-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-muted">Most Common Flairs</h3>
            <p className="text-[10px] text-appText-disabled">Frequently logged weak areas and notes tags</p>
          </div>

          {topFlairs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-appBorder bg-appBg-secondary/50 p-6 text-center text-xs text-appText-muted italic">
              No flairs assigned to questions yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-1">
              {topFlairs.slice(0, 9).map((flair) => {
                return (
                  <div
                    key={flair.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-appBorder bg-appBg-secondary hover:border-slate-400 dark:hover:border-slate-700 transition duration-150"
                  >
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide border uppercase select-none bg-sky-500/[0.08] border-sky-500/20 text-sky-600 dark:text-sky-400">
                      {flair.name}
                    </span>
                    <span className="text-xs font-bold font-mono text-appText-primary">
                      ({flair.count})
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>



      {/* Mock Reports Header with Add Button */}
      <div className="flex flex-col gap-4 border-t border-appBorder pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-appText-primary">Exam Reports & Mocks</h3>
            <p className="text-[10px] text-appText-muted mt-0.5">Analyze and record sectional or full mock tests</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition text-[10px] font-bold uppercase text-white cursor-pointer select-none"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Mock Report
          </button>
        </div>

        {/* Section Filters Pills */}
        <div className="flex flex-wrap gap-1.5 border-b border-appBorder pb-3">
          {([
            { key: 'ALL', label: 'All', activeClass: 'bg-indigo-600 border-indigo-600 text-white' },
            { key: 'FULL_MOCK', label: 'Full Mock', activeClass: 'bg-indigo-500 border-indigo-500 text-white' },
            { key: 'VARC', label: 'VARC', activeClass: 'bg-[#3B82F6] border-[#3B82F6] text-white' },
            { key: 'DILR', label: 'DILR', activeClass: 'bg-[#8B5CF6] border-[#8B5CF6] text-white' },
            { key: 'QUANTS', label: 'Quants', activeClass: 'bg-[#10B981] border-[#10B981] text-white' },
          ] as const).map(({ key, label, activeClass }) => {
            const isActive = reportFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setReportFilter(key as any)}
                className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase transition cursor-pointer ${
                  isActive
                    ? `${activeClass} shadow-sm font-extrabold`
                    : 'bg-appBg-secondary border-appBorder text-appText-muted hover:text-appText-primary hover:bg-[#eae7e1]/50 dark:hover:bg-slate-800/40'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report: ReportEntry) => {
          const isExpanded = expandedReports[report.id] || false
          const activeTab = reportTabs[report.id] || (
            reportFilter !== 'ALL'
              ? (reportFilter === 'QUANTS' ? 'QA' : reportFilter)
              : (report.paperType === 'sectional'
                  ? (report.sectionalType === 'quants' ? 'QA' : (report.sectionalType === 'varc' ? 'VARC' : 'DILR'))
                  : 'ALL')
          )

          const stats = calculateReportStats(report, activeTab)
          const { accuracy, attemptRate, correctQs, incorrectQs, notAnsweredQs, marksScored, totalMarks } = stats

          // Badge configuration — colours match the Study Duration section colours
          let badgeText = 'Full Mock'
          // Full mock: indigo (same accent as full-paper)
          let badgeClass = 'bg-indigo-500/[0.08] border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
          if (report.id === 'cat_2025_slot2') {
            badgeText = 'Actual Exam'
            badgeClass = 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          } else if (report.paperType === 'sectional') {
            if (report.sectionalType === 'varc') {
              badgeText = 'Sectional Mock (VARC)'
              // VARC colour: #3B82F6 blue
              badgeClass = 'bg-[#3B82F6]/[0.08] border-[#3B82F6]/20 text-[#2563EB] dark:text-[#60A5FA]'
            } else if (report.sectionalType === 'dilr') {
              badgeText = 'Sectional Mock (DILR)'
              // DILR colour: #8B5CF6 purple
              badgeClass = 'bg-[#8B5CF6]/[0.08] border-[#8B5CF6]/20 text-[#7C3AED] dark:text-[#A78BFA]'
            } else if (report.sectionalType === 'quants') {
              badgeText = 'Sectional Mock (Quants)'
              // Quants colour: #10B981 emerald-green
              badgeClass = 'bg-[#10B981]/[0.08] border-[#10B981]/20 text-[#059669] dark:text-[#34D399]'
            }
          }

          return (
            <div
              key={report.id}
              className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setExpandedReports(prev => ({ ...prev, [report.id]: !isExpanded }))}
                  className="flex-1 flex items-center gap-3 cursor-pointer focus:outline-none select-none text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${badgeClass}`}>
                      {badgeText}
                    </div>
                    <h3 className="text-sm font-extrabold text-appText-primary tracking-tight">
                      {report.name}
                    </h3>
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  {/* Marks display with tooltip */}
                  <div className="relative group inline-block">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/[0.08] border border-indigo-500/20 rounded-full px-3 py-1 font-mono cursor-help">
                      {marksScored} / {totalMarks} Marks
                    </span>
                    <div className="absolute z-10 hidden group-hover:block bg-slate-950 text-white text-[9px] rounded-lg px-2.5 py-1.5 bottom-full mb-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap shadow-xl border border-appBorder">
                      Scoring rules: +3 for Correct, -1 for Incorrect (0 penalty for TITA questions).
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedReports(prev => ({ ...prev, [report.id]: !isExpanded }))}
                    className="p-1 rounded text-appText-muted hover:text-appText-primary transition cursor-pointer"
                  >
                    <svg
                      className={`w-4 h-4 transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Deletion icon for custom reports only */}
                  {report.id !== 'cat_2025_slot2' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMock(report.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Mock Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-5 space-y-6 pt-5 border-t border-appBorder/50">
                  {/* Overall Stats Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-xl bg-appBg-secondary/50 border border-appBorder">
                    <div className="text-center p-2 relative group">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Marks Scored</span>
                      <span className="text-2xl font-black text-indigo-500 font-mono cursor-help">
                        {marksScored}<span className="text-xs text-appText-disabled font-normal">/{totalMarks}</span>
                      </span>
                      <div className="absolute z-10 hidden group-hover:block bg-slate-950 text-white text-[9px] rounded-lg px-2.5 py-1.5 bottom-full mb-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap shadow-xl border border-appBorder">
                        Scoring rules: +3 for Correct, -1 for Incorrect (0 penalty for TITA questions).
                      </div>
                    </div>
                    <div className="text-center p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Accuracy</span>
                      <span className="text-2xl font-black text-emerald-500 font-mono">{accuracy}%</span>
                    </div>
                    <div className="text-center p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Attempt Rate</span>
                      <span className="text-2xl font-black text-appText-primary font-mono">{attemptRate}%</span>
                    </div>
                    <div className="text-center p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Correct</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{correctQs}</span>
                    </div>
                    <div className="text-center p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Incorrect</span>
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{incorrectQs}</span>
                    </div>
                    <div className="text-center p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Not Answered</span>
                      <span className="text-2xl font-black text-appText-disabled font-mono">{notAnsweredQs}</span>
                    </div>
                  </div>

                  {/* Tab Switchers (Only for Full Mock) */}
                  {report.paperType === 'full' && (
                    <div className="flex flex-wrap gap-2 border-b border-appBorder pb-3">
                      {(['ALL', 'VARC', 'DILR', 'QA'] as const).map((tab) => {
                        const isActive = activeTab === tab
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setReportTabs(prev => ({ ...prev, [report.id]: tab }))}
                            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase transition cursor-pointer border ${
                              isActive
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-600'
                                : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                            }`}
                          >
                            {tab === 'ALL' ? 'All Sections' : tab === 'QA' ? 'Quantitative Aptitude (QA)' : tab}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Tables rendering */}
                  <div className="space-y-8">
                    {(activeTab === 'ALL' || activeTab === 'VARC') && report.varcRows.length > 0 &&
                      renderReportTable('Verbal Ability and Reading Comprehension (VARC)', [...report.varcRows, getSectionTotalRow('Total VARC', report.varcRows, 'VARC')], 'VARC')}
                    {(activeTab === 'ALL' || activeTab === 'DILR') && report.dilrRows.length > 0 &&
                      renderReportTable('Data Interpretation and Logical Reasoning (DILR)', [...report.dilrRows, getSectionTotalRow('Total DILR', report.dilrRows, 'DILR')], 'DILR')}
                    {(activeTab === 'ALL' || activeTab === 'QA') && report.qaRows.length > 0 &&
                      renderReportTable('Quantitative Aptitude (QA)', [...report.qaRows, getSectionTotalRow('Total QA', report.qaRows, 'QA')], 'QA')}
                  </div>

                  {/* Delete Button inside Expanded Card View */}
                  <div className="flex justify-end pt-4 border-t border-appBorder/50">
                    <button
                      type="button"
                      onClick={() => handleDeleteMock(report.id)}
                      className="px-4 py-2 rounded-xl border border-rose-500/20 hover:border-rose-500 bg-rose-500/[0.04] hover:bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase transition duration-150 cursor-pointer"
                    >
                      Delete Report Card
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Section Analysis Collapsible Panel */}
      {reportFilter !== 'ALL' && filteredReports.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowSectionAnalysis(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition select-none cursor-pointer border ${
                reportFilter === 'FULL_MOCK'
                  ? 'bg-indigo-500/[0.08] hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : reportFilter === 'VARC'
                  ? 'bg-[#3B82F6]/[0.08] hover:bg-[#3B82F6]/20 border-[#3B82F6]/20 text-[#2563EB] dark:text-[#60A5FA]'
                  : reportFilter === 'DILR'
                  ? 'bg-[#8B5CF6]/[0.08] hover:bg-[#8B5CF6]/20 border-[#8B5CF6]/20 text-[#7C3AED] dark:text-[#A78BFA]'
                  : 'bg-[#10B981]/[0.08] hover:bg-[#10B981]/20 border-[#10B981]/20 text-[#059669] dark:text-[#34D399]'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 transform transition-transform duration-200 ${
                  showSectionAnalysis ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
              Analyse Section
            </button>
          </div>

          {showSectionAnalysis && sectionAggregateStats && (
            <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-appBorder pb-3">
                <div>
                  <h4 className="text-xs font-extrabold text-appText-primary uppercase tracking-wider">
                    {reportFilter === 'FULL_MOCK' ? 'Full Mock' : reportFilter} Section Analysis
                  </h4>
                  <p className="text-[10px] text-appText-muted mt-0.5">
                    Aggregate statistics across {filteredReports.length} {filteredReports.length === 1 ? 'mock' : 'mocks'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-xl bg-appBg-secondary/50 border border-appBorder">
                <div className="text-center p-2 relative group animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">average Marks Scored</span>
                  <span className={`text-2xl font-black font-mono cursor-help ${
                    reportFilter === 'FULL_MOCK'
                      ? 'text-indigo-500'
                      : reportFilter === 'VARC'
                      ? 'text-[#3B82F6]'
                      : reportFilter === 'DILR'
                      ? 'text-[#8B5CF6]'
                      : 'text-[#10B981]'
                  }`}>
                    {sectionAggregateStats.avgMarksScored.toFixed(1).replace(/\.0$/, '')}
                    <span className="text-xs text-appText-disabled font-normal">
                      /{sectionAggregateStats.avgTotalMarks.toFixed(1).replace(/\.0$/, '')}
                    </span>
                  </span>
                  <div className="absolute z-10 hidden group-hover:block bg-slate-950 text-white text-[9px] rounded-lg px-2.5 py-1.5 bottom-full mb-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap shadow-xl border border-appBorder">
                    Scoring rules: +3 for Correct, -1 for Incorrect (0 penalty for TITA questions).
                  </div>
                </div>

                <div className="text-center p-2 animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">average accuracy</span>
                  <span className="text-2xl font-black text-emerald-500 font-mono">
                    {sectionAggregateStats.avgAccuracy}%
                  </span>
                </div>

                <div className="text-center p-2 animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">average attempt rate</span>
                  <span className="text-2xl font-black text-appText-primary font-mono">
                    {sectionAggregateStats.avgAttemptRate}%
                  </span>
                </div>

                <div className="text-center p-2 animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">Total correct</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {sectionAggregateStats.totalCorrect}
                  </span>
                </div>

                <div className="text-center p-2 animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">total incorrect</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    {sectionAggregateStats.totalIncorrect}
                  </span>
                </div>

                <div className="text-center p-2 animate-fadeIn">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted block">total not answered</span>
                  <span className="text-2xl font-black text-appText-disabled font-mono">
                    {sectionAggregateStats.totalNotAnswered}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Mock Report Modal */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto w-full h-full">
          <div className="bg-cardBg-default border border-appBorder rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-appBorder bg-appBg-secondary/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-appText-primary">Add Mock Report Card</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-appText-muted hover:text-appText-primary transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Mock Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-appText-muted">Mock Report Name</label>
                <input
                  type="text"
                  value={newMockName}
                  onChange={(e) => setNewMockName(e.target.value)}
                  placeholder="e.g. SimCAT 5, Actual CAT 2026..."
                  className="w-full bg-appBg-secondary border border-appBorder rounded-xl px-4 py-2 text-xs text-appText-primary focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Mock Type Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-appText-muted">Paper Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePaperTypeChange('full')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition cursor-pointer ${
                        newPaperType === 'full'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-600'
                          : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover'
                      }`}
                    >
                      Full Mock
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaperTypeChange('sectional')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition cursor-pointer ${
                        newPaperType === 'sectional'
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-600'
                          : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover'
                      }`}
                    >
                      Sectional Mock
                    </button>
                  </div>
                </div>

                {newPaperType === 'sectional' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-appText-muted">Section Target</label>
                    <div className="flex gap-2">
                      {(['varc', 'dilr', 'quants'] as const).map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleSectionalTypeChange(sec)}
                          className={`flex-1 py-2 px-1.5 rounded-xl border text-[9px] font-bold uppercase transition cursor-pointer ${
                            newSectionalType === sec
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-600'
                              : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover'
                          }`}
                        >
                          {sec === 'quants' ? 'Quants' : sec.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section Question Configuration */}
              <div className="p-4 rounded-xl border border-appBorder bg-appBg-secondary/30 space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-appText-secondary">Section Total Questions & Marks</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* VARC */}
                  {(newPaperType === 'full' || newSectionalType === 'varc') && (
                    <div className="space-y-1">
                      <label className="block text-[10px] text-appText-muted">VARC Total Qs</label>
                      <NumberInput
                        value={newVarcTotalQs}
                        onChange={handleVarcTotalChange}
                        className="w-full bg-appBg-secondary border border-appBorder rounded-xl px-3 py-1.5 font-mono text-xs text-appText-primary focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-appText-disabled block">Max Marks: {varcVal * 3}</span>
                      {varcTotalError && (
                        <p className="text-[10px] text-rose-500 font-semibold">{varcTotalError}</p>
                      )}
                    </div>
                  )}

                  {/* DILR */}
                  {(newPaperType === 'full' || newSectionalType === 'dilr') && (
                    <div className="space-y-1">
                      <label className="block text-[10px] text-appText-muted">DILR Total Qs</label>
                      <NumberInput
                        value={newDilrTotalQs}
                        onChange={handleDilrTotalChange}
                        className="w-full bg-appBg-secondary border border-appBorder rounded-xl px-3 py-1.5 font-mono text-xs text-appText-primary focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-appText-disabled block">Max Marks: {dilrVal * 3}</span>
                      {dilrTotalError && (
                        <p className="text-[10px] text-rose-500 font-semibold">{dilrTotalError}</p>
                      )}
                    </div>
                  )}

                  {/* Quants */}
                  {(newPaperType === 'full' || newSectionalType === 'quants') && (
                    <div className="space-y-1">
                      <label className="block text-[10px] text-appText-muted">Quants Total Qs</label>
                      <NumberInput
                        value={newQaTotalQs}
                        onChange={handleQaTotalChange}
                        className="w-full bg-appBg-secondary border border-appBorder rounded-xl px-3 py-1.5 font-mono text-xs text-appText-primary focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-[10px] text-appText-disabled block">Max Marks: {qaVal * 3}</span>
                      {qaTotalError && (
                        <p className="text-[10px] text-rose-500 font-semibold">{qaTotalError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section Topic Input Forms */}
              <div className="space-y-6">
                {(newPaperType === 'full' || newSectionalType === 'varc') && (
                  <div className="space-y-3 p-4 border border-appBorder/50 rounded-xl bg-appBg-secondary/10">
                    <div className="flex items-center justify-between border-b border-appBorder/30 pb-2">
                      <h5 className="font-bold text-appText-primary">Verbal Ability and Reading Comprehension (VARC) Details</h5>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-appText-muted font-semibold">Input Style:</label>
                        <div className="flex gap-1 bg-appBg-secondary border border-appBorder rounded-lg p-0.5 select-none">
                          <button
                            type="button"
                            onClick={() => handleVarcInputStyleChange('detailed')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              varcInputStyle === 'detailed'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Detailed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVarcInputStyleChange('notsure')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              varcInputStyle === 'notsure'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Not Sure
                          </button>
                        </div>
                      </div>
                    </div>

                    {renderReportTable !== null && renderRowInputFields('VARC', newVarcRows, setNewVarcRows, varcInputStyle === 'notsure', varcVal)}
                  </div>
                )}

                {(newPaperType === 'full' || newSectionalType === 'dilr') && (
                  <div className="space-y-3 p-4 border border-appBorder/50 rounded-xl bg-appBg-secondary/10">
                    <div className="flex items-center justify-between border-b border-appBorder/30 pb-2">
                      <h5 className="font-bold text-appText-primary">Data Interpretation and Logical Reasoning (DILR) Details</h5>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-appText-muted font-semibold">Input Style:</label>
                        <div className="flex gap-1 bg-appBg-secondary border border-appBorder rounded-lg p-0.5 select-none">
                          <button
                            type="button"
                            onClick={() => handleDilrInputStyleChange('detailed')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              dilrInputStyle === 'detailed'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Detailed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDilrInputStyleChange('notsure')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              dilrInputStyle === 'notsure'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Not Sure
                          </button>
                        </div>
                      </div>
                    </div>

                    {renderRowInputFields('DILR', newDilrRows, setNewDilrRows, dilrInputStyle === 'notsure', dilrVal)}
                  </div>
                )}

                {(newPaperType === 'full' || newSectionalType === 'quants') && (
                  <div className="space-y-3 p-4 border border-appBorder/50 rounded-xl bg-appBg-secondary/10">
                    <div className="flex items-center justify-between border-b border-appBorder/30 pb-2">
                      <h5 className="font-bold text-appText-primary">Quantitative Aptitude (QA) Details</h5>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-appText-muted font-semibold">Input Style:</label>
                        <div className="flex gap-1 bg-appBg-secondary border border-appBorder rounded-lg p-0.5 select-none">
                          <button
                            type="button"
                            onClick={() => handleQaInputStyleChange('detailed')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              qaInputStyle === 'detailed'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Detailed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQaInputStyleChange('notsure')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition cursor-pointer ${
                              qaInputStyle === 'notsure'
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-indigo-650 dark:border-indigo-650 shadow-sm'
                                : 'text-appText-muted hover:text-appText-primary'
                            }`}
                          >
                            Not Sure
                          </button>
                        </div>
                      </div>
                    </div>

                    {renderRowInputFields('QA', newQaRows, setNewQaRows, qaInputStyle === 'notsure', qaVal)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-appBorder bg-appBg-secondary/50">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-appBorder text-[10px] font-bold uppercase text-appText-secondary hover:bg-cardBg-hover transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMock}
                disabled={!isFormValid()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Save Report Card
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Analytics
