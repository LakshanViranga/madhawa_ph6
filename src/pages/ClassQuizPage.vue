<script setup>
import {ref, computed, watch, onMounted, onBeforeUnmount} from 'vue'
import {useRoute} from 'vue-router'
import YoutubeEmbed from '@/components/YoutubeEmbed.vue'
import LmsHeader from '@/components/LmsHeader.vue'
import {useStudent} from '@/composables/useStudent.js'
import {useCountdown} from '@/composables/useCountdown.js'
import AppLoader from "@/pages/AppLoader.vue";

// Route: /lms/classes/:classId/quiz   (multiple choice quizzes of one class)
// Online quizzes are taken here. Physical MCQ tests are held on paper: the student only sees the
// record (date held, marks or absent) plus any discussion video and marking scheme.
const api = useStudent()
const route = useRoute()
const classId = computed(() => route.params.classId)

const view = ref('list') // list | taking | result | past
const data = ref(null)   // { class, tests }
const progress = ref(null)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const busy = ref(false)

const quiz = ref(null)   // the quiz being taken or reviewed: list row + questions
const index = ref(0)
const answers = ref([])  // chosen option (0-3) by question index
const result = ref(null) // mark returned by submit
const pastResult = ref(null)
const saveState = ref('')

const {clock, seconds, start: startClock, stop: stopClock} = useCountdown(() => submit(true))

const tests = computed(() => data.value?.tests ?? [])
const current = computed(() => quiz.value?.questions[index.value])
const progressPct = computed(() => (quiz.value ? ((index.value + 1) / quiz.value.questions.length) * 100 : 0))
const discussion = computed(() => pastResult.value?.discussion ?? quiz.value?.discussion)
// Marking scheme / tutor answer sheet: { available, name, url }, only present when the tutor allowed it
const scheme = computed(() => pastResult.value?.scheme ?? quiz.value?.scheme)
const hasReview = (t) => t.discussion?.available || t.scheme?.available

async function load() {
  const [t, p] = await Promise.all([api.tests(classId.value, 'mcq'), api.progress(classId.value, 'mcq')])
  if (t.ok) {
    data.value = t.data
    error.value = ''
  } else {
    error.value = t.status === 404 ? 'This class was not found. Check that you have joined it.' : t.error
  }
  progress.value = p.ok ? p.data : null
  loading.value = false
}

onMounted(load)
watch(classId, () => {
  loading.value = true
  view.value = 'list'
  data.value = null
  load()
})

const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'})

// heldOn is a plain date (YYYY-MM-DD). Build it from its parts so the timezone cannot shift the day.
const fmtDate = (v) => {
  if (!v) return ''
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'})
}

function dueText(t) {
  if (t.isPhysical) {
    const held = t.heldOn ? `Held ${fmtDate(t.heldOn)}` : 'Physical test'
    return t.state === 'done' || t.state === 'absent' ? held : `${held} · marks not added yet`
  }
  if (t.state === 'upcoming') return t.opensAt ? `Opens ${fmt(t.opensAt)}` : 'Not open yet'
  if (t.state === 'open' || t.state === 'in_progress') return t.closesAt ? `Closes ${fmt(t.closesAt)}` : 'Open now'
  if (t.state === 'done') return 'Completed'
  return 'Closed'
}

// Physical tests have nothing to start: the View button is there once there is something to see
const canViewPhysical = (t) => t.state === 'done' || t.state === 'absent' || hasReview(t)

// ---- taking a quiz ----
const answerList = () => Array.from(answers.value, (selected, i) => ({position: i + 1, selected})).filter((a) => a.selected != null)

