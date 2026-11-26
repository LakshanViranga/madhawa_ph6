import { ref } from 'vue'
import { useStudent } from '@/composables/useStudent.js'

// module-level = shared singleton
const notifications = ref([])
const loaded = ref(false)
let inflight = null
let timer = null

export function useNotifications() {
    const api = useStudent()

    function load(force = false) {
        if (loaded.value && !force) return Promise.resolve()
        if (inflight) return inflight            // avoid duplicate calls
        inflight = api.listNotification({ limit: 20 })
            .then((n) => {
                if (n.ok) {
                    notifications.value = n.data.notifications
                    loaded.value = true
                }
            })
            .finally(() => { inflight = null })
        return inflight
    }

    function startPolling(ms = 60000) {
        stopPolling()
        timer = setInterval(() => load(true), ms)
    }

    function stopPolling() {
        clearInterval(timer)
        timer = null
    }

    function reset() {                          // call on logout
        stopPolling()
        notifications.value = []
        loaded.value = false
    }

    return { notifications, load, startPolling, stopPolling, reset }
}
