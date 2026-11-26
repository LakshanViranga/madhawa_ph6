import { API_URL } from '@/config/api.js'

export class ApiError extends Error {
    constructor(status, message, errors = []) {
        super(message)
        this.status = status // 0 means the server could not be reached
        this.errors = errors // every problem the server listed (validation errors)
    }
}

// Called whenever a request gets 401 (session expired). The app can use it to show the login form again.
let unauthorizedHandler = null
export const onUnauthorized = (fn) => { unauthorizedHandler = fn }

const withValues = (query = {}) => Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')

// Where a request really goes, so the same code works with the Vite proxy and with a server on its own address:
//   '/classes'                    -> API_URL + '/classes'
//   '/api/classes' (older callers that pass the full path) -> API_URL + '/classes'
//   'https://...'                 -> used as it is
export function toUrl(path) {
    if (/^https?:\/\//i.test(path)) return path
    //if (path === '/api' || path.startsWith('/api/')) return API_URL + path.slice(4)
    return API_URL + '/api' +(path.startsWith('/') ? path : `/${path}`)
}

export async function request(path, { method = 'GET', body, query } = {}) {
    const url = toUrl(path)
    const qs = new URLSearchParams(withValues(query)).toString()
    const isFormData = body instanceof FormData
    let res
    try {
        res = await fetch(qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url, {
            method,
            credentials: 'include',
            headers: body === undefined || isFormData ? undefined : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
        })
    } catch {
        // A server that is down and a CORS block look the same to the page, so say where to look
        console.warn(`Request to ${url} failed before any answer arrived. If the server is running, check CORS_ORIGINS on the server.`)
        throw new ApiError(0, 'Could not reach the server. Check your connection.')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        if (res.status === 401) unauthorizedHandler?.()
        const errors = Array.isArray(data.errors) ? data.errors : data.error ? [data.error] : []
        throw new ApiError(res.status, data.message ?? data.error ?? errors[0] ?? 'Something went wrong. Please try again.', errors)
    }
    return data
}

// Runs a request and returns a plain result, so components do not need try/catch:
//   const r = await attempt(() => request(...))
//   r.ok === true  -> r.data is the server response. If it is an object its fields are also on r (r.student)
//   r.ok === false -> r.error is a message to show, r.errors lists every problem, r.status is the HTTP status
export async function attempt(fn) {
    try {
        const data = await fn()
        const fields = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
        return { ...fields, ok: true, data }
    } catch (e) {
        if (e instanceof ApiError) return { ok: false, error: e.message, errors: e.errors, status: e.status }
        throw e // a real bug in our code: do not hide it
    }
}

// Shortcuts for the server routes. Paths are relative to the API address: http.get('/classes').
// get takes query params; the others take a body (an object, or FormData for uploads).
const call = (method, path, body, query) => attempt(() => request(path, { method, body, query }))

export const http = {
    get: (path, query) => call('GET', path, undefined, query),
    post: (path, body) => call('POST', path, body),
    put: (path, body) => call('PUT', path, body),
    patch: (path, body) => call('PATCH', path, body),
    delete: (path) => call('DELETE', path),
}
