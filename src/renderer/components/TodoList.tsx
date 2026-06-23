import { useEffect, useState, useMemo } from 'react'
import NotificationToast from './NotificationToast'

type TodoTask = {
  id: string
  text: string
  tag: string
  date: string
  timeSlot: string
  completed: boolean
}

const formatAndValidateTime = (timeStr: string): string | null => {
  const trimmed = timeStr.trim().toUpperCase()
  // Matches hh:mm AM/PM or hh:mmAM/PM (hour: 00-12, minute: 00-59)
  const match = trimmed.match(/^(0[0-9]|1[0-2]|[0-9]):([0-5][0-9])\s*(AM|PM)$/)
  if (!match) return null
  
  const hour = match[1].padStart(2, '0')
  const minute = match[2]
  const period = match[3]
  return `${hour}:${minute} ${period}`
}

const getDefaultTimes = () => {
  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()

  const formatDefaultTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    let displayHours = h % 12
    if (displayHours === 0) {
      displayHours = 12
    }
    const hh = displayHours.toString().padStart(2, '0')
    const mm = m.toString().padStart(2, '0')
    return `${hh}:${mm} ${period}`
  }

  return {
    from: formatDefaultTime(currentHours, currentMinutes),
    to: formatDefaultTime((currentHours + 1) % 24, currentMinutes),
  }
}

type TodoListProps = {
  section: 'VARC' | 'LRDI' | 'QUANTS'
}

