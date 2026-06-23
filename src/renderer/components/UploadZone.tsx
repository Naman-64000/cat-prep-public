import { DragEvent, useRef, useState } from 'react'

const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

type UploadZoneProps = {
  section: 'VARC' | 'LRDI' | 'QUANTS'
  onUpload: (files: File[]) => Promise<void>
  onError: (message: string) => void
}

const sectionStyles = {
  VARC: {
    border: 'border-[#3B82F6]/30 dark:border-[#60A5FA]/25',
    borderHover: 'hover:border-[#3B82F6]/60 dark:hover:border-[#60A5FA]/50',
    bg: 'bg-[#3B82F6]/[0.02] dark:bg-[#3B82F6]/[0.06]',
    bgHover: 'hover:bg-[#3B82F6]/[0.05] dark:hover:bg-[#3B82F6]/[0.10]',
    shadow: 'hover:shadow-[0_4px_20px_rgba(59,130,246,0.1)]',
    text: 'text-[#3B82F6] dark:text-[#60A5FA]',
    button: 'border-[#3B82F6]/25 dark:border-[#60A5FA]/25 text-[#3B82F6] dark:text-[#60A5FA] bg-[#3B82F6]/[0.05] hover:bg-[#3B82F6]/[0.1] dark:bg-[#60A5FA]/[0.05] dark:hover:bg-[#60A5FA]/[0.1]'
  },
  LRDI: {
    border: 'border-[#8B5CF6]/30 dark:border-[#A78BFA]/25',
    borderHover: 'hover:border-[#8B5CF6]/60 dark:hover:border-[#A78BFA]/50',
    bg: 'bg-[#8B5CF6]/[0.02] dark:bg-[#8B5CF6]/[0.06]',
    bgHover: 'hover:bg-[#8B5CF6]/[0.05] dark:hover:bg-[#8B5CF6]/[0.10]',
    shadow: 'hover:shadow-[0_4px_20px_rgba(139,92,246,0.1)]',
    text: 'text-[#8B5CF6] dark:text-[#A78BFA]',
    button: 'border-[#8B5CF6]/25 dark:border-[#A78BFA]/25 text-[#8B5CF6] dark:text-[#A78BFA] bg-[#8B5CF6]/[0.05] hover:bg-[#8B5CF6]/[0.1] dark:bg-[#A78BFA]/[0.05] dark:hover:bg-[#A78BFA]/[0.1]'
  },
  QUANTS: {
    border: 'border-[#10B981]/30 dark:border-[#34D399]/25',
    borderHover: 'hover:border-[#10B981]/60 dark:hover:border-[#34D399]/50',
    bg: 'bg-[#10B981]/[0.02] dark:bg-[#10B981]/[0.06]',
    bgHover: 'hover:bg-[#10B981]/[0.05] dark:hover:bg-[#10B981]/[0.10]',
    shadow: 'hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)]',
    text: 'text-[#10B981] dark:text-[#34D399]',
    button: 'border-[#10B981]/25 dark:border-[#34D399]/25 text-[#10B981] dark:text-[#34D399] bg-[#10B981]/[0.05] hover:bg-[#10B981]/[0.1] dark:bg-[#34D399]/[0.05] dark:hover:bg-[#34D399]/[0.1]'
  }
}

function UploadZone({ section, onUpload, onError }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const style = sectionStyles[section]

  async function handleFiles(files: FileList | null | File[]) {
    if (!files) return
    const fileArray = Array.isArray(files) ? files : Array.from(files)
    if (fileArray.length === 0) return

    const limits = { VARC: 6, LRDI: 6, QUANTS: 1 }
    const maxFiles = limits[section]

    if (fileArray.length > maxFiles) {
      onError(`Upload failed: ${section} questions support up to ${maxFiles} image${maxFiles > 1 ? 's' : ''}.`)
      return
    }

    if (!fileArray.every((file) => acceptedTypes.includes(file.type))) {
      onError('Unsupported file type. Use PNG, JPG, JPEG, or WEBP.')
      return
    }
    await onUpload(fileArray)
  }

  async function triggerNativeFileDialog() {
    try {
      const response: any = await window.electron.invoke('app:selectImages')
      if (response && response.success && response.files) {
        const reconstructedFiles = response.files.map((fileData: any) => {
          return new File([fileData.buffer], fileData.name, { type: fileData.mimeType })
        })
        handleFiles(reconstructedFiles)
      } else if (response && response.error) {
        onError(`File dialog error: ${response.error}`)
      }
    } catch (err: any) {
      onError(`Failed to open file dialog: ${err.message}`)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div>
      <div
        className={`group relative rounded-2xl border border-dashed p-5 text-center cursor-pointer transition-all duration-250 transform hover:scale-[1.005] ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/20 shadow-md scale-[1.008]'
            : `${style.border} ${style.bg} ${style.borderHover} ${style.bgHover} ${style.shadow}`
        }`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={triggerNativeFileDialog}
        role="button"
        tabIndex={0}
      >
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-appText-primary">
            Upload question images
          </p>
          <p className="text-[10px] text-appText-muted leading-normal">
            Drag & drop images here, or paste them from your clipboard.
            <br />
            Supports up to 6 images for VARC, 6 for LRDI, and 1 for QUANTS.
          </p>
          <div className="pt-1">
            <button
              type="button"
              className={`rounded-full border px-4 py-1.5 text-[10px] font-bold tracking-wider transition duration-150 cursor-pointer ${style.button}`}
              onClick={(event) => {
                event.stopPropagation()
                triggerNativeFileDialog()
              }}
            >
              Select Image File
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
      </div>
    </div>
  )
}

export default UploadZone
