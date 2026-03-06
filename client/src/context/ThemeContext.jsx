import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(
        () => localStorage.getItem('outreachx-theme') || 'dark'
    )

    useEffect(() => {
        const root = document.documentElement
        root.setAttribute('data-theme', theme)
        localStorage.setItem('outreachx-theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark')

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