function TodoList({ section }: TodoListProps) {
  const [tasks, setTasks] = useState<TodoTask[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().slice(0, 10))
  
  // Time Slot States
  const [startTime, setStartTime] = useState(() => {
    const times = getDefaultTimes()
    return times.from
  })
  const [endTime, setEndTime] = useState(() => {
    const times = getDefaultTimes()
    return times.to
  })

  const isStartValid = useMemo(() => {
    return formatAndValidateTime(startTime) !== null
  }, [startTime])

  const isEndValid = useMemo(() => {
    return formatAndValidateTime(endTime) !== null
  }, [endTime])

  const handleTimeChange = (val: string, setter: (v: string) => void) => {
    const cleaned = val.toUpperCase().replace(/[^0-9: AMP]/g, '')
    setter(cleaned)
  }

  const [customTagInput, setCustomTagInput] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const placeholderText = useMemo(() => {
    if (section === 'VARC') return 'Solve 3 RC Passage. Read an aeon article.'
    if (section === 'LRDI') return 'Solve 2 sets. Give a sectional mock.'
    if (section === 'QUANTS') return 'Watch arithmetic video. Do the sectional mock analysis.'
    return 'Describe the task (1-2 sentences)...'
  }, [section])

  const defaultTags = useMemo(() => {
    if (section === 'VARC') return ['RC', 'mock']
    if (section === 'LRDI') return ['mock']
    if (section === 'QUANTS') return ['arithmetic', 'mock']
    return ['mock']
  }, [section])

  useEffect(() => {
    const savedTasks = localStorage.getItem(`todo-tasks-${section}`)
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks))
      } catch (e) {
        console.error('Error parsing todo tasks from localStorage:', e)
      }
    } else {
      setTasks([])
    }

    const savedTags = localStorage.getItem(`todo-tags-${section}`)
    if (savedTags) {
      try {
        setTags(JSON.parse(savedTags))
      } catch (e) {
        console.error('Error parsing todo tags from localStorage:', e)
        setTags(defaultTags)
      }
    } else {
      setTags(defaultTags)
      localStorage.setItem(`todo-tags-${section}`, JSON.stringify(defaultTags))
    }

    // Reset inputs
    setNewTaskText('')
    setSelectedTag('')
    setCustomTagInput('')
    const times = getDefaultTimes()
    setStartTime(times.from)
    setEndTime(times.to)
    setTaskDate(new Date().toISOString().slice(0, 10))
  }, [section, defaultTags])

  const saveTasks = (updatedTasks: TodoTask[]) => {
    setTasks(updatedTasks)
    localStorage.setItem(`todo-tasks-${section}`, JSON.stringify(updatedTasks))
  }

  const saveTags = (updatedTags: string[]) => {
    setTags(updatedTags)
    localStorage.setItem(`todo-tags-${section}`, JSON.stringify(updatedTags))
  }

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTag = customTagInput.trim()
    if (!cleanTag) return

    if (tags.includes(cleanTag)) {
      setCustomTagInput('')
      return
    }

    const updatedTags = [...tags, cleanTag]
    saveTags(updatedTags)
    setSelectedTag(cleanTag)
    setCustomTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove)
    saveTags(updatedTags)
    if (selectedTag === tagToRemove) {
      setSelectedTag('')
    }
  }

  const handleAddTask = () => {
    const textClean = newTaskText.trim()
    if (!textClean) {
      alert('Please enter a task description.')
      return
    }

    const validStart = formatAndValidateTime(startTime)
    const validEnd = formatAndValidateTime(endTime)

    if (!validStart) {
      alert('Please enter a valid start time in HH:MM AM/PM format (between 00:00 and 12:59).')
      return
    }
    if (!validEnd) {
      alert('Please enter a valid end time in HH:MM AM/PM format (between 00:00 and 12:59).')
      return
    }

    const finalTimeSlot = `${validStart} - ${validEnd}`

    const newTask: TodoTask = {
      id: Date.now().toString(),
      text: textClean,
      tag: selectedTag || 'General',
      date: taskDate,
      timeSlot: finalTimeSlot,
      completed: false,
    }

    const updatedTasks = [newTask, ...tasks]
    saveTasks(updatedTasks)
    setNewTaskText('')
  }

  const handleToggleTask = (id: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === id) {
        const nextState = !task.completed
        if (nextState) {
          setToastMessage('Task completed! Remember to upload this session to your Study Tracker.')
        }
        return { ...task, completed: nextState }
      }
      return task
    })
    saveTasks(updatedTasks)
  }

  const handleDeleteTask = (id: string) => {
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this task?')
    if (confirmDelete) {
      const updatedTasks = tasks.filter((task) => task.id !== id)
      saveTasks(updatedTasks)
    }
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Create Todo Task Form */}
      <section className="rounded-2xl border border-appBorder bg-cardBg-default p-5 shadow-sm transition-all duration-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-appText-primary mb-3">Add New Task</h3>
        <div className="space-y-4">
          {/* Task Description */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">
              Task Description (1-2 sentences)
            </span>
            <textarea
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder={placeholderText}
              rows={2}
              className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3.5 py-2 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 resize-none font-sans"
            />
          </div>

          {/* Date & Time Slot Row */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 w-36 shrink-0">
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">
                Assign Date
              </span>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full rounded-xl border border-appBorder bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 cursor-pointer"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">
                from
              </span>
              <input
                type="text"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                onBlur={() => {
                  const formatted = formatAndValidateTime(startTime)
                  if (formatted) setStartTime(formatted)
                }}
                maxLength={8}
                placeholder="2:15 PM"
                className={`rounded-xl border bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:ring-1 transition duration-150 w-28 text-center font-semibold ${
                  isStartValid 
                    ? 'border-appBorder focus:border-sky-500 dark:focus:border-sky-400 focus:ring-sky-500/20' 
                    : 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                }`}
              />
            </div>

            <div className="pb-2 text-xs text-appText-muted font-bold select-none">—</div>

            {/* End Time */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">
                to
              </span>
              <input
                type="text"
                value={endTime}
                onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                onBlur={() => {
                  const formatted = formatAndValidateTime(endTime)
                  if (formatted) setEndTime(formatted)
                }}
                maxLength={8}
                placeholder="6:45 PM"
                className={`rounded-xl border bg-appBg-secondary px-3 py-1.5 text-xs text-appText-primary outline-none focus:ring-1 transition duration-150 w-28 text-center font-semibold ${
                  isEndValid 
                    ? 'border-appBorder focus:border-sky-500 dark:focus:border-sky-400 focus:ring-sky-500/20' 
                    : 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                }`}
              />
            </div>
          </div>

          {/* Topic Tag Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-appText-muted font-bold uppercase tracking-wider block">
                Topic Tag
              </span>
              <div className="relative group cursor-help text-appText-muted hover:text-sky-500 dark:hover:text-sky-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl z-50 text-[10px] font-normal leading-normal text-left normal-case">
                  Topic tags help you categorize your study tasks (e.g. Reading Comprehension, Arithmetic, Mocks) to plan and prioritize your preparation efficiently.
                </div>
              </div>
            </div>

            {/* Tags selection badges */}
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition duration-150 select-none cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-sky-500 border-sky-500 text-white dark:bg-sky-600 dark:border-sky-600'
                      : 'bg-appBg-secondary border-appBorder text-appText-secondary hover:bg-cardBg-hover'
                  }`}
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveTag(tag)
                    }}
                    className={`text-[10px] hover:text-red-500 focus:outline-none transition-colors p-0.5 ${
                      selectedTag === tag ? 'text-white/80 hover:text-white' : 'text-appText-muted'
                    }`}
                    title={`Delete tag "${tag}"`}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add Custom Tag Form */}
              <form onSubmit={handleAddCustomTag} className="flex items-center gap-1.5 ml-1">
                <input
                  type="text"
                  placeholder="Personalised tag..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="rounded-full border border-appBorder bg-appBg-secondary px-3 py-1 text-xs text-appText-primary outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500/20 transition duration-150 w-32"
                />
                <button
                  type="submit"
                  className="rounded-full bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 w-6 h-6 flex items-center justify-center text-xs font-bold transition duration-150 shadow-sm cursor-pointer"
                  title="Add tag"
                >
                  +
                </button>
              </form>
            </div>
          </div>

          {/* Add Task Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAddTask}
              className="rounded-full bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-500 px-6 py-2 text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer"
            >
              Add Task
            </button>
          </div>
        </div>
      </section>

      {/* Todo Tasks List Workspace */}
      <section className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-appBorder bg-cardBg-default p-10 text-center text-xs text-appText-muted italic transition-colors duration-200">
            Your to-do list is blank. Add a task above to plan your study schedule!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`group relative rounded-xl border p-4 flex items-start gap-3 bg-cardBg-default transition-all duration-200 ${
                task.completed
                  ? 'border-appBorder/50 opacity-60'
                  : 'border-appBorder hover:border-sky-500/30 dark:hover:border-sky-500/20 shadow-sm'
              }`}
            >
              {/* Checkmark Button */}
              <button
                type="button"
                onClick={() => handleToggleTask(task.id)}
                className={`mt-0.5 rounded-full w-5 h-5 flex items-center justify-center border transition-all duration-150 focus:outline-none cursor-pointer ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white dark:bg-emerald-600 dark:border-emerald-600'
                    : 'border-appBorder bg-appBg-secondary text-transparent hover:border-emerald-500/50 hover:bg-emerald-500/5'
                }`}
                title={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </button>

              {/* Task Details */}
              <div className="flex-1 min-w-0 pr-6">
                <p className={`text-xs font-semibold leading-relaxed text-appText-primary break-words whitespace-pre-wrap ${task.completed ? 'line-through text-appText-muted' : ''}`}>
                  {task.text}
                </p>

                {/* Metadata row */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-500/[0.08] border border-sky-500/20 text-sky-600 dark:text-sky-400 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {task.tag}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-appText-muted font-mono font-medium">
                    <svg className="w-3 h-3 text-appText-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(task.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-appText-muted font-sans font-semibold">
                    <svg className="w-3 h-3 text-appText-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {task.timeSlot}
                  </span>
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteTask(task.id)}
                className="absolute right-3 top-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1.5 rounded-full cursor-pointer focus:outline-none"
                title="Delete task permanently"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </section>

      {toastMessage && (
        <NotificationToast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  )
}

export default TodoList