async function start(t) {
  if (t.isPhysical) return // physical tests are never attempted online
  error.value = ''
  notice.value = ''
  busy.value = true
  const r = await api.start(t.id) // starts, or resumes a running attempt
  if (!r.ok) {
    busy.value = false
    error.value = r.error
    if (r.status === 409) await load() // already submitted, or time ran out
    return
  }
  const c = await api.content(t.id)
  busy.value = false
  if (!c.ok) {
    error.value = c.error
    return
  }
  quiz.value = {...t, ...c.data}
  answers.value = []
  r.data.answers.forEach((a) => {
    if (a.selected != null) answers.value[a.position - 1] = a.selected
  })
  index.value = 0
  saveState.value = ''
  view.value = 'taking'
  startClock(r.data.attempt.remainingSeconds) // the server says how much time is left
}

let saveTimer = null

function choose(i) {
  answers.value[index.value] = i
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 700) // autosave shortly after the last tap
}

async function save() {
  saveState.value = 'saving'
  const r = await api.saveAnswers(quiz.value.id, answerList())
  saveState.value = r.ok ? 'saved' : 'error'
  if (!r.ok && r.status === 409) await timeIsUp(r.error)
}

async function timeIsUp(message) {
  stopClock()
  notice.value = message
  view.value = 'list'
  await load()
}

let submitting = false

async function submit(timeout = false) {
  if (submitting) return
  submitting = true
  clearTimeout(saveTimer)
  busy.value = true
  const r = await api.submitMcq(quiz.value.id, answerList())
  busy.value = false
  submitting = false
  if (!r.ok) {
    if (r.status === 409) return timeIsUp(r.error)
    error.value = `${r.error} Your answers are saved. Try again.`
    return
  }
  stopClock()
  result.value = r.data
  view.value = 'result'
  load() // refresh the list and ranks in the background
}

function leave() {
  if (view.value === 'taking' && !window.confirm('Leave the quiz? Your answers are saved, but the clock keeps running.')) return
  clearTimeout(saveTimer)
  stopClock()
  view.value = 'list'
  error.value = ''
  load()
}

onBeforeUnmount(() => clearTimeout(saveTimer))

// ---- reviewing a finished quiz (online or physical) ----
async function openPast(t) {
  error.value = ''
  busy.value = true
  if (t.isPhysical) {
    // No questions to load, only the recorded result (none yet if marks are not added)
    const r = await api.myResult(t.id)
    busy.value = false
    quiz.value = {...t, questions: []}
    pastResult.value = r.ok ? r.data : null
    view.value = 'past'
    window.scrollTo(0, 0)
    return
  }
  const [c, r] = await Promise.all([api.content(t.id), api.myResult(t.id)])
  busy.value = false
  if (!c.ok) {
    error.value = c.error
    return
  }
  quiz.value = {...t, ...c.data}
  pastResult.value = r.ok ? r.data : null // a missed quiz has no result
  view.value = 'past'
  window.scrollTo(0, 0)
}

const mine = (i) => pastResult.value?.answers?.find((a) => a.position === i + 1)?.selected
const isAbsent = computed(() => Boolean(pastResult.value?.absent))
// Physical test whose marks the tutor has not entered yet
const waiting = computed(() =>
    Boolean(quiz.value?.isPhysical) && !isAbsent.value && (!pastResult.value || pastResult.value.marks == null))
</script>

