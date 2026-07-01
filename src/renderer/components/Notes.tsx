import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { VARC_TOPIC_MAP, LRDI_TOPIC_MAP, QUANTS_TOPIC_MAP } from '../utils/constants'

type BlockItem =
  | { id: string; type: 'image'; value: string; align?: 'left' | 'center' | 'right'; width?: number }

type NoteContentSchema = {
  bodyText: string
  items: BlockItem[]
}

type NoteEntry = {
  id: number
  title: string
  content: string // Stringified JSON of NoteContentSchema
  section: 'VARC' | 'LRDI' | 'QUANTS' | 'GENERAL'
  subtopic: string
  topic: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

type NotesProps = {
  currentUserEmail: string
}

function Notes({ currentUserEmail }: NotesProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'GENERAL' | 'VARC' | 'LRDI' | 'QUANTS'>('ALL')
  
  // Single Expanded note & editing note
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  
  // Options Dropdown (3-dots)
  const [activeDropdownNoteId, setActiveDropdownNoteId] = useState<number | null>(null)
  
  const [editTitle, setEditTitle] = useState('')
  const [editSection, setEditSection] = useState<'VARC' | 'LRDI' | 'QUANTS' | 'GENERAL'>('GENERAL')
  const [editSubtopic, setEditSubtopic] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [editHTML, setEditHTML] = useState('')
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, savedRange?: Range | null } | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)

  // Modal State (Creation only)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createSection, setCreateSection] = useState<'VARC' | 'LRDI' | 'QUANTS' | 'GENERAL'>('GENERAL')
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved')
  const [editOnlyNoteId, setEditOnlyNoteId] = useState<number | null>(null)

  // Fetch Notes
  const fetchNotes = async () => {
    setLoading(true)
    try {
      const response: any = await window.electron.invoke('note:list')
      if (response.success) {
        setNotes(response.notes)
      } else {
        console.error('Failed to load notes:', response.error)
      }
    } catch (err) {
      console.error('Notes fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  // Close dropdown on general window click and hide context menu
  useEffect(() => {
    const handleCloseDropdown = () => {
      setActiveDropdownNoteId(null)
      setContextMenu(null)
    }
    window.addEventListener('click', handleCloseDropdown)
    return () => window.removeEventListener('click', handleCloseDropdown)
  }, [])

  // Helper to parse older formats and convert to clean HTML
  const convertContentToHTML = (contentStr: string): string => {
    if (!contentStr) return '<div></div>'
    
    const trimmed = contentStr.trim()
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return contentStr
    }

    try {
      const parsed = JSON.parse(contentStr)
      if (Array.isArray(parsed)) {
        return parsed.map(block => {
          if (block.type === 'text') {
            return `<div>${block.value.replace(/\n/g, '<br>')}</div>`
          }
          if (block.type === 'image') {
            if (!block.value) return ''
            return `<div class="inline-image-wrapper" style="text-align: left; margin: 10px 0;"><img src="${block.value}" class="zoomable-attachment-img" style="max-width: 350px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; cursor: zoom-in;" /></div>`
          }
          if (block.type === 'table') {
            const { headers, rows } = block.value
            const headerHTML = headers && headers.length > 0
              ? `<thead><tr>${headers.map((h: string) => `<th contenteditable="true" style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; background-color: rgba(0,0,0,0.05); text-align: left; vertical-align: top; min-width: 20px; word-break: break-word; overflow-wrap: break-word;">&#8203;${h}</th>`).join('')}</tr></thead>`
              : ''
            const rowsHTML = rows && rows.length > 0
              ? `<tbody>${rows.map((row: string[]) => `<tr>${row.map(cell => `<td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; min-width: 20px; word-break: break-word; overflow-wrap: break-word;">&#8203;${cell}</td>`).join('')}</tr>`).join('')}</tbody>`
              : ''
            return `
              <div class="inline-table-wrapper" contenteditable="false" style="display: inline-flex; align-items: flex-start; gap: 3px; margin: 10px 0; width: 90%; max-width: 90%; position: relative;">
                <table class="notes-inline-table" style="border-collapse: collapse; width: 100%; font-size: 11px; border: 1px solid #cbd5e1; table-layout: auto;">
                  ${headerHTML}${rowsHTML}
                </table>
                <div class="table-actions" contenteditable="false" style="display: flex; flex-direction: column; gap: 4px; font-family: sans-serif; font-size: 10px; position: relative;">
                  <button class="table-menu-trigger" title="Table Actions" style="background: transparent; border: none; padding: 2px 4px; cursor: pointer; color: inherit; font-weight: bold; font-size: 14px; line-height: 1; user-select: none; outline: none; box-shadow: none;">⋮</button>
                  <div class="table-menu-dropdown" style="display: none; position: absolute; left: 100%; top: 0; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 4px; min-width: 110px; flex-direction: column; gap: 2px; z-index: 100;">
                    <button class="table-action-btn add-row-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #cbd5e1; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">+ Add Row</button>
                    <button class="table-action-btn add-col-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #cbd5e1; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">+ Add Col</button>
                    <button class="table-action-btn del-row-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #ef4444; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">- Delete Row</button>
                    <button class="table-action-btn del-col-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #ef4444; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">- Delete Col</button>
                  </div>
                </div>
              </div>
              <div><br></div>
            `
          }
          return ''
        }).join('')
      }
      if (parsed && typeof parsed === 'object') {
        let html = `<div>${(parsed.bodyText || '').replace(/\n/g, '<br>')}</div>`
        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((item: any) => {
            if (item.type === 'image') {
              html += `<div class="inline-image-wrapper" style="text-align: left; margin: 10px 0;"><img src="${item.value}" class="zoomable-attachment-img" style="max-width: 350px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; cursor: zoom-in;" /></div>`
            } else if (item.type === 'table') {
              const { headers, rows } = item.value
              const headerHTML = headers && headers.length > 0
                ? `<thead><tr>${headers.map((h: string) => `<th contenteditable="true" style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; background-color: rgba(0,0,0,0.05); text-align: left; vertical-align: top; min-width: 20px; word-break: break-word; overflow-wrap: break-word;">&#8203;${h}</th>`).join('')}</tr></thead>`
                : ''
              const rowsHTML = rows && rows.length > 0
                ? `<tbody>${rows.map((row: string[]) => `<tr>${row.map(cell => `<td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; min-width: 20px; word-break: break-word; overflow-wrap: break-word;">&#8203;${cell}</td>`).join('')}</tr>`).join('')}</tbody>`
                : ''
              html += `
                <div class="inline-table-wrapper" contenteditable="false" style="display: inline-flex; align-items: flex-start; gap: 3px; margin: 10px 0; width: 90%; max-width: 90%; position: relative;">
                  <table class="notes-inline-table" style="border-collapse: collapse; width: 100%; font-size: 11px; border: 1px solid #cbd5e1; table-layout: auto;">
                    ${headerHTML}${rowsHTML}
                  </table>
                  <div class="table-actions" contenteditable="false" style="display: flex; flex-direction: column; gap: 4px; font-family: sans-serif; font-size: 10px; position: relative;">
                    <button class="table-menu-trigger" title="Table Actions" style="background: transparent; border: none; padding: 2px 4px; cursor: pointer; color: inherit; font-weight: bold; font-size: 14px; line-height: 1; user-select: none; outline: none; box-shadow: none;">⋮</button>
                    <div class="table-menu-dropdown" style="display: none; position: absolute; left: 100%; top: 0; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 4px; min-width: 110px; flex-direction: column; gap: 2px; z-index: 100;">
                      <button class="table-action-btn add-row-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #cbd5e1; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">+ Add Row</button>
                      <button class="table-action-btn add-col-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #cbd5e1; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">+ Add Col</button>
                      <button class="table-action-btn del-row-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #ef4444; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">- Delete Row</button>
                      <button class="table-action-btn del-col-btn" style="background: transparent; border: none; padding: 4px 8px; cursor: pointer; color: #ef4444; text-align: left; width: 100%; border-radius: 4px; font-size: 10px; font-weight: bold;">- Delete Col</button>
                    </div>
                  </div>
                </div>
                <div><br></div>
              `
            }
          })
        }
        return html
      }
      return `<div>${contentStr.replace(/\n/g, '<br>')}</div>`
    } catch {
      return `<div>${contentStr.replace(/\n/g, '<br>')}</div>`
    }
  }

  // Get list of attachment image urls from HTML to support lightbox
  const getAttachmentsFromHTML = (html: string): string[] => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const imgs = doc.querySelectorAll('img')
      return Array.from(imgs).map(img => img.src)
    } catch {
      return []
    }
  }

  // Handle outside card click to save & close note editing/expansion
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (expandedNoteId !== null) {
        const container = document.getElementById(`note-card-${expandedNoteId}`)
        const isInsideModal = target.closest('.fixed') || target.closest('.portal')
        if (container && !container.contains(target) && !isInsideModal) {
          // Explicit save before closing
          triggerExplicitSave(expandedNoteId)
          setEditingNoteId(null)
          setExpandedNoteId(null)
          setEditOnlyNoteId(null)
          setActiveDropdownNoteId(null)
        }
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [expandedNoteId, editTitle, editSection, editSubtopic, editTopic, editHTML])

  // Explicit Save logic when shifting notes or clicking away
  const triggerExplicitSave = async (id: number) => {
    // Only save if it was the note currently being edited
    if (editingNoteId !== id) return

    const noteToUpdate = notes.find(n => n.id === id)
    const payload = {
      id,
      title: editTitle,
      content: editHTML,
      section: editSection,
      subtopic: editSection !== 'GENERAL' ? editSubtopic : '',
      topic: editSection !== 'GENERAL' ? editTopic : '',
      isPinned: noteToUpdate ? noteToUpdate.isPinned : false
    }

    try {
      const response: any = await window.electron.invoke('note:save', payload)
      if (response.success) {
        setNotes(prev =>
          prev.map(n =>
            n.id === id
              ? {
                  ...n,
                  title: editTitle,
                  content: payload.content,
                  section: editSection,
                  subtopic: payload.subtopic,
                  topic: payload.topic,
                  updatedAt: new Date().toISOString()
                }
              : n
          )
        )
      }
    } catch (err) {
      console.error('Explicit save failed:', err)
    }
  }

  // dynamic topic mappings
  const getSubtopicsForSection = (sec: string) => {
    if (sec === 'VARC') return Object.keys(VARC_TOPIC_MAP)
    if (sec === 'LRDI') return Object.keys(LRDI_TOPIC_MAP)
    if (sec === 'QUANTS') return Object.keys(QUANTS_TOPIC_MAP)
    return []
  }

  const getTopicsForSubtopic = (sec: string, sub: string) => {
    if (sec === 'VARC') return (VARC_TOPIC_MAP as any)[sub] || []
    if (sec === 'LRDI') return (LRDI_TOPIC_MAP as any)[sub] || []
    if (sec === 'QUANTS') return (QUANTS_TOPIC_MAP as any)[sub] || []
    return []
  }

  // Open modal
  const openNewNoteModal = () => {
    setCreateTitle('')
    if (selectedFilter && selectedFilter !== 'ALL') {
      setCreateSection(selectedFilter)
    } else {
      setCreateSection('GENERAL')
    }
    setIsCreateModalOpen(true)
  }

  // Create Note
  const handleCreateNote = async () => {
    if (!createTitle.trim()) {
      return
    }

    const defaultContent = JSON.stringify({
      bodyText: '',
      items: []
    })

    const payload = {
      title: createTitle,
      content: defaultContent,
      section: createSection,
      subtopic: '',
      topic: '',
      isPinned: false
    }

    try {
      const response: any = await window.electron.invoke('note:save', payload)
      if (response.success) {
        setIsCreateModalOpen(false)
        await fetchNotes()
        // Immediately expand and open in edit mode inline
        startInlineEditing(response.note)
      } else {
        alert('Failed to create note: ' + response.error)
      }
    } catch (err: any) {
      alert('Error creating note: ' + err.message)
    }
  }

  // Delete note
  const handleDeleteNote = async (id: number) => {
    if (confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
      try {
        const response: any = await window.electron.invoke('note:delete', id)
        if (response.success) {
          if (editingNoteId === id) {
            setEditingNoteId(null)
          }
          if (expandedNoteId === id) {
            setExpandedNoteId(null)
          }
          fetchNotes()
        } else {
          alert('Failed to delete note: ' + response.error)
        }
      } catch (err: any) {
        alert('Error deleting note: ' + err.message)
      }
    }
  }

  // Toggle Pinned Status
  const togglePinStatus = async (note: NoteEntry) => {
    const payload = {
      id: note.id,
      title: note.title,
      content: note.content,
      section: note.section,
      subtopic: note.subtopic,
      topic: note.topic,
      isPinned: !note.isPinned
    }
    try {
      const response: any = await window.electron.invoke('note:save', payload)
      if (response.success) {
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isPinned: !note.isPinned } : n))
        fetchNotes()
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    }
  }

  // Start inline editing
  const startInlineEditing = (note: NoteEntry) => {
    // If another note was being edited, save it first
    if (editingNoteId !== null && editingNoteId !== note.id) {
      triggerExplicitSave(editingNoteId)
    }

    setEditingNoteId(note.id)
    setExpandedNoteId(note.id)
    setEditTitle(note.title)
    setEditSection(note.section)
    setEditSubtopic(note.subtopic)
    setEditTopic(note.topic)

    const html = convertContentToHTML(note.content)
    setEditHTML(html)
    setSaveStatus('saved')
  }

  // Expand Note Card
  const handleExpandNote = (note: NoteEntry) => {
    if (expandedNoteId === note.id) {
      if (editingNoteId === note.id) {
        triggerExplicitSave(editingNoteId)
        setEditingNoteId(null)
      }
      setExpandedNoteId(null)
      return
    }

    // Save currently edited note before moving away
    if (editingNoteId !== null && editingNoteId !== note.id) {
      triggerExplicitSave(editingNoteId)
      setEditingNoteId(null)
    }
    setExpandedNoteId(note.id)
  }

  // Autosave triggers in the background silently
  useEffect(() => {
    if (editingNoteId === null) return

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      const noteToUpdate = notes.find(n => n.id === editingNoteId)
      const payload = {
        id: editingNoteId,
        title: editTitle,
        content: editHTML,
        section: editSection,
        subtopic: editSection !== 'GENERAL' ? editSubtopic : '',
        topic: editSection !== 'GENERAL' ? editTopic : '',
        isPinned: noteToUpdate ? noteToUpdate.isPinned : false
      }

      try {
        const response: any = await window.electron.invoke('note:save', payload)
        if (response.success) {
          setSaveStatus('saved')
          setNotes(prev =>
            prev.map(n =>
              n.id === editingNoteId
                ? {
                    ...n,
                    title: editTitle,
                    content: payload.content,
                    section: editSection,
                    subtopic: payload.subtopic,
                    topic: payload.topic,
                    updatedAt: new Date().toISOString()
                  }
                : n
            )
          )
        }
      } catch (err) {
        console.error('Autosave failed:', err)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [editTitle, editSection, editSubtopic, editTopic, editHTML, editingNoteId])

  // Synchronize editor innerHTML and manage native input listener
  useEffect(() => {
    if (editingNoteId !== null && editorRef.current) {
      if (editorRef.current.innerHTML !== editHTML) {
        editorRef.current.innerHTML = editHTML
      }
    }

    const editor = editorRef.current
    if (!editor) return

    const handleDOMInput = () => {
      setEditHTML(editor.innerHTML)
    }

    editor.addEventListener('input', handleDOMInput)
    return () => {
      editor.removeEventListener('input', handleDOMInput)
    }
  }, [editingNoteId, editOnlyNoteId])

  // Block Insertion helpers (Images, Tables inline inside ContentEditable)
  const insertHTMLAtCursor = (html: string, overrideRange?: Range | null) => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
    const sel = window.getSelection()
    if (sel) {
      let range: Range | null = null
      if (overrideRange) {
        range = overrideRange
        sel.removeAllRanges()
        sel.addRange(range)
      } else if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0)
      }
      if (range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents()
        const el = document.createElement('div')
        el.innerHTML = html
        const frag = document.createDocumentFragment()
        let node
        let lastNode
        while ((node = el.firstChild)) {
          lastNode = frag.appendChild(node)
        }
        range.insertNode(frag)
        if (lastNode) {
          range.setStartAfter(lastNode)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
        setEditHTML(editorRef.current.innerHTML)
        return
      }
    }
    if (editorRef.current) {
      editorRef.current.innerHTML += html
      setEditHTML(editorRef.current.innerHTML)
    }
  }

  // Returns the <td>/<th> cell if the mouse is within RESIZE_ZONE px of its right border
  const getCellAtRightBorder = (e: React.MouseEvent | MouseEvent): HTMLTableCellElement | null => {
    const RESIZE_ZONE = 6
    const target = e.target as HTMLElement
    const cell = target.closest('td, th') as HTMLTableCellElement | null
    if (!cell) return null
    const rect = cell.getBoundingClientRect()
    if (e.clientX >= rect.right - RESIZE_ZONE && e.clientX <= rect.right + RESIZE_ZONE) {
      return cell
    }
    return null
  }

  // Show col-resize cursor when hovering near a cell's right border
  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (!editorRef.current) return
    const cell = getCellAtRightBorder(e)
    editorRef.current.style.cursor = cell ? 'col-resize' : ''
  }

  // Column Resizer mouse drag handler — proper right-border detection
  const handleEditorMouseDown = (e: React.MouseEvent) => {
    // Skip if not left-button
    if (e.button !== 0) return

    const cell = getCellAtRightBorder(e)
    if (!cell) return

    e.preventDefault()
    e.stopPropagation()

    const table = cell.closest('table') as HTMLTableElement | null
    if (!table) return

    // Freeze current column widths so table-layout:fixed works predictably
    table.style.tableLayout = 'fixed'
    const allCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('tr:first-child td, tr:first-child th'))
    allCells.forEach(c => { c.style.width = `${c.offsetWidth}px` })

    const startX = e.clientX
    const startWidth = cell.offsetWidth
    const row = cell.parentElement as HTMLTableRowElement
    const colIndex = cell.cellIndex
    const isLastCol = colIndex === row.cells.length - 1
    const tableWrapper = table.closest('.inline-table-wrapper') as HTMLElement | null
    const startTableWidth = table.offsetWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newCellWidth = Math.max(20, startWidth + delta)
      
      // Calculate what the new sum of columns would be
      const allFirstRowCells = Array.from(table.querySelectorAll<HTMLTableCellElement>('tr:first-child td, tr:first-child th'))
      let proposedTableWidth = 0
      allFirstRowCells.forEach((c, idx) => {
        if (idx === colIndex) {
          proposedTableWidth += newCellWidth
        } else {
          proposedTableWidth += c.offsetWidth
        }
      })

      // Get the editor's width to enforce 90% limit
      const editorWidth = editorRef.current?.offsetWidth || 0
      const maxTableWidth = editorWidth > 0 ? Math.floor(editorWidth * 0.9 - 30) : 600

      // Clamp newCellWidth if the resulting table exceeds the max allowed width
      let finalCellWidth = newCellWidth
      if (proposedTableWidth > maxTableWidth) {
        const excess = proposedTableWidth - maxTableWidth
        finalCellWidth = Math.max(20, newCellWidth - excess)
      }

      // Apply the final cell width to all rows for this column
      Array.from(table.rows).forEach(r => {
        const c = r.cells[colIndex] as HTMLTableCellElement | undefined
        if (c) c.style.width = `${finalCellWidth}px`
      })

      // Recalculate actual table width after applying the change
      let finalTableWidth = 0
      allFirstRowCells.forEach((c, idx) => {
        if (idx === colIndex) {
          finalTableWidth += finalCellWidth
        } else {
          finalTableWidth += c.offsetWidth
        }
      })

      table.style.width = `${finalTableWidth}px`
      if (tableWrapper) {
        tableWrapper.style.width = `${finalTableWidth + 24}px`
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (editorRef.current) {
        editorRef.current.style.cursor = ''
        setEditHTML(editorRef.current.innerHTML)
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Handle table row/column edits and media clicks via event delegation
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    
    // Zoom image click
    if (target.tagName === 'IMG') {
      setZoomImageUrl((target as HTMLImageElement).src)
      return
    }

    // Clicking the table-actions area (to the right of the table) selects the entire wrapper
    // so the user can Backspace/Ctrl+C the whole table
    const tableActionsArea = target.closest('.table-actions') as HTMLElement | null
    if (tableActionsArea && !target.classList.contains('table-menu-trigger') && !target.classList.contains('table-action-btn')) {
      const wrapper = tableActionsArea.closest('.inline-table-wrapper') as HTMLElement | null
      if (wrapper && editorRef.current) {
        const sel = window.getSelection()
        if (sel) {
          const range = document.createRange()
          range.selectNode(wrapper)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
      return
    }

    // Toggle dropdown
    if (target.classList.contains('table-menu-trigger')) {
      e.preventDefault()
      e.stopPropagation()
      const dropdown = target.nextElementSibling as HTMLElement
      if (dropdown) {
        const isShowing = dropdown.style.display === 'flex'
        if (editorRef.current) {
          editorRef.current.querySelectorAll('.table-menu-dropdown').forEach((d: any) => {
            d.style.display = 'none'
          })
        }
        dropdown.style.display = isShowing ? 'none' : 'flex'
      }
      return
    }

    // Close dropdown on clicking elsewhere
    if (!target.classList.contains('table-menu-trigger') && !target.classList.contains('table-action-btn')) {
      if (editorRef.current) {
        editorRef.current.querySelectorAll('.table-menu-dropdown').forEach((d: any) => {
          d.style.display = 'none'
        })
      }
    }

    // Dynamic table action button triggers
    if (target.classList.contains('table-action-btn')) {
      e.preventDefault()
      e.stopPropagation()
      
      const wrapper = target.closest('.inline-table-wrapper')
      const table = wrapper?.querySelector('table')
      if (!table) return
      
      const activeEl = document.activeElement
      const activeCell = activeEl?.closest('td, th') as HTMLTableCellElement | null

      if (target.classList.contains('add-row-btn')) {
        const colCount = table.rows[0]?.cells.length || 2
        const newRow = table.insertRow()
        for (let i = 0; i < colCount; i++) {
          const cell = newRow.insertCell()
          cell.contentEditable = "true"
          cell.style.border = "1px solid #cbd5e1"
          cell.style.padding = "6px 10px"
          cell.style.minWidth = "20px"
          cell.style.textAlign = "left"
          cell.style.verticalAlign = "top"
          cell.style.wordBreak = "break-word"
          cell.style.overflowWrap = "break-word"
          cell.innerHTML = '&#8203;'
        }
      } else if (target.classList.contains('add-col-btn')) {
        Array.from(table.rows).forEach(row => {
          const cell = row.insertCell()
          cell.contentEditable = "true"
          cell.style.border = "1px solid #cbd5e1"
          cell.style.padding = "6px 10px"
          cell.style.minWidth = "20px"
          cell.style.textAlign = "left"
          cell.style.verticalAlign = "top"
          cell.style.wordBreak = "break-word"
          cell.style.overflowWrap = "break-word"
          cell.innerHTML = '&#8203;'
        })
      } else if (target.classList.contains('del-row-btn')) {
        if (table.rows.length > 1) {
          const rIdx = activeCell ? (activeCell.parentElement as HTMLTableRowElement).rowIndex : table.rows.length - 1
          table.deleteRow(rIdx)
        }
      } else if (target.classList.contains('del-col-btn')) {
        const cellCount = table.rows[0]?.cells.length || 0
        if (cellCount > 1) {
          const cIdx = activeCell ? activeCell.cellIndex : cellCount - 1
          Array.from(table.rows).forEach(row => {
            row.deleteCell(cIdx)
          })
        }
      }

      // Hide dropdown after action
      const dropdown = target.closest('.table-menu-dropdown') as HTMLElement
      if (dropdown) {
        dropdown.style.display = 'none'
      }

      // Sync state back
      if (editorRef.current) {
        setEditHTML(editorRef.current.innerHTML)
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (editorRef.current && editorRef.current.contains(e.target as HTMLElement)) {
      e.preventDefault()
      
      const sel = window.getSelection()
      let range: Range | null = null
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0).cloneRange()
      }
      
      setContextMenu({ x: e.clientX, y: e.clientY, savedRange: range })
    }
  }

  const handleAddBlockAction = async (note: NoteEntry, type: 'image', overrideRange?: Range | null) => {
    let htmlToInsert = ''
    if (type === 'image') {
      try {
        const response: any = await window.electron.invoke('app:selectImages')
        if (response && response.success && response.files && response.files.length > 0) {
          const fileData = response.files[0]
          const file = new File([fileData.buffer], fileData.name, { type: fileData.mimeType })
          const buffer = new Uint8Array(await file.arrayBuffer())
          const uploadResponse: any = await window.electron.invoke('note:uploadImage', {
            imageBuffer: buffer,
            fileName: file.name
          })
          if (uploadResponse.success && uploadResponse.url) {
            htmlToInsert = `<div class="inline-image-wrapper" style="text-align: left; margin: 10px 0;"><img src="${uploadResponse.url}" class="zoomable-attachment-img" style="max-width: 350px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; cursor: zoom-in;" /></div>`
          }
        }
      } catch (err: any) {
        console.error('Image upload failed:', err.message)
      }
    }

    if (!htmlToInsert) return

    if (editingNoteId === note.id) {
      insertHTMLAtCursor(htmlToInsert, overrideRange)
    } else {
      startInlineEditing(note)
      const initialHTML = convertContentToHTML(note.content)
      const combinedHTML = initialHTML + htmlToInsert
      setEditHTML(combinedHTML)
      if (editorRef.current) {
        editorRef.current.innerHTML = combinedHTML
      }
    }
  }

 

  const handleContentEditablePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const buffer = new Uint8Array(await file.arrayBuffer())
          const uploadResponse: any = await window.electron.invoke('note:uploadImage', {
            imageBuffer: buffer,
            fileName: file.name
          })
          if (uploadResponse.success && uploadResponse.url) {
            const imgHTML = `<div class="inline-image-wrapper" style="text-align: left; margin: 10px 0;"><img src="${uploadResponse.url}" class="zoomable-attachment-img" style="max-width: 350px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; cursor: zoom-in;" /></div>`
            insertHTMLAtCursor(imgHTML)
          }
        }
      }
    }
  }

  const handleContentEditableDrop = async (e: React.DragEvent) => {
    const files = e.dataTransfer.files
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      e.preventDefault()
      const file = files[0]
      const buffer = new Uint8Array(await file.arrayBuffer())
      const uploadResponse: any = await window.electron.invoke('note:uploadImage', {
        imageBuffer: buffer,
        fileName: file.name
      })
      if (uploadResponse.success && uploadResponse.url) {
        const imgHTML = `<div class="inline-image-wrapper" style="text-align: left; margin: 10px 0;"><img src="${uploadResponse.url}" class="zoomable-attachment-img" style="max-width: 350px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; cursor: zoom-in;" /></div>`
        insertHTMLAtCursor(imgHTML)
      }
    }
  }

  // Filters & Search
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesFilter = selectedFilter === 'ALL' || n.section === selectedFilter
      const text = searchQuery.toLowerCase()
      const matchesSearch =
        n.title.toLowerCase().includes(text) ||
        n.section.toLowerCase().includes(text) ||
        n.topic.toLowerCase().includes(text) ||
        n.content.toLowerCase().includes(text)
      return matchesFilter && matchesSearch
    })
  }, [notes, selectedFilter, searchQuery])

  // Render Block view deleted in favor of clean dangerouslySetInnerHTML for HTML
  const renderBlockView = (block: any, noteId: number) => {
    return null
  }

  // Standard date parsing
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  const sectionThemes = {
    VARC: {
      tag: 'bg-[#3B82F6]/[0.08] border-[#3B82F6]/20 text-[#2563EB] dark:text-[#60A5FA]',
      card: 'border-l-4 border-l-[#3B82F6]',
      tabActive: 'bg-[#3B82F6] border-[#3B82F6] text-white'
    },
    LRDI: {
      tag: 'bg-[#8B5CF6]/[0.08] border-[#8B5CF6]/20 text-[#7C3AED] dark:text-[#A78BFA]',
      card: 'border-l-4 border-l-[#8B5CF6]',
      tabActive: 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
    },
    QUANTS: {
      tag: 'bg-[#10B981]/[0.08] border-[#10B981]/20 text-[#059669] dark:text-[#34D399]',
      card: 'border-l-4 border-l-[#10B981]',
      tabActive: 'bg-[#10B981] border-[#10B981] text-white'
    },
    GENERAL: {
      tag: 'bg-[#F97316]/[0.08] border-[#F97316]/20 text-[#EA580C] dark:text-[#FB923C]',
      card: 'border-l-4 border-l-[#F97316]',
      tabActive: 'bg-[#F97316] border-[#F97316] text-white'
    }
  }



  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <style>{`
        .view-mode-container .table-actions {
          display: none !important;
        }
        .inline-table-wrapper .del-row-btn,
        .inline-table-wrapper .del-col-btn {
          display: none !important;
        }
        .inline-table-wrapper:focus-within .del-row-btn,
        .inline-table-wrapper:focus-within .del-col-btn {
          display: block !important;
        }
        .zoomable-attachment-img {
          cursor: zoom-in !important;
        }
        .zoomable-attachment-img:hover {
          filter: brightness(0.95);
        }
      `}</style>
      {/* Header Panel */}
      {editOnlyNoteId === null && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cardBg-default border border-appBorder p-4 rounded-2xl shadow-sm select-none">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Revision Notes
            </h2>
            <p className="text-[10px] text-appText-muted mt-0.5">
              Log revision headings and edit them inline using reorderable text, table, and image attachment blocks.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewNoteModal}
            className="rounded-full bg-teal-600 dark:bg-teal-500 hover:bg-teal-500 dark:hover:bg-teal-400 text-white px-5 py-2 text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-center hover:scale-102 active:scale-98"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add New Note
          </button>
        </div>
      )}

      {/* Filters & Search */}
      {editOnlyNoteId === null && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        {/* Section Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'GENERAL', 'VARC', 'LRDI', 'QUANTS'] as const).map(tab => {
             const isActive = selectedFilter === tab
             let activeBgColor = 'bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-700'
             if (tab === 'VARC') activeBgColor = sectionThemes.VARC.tabActive
             if (tab === 'LRDI') activeBgColor = sectionThemes.LRDI.tabActive
             if (tab === 'QUANTS') activeBgColor = sectionThemes.QUANTS.tabActive
             if (tab === 'GENERAL') activeBgColor = sectionThemes.GENERAL.tabActive
             
             let hoverClass = 'hover:bg-slate-900 hover:border-slate-900 hover:text-white dark:hover:bg-slate-800'
             if (tab === 'VARC') hoverClass = 'hover:bg-[#3B82F6] hover:border-[#3B82F6] hover:text-white'
             if (tab === 'LRDI') hoverClass = 'hover:bg-[#8B5CF6] hover:border-[#8B5CF6] hover:text-white'
             if (tab === 'QUANTS') hoverClass = 'hover:bg-[#10B981] hover:border-[#10B981] hover:text-white'
             if (tab === 'GENERAL') hoverClass = 'hover:bg-[#F97316] hover:border-[#F97316] hover:text-white'

             return (
               <button
                 key={tab}
                 type="button"
                 onClick={() => setSelectedFilter(tab)}
                 className={`rounded-xl px-3.5 py-2 text-[10px] font-bold uppercase transition border cursor-pointer ${
                   isActive
                     ? `${activeBgColor} shadow-sm`
                     : `bg-appBg-secondary border-appBorder text-appText-secondary ${hoverClass}`
                 }`}
               >
                 {tab === 'ALL' ? 'All Notes' : tab === 'QUANTS' ? 'Quants' : tab} ({tab === 'ALL' ? notes.length : notes.filter(n => n.section === tab).length})
               </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-xl border border-appBorder bg-appBg-secondary pl-9 pr-4 py-2 text-xs text-appText-primary outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/25 transition duration-150"
          />
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-appText-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        </div>
      )}

      {/* List Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3 select-none">
          <svg className="animate-spin h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[10px] uppercase tracking-wider font-bold text-appText-muted">Loading your notes archive...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-cardBg-default border border-appBorder rounded-2xl p-6 select-none">
          <svg className="w-12 h-12 text-appText-disabled mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs font-bold text-appText-secondary">No notes found matching your selection.</p>
          <p className="text-[10px] text-appText-muted mt-1">Get started by clicking the "Add New Note" button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const isExpanded = expandedNoteId === note.id
            const isEditing = editingNoteId === note.id
            const isEditOnly = editOnlyNoteId === note.id

            if (editOnlyNoteId !== null && !isEditOnly) return null

            const theme = sectionThemes[note.section] || sectionThemes.GENERAL

             // Parse content schema
             const contentHTML = isEditing
               ? editHTML
               : convertContentToHTML(note.content)
 
             const attachmentUrls = getAttachmentsFromHTML(contentHTML)

            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                onClick={() => {
                  if (!isExpanded && !isEditing) {
                    handleExpandNote(note)
                  }
                }}
                className={`rounded-2xl border bg-cardBg-default p-5 shadow-sm transition-all duration-200 relative select-text ${
                  !isExpanded && !isEditing ? 'cursor-pointer hover:border-sky-500/50' : ''
                } ${theme.card} ${
                  note.isPinned 
                    ? 'border-amber-500/40 bg-amber-500/[0.01] dark:bg-amber-500/[0.02]' 
                    : 'border-appBorder'
                } ${
                  isEditOnly ? 'h-[calc(100vh-120px)] flex flex-col min-h-0' : ''
                }`}
              >
                {/* Note Card Header (No select-none, text is copyable) */}
                <div 
                  className={`flex items-center justify-between gap-3 ${isExpanded && !isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => {
                    if (isExpanded && !isEditing) {
                      setExpandedNoteId(null)
                    }
                  }}
                >
                  {isEditing ? (
                    // Editing inline: Title input
                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Note Title..."
                        className="flex-1 bg-appBg-secondary border border-appBorder rounded-xl px-3 py-1.5 text-xs text-appText-primary font-bold outline-none focus:border-teal-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {/* Read-Only section category badge after creation */}
                      <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase select-none ${theme.tag}`}>
                        {note.section}
                      </span>
                    </div>
                  ) : (
                    // View: Note details
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2.5 text-left">
                      <div className="flex items-center gap-2">
                        {note.isPinned && (
                          <span className="text-amber-500 text-xs" title="Pinned Note">📌</span>
                        )}
                        <div className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase select-none ${theme.tag}`}>
                          {note.section}
                        </div>
                      </div>
                      <h3 className="text-sm font-extrabold text-appText-primary tracking-tight">
                        {note.title}
                      </h3>
                      {note.topic && (
                        <span className="text-[10px] font-bold text-appText-muted bg-appBg-secondary px-2 py-0.5 border border-appBorder rounded-full max-w-max select-none">
                          {note.subtopic} › {note.topic}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions (Pills/controls) */}
                  <div className="flex items-center gap-2.5 select-none relative">
                    <span className="hidden md:inline-block text-[10px] text-appText-disabled font-mono">
                      {formatDate(note.createdAt)}
                    </span>

                    {/* Pin Action Button - replaced with Thumbtack icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePinStatus(note)
                      }}
                      className={`p-1.5 rounded transition cursor-pointer hover:bg-appBg-secondary ${
                        note.isPinned ? 'text-amber-500' : 'text-appText-disabled hover:text-amber-500'
                      }`}
                      title={note.isPinned ? 'Unpin note' : 'Pin note'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={note.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22"></line>
                        <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.56A2 2 0 0 1 15 9.2V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.2a2 2 0 0 1-.78 1.24L5.44 14a2 2 0 0 0-.44 1.24z"></path>
                      </svg>
                    </button>

                    {/* Edit Only toggle button */}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditOnlyNoteId(isEditOnly ? null : note.id)
                        }}
                        className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-[9px] font-bold uppercase transition cursor-pointer"
                        title={isEditOnly ? "Exit Fullscreen Mode" : "Edit in Fullscreen Mode"}
                      >
                        {isEditOnly ? 'Exit Edit Only' : '💻 Edit Only'}
                      </button>
                    )}

 

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isExpanded) {
                          if (isEditing) {
                            triggerExplicitSave(note.id)
                            setEditingNoteId(null)
                          }
                          setExpandedNoteId(null)
                        } else {
                          handleExpandNote(note)
                        }
                      }}
                      className="p-1 rounded text-appText-muted hover:text-appText-primary transition cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* 3-dots Dropdown Toggle Menu - ONLY visible when card is expanded */}
                    {isExpanded && (
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdownNoteId(activeDropdownNoteId === note.id ? null : note.id)
                          }}
                          className="p-1.5 rounded hover:bg-appBg-secondary text-appText-muted hover:text-appText-primary transition cursor-pointer"
                          title="Note Options"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {activeDropdownNoteId === note.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-appBorder bg-cardBg-default p-1 shadow-xl animate-fadeIn text-[11px] font-bold text-appText-secondary"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleAddBlockAction(note, 'image')
                                setActiveDropdownNoteId(null)
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-appBg-secondary hover:text-appText-primary transition cursor-pointer"
                            >
                              🖼️ Add Image Attachment
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownNoteId(null)
                                handleDeleteNote(note.id)
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              🗑️ Delete Note
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className={`mt-5 pt-5 border-t border-appBorder/50 select-text ${
                    isEditOnly ? 'flex-1 flex flex-col min-h-0 space-y-3' : 'space-y-4'
                  }`}>
                    
                    {/* Inline subtopic and topic inputs (Only in Edit mode & not GENERAL) */}
                    {isEditing && editSection !== 'GENERAL' && (
                      <div className="flex flex-wrap items-center gap-4 select-none mb-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted">Subtopic:</span>
                          <select
                            value={editSubtopic}
                            onChange={(e) => {
                              setEditSubtopic(e.target.value)
                              setEditTopic('')
                            }}
                            className="bg-transparent text-xs font-bold text-teal-400 outline-none cursor-pointer border-b border-dashed border-teal-400/50 hover:border-teal-400 pb-0.5"
                          >
                            <option value="" className="bg-appBg-primary text-appText-primary">-- Choose --</option>
                            {getSubtopicsForSection(editSection).map(s => (
                              <option key={s} value={s} className="bg-appBg-primary text-appText-primary">{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-appText-muted">Topic:</span>
                          <select
                            value={editTopic}
                            onChange={(e) => setEditTopic(e.target.value)}
                            disabled={!editSubtopic}
                            className="bg-transparent text-xs font-bold text-teal-400 outline-none cursor-pointer border-b border-dashed border-teal-400/50 hover:border-teal-400 pb-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="" className="bg-appBg-primary text-appText-primary">-- Choose --</option>
                            {getTopicsForSubtopic(editSection, editSubtopic).map(t => (
                              <option key={t} value={t} className="bg-appBg-primary text-appText-primary">{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {/* Content Section (Rich Text Editor using ContentEditable) */}
                    <div className={`mt-4 ${isEditOnly ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                      {isEditing ? (
                        <div
                          ref={editorRef}
                          contentEditable="true"
                          onInput={(e) => setEditHTML(e.currentTarget.innerHTML)}
                          onPaste={handleContentEditablePaste}
                          onDrop={handleContentEditableDrop}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={handleEditorClick}
                          onMouseMove={handleEditorMouseMove}
                          onMouseDown={handleEditorMouseDown}
                          onMouseLeave={() => { if (editorRef.current) editorRef.current.style.cursor = '' }}
                          onContextMenu={handleContextMenu}
                          className={`w-full bg-transparent text-xs text-appText-primary outline-none border border-appBorder/50 rounded-xl p-3 bg-appBg-secondary/20 focus:border-teal-500 leading-relaxed font-sans font-medium select-text cursor-text ${
                            isEditOnly ? 'flex-1 min-h-[350px] h-full overflow-y-auto' : 'min-h-[220px]'
                          }`}
                          style={{ minHeight: isEditOnly ? '350px' : '220px' }}
                          placeholder="Type note contents, formulas, or takeaways here..."
                        />
                      ) : (
                        <div
                          onClick={() => {
                            if (!isEditing) {
                              startInlineEditing(note)
                            }
                          }}
                          className="text-[12px] leading-relaxed text-appText-secondary font-sans font-medium mb-4 select-text cursor-text min-h-[50px] view-mode-container"
                          onClickCapture={(e) => {
                            // Event delegation to zoom images on click
                            const target = e.target as HTMLElement
                            if (target.tagName === 'IMG') {
                              e.stopPropagation() // Prevent entering edit mode on zoom click
                              setZoomImageUrl((target as HTMLImageElement).src)
                            }
                          }}
                          dangerouslySetInnerHTML={{
                            __html: contentHTML || '<span class="text-appText-disabled italic select-none">No content written yet. Click to edit note.</span>'
                          }}
                        />
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-appBorder/50 text-[10px] text-appText-muted select-none mt-auto">
                      <span>Last updated: {formatDate(note.updatedAt)}</span>
                      <span>Created: {formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Creation Modal (Only asks Title & Section) */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4 overflow-y-auto w-full h-full">
          <div className="bg-cardBg-default border border-appBorder rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-fadeIn text-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-appBorder bg-appBg-secondary/50 select-none">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-appText-primary">
                Add Revision Note
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-appText-muted hover:text-appText-primary transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-appText-muted select-none">Note Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Enter a note heading..."
                  className="w-full bg-appBg-secondary border border-appBorder rounded-xl px-4 py-2.5 text-xs text-appText-primary font-bold outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-appText-muted select-none">Section Category</label>
                <select
                  value={createSection}
                  onChange={(e) => setCreateSection(e.target.value as any)}
                  className="w-40 bg-appBg-secondary border border-appBorder rounded-xl px-3 py-2.5 text-xs text-appText-primary outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="GENERAL">General</option>
                  <option value="VARC">VARC</option>
                  <option value="LRDI">LRDI</option>
                  <option value="QUANTS">QUANTS</option>
                </select>
              </div>
            </div>

            {/* Actions (Cancel button corrected dark mode style) */}
            <div className="p-5 border-t border-appBorder bg-appBg-secondary/50 flex justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-appBorder bg-transparent hover:bg-appBg-secondary text-appText-primary rounded-xl text-xs font-bold uppercase transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={!createTitle.trim()}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold uppercase transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Note
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {zoomImageUrl && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={() => setZoomImageUrl(null)}
        >
          <img 
            src={zoomImageUrl} 
            alt="Zoomed attachment" 
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" 
          />
        </div>,
        document.body
      )}

      {contextMenu && createPortal(
        <div 
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 z-50 text-[11px] font-bold text-slate-200 select-none w-32"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              document.execCommand('copy')
              setContextMenu(null)
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-xs"
          >
            📋 Copy
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText()
                // Restore range if available
                if (contextMenu.savedRange) {
                  const sel = window.getSelection()
                  if (sel) {
                    sel.removeAllRanges()
                    sel.addRange(contextMenu.savedRange)
                  }
                }
                document.execCommand('insertText', false, text)
              } catch (err) {
                console.error('Failed to paste:', err)
              }
              setContextMenu(null)
            }}
            className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-xs"
          >
            📥 Paste
          </button>
          {(() => {
            const activeEditingNote = notes.find(n => n.id === editingNoteId)
            if (!activeEditingNote) return null
            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleAddBlockAction(activeEditingNote, 'image', contextMenu.savedRange)
                    setContextMenu(null)
                  }}
                  className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition cursor-pointer text-xs border-t border-slate-700/50 mt-1 pt-1.5"
                >
                  🖼️ Add Image
                </button>
              </>
            )
          })()}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Notes
