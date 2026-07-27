import { useCallback, useEffect, useState } from 'react'
import { TextField } from '@mui/material'

const defaultDelay = 180

export function BufferedTextField({
  delay = defaultDelay,
  onBlur,
  onChange,
  onKeyDown,
  preventEnterSubmit = false,
  value = '',
  ...props
}) {
  const [inputValue, setInputValue] = useState(value)

  const emitChange = useCallback(
    (nextValue) => {
      if (nextValue === value) return

      onChange?.({
        currentTarget: { value: nextValue },
        target: { value: nextValue },
      })
    },
    [onChange, value],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      emitChange(inputValue)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, emitChange, inputValue])

  return (
    <TextField
      {...props}
      onBlur={(event) => {
        emitChange(inputValue)
        onBlur?.(event)
      }}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          emitChange(inputValue)
          if (preventEnterSubmit) event.preventDefault()
        }

        onKeyDown?.(event)
      }}
      value={inputValue}
    />
  )
}
