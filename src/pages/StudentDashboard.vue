<script setup>
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useStudent} from '@/composables/useStudent.js'
import AppLoader from "@/pages/AppLoader.vue";
import { useRouter } from "vue-router";
const router = useRouter();
const api = useStudent()

const classes = ref([])
const pending = ref([])      // [{ id, type: 'quiz'|'test', title, classId, classTitle, dueAt|null }]
const weeklyDone = ref(0)    // items finished this week (from api.dashboard)
const loading = ref(true)
const loadError = ref('')
const announcements = ref([])
const annIndex = ref()

async function load() {
  const r = await api.classes()
  if (!r.ok) {
    loadError.value = r.error
    return
  }

  // No classes joined yet: send the student to the classes page
  if (!r.data.length) {
    router.replace('/lms/classes')
    return
  }

  classes.value = r.data
  loadError.value = ''
  loading.value = false

  // Optional endpoint: GET /student/dashboard -> { pending: [...], weeklyDone: number }
  // If it does not exist yet, the page still works (pending list stays empty).
  if (typeof api.dashboard === 'function') {
    const d = await api.dashboard()
    if (d?.ok) {
      pending.value = d.data.pending ?? []
      weeklyDone.value = d.data.weeklyDone ?? 0
    }
  }
}

async function loadAnnouncements() {
  const r = await api.getMineAnnouncement()
  if (r?.ok) announcements.value = r.data ?? []
  annIndex.value = 0
}

