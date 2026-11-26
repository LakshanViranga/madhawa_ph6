<script setup>
import {useI18n} from 'vue-i18n'
import {waLink} from '@/data/tutor'

const {t} = useI18n()
</script>

<template>
  <a class="wa" :href="waLink(t('site.whatsappText'))" target="_blank" rel="noopener" :aria-label="t('site.whatsapp')">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
    <span>{{ t('site.whatsapp') }}</span>
  </a>
</template>

<style scoped>
.wa {
  position: fixed;
  z-index: 20;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .75rem 1rem;
  border-radius: 99px;
  background: var(--gold);
  color: var(--on-gold);
  text-decoration: none;
  font: 600 .9rem var(--font-body);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .35);
  transition: transform .15s;
}

.wa:hover {
  transform: translateY(-2px);
  background: var(--gold-soft);
}

.wa:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

@media (max-width: 600px) {
  .wa {
    padding: .85rem;
  }

  .wa span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wa {
    transition: none;
  }
}
</style>
