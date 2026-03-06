export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                body: 'var(--bg-body)',
                sec: 'var(--bg-sec)',
                main: 'var(--text-main)',
                muted: 'var(--text-muted)',
                primary: 'var(--acc-primary)',
                secondary: 'var(--acc-sec)',
                success: 'var(--acc-success)',
                alert: 'var(--acc-alert)',
                gridline: 'var(--grid-color)',
                glass: {
                    bg: 'var(--glass-bg)',
                    border: 'var(--glass-border)'
                }
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                display: ['Syne', 'sans-serif'],
            }
        }
    },
    plugins: []
}