const annSorted = computed(() =>
    [...announcements.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
)

// only the 6 latest, so the dots stay tidy
const annSlides = computed(() => annSorted.value.slice(0, 6))
const annCurrent = computed(() => annSlides.value[annIndex.value])

function annGo(step) {
  const n = annSlides.value.length
  if (!n) return
  annIndex.value = (annIndex.value + step + n) % n
}

// swipe support for phones
let touchX = null
const onTouchStart = (e) => { touchX = e.touches[0].clientX }
function onTouchEnd(e) {
  if (touchX === null) return
  const dx = e.changedTouches[0].clientX - touchX
  touchX = null
  if (Math.abs(dx) > 50) annGo(dx < 0 ? 1 : -1)
}

const isNew = (iso) => now.value - new Date(iso).getTime() < 3 * 86400000

function ago(iso) {
  const mins = Math.round((now.value - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ---- clock (for "in 2h 14m" labels) ----
const now = ref(Date.now())
let timer
onMounted(() => {
  load()
  loadAnnouncements()
  timer = setInterval(() => (now.value = Date.now()), 30000)
})
onBeforeUnmount(() => clearInterval(timer))

// ---- next live classes ----
const upcoming = computed(() =>
    classes.value
        .filter(c => c.status !== 'archived' && c.nextSessionAt && new Date(c.nextSessionAt) > now.value - 3600e3)
        .sort((a, b) => new Date(a.nextSessionAt) - new Date(b.nextSessionAt))
        .slice(0, 3)
)

function until(iso) {
  const mins = Math.round((new Date(iso).getTime() - now.value) / 60000)
  if (mins <= 0) return 'Live now'
  if (mins < 60) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `in ${h}h ${mins % 60}m`
  const d = Math.floor(h / 24)
  return `in ${d} ${d === 1 ? 'day' : 'days'}`
}

const isSoon = (iso) => new Date(iso).getTime() - now.value < 15 * 60000
const when = (iso) => new Date(iso).toLocaleString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})

// ---- pending quizzes and tests ----
const pendingSorted = computed(() =>
    [...pending.value].sort((a, b) => {
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt) - new Date(b.dueAt)
    })
)

function dueLabel(iso) {
  if (!iso) return 'No deadline'
  const days = Math.ceil((new Date(iso).getTime() - now.value) / 86400000)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

const isUrgent = (iso) => iso && new Date(iso).getTime() - now.value < 86400000

// ---- weekly target (saved on this device; MCQ explorer will set it later) ----
const TARGET_KEY = 'lms.weeklyTarget'
const target = ref(5)
try {
  const saved = Number(localStorage.getItem(TARGET_KEY))
  if (saved >= 1 && saved <= 50) target.value = saved
} catch { /* storage blocked: keep default */ }

const editingTarget = ref(false)

function setTarget(n) {
  target.value = Math.min(50, Math.max(1, n))
  try {
    localStorage.setItem(TARGET_KEY, String(target.value))
  } catch { /* ignore */ }
}

const RADIUS = 52
const CIRC = 2 * Math.PI * RADIUS
const ratio = computed(() => Math.min(1, weeklyDone.value / target.value))
const dash = computed(() => `${CIRC * ratio.value} ${CIRC}`)
const targetMet = computed(() => weeklyDone.value >= target.value)

</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>Dashboard</h1>

      <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>
      <AppLoader v-else-if="loading" variant="cards"/>
      <template v-else>
        <!-- Announcements carousel -->
        <section v-if="annSlides.length" class="panel ann" aria-roledescription="carousel" aria-labelledby="h-ann">
          <div class="head">
            <h2 id="h-ann">Announcements</h2>
            <span class="muted" v-if="annSlides.length > 1">{{ annIndex + 1 }} / {{ annSlides.length }}</span>
          </div>

          <div class="car" tabindex="0"
               @keydown.left.prevent="annGo(-1)"
               @keydown.right.prevent="annGo(1)"
               @touchstart.passive="onTouchStart"
               @touchend.passive="onTouchEnd">

            <button v-if="annSlides.length > 1" type="button" class="arrow" aria-label="Previous announcement"
                    @click="annGo(-1)">‹</button>
            <span v-else class="arrow-gap"></span>

            <div class="viewport" aria-live="polite">
              <Transition name="slide" mode="out-in">
                <article :key="annCurrent.id" class="slide">
                  <div class="note-top">
                    <span v-if="isNew(annCurrent.createdAt)" class="badge">New</span>
                    <span class="muted">
              {{ ago(annCurrent.createdAt) }}<template v-if="annCurrent.classTitle"> · {{ annCurrent.classTitle }}</template>
            </span>
                  </div>
                  <h3 class="ann-title">{{ annCurrent.title }}</h3>
                  <p class="body">{{ annCurrent.body }}</p>
                </article>
              </Transition>
            </div>

            <button v-if="annSlides.length > 1" type="button" class="arrow" aria-label="Next announcement"
                    @click="annGo(1)">›</button>
            <span v-else class="arrow-gap"></span>
          </div>

          <div v-if="annSlides.length > 1" class="dots" role="tablist" aria-label="Choose announcement">
            <button v-for="(a, i) in annSlides" :key="a.id" type="button" class="dot"
                    :class="{ active: i === annIndex }" role="tab" :aria-selected="i === annIndex"
                    :aria-label="`Announcement ${i + 1}`" @click="annIndex = i"></button>
          </div>
        </section>
        <div class="top">
          <!-- Next live classes -->
          <section class="panel" aria-labelledby="h-next">
            <h2 id="h-next">Next live classes</h2>
            <p v-if="!upcoming.length" class="muted">No live classes scheduled. Check back after your tutor adds one.</p>
            <ul v-else class="list">
              <li v-for="(c, i) in upcoming" :key="c.id" class="live" :class="{ first: i === 0 }">
                <div class="when">
                  <b :class="{ now: isSoon(c.nextSessionAt) }">{{ until(c.nextSessionAt) }}</b>
                  <span class="muted">{{ when(c.nextSessionAt) }}</span>
                </div>
                <div class="what">
                  <span class="title">{{ c.title }}</span>
                  <span class="muted">{{ c.subject }}<template v-if="c.batch"> · {{ c.batch }}</template></span>
                </div>
                <router-link :to="`/lms/classes/${c.id}/lessons`" class="btn" :class="{ ghost: !isSoon(c.nextSessionAt) }">
                  {{ isSoon(c.nextSessionAt) ? 'Join now' : 'Open class' }}
                </router-link>
              </li>
            </ul>
          </section>

          <!-- Weekly target -->
          <section class="panel goal" aria-labelledby="h-goal">
            <h2 id="h-goal">Weekly target</h2>
            <div class="ring" role="img"
                 :aria-label="`${weeklyDone} of ${target} done this week`">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle class="track" cx="60" cy="60" :r="RADIUS"/>
                <circle class="bar" :class="{ met: targetMet }" cx="60" cy="60" :r="RADIUS"
                        :stroke-dasharray="dash" transform="rotate(-90 60 60)"/>
              </svg>
              <div class="ring-text">
                <b>{{ weeklyDone }}</b>
                <span>of {{ target }}</span>
              </div>
            </div>
            <p class="muted center">
              {{ targetMet ? 'Target reached. Great work this week.' : `${target - weeklyDone} more to reach your target.` }}
            </p>

            <div v-if="editingTarget" class="stepper">
              <button type="button" class="step" aria-label="Decrease target" @click="setTarget(target - 1)">−</button>
              <span aria-live="polite">{{ target }} per week</span>
              <button type="button" class="step" aria-label="Increase target" @click="setTarget(target + 1)">+</button>
              <button type="button" class="btn-link" @click="editingTarget = false">Done</button>
            </div>
            <button v-else type="button" class="btn-link" @click="editingTarget = true">Change target</button>
          </section>
        </div>

        <!-- Pending quizzes and tests -->
        <section class="panel" aria-labelledby="h-pending">
          <h2 id="h-pending">Pending quizzes and tests</h2>
          <p v-if="!pendingSorted.length" class="muted">You are all caught up. Nothing is waiting for you.</p>
          <ul v-else class="list">
            <li v-for="p in pendingSorted" :key="`${p.type}-${p.id}`" class="task">
              <span class="kind">{{ p.type === 'quiz' ? 'Quiz' : 'Test' }}</span>
              <div class="what">
                <span class="title">{{ p.title }}</span>
                <span class="muted">{{ p.classTitle }}</span>
              </div>
              <span class="due" :class="{ urgent: isUrgent(p.dueAt) }">{{ dueLabel(p.dueAt) }}</span>
              <router-link :to="`/lms/classes/${p.classId}/${p.type === 'quiz' ? 'quiz' : 'tests'}`" class="btn ghost">
                Start
              </router-link>
            </li>
          </ul>
        </section>

        <!-- My classes (compact) + join -->
        <section class="panel" aria-labelledby="h-classes">
          <h2 id="h-classes">My classes</h2>
          <ul class="list">
            <li v-for="c in classes" :key="c.id" class="cls" :class="{ done: c.status === 'archived' }">
              <div class="what">
                <span class="title">{{ c.title }}</span>
                <span class="muted">
          {{ c.subject }}<template v-if="c.batch"> · {{ c.batch }}</template>
          <template v-if="c.status === 'archived'"> · Finished</template>
        </span>
              </div>
              <nav class="links" :aria-label="`${c.title} links`">
                <router-link :to="`/lms/classes/${c.id}/lessons`">Lessons</router-link>
                <router-link :to="`/lms/classes/${c.id}/quiz`">Quizzes</router-link>
                <router-link :to="`/lms/classes/${c.id}/tests`">Tests</router-link>
              </nav>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 1020px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  display: grid;
  gap: 1rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--heading);
  margin: 0 0 .5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0 0 .9rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.center {
  text-align: center;
}

.top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 1rem;
}

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .9rem;
}

