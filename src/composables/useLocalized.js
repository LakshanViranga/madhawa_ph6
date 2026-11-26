import { useI18n } from 'vue-i18n'

// Picks the right language for a piece of content.
//   L('Plain text')                         -> shown in every language
//   L({ en: 'Hello', si: '...', ta: '...' }) -> the current language, or English if that one is missing
export function useLocalized() {
    const { locale } = useI18n()
    const L = (value) => (value && typeof value === 'object' ? (value[locale.value] ?? value.en ?? '') : (value ?? ''))
    return { L }
}
