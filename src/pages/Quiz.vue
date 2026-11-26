<script setup>
import {ref, computed, onUnmounted} from 'vue'
import YoutubeEmbed from '@/components/YoutubeEmbed.vue'
import LmsHeader from '@/components/LmsHeader.vue'
import {useRoute} from "vue-router";

const route = useRoute()
const classId = route.params.classId

// Sample question images drawn as SVG. In the real site these are the images the admin uploads.
const paper = (q, o) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="250" viewBox="0 0 640 250"><rect width="640" height="250" fill="#fff"/>` +
    `<text x="24" y="42" font-family="Georgia,serif" font-size="17" fill="#111">${q}</text>` +
    o.map((t, i) => `<text x="40" y="${96 + i * 36}" font-family="Georgia,serif" font-size="17" fill="#111">${'ABCD'[i]})  ${t}</text>`).join('') + `</svg>`)

// `a` is the correct answer (0 = A). The real API never sends it to students.
const sample = [
  {
    img: paper('1. A 2 kg object is pushed by a net force of 6 N. Its acceleration is:', ['2 m/s²', '3 m/s²', '4 m/s²', '12 m/s²']),
    a: 1
  },
  {
    img: paper('2. Which law explains why passengers lurch forward when a bus brakes?', ["Newton's first law", "Newton's second law", "Newton's third law", 'Law of gravitation']),
    a: 0
  },
  {img: paper('3. The SI unit of force is the:', ['Joule', 'Watt', 'Newton', 'Pascal']), a: 2},
]

// Written test questions (typed answers). `marks` is the question's maximum.
const writtenQuestions = [
  {text: "1. State Newton's second law and show that F = ma when the mass is constant.", marks: 6},
  {text: '2. A 1200 kg car accelerates from rest to 20 m/s in 8 s. Calculate the net force acting on it.', marks: 4},
]

// Sample data shaped like the API. type: 'mcq' | 'structured'.
// status: open | upcoming | pending (written test waiting for marks) | done
// MCQ past quiz: `mine` = chosen options.  Written past test: `written` = { feedback, files, answers }.
const quizzes = ref([
  {
    id: 1,
    type: 'mcq',
    className: 'Physics A/L 2027',
    week: 'Week 12',
    title: "Newton's Laws of Motion",
    topic: 'Mechanics',
    minutes: 10,
    status: 'open',
    due: 'Closes Sunday, 9.00 pm',
    questions: sample
  },
  {
    id: 6,
    type: 'structured',
    className: 'Physics A/L 2027',
    week: 'Week 12',
    title: "Newton's Laws: structured questions",
    topic: 'Mechanics',
    minutes: 45,
    status: 'open',
    due: 'Closes Sunday, 9.00 pm',
    total: 10,
    paperUrl: '/papers/week-12-structured.pdf',
    questions: writtenQuestions
  },
  {
    id: 2,
    type: 'mcq',
    className: 'Physics A/L 2027',
    week: 'Week 13',
    title: 'Simple Harmonic Motion',
    topic: 'Oscillations',
    minutes: 12,
    status: 'upcoming',
    due: 'Opens Saturday, 8.00 am',
    questions: []
  },
  {
    id: 8,
    type: 'structured',
    className: 'Physics A/L 2027',
    week: 'Week 11',
    title: 'Work and Energy: structured questions',
    topic: 'Mechanics',
    minutes: 40,
    status: 'pending',
    due: 'Submitted',
    total: 10,
    questions: [],
    written: {
      feedback: null,
      files: [{name: 'answers.pdf', url: '#'}],
      answers: [{
        text: 'Work done = force x distance moved in the direction of the force.',
        marks: null,
        outOf: 6,
        feedback: null
      }, {text: 'KE = 1/2 m v^2 = 0.5 x 4 x 25 = 50 J', marks: null, outOf: 4, feedback: null}]
    },
  },
  {
    id: 7,
    type: 'structured',
    className: 'Physics A/L 2027',
    week: 'Week 10',
    title: 'Waves: structured questions',
    topic: 'Waves',
    minutes: 40,
    status: 'done',
    score: 7,
    total: 10,
    due: 'Completed',
    video: 'https://www.youtube.com/watch?v=PASTE_ID_03',
    questions: [],
    written: {
      feedback: 'Good working in question 1. Always write the unit with your final answer.',
      files: [{name: 'waves-answers.pdf', url: '#'}],
      answers: [{
        text: 'v = f x wavelength, so v = 50 x 0.4 = 20 m/s',
        marks: 5,
        outOf: 6,
        feedback: 'Correct. Name the wave equation first.'
      }, {
        text: 'Frequency doubles when the period halves.',
        marks: 2,
        outOf: 4,
        feedback: 'Show the working, T = 1/f.'
      }]
    },
  },
  {
    id: 3,
    type: 'mcq',
    className: 'Physics A/L 2027',
    week: 'Week 11',
    title: 'Work, Energy and Power',
    topic: 'Mechanics',
    minutes: 10,
    status: 'done',
    score: 2,
    total: 3,
    due: 'Completed',
    mine: [1, 0, 1],
    video: 'https://www.youtube.com/watch?v=PASTE_ID_01',
    questions: sample
  },
  {
    id: 4,
    type: 'mcq',
    className: 'Physics A/L 2027',
    week: 'Week 10',
    title: 'Waves and Sound',
    topic: 'Waves',
    minutes: 10,
    status: 'done',
    score: 3,
    total: 3,
    due: 'Completed',
    mine: [1, 0, 2],
    video: 'https://www.youtube.com/watch?v=PASTE_ID_02',
    questions: sample
  },
  {
    id: 5,
    type: 'mcq',
    className: 'Physics A/L 2027',
    week: 'Week 9',
    title: 'Current Electricity',
    topic: 'Electricity',
    minutes: 10,
    status: 'done',
    score: 2,
    total: 3,
    due: 'Completed',
    mine: [0, 0, 2],
    video: '',
    questions: sample
  },
])

const topics = [['Mechanics', 80], ['Waves', 60], ['Electricity', 90], ['Oscillations', 0]]

// Same limits the server enforces
const MAX_FILES = 10
const MAX_BYTES = 15 * 1024 * 1024
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const view = ref('list') // list | taking | written | result | submitted | past
const quiz = ref(null)
const index = ref(0)
const answers = ref([])      // MCQ: chosen option per question
const texts = ref([])        // written: typed answer per question
const files = ref([])        // written: attached files
const fileError = ref('')
const submitError = ref('')
const seconds = ref(0)
let timer = null

const current = computed(() => quiz.value?.questions[index.value])
const clock = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2, '0')}:${String(seconds.value % 60).padStart(2, '0')}`)
const score = computed(() => quiz.value ? quiz.value.questions.filter((x, i) => answers.value[i] === x.a).length : 0)
const progress = computed(() => quiz.value ? ((index.value + 1) / quiz.value.questions.length) * 100 : 0)
const hasWork = computed(() => files.value.length > 0 || texts.value.some((t) => t && t.trim()))

