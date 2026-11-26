<script setup>
import {ref, computed, watch, onMounted, onUnmounted} from 'vue'
import {useRoute} from 'vue-router'
import YoutubeEmbed from '@/components/YoutubeEmbed.vue'
import {useStudent} from '@/composables/useStudent.js'
import AppLoader from "@/pages/AppLoader.vue";

// Route: /lms/classes/:classId/lessons
const api = useStudent()
const route = useRoute()
const classId = computed(() => route.params.classId)

const data = ref(null) // { class, sessions, otherRecordings }
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  data.value = null
  const r = await api.lessons(classId.value)
  if (r.ok) {
    data.value = r.data
    error.value = ''
  } else {
    error.value = r.status === 404 ? 'This class was not found. Check that you have joined it.' : r.error
  }
  loading.value = false
}

onMounted(load)
watch(classId, load) // same page, different class

const watching = ref(null) // id of the recording that is open
const now = ref(Date.now())
const tick = setInterval(() => (now.value = Date.now()), 30000)
onUnmounted(() => clearInterval(tick))

const SOON_MS = 15 * 60 * 1000 // the join button appears 15 minutes before the start

// upcoming | soon | live | past | unscheduled
function stateOf(s) {
  if (!s.startsAt) return 'unscheduled'
  const start = new Date(s.startsAt).getTime()
  const end = s.endsAt ? new Date(s.endsAt).getTime() : start + 2 * 3600 * 1000
  if (now.value < start - SOON_MS) return 'upcoming'
  if (now.value < start) return 'soon'
  if (now.value <= end) return 'live'
  return 'past'
}

const stateLabel = {
  upcoming: 'Upcoming',
  soon: 'Starting soon',
  live: 'Live now',
  past: 'Finished',
  unscheduled: 'Not scheduled'
}

// Links are typed by tutors, so only open http(s) addresses
const safeHref = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '')

const when = (iso) => new Date(iso).toLocaleString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit'
})

