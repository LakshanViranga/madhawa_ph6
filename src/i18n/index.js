import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import si from './locales/si.json'
import ta from './locales/ta.json'

export const LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'si', label: 'සිංහල' },
    { code: 'ta', label: 'தமிழ்' },
]

let saved = 'si'
try { saved = localStorage.getItem('locale') || 'si' } catch {}
if (!LOCALES.some((l) => l.code === saved)) saved = 'si'

const i18n = createI18n({
    legacy: false,
    locale: saved,
    fallbackLocale: 'si', // missing keys show English
    messages: { en, si, ta },
})
document.documentElement.lang = saved

export function setLocale(code) {
    i18n.global.locale.value = code
    document.documentElement.lang = code
    try { localStorage.setItem('locale', code) } catch {}
}

export default i18n
