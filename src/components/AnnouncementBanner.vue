<script setup>
import {ref, computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {announcements, isActive, newestFirst} from '@/data/announcements'
import {useLocalized} from '@/composables/useLocalized'

const {t} = useI18n()
const {L} = useLocalized()
const KEY = 'dismissed-announcement'

// The newest pinned announcement that has not expired
const current = computed(() => announcements.filter((a) => a.pinned && isActive(a)).sort(newestFirst)[0])

let saved = null
try {
  saved = localStorage.getItem(KEY)
} catch {
}
const dismissed = ref(saved)

const visible = computed(() => current.value && dismissed.value !== current.value.id)

function dismiss() {
  dismissed.value = current.value.id
  try {
    localStorage.setItem(KEY, current.value.id)
  } catch {
  }
}
</script>

<template>
  <div v-if="visible" class="banner" role="region" :aria-label="t('announcements.title')">
    <span class="tag">{{ t(`announcements.${current.type}`) }}</span>
    <span class="text">{{ L(current.title) }}</span>
    <router-link to="/announcements">{{ t('announcements.read') }}</router-link>
    <button type="button" :aria-label="t('announcements.dismiss')" @click="dismiss">✕</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .5rem 1rem;
  padding: .6rem 3rem .6rem 1.25rem;
  position: relative;
  background: var(--accent-glow);
  border-bottom: 1px solid var(--accent);
  color: var(--text);
  font: .92rem var(--font-body);
}

.tag {
  padding: .05rem .65rem;
  border: 1px solid var(--accent);
  border-radius: 99px;
  font-size: .75rem;
  color: var(--secondary);
}

.text {
  font-weight: 600;
}

a {
  color: var(--secondary);
}

button {
  position: absolute;
  right: .75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: var(--accent-glow);
}

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--heading);
  outline-offset: 2px;
}
</style>