.head h2 {
  margin: 0;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list > li {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .85rem 0;
  border-top: 1px solid var(--line);
}

.list > li:first-child {
  border-top: 0;
  padding-top: 0;
}

.what {
  display: flex;
  flex-direction: column;
  gap: .15rem;
  min-width: 0;
  flex: 1;
}

.title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* next live classes */
.when {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.when b {
  color: var(--heading);
  font-weight: 600;
}

.when b.now {
  color: var(--secondary);
}

.live.first .title {
  font-size: 1.1rem;
}

/* weekly target ring */
.goal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .8rem;
}

.goal h2 {
  align-self: flex-start;
  margin-bottom: 0;
}

.ring {
  position: relative;
  width: 150px;
  height: 150px;
}

.ring svg {
  width: 100%;
  height: 100%;
}

.ring circle {
  fill: none;
  stroke-width: 9;
}

.track {
  stroke: var(--line);
}

.bar {
  stroke: var(--accent);
  stroke-linecap: round;
  transition: stroke-dasharray .6s ease;
}

.bar.met {
  stroke: var(--heading);
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-text b {
  font: 600 2.1rem/1 var(--font-display);
  color: var(--heading);
}

.ring-text span {
  font-size: .8rem;
  color: var(--muted);
}

.stepper {
  display: flex;
  align-items: center;
  gap: .6rem;
  font-size: .9rem;
}

.step {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--secondary);
  font: 600 1.1rem var(--font-body);
  cursor: pointer;
}

.step:hover {
  background: var(--accent-glow);
}

/* pending */
.kind {
  min-width: 3.2rem;
  padding: .05rem .6rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .78rem;
  text-align: center;
  color: var(--secondary);
}

.due {
  font-size: .85rem;
  color: var(--muted);
  white-space: nowrap;
}

.due.urgent {
  color: var(--danger);
  font-weight: 600;
}

/* classes */
.cls.done .title {
  color: var(--muted);
}

.links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.links a {
  color: var(--secondary);
  font-size: .9rem;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}

/* buttons and form */
.btn {
  display: inline-block;
  padding: .6rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font: 600 .9rem var(--font-body);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.btn:hover {
  background: var(--heading);
}

.btn.ghost {
  background: transparent;
  color: var(--secondary);
}

.btn.ghost:hover {
  background: var(--accent-glow);
}

.btn.small {
  padding: .4rem .9rem;
  font-size: .85rem;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--muted);
  font: 500 .85rem var(--font-body);
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover {
  color: var(--heading);
}

.row {
  display: flex;
  gap: .6rem;
  margin-bottom: .9rem;
  flex-wrap: wrap;
}

.row input {
  flex: 1;
  min-width: 200px;
  padding: .7rem .9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: 600 1rem var(--font-body);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.row input::placeholder {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
}

.row input[aria-invalid='true'] {
  border-color: var(--danger);
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: 0 0 .8rem;
}

.ok {
  color: var(--secondary);
  font-size: .9rem;
  margin: 0 0 .8rem;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 2px solid var(--heading);
  outline-offset: 3px;
}

/* announcements carousel */
.ann {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.car {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: .8rem;
  outline-offset: 4px;
}

.viewport {
  overflow: hidden;
  min-height: 110px;
}

.slide {
  display: flex;
  flex-direction: column;
  gap: .4rem;
}

.note-top {
  display: flex;
  align-items: center;
  gap: .6rem;
  flex-wrap: wrap;
}

.badge {
  padding: .05rem .55rem;
  border-radius: 99px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.ann-title {
  font: 600 1.25rem var(--font-display);
  color: var(--heading);
  margin: 0;
}

.body {
  margin: 0;
  line-height: 1.55;
  white-space: pre-line;
}

.arrow {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--secondary);
  font: 600 1.6rem/1 var(--font-body);
  padding: 0 0 .2rem;
  cursor: pointer;
}

.arrow:hover {
  background: var(--accent);
  color: var(--on-accent);
}

.arrow-gap {
  width: 0;
}

.dots {
  display: flex;
  justify-content: center;
  gap: .5rem;
  margin-top: 1rem;
}

.dot {
  width: .6rem;
  height: .6rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: transparent;
  cursor: pointer;
}

.dot.active {
  background: var(--accent);
}

/* slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@media (max-width: 760px) {
  .arrow {
    width: 2rem;
    height: 2rem;
    font-size: 1.3rem;
  }

  .car {
    gap: .5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-enter-active,
  .slide-leave-active {
    transition: none;
  }
}

@media (max-width: 760px) {
  .top {
    grid-template-columns: 1fr;
  }

  .live, .task, .cls {
    flex-wrap: wrap;
  }

  .goal {
    order: -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
}
</style>
