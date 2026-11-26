<script setup>
import {ref, computed, watch, onBeforeUnmount} from 'vue'
import AppLoader from '@/pages/AppLoader.vue'

// Wraps the part of a page that needs data:
//   <async-view :loading="loading" :error="error" variant="cards" label="Loading your classes" @retry="load">
//     ...the page content...
//   </async-view>
// While loading it shows the loader, on a failure a message with "Try again", otherwise the content.
const props = defineProps({
  loading: {type: Boolean, default: false},
  error: {type: String, default: ''},
  variant: {type: String, default: 'spinner'}, // spinner | cards | list | table
  label: {type: String, default: 'Loading'},
  delay: {type: Number, default: 200},    // ms to wait before showing anything, so a fast reply never flashes a loader
  minShow: {type: Number, default: 400},  // ms a loader that appeared stays, so it never flickers away
  minHeight: {type: String, default: '12rem'}, // space kept while waiting, so the page does not jump
})
const emit = defineEmits(['retry'])

const showLoader = ref(false)
let delayTimer = null
let hideTimer = null
let shownAt = 0

watch(() => props.loading, (now) => {
  clearTimeout(delayTimer)
  clearTimeout(hideTimer)
  if (now) {
    delayTimer = setTimeout(() => {
      showLoader.value = true
      shownAt = Date.now()
    }, props.delay)
  } else if (showLoader.value) {
    const left = props.minShow - (Date.now() - shownAt)
    hideTimer = setTimeout(() => (showLoader.value = false), Math.max(0, left))
  }
}, {immediate: true})

onBeforeUnmount(() => {
  clearTimeout(delayTimer)
  clearTimeout(hideTimer)
})

const busy = computed(() => props.loading || showLoader.value)
</script>

<template>
  <div v-if="busy" class="wait" :style="{ minHeight }" aria-busy="true">
    <AppLoader v-if="showLoader" :variant="variant" :label="label"/>
  </div>

  <div v-else-if="error" class="fail" role="alert">
    <p>{{ error }}</p>
    <button type="button" @click="emit('retry')">Try again</button>
  </div>

  <slot v-else/>
</template>

<style scoped>
.wait {
  display: flex;
  align-items: flex-start;
}

.fail {
  padding: 1.4rem;
  border: 1px solid var(--danger);
  border-radius: 6px;
  background: var(--surface);
}

.fail p {
  margin: 0 0 1rem;
  color: var(--danger);
}

.fail button {
  padding: .6rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: transparent;
  color: var(--gold);
  font: 600 .92rem var(--font-body);
  cursor: pointer;
}

.fail button:hover {
  background: var(--gold-glow);
}

.fail button:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}
</style>
