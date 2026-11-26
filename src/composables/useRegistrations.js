import { ref, watch } from 'vue'
import { request, attempt } from '@/api/http'

// Admin: class requests that came from the website form.
export function useRegistrations() {
    const items = ref([])
    const counts = ref({ new: 0, contacted: 0, done: 0 })
    const status = ref('') // '' = all, or 'new' | 'contacted' | 'done'
    const loading = ref(false)
    const saving = ref(false)
    const error = ref('')

    async function load() {
        loading.value = true
        error.value = ''
        const r = await attempt(() => request('/registrations', { query: { status: status.value } }))
        loading.value = false
        if (!r.ok) { error.value = r.error; return r }
        items.value = r.registrations
        counts.value = r.counts
        return r
    }
    watch(status, load)

    async function setStatus(id, next) {
        saving.value = true
        const r = await attempt(() => request(`/registrations/${id}`, { method: 'PATCH', body: { status: next } }))
        saving.value = false
        if (r.ok) await load()
        else error.value = r.error
        return r
    }

    // Phone numbers are saved as +94771234567, so a WhatsApp link only needs the digits.
    const whatsappUrl = (phone) => `https://wa.me/${String(phone).replace(/\D/g, '')}`

    return { items, counts, status, loading, saving, error, load, setStatus, whatsappUrl }
}
