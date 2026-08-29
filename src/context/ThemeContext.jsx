import React, { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const ThemeContext = createContext({
  theme: 'dark',
  effectiveTheme: 'dark',
  toggleTheme: () => {},
  isDark: true,
  isHomePage: false,
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('taskly_theme') || localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
    } catch (e) {
      console.error('Error reading theme from localStorage', e)
    }
    return 'dark' // Default theme is Dark Mode
  })

  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // Condition: Homepage বাদে বাকি সব পেজে কাজ করবে (Homepage stays in Dark mode)
  const effectiveTheme = isHomePage ? 'dark' : theme

  useEffect(() => {
    try {
      localStorage.setItem('taskly_theme', theme)
      localStorage.setItem('theme', theme)
    } catch (e) {
      console.error('Error saving theme to localStorage', e)
    }
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    root.setAttribute('data-theme', effectiveTheme)
    root.style.colorScheme = effectiveTheme
  }, [effectiveTheme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        toggleTheme,
        isDark: effectiveTheme === 'dark',
        isHomePage,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
