import { useEffect, useMemo, useState } from 'react'
import UploadZone from './UploadZone'
import QuestionCard from './QuestionCard'
import SearchFilterBar from './SearchFilterBar'
import NotificationToast from './NotificationToast'
import useClipboardPaste from '../hooks/useClipboardPaste'
import { SectionFilter } from '../utils/constants'
import TodoList from './TodoList'

const formatFileUrl = (pathStr: string) => {
  if (!pathStr) return ''
  const normalized = pathStr.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}


export type QuestionRecord = {
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
  updatedAt: string
}

type PredictedSection = 'VARC' | 'LRDI' | 'QUANTS'

type SectionPageProps = {
  section: 'VARC' | 'LRDI' | 'QUANTS'
}

function SectionPage({ section }: SectionPageProps) {
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [filter, setFilter] = useState<SectionFilter>('ALL')
  const [selectedFlairs, setSelectedFlairs] = useState<string[]>([])
  const [selectedSubtopicFilter, setSelectedSubtopicFilter] = useState<string | null>(null)
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewIndex, setPreviewIndex] = useState<number>(0)
  const [suggestedMove, setSuggestedMove] = useState<{ questionId: number; predictedSection: PredictedSection } | null>(null)

  useEffect(() => {
    fetchQuestions()
    setSelectedFlairs([])
    setSelectedSubtopicFilter(null)
    setSelectedTopicFilter(null)
  }, [section])

  useEffect(() => {
    if (previewImages.length === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImages([])
      } else if (e.key === 'ArrowRight') {
        setPreviewIndex((prev) => (prev + 1) % previewImages.length)
      } else if (e.key === 'ArrowLeft') {
        setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewImages])

  async function fetchQuestions() {
    const response: any = await window.electron.invoke('question:list', section)
    if (response.success) {
      setQuestions(response.questions)
    } else {
      setMessage(`Unable to load questions: ${response.error}`)
    }
  }

  async function handleAddImages(questionId: number, files: File[]) {
    const limits = { VARC: 6, LRDI: 6, QUANTS: 1 } as Record<string, number>
    const maxFiles = limits[section] || 1
    const question = questions.find((q) => q.id === questionId)
    if (!question) return

    const currentCount = question.imagePaths.length
    if (currentCount + files.length > maxFiles) {
      setMessage(`Cannot add images: ${section} questions support up to ${maxFiles} images.`)
      return
    }

    const imageFiles = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        imageBuffer: new Uint8Array(await file.arrayBuffer())
      }))
    )

    const response: any = await window.electron.invoke('question:addImages', {
      questionId,
      imageFiles
    })

    if (response.success) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? response.question : q))
      )
      setMessage('Images added successfully.')
    } else {
      setMessage(`Failed to add images: ${response.error}`)
    }
  }

  async function handleUpload(files: File[]) {
    const limits = { VARC: 6, LRDI: 6, QUANTS: 1 } as Record<string, number>
    const maxFiles = limits[section] || 1

    const unsolvedQuestion = [...questions]
      .reverse()
      .find((q) => q.section === section && !q.solution)

    let filesToAppend: File[] = []
    let filesToCreate: File[] = []

    if (unsolvedQuestion && section !== 'QUANTS') {
      const availableSlots = maxFiles - unsolvedQuestion.imagePaths.length
      if (availableSlots > 0) {
        filesToAppend = files.slice(0, availableSlots)
        filesToCreate = files.slice(availableSlots)
      } else {
        filesToCreate = files
      }
    } else {
      filesToCreate = files
    }

    if (filesToAppend.length > 0) {
      const appendImageFiles = await Promise.all(
        filesToAppend.map(async (file) => ({
          fileName: file.name,
          imageBuffer: new Uint8Array(await file.arrayBuffer())
        }))
      )
      const appendResponse: any = await window.electron.invoke('question:addImages', {
        questionId: unsolvedQuestion.id,
        imageFiles: appendImageFiles
      })
      if (appendResponse.success) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === unsolvedQuestion.id ? appendResponse.question : q))
        )
        setMessage('Image(s) appended to the unsolved question successfully.')
      } else {
        setMessage(`Failed to append images: ${appendResponse.error}`)
      }
    }

    if (filesToCreate.length > 0) {
      let remaining = filesToCreate
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, maxFiles)
        remaining = remaining.slice(maxFiles)

        const imageFiles = await Promise.all(
          chunk.map(async (file) => ({
            fileName: file.name,
            imageBuffer: new Uint8Array(await file.arrayBuffer())
          }))
        )

        const createResponse: any = await window.electron.invoke('question:create', {
          section,
          imageFiles
        })

        if (createResponse.success) {
          setQuestions((prev) => [...prev, createResponse.question])
          setMessage('Uploaded successfully. Select a question to generate a solution.')
        } else {
          setMessage(`Upload failed: ${createResponse.error}`)
          break
        }
      }
    }
  }

  const handleClipboardPaste = async (file: File) => {
    await handleUpload([file])
  }

  useClipboardPaste(handleClipboardPaste, (message) => setMessage(message))

  async function handleGenerateSolution(id: number, regenerate?: boolean) {
    const response: any = await window.electron.invoke('question:generateSolution', id, regenerate)
    if (response.success) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                solution: response.solution,
                generationCount: response.question?.generationCount ?? q.generationCount,
                subtopic: response.question?.subtopic || q.subtopic,
                topic: response.question?.topic || q.topic
              }
            : q
        )
      )
      if (response.predictedSection && response.predictedSection !== section) {
        setSuggestedMove({ questionId: id, predictedSection: response.predictedSection })
      }
      return true
    }
    if (response.error && response.error.includes('Please enter a valid gemini key in Study Tracker page.')) {
      setMessage('Please enter a valid Gemini API key in the Settings page.')
    } else {
      setMessage(`Gemini error: ${response.error}`)
    }
    return false
  }

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesFilter =
        filter === 'ALL' ||
        filter === 'FLAIR' ||
        filter === 'TOPIC' ||
        (filter === 'SOLVED' && question.solution) ||
        (filter === 'UNSOLVED' && !question.solution) ||
        (filter === 'BOOKMARKED' && question.bookmarked)

      const questionFlairs = question.flairs ? question.flairs.split(',').filter(Boolean) : []
      const matchesFlairs =
        filter !== 'FLAIR' ||
        selectedFlairs.length === 0 ||
        selectedFlairs.some((f) => questionFlairs.includes(f))

      const matchesTopic =
        filter !== 'TOPIC' ||
        (!selectedSubtopicFilter && !selectedTopicFilter) ||
        (selectedSubtopicFilter && !selectedTopicFilter && question.subtopic === selectedSubtopicFilter) ||
        (selectedSubtopicFilter && selectedTopicFilter && question.subtopic === selectedSubtopicFilter && question.topic === selectedTopicFilter)

      return matchesFilter && matchesFlairs && matchesTopic
    })
  }, [questions, filter, selectedFlairs, selectedSubtopicFilter, selectedTopicFilter])

  async function handleBookmark(id: number, value: boolean) {
    const response: any = await window.electron.invoke('question:bookmark', id, value)
    if (response.success) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? response.question : q)))
    } else {
      setMessage(`Bookmark update failed: ${response.error}`)
    }
  }

  async function handleUpdateNotes(id: number, notes: string, flairs: string) {
    const response: any = await window.electron.invoke('question:updateNotes', id, notes, flairs)
    if (response.success) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? response.question : q)))
    } else {
      setMessage(`Notes update failed: ${response.error}`)
      throw new Error(response.error)
    }
  }

  async function handleUpdateTopic(id: number, subtopic: string, topic: string) {
    const response: any = await window.electron.invoke('question:updateTopic', id, subtopic, topic)
    if (response.success) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? response.question : q)))
    } else {
      setMessage(`Topic update failed: ${response.error}`)
      throw new Error(response.error)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('This will remove the question and solution permanently. Continue?')) {
      return
    }
    const response: any = await window.electron.invoke('question:delete', id)
    if (response.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      setMessage('Question removed permanently.')
    } else {
      setMessage(`Remove failed: ${response.error}`)
    }
  }

  function handlePreview(imagePaths: string[]) {
    setPreviewImages(imagePaths)
    setPreviewIndex(0)
  }

  async function handleMoveSection(questionId: number, newSection: PredictedSection) {
    const response: any = await window.electron.invoke('question:moveSection', questionId, newSection)
    if (response.success) {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      setSuggestedMove(null)
      setMessage(`Question moved to ${newSection}.`)
    } else {
      setMessage(`Move failed: ${response.error}`)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-colors duration-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-appText-primary">
              {filter === 'TODO' ? `${section} To-Do List` : `${section} Questions`}
            </h2>
            <p className="mt-0.5 text-[10px] text-appText-muted">
              {filter === 'TODO'
                ? `Plan and organize your tasks for the ${section} section.`
                : 'Upload images to save questions and generate AI solutions.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFilter(filter === 'TODO' ? 'ALL' : 'TODO')}
            className={`rounded-xl px-4 py-2 text-[10px] font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer border select-none h-fit self-start sm:self-center ${
              filter === 'TODO'
                ? 'bg-sky-500 border-sky-500 text-white dark:bg-sky-600 dark:border-sky-600 shadow-sky-500/10'
                : 'bg-sky-500/[0.06] border-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/[0.12] hover:border-sky-500/30'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>To do list</span>
          </button>
        </div>

        {filter !== 'TODO' && (
          <div className="mt-4 space-y-4">
            <UploadZone
              section={section}
              onUpload={handleUpload}
              onError={(message) => setMessage(message)}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <SearchFilterBar
                filter={filter}
                section={section}
                selectedFlairs={selectedFlairs}
                selectedSubtopicFilter={selectedSubtopicFilter}
                selectedTopicFilter={selectedTopicFilter}
                onFilterChange={setFilter}
                onSelectedFlairsChange={setSelectedFlairs}
                onSelectedTopicFilterChange={(subtopic, topic) => {
                  setSelectedSubtopicFilter(subtopic)
                  setSelectedTopicFilter(topic)
                }}
              />
            </div>
          </div>
        )}
      </section>

      {message && (
        <NotificationToast
          message={message}
          type={
            message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('failed') ||
            message.toLowerCase().includes('unable') ||
            message.toLowerCase().includes('gemini key') ||
            message.toLowerCase().includes('incorrect') ||
            message.toLowerCase().includes('invalid')
              ? 'error'
              : 'success'
          }
          onClose={() => setMessage(null)}
        />
      )}

      {suggestedMove && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 text-amber-800 dark:text-amber-100 transition-colors duration-200">
          <p className="text-xs font-semibold">This question is probably of the {suggestedMove.predictedSection} section.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-500 cursor-pointer"
              onClick={() => handleMoveSection(suggestedMove.questionId, suggestedMove.predictedSection)}
            >
              Yes, move it
            </button>
            <button
              type="button"
              className="rounded-full border border-amber-500 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-100 transition hover:bg-amber-500/10 cursor-pointer"
              onClick={() => setSuggestedMove(null)}
            >
              No, keep it here
            </button>
          </div>
        </div>
      )}

      {filter === 'TODO' ? (
        <TodoList section={section} />
      ) : (
        <section className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-appBorder bg-cardBg-default p-8 text-center text-xs text-appText-muted italic">
              No questions found. Upload an image to begin.
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                id={question.id}
                section={question.section}
                imagePaths={question.imagePaths}
                solution={question.solution}
                generationCount={question.generationCount}
                bookmarked={question.bookmarked}
                notes={question.notes}
                flairs={question.flairs}
                subtopic={question.subtopic}
                topic={question.topic}
                createdAt={question.createdAt}
                onGenerateSolution={handleGenerateSolution}
                onBookmark={handleBookmark}
                onUpdateNotes={handleUpdateNotes}
                onUpdateTopic={handleUpdateTopic}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onAddImages={handleAddImages}
              />
            ))
          )}
        </section>
      )}

      {previewImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-md p-6 cursor-pointer"
          onClick={() => setPreviewImages([])}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-appBorder bg-cardBg-default shadow-glow flex flex-col items-center justify-center p-4 cursor-default transition-all duration-200 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-50 rounded-full border border-appBorder bg-appBg-secondary px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-appText-secondary hover:text-appText-primary hover:bg-cardBg-hover transition cursor-pointer"
              onClick={() => setPreviewImages([])}
            >
              Close
            </button>

            {previewImages.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)}
                className="absolute left-4 md:-left-14 top-1/2 -translate-y-1/2 z-30 rounded-full border border-appBorder bg-cardBg-default p-3 text-appText-secondary hover:text-appText-primary hover:bg-cardBg-hover hover:scale-105 active:scale-95 transition cursor-pointer select-none shadow-md"
                aria-label="Previous image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <div className="w-full h-[75vh] flex items-center justify-center bg-appBg-secondary/50 rounded-xl border border-appBorder/50 p-2 overflow-hidden">
              <img src={formatFileUrl(previewImages[previewIndex])} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg select-none shadow-sm" />
            </div>

            {previewImages.length > 1 && (
              <button
                type="button"
                onClick={() => setPreviewIndex((prev) => (prev + 1) % previewImages.length)}
                className="absolute right-4 md:-right-14 top-1/2 -translate-y-1/2 z-30 rounded-full border border-appBorder bg-cardBg-default p-3 text-appText-secondary hover:text-appText-primary hover:bg-cardBg-hover hover:scale-105 active:scale-95 transition cursor-pointer select-none shadow-md"
                aria-label="Next image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {previewImages.length > 1 && (
              <div className="mt-3 px-3 py-1 rounded-full bg-appBg-secondary border border-appBorder text-[10px] font-mono font-bold text-appText-muted select-none">
                {previewIndex + 1} / {previewImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SectionPage
