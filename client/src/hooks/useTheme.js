import { useContext } from 'react'
import { useTheme as useThemeFromContext } from '../context/ThemeContext'

export const useThemeToggle = () => {
    return useThemeFromContext()
}

export default useThemeToggle
