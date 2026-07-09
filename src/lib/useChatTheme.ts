import { useCallback, useEffect, useState } from 'react'

export type ThemeId = 'nullpoint' | 'hacker' | 'aurora' | 'sunset'

const THEME_KEY = 'chat_theme'

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'nullpoint', label: 'NULLPOINT (الافتراضي)', swatch: '#14342b' },
  { id: 'hacker', label: 'هاكر', swatch: '#0b0f0c' },
  { id: 'aurora', label: 'أورورا', swatch: 'linear-gradient(135deg,#5b3cc4,#2563eb)' },
  { id: 'sunset', label: 'غروب', swatch: 'linear-gradient(135deg,#c2410c,#db2777)' },
]

export function useChatTheme() {
  const [theme, setThemeState] = useState<ThemeId>('nullpoint')

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeId | null
    if (saved && THEMES.some((t) => t.id === saved)) setThemeState(saved)
  }, [])

  const setTheme = useCallback((value: ThemeId) => {
    localStorage.setItem(THEME_KEY, value)
    setThemeState(value)
  }, [])

  return { theme, setTheme }
}
