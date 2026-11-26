import {onMounted, onUnmounted} from 'vue'

// Adds <meta name="robots" content="noindex"> while the calling component is mounted
export function useNoIndex() {
    let meta

    onMounted(() => {
        meta = document.createElement('meta')
        meta.name = 'robots'
        meta.content = 'noindex'
        document.head.append(meta)
    })

    onUnmounted(() => meta?.remove())
}
