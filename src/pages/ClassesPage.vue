<script setup>
import {ref, onMounted} from 'vue'
import {useStudent} from '@/composables/useStudent.js'
import {useConfirm} from "@/composables/useConfirm.js";
import AppLoader from "@/pages/AppLoader.vue";

const confirm = useConfirm()
const api = useStudent()

const classes = ref([])
const loading = ref(true)
const loadError = ref('')

// ---- eligible classes + join code request ----
const eligible = ref([])
const eligibleLoading = ref(true)
const eligibleError = ref('')
const codes = ref({})          // classId -> join code
const requesting = ref({})     // classId -> true while the request runs
const requestErrors = ref({})  // classId -> error message

async function load() {
  const r = await api.classes()
  if (r.ok) {
    classes.value = r.data
    loadError.value = ''
    loading.value = false
  } else {
    loadError.value = r.error
    loading.value = true
  }
}

const sampleClass = [
  {
    id: 101,
    title: 'A/L Combined Maths 2027',
    subject: 'Combined Mathematics',
    batch: '2027 A/L',
    description: 'Pure and applied maths, weekly theory and paper classes.'
  },
  {
    id: 102,
    title: 'A/L Physics 2027',
    subject: 'Physics',
    batch: '2027 A/L',
    description: 'Mechanics, waves and electricity with monthly model papers.'
  },
  {
    id: 103,
    title: 'A/L Chemistry 2027',
    subject: 'Chemistry',
    batch: '2027 A/L',
    description: ''
  },
  {
    id: 104,
    title: 'O/L Science Revision',
    subject: 'Science',
    batch: null,
    description: 'Short revision programme before the exam.'
  }
]

async function loadEligible() {
  const r = await api.eligibleClasses()
  if (r.ok) {
    eligible.value = r.data
    eligibleError.value = ''
  } else {
    eligibleError.value = r.error
  }
  eligibleLoading.value = false
}

async function requestCode(c) {
  requestErrors.value[c.id] = ''
  requesting.value[c.id] = true
  const r = await api.requestJoinCode(c.id)
  requesting.value[c.id] = false
  if (!r.ok) {
    requestErrors.value[c.id] = r.status === 429
        ? 'Too many tries. Please wait a few minutes.'
        : r.error || 'Could not get the code. Please try again.'
    return
  }
  codes.value[c.id] = r.data.code
}

function useCode(c) {
  code.value = codes.value[c.id]
  document.getElementById('code')?.focus()
}

onMounted(async ()=> {
  await Promise.all([load(), loadEligible()])
})

// ---- join ----
const code = ref('')
const busy = ref(false)
const error = ref('')
const message = ref('')

// Same clean-up the server does: case and spaces/dashes do not matter
const clean = (s) => s.toUpperCase().replace(/[\s-]/g, '')

async function join() {
  error.value = ''
  message.value = ''
  const c = clean(code.value)
  if (!/^[A-Z0-9]{6,16}$/.test(c)) {
    error.value = 'Enter the class code your tutor gave you.'
    return
  }
  busy.value = true
  const r = await api.joinClass(c) // 404 bad code, 403 other batch, 429 too many tries
  busy.value = false
  if (!r.ok) {
    error.value = r.status === 429 ? 'Too many tries. Please wait a few minutes.' : r.error
    return
  }
  message.value = r.data.alreadyMember ? `You are already in ${r.data.title}.` : `You joined ${r.data.title}.`
  code.value = ''
  await load()
}

const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

