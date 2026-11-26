import { ref, reactive, watch } from 'vue'
import { request, attempt } from '@/api/http'
import { useClassChoice } from '@/composables/useClassChoice'
import { tenantName} from "@/config/tenant.js";

// The public "Join a class" form. No login needed.
//   const { form, sending, sent, error, submit } = useRegistration()
export function useRegistration() {
    const form = reactive({ student_name: '', phone: '', class_name: '', message: '', website: '' }) // website = hidden spam trap
    const sending = ref(false)
    const sent = ref(false)
    const failed = ref(false) // true after a failed send
    const error = ref('') // a specific message from the server, or '' to show the general one

    // When a visitor taps "Join this class" or "Ask about this class" on a class card, start with that class selected
    const { chosen } = useClassChoice()
    watch(chosen, (c) => {
        if (c) form.class_name = c.name
    })

    async function submit() {
        if (sending.value) return
        sending.value = true
        error.value = ''
        failed.value = false
        const r = await attempt(() => request('/registrations', { method: 'POST', body: { ...form, slug: tenantName } }))
        sending.value = false
        if (r.ok) { sent.value = true; return r }
        failed.value = true
        error.value = r.status === 400 || r.status === 429 ? r.errors.join(' ') : ''
        return r
    }

    function reset() {
        Object.assign(form, { student_name: '', phone: '', class_name: '', message: '', website: '' })
        sent.value = false
        failed.value = false
        error.value = ''
    }

    return { form, sending, sent, failed, error, submit, reset }
}
