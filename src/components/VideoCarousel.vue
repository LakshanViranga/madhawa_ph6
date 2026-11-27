<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Paste any YouTube link (watch, youtu.be, shorts or embed). Edit titles and topics.
const videos = [
  { url: 'https://www.youtube.com/watch?v=WR-8xRfbkH0', title: "Easy Physics, Full Paper Discussion", topic: 'All Syllabus' },
  { url: 'https://www.youtube.com/watch?v=L7868T1glzw', title: 'Solving a past paper question step by step', topic: 'Paper class' },
  { url: 'https://www.youtube.com/watch?v=QCqWPwAxRr8', title: 'Paper Marking Scheme Discussion', topic: 'Exam Tricks' },
  { url: 'https://www.youtube.com/watch?v=X6noeGva9qU', title: 'Paper Discussion', topic: 'Paper Discussion' },
  { url: 'https://www.youtube.com/watch?v=FGpLDPAf76w', title: 'MCQ Hacks in 5 minutes', topic: 'Exam Tricks' },
]

const idOf = (url) => (url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || url
const list = computed(() => videos.map((v) => ({ ...v, id: idOf(v.url) })))

const playing = ref(null) // only one video plays at a time
const track = ref(null)
const atStart = ref(true)
const atEnd = ref(false)

const update = () => {
  const el = track.value
  if (!el) return
  atStart.value = el.scrollLeft < 4
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
}
const go = (dir) => track.value.scrollBy({ left: dir * track.value.clientWidth * 0.8, behavior: 'smooth' })
const hide = (e) => { e.target.style.display = 'none' }
onMounted(update)
</script>

<template>
  <section id="videos" class="sec">
    <div class="wrap">
      <div class="head">
        <div>
          <h2>{{ t('videos.title') }}</h2>
          <p class="muted">{{ t('videos.lead') }}</p>
        </div>
        <div class="ctrl">
          <button type="button" :disabled="atStart" :aria-label="t('videos.prev')" @click="go(-1)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" :disabled="atEnd" :aria-label="t('videos.next')" @click="go(1)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div ref="track" class="track" tabindex="0" role="region" :aria-label="t('videos.title')" @scroll.passive="update">
        <article v-for="v in list" :key="v.url" class="slide">
          <div class="frame">
            <iframe
                v-if="playing === v.id"
                :src="`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`"
                :title="v.title"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowfullscreen
            ></iframe>
            <button v-else type="button" class="poster" data-label="Video" :aria-label="`${t('videos.play')}: ${v.title}`" @click="playing = v.id">
              <img :src="`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`" alt="" loading="lazy" @error="hide" />
              <span class="play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          </div>
          <span class="tag">{{ v.topic }}</span>
          <h3>{{ v.title }}</h3>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sec { padding: 5rem 0 0; background: var(--bg); color: var(--text); font-family: var(--font-body); }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 1.25rem; }
h2 { font: 600 clamp(1.6rem, 4vw, 2.3rem) var(--font-display); color: var(--heading); margin: 0 0 .5rem; line-height: 1.15; }
h3 { font: 600 1.05rem var(--font-display); margin: .4rem 0 0; line-height: 1.3; }
.muted { color: var(--muted); margin: 0; max-width: 56ch; }
.head { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.ctrl { display: flex; gap: .5rem; flex: none; }
.ctrl button { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--accent); border-radius: 50%; background: transparent; color: var(--secondary); cursor: pointer; }
.ctrl button:hover:not(:disabled) { background: var(--accent-glow); }
.ctrl button:disabled { opacity: .3; cursor: default; border-color: var(--line); }

.track { display: flex; gap: 1.25rem; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding-bottom: .5rem; }
.track::-webkit-scrollbar { display: none; }
.slide { flex: 0 0 min(340px, 85%); scroll-snap-align: start; }
.frame { position: relative; aspect-ratio: 16/9; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; background: var(--surface-2); }
.frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.poster { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; background: var(--surface-2); cursor: pointer; }
.poster::after { content: attr(data-label); position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: .8rem; }
.poster img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.play { position: absolute; z-index: 2; left: 50%; top: 50%; width: 56px; height: 56px; transform: translate(-50%, -50%); display: grid; place-items: center;
  border-radius: 50%; background: var(--accent); color: var(--on-accent); transition: transform .15s; }
.poster:hover .play { transform: translate(-50%, -50%) scale(1.1); }
.tag { display: inline-block; margin-top: .75rem; font-size: .78rem; color: var(--secondary); }
button:focus-visible, .track:focus-visible { outline: 2px solid var(--heading); outline-offset: 3px; }

@media (max-width: 760px) { .sec { padding-top: 3.5rem; } }
</style>
