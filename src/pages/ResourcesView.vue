<script setup>
import {ref, computed} from 'vue'
import {useI18n} from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import {resources} from '@/data/resources'
import {tutor} from '@/data/tutor'
import {useLocalized} from '@/composables/useLocalized'
import {useSeo} from '@/composables/useSeo'
import {useHead} from '@unhead/vue'

useHead({
  title: 'Learning Resources | Tharka',

  meta: [
    {
      name: 'description',
      content: 'Explore educational resources on Tharka. Access useful learning materials, study guides and resources to support your learning and improve your academic performance.'
    },
    {
      property: 'og:title',
      content: 'Learning Resources | Tharka'
    },
    {
      property: 'og:description',
      content: 'Explore educational resources, study guides and learning materials on Tharka.'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: 'https://tharka.lk/resources'
    },
  ]
})

const {t} = useI18n()
const {L} = useLocalized()

useSeo(() => ({title: `${t('resources.title')} | ${tutor.name}`, description: t('resources.lead'), path: '/resources'}))

const kinds = ['all', 'notes', 'paper']
const kind = ref('all')
const shown = computed(() => (kind.value === 'all' ? resources : resources.filter((r) => r.kind === kind.value)))
const count = (k) => (k === 'all' ? resources.length : resources.filter((r) => r.kind === k).length)
</script>

<template>
  <div class="site">
    <SiteHeader/>
    <main class="wrap sec">
      <router-link class="link" to="/">← {{ t('gallery.back') }}</router-link>
      <h1>{{ t('resources.title') }}</h1>
      <p class="muted">{{ t('resources.lead') }}</p>

      <div class="tabs" role="group" :aria-label="t('resources.title')">
        <button v-for="k in kinds" :key="k" type="button" class="tab" :class="{ on: kind === k }"
                :aria-pressed="kind === k" @click="kind = k">
          {{ t(`resources.${k}`) }} <span>{{ count(k) }}</span>
        </button>
      </div>

      <p v-if="!shown.length" class="muted">{{ t('resources.none') }}</p>
      <div class="grid">
        <article v-for="r in shown" :key="r.id" class="card">
          <div class="meta"><span class="tag on">{{ t(`resources.${r.kind}`) }}</span><span class="tag">{{
              r.topic
            }}</span></div>
          <h3>{{ L(r.title) }}</h3>
          <p>{{ L(r.description) }}</p>
          <a class="btn btn-line" :href="r.file" download>{{ t('resources.download') }} · {{ r.size }}</a>
        </article>
      </div>
    </main>
    <SiteFooter/>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: 1.5rem;
}

.tab {
  padding: .45rem 1rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: .9rem;
  cursor: pointer;
}

.tab span {
  color: var(--muted);
  font-size: .8rem;
  margin-left: .25rem;
}

.tab:hover {
  border-color: var(--accent);
}

.tab.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

.tab.on span {
  color: var(--on-accent);
}

.meta {
  display: flex;
  gap: .5rem;
  margin-bottom: .6rem;
}

.card .btn {
  margin-top: .5rem;
}
</style>
