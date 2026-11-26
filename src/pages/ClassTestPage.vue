<script setup>
import {ref, computed, watch, onMounted, onBeforeUnmount} from 'vue'
import {useRoute} from 'vue-router'
import YoutubeEmbed from '@/components/YoutubeEmbed.vue'
import LmsHeader from '@/components/LmsHeader.vue'
import {useStudent} from '@/composables/useStudent.js'
import {useCountdown} from '@/composables/useCountdown.js'
import AppLoader from "@/pages/AppLoader.vue";

// Route: /lms/classes/:classId/tests   (written tests of one class, marked by the tutor)
// Online tests are taken here. Physical tests are held on paper: the student only sees the
// record (date held, marks or absent) plus any discussion video and marking scheme.
const api = useStudent()
const route = useRoute()
const classId = computed(() => route.params.classId)

const view = ref('list') // list | written | submitted | past
const data = ref(null)   // { class, tests }
const progress = ref(null)
const loading = ref(true)
const error = ref('')
const notice = ref('')
const busy = ref(false)

const quiz = ref(null)   // test being taken or reviewed: list row + paper + questions
const texts = ref([])    // typed answer by question index
const files = ref([])    // photos / PDF of written work
const fileError = ref('')
const pastResult = ref(null)
const saveState = ref('')

const {clock, seconds, start: startClock, stop: stopClock} = useCountdown(() => submit(true))

const tests = computed(() => data.value?.tests ?? [])
const discussion = computed(() => pastResult.value?.discussion ?? quiz.value?.discussion)
// Marking scheme / tutor answer sheet: { available, name, url }, only present when the tutor allowed it
const scheme = computed(() => pastResult.value?.scheme ?? quiz.value?.scheme)
const hasReview = (t) => t.discussion?.available || t.scheme?.available
const hasWork = computed(() => files.value.length > 0 || texts.value.some((t) => t && t.trim()))

// Same limits the server enforces
const MAX_FILES = 10
const MAX_BYTES = 15 * 1024 * 1024
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

async function load() {
  const [t, p] = await Promise.all([api.tests(classId.value, 'structured'), api.progress(classId.value, 'structured')])
  if (t.ok) {
    data.value = t.data
    error.value = ''
  } else {
    error.value = t.status === 404 ? 'This class was not found. Check that you have joined it.' : t.error
  }
  loading.value = false
  progress.value = p.ok ? p.data : null // a bonus, never block the page on it
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
  if (t.state === 'pending') return 'Handed in'
  if (t.state === 'done') return 'Marked'
  return 'Closed'
}

// Physical tests have nothing to start: the View button is there once there is something to see
const canViewPhysical = (t) => t.state === 'done' || t.state === 'absent' || hasReview(t)

// ---- taking a test ----
// One entry per question, so clearing a box clears it on the server too
const answerList = () => (quiz.value?.questions ?? []).map((_, i) => ({position: i + 1, text: texts.value[i] ?? ''}))

async function start(t) {
  if (t.isPhysical) return // physical tests are never attempted online
  error.value = ''
  notice.value = ''
  busy.value = true
  const r = await api.start(t.id) // starts, or resumes a running attempt
  if (!r.ok) {
    busy.value = false
    error.value = r.error
    if (r.status === 409) await load()
    return
  }
  const c = await api.content(t.id)
  busy.value = false
  if (!c.ok) {
    error.value = c.error
    return
  }
  quiz.value = {...t, ...c.data}
  texts.value = []
  r.data.answers.forEach((a) => {
    if (a.text) texts.value[a.position - 1] = a.text
  })
  files.value = [] // files are sent when you submit, so choose them again if you left the page
  fileError.value = ''
  saveState.value = ''
  view.value = 'written'
  startClock(r.data.attempt.remainingSeconds)
}

let saveTimer = null

function typed() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 900) // autosave typed answers shortly after you stop typing
}

