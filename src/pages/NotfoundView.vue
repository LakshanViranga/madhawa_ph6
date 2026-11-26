<script setup>
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { tutor } from '@/data/tutor'
import { useSeo } from '@/composables/useSeo'

const { t } = useI18n()
useSeo(() => ({ title: `${t('notfound.title')} | ${tutor.name}`, description: t('notfound.text'), path: '/', noindex: true }))
</script>

<template>
  <div class="site">
    <SiteHeader />
    <main class="wrap sec nf">
      <p class="code" aria-hidden="true">404</p>
      <h1>{{ t('notfound.title') }}</h1>
      <p class="muted">{{ t('notfound.text') }}</p>
      <div class="actions"><router-link class="btn btn-gold" to="/">{{ t('notfound.home') }}</router-link></div>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.nf { min-height: 55vh; display: grid; align-content: center; justify-items: start; }
.code { margin: 0; font: 600 clamp(4rem, 15vw, 8rem) var(--font-display); color: var(--gold); line-height: 1; }
</style>
