import { reactive } from 'vue'

const defaults = {
    title: 'Are you sure?',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
    action: null,        // optional async function run while the modal shows "busy"
}

export const confirmState = reactive({ open: false, busy: false, ...defaults })
let resolver = null

export function confirm(options = {}) {
    if (resolver) resolver(false)                    // a new request replaces an open one
    Object.assign(confirmState, defaults, options, { open: true, busy: false })
    return new Promise((resolve) => { resolver = resolve })
}

export function closeConfirm(result) {
    confirmState.open = false
    resolver?.(result)
    resolver = null
}

export async function acceptConfirm() {
    if (confirmState.busy) return
    if (confirmState.action) {
        confirmState.busy = true
        try { await confirmState.action() } catch (e) { console.error(e) }
        confirmState.busy = false
    }
    closeConfirm(true)
}

export const useConfirm = () => confirm
