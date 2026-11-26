import { ref, computed, onUnmounted } from 'vue'

// Countdown for a timed test. start(seconds) takes the time the server says is left
// (null = no time limit). onEnd runs once when it reaches zero.
export function useCountdown(onEnd) {
    const seconds = ref(null)
    let timer = null

    const stop = () => {
        clearInterval(timer)
        timer = null
    }

    function start(s) {
        stop()
        seconds.value = s
        if (s == null) return
        if (s <= 0) return onEnd?.()
        timer = setInterval(() => {
            seconds.value -= 1
            if (seconds.value <= 0) {
                stop()
                onEnd?.()
            }
        }, 1000)
    }

    const clock = computed(() => {
        if (seconds.value == null) return ''
        const s = Math.max(0, seconds.value)
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    })

    onUnmounted(stop)
    return { seconds, clock, start, stop }
}
