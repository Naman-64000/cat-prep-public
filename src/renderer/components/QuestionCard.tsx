import { useEffect, useState, useRef } from 'react'
import SolutionViewer from './SolutionViewer'
import { SECTION_FLAIRS, QUANTS_TOPIC_MAP, LRDI_TOPIC_MAP, VARC_TOPIC_MAP } from '../utils/constants'

const formatFileUrl = (pathStr: string) => {
  if (!pathStr) return ''
  const normalized = pathStr.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}


type QuestionCardProps = {
  id: number
  section: string
  imagePaths: string[]
  solution: string | null
  generationCount: number
  bookmarked: boolean
  notes: string
  flairs: string
  subtopic: string
  topic: string
  createdAt: string
  onGenerateSolution: (id: number, regenerate?: boolean) => Promise<any>
  onBookmark: (id: number, value: boolean) => Promise<void>
  onUpdateNotes: (id: number, notes: string, flairs: string) => Promise<void>
  onUpdateTopic: (id: number, subtopic: string, topic: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onPreview: (imagePaths: string[]) => void
  onAddImages: (id: number, files: File[]) => Promise<void>
}

const sectionCardStyles = {
  VARC: {
    badge: 'bg-[#3B82F6]/[0.05] border-[#3B82F6]/20 text-[#3B82F6] dark:text-[#60A5FA]',
    primaryButton: 'bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white shadow-sm hover:opacity-90',
    activeAction: 'bg-[#3B82F6]/[0.08] border-[#3B82F6]/30 text-[#3B82F6] dark:text-[#60A5FA]'
  },
  LRDI: {
    badge: 'bg-[#8B5CF6]/[0.05] border-[#8B5CF6]/20 text-[#8B5CF6] dark:text-[#A78BFA]',
    primaryButton: 'bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] text-white shadow-sm hover:opacity-90',
    activeAction: 'bg-[#8B5CF6]/[0.08] border-[#8B5CF6]/30 text-[#8B5CF6] dark:text-[#A78BFA]'
  },
  QUANTS: {
    badge: 'bg-[#10B981]/[0.05] border-[#10B981]/20 text-[#10B981] dark:text-[#34D399]',
    primaryButton: 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white shadow-sm hover:opacity-90',
    activeAction: 'bg-[#10B981]/[0.08] border-[#10B981]/30 text-[#10B981] dark:text-[#34D399]'
  }
}


function QuestionCard({
  id,
  section,
  imagePaths,
  solution,
  generationCount,
  bookmarked,
  notes,
  flairs,
  subtopic,
  topic,
  createdAt,
  onGenerateSolution,
  onBookmark,
  onUpdateNotes,
  onUpdateTopic,
  onDelete,
  onPreview,
  onAddImages
}: QuestionCardProps) {
  const [loading, setLoading] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notesText, setNotesText] = useState(notes)
  const [selectedFlairs, setSelectedFlairs] = useState<string[]>(() => {
    return flairs ? flairs.split(',').filter(Boolean) : []
  })
  const [saving, setSaving] = useState(false)
  const [dotCount, setDotCount] = useState(0)
  const [showQuickFlairs, setShowQuickFlairs] = useState(false)
  const [showTopicPopover, setShowTopicPopover] = useState(false)
  const [activeSubtopic, setActiveSubtopic] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const quickFlairsRef = useRef<HTMLDivElement>(null)
  const topicRef = useRef<HTMLDivElement>(null)

  async function handleAddMoreClick(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const response: any = await window.electron.invoke('app:selectImages')
      if (response && response.success && response.files) {
        const reconstructedFiles = response.files.map((fileData: any) => {
          return new File([fileData.buffer], fileData.name, { type: fileData.mimeType })
        })
        if (reconstructedFiles.length > 0) {
          onAddImages(id, reconstructedFiles)
        }
      }
    } catch (err: any) {
      console.error('Add more images error:', err)
    }
  }

  const cardStyle = sectionCardStyles[section as keyof typeof sectionCardStyles] || sectionCardStyles.VARC

  const topicMap =
    section === 'VARC'
      ? VARC_TOPIC_MAP
      : section === 'LRDI'
      ? LRDI_TOPIC_MAP
      : QUANTS_TOPIC_MAP

  const activeStyle =
    section === 'VARC'
      ? 'bg-[#3B82F6] border-[#2563EB] text-white dark:bg-[#2563EB] dark:border-[#1D4ED8]'
      : section === 'LRDI'
      ? 'bg-[#8B5CF6] border-[#7C3AED] text-white dark:bg-[#7C3AED] dark:border-[#6D28D9]'
      : 'bg-emerald-600 border-emerald-500 text-white dark:bg-emerald-700 dark:border-emerald-600'

  useEffect(() => {
    setNotesText(notes)
  }, [notes])

  useEffect(() => {
    setSelectedFlairs(flairs ? flairs.split(',').filter(Boolean) : [])
  }, [flairs])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickFlairsRef.current && !quickFlairsRef.current.contains(event.target as Node)) {
        setShowQuickFlairs(false)
      }
      if (topicRef.current && !topicRef.current.contains(event.target as Node)) {
        setShowTopicPopover(false)
        setActiveSubtopic(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleGenerate() {
    setLoading(true)
    await onGenerateSolution(id)
    setLoading(false)
    setShowSolution(true)
  }

  async function handleRegenerate() {
    setLoading(true)
    await onGenerateSolution(id, true)
    setLoading(false)
  }

  function handleBookmark() {
    onBookmark(id, !bookmarked)
  }

  function handleDelete() {
    onDelete(id)
  }

  function handlePreview() {
    onPreview(imagePaths)
  }

  function handleToggleFlair(flair: string) {
    setSelectedFlairs((prev) =>
      prev.includes(flair) ? prev.filter((f) => f !== flair) : [...prev, flair]
    )
  }

  async function handleToggleQuickFlair(flair: string) {
    const isSelected = selectedFlairs.includes(flair)
    const newFlairs = isSelected
      ? selectedFlairs.filter((f) => f !== flair)
      : [...selectedFlairs, flair]
    setSelectedFlairs(newFlairs)
    try {
      await onUpdateNotes(id, notes, newFlairs.join(','))
    } catch (e) {
      // Handled in SectionPage
    }
  }

  async function handleSaveNotes() {
    setSaving(true)
    try {
      const flairsString = selectedFlairs.join(',')
      await onUpdateNotes(id, notesText, flairsString)
      setShowNotes(false)
    } catch (error) {
      // Handled in SectionPage toast
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      setDotCount(0)
      return
    }
    const timer = window.setInterval(() => {
      setDotCount((count) => (count + 1) % 4)
    }, 400)
    return () => window.clearInterval(timer)
  }, [loading])

  const dotString = '.'.repeat(dotCount === 0 ? 1 : dotCount)

  return (
    <div
      tabIndex={0}
      onPaste={async (e) => {
        if (!solution && section !== 'QUANTS') {
          const items = Array.from(e.clipboardData.items)
          const files = items
            .map(item => item.getAsFile())
            .filter((file): file is File => file !== null && file.type.startsWith('image/'))
          if (files.length > 0) {
            e.preventDefault()
            e.stopPropagation()
            onAddImages(id, files)
          }
        }
      }}
      className={`group relative rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/25 ${
        showQuickFlairs || showNotes || showTopicPopover ? 'z-30' : 'z-10 hover:z-20'
      }`}
    >
      <button
        type="button"
        onClick={handleDelete}
        className="absolute right-3 top-3 z-25 rounded-full border border-appBorder bg-cardBg-default px-2 py-1 text-[10px] text-appText-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
        aria-label="Delete question"
      >
        ✕
      </button>
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col gap-2 self-start">
          <div
            className={`relative overflow-hidden rounded-xl border bg-white dark:bg-slate-950 flex items-center justify-center transition-all duration-200 ${
              dragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-appBorder'
            }`}
            onDragOver={(e) => {
              if (!solution && section !== 'QUANTS') {
                e.preventDefault()
                setDragging(true)
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (e) => {
              if (!solution && section !== 'QUANTS') {
                e.preventDefault()
                setDragging(false)
                const files = Array.from(e.dataTransfer.files)
                const imageFiles = files.filter(f => f.type.startsWith('image/'))
                if (imageFiles.length > 0) {
                  onAddImages(id, imageFiles)
                }
              }
            }}
          >
            <button
              type="button"
              onClick={handlePreview}
              className="absolute inset-0 z-10 bg-transparent cursor-pointer"
              aria-label="Preview question images"
            />
            <img src={formatFileUrl(imagePaths[0])} alt="Question" className="h-40 w-full object-contain p-1" />
            {imagePaths.length > 1 && (
              <span className="absolute right-2 top-2 rounded-full bg-appBg-secondary/90 px-2.5 py-0.5 text-[9px] font-bold text-appText-secondary">
                {imagePaths.length} IMAGES
              </span>
            )}
            {dragging && (
              <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-20">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-lg px-2 py-1 shadow-sm">
                  Drop Image
                </span>
              </div>
            )}
          </div>
          {!solution && section !== 'QUANTS' && imagePaths.length < 6 && (
            <button
              type="button"
              onClick={handleAddMoreClick}
              className="w-full rounded-xl border border-dashed border-appBorder bg-appBg-secondary hover:bg-cardBg-hover hover:border-slate-400 text-[10px] font-bold py-1.5 transition text-appText-secondary cursor-pointer select-none"
            >
              + Add Image
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cardStyle.badge}`}>
                {section}
              </span>
              {flairs && flairs.split(',').filter(Boolean).map(flair => (
                <span key={flair} className="rounded-full bg-sky-500/[0.08] border border-sky-500/20 text-sky-600 dark:text-sky-400 px-2.5 py-0.5 text-[9px] font-semibold select-none">
                  {flair}
                </span>
              ))}
              {['QUANTS', 'LRDI', 'VARC'].includes(section) && topic && (
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide select-none border ${
                  section === 'VARC'
                    ? 'bg-blue-500/[0.08] border-blue-500/20 text-blue-600 dark:text-blue-400'
                    : section === 'LRDI'
                    ? 'bg-purple-500/[0.08] border-purple-500/20 text-purple-600 dark:text-purple-400'
                    : 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {subtopic} › {topic}
                </span>
              )}
            </div>
            <span className="mr-8 text-[10px] text-appText-disabled font-mono">
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!solution && (
              <button
                type="button"
                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${cardStyle.primaryButton}`}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? `Generating${dotString}` : 'Generate Solution'}
              </button>
            )}
            {solution && (
              <button
                type="button"
                className="rounded-xl border border-appBorder bg-appBg-secondary text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary px-4 py-1.5 text-xs font-bold transition duration-200 cursor-pointer"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? 'Hide Solution' : 'Show Solution'}
              </button>
            )}
            <button
              type="button"
              className={`rounded-xl border px-4 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                bookmarked
                  ? cardStyle.activeAction
                  : 'border-appBorder bg-appBg-secondary text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
              }`}
              onClick={handleBookmark}
              title={bookmarked ? 'Unbookmark' : 'Bookmark'}
            >
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button
              type="button"
              className={`rounded-xl border px-4 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                showNotes
                  ? cardStyle.activeAction
                  : 'border-appBorder bg-appBg-secondary text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
              }`}
              onClick={() => {
                setShowNotes(!showNotes)
                if (!showNotes) {
                  setNotesText(notes)
                  setSelectedFlairs(flairs ? flairs.split(',').filter(Boolean) : [])
                }
              }}
            >
              {notes || flairs ? 'Add Note ✓' : 'Add Note'}
            </button>
            <div className="relative inline-block" ref={quickFlairsRef}>
              <button
                type="button"
                className={`rounded-xl border px-4 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                  showQuickFlairs
                    ? cardStyle.activeAction
                    : 'border-appBorder bg-appBg-secondary text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                }`}
                onClick={() => setShowQuickFlairs(!showQuickFlairs)}
              >
                {flairs ? `Flairs (${flairs.split(',').filter(Boolean).length})` : 'Flairs'}
              </button>
              {showQuickFlairs && (
                <div className="absolute left-full top-0 ml-2 z-40 w-64 rounded-xl border border-appBorder bg-cardBg-default p-3 shadow-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-appBorder pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted">Assign Flairs</span>
                    <button type="button" onClick={() => setShowQuickFlairs(false)} className="text-[10px] text-appText-muted hover:text-appText-primary font-bold cursor-pointer">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(SECTION_FLAIRS[section as keyof typeof SECTION_FLAIRS] || []).map(flair => {
                      const isSelected = selectedFlairs.includes(flair)
                      return (
                        <button
                          type="button"
                          key={flair}
                          onClick={() => handleToggleQuickFlair(flair)}
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                            isSelected
                              ? 'bg-sky-500 border-sky-400 text-white dark:bg-sky-600 dark:border-sky-500'
                              : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                          }`}
                        >
                          {flair}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {['QUANTS', 'LRDI', 'VARC'].includes(section) && (
              <div className="relative inline-block" ref={topicRef}>
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                    showTopicPopover
                      ? cardStyle.activeAction
                      : 'border-appBorder bg-appBg-secondary text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                  }`}
                  onClick={() => {
                    setShowTopicPopover(!showTopicPopover)
                    setActiveSubtopic(null)
                  }}
                >
                  {topic ? `${subtopic} › ${topic}` : 'Topic'}
                </button>
                {showTopicPopover && (
                  <div className="absolute left-0 mt-2 z-40 w-64 rounded-xl border border-appBorder bg-cardBg-default p-3 shadow-xl space-y-2">
                    <div className="flex items-center justify-between border-b border-appBorder pb-2">
                      <div className="flex items-center gap-1.5">
                        {activeSubtopic && (
                          <button
                            type="button"
                            onClick={() => setActiveSubtopic(null)}
                            className="text-xs text-appText-muted hover:text-appText-primary font-bold cursor-pointer pr-1"
                            title="Back to subtopics"
                          >
                            ←
                          </button>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted">
                          {activeSubtopic ? `${activeSubtopic} Topics` : 'Assign Topic'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {topic && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onUpdateTopic(id, '', '')
                              setShowTopicPopover(false)
                              setActiveSubtopic(null)
                            }}
                            className="text-[9px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            Clear Topic
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowTopicPopover(false)
                            setActiveSubtopic(null)
                          }}
                          className="text-[10px] text-appText-muted hover:text-appText-primary font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {!activeSubtopic && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(topicMap).map((sub) => {
                          const isCurrentSubtopic = subtopic === sub
                          return (
                            <button
                              type="button"
                              key={sub}
                              onClick={() => setActiveSubtopic(sub)}
                              className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                                isCurrentSubtopic
                                  ? activeStyle
                                  : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
                              }`}
                            >
                              {sub}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {activeSubtopic && (
                      <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
                        {((topicMap as any)[activeSubtopic] || []).map((t: any) => {
                          const isCurrentTopic = topic === t
                          return (
                            <button
                              type="button"
                              key={t}
                              onClick={async () => {
                                await onUpdateTopic(id, activeSubtopic, t)
                                setShowTopicPopover(false)
                                setActiveSubtopic(null)
                              }}
                              className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                                isCurrentTopic
                                  ? activeStyle
                                  : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover hover:text-appText-primary'
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
            )}
          </div>

          {showSolution && solution && (
            <div className="space-y-3">
              <SolutionViewer solution={solution} />
              {generationCount < 2 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRegenerate}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${cardStyle.primaryButton}`}
                  >
                    {loading ? `Regenerating${dotString}` : 'Regenerate Solution'}
                  </button>
                </div>
              )}
            </div>
          )}

          {showNotes && (
            <div className="rounded-xl border border-appBorder bg-appBg-secondary p-3 space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">Notes Text</span>
                <div className="relative">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    maxLength={200}
                    className="w-full min-h-[60px] rounded-xl border border-appBorder bg-cardBg-default p-2.5 text-xs text-appText-primary outline-none focus:border-indigo-500/50 transition resize-y font-sans leading-normal pr-16"
                    placeholder="Type key formulas, logical patterns, shortcuts or explanations..."
                    disabled={saving}
                  />
                  <span className={`absolute bottom-2.5 right-3 text-[10px] font-bold font-mono ${
                    notesText.length >= 180 ? 'text-rose-500' : 'text-appText-muted'
                  }`}>
                    {notesText.length}/200
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1.5 border-t border-appBorder">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotes(false)
                    setNotesText(notes)
                    setSelectedFlairs(flairs ? flairs.split(',').filter(Boolean) : [])
                  }}
                  className="rounded-full border border-appBorder bg-cardBg-default px-4 py-1.5 text-[10px] font-semibold text-appText-secondary hover:bg-cardBg-hover transition cursor-pointer"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="rounded-full bg-slate-900 dark:bg-indigo-650 hover:bg-slate-800 dark:hover:bg-indigo-600 text-white px-4 py-1.5 text-[10px] font-semibold transition cursor-pointer"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          {notes && !showNotes && (
            <p className="mt-3.5 pl-2 text-xs text-appText-secondary leading-relaxed whitespace-pre-wrap">
              {notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuestionCard
