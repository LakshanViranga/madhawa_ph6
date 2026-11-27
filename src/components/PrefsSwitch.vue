<script setup>
import {useI18n} from 'vue-i18n'
import {LOCALES, setLocale} from '@/i18n'
import {useTheme} from '@/composables/useTheme'

const {t} = useI18n()
const {theme, toggleTheme} = useTheme()
</script>

<template>
  <div class="prefs">
<!--    <select :value="locale" :aria-label="t('common.language')" @change="setLocale($event.target.value)">-->
<!--      <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>-->
<!--    </select>-->
    <button type="button" :aria-label="t('common.theme')" :title="t('common.theme')" @click="toggleTheme">
      <svg v-if="theme === 'night'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
           stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
           aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.prefs {
  display: flex;
  align-items: center;
  gap: .5rem;
}

select, button {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

select {
  padding: .4rem .5rem;
}

button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  color: var(--secondary);
}

select:hover, button:hover {
  border-color: var(--accent);
}

select:focus-visible, button:focus-visible {
  outline: 2px solid var(--heading);
  outline-offset: 2px;
}
</style>
