import {defineStore} from 'pinia'
import {http} from '../api/http.js'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        checked: false,
        _pending: null, // in-flight session check, shared by concurrent callers
    }),

    getters: {
        isLoggedIn: (state) => state.user !== null && state.user !== undefined,
    },

    actions: {
        checkSession() {
            // Reuse the request if one is already running
            if (this._pending) return this._pending

            this._pending = (async () => {
                try {
                    const response = await http.get('/auth/me')

                    if (!response.ok) {
                        this.user = null
                        return false
                    }

                    this.user = response.data
                    return true
                } catch (error) {
                    console.error('Session validation error:', error)
                    this.user = null
                    return false
                } finally {
                    this.checked = true
                    this._pending = null
                }
            })()

            return this._pending
        },

        // Call this after a successful login so the guard doesn't re-check
        setUser(user) {
            this.user = user
            this.checked = true
        },

        async logout() {
            try {
                await http.post('/auth/logout') // adjust to your endpoint; clears the cookie server-side
            } catch (error) {
                console.error('Logout error:', error)
            } finally {
                console.log('Logout success')
                this.user = null
                this.checked = true // we know the state: logged out
            }
        },
    },
})