async function askUnenroll(c) {
  error.value = ''
  message.value = ''
  await confirm({
    title: 'Leave this class?',
    message: `You will lose access to the lessons, quizzes and tests in ${c.title}.`,
    confirmText: 'Yes, leave',
    danger: true,
    action: async () => { // modal shows "Please wait..." while this runs
      const r = await api.leaveClass(c.id)
      if (!r.ok) {
        error.value = r.error || 'Could not leave the class. Please try again.'
        return
      }
      message.value = `You left ${c.title}.`
      await load()
    },
  })
}
</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>My classes</h1>

      <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>
      <AppLoader v-else-if="loading" variant="cards" label="Your class info loading" />
      <p v-else-if="!classes.length" class="muted empty">You have not joined a class yet. Enter the code from your tutor
        below.</p>

      <section class="grid">
        <article v-for="c in classes" :key="c.id" class="card" :class="{ done: c.status === 'archived' }">
          <div>
            <span class="tag">{{ c.subject }}<template v-if="c.batch"> · {{ c.batch }}</template></span>
            <h2>{{ c.title }}</h2>
            <p v-if="c.description" class="muted">{{ c.description }}</p>
          </div>
          <p class="muted next">
            <template v-if="c.status === 'archived'">This class has finished. Lessons and recordings stay available.
            </template>
            <template v-else-if="c.nextSessionAt">Next live class: <b>{{ fmt(c.nextSessionAt) }}</b></template>
            <template v-else>No live class scheduled yet.</template>
          </p>
          <p class="counts">
            <span class="chip">{{ plural(c.quizCount ?? 0, 'quiz', 'quizzes') }}</span>
            <span class="chip">{{ plural(c.writtenTestCount ?? 0, 'written test', 'written tests') }}</span>
            <span class="chip">{{ plural(c.recordingCount, 'recording', 'recordings') }}</span>
          </p>
          <div class="acts">
            <router-link :to="`/lms/classes/${c.id}/lessons`" class="btn">Lessons and recordings</router-link>
            <router-link :to="`/lms/classes/${c.id}/quiz`" class="btn ghost">Quizzes</router-link>
            <router-link :to="`/lms/classes/${c.id}/tests`" class="btn ghost">Tests</router-link>
            <div class="leave">
              <button class="btn-link" type="button" @click="askUnenroll(c)">Unenroll from this class</button>
            </div>
          </div>
        </article>
      </section>
      <section v-if="eligibleError || eligible.length" class="panel eligible" aria-labelledby="h-eligible">
        <h2 id="h-eligible">Available classes</h2>
        <p class="muted">Classes you can join. Request a join code, then use it below.</p>

        <p v-if="eligibleError" class="err" role="alert">{{ eligibleError }}</p>

        <ul v-else class="elist">
          <li v-for="c in eligible" :key="c.id">
            <div class="what">
              <span class="title">{{ c.title }}</span>
              <span class="muted">{{ c.subject }}<template v-if="c.batch"> · {{ c.batch }}</template></span>
              <span v-if="requestErrors[c.id]" class="err small" role="alert">{{ requestErrors[c.id] }}</span>
            </div>

            <div v-if="codes[c.id]" class="got">
              <span class="code" aria-label="Join code">{{ codes[c.id] }}</span>
              <button class="btn ghost" type="button" @click="useCode(c)">Use code</button>
            </div>
            <button v-else class="btn ghost" type="button" :disabled="requesting[c.id]" @click="requestCode(c)">
              {{ requesting[c.id] ? 'Requesting...' : 'Request join code' }}
            </button>
          </li>
        </ul>
      </section>
      <section class="panel join">
        <h2>Join a class</h2>
        <p class="muted">Your tutor gives you a class code. Type it here to join.</p>
        <form class="row" @submit.prevent="join">
          <label class="sr" for="code">Class code</label>
          <input id="code" v-model="code" autocomplete="off" autocapitalize="characters" spellcheck="false"
                 maxlength="20" placeholder="Class code" :disabled="busy" :aria-invalid="Boolean(error)"/>
          <button class="btn" type="submit" :disabled="busy || !code.trim()">{{
              busy ? 'Joining...' : 'Join class'
            }}
          </button>
        </form>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <p v-if="message" class="ok" role="status">{{ message }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 1020px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0 0 1.5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: .2rem 0 .4rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.empty {
  margin-bottom: 1.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: .8rem;
  padding: 1.3rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--surface);
}

.card.done {
  border-color: var(--line);
}

.tag {
  font-size: .8rem;
  color: var(--gold);
}

.next b {
  color: var(--text);
  font-weight: 600;
}

.counts {
  display: flex;
  gap: .5rem;
  margin: 0;
  flex-wrap: wrap;
}

.chip {
  padding: .05rem .6rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .78rem;
  color: var(--muted);
}

.acts {
  display: flex;
  gap: .6rem;
  flex-wrap: wrap;
  margin-top: auto;
}

.btn {
  display: inline-block;
  padding: .65rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .92rem var(--font-body);
  text-decoration: none;
  cursor: pointer;
}

.leave {
  border-top: 1px solid var(--line);
  padding-top: .6rem;
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
  color: var(--danger);
}

.btn:hover {
  background: var(--gold-soft);
}

.btn.ghost {
  background: transparent;
  color: var(--gold);
}

.btn.ghost:hover {
  background: var(--gold-glow);
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.join .row {
  display: flex;
  gap: .6rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.join input {
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

.join input[aria-invalid='true'] {
  border-color: var(--danger);
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: .8rem 0 0;
}

.ok {
  color: var(--gold);
  font-size: .9rem;
  margin: .8rem 0 0;
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
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

.eligible {
  margin-bottom: 2rem;
}

.elist {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.elist > li {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .85rem 0;
  border-top: 1px solid var(--line);
}

.elist > li:first-child {
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
}

.got {
  display: flex;
  align-items: center;
  gap: .7rem;
}

.code {
  padding: .4rem .8rem;
  border: 1px dashed var(--gold);
  border-radius: 6px;
  color: var(--gold-soft);
  font: 700 1rem ui-monospace, monospace;
  letter-spacing: .12em;
}

.err.small {
  margin: .2rem 0 0;
}

@media (max-width: 760px) {
  .elist > li {
    flex-wrap: wrap;
  }
}
</style>
