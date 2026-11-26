export function normalizeLkMobile(raw) {
    const compact = String(raw ?? '').replace(/[\s\-().]/g, '')
    const m = compact.match(/^(?:\+94|94|0)?(7\d{8})$/)
    return m ? `+94${m[1]}` : null
}

// +94771234567 -> "+94 77 123 4567", easier to read back to the person
export function formatLkMobile(e164) {
    const m = String(e164 ?? '').match(/^\+94(\d{2})(\d{3})(\d{4})$/)
    return m ? `+94 ${m[1]} ${m[2]} ${m[3]}` : String(e164 ?? '')
}
