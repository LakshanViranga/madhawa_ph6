<script setup>
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import {features} from '@/data/features'
import {tutor, waLink} from '@/data/tutor'
import {useLocalized} from '@/composables/useLocalized'
import {useSeo} from '@/composables/useSeo'

const {t} = useI18n()
const {L} = useLocalized()

// A placeholder page: asks search engines to leave it out
useSeo(() => ({
  title: `${t('comingsoon.title')} | ${t('comingsoon.tag')} | ${tutor.name}`,
  description: t('comingsoon.lead'),
  path: '/lms/login',
  noindex: true
}))

const opening = computed(() => L(features.portalOpening))

// Simple line icons (drawn as paths)
const items = [
  {key: 'f1', paths: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11']},
  {key: 'f2', paths: ['M12 1a7 7 0 1 0 0 14a7 7 0 1 0 0-14z', 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12']},
  {key: 'f3', paths: ['M18 20V10', 'M12 20V4', 'M6 20v-6']},
  {key: 'f4', paths: ['M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z', 'M10 8l6 4-6 4z']},
]
</script>

<template>
  <div class="site">
    <SiteHeader/>

    <main class="page">
      <svg class="wave" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 100 C 100 0, 200 0, 300 100 S 500 200, 600 100 S 800 0, 900 100 S 1100 200, 1200 100"/>
      </svg>

      <section class="wrap intro">
        <span class="badge"><i class="dot" aria-hidden="true"></i>{{ t('comingsoon.tag') }}</span>
        <h1>{{ t('comingsoon.title') }}</h1>
        <p class="lead">{{ t('comingsoon.lead') }}</p>
        <p class="opening">
          <template v-if="opening"><b>{{ t('comingsoon.opening') }}:</b> {{ opening }}</template>
          <template v-else>{{ t('comingsoon.openingDefault') }}</template>
        </p>
        <div class="actions">
          <a class="btn btn-primary" :href="waLink(t('comingsoon.waText'))" target="_blank"
             rel="noopener">{{ t('comingsoon.notify') }}</a>
          <router-link class="btn btn-line" to="/">{{ t('comingsoon.home') }}</router-link>
        </div>
        <p class="muted note">{{ t('comingsoon.notifyText') }}</p>
      </section>

      <section class="wrap features">
        <ul class="grid">
          <li v-for="i in items" :key="i.key" class="card">
            <svg class="icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                 stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path v-for="d in i.paths" :key="d" :d="d"/>
            </svg>
            <h3>{{ t(`comingsoon.${i.key}Title`) }}</h3>
            <p>{{ t(`comingsoon.${i.key}Text`) }}</p>
          </li>
        </ul>
      </section>

      <section class="wrap meanwhile">
        <h2>{{ t('comingsoon.meanwhile') }}</h2>
        <ul class="links">
          <li>
            <router-link class="card" to="/resources">{{ t('comingsoon.resources') }} <span aria-hidden="true">→</span>
            </router-link>
          </li>
          <li>
            <router-link class="card" :to="{ path: '/', hash: '#videos' }">{{ t('comingsoon.videos') }} <span
                aria-hidden="true">→</span></router-link>
          </li>
          <li>
            <router-link class="card" :to="{ path: '/', hash: '#contact' }">{{ t('comingsoon.join') }} <span
                aria-hidden="true">→</span></router-link>
          </li>
        </ul>
      </section>
    </main>

    <SiteFooter/>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  overflow: hidden;
  padding: 5rem 0 4rem;
}

.wave {
  position: absolute;
  inset: 0 0 auto 0;
  width: 100%;
  height: 220px;
  opacity: .35;
  pointer-events: none;
}

.wave path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 2400;
  stroke-dashoffset: 2400;
  animation: draw 3s ease-out forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.intro {
  position: relative;
  text-align: center;
  display: grid;
  justify-items: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: .6rem;
  padding: .3rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 99px;
  color: var(--secondary);
  font-size: .85rem;
  font-weight: 600;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: .35;
    transform: scale(.7);
  }
}

h1 {
  margin: 1.25rem 0 1rem;
  font-size: clamp(3rem, 11vw, 6.5rem) !important;
  letter-spacing: -.02em;
  background: linear-gradient(90deg, var(--heading), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent !important;
}

.lead {
  max-width: 52ch;
  font-size: 1.2rem;
  color: var(--muted);
  margin: 0;
}

.opening {
  margin: 1.5rem 0 0;
  color: var(--text);
}

.opening b {
  color: var(--secondary);
}

.intro .actions {
  justify-content: center;
  margin: 1.75rem 0 .75rem;
}

.note {
  font-size: .88rem;
  margin: 0;
  max-width: 48ch;
}

.features {
  margin-top: 4rem;
}

.features .grid {
  list-style: none;
  padding: 0;
  margin: 0;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.features .card {
  text-align: left;
}

.icon {
  color: var(--secondary);
  margin-bottom: .75rem;
}

.features h3 {
  font-size: 1.1rem;
}

.features p {
  margin: 0;
  color: var(--muted);
  font-size: .93rem;
}

.meanwhile {
  margin-top: 4rem;
}

.meanwhile h2 {
  font-size: 1.4rem !important;
  margin: 0 0 1rem !important;
  color: var(--heading);
}

.links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.links a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  color: var(--text);
  text-decoration: none;
  font-weight: 600;
}

.links a:hover {
  border-color: var(--accent);
}

.links a span {
  color: var(--secondary);
}

@media (max-width: 760px) {
  .page {
    padding-top: 3.5rem;
  }

  .features, .meanwhile {
    margin-top: 3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave path {
    animation: none;
    stroke-dashoffset: 0;
  }

  .dot {
    animation: none;
  }
}
</style>
