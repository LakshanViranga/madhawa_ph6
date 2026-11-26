import { ref, reactive, computed, watch, getCurrentScope, onScopeDispose } from 'vue'
import { request, attempt } from '@/api/http'

export function useStudents({ pageSize = 20 } = {}) {
    const students = ref([])
    const total = ref(0)
    const page = ref(1)
    const loading = ref(false)
    const saving = ref(false)
    const error = ref('') // message when the list could not be loaded
    const filters = reactive({ q: '', batch: '', status: '' }) // status: '' (active and pending), 'active', 'pending' or 'removed'

    const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
    let latest = 0 // numbers the requests, so a slow old answer cannot replace a newer one

    async function load() {
        const mine = ++latest
        loading.value = true
        error.value = ''
        const r = await attempt(() => request('/students', { query: { q: filters.q, batch: filters.batch, status: filters.status, page: page.value, page_size: pageSize } }))
        if (mine !== latest) return
        loading.value = false
        if (!r.ok) { error.value = r.error; return }
        students.value = r.students
        total.value = r.total
        // The last student on a page was removed: step back to the previous page.
        if (!r.students.length && page.value > 1) { page.value--; return load() }
    }

    async function goTo(n) {
        page.value = Math.min(Math.max(1, n), pageCount.value)
        await load()
    }

    // Search and filters: wait until typing pauses, then start again from page 1.
    let timer
    watch(filters, () => {
        clearTimeout(timer)
        timer = setTimeout(() => { page.value = 1; load() }, 300)
    })
    if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))

    // Runs a change, disables buttons while it runs, refreshes the list when it worked.
    async function change(fn, { reload = true } = {}) {
        saving.value = true
        const r = await attempt(fn)
        saving.value = false
        if (r.ok && reload) await load()
        return r
    }

    // data: { student_id, name, phone?, batch?, password?, status? }
    // On success r.student is the new student, and r.temporary_password is set when the server made the password. Show it once.
    const add = (data) => change(() => request('/students', { method: 'POST', body: data }))

    // changes: any of { student_id, name, phone, batch, status }
    const edit = (id, changes) => change(() => request(`/students/${id}`, { method: 'PATCH', body: changes }))
    const approve = (id) => edit(id, { status: 'active' })
    const hold = (id) => edit(id, { status: 'pending' })
    const restore = approve // a removed student comes back by being made active

    const remove = (id) => change(() => request(`/students/${id}`, { method: 'DELETE' }))

    // r.temporary_password holds the new password. Show it once.
    const resetPassword = (id) => change(() => request(`/students/${id}/reset-password`, { method: 'POST' }), { reload: false })

    return { students, total, page, pageCount, loading, saving, error, filters, load, goTo, add, edit, approve, hold, restore, remove, resetPassword }
}