function start(q) {
  quiz.value = q
  index.value = 0
  answers.value = []
  texts.value = []
  files.value = []
  fileError.value = ''
  submitError.value = ''
  seconds.value = q.minutes * 60
  view.value = q.type === 'structured' ? 'written' : 'taking'
  clearInterval(timer)
  timer = setInterval(() => {
    if (--seconds.value <= 0) q.type === 'structured' ? submitWritten(true) : finish()
  }, 1000)
}

function finish() {
  clearInterval(timer)
  view.value = 'result'
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

// force = true when the timer runs out: whatever is on screen is sent
function submitWritten(force = false) {
  if (!force && !hasWork.value) {
    submitError.value = 'Type an answer or attach your work before submitting.'
    return
  }
  clearInterval(timer)
  // Real call:
  //   const fd = new FormData()
  //   fd.append('data', JSON.stringify({answers: texts.value.map((text, i) => ({position: i + 1, text}))}))
  //   files.value.forEach((f) => fd.append('files', f))
  //   POST /api/quizzes/:id/attempts/current/submit   (body: fd)
  quiz.value.status = 'pending'
  view.value = 'submitted'
}

function openPast(q) {
  quiz.value = q
  view.value = 'past'
  window.scrollTo(0, 0)
}

function back() {
  clearInterval(timer)
  view.value = 'list'
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="page">
    <router-link to="/lms/classes" class="back">Back to my classes</router-link>

    <!-- Quiz list -->
    <main v-if="view === 'list'" class="wrap">
      <h1>Weekly quizzes</h1>
      <router-link to="/lms/progress" class="ranks">
        <span><small>Overall rank</small><b>7<i>/42</i></b></span>
        <span><small>This week's place</small><b>4<i>/38</i></b></span>
        <span class="go">See progress chart and leaderboard</span>
      </router-link>
      <div class="layout">
        <section class="list">
          <article v-for="q in quizzes" :key="q.id" class="quiz" :class="q.status">
            <div class="info">
              <span class="tag">{{ q.week }} · {{ q.topic }} · {{ q.className }}</span>
              <h2>{{ q.title }}</h2>
              <p class="muted">{{ q.minutes }} minutes · {{ q.due }}</p>
              <span v-if="q.type === 'structured'" class="chip soft">Written test</span>
              <span v-if="q.status === 'pending'" class="chip soft">Waiting for marks</span>
              <span v-if="q.video" class="chip">Discussion video available</span>
            </div>
            <div class="act">
              <b v-if="q.status === 'done'" class="mark">{{ q.score }}<small>/{{ q.total }}</small></b>
              <button v-if="q.status === 'open'" class="btn" @click="start(q)">
                {{ q.type === 'structured' ? 'Start test' : 'Start quiz' }}
              </button>
              <button v-else-if="q.status === 'done' || q.status === 'pending'" class="btn ghost" @click="openPast(q)">
                View
              </button>
              <span v-else class="muted">Not open yet</span>
            </div>
          </article>
        </section>

        <aside class="growth">
          <h2>Your progress</h2>
          <div v-for="[name, pct] in topics" :key="name" class="topic">
            <div class="row"><span>{{ name }}</span><span>{{ pct ? pct + '%' : 'No quiz yet' }}</span></div>
            <div class="track">
              <div class="fill" :style="{ width: pct + '%' }"></div>
            </div>
          </div>
          <p class="muted">Average of all quizzes in each topic.</p>
        </aside>
      </div>
    </main>

    <!-- Taking a multiple choice quiz -->
    <main v-else-if="view === 'taking'" class="wrap narrow">
      <div class="top">
        <button class="link" @click="back">Leave quiz</button>
        <span class="clock" :class="{ low: seconds < 60 }" role="timer">{{ clock }}</span>
      </div>
      <h1>{{ quiz.title }}</h1>
      <div class="track">
        <div class="fill" :style="{ width: progress + '%' }"></div>
      </div>
      <p class="muted">Question {{ index + 1 }} of {{ quiz.questions.length }}</p>

      <figure class="qimg"><img :src="current.img" :alt="`Question ${index + 1}`"/></figure>
      <p class="muted">Choose the correct answer</p>
      <div class="letters" role="group" aria-label="Answer">
        <button v-for="(l, i) in 'ABCD'" :key="l" class="lbtn" :class="{ on: answers[index] === i }"
                :aria-pressed="answers[index] === i" @click="answers[index] = i">{{ l }}
        </button>
      </div>

      <div class="nav">
        <button class="btn ghost" :disabled="index === 0" @click="index--">Previous</button>
        <button v-if="index < quiz.questions.length - 1" class="btn" @click="index++">Next</button>
        <button v-else class="btn" @click="finish">Submit quiz</button>
      </div>
    </main>

    <!-- Taking a written (structured) test -->
    <main v-else-if="view === 'written'" class="wrap narrow">
      <div class="top">
        <button class="link" @click="back">Leave test</button>
        <span class="clock" :class="{ low: seconds < 60 }" role="timer">{{ clock }}</span>
      </div>
      <h1>{{ quiz.title }}</h1>
      <p class="muted" style="margin-bottom:1rem">Written test · {{ quiz.total }} marks</p>

      <section v-if="quiz.paperUrl" class="panel">
        <h2>Question paper</h2>
        <iframe class="paper" :src="quiz.paperUrl" title="Question paper"></iframe>
        <p class="muted" style="margin-top:.6rem">
          <a :href="quiz.paperUrl" target="_blank" rel="noopener noreferrer">Open the question paper in a new tab</a>
          if it does not show above.
        </p>
      </section>

      <section v-for="(x, i) in quiz.questions" :key="i" class="panel">
        <p class="muted" style="margin-bottom:.5rem">Question {{ i + 1 }} · {{ x.marks }} marks</p>
        <p v-if="x.text" class="qtext">{{ x.text }}</p>
        <figure v-if="x.img" class="qimg tight"><img :src="x.img" :alt="`Question ${i + 1}`"/></figure>
        <textarea v-model="texts[i]" rows="5" maxlength="10000" placeholder="Type your answer here"
                  :aria-label="`Answer to question ${i + 1}`"></textarea>
      </section>

      <section class="panel">
        <h2>Attach your written work</h2>
        <p class="muted" style="margin-bottom:.8rem">Photos or a PDF of your handwritten answers. PDF, JPEG or PNG, up
          to 10 files of 15 MB each.</p>
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png" @change="pick"/>
        <ul v-if="files.length" class="files">
          <li v-for="(f, i) in files" :key="i">
            <span>{{ f.name }}</span>
            <button class="link" @click="removeFile(i)">Remove</button>
          </li>
        </ul>
        <p v-if="fileError" class="err" role="alert">{{ fileError }}</p>
      </section>

      <p v-if="submitError" class="err" role="alert">{{ submitError }}</p>
      <div class="nav">
        <button class="btn ghost" @click="back">Leave test</button>
        <button class="btn" @click="submitWritten()">Submit test</button>
      </div>
    </main>

    <!-- Just submitted a multiple choice quiz: mark only, no answers -->
    <main v-else-if="view === 'result'" class="wrap narrow">
      <h1>{{ quiz.title }}</h1>
      <div class="result">
        <b>{{ score }}<small>/{{ quiz.questions.length }}</small></b>
        <span class="muted">Your mark. It has been added to your progress.</span>
      </div>
      <section class="panel">
        <h2>Your answers</h2>
        <p class="answers"><span v-for="(x, i) in quiz.questions" :key="i" class="chip">Q{{
            i + 1
          }}: {{ 'ABCD'[answers[i]] ?? '-' }}</span></p>
        <p class="muted">A discussion lesson for this quiz will be shared on YouTube. You can find it under this quiz in
          your past quizzes.</p>
      </section>
      <button class="btn" @click="back">Back to quizzes</button>
    </main>

    <!-- Just submitted a written test: waits for the tutor -->
    <main v-else-if="view === 'submitted'" class="wrap narrow">
      <h1>{{ quiz.title }}</h1>
      <section class="panel">
        <h2>Submitted</h2>
        <p class="muted">Your tutor will mark this test. The mark will appear here and in your progress once it is
          ready.</p>
      </section>
      <button class="btn" @click="back">Back to quizzes</button>
    </main>

    <!-- Past quiz or test -->
    <main v-else class="wrap narrow">
      <button class="link" @click="back">Back to quizzes</button>
      <h1>{{ quiz.title }}</h1>
      <div class="result">
        <template v-if="quiz.status === 'pending'">
          <b class="wait">Marking</b>
          <span class="muted">{{ quiz.week }} · submitted, waiting for your tutor</span>
        </template>
        <template v-else>
          <b>{{ quiz.score }}<small>/{{ quiz.total }}</small></b>
          <span class="muted">{{ quiz.week }} · your mark</span>
        </template>
      </div>

      <section v-if="quiz.status === 'done'" class="panel">
        <h2>Discussion lesson</h2>
        <youtube-embed v-if="quiz.video" :url="quiz.video" :title="quiz.title"/>
        <p v-else class="muted">The discussion lesson for this quiz has not been added yet. Check again soon.</p>
      </section>

      <!-- Written test: feedback, own answers, uploaded work -->
      <template v-if="quiz.type === 'structured'">
        <section v-if="quiz.written?.feedback" class="panel">
          <h2>Tutor feedback</h2>
          <p class="answer">{{ quiz.written.feedback }}</p>
        </section>

        <h2 class="sub">Your answers</h2>
        <section v-for="(a, i) in quiz.written?.answers ?? []" :key="i" class="panel">
          <p class="muted" style="margin-bottom:.6rem">
            Question {{ i + 1 }}
            <template v-if="a.marks != null"> · {{ a.marks }}/{{ a.outOf }} marks</template>
          </p>
          <p class="answer">{{ a.text || 'No typed answer' }}</p>
          <p v-if="a.feedback" class="muted" style="margin-top:.6rem">Tutor: {{ a.feedback }}</p>
        </section>

        <section v-if="quiz.written?.files?.length" class="panel">
          <h2>Your uploaded work</h2>
          <ul class="files">
            <li v-for="f in quiz.written.files" :key="f.name">
              <a :href="f.url" target="_blank" rel="noopener noreferrer">{{ f.name }}</a>
            </li>
          </ul>
        </section>
      </template>

      <!-- Multiple choice: questions and own answers -->
      <template v-else>
        <h2 class="sub">Questions and your answers</h2>
        <section v-for="(x, i) in quiz.questions" :key="i" class="panel">
          <p class="muted" style="margin:0 0 .6rem">Question {{ i + 1 }}</p>
          <figure class="qimg tight"><img :src="x.img" :alt="`Question ${i + 1}`" loading="lazy"/></figure>
          <p style="margin:.6rem 0 0">Your answer: <b class="gold">{{ 'ABCD'[quiz.mine?.[i]] ?? 'Not answered' }}</b>
          </p>
        </section>
      </template>
      <p v-if="quiz.status === 'done'" class="muted">Correct answers are explained in the discussion lesson.</p>
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
  max-width: 1020px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.narrow {
  max-width: 680px;
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
  margin: 0 0 1.5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0;
}

h2.sub {
  margin: 2rem 0 1rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.gold {
  color: var(--gold);
}

a {
  color: var(--gold);
}

.ranks {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
  padding: 1rem 1.4rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}

.ranks small {
  display: block;
  color: var(--muted);
  font-size: .8rem;
}

.ranks b {
  font: 600 1.8rem var(--font-display);
  color: var(--gold);
}

.ranks i {
  font-style: normal;
  font-size: .95rem;
  color: var(--muted);
}

.ranks .go {
  margin-left: auto;
  color: var(--gold);
  font-weight: 600;
}

.layout {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.list {
  display: grid;
  gap: .9rem;
}

.quiz {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.quiz.open {
  border-color: var(--gold);
}

.quiz.upcoming {
  opacity: .7;
}

.act {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: none;
}

.tag {
  font-size: .8rem;
  color: var(--gold);
}

.chip {
  display: inline-block;
  margin: .4rem .4rem 0 0;
  padding: .05rem .6rem;
  border: 1px solid var(--gold);
  border-radius: 99px;
  font-size: .78rem;
  color: var(--gold);
}

.chip.soft {
  border-color: var(--line);
  color: var(--muted);
}

.answers {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin: 0 0 1rem;
}

.answers .chip {
  margin: 0;
}

.mark {
  font: 600 1.8rem var(--font-display);
  color: var(--gold);
}

.mark small, .result small {
  font-size: 1rem;
  color: var(--muted);
}

.growth, .panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.growth {
  display: grid;
  gap: 1rem;
}

.panel {
  margin-bottom: 1rem;
}

.panel h2 {
  margin-bottom: .8rem;
}

.topic .row {
  display: flex;
  justify-content: space-between;
  font-size: .9rem;
  margin-bottom: .35rem;
}

.track {
  height: 8px;
  border-radius: 4px;
  background: var(--line);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--gold);
  border-radius: 4px;
  transition: width .3s;
}

.btn {
  padding: .7rem 1.3rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .95rem var(--font-body);
  cursor: pointer;
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
  opacity: .35;
  cursor: not-allowed;
}

.link {
  background: none;
  border: 0;
  color: var(--gold);
  cursor: pointer;
  font: inherit;
  padding: 0;
  margin-bottom: 1rem;
}

.files .link {
  margin: 0;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.top .link {
  margin: 0;
}

.clock {
  font: 600 1.3rem var(--font-display);
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: 6px;
  padding: .2rem .8rem;
}

.clock.low {
  color: var(--danger);
  border-color: var(--danger);
}

.qimg {
  margin: 1.2rem 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.qimg.tight {
  margin: 0 0 .8rem;
}

.qimg img {
  display: block;
  width: 100%;
  height: auto;
}

.letters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .8rem;
  margin-top: .6rem;
}

.lbtn {
  padding: 1rem 0;
  font: 600 1.5rem var(--font-display);
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.lbtn:hover {
  border-color: var(--gold);
}

.lbtn.on {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
}

.nav {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
}

.paper {
  display: block;
  width: 100%;
  height: 420px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  padding: .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  resize: vertical;
}

textarea:focus-visible, input[type='file']:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 2px;
}

input[type='file'] {
  color: var(--text);
  font: inherit;
  max-width: 100%;
}

.files {
  list-style: none;
  margin: .8rem 0 0;
  padding: 0;
  display: grid;
  gap: .4rem;
}

.files li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: .9rem;
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: .6rem 0 0;
}

.qtext, .answer {
  margin: 0 0 .8rem;
  white-space: pre-wrap;
}

.answer {
  margin: 0;
}

.result {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.result b {
  font: 600 3.2rem var(--font-display);
  color: var(--gold);
}

.result b.wait {
  font-size: 1.8rem;
  color: var(--muted);
}

button:focus-visible, a:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .quiz {
    flex-direction: column;
    align-items: flex-start;
  }

  .ranks .go {
    margin-left: 0;
  }

  .paper {
    height: 320px;
  }
}
</style>
