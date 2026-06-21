import { useEffect } from 'react'

type PasteCallback = (file: File) => void

type ErrorCallback = (message: string) => void

function useClipboardPaste(onPaste: PasteCallback, onError: ErrorCallback) {
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          onPaste(file)
          event.preventDefault()
          return
        }
      }

      onError('No image found in clipboard. Use a screenshot and then press Ctrl+V.')
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [onPaste, onError])
}

export default useClipboardPaste
