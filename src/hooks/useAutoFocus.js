import { useEffect } from 'react'

export const useAutoFocus = (inputRef, enabled = true) => {
  useEffect(() => {
    const focusInput = () => {
      if (enabled) inputRef.current?.focus()
    }

    focusInput()
    window.addEventListener('focus', focusInput)
    document.addEventListener('visibilitychange', focusInput)

    return () => {
      window.removeEventListener('focus', focusInput)
      document.removeEventListener('visibilitychange', focusInput)
    }
  }, [enabled, inputRef])
}
