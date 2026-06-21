import { useEffect, useState, useMemo, useRef } from 'react'
import { QUANTS_TOPIC_MAP, LRDI_TOPIC_MAP, VARC_TOPIC_MAP } from '../utils/constants'

// Interfaces
interface StudyRecord {
  id: number
  date: string
  hours: number
  minutes: number
  section: string
  note: string
}

interface QuestionRecord {
  id: number
  section: string
  solution: string | null
  bookmarked: boolean
  topic: string
  subtopic: string
  createdAt: string
}

interface MockTestRecord {
  id: string
  name: string
  date: string
  varc: number
  dilr: number
  qa: number
}

// Flat subtopic lists from constants
const ALL_SUBTOPICS = {
  VARC: Object.values(VARC_TOPIC_MAP).flat(),
  LRDI: Object.values(LRDI_TOPIC_MAP).flat(),
  QUANTS: Object.values(QUANTS_TOPIC_MAP).flat()
}

// Map frontend section names to DB standard
const SECTION_DB_MAP: Record<string, 'VARC' | 'LRDI' | 'QUANTS'> = {
  VARC: 'VARC',
  DILR: 'LRDI',
  QA: 'QUANTS'
}

const SECTION_DISPLAY_MAP: Record<'VARC' | 'LRDI' | 'QUANTS', string> = {
  VARC: 'VARC',
  LRDI: 'DILR',
  QUANTS: 'QA'
}

// Map topic list configurations
const topicsMapList = {
  VARC: VARC_TOPIC_MAP,
  DILR: LRDI_TOPIC_MAP,
  QA: QUANTS_TOPIC_MAP
}

