import { useEffect } from 'react'

export const useBarcodeShortcuts = ({ enabled = true, inputRef, onClear, onExport }) => {
  useEffect(() => {
    const handleKeyDown = async (event) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (enabled) inputRef.current?.focus()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        await onExport()
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        await onClear()
      }

      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        if (enabled) inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, inputRef, onClear, onExport])
}
