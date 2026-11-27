<script setup>
import { ref, watch, nextTick } from 'vue'
import { confirmState as s, closeConfirm, acceptConfirm } from '@/composables/useConfirm.js'

const dialog = ref(null)
const cancelBtn = ref(null)
let lastFocused = null

watch(() => s.open, async (open) => {
  if (open) {
    lastFocused = document.activeElement
    await nextTick()
    cancelBtn.value?.focus()                       // safe default focus
  } else {
    lastFocused?.focus?.()                         // return focus to the trigger
  }
})

function cancel() {
  if (!s.busy) closeConfirm(false)
}

// keep Tab inside the dialog
function onKeydown(e) {
  if (e.key === 'Escape') return cancel()
  if (e.key !== 'Tab') return
  const items = dialog.value.querySelectorAll('button:not([disabled])')
  if (!items.length) return
  const first = items[0], last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="s.open" class="backdrop" @mousedown.self="cancel">
        <div ref="dialog" class="modal" role="alertdialog" aria-modal="true"
             aria-labelledby="confirm-title" aria-describedby="confirm-msg" @keydown="onKeydown">
          <h2 id="confirm-title">{{ s.title }}</h2>
          <p v-if="s.message" id="confirm-msg">{{ s.message }}</p>
          <div class="btns">
            <button ref="cancelBtn" class="btn ghost" type="button" :disabled="s.busy"
                    @click="cancel">{{ s.cancelText }}</button>
            <button class="btn" :class="{ danger: s.danger }" type="button" :disabled="s.busy"
                    @click="acceptConfirm">{{ s.busy ? 'Please wait...' : s.confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / .6);
}

.modal {
  width: min(420px, 100%);
  padding: 1.5rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-body);
}

h2 {
  font: 600 1.2rem var(--font-display);
  margin: 0 0 .5rem;
}

p {
  margin: 0;
  color: var(--muted);
  font-size: .92rem;
  line-height: 1.5;
}

.btns {
  display: flex;
  justify-content: flex-end;
  gap: .6rem;
  margin-top: 1.4rem;
}

.btn {
  padding: .6rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font: 600 .9rem var(--font-body);
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  color: var(--secondary);
}

.btn.danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid var(--heading);
  outline-offset: 3px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity .15s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
