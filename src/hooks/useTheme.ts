import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dim' | 'dark'

const STORAGE_KEY = 'gym-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    return saved || 'light'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
    const root = document.documentElement
    root.classList.remove('light', 'dim', 'dark')
    root.classList.add(theme)
  }, [theme])

  return { theme, setTheme }
}
