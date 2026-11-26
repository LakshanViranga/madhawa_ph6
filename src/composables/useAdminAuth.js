import { ref } from 'vue'
import { tenant} from "@/config/tenant.js";
import { http } from '../api/http.js'

const isAdmin = ref(false)
const ready = ref(false) // true once we know whether a login session exists


async function call(path, options = {}) {
    const res = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
}

export function useAdminAuth() {
    // Call once when the admin area opens: checks the session cookie with the server.
    async function init() {
        if (ready.value) return
        try {
            const {ok, data} = await http.get('/auth/me')
            isAdmin.value = ok && data.user?.role === 'admin'
        } catch {}
        ready.value = true
    }

    async function login(email, password) {
        try {
            const {ok, data} = await http.post('/auth/login', { login_id: email, password, tenant: tenant })

            if (!ok) return { ok: false, error: data.error || 'Login failed.' }
            if (data.user?.role !== 'admin') {
                await call('/auth/logout', { method: 'POST' })
                return { ok: false, error: 'This account is not an admin account.' }
            }
            isAdmin.value = true
            return { ok: true, user: data.user }
        } catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    return { isAdmin, ready, init, login }
}
