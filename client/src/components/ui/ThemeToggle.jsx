import { Icon } from '@iconify/react'
import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle() {
    const { toggleTheme } = useTheme()

    return (
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            <div className="theme-toggle-indicator"></div>
            <div className="theme-icon icon-sun"><Icon icon="solar:sun-bold" /></div>
            <div className="theme-icon icon-moon"><Icon icon="solar:moon-bold" /></div>
        </button>
    )
}