<template>
  <div class="page">
    <!-- Quiz list -->
    <main v-if="view === 'list'" class="wrap">
      <p class="crumbs">
        <router-link to="/lms/classes">My classes</router-link>
        <router-link :to="`/lms/classes/${classId}/lessons`">Lessons</router-link>
        <router-link :to="`/lms/classes/${classId}/tests`">Written tests</router-link>
      </p>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <AppLoader v-if="loading" variant="cards"/>
      <template v-else-if="data">
        <h1>{{ data.class.title }}: quizzes</h1>

        <router-link v-if="progress && (progress.overall || progress.thisWeek?.rank)" to="/lms/progress" class="ranks">
          <span v-if="progress.overall"><small>Overall rank</small><b>{{ progress.overall.rank }}<i>/{{ progress.overall.of }}</i></b></span>
          <span v-if="progress.thisWeek?.rank"><small>This week's place</small><b>{{ progress.thisWeek.rank }}<i>/{{ progress.thisWeek.of }}</i></b></span>
          <span class="go">See progress chart and leaderboard</span>
        </router-link>

        <div class="layout">
          <section class="list">
            <p v-if="!tests.length" class="muted">No quizzes in this class yet.</p>
            <article v-for="t in tests" :key="t.id" class="quiz" :class="t.state">
              <div class="info">
                <span class="tag">Week {{ t.week }}<template v-if="t.topic"> · {{ t.topic }}</template></span>
                <h2>{{ t.title }}</h2>
                <p class="muted"><template v-if="t.minutes && !t.isPhysical">{{ t.minutes }} minutes · </template>{{ dueText(t) }}</p>
                <span v-if="t.isPhysical" class="chip">Physical test</span>
                <span v-if="t.state === 'in_progress'" class="chip">In progress</span>
                <span v-if="t.state === 'absent'" class="chip soft">Absent</span>
                <span v-if="t.discussion?.available" class="chip">Discussion video available</span>
                <span v-if="t.scheme?.available" class="chip">Marking scheme available</span>
              </div>
              <div class="act">
                <b v-if="t.state === 'done'" class="mark">{{ t.marks }}<small>/{{ t.total }}</small></b>

                <!-- Physical: nothing to start, only the record to view -->
                <template v-if="t.isPhysical">
                  <button v-if="canViewPhysical(t)" class="btn ghost" :disabled="busy" @click="openPast(t)">View</button>
                  <span v-else class="muted">Marks not added yet</span>
                </template>

                <!-- Online -->
                <template v-else>
                  <button v-if="t.state === 'open'" class="btn" :disabled="busy" @click="start(t)">Start quiz</button>
                  <button v-else-if="t.state === 'in_progress'" class="btn" :disabled="busy" @click="start(t)">Resume quiz</button>
                  <button v-else-if="t.state === 'done' || (t.state === 'missed' && hasReview(t))" class="btn ghost"
                          :disabled="busy" @click="openPast(t)">View</button>
                  <span v-else-if="t.state === 'upcoming'" class="muted">Not open yet</span>
                  <span v-else class="muted">Missed</span>
                </template>
              </div>
            </article>
          </section>

          <aside v-if="progress?.topics.length" class="growth">
            <h2>Your progress</h2>
            <div v-for="t in progress.topics" :key="t.topic" class="topic">
              <div class="row"><span>{{ t.topic }}</span><span>{{ t.pct != null ? t.pct + '%' : 'No result yet' }}</span></div>
              <div class="track"><div class="fill" :style="{ width: (t.pct ?? 0) + '%' }"></div></div>
            </div>
            <p class="muted">Average of your marked quizzes in each topic.</p>
          </aside>
        </div>
      </template>
    </main>

    <!-- Taking a quiz -->
    <main v-else-if="view === 'taking'" class="wrap narrow">
      <div class="top">
        <button class="link" @click="leave">Leave quiz</button>
        <span v-if="seconds != null" class="clock" :class="{ low: seconds < 60 }" role="timer">{{ clock }}</span>
      </div>
      <h1>{{ quiz.title }}</h1>
      <div class="track"><div class="fill" :style="{ width: progressPct + '%' }"></div></div>
      <p class="muted">Question {{ index + 1 }} of {{ quiz.questions.length }}</p>

      <figure class="qimg"><img :src="current.image" :alt="`Question ${index + 1}`"/></figure>
      <p class="muted">Choose the correct answer</p>
      <div class="letters" role="group" aria-label="Answer">
        <button v-for="(l, i) in '12345'" :key="l" class="lbtn" :class="{ on: answers[index] === i }"
                :aria-pressed="answers[index] === i" @click="choose(i)">{{ l }}</button>
      </div>
      <p class="muted save" aria-live="polite">
        {{ saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved. Check your connection.' : '' }}
      </p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <div class="nav">
        <button class="btn ghost" :disabled="index === 0" @click="index--">Previous</button>
        <button v-if="index < quiz.questions.length - 1" class="btn" @click="index++">Next</button>
        <button v-else class="btn" :disabled="busy" @click="submit()">{{ busy ? 'Submitting...' : 'Submit quiz' }}</button>
      </div>
    </main>

    <!-- Just submitted: mark only, no answers -->
    <main v-else-if="view === 'result'" class="wrap narrow">
      <h1>{{ quiz.title }}</h1>
      <div class="result">
        <b>{{ result.marks }}<small>/{{ result.total }}</small></b>
        <span class="muted">Your mark. It has been added to your progress.</span>
      </div>
      <p v-if="result.late" class="notice">Time ran out, so only the answers saved before the end were counted.</p>
      <section class="panel">
        <h2>Your answers</h2>
        <p class="answers">
          <span v-for="(x, i) in quiz.questions" :key="i" class="chip">Q{{ i + 1 }}: {{ '12345'[answers[i]] ?? '-' }}</span>
        </p>
        <p class="muted">A discussion lesson for this quiz will be shared on YouTube. You can find it under this quiz once it is available.</p>
      </section>
      <button class="btn" @click="leave">Back to quizzes</button>
    </main>

    <!-- Past quiz (online or physical) -->
    <main v-else class="wrap narrow">
      <button class="link" @click="leave">Back to quizzes</button>
      <h1>{{ quiz.title }}</h1>
      <div class="result">
        <template v-if="isAbsent">
          <b class="wait">Absent</b>
          <span class="muted">Week {{ quiz.week }} · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template></span>
        </template>
        <template v-else-if="waiting">
          <b class="wait">Marking</b>
          <span class="muted">Week {{ quiz.week }} · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template>, marks not added yet</span>
        </template>
        <template v-else-if="pastResult">
          <b>{{ pastResult.marks }}<small>/{{ pastResult.total }}</small></b>
          <span class="muted">Week {{ quiz.week }}<template v-if="quiz.isPhysical"> · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template></template> · your mark<template v-if="pastResult.rank"> · place {{ pastResult.rank }} of {{ pastResult.of }}</template></span>
        </template>
        <span v-else class="muted">Week {{ quiz.week }} · you did not attempt this quiz</span>
      </div>

      <section v-if="!waiting" class="panel">
        <h2>Discussion lesson</h2>
        <youtube-embed v-if="discussion?.available" :url="discussion.link" :title="quiz.title"/>
        <p v-else class="muted">The discussion lesson for this quiz has not been added yet. Check again soon.</p>
      </section>

      <section v-if="scheme?.available && !waiting" class="panel">
        <h2>Marking scheme</h2>
        <p class="muted" style="margin-bottom:.6rem">Your tutor's answer sheet for this quiz.</p>
        <a :href="scheme.url" target="_blank" rel="noopener noreferrer">{{ scheme.name }}</a>
      </section>

      <!-- Online quizzes only: a physical test has no questions on the LMS -->
      <template v-if="!quiz.isPhysical">
        <h2 class="sub">Questions<template v-if="pastResult"> and your answers</template></h2>
        <section v-for="(x, i) in quiz.questions" :key="i" class="panel">
          <p class="muted" style="margin:0 0 .6rem">Question {{ i + 1 }}</p>
          <figure class="qimg tight"><img :src="x.image" :alt="`Question ${i + 1}`" loading="lazy"/></figure>
          <p v-if="pastResult" style="margin:.6rem 0 0">Your answer: <b class="gold">{{ '12345'[mine(i)] ?? 'Not answered' }}</b></p>
        </section>
        <p class="muted">Correct answers are explained in the discussion lesson<template v-if="scheme?.available"> and the marking scheme</template>.</p>
      </template>
      <p v-else class="muted">This test was held on paper, so the questions are not on the LMS.</p>
    </main>
  </div>
</template>

<style scoped src="../assets/classtest.css"></style>