function length(sec) {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

const toggle = (id) => (watching.value = watching.value === id ? null : id)

// ---------- materials ----------
const typeLabel = {
  slides: 'Slides',
  pdf: 'PDF',
  document: 'Document',
  worksheet: 'Worksheet',
  other: 'File',
  link: 'Link',
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="page">
    <main class="wrap">
      <router-link to="/lms/classes" class="back">Back to my classes</router-link>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <AppLoader v-else-if="loading" variant="cards"/>
      <template v-else-if="data">
        <h1>{{ data.class.title }}</h1>
        <p class="crumbs">
          <router-link :to="`/lms/classes/${classId}/quiz`">Quizzes</router-link>
          <router-link :to="`/lms/classes/${classId}/tests`">Tests</router-link>
        </p>

        <!-- One card per lesson -->
        <section v-for="s in data.sessions" :key="s.id" class="panel">
          <div class="head">
            <div>
              <span class="tag">Week {{ s.week }}</span>
              <h2>{{ s.title }}</h2>
              <p v-if="s.startsAt" class="muted">{{ when(s.startsAt) }}</p>
            </div>
            <span class="state" :class="stateOf(s)">{{ stateLabel[stateOf(s)] }}</span>
          </div>

          <p v-if="s.notes" class="notes">{{ s.notes }}</p>

          <a v-if="safeHref(s.meetingLink) && ['soon', 'live'].includes(stateOf(s))" class="btn"
             :href="safeHref(s.meetingLink)"
             target="_blank" rel="noopener noreferrer">Join the live class</a>
          <p v-else-if="safeHref(s.meetingLink) && stateOf(s) === 'upcoming'" class="muted">The join button appears 15
            minutes before the class starts.</p>

          <!-- Lesson materials -->
          <div v-if="s.materials?.length" class="recs">
            <h3>Materials</h3>
            <div v-for="m in s.materials" :key="m.id" class="rec">
              <div class="line">
                <span>
                  {{ m.title }}
                  <span class="tag kind">{{ typeLabel[m.type] ?? 'File' }}</span>
                  <small v-if="m.fileName && m.sizeBytes" class="muted">· {{ fileSize(m.sizeBytes) }}</small>
                </span>
                <a v-if="safeHref(m.url)" class="btn ghost" :href="safeHref(m.url)" target="_blank"
                   rel="noopener noreferrer">{{ m.fileName ? 'Download' : 'Open link' }}</a>
              </div>
            </div>
          </div>

          <div v-if="s.recordings.length" class="recs">
            <h3>Recordings</h3>
            <div v-for="r in s.recordings" :key="r.id" class="rec">
              <div class="line">
                <span>{{ r.title }} <small v-if="r.durationSec" class="muted">· {{
                    length(r.durationSec)
                  }}</small></span>
                <button v-if="r.provider === 'youtube' && safeHref(r.url)" class="btn ghost"
                        :aria-expanded="watching === r.id" @click="toggle(r.id)">
                  {{ watching === r.id ? 'Close' : 'Watch' }}
                </button>
                <a v-else-if="safeHref(r.url)" class="btn ghost" :href="safeHref(r.url)" target="_blank"
                   rel="noopener noreferrer">Open recording</a>
              </div>
              <youtube-embed v-if="watching === r.id && r.provider === 'youtube'" :url="r.url" :title="r.title"/>
            </div>
          </div>
          <p v-else-if="stateOf(s) === 'past'" class="muted" style="margin-top:.8rem">The recording for this class has
            not been added yet. Check again soon.</p>
        </section>

        <!-- Recordings that are not tied to a lesson -->
        <section v-if="data.otherRecordings.length" class="panel">
          <h2>More recordings</h2>
          <div class="recs">
            <div v-for="r in data.otherRecordings" :key="r.id" class="rec">
              <div class="line">
                <span>{{ r.title }} <small v-if="r.durationSec" class="muted">· {{
                    length(r.durationSec)
                  }}</small></span>
                <button v-if="r.provider === 'youtube' && safeHref(r.url)" class="btn ghost"
                        :aria-expanded="watching === r.id" @click="toggle(r.id)">
                  {{ watching === r.id ? 'Close' : 'Watch' }}
                </button>
                <a v-else-if="safeHref(r.url)" class="btn ghost" :href="safeHref(r.url)" target="_blank"
                   rel="noopener noreferrer">Open recording</a>
              </div>
              <youtube-embed v-if="watching === r.id && r.provider === 'youtube'" :url="r.url" :title="r.title"/>
            </div>
          </div>
        </section>

        <p v-if="!data.sessions.length && !data.otherRecordings.length" class="muted">No lessons have been added to this
          class yet.</p>
      </template>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
}

.wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--gold);
  font-size: .9rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0 0 .6rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: .2rem 0;
}

h3 {
  font: 600 .95rem var(--font-display);
  margin: 1.2rem 0 .6rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.err {
  color: var(--danger);
}

.tag {
  font-size: .8rem;
  color: var(--gold);
}

.tag.kind {
  margin: 0 .3rem;
  padding: .05rem .5rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
}

.crumbs {
  display: flex;
  gap: 1.25rem;
  margin: 0 0 1.5rem;
  font-size: .9rem;
}

.crumbs a {
  color: var(--gold);
}

.panel {
  padding: 1.4rem;
  margin-bottom: 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.state {
  flex: none;
  padding: .05rem .7rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .78rem;
  color: var(--muted);
}

.state.live, .state.soon {
  border-color: var(--gold);
  color: var(--gold);
}

.notes {
  margin: .8rem 0;
  white-space: pre-wrap;
}

.recs {
  display: grid;
  gap: .6rem;
}

.rec {
  padding: .7rem .9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.rec .line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.rec :deep(iframe), .rec :deep(.embed) {
  margin-top: .8rem;
}

.btn {
  display: inline-block;
  margin-top: .6rem;
  padding: .55rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .9rem var(--font-body);
  text-decoration: none;
  cursor: pointer;
}

.btn:hover {
  background: var(--gold-soft);
}

.btn.ghost {
  margin: 0;
  background: transparent;
  color: var(--gold);
}

.btn.ghost:hover {
  background: var(--gold-glow);
}

button:focus-visible, a:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}
</style>
