import { ref } from 'vue'

export const THEMES = ['night', 'light']
const theme = ref(document.documentElement.dataset.theme || 'night')

export function useTheme() {
    function setTheme(t) {
        if (!THEMES.includes(t)) return
        theme.value = t
        document.documentElement.dataset.theme = t
        try { localStorage.setItem('theme', t) } catch {}
    }
    const toggleTheme = () => setTheme(theme.value === 'night' ? 'light' : 'night')
    return { theme, setTheme, toggleTheme }
}