export default function CollegeTracker() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data States from SQLite DB
  const [studyLogs, setStudyLogs] = useState<StudyRecord[]>([])
  const [questions, setQuestions] = useState<QuestionRecord[]>([])

  // User Configurable Target Scores
  const [targets, setTargets] = useState({
    overall: 115,
    varc: 40,
    dilr: 35,
    qa: 40
  })

  // Preparation Weightages (must sum to 1.0)
  const [prepWeights, setPrepWeights] = useState({
    varc: 0.40,
    dilr: 0.30,
    qa: 0.30
  })

  // Readiness Engine Weights (must sum to 1.0)
  const [readinessWeights, setReadinessWeights] = useState({
    studyHours: 0.40,
    questionCoverage: 0.25,
    solvedQuestions: 0.20,
    topicCoverage: 0.10,
    consistency: 0.05
  })

  // Section Specific Targets
  const [studyHourTargets, setStudyHourTargets] = useState({
    varc: 150,
    dilr: 100,
    qa: 150
  })

  const [questionCountTargets, setQuestionCountTargets] = useState({
    varc: 150,
    dilr: 120,
    qa: 150
  })

  // Phase 2 State: Mock scores overlay simulation
  const [mockOverlayEnabled, setMockOverlayEnabled] = useState(false)
  const [mockOverlayWeight, setMockOverlayWeight] = useState(0.50) // 50% mock score weight
  const [mockTests, setMockTests] = useState<MockTestRecord[]>([
    { id: '1', name: 'SIMCAT 1 (Simulated)', date: '2026-06-01', varc: 32, dilr: 28, qa: 30 },
    { id: '2', name: 'SIMCAT 2 (Simulated)', date: '2026-06-15', varc: 36, dilr: 24, qa: 34 }
  ])
  const [newMockName, setNewMockName] = useState('')
  const [newMockVarc, setNewMockVarc] = useState<number | ''>('')
  const [newMockDilr, setNewMockDilr] = useState<number | ''>('')
  const [newMockQa, setNewMockQa] = useState<number | ''>('')
  const [newMockDate, setNewMockDate] = useState(() => new Date().toISOString().slice(0, 10))

  // UI Panels
  const [showSettings, setShowSettings] = useState(false)
  const [activeInsightIndex, setActiveInsightIndex] = useState(0)
  const [topicCoverageSection, setTopicCoverageSection] = useState<'VARC' | 'DILR' | 'QA'>('QA')

  // Load Data on Mount
  useEffect(() => {
    async function loadSimulatorData() {
      try {
        setLoading(true)
        // Fetch study logs
        const studyResponse: any = await window.electron.invoke('study:list')
        if (studyResponse.success) {
          setStudyLogs(studyResponse.records || [])
        }

        // Fetch questions for each section in parallel
        const [varcRes, lrdiRes, quantsRes] = await Promise.all([
          window.electron.invoke('question:list', 'VARC'),
          window.electron.invoke('question:list', 'LRDI'),
          window.electron.invoke('question:list', 'QUANTS')
        ])

        const allQs: QuestionRecord[] = []
        if (varcRes && varcRes.success) allQs.push(...varcRes.questions)
        if (lrdiRes && lrdiRes.success) allQs.push(...lrdiRes.questions)
        if (quantsRes && quantsRes.success) allQs.push(...quantsRes.questions)
        setQuestions(allQs)

        // Load mock reports from DB as baseline mock data if exists
        const mockReportsRes: any = await window.electron.invoke('report:list')
        if (mockReportsRes && mockReportsRes.success && Array.isArray(mockReportsRes.reports)) {
          const formattedMocks = mockReportsRes.reports.map((r: any) => {
            // Estimate scores based on correct & incorrect entries (respecting TITA rules)
            const varcScore = (r.varcRows || []).reduce((acc: number, row: any) => {
              const incorrectPenalty = (row.subtopic === 'Odd One Out' || row.subtopic === 'Para Jumbles') ? 0 : (row.incorrect || 0)
              return acc + ((row?.correct || 0) * 3) - incorrectPenalty
            }, 0)
            const dilrScore = (r.dilrRows || []).reduce((acc: number, row: any) => {
              const titaInc = row.titaIncorrect || 0
              const nonTitaInc = Math.max(0, (row.incorrect || 0) - titaInc)
              return acc + ((row?.correct || 0) * 3) - nonTitaInc
            }, 0)
            const qaScore = (r.qaRows || []).reduce((acc: number, row: any) => {
              const titaInc = row.titaIncorrect || 0
              const nonTitaInc = Math.max(0, (row.incorrect || 0) - titaInc)
              return acc + ((row?.correct || 0) * 3) - nonTitaInc
            }, 0)
            
            let dateStr = new Date().toISOString().slice(0, 10)
            if (r.createdAt) {
              try {
                const d = new Date(r.createdAt)
                if (!isNaN(d.getTime())) {
                  dateStr = d.toISOString().slice(0, 10)
                }
              } catch {}
            }

            return {
              id: r.id,
              name: r.name,
              date: dateStr,
              varc: Math.max(0, varcScore),
              dilr: Math.max(0, dilrScore),
              qa: Math.max(0, qaScore)
            }
          })
          if (formattedMocks.length > 0) {
            setMockTests(formattedMocks)
          }
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadSimulatorData()
  }, [])

  // Dynamic calculations helper
  const simulatorMetrics = useMemo(() => {
    // Calculate days left to target exam (Nov 25, 2026)
    const TARGET_DATE = new Date('2026-11-25T00:00:00')
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const timeDiff = TARGET_DATE.getTime() - todayMidnight.getTime()
    const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))

    // 1. Strict Mock Test Score Projections
    let totalProjected: number | 'N/A' = 'N/A'
    let varcProjected: number | 'N/A' = 'N/A'
    let dilrProjected: number | 'N/A' = 'N/A'
    let qaProjected: number | 'N/A' = 'N/A'

    if (mockTests.length > 0) {
      const sortedMocks = [...mockTests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      const lastMocks = sortedMocks.slice(0, 3)
      varcProjected = Math.round((lastMocks.reduce((acc, m) => acc + (m.varc || 0), 0) / lastMocks.length) * 10) / 10
      dilrProjected = Math.round((lastMocks.reduce((acc, m) => acc + (m.dilr || 0), 0) / lastMocks.length) * 10) / 10
      qaProjected = Math.round((lastMocks.reduce((acc, m) => acc + (m.qa || 0), 0) / lastMocks.length) * 10) / 10
      totalProjected = Math.round((varcProjected + dilrProjected + qaProjected) * 10) / 10
    }

    // 2. Study Allocation Analysis
    const hours = { varc: 0, dilr: 0, qa: 0 }
    studyLogs.forEach(log => {
      const dur = log.hours + log.minutes / 60
      if (log.section === 'VARC') hours.varc += dur
      else if (log.section === 'DILR' || log.section === 'LRDI') hours.dilr += dur
      else if (log.section === 'QUANTS' || log.section === 'QA') hours.qa += dur
      else if (log.section === 'ALL') {
        hours.varc += dur / 3
        hours.dilr += dur / 3
        hours.qa += dur / 3
      }
    })

    const totalHours = hours.varc + hours.dilr + hours.qa
    const actualAllocation = {
      varc: totalHours > 0 ? hours.varc / totalHours : 0,
      dilr: totalHours > 0 ? hours.dilr / totalHours : 0,
      qa: totalHours > 0 ? hours.qa / totalHours : 0
    }

    // 3. Coverage & Weakness Concentration
    const qCount = { varc: 0, dilr: 0, qa: 0 }
    const solvedCount = { varc: 0, dilr: 0, qa: 0 }
    const weaknessCount = { varc: 0, dilr: 0, qa: 0 }
    
    const coveredSubtopics = {
      varc: new Set<string>(),
      dilr: new Set<string>(),
      qa: new Set<string>()
    }

    questions.forEach(q => {
      const sec = q.section
      const solved = q.solution !== null && q.solution !== ''
      const sub = q.subtopic || 'Unassigned'
      
      // Heuristic for Weakness: Bookmarked, or has specific keywords in note/solution
      const isWeakness = q.bookmarked || 
        (q.solution && (q.solution.toLowerCase().includes('hard') || q.solution.toLowerCase().includes('struggle') || q.solution.toLowerCase().includes('weak')))

      if (sec === 'VARC') {
        qCount.varc++
        if (solved) solvedCount.varc++
        if (isWeakness) weaknessCount.varc++
        if (sub !== 'Unassigned') coveredSubtopics.varc.add(sub)
      } else if (sec === 'LRDI') {
        qCount.dilr++
        if (solved) solvedCount.dilr++
        if (isWeakness) weaknessCount.dilr++
        if (sub !== 'Unassigned') coveredSubtopics.dilr.add(sub)
      } else if (sec === 'QUANTS') {
        qCount.qa++
        if (solved) solvedCount.qa++
        if (isWeakness) weaknessCount.qa++
        if (sub !== 'Unassigned') coveredSubtopics.qa.add(sub)
      }
    })

    const totalVarcSubs = ALL_SUBTOPICS.VARC.length
    const totalDilrSubs = ALL_SUBTOPICS.LRDI.length
    const totalQaSubs = ALL_SUBTOPICS.QUANTS.length

    const coverageScore = {
      varc: totalVarcSubs > 0 ? (coveredSubtopics.varc.size / totalVarcSubs) * 100 : 0,
      dilr: totalDilrSubs > 0 ? (coveredSubtopics.dilr.size / totalDilrSubs) * 100 : 0,
      qa: totalQaSubs > 0 ? (coveredSubtopics.qa.size / totalQaSubs) * 100 : 0
    }

    const weaknessConcentration = {
      varc: qCount.varc > 0 ? (weaknessCount.varc / qCount.varc) * 100 : 0,
      dilr: qCount.dilr > 0 ? (weaknessCount.dilr / qCount.dilr) * 100 : 0,
      qa: qCount.qa > 0 ? (weaknessCount.qa / qCount.qa) * 100 : 0
    }

    // 4. Consistency Calculation
    const activeDates = new Set<string>()
    const checkDateLimit = new Date()
    checkDateLimit.setDate(checkDateLimit.getDate() - 28)

    studyLogs.forEach(log => {
      const logDate = new Date(log.date)
      if (logDate >= checkDateLimit) activeDates.add(logDate.toISOString().slice(0, 10))
    })
    questions.forEach(q => {
      const qDate = new Date(q.createdAt)
      if (qDate >= checkDateLimit) activeDates.add(qDate.toISOString().slice(0, 10))
    })

    const totalActiveDays = activeDates.size
    const consistencyScore = Math.min(100, Math.round((totalActiveDays / 20) * 100))

    const weeklyActivity = [0, 0, 0, 0] 
    const now = new Date()
    for (let i = 0; i < 28; i++) {
      const day = new Date()
      day.setDate(now.getDate() - i)
      const dayStr = day.toISOString().slice(0, 10)
      const weekIdx = 3 - Math.floor(i / 7)
      if (activeDates.has(dayStr) && weekIdx >= 0 && weekIdx < 4) {
        weeklyActivity[weekIdx]++
      }
    }

    // 5. Preparation Index Calculation (Performance focused, using study logs and consistency weights)
    const getPreparationIndex = (
      secKey: 'varc' | 'dilr' | 'qa',
      covPct: number,
      weaknessRatio: number,
      proj: number | 'N/A',
      target: number
    ) => {
      const hrs = hours[secKey]
      const targetHrs = studyHourTargets[secKey]
      
      // Expected study hours up to today (linear progress over ~160 days with 1.3 buffer)
      // Floor at 1.0 hour to avoid division errors at the beginning of prep
      const expectedHrs = Math.max(1.0, 1.3 * targetHrs * (160 - Math.min(160, daysLeft)) / 160)
      const F_hours = Math.min(100, (hrs / expectedHrs) * 100)
      const F_consistency = consistencyScore

      const F_questionCoverage = questionCountTargets[secKey] > 0 
        ? Math.min(100, (qCount[secKey] / questionCountTargets[secKey]) * 100) 
        : 0
      const F_solvedQuestions = qCount[secKey] > 0 
        ? Math.min(100, (solvedCount[secKey] / qCount[secKey]) * 100) 
        : 0
      const F_topicCoverage = covPct

      const activeWeightSum = 
        readinessWeights.studyHours + 
        readinessWeights.questionCoverage + 
        readinessWeights.solvedQuestions + 
        readinessWeights.topicCoverage + 
        readinessWeights.consistency

      const baseReadinessRaw = activeWeightSum > 0 
        ? (F_hours * readinessWeights.studyHours + 
           F_questionCoverage * readinessWeights.questionCoverage + 
           F_solvedQuestions * readinessWeights.solvedQuestions + 
           F_topicCoverage * readinessWeights.topicCoverage + 
           F_consistency * readinessWeights.consistency) / activeWeightSum
        : 0
      
      const baseReadiness = Math.min(100, Math.max(0, baseReadinessRaw))

      if (proj === 'N/A' || !mockOverlayEnabled) {
        return Math.min(100, Math.max(0, baseReadiness))
      }

      // Performance index: Projected Score / Target Score
      const R = target > 0 ? proj / target : 0
      const performanceScore = Math.min(100, R * 100)

      // Dynamic weighting: as performance meets or exceeds target, empirical results dominate
      // If R >= 1.0 (Projected >= Target), the performance weight approaches 95%
      // Interpolating between mockOverlayWeight (at R=0) and 0.95 (at R>=1.0)
      const performanceWeight = mockOverlayWeight + (0.95 - mockOverlayWeight) * Math.min(1.0, R)
      
      const blendedIndex = performanceScore * performanceWeight + baseReadiness * (1 - performanceWeight)
      return Math.min(100, Math.max(0, blendedIndex))
    }

    const varcReadiness = getPreparationIndex('varc', coverageScore.varc, weaknessConcentration.varc, varcProjected, targets.varc)
    const dilrReadiness = getPreparationIndex('dilr', coverageScore.dilr, weaknessConcentration.dilr, dilrProjected, targets.dilr)
    const qaReadiness = getPreparationIndex('qa', coverageScore.qa, weaknessConcentration.qa, qaProjected, targets.qa)

    const overallReadiness = (
      varcReadiness * prepWeights.varc +
      dilrReadiness * prepWeights.dilr +
      qaReadiness * prepWeights.qa
    )

    // Subtopic grouping logic for analytics
    const topicAggregates = {
      VARC: {} as Record<string, { total: number; subtopics: Set<string> }>,
      LRDI: {} as Record<string, { total: number; subtopics: Set<string> }>,
      QUANTS: {} as Record<string, { total: number; subtopics: Set<string> }>
    }

    const getParentTopic = (section: 'VARC' | 'LRDI' | 'QUANTS', subtopic: string): string => {
      if (section === 'VARC') {
        if (VARC_TOPIC_MAP.RC.includes(subtopic as any)) return 'Reading Comprehension'
        if (VARC_TOPIC_MAP.VA.includes(subtopic as any)) return 'Verbal Ability'
      } else if (section === 'LRDI') {
        if (LRDI_TOPIC_MAP.LR.includes(subtopic as any)) return 'Logical Reasoning'
        if (LRDI_TOPIC_MAP.DI.includes(subtopic as any)) return 'Data Interpretation'
      } else if (section === 'QUANTS') {
        for (const [topic, subs] of Object.entries(QUANTS_TOPIC_MAP)) {
          if ((subs as readonly string[]).includes(subtopic)) return topic
        }
      }
      return 'General/Unassigned'
    }

    questions.forEach(q => {
      const sec = q.section as 'VARC' | 'LRDI' | 'QUANTS'
      if (!topicAggregates[sec]) return
      const parent = getParentTopic(sec, q.subtopic)
      if (!topicAggregates[sec][parent]) {
        topicAggregates[sec][parent] = { total: 0, subtopics: new Set() }
      }
      topicAggregates[sec][parent].total++
      if (q.subtopic) {
        topicAggregates[sec][parent].subtopics.add(q.subtopic)
      }
    })

    // Bottleneck Analysis (Focus on Gap between Actual and Target)
    const sectionsData = [
      { name: 'VARC', readiness: varcReadiness, gap: (targets.varc - (varcProjected === 'N/A' ? 0 : varcProjected)) },
      { name: 'DILR', readiness: dilrReadiness, gap: (targets.dilr - (dilrProjected === 'N/A' ? 0 : dilrProjected)) },
      { name: 'QA', readiness: qaReadiness, gap: (targets.qa - (qaProjected === 'N/A' ? 0 : qaProjected)) }
    ]

    const sortedByGap = [...sectionsData].sort((a, b) => b.gap - a.gap)
    const bottleneck = sortedByGap[0]

    // Dynamic Daily Insights
    const insights: string[] = []
    
    // Insight 1: Missing Mock Data
    if (mockTests.length === 0) {
      insights.push("No mock tests logged. Future score projections are disabled until performance data is available.")
    }

    // Insight 2: Allocation Risk
    const allocationDiff = Math.abs(actualAllocation.varc - prepWeights.varc) + 
                           Math.abs(actualAllocation.dilr - prepWeights.dilr) + 
                           Math.abs(actualAllocation.qa - prepWeights.qa)
    if (allocationDiff > 0.3 && totalHours > 10) {
      insights.push("High Risk: Your actual study time allocation significantly deviates from your target preparation weights.")
    }

    // Insight 3: Weakness Concentration
    if (weaknessConcentration.qa > 30) insights.push("QA shows high weakness concentration. Review bookmarked/hard questions.")
    if (weaknessConcentration.dilr > 30) insights.push("DILR shows high weakness concentration. Review bookmarked/hard questions.")

    if (insights.length === 0) {
      insights.push("Preparation index is stable. Maintain current coverage velocity and attempt sectional mocks.")
    }

    return {
      hours,
      qCount,
      solvedCount,
      coveredSubtopics,
      totalActiveDays,
      consistencyScore,
      weeklyActivity,
      varcReadiness,
      dilrReadiness,
      qaReadiness,
      overallReadiness,
      varcProjected,
      dilrProjected,
      qaProjected,
      totalProjected,
      bottleneck,
      insights,
      topicAggregates,
      getParentTopic,
      actualAllocation,
      coverageScore,
      weaknessConcentration
    }
  }, [
    studyLogs,
    questions,
    targets,
    prepWeights,
    mockTests,
    readinessWeights,
    studyHourTargets,
    questionCountTargets,
    mockOverlayEnabled,
    mockOverlayWeight
  ])

  // Radar Chart calculation
  const radarMetrics = useMemo(() => {
    const axes = 5
    const radius = 60
    const center = 100
    
    const varcCov = simulatorMetrics.coverageScore.varc / 100
    const dilrCov = simulatorMetrics.coverageScore.dilr / 100
    const qaCov = simulatorMetrics.coverageScore.qa / 100
    
    const allocDiff = Math.abs(simulatorMetrics.actualAllocation.varc - prepWeights.varc) + 
                      Math.abs(simulatorMetrics.actualAllocation.dilr - prepWeights.dilr) + 
                      Math.abs(simulatorMetrics.actualAllocation.qa - prepWeights.qa)
    const allocMatch = Math.max(0, 1 - (allocDiff / 2))
    
    const mockPerf = (simulatorMetrics.totalProjected !== 'N/A' && targets.overall > 0) ? 
                     Math.min(1, simulatorMetrics.totalProjected / targets.overall) : 0
                     
    const currentValues = [varcCov, dilrCov, qaCov, allocMatch, mockPerf]
    const targetValues = [1, 1, 1, 1, (mockTests.length > 0 ? 1 : 0)]
    
    const getPath = (values: number[]) => {
      return values.map((val, i) => {
        const angle = (Math.PI / 2) - (2 * Math.PI * i / axes)
        const x = center + radius * val * Math.cos(angle)
        const y = center - radius * val * Math.sin(angle)
        return `${i === 0 ? 'M' : 'L'} ${x},${y}`
      }).join(' ') + ' Z'
    }

    const getLabelPos = (i: number) => {
      const angle = (Math.PI / 2) - (2 * Math.PI * i / axes)
      const x = center + (radius + 20) * Math.cos(angle)
      const y = center - (radius + 15) * Math.sin(angle)
      return { x, y }
    }
    
    return {
      currentPath: getPath(currentValues),
      targetPath: getPath(targetValues),
      labels: ['VARC Cov', 'DILR Cov', 'QA Cov', 'Alloc Match', 'Mock Perf'].map((l, i) => ({ text: l, ...getLabelPos(i) })),
      points: currentValues.map((val, i) => {
        const angle = (Math.PI / 2) - (2 * Math.PI * i / axes)
        return {
          x: center + radius * val * Math.cos(angle),
          y: center - radius * val * Math.sin(angle)
        }
      })
    }
  }, [simulatorMetrics, prepWeights, targets.overall, mockTests.length])

  // Handlers for simulated Mock Scores in preview state
  const handleAddMock = () => {
    if (!newMockName.trim() || newMockVarc === '' || newMockDilr === '' || newMockQa === '') {
      alert('Please fill out all simulated mock fields.')
      return
    }
    const newTest: MockTestRecord = {
      id: Date.now().toString(),
      name: newMockName.trim(),
      date: newMockDate,
      varc: Number(newMockVarc),
      dilr: Number(newMockDilr),
      qa: Number(newMockQa)
    }
    setMockTests(prev => [...prev, newTest])
    setNewMockName('')
    setNewMockVarc('')
    setNewMockDilr('')
    setNewMockQa('')
  }

  const handleDeleteMock = (id: string) => {
    if (confirm('Permanently delete this simulated mock score?')) {
      setMockTests(prev => prev.filter(m => m.id !== id))
    }
  }

  // Interactive Graph state
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, score: number, prob: number } | null>(null)
  
  // Zoom & Drag/Pan states for Monte Carlo graph
  const [zoomScale, setZoomScale] = useState(1.0)
  const [panX, setPanX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartPanX, setDragStartPanX] = useState(0)

  // Visual status indicators
  const getReadinessColor = (val: number) => {
    if (val < 50) return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    if (val < 75) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }

  const getReadinessBadge = (val: number) => {
    if (val < 50) return 'RED / Critical Action Required'
    if (val < 75) return 'AMBER / Moderate Readiness'
    return 'GREEN / Advanced Readiness'
  }

  const getReadinessProgressColor = (val: number) => {
    if (val < 50) return 'bg-rose-500'
    if (val < 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  // Probability calculations for normal distribution curve (Defensive against NaN)
  const svgChartPath = useMemo(() => {
    const mean = isNaN(Number(simulatorMetrics.totalProjected)) || simulatorMetrics.totalProjected === 'N/A'
      ? 0 
      : Number(simulatorMetrics.totalProjected)
    
    // 1. Calculate empirical standard deviation of logged mocks
    let mockSd = 15 // default baseline overall CAT standard deviation
    if (mockTests.length >= 2) {
      const mockTotals = mockTests.map(m => m.varc + m.dilr + m.qa)
      const avg = mockTotals.reduce((sum, val) => sum + val, 0) / mockTotals.length
      const variance = mockTotals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (mockTotals.length - 1)
      mockSd = Math.sqrt(variance)
    }
    
    // Regularize empirical standard deviation with baseline (50/50 blend)
    const empiricalSd = 0.5 * mockSd + 0.5 * 15
    
    // 2. Adjust for syllabus coverage (preparation uncertainty)
    const overallCoverage = (
      simulatorMetrics.coverageScore.varc * prepWeights.varc +
      simulatorMetrics.coverageScore.dilr * prepWeights.dilr +
      simulatorMetrics.coverageScore.qa * prepWeights.qa
    )
    
    const coverageFactor = 1.5 - (overallCoverage / 100) * 0.7 // ranges from 1.5 to 0.8
    
    // Final dynamic standard deviation capped between 5 and 25 marks
    const sd = Math.max(5, Math.min(25, empiricalSd * coverageFactor))
    
    // Draw points from X = mean - 3.5*sd to mean + 3.5*sd
    const points: Array<{ x: number; y: number }> = []
    const startX = mean - 3.5 * sd
    const endX = mean + 3.5 * sd
    
    const svgWidth = 800
    const svgHeight = 300
    const baselineY = 260
    
    // Calculate dynamic scaling factor to fit the bell curve exactly within the SVG height
    const peakDensity = 1 / (sd * Math.sqrt(2 * Math.PI))
    const maxGraphHeight = 200 // Leaves 100px padding at the top for labels and ticks
    const scaleFactor = maxGraphHeight / peakDensity
    
    for (let i = 0; i <= 100; i++) {
      const score = startX + (i / 100) * (endX - startX)
      const exponent = -Math.pow(score - mean, 2) / (2 * Math.pow(sd, 2))
      const density = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
      
      const xCoord = (i / 100) * svgWidth
      const yCoord = baselineY - (density * scaleFactor)
      
      points.push({ x: xCoord, y: isNaN(yCoord) ? baselineY : yCoord })
    }

    const rawTargetX = ((targets.overall - startX) / (endX - startX)) * svgWidth
    const rawProjectedX = ((mean - startX) / (endX - startX)) * svgWidth
    const targetX = isNaN(rawTargetX) ? 0 : rawTargetX
    const projectedX = isNaN(rawProjectedX) ? 0 : rawProjectedX

    // Compute cumulative probability of exceeding target score
    const targetZ = (targets.overall - mean) / sd
    const erf = (x: number) => {
      const a1 = 0.254829592
      const a2 = -0.284496736
      const a3 = 1.421413741
      const a4 = -1.453152027
      const a5 = 1.061405429
      const p = 0.3275911
      const sign = x < 0 ? -1 : 1
      const absX = Math.abs(x)
      const t = 1.0 / (1.0 + p * absX)
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)
      return 0.5 * (1.0 + sign * y)
    }
    const rawProb = Math.round((1 - erf(targetZ / Math.sqrt(2))) * 100)
    const probabilityExceedingTarget = isNaN(rawProb) ? 0 : rawProb

    return {
      points,
      targetX: Math.max(0, Math.min(svgWidth, targetX)),
      projectedX: Math.max(0, Math.min(svgWidth, projectedX)),
      probability: Math.max(0, Math.min(100, probabilityExceedingTarget)),
      minX: Math.round(startX),
      maxX: Math.round(endX),
      sd
    }
  }, [simulatorMetrics, targets.overall, mockTests, prepWeights])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      const zoomFactor = 1.08
      let nextScale = zoomScale
      if (e.deltaY < 0) {
        nextScale = Math.min(12, zoomScale * zoomFactor)
      } else {
        nextScale = Math.max(1, zoomScale / zoomFactor)
      }

      if (nextScale !== zoomScale) {
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const svgMouseX = (mouseX / rect.width) * 800
        
        let nextPanX = svgMouseX - 400 - ((svgMouseX - 400 - panX) / zoomScale) * nextScale
        
        if (nextScale === 1) {
          nextPanX = 0
        } else {
          const maxPan = 800 * (nextScale - 1)
          nextPanX = Math.max(-maxPan, Math.min(maxPan, nextPanX))
        }

        setZoomScale(nextScale)
        setPanX(nextPanX)
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [zoomScale, panX])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale > 1) {
      containerRef.current?.setPointerCapture(e.pointerId)
      setIsDragging(true)
      setDragStartX(e.clientX)
      setDragStartPanX(panX)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    if (!isDragging) {
      const zoomedX = Math.max(0, Math.min(800, ((e.clientX - rect.left) / rect.width) * 800))
      const unzoomedX = (zoomedX - 400 - panX) / zoomScale + 400
      
      const minX = svgChartPath.minX
      const maxX = svgChartPath.maxX
      
      const score = Math.round(minX + (unzoomedX / 800) * (maxX - minX))
      
      let closestY = 260
      let minDiff = 800
      const points = svgChartPath.points || []
      for (const p of points) {
        if (Math.abs(p.x - unzoomedX) < minDiff) {
          minDiff = Math.abs(p.x - unzoomedX)
          closestY = p.y
        }
      }
      
      const mean = isNaN(Number(simulatorMetrics.totalProjected)) || simulatorMetrics.totalProjected === 'N/A'
        ? 0 
        : Number(simulatorMetrics.totalProjected)
      const sd = svgChartPath.sd
      const z = (score - mean) / sd
      const erf = (t: number) => {
        const sign = t < 0 ? -1 : 1
        const absT = Math.abs(t)
        const p = 0.3275911, a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429
        const tt = 1.0 / (1.0 + p * absT)
        const y = 1.0 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-absT * absT)
        return 0.5 * (1.0 + sign * y)
      }
      const prob = Math.round((1 - erf(z / Math.sqrt(2))) * 100)
      
      setHoveredPoint({ x: zoomedX, y: closestY, score, prob: Math.max(0, Math.min(100, prob)) })
    } else {
      const deltaX = e.clientX - dragStartX
      const svgDeltaX = (deltaX / rect.width) * 800
      let nextPanX = dragStartPanX + svgDeltaX
      
      const maxPan = 800 * (zoomScale - 1)
      nextPanX = Math.max(-maxPan, Math.min(maxPan, nextPanX))
      setPanX(nextPanX)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      containerRef.current?.releasePointerCapture(e.pointerId)
      setIsDragging(false)
    }
  }

  const handleResetZoom = () => {
    setZoomScale(1.0)
    setPanX(0)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-appText-muted font-semibold tracking-wider uppercase animate-pulse">
            Processing Preparation Vault Analytics...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 p-6 text-center">
        <p className="text-sm font-semibold text-rose-500">Failed to initialize Trajectory Simulator: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-appBorder/60 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-appText-primary flex items-center gap-2">
            <span>FMS Delhi Trajectory Simulator</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] rounded border border-[#F59E0B]/20">
              Personal Prep Analyst
            </span>
          </h2>
          <p className="text-xs text-appText-muted mt-0.5 font-medium">
            Private archive & Trajectory simulator page
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
            showSettings 
              ? 'bg-appText-primary text-appBg-primary border-appText-primary' 
              : 'bg-cardBg-default text-appText-secondary border-appBorder hover:bg-cardBg-hover'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {showSettings ? 'Hide Simulator Configuration' : 'Engine Weights & Targets Settings'}
        </button>
      </div>

      {/* CONFIGURATION DRAWER / CARD */}
      {showSettings && (
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-glow space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-appBorder pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Simulator Parameters Configuration</h3>
            <span className="text-[10px] text-appText-muted font-mono font-medium">Verify that weights sum up to 1.0 (100%)</span>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Target Scores */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase text-[#3B82F6] tracking-wider">Target Scores (CAT Marks)</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>VARC Target</span>
                  <input
                    type="number"
                    value={targets.varc}
                    onChange={e => setTargets(prev => ({ ...prev, varc: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>DILR Target</span>
                  <input
                    type="number"
                    value={targets.dilr}
                    onChange={e => setTargets(prev => ({ ...prev, dilr: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>QA Target</span>
                  <input
                    type="number"
                    value={targets.qa}
                    onChange={e => setTargets(prev => ({ ...prev, qa: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-bold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-bold border-t border-appBorder/50 pt-1.5">
                  <span>Total Target</span>
                  <input
                    type="number"
                    value={targets.overall}
                    onChange={e => setTargets(prev => ({ ...prev, overall: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Preparation Weightages */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase text-[#8B5CF6] tracking-wider">Preparation Weightage</h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>VARC Weight</span>
                  <input
                    type="number"
                    step="0.05"
                    value={prepWeights.varc}
                    onChange={e => setPrepWeights(prev => ({ ...prev, varc: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>DILR Weight</span>
                  <input
                    type="number"
                    step="0.05"
                    value={prepWeights.dilr}
                    onChange={e => setPrepWeights(prev => ({ ...prev, dilr: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>QA Weight</span>
                  <input
                    type="number"
                    step="0.05"
                    value={prepWeights.qa}
                    onChange={e => setPrepWeights(prev => ({ ...prev, qa: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div className="text-[10px] text-right font-mono text-appText-muted">
                  Total: {Math.round((prepWeights.varc + prepWeights.dilr + prepWeights.qa) * 100)}%
                </div>
              </div>
            </div>

            {/* Readiness Engine Weight Factor */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase text-[#10B981] tracking-wider">Readiness Engine Weights</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span>Study Logs (Hours)</span>
                  <input
                    type="number"
                    step="0.05"
                    value={readinessWeights.studyHours}
                    onChange={e => setReadinessWeights(prev => ({ ...prev, studyHours: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Question Coverage</span>
                  <input
                    type="number"
                    step="0.05"
                    value={readinessWeights.questionCoverage}
                    onChange={e => setReadinessWeights(prev => ({ ...prev, questionCoverage: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Solved Ratio</span>
                  <input
                    type="number"
                    step="0.05"
                    value={readinessWeights.solvedQuestions}
                    onChange={e => setReadinessWeights(prev => ({ ...prev, solvedQuestions: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Topic Coverage</span>
                  <input
                    type="number"
                    step="0.05"
                    value={readinessWeights.topicCoverage}
                    onChange={e => setReadinessWeights(prev => ({ ...prev, topicCoverage: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Consistency Metric</span>
                  <input
                    type="number"
                    step="0.01"
                    value={readinessWeights.consistency}
                    onChange={e => setReadinessWeights(prev => ({ ...prev, consistency: Number(e.target.value) || 0 }))}
                    className="w-16 p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs"
                  />
                </div>
                <div className="text-[10px] text-right font-mono text-appText-muted">
                  Total: {Math.round((readinessWeights.studyHours + readinessWeights.questionCoverage + readinessWeights.solvedQuestions + readinessWeights.topicCoverage + readinessWeights.consistency) * 100)}%
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-appBorder/50 pt-3 grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-bold uppercase text-[#EC4899] tracking-wider mb-2">Section Target Study Hours</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">VARC Target</label>
                  <input
                    type="number"
                    value={studyHourTargets.varc}
                    onChange={e => setStudyHourTargets(prev => ({ ...prev, varc: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">DILR Target</label>
                  <input
                    type="number"
                    value={studyHourTargets.dilr}
                    onChange={e => setStudyHourTargets(prev => ({ ...prev, dilr: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">QA Target</label>
                  <input
                    type="number"
                    value={studyHourTargets.qa}
                    onChange={e => setStudyHourTargets(prev => ({ ...prev, qa: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase text-[#EC4899] tracking-wider mb-2">Section Target Question Counts</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">VARC Target Qs</label>
                  <input
                    type="number"
                    value={questionCountTargets.varc}
                    onChange={e => setQuestionCountTargets(prev => ({ ...prev, varc: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">DILR Target Qs</label>
                  <input
                    type="number"
                    value={questionCountTargets.dilr}
                    onChange={e => setQuestionCountTargets(prev => ({ ...prev, dilr: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-appText-muted block mb-0.5">QA Target Qs</label>
                  <input
                    type="number"
                    value={questionCountTargets.qa}
                    onChange={e => setQuestionCountTargets(prev => ({ ...prev, qa: Number(e.target.value) || 0 }))}
                    className="w-full p-1 text-center bg-appBg-secondary border border-appBorder rounded text-appText-primary text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERALL HERO BLOCK & CONSISTENCY */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* HERO CARD */}
        <div className="md:col-span-2 rounded-2xl border border-appBorder bg-cardBg-default p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-gradient-to-br from-amber-500/5 to-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between border-b border-appBorder/50 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-widest block">Active Target Trajectory</span>
                <span className="text-sm font-bold text-appText-primary">FMS Delhi Target Portfolio</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-widest block">Target Score</span>
                <span className="text-sm font-bold text-[#F59E0B] font-mono">{targets.overall}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-6 border-b border-appBorder/50">
              <div className="text-center border-r border-appBorder/50">
                <span className="text-[10px] text-appText-muted uppercase tracking-wider block font-semibold">Projected Score</span>
                <span className="text-3xl font-extrabold text-appText-primary font-mono mt-1 block">
                  {simulatorMetrics.totalProjected}
                </span>
                <span className="text-[10px] text-appText-muted font-medium block mt-1">Mock Based Model</span>
              </div>

              <div className="text-center border-r border-appBorder/50">
                <span className="text-[10px] text-appText-muted uppercase tracking-wider block font-semibold">Preparation Index</span>
                <span className="text-3xl font-extrabold text-emerald-500 font-mono mt-1 block">
                  {Math.round(simulatorMetrics.overallReadiness)}%
                </span>
                <span className="text-[10px] text-appText-muted font-medium block mt-1">Performance Matrix</span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-appText-muted uppercase tracking-wider block font-semibold">Target Gap</span>
                <span className={`text-3xl font-extrabold font-mono mt-1 block ${
                  simulatorMetrics.totalProjected === 'N/A' ? 'text-appText-muted' : (targets.overall - (simulatorMetrics.totalProjected as number) > 0 ? 'text-rose-500' : 'text-emerald-500')
                }`}>
                  {simulatorMetrics.totalProjected === 'N/A' ? 'N/A' : Math.max(0, Math.round((targets.overall - (simulatorMetrics.totalProjected as number)) * 10) / 10)}
                </span>
                <span className="text-[10px] text-appText-muted font-medium block mt-1">Marks Remaining</span>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-appText-secondary">Overall Preparation Index</span>
              <span className="text-appText-primary font-mono">{Math.round(simulatorMetrics.overallReadiness)}%</span>
            </div>
            <div className="w-full bg-appBg-secondary rounded-full h-2.5 overflow-hidden border border-appBorder/35">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getReadinessProgressColor(simulatorMetrics.overallReadiness)}`} 
                style={{ width: `${Math.min(100, simulatorMetrics.overallReadiness)}%` }} 
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-appText-muted font-medium pt-1">
              <span>Threshold Status:</span>
              <span className="font-semibold">{getReadinessBadge(simulatorMetrics.overallReadiness)}</span>
            </div>
          </div>
        </div>

        {/* CONSISTENCY CARD */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-6 flex flex-col justify-between shadow-sm">
          <div className="h-full flex flex-col justify-between w-full">
            <div className="flex items-center justify-between border-b border-appBorder/50 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-widest block">Study Consistency</span>
                <span className="text-sm font-bold text-appText-primary">Consistency Index</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {simulatorMetrics.consistencyScore}/100
              </span>
            </div>

            <div className="py-4 flex-1 flex flex-col justify-center gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-appText-secondary font-medium">Days Studied (Last 28 Days)</span>
                <span className="text-appText-primary font-bold font-mono">{simulatorMetrics.totalActiveDays} / 28 Days</span>
              </div>
              
              {/* GitHub style contributions grid expanded */}
              <div className="flex flex-col gap-2 p-3 bg-appBg-secondary/55 rounded-xl border border-appBorder/50 flex-grow justify-center">
                <span className="text-[9px] text-appText-muted uppercase font-bold tracking-wider mb-1 block">Activity Matrix (Past 4 Weeks)</span>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (27 - idx))
                    const dateStr = date.toISOString().slice(0, 10)
                    const isActive = studyLogs.some(l => new Date(l.date).toISOString().slice(0, 10) === dateStr) ||
                                     questions.some(q => new Date(q.createdAt).toISOString().slice(0, 10) === dateStr)
                    return (
                      <div 
                        key={idx}
                        title={dateStr + (isActive ? ' (Active Prep)' : ' (No logs)')}
                        className={`h-7 rounded-md transition-colors duration-150 ${
                          isActive 
                            ? 'bg-emerald-500 border border-emerald-600/30 shadow-sm' 
                            : 'bg-appBg-primary border border-appBorder/60'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION ANALYSIS GRID */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* VARC CARD */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#3B82F6]" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-appText-primary uppercase tracking-wider">VARC Section</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getReadinessColor(simulatorMetrics.varcReadiness)}`}>
                {Math.round(simulatorMetrics.varcReadiness)}% Index
              </span>
            </div>
            
            <div className="space-y-3 text-xs border-b border-appBorder/50 pb-3">
              <div className="flex justify-between">
                <span className="text-appText-muted">Target Score</span>
                <span className="font-bold font-mono text-appText-primary">{targets.varc} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Projected Score</span>
                <span className="font-bold font-mono text-appText-primary">{simulatorMetrics.varcProjected} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Logged Hours</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.hours.varc.toFixed(1)}h / {studyHourTargets.varc}h target</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Questions Logged</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.qCount.varc} / {questionCountTargets.varc} Qs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Topic Coverage</span>
                <span className="font-mono text-appText-secondary">
                  {simulatorMetrics.coveredSubtopics.varc.size} / {ALL_SUBTOPICS.VARC.length} subtopics
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-3">
            <div className="flex items-center justify-between text-[10px] text-appText-muted font-bold">
              <span>Section Weight: {Math.round(prepWeights.varc * 100)}%</span>
              <span className="text-[#3B82F6]">VARC</span>
            </div>
          </div>
        </div>

        {/* DILR CARD */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#8B5CF6]" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-appText-primary uppercase tracking-wider">DILR Section</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getReadinessColor(simulatorMetrics.dilrReadiness)}`}>
                {Math.round(simulatorMetrics.dilrReadiness)}% Index
              </span>
            </div>
            
            <div className="space-y-3 text-xs border-b border-appBorder/50 pb-3">
              <div className="flex justify-between">
                <span className="text-appText-muted">Target Score</span>
                <span className="font-bold font-mono text-appText-primary">{targets.dilr} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Projected Score</span>
                <span className="font-bold font-mono text-appText-primary">{simulatorMetrics.dilrProjected} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Logged Hours</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.hours.dilr.toFixed(1)}h / {studyHourTargets.dilr}h target</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Questions Logged</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.qCount.dilr} / {questionCountTargets.dilr} Qs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Topic Coverage</span>
                <span className="font-mono text-appText-secondary">
                  {simulatorMetrics.coveredSubtopics.dilr.size} / {ALL_SUBTOPICS.LRDI.length} subtopics
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-3">
            <div className="flex items-center justify-between text-[10px] text-appText-muted font-bold">
              <span>Section Weight: {Math.round(prepWeights.dilr * 100)}%</span>
              <span className="text-[#8B5CF6]">DILR</span>
            </div>
          </div>
        </div>

        {/* QA CARD */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#10B981]" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-appText-primary uppercase tracking-wider">Quantitative Aptitude (QA)</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getReadinessColor(simulatorMetrics.qaReadiness)}`}>
                {Math.round(simulatorMetrics.qaReadiness)}% Index
              </span>
            </div>
            
            <div className="space-y-3 text-xs border-b border-appBorder/50 pb-3">
              <div className="flex justify-between">
                <span className="text-appText-muted">Target Score</span>
                <span className="font-bold font-mono text-appText-primary">{targets.qa} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Projected Score</span>
                <span className="font-bold font-mono text-appText-primary">{simulatorMetrics.qaProjected} marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Logged Hours</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.hours.qa.toFixed(1)}h / {studyHourTargets.qa}h target</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Questions Logged</span>
                <span className="font-mono text-appText-secondary">{simulatorMetrics.qCount.qa} / {questionCountTargets.qa} Qs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-appText-muted">Topic Coverage</span>
                <span className="font-mono text-appText-secondary">
                  {simulatorMetrics.coveredSubtopics.qa.size} / {ALL_SUBTOPICS.QUANTS.length} subtopics
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-3">
            <div className="flex items-center justify-between text-[10px] text-appText-muted font-bold">
              <span>Section Weight: {Math.round(prepWeights.qa * 100)}%</span>
              <span className="text-[#10B981]">QA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ANALYSIS CARDS: BOTTLENECK, MARGINAL RETURN, DAILY INSIGHT */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* BOTTLENECK ANALYSIS */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary border-l-2 border-rose-500 pl-2 mb-3">
              Active Prep Bottleneck
            </h3>
            
            <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 mb-4">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Bottleneck Area</span>
              <span className="text-base font-extrabold text-appText-primary">{SECTION_DISPLAY_MAP[SECTION_DB_MAP[simulatorMetrics.bottleneck?.name || 'DILR']] || simulatorMetrics.bottleneck?.name || 'DILR'}</span>
              <p className="text-[11px] text-appText-muted mt-1">
                "You are currently furthest from your {SECTION_DISPLAY_MAP[SECTION_DB_MAP[simulatorMetrics.bottleneck?.name || 'DILR']] || simulatorMetrics.bottleneck?.name || 'DILR'} target."
              </p>
            </div>

            <ul className="space-y-2 text-xs text-appText-secondary font-medium">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-500 mt-0.5">•</span>
                <span>Lowest Preparation Index: {Math.round(simulatorMetrics.bottleneck?.readiness || 0)}%</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-500 mt-0.5">•</span>
                <span>Target Gap: {simulatorMetrics.bottleneck?.gap} marks</span>
              </li>
            </ul>
          </div>
          <div className="border-t border-appBorder/50 pt-3 mt-4 text-[10px] text-appText-muted">
            Focus allocation adjustments here to address weakness concentration.
          </div>
        </div>

        {/* TARGET PROFILE RADAR CHART */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary border-l-2 border-[#F59E0B] pl-2 mb-3">
              Target Profile Radar
            </h3>
            <span className="text-[10px] text-appText-muted block mb-3 font-semibold">
              Current Coverage vs Target Model
            </span>

            <div className="flex justify-center items-center py-2 relative">
              <svg viewBox="0 0 200 200" className="w-40 h-40">
                {/* Background Web */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
                  <path
                    key={idx}
                    d={radarMetrics.targetPath.replace(/1/g, scale.toString())} // Hacky but effective for regular web
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="0.5"
                  />
                ))}
                {/* Axes lines */}
                {radarMetrics.labels.map((l, i) => {
                  const angle = (Math.PI / 2) - (2 * Math.PI * i / 5)
                  return (
                    <line
                      key={i}
                      x1="100" y1="100"
                      x2={100 + 60 * Math.cos(angle)}
                      y2={100 - 60 * Math.sin(angle)}
                      stroke="var(--color-border)"
                      strokeWidth="0.5"
                    />
                  )
                })}
                
                {/* Target Path */}
                <path d={radarMetrics.targetPath} fill="#F59E0B" opacity="0.1" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3" />
                
                {/* Current Path */}
                <path d={radarMetrics.currentPath} fill="#10B981" opacity="0.3" stroke="#10B981" strokeWidth="2" />
                {radarMetrics.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10B981" />
                ))}

                {/* Labels */}
                {radarMetrics.labels.map((l, i) => (
                  <text key={i} x={l.x} y={l.y} fill="var(--color-text-secondary)" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                    {l.text}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-4 border-t border-appBorder/50 mt-4 flex items-center justify-between text-[11px] font-bold text-appText-primary">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#F59E0B] rounded-full opacity-50" />
              <span className="text-[10px] text-appText-muted">Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10B981] rounded-full" />
              <span className="text-[10px] text-appText-muted">Actual Profile</span>
            </div>
          </div>
        </div>

        {/* DAILY INSIGHT CARD */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-appBorder/50 pb-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary border-l-2 border-indigo-500 pl-2">
                Dynamic Insight Ticker
              </h3>
              <span className="text-[9px] font-mono text-appText-muted uppercase">
                {activeInsightIndex + 1} / {simulatorMetrics.insights.length}
              </span>
            </div>

            <div className="flex h-24 items-center justify-center text-center p-3 rounded-xl bg-appBg-secondary/35 border border-appBorder/40 select-none">
              <p className="text-xs text-appText-secondary leading-relaxed font-semibold">
                "{simulatorMetrics.insights[activeInsightIndex]}"
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-appBorder/50 mt-4 flex justify-end">
            <button
              onClick={() => setActiveInsightIndex(prev => (prev + 1) % simulatorMetrics.insights.length)}
              className="text-[11px] font-bold text-sky-550 text-sky-500 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Rotate Next Insight</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* TOPIC & SUBTOPIC COVERAGE BREAKDOWN */}
      <div className="rounded-2xl border border-appBorder bg-cardBg-default p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-appBorder pb-3 gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary">Subtopic Coverage Analytics</h3>
            <p className="text-[10px] text-appText-muted mt-0.5">Distribution of questions logged under sections and parent topics</p>
          </div>
          
          <div className="flex rounded-lg bg-appBg-secondary border border-appBorder p-0.5 w-max">
            {(['QA', 'DILR', 'VARC'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTopicCoverageSection(tab)}
                className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  topicCoverageSection === tab
                    ? 'bg-cardBg-default text-appText-primary border border-appBorder shadow-sm font-extrabold'
                    : 'text-appText-muted hover:text-appText-primary bg-transparent border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(topicsMapList[topicCoverageSection]).map(([parentTopic, subtopics]) => {
            const dbSec = topicCoverageSection === 'QA' ? 'QUANTS' : (topicCoverageSection === 'DILR' ? 'LRDI' : 'VARC')
            const aggregates = simulatorMetrics.topicAggregates[dbSec]?.[parentTopic] || { total: 0, subtopics: new Set() }
            const totalSubtopicsCount = subtopics.length
            const coveredCount = aggregates.subtopics.size
            const topicCovPct = Math.round((coveredCount / totalSubtopicsCount) * 100)
            const neglectedSubtopics = subtopics.filter(s => !aggregates.subtopics.has(s))

            return (
              <div key={parentTopic} className="rounded-xl border border-appBorder/60 bg-appBg-secondary/20 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-appText-primary leading-tight">{parentTopic}</h4>
                    <span className="text-[10px] font-bold font-mono text-appText-muted">
                      {aggregates.total} Qs
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-semibold text-appText-secondary mt-2">
                    <span>Coverage: {coveredCount} / {totalSubtopicsCount} subtopics</span>
                    <span>{topicCovPct}%</span>
                  </div>

                  <div className="w-full bg-appBg-secondary rounded-full h-1.5 overflow-hidden mt-1">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${topicCovPct}%` }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-appBorder/50 mt-2 max-h-32 overflow-y-auto pr-1">
                  <span className="text-[9px] uppercase font-bold text-appText-disabled block mb-1">Subtopics</span>
                  <div className="flex flex-col gap-1">
                    {subtopics.map(sub => {
                      const isCovered = aggregates.subtopics.has(sub);
                      return (
                        <div key={sub} className="flex items-center justify-between text-[10px]">
                          <span className={`${isCovered ? 'text-appText-primary' : 'text-appText-muted'}`}>{sub}</span>
                          {isCovered ? (
                            <span className="text-emerald-500 font-bold">✓</span>
                          ) : (
                            <span className="text-rose-500 font-bold opacity-50">✗</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PHASE 2 INTERFACES & MONTE CARLO CHART */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* MONTE CARLO PROJECTION */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-6 shadow-sm flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between border-b border-appBorder/50 pb-2.5 mb-4">
              <div>
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-widest block">Probability Trajectory</span>
                <span className="text-sm font-bold text-appText-primary">Future Projection Score Distribution</span>
              </div>
              <div className="flex items-center gap-2">
                {zoomScale > 1 && (
                  <button
                    onClick={handleResetZoom}
                    className="text-[9px] font-bold text-sky-550 text-sky-500 bg-sky-500/10 px-2 py-0.5 border border-sky-500/20 rounded hover:bg-sky-500/20 transition cursor-pointer select-none"
                  >
                    Reset Zoom
                  </button>
                )}
                <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded">
                  Monte Carlo Preview (Phase 2)
                </span>
              </div>
            </div>

            {(() => {
              // Pre-calculate zoomed lines and shapes
              const points = svgChartPath.points || []
              const zoomedPoints = points.map(p => ({
                x: (p.x - 400) * zoomScale + 400 + panX,
                y: p.y
              }))
              const zoomedPathData = `M 0,260 ` + zoomedPoints.map(p => `L ${p.x},${p.y}`).join(' ') + ` L 800,260 Z`
              const zoomedLineData = zoomedPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')

              const zoomedTargetX = (svgChartPath.targetX - 400) * zoomScale + 400 + panX
              const zoomedProjectedX = (svgChartPath.projectedX - 400) * zoomScale + 400 + panX

              const startX = svgChartPath.minX
              const endX = svgChartPath.maxX
              
              const getScoreFromX = (zoomedX: number) => {
                const unzoomedX = (zoomedX - 400 - panX) / zoomScale + 400
                return startX + (unzoomedX / 800) * (endX - startX)
              }
              
              const getXFromScore = (score: number) => {
                const unzoomedX = ((score - startX) / (endX - startX)) * 800
                return (unzoomedX - 400) * zoomScale + 400 + panX
              }

              const scoreLeft = getScoreFromX(0)
              const scoreRight = getScoreFromX(800)
              const span = scoreRight - scoreLeft

              let tickStep = 20
              if (span < 40) tickStep = 5
              else if (span < 90) tickStep = 10
              else if (span < 180) tickStep = 20
              else tickStep = 50

              const firstTickScore = Math.ceil(scoreLeft / tickStep) * tickStep
              const ticks: number[] = []
              for (let s = firstTickScore; s <= scoreRight; s += tickStep) {
                ticks.push(s)
              }

              // Overlap calculations
              const diffX = Math.abs(zoomedTargetX - zoomedProjectedX)
              const labelsOverlap = diffX < 90
              const targetLabelY = 25
              const projectedLabelY = labelsOverlap ? 45 : 25

              return (
                <div 
                  ref={containerRef}
                  className={`flex flex-col items-center bg-appBg-secondary/25 border border-appBorder/50 rounded-xl p-3 relative select-none overflow-hidden ${
                    zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
                  }`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={() => setHoveredPoint(null)}
                >
                  {hoveredPoint && (
                    <div 
                      className="absolute pointer-events-none bg-appBg-primary border border-appBorder shadow-lg rounded px-2 py-1 text-[10px] z-10"
                      style={{ left: `${(hoveredPoint.x / 800) * 100}%`, top: '10px', transform: 'translateX(-50%)' }}
                    >
                      <div className="font-bold text-appText-primary text-center">{hoveredPoint.score} marks</div>
                      <div className="text-emerald-500 font-mono">{hoveredPoint.prob}% prob</div>
                    </div>
                  )}
                  <svg viewBox="0 0 800 300" className="w-full h-80 text-appText-primary">
                    <line x1="0" y1="260" x2="800" y2="260" stroke="var(--color-border)" strokeWidth="1" />
                    <line x1="0" y1="10" x2="800" y2="10" stroke="var(--color-border)" strokeDasharray="3" strokeWidth="0.5" />
                    
                    <path d={zoomedPathData} fill="url(#grad)" opacity="0.15" />
                    <path d={zoomedLineData} fill="none" stroke="url(#stroke-grad)" strokeWidth="2.5" />

                    {hoveredPoint && (
                      <>
                        <line x1={hoveredPoint.x} y1={hoveredPoint.y} x2={hoveredPoint.x} y2="260" stroke="#8B5CF6" strokeDasharray="2" strokeWidth="1" />
                        <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill="#8B5CF6" />
                      </>
                    )}

                    <line 
                      x1={zoomedTargetX} 
                      y1="10" 
                      x2={zoomedTargetX} 
                      y2="260" 
                      stroke="#F59E0B" 
                      strokeDasharray="4" 
                      strokeWidth="1.5" 
                    />
                    
                    <line 
                      x1={zoomedProjectedX} 
                      y1="10" 
                      x2={zoomedProjectedX} 
                      y2="260" 
                      stroke="#10B981" 
                      strokeWidth="1.5" 
                    />

                    <text 
                      x={zoomedTargetX + 5} 
                      y={targetLabelY} 
                      fill="#F59E0B" 
                      fontSize="9" 
                      fontWeight="bold" 
                      textAnchor="start"
                    >
                      FMS Target: {targets.overall}
                    </text>
                    
                    <text 
                      x={zoomedProjectedX + 5} 
                      y={projectedLabelY} 
                      fill="#10B981" 
                      fontSize="9" 
                      fontWeight="bold" 
                      textAnchor="start"
                    >
                      Projected: {simulatorMetrics.totalProjected}
                    </text>

                    {ticks.map(score => {
                      const x = getXFromScore(score)
                      if (x < 0 || x > 800) return null
                      return (
                        <g key={score} className="opacity-60">
                          <line x1={x} y1="260" x2={x} y2="265" stroke="var(--color-border)" strokeWidth="1" />
                          <text x={x} y="280" fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                            {Math.round(score)}
                          </text>
                        </g>
                      )
                    })}

                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="stroke-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )
            })()}
          </div>

          <div className="pt-3 border-t border-appBorder/50 mt-4 flex items-center justify-between text-xs font-semibold">
            <span className="text-appText-secondary">Estimated Probability of Exceeding Target:</span>
            <span className="text-emerald-500 font-mono font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {svgChartPath.probability}% Chance
            </span>
          </div>
        </div>

        {/* FUTURE MOCK INTEGRATION PLACEHOLDER */}
        <div className="rounded-2xl border border-appBorder bg-cardBg-default p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-appBorder/50 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-appText-muted uppercase tracking-widest block">Phase 2 Sandbox</span>
                <span className="text-sm font-bold text-appText-primary font-mono">Mock Scores Analytics Hook</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-appText-muted font-bold">Predictive Overlay:</span>
                <button
                  onClick={() => setMockOverlayEnabled(!mockOverlayEnabled)}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer duration-200 ${
                    mockOverlayEnabled ? 'bg-emerald-500' : 'bg-appBg-secondary border border-appBorder'
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 transform ${
                    mockOverlayEnabled ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {mockOverlayEnabled && (
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sandbox Overlay Active</span>
                  <span className="text-[10px] text-appText-muted font-mono">Overlay weight: {Math.round(mockOverlayWeight * 100)}%</span>
                </div>
                <p className="text-[11px] text-appText-secondary leading-relaxed">
                  Mock test results are now injected directly into the Readiness Engine. 
                  Readiness scores will prioritize recent simulated exam performances.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-appText-secondary">Mock Weight:</span>
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value={mockOverlayWeight}
                    onChange={e => setMockOverlayWeight(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-appBg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-appText-muted uppercase tracking-wider block">Simulated Mocks Registry</span>
              
              {/* Mock Tests List */}
              <div className="max-h-28 overflow-y-auto space-y-1.5 border border-appBorder/50 rounded-xl p-2 bg-appBg-secondary/20">
                {mockTests.map(mock => (
                  <div key={mock.id} className="flex justify-between items-center p-2 rounded-lg bg-cardBg-default border border-appBorder/50 text-xs">
                    <div>
                      <span className="font-bold text-appText-primary block">{mock.name}</span>
                      <span className="text-[10px] text-appText-muted">{mock.date}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <span className="text-appText-secondary block text-[10px]">V:{mock.varc} D:{mock.dilr} Q:{mock.qa}</span>
                        <span className="font-bold text-[#F59E0B]">Total: {mock.varc + mock.dilr + mock.qa}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteMock(mock.id)}
                        className="text-rose-500 hover:text-rose-700 font-bold px-1 rounded cursor-pointer"
                        title="Delete mockup test"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {mockTests.length === 0 && (
                  <p className="text-[10px] text-appText-muted text-center py-4">No mock tests added in sandbox yet.</p>
                )}
              </div>
              
              {/* Add Simulated Score Form */}
              <div className="grid gap-2 border border-appBorder/50 rounded-xl p-2.5 bg-appBg-secondary/15">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Mock Test Name"
                    value={newMockName}
                    onChange={e => setNewMockName(e.target.value)}
                    className="p-1.5 border border-appBorder rounded text-xs bg-cardBg-default text-appText-primary font-medium"
                  />
                  <input
                    type="date"
                    value={newMockDate}
                    onChange={e => setNewMockDate(e.target.value)}
                    className="p-1.5 border border-appBorder rounded text-xs bg-cardBg-default text-appText-primary font-medium"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="VARC"
                    value={newMockVarc}
                    onChange={e => setNewMockVarc(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 border border-appBorder rounded text-xs text-center bg-cardBg-default text-appText-primary font-mono"
                  />
                  <input
                    type="number"
                    placeholder="DILR"
                    value={newMockDilr}
                    onChange={e => setNewMockDilr(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 border border-appBorder rounded text-xs text-center bg-cardBg-default text-appText-primary font-mono"
                  />
                  <input
                    type="number"
                    placeholder="QA"
                    value={newMockQa}
                    onChange={e => setNewMockQa(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-1.5 border border-appBorder rounded text-xs text-center bg-cardBg-default text-appText-primary font-mono"
                  />
                  <button
                    onClick={handleAddMock}
                    className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-650 text-white rounded text-xs font-bold transition duration-200 cursor-pointer shadow-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-2 text-[10px] text-appText-disabled font-mono border-t border-appBorder/50 mt-4">
            Sandbox handles direct mock integrations before SQLite migration mapping in Phase 2.
          </div>
        </div>
      </div>

    </div>
  )
}
