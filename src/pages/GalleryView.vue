<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {useI18n} from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import {albums, photos, thumb, thumbFallback} from '@/data/gallery'
import {tutor} from '@/data/tutor'
import { useHead } from "@unhead/vue";

const {t} = useI18n()

useHead({
  title: 'Gallery | Tharka – Learning Moments & Events',

  meta: [
    {
      name: 'description',
      content: 'Explore the Tharka gallery featuring class activities, educational events, student achievements and memorable moments from our learning community.'
    },
    {
      name: 'robots',
      content: 'index, follow'
    },
    {
      property: 'og:title',
      content: 'Gallery | Tharka'
    },
    {
      property: 'og:description',
      content: 'Explore class activities, educational events, student achievements and memorable moments from the Tharka learning community.'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: 'https://tharka.lk/gallery'
    },]
})
const album = ref('all')
const shown = computed(() => (album.value === 'all' ? photos : photos.filter((p) => p.album === album.value)))
const count = (a) => (a === 'all' ? photos.length : photos.filter((p) => p.album === a).length)

// Enlarged view. A <dialog> gives us Esc to close, a focus trap and a dimmed backdrop for free.
const dialog = ref(null)
const index = ref(null)
const current = computed(() => (index.value === null ? null : shown.value[index.value]))

// Load the next and previous photos in the background, so swiping through is instant
function preload(i) {
  for (const d of [1, -1]) {
    const p = shown.value[(i + d + shown.value.length) % shown.value.length]
    if (p) new Image().src = p.src
  }
}

function open(i) {
  index.value = i
  preload(i)
  document.body.style.overflow = 'hidden'
  dialog.value.showModal()
}

const close = () => dialog.value.close()

function closed() { // runs for every way the dialog closes (button, Esc, backdrop)
  index.value = null
  document.body.style.overflow = ''
}

const step = (d) => {
  index.value = (index.value + d + shown.value.length) % shown.value.length;
  preload(index.value)
}
const onKey = (e) => {
  if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1)
}
const onBackdrop = (e) => {
  if (e.target === dialog.value) close()
}

// Swipe left or right on a phone
let startX = 0
const touchStart = (e) => {
  startX = e.changedTouches[0].clientX
}
const touchEnd = (e) => {
  const dx = e.changedTouches[0].clientX - startX
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
}

// Page title for the browser tab and for sharing
const previousTitle = document.title
onMounted(() => {
  document.title = `${t('gallery.title')} | ${tutor.name}`
})
onUnmounted(() => {
  document.title = previousTitle;
  document.body.style.overflow = ''
})
</script>

<template>
  <SiteHeader/>
  <main class="page">
    <router-link class="back" to="/">← {{ t('gallery.back') }}</router-link>
    <h1>{{ t('gallery.title') }}</h1>
    <p class="lead">{{ t('gallery.lead') }}</p>

    <div class="tabs" role="group" :aria-label="t('gallery.title')">
      <button v-for="a in ['all', ...albums]" :key="a" type="button" class="tab" :class="{ on: album === a }"
              :aria-pressed="album === a" @click="album = a">
        {{ t(`gallery.${a}`) }} <span>{{ count(a) }}</span>
      </button>
    </div>

    <ul class="grid">
      <li v-for="(p, i) in shown" :key="p.src">
        <button type="button" class="item" data-label="Photo" @click="open(i)">
          <img :src="thumb(p.src)" :alt="p.alt" loading="lazy" decoding="async" @error="thumbFallback($event, p.src)"/>
          <span v-if="p.caption" class="cap">{{ p.caption }}</span>
        </button>
      </li>
    </ul>
  </main>
  <SiteFooter/>

  <!-- Enlarged photo -->
  <dialog ref="dialog" class="lb" aria-label="Photo viewer" @close="closed" @keydown="onKey" @click="onBackdrop">
    <div v-if="current" class="box" @touchstart.passive="touchStart" @touchend.passive="touchEnd">
      <button type="button" class="ctl close" :aria-label="t('gallery.close')" @click="close">✕</button>
      <button type="button" class="ctl prev" :aria-label="t('gallery.prev')" @click="step(-1)">‹</button>
      <figure>
        <img :src="current.src" :alt="current.alt"/>
        <figcaption>
          <span v-if="current.caption">{{ current.caption }} · </span>{{ index + 1 }} / {{ shown.length }}
        </figcaption>
      </figure>
      <button type="button" class="ctl next" :aria-label="t('gallery.next')" @click="step(1)">›</button>
    </div>
  </dialog>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
  color: var(--text);
  font-family: var(--font-body);
}

.back {
  color: var(--gold);
  text-decoration: none;
  font-size: .9rem;
}

h1 {
  font: 600 clamp(1.8rem, 5vw, 2.8rem) var(--font-display);
  color: var(--gold-soft);
  margin: .75rem 0 .5rem;
  line-height: 1.15;
}

.lead {
  color: var(--muted);
  max-width: 56ch;
  margin: 0 0 1.5rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-bottom: 1.5rem;
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
  border-color: var(--gold);
}

.tab.on {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
}

.tab.on span {
  color: var(--on-gold);
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: .75rem;
}

.item {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-2);
  cursor: zoom-in;
}

.item::after {
  content: attr(data-label);
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: .8rem;
}

.item img {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .25s;
}

.item:hover img {
  transform: scale(1.04);
}

.cap {
  position: absolute;
  z-index: 2;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.2rem .75rem .5rem;
  text-align: left;
  font-size: .8rem;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, .7));
}

.item:focus-visible, .tab:focus-visible, .back:focus-visible, .ctl:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

/* Enlarged view */
.lb {
  width: 100%;
  height: 100%;
  max-width: 100vw;
  max-height: 100vh;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
}

.lb::backdrop {
  background: rgba(0, 0, 0, .9);
}

.box {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1rem 1rem;
  box-sizing: border-box;
}

figure {
  margin: 0;
  max-width: min(1100px, 100%);
  max-height: 100%;
  display: grid;
  gap: .6rem;
  justify-items: center;
}

figure img {
  max-width: 100%;
  max-height: calc(100vh - 8rem);
  object-fit: contain;
  border-radius: 4px;
}

figcaption {
  font-size: .9rem;
  color: #ddd;
}

.ctl {
  position: absolute;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, .4);
  border-radius: 50%;
  background: rgba(0, 0, 0, .5);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
}

.ctl:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.close {
  top: 1rem;
  right: 1rem;
}

.prev {
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
}

.next {
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .prev, .next {
    top: auto;
    bottom: 1rem;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .item img {
    transition: none;
  }
}
</style>
