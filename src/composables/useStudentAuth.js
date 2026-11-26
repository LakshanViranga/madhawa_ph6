import { ref } from 'vue'
import { tenantName} from "@/config/tenant.js";
import { http } from '../api/http.js'
import { useUserStore} from "@/stores/userStore.js";

const isStudent = ref(false)
const ready = ref(false) // true once we know whether a login session exists

export function useStudentAuth() {
    // Call once when the admin area opens: checks the session cookie with the server.
    async function init() {
        if (ready.value) return
        try {
            const {ok, data} = await http.get('/auth/me')
            isStudent.value = ok && data.user?.role === 'student'
        } catch {}
        ready.value = true
    }

    async function login(loginId, password) {
        try {
            const {ok, data} = await http.post('/auth/login', { login_id: loginId, password, tenant: tenantName })

            if (!ok) return { ok: false, error: data.error || 'Login failed.' }
            if (data.user?.role !== 'student') {
                await http.post('/auth/logout')
                return { ok: false, error: 'This account is not an student account.' }
            }
            const userStore = useUserStore()
            userStore.setRole(data.user?.role)
            userStore.setBatch(data.user?.batchId)
            userStore.setName(data.user?.name)
            isStudent.value = true
            return { ok: true, user: data.user }
        } catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    async function register(reqData){
        try {
            await http.post('/auth/register', { ...reqData, tenant: tenantName, status: 'pending' })
            return { ok: true }
        }catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    async function getBatchList() {
        try{
            const result = await http.get('/auth/batches',
                {tenant: tenantName})
            return result.batches
        }catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    async function verifyRegistration (verify) {
        try{
            return  await http.post('/auth/verify', {...verify, tenant: tenantName})
        }catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    async function resendRegistrationCode(resendCode) {
        try{
            return  await http.post('/auth/resend', {...resendCode, tenant: tenantName})
        }catch {
            return { ok: false, error: 'Could not reach the server. Check your connection.' }
        }
    }

    return { isStudent, ready, init, login, register, getBatchList,verifyRegistration,resendRegistrationCode }
}
