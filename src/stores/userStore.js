import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: null,
        batch: {},
        role: null,
    }),

    getters: {
        isAssignBatch: (state) => state.role === 'student' && state.batch !== null
    },

    actions: {
        setRole(role) {
            this.role = role
        },
        setBatch(name) {
            this.batch = name
        },
        setName(name) {
            this.username = name
        }
    },

    persist: {
        storage: sessionStorage
    }
})
