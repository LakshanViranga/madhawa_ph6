<script setup>
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import {announcements, newestFirst} from '@/data/announcements'
import {tutor} from '@/data/tutor'
import {useLocalized} from '@/composables/useLocalized'
import {useSeo} from '@/composables/useSeo'

const {t, locale} = useI18n()
const {L} = useLocalized()

useSeo(() => ({
  title: `${t('announcements.title')} | ${tutor.name}`,
  description: t('announcements.lead'),
  path: '/announcements'
}))

const sorted = [...announcements].sort(newestFirst)
const tag = computed(() => ({si: 'si-LK', ta: 'ta-LK'})[locale.value] ?? 'en-LK')
const day = (d) => new Intl.DateTimeFormat(tag.value, {dateStyle: 'long'}).format(new Date(`${d}T00:00:00`))
</script>

<template>
  <div class="site">
    <SiteHeader/>
    <main class="wrap narrow sec">
      <router-link class="link" to="/">← {{ t('gallery.back') }}</router-link>
      <h1>{{ t('announcements.title') }}</h1>
      <p class="muted">{{ t('announcements.lead') }}</p>

      <p v-if="!sorted.length" class="muted">{{ t('announcements.none') }}</p>
      <article v-for="a in sorted" :key="a.id" class="card item">
        <div class="meta">
          <span class="tag on">{{ t(`announcements.${a.type}`) }}</span>
          <time :datetime="a.date">{{ day(a.date) }}</time>
        </div>
        <h3>{{ L(a.title) }}</h3>
        <img v-if="a.imageAttached" class="announcement-image" :src="a.image" :alt="a.alt" loading="lazy" decoding="async"/>
        <p>{{ L(a.body) }}</p>
      </article>
    </main>
    <SiteFooter/>
  </div>
</template>

<style scoped>
.item {
  margin-top: 1.25rem;
}

.meta {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .6rem;
  color: var(--muted);
  font-size: .85rem;
}

.announcement-image {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
}

.item p {
  margin: 0;
}
</style>