async function save() {
  if (!quiz.value.questions.length) return
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

function pick(e) {
  fileError.value = ''
  for (const f of e.target.files) {
    if (!FILE_TYPES.includes(f.type)) fileError.value = `${f.name}: only PDF, JPEG or PNG files are accepted.`
    else if (f.size > MAX_BYTES) fileError.value = `${f.name} is larger than 15 MB.`
    else if (files.value.length >= MAX_FILES) fileError.value = 'You can attach up to 10 files.'
    else files.value.push(f)
  }
  e.target.value = '' // lets the same file be picked again
}

const removeFile = (i) => files.value.splice(i, 1)

let submitting = false

async function submit(timeout = false) {
  if (submitting) return
  if (!timeout && !hasWork.value) {
    error.value = 'Type an answer or attach your work before submitting.'
    return
  }
  submitting = true
  clearTimeout(saveTimer)
  busy.value = true
  error.value = ''
  const r = await api.submitWritten(quiz.value.id, answerList(), files.value)
  busy.value = false
  submitting = false
  if (!r.ok) {
    if (r.status === 409) return timeIsUp(r.error)
    error.value = r.errors?.length ? r.errors.join(' ') : r.error
    return
  }
  stopClock()
  view.value = 'submitted'
  load() // refresh the list
}

function leave() {
  if (view.value === 'written' && !window.confirm('Leave the test? Typed answers are saved, but the clock keeps running and attached files are not kept.')) return
  clearTimeout(saveTimer)
  stopClock()
  view.value = 'list'
  error.value = ''
  load()
}

onBeforeUnmount(() => clearTimeout(saveTimer))

// ---- reviewing a handed-in or physical test ----
async function openPast(t) {
  error.value = ''
  busy.value = true
  if (t.isPhysical) {
    // No paper or questions to load, only the recorded result (none yet if marks are not added)
    const r = await api.myResult(t.id)
    busy.value = false
    quiz.value = {...t, questions: [], paperUrl: null}
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
  pastResult.value = r.ok ? r.data : null // a missed test has no result
  view.value = 'past'
  window.scrollTo(0, 0)
}

const answerFor = (i) => pastResult.value?.answers?.find((a) => a.position === i + 1)
const isAbsent = computed(() => Boolean(pastResult.value?.absent))
const waiting = computed(() => {
  if (isAbsent.value) return false
  if (quiz.value?.isPhysical) return !pastResult.value || pastResult.value.marks == null
  return Boolean(pastResult.value) && pastResult.value.marks == null
})
</script>

<template>
  <div class="page">
    <!-- Test list -->
    <main v-if="view === 'list'" class="wrap">
      <p class="crumbs">
        <router-link to="/lms/classes">My classes</router-link>
        <router-link :to="`/lms/classes/${classId}/lessons`">Lessons</router-link>
        <router-link :to="`/lms/classes/${classId}/quiz`">Quizzes</router-link>
      </p>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <AppLoader v-if="loading" variant="cards" label="Loading Test..."/>
      <template v-else-if="data">
        <h1>{{ data.class.title }}: written tests</h1>

        <p v-if="progress?.pending > 0" class="notice" role="status">
          {{ progress.pending }} test{{ progress.pending === 1 ? ' is' : 's are' }} waiting for marks. {{ progress.pending === 1 ? 'It' : 'They' }} will count in your progress once your tutor has marked {{ progress.pending === 1 ? 'it' : 'them' }}.
        </p>

        <router-link v-if="progress && (progress.overall || progress.thisWeek?.rank)" to="/lms/progress" class="ranks">
          <span v-if="progress.overall"><small>Rank in written tests</small><b>{{ progress.overall.rank }}<i>/{{ progress.overall.of }}</i></b></span>
          <span v-if="progress.thisWeek?.rank"><small>This week's place</small><b>{{ progress.thisWeek.rank }}<i>/{{ progress.thisWeek.of }}</i></b></span>
          <span class="go">See progress chart and leaderboard</span>
        </router-link>

        <div class="layout single">
          <section class="list">
            <p v-if="!tests.length" class="muted">No written tests in this class yet.</p>
            <article v-for="t in tests" :key="t.id" class="quiz" :class="t.state">
              <div class="info">
                <span class="tag">Week {{ t.week }}<template v-if="t.topic"> · {{ t.topic }}</template></span>
                <h2>{{ t.title }}</h2>
                <p class="muted"><template v-if="t.minutes && !t.isPhysical">{{ t.minutes }} minutes · </template>{{ dueText(t) }}</p>
                <span v-if="t.isPhysical" class="chip">Physical test</span>
                <span v-if="t.state === 'in_progress'" class="chip">In progress</span>
                <span v-if="t.state === 'pending' && !t.isPhysical" class="chip soft">Waiting for marks</span>
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
                  <button v-if="t.state === 'open'" class="btn" :disabled="busy" @click="start(t)">Start test</button>
                  <button v-else-if="t.state === 'in_progress'" class="btn" :disabled="busy" @click="start(t)">Resume test</button>
                  <button v-else-if="t.state === 'done' || t.state === 'pending' || (t.state === 'missed' && hasReview(t))"
                          class="btn ghost" :disabled="busy" @click="openPast(t)">View</button>
                  <span v-else-if="t.state === 'upcoming'" class="muted">Not open yet</span>
                  <span v-else class="muted">Missed</span>
                </template>
              </div>
            </article>
          </section>
        </div>
      </template>
    </main>

    <!-- Taking a written test -->
    <main v-else-if="view === 'written'" class="wrap narrow">
      <div class="top">
        <button class="link" @click="leave">Leave test</button>
        <span v-if="seconds != null" class="clock" :class="{ low: seconds < 60 }" role="timer">{{ clock }}</span>
      </div>
      <h1>{{ quiz.title }}</h1>
      <p class="muted" style="margin-bottom:1rem">Written test<template v-if="quiz.totalMarks"> · {{ quiz.totalMarks }} marks</template></p>

      <section v-if="quiz.paperUrl" class="panel">
        <h2>Question paper</h2>
        <iframe class="paper" :src="quiz.paperUrl" title="Question paper"></iframe>
        <p class="muted" style="margin-top:.6rem">
          <a :href="quiz.paperUrl" target="_blank" rel="noopener noreferrer">Open the question paper in a new tab</a> if it does not show above.
        </p>
      </section>

      <section v-for="(x, i) in quiz.questions" :key="i" class="panel">
        <p class="muted" style="margin-bottom:.5rem">Question {{ i + 1 }} · {{ x.marks }} marks</p>
        <p v-if="x.text" class="qtext">{{ x.text }}</p>
        <figure v-if="x.image" class="qimg tight"><img :src="x.image" :alt="`Question ${i + 1}`"/></figure>
        <textarea v-model="texts[i]" rows="5" maxlength="10000" placeholder="Type your answer here"
                  :aria-label="`Answer to question ${i + 1}`" @input="typed"></textarea>
      </section>
      <p v-if="quiz.questions.length" class="muted save" aria-live="polite">
        {{ saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Typed answers saved' : saveState === 'error' ? 'Not saved. Check your connection.' : '' }}
      </p>

      <section class="panel">
        <h2>Attach your written work</h2>
        <p class="muted" style="margin-bottom:.8rem">Photos or a PDF of your handwritten answers. PDF, JPEG or PNG, up to 10 files of 15 MB each.</p>
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png" @change="pick"/>
        <ul v-if="files.length" class="files">
          <li v-for="(f, i) in files" :key="i"><span>{{ f.name }}</span><button class="link" @click="removeFile(i)">Remove</button></li>
        </ul>
        <p v-if="fileError" class="err" role="alert">{{ fileError }}</p>
      </section>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="nav">
        <button class="btn ghost" @click="leave">Leave test</button>
        <button class="btn" :disabled="busy" @click="submit()">{{ busy ? 'Submitting...' : 'Submit test' }}</button>
      </div>
    </main>

    <!-- Just submitted: waits for the tutor -->
    <main v-else-if="view === 'submitted'" class="wrap narrow">
      <h1>{{ quiz.title }}</h1>
      <section class="panel">
        <h2>Submitted</h2>
        <p class="muted">Your tutor will mark this test. The mark will appear here and in your progress once it is ready.</p>
      </section>
      <button class="btn" @click="leave">Back to tests</button>
    </main>

    <!-- Past test (online or physical) -->
    <main v-else class="wrap narrow">
      <button class="link" @click="leave">Back to tests</button>
      <h1>{{ quiz.title }}</h1>
      <div class="result">
        <template v-if="isAbsent">
          <b class="wait">Absent</b>
          <span class="muted">Week {{ quiz.week }} · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template></span>
        </template>
        <template v-else-if="waiting">
          <b class="wait">Marking</b>
          <span v-if="quiz.isPhysical" class="muted">Week {{ quiz.week }} · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template>, marks not added yet</span>
          <span v-else class="muted">Week {{ quiz.week }} · handed in, waiting for your tutor</span>
        </template>
        <template v-else-if="pastResult">
          <b>{{ pastResult.marks }}<small>/{{ pastResult.total }}</small></b>
          <span class="muted">Week {{ quiz.week }}<template v-if="quiz.isPhysical"> · physical test<template v-if="quiz.heldOn"> held {{ fmtDate(quiz.heldOn) }}</template></template> · your mark<template v-if="pastResult.rank"> · place {{ pastResult.rank }} of {{ pastResult.of }}</template></span>
        </template>
        <span v-else class="muted">Week {{ quiz.week }} · you did not attempt this test</span>
      </div>

      <section v-if="pastResult?.feedback" class="panel">
        <h2>Tutor feedback</h2>
        <p class="answer">{{ pastResult.feedback }}</p>
      </section>

      <section v-if="!waiting" class="panel">
        <h2>Discussion lesson</h2>
        <youtube-embed v-if="discussion?.available" :url="discussion.link" :title="quiz.title"/>
        <p v-else class="muted">The discussion lesson for this test has not been added yet. Check again soon.</p>
      </section>

      <section v-if="scheme?.available && !waiting" class="panel">
        <h2>Marking scheme</h2>
        <p class="muted" style="margin-bottom:.6rem">Your tutor's answer sheet for this test.</p>
        <a :href="scheme.url" target="_blank" rel="noopener noreferrer">{{ scheme.name }}</a>
      </section>

      <section v-if="quiz.paperUrl" class="panel">
        <h2>Question paper</h2>
        <a :href="quiz.paperUrl" target="_blank" rel="noopener noreferrer">Open the question paper</a>
      </section>

      <template v-if="pastResult && quiz.questions.length">
        <h2 class="sub">Your answers</h2>
        <section v-for="(x, i) in quiz.questions" :key="i" class="panel">
          <p class="muted" style="margin-bottom:.6rem">
            Question {{ i + 1 }} · {{ x.marks }} marks<template v-if="answerFor(i)?.marksAwarded != null"> · you got {{ answerFor(i).marksAwarded }}</template>
          </p>
          <p v-if="x.text" class="qtext">{{ x.text }}</p>
          <p class="answer">{{ answerFor(i)?.text || 'No typed answer' }}</p>
          <p v-if="answerFor(i)?.feedback" class="muted" style="margin-top:.6rem">Tutor: {{ answerFor(i).feedback }}</p>
        </section>
      </template>

      <section v-if="pastResult?.files?.length" class="panel">
        <h2>Your uploaded work</h2>
        <ul class="files">
          <li v-for="f in pastResult.files" :key="f.id"><a :href="f.url" target="_blank" rel="noopener noreferrer">{{ f.name }}</a></li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped src="../assets/classtest.css"></style>
