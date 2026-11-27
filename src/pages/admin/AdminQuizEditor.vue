<script setup>
import {reactive, ref, computed, watch, onMounted, onBeforeUnmount} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import YoutubeEmbed from '@/components/YoutubeEmbed.vue'
import {useAdmin} from '@/composables/useAdmin.js'

// Routes: /admin/quizzes/new and /admin/quizzes/:id  (put "new" first)
const api = useAdmin()
const route = useRoute()
const router = useRouter()
const id = computed(() => (route.params.id && route.params.id !== 'new' ? route.params.id : null))

const IMG_MAX = 2 * 1024 * 1024 // 2 MB per question image
const PDF_MAX = 15 * 1024 * 1024
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const SCHEME_MAX = PDF_MAX
const scheme = ref(null)        // marking scheme already stored: { name, url }
const schemeFile = ref(null)    // new PDF chosen in this session
const schemeError = ref('')
const schemeRemoved = ref(false)
const classes = ref([])
const loading = ref(true)
const saving = ref(false)
const formErrors = ref([])
const attemptCount = ref(0)   // students who already attempted it
const savedStatus = ref('draft')
const paper = ref(null)       // question paper already stored: { name, url }
const paperFile = ref(null)   // new PDF chosen in this session
const paperError = ref('')

const quiz = reactive({
  classId: '', type: 'mcq', physical: false, weekNo: 1, title: '', topic: '', minutes: 10,
  opens: '', closes: '', heldOn: '', totalMarks: null, passMarks: null,
  video: '', showVideo: 'closed', showScheme: 'tutor', questions: [],
})

let uid = 0
// One shape for both types: MCQ uses image + answer, written uses text + marks + modelAnswer
const blank = () => ({
  key: ++uid,
  img: '',
  blob: false,
  imgFile: null,
  imageKey: '',
  imgName: '',
  answer: null,
  text: '',
  marks: quiz.type === 'mcq' ? 1 : 5,
  modelAnswer: '',
  error: ''
})

const isEdit = computed(() => Boolean(id.value))
const isPublished = computed(() => isEdit.value && savedStatus.value !== 'draft')
const locked = computed(() => attemptCount.value > 0) // questions cannot change once students attempted
const vidOk = computed(() => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(quiz.video) && /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)[\w-]{11}/.test(quiz.video))

const toLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const toIso = (v) => (v ? new Date(v).toISOString() : null)

onMounted(async () => {
  const c = await api.classes()
  if (c.ok) classes.value = c.data.filter((x) => x.status !== 'archived')
  if (id.value) {
    const r = await api.quiz(id.value)
    if (r.ok) fill(r.data)
    else formErrors.value = [r.error]
  } else if (classes.value.length === 1) {
    quiz.classId = classes.value[0].id
  }
  loading.value = false
})

function fill(d) {
  Object.assign(quiz, {
    classId: d.classId, type: d.type, physical: !!d.physical, weekNo: d.weekNo, title: d.title, topic: d.topic ?? '',
    minutes: d.minutes, opens: toLocal(d.opensAt), closes: toLocal(d.closesAt),
    heldOn: d.heldOn ? String(d.heldOn).slice(0, 10) : '',
    totalMarks: d.totalMarks, passMarks: d.passMarks, video: d.video, showVideo: d.showVideo, showScheme: d.showScheme ?? 'tutor',
  })
  quiz.questions = (d.questions ?? []).map((x) => ({
    ...blank(), text: x.text ?? '', img: x.image ?? '', imageKey: x.imageKey ?? '',
    answer: x.answer ?? null, marks: x.marks ?? 1, modelAnswer: x.modelAnswer ?? '',
  }))
  paper.value = d.paper
  scheme.value = d.scheme ?? null
  attemptCount.value = d.attemptCount
  savedStatus.value = d.status
}

// Changing the type or delivery of a new test starts the question list again
watch(() => [quiz.type, quiz.physical], () => {
  if (isEdit.value) return
  quiz.questions.forEach(release)
  quiz.questions = []
  if (quiz.physical) {
    quiz.minutes = null
    quiz.opens = ''
    quiz.closes = ''
    paperFile.value = null
  } else if (!quiz.minutes) {
    quiz.minutes = 10
  }
})

// ---- images (MCQ) ----
function release(q) {
  if (q.blob && q.img) URL.revokeObjectURL(q.img)
  q.blob = false
}

function pick(q, e) {
  const f = e.target.files[0]
  e.target.value = ''
  if (!f) return
  if (!IMG_TYPES.includes(f.type)) return (q.error = 'Please choose a JPEG, PNG or WebP image.')
  if (f.size > IMG_MAX) return (q.error = 'That image is over 2 MB. Please compress it first.')
  q.error = ''
  release(q)
  q.img = URL.createObjectURL(f)
  q.blob = true
  q.imgFile = f
  q.imgName = f.name
  q.imageKey = '' // a new file replaces the stored image
}

function pickScheme(e) {
  const f = e.target.files[0]
  e.target.value = ''
  schemeError.value = ''
  if (!f) return
  if (f.type !== 'application/pdf') return (schemeError.value = 'The marking scheme must be a PDF.')
  if (f.size > SCHEME_MAX) return (schemeError.value = 'That PDF is over 15 MB.')
  schemeFile.value = f
  schemeRemoved.value = false
}

function removeStoredScheme() {
  schemeFile.value = null
  scheme.value = null
  schemeRemoved.value = true
}

const hasScheme = computed(() => !!schemeFile.value || !!scheme.value)

function clearImg(q) {
  release(q)
  q.img = ''
  q.imgFile = null // otherwise the removed file would still be uploaded
  q.imgName = ''
  q.imageKey = ''
}

// ---- question paper (written) ----
function pickPaper(e) {
  const f = e.target.files[0]
  e.target.value = ''
  paperError.value = ''
  if (!f) return
  if (f.type !== 'application/pdf') return (paperError.value = 'The question paper must be a PDF.')
  if (f.size > PDF_MAX) return (paperError.value = 'That PDF is over 15 MB.')
  paperFile.value = f
}

// ---- questions ----
const add = () => quiz.questions.push(blank())

function remove(i) {
  release(quiz.questions[i])
  quiz.questions.splice(i, 1)
}

const mcqReady = (q) => (!!q.img || !!q.imageKey) && q.answer !== null
const writtenReady = (q) => !!q.text.trim() && Number(q.marks) > 0
const ready = (q) => (quiz.type === 'mcq' ? mcqReady(q) : writtenReady(q))
const readyCount = computed(() => quiz.questions.filter(ready).length)
const hasPaper = computed(() => !!paperFile.value || !!paper.value)
const marksTotal = computed(() => (quiz.questions.length && !quiz.physical
    ? quiz.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)
    : Number(quiz.totalMarks) || 0))
const allReady = computed(() => {
  if (quiz.physical) return marksTotal.value > 0 && !!quiz.heldOn
  if (quiz.type === 'mcq') return quiz.questions.length > 0 && readyCount.value === quiz.questions.length
  const questionsOk = quiz.questions.length ? readyCount.value === quiz.questions.length : hasPaper.value
  return questionsOk && marksTotal.value > 0
})

onBeforeUnmount(() => quiz.questions.forEach(release))

// ---- saving ----
function build(status) {
  const files = []
  const questions = quiz.physical ? [] : quiz.questions.map((q, i) => {
    const out = {marks: Number(q.marks) || 1}
    if (quiz.type === 'mcq') {
      out.answer = q.answer
      if (q.imgFile) {
        // unique name per question, so two screenshots called "image.png" cannot collide
        const name = `q${i + 1}-${q.imgFile.name.replace(/[^\w.-]+/g, '_')}`
        out.imgName = name
        files.push({file: q.imgFile, name})
      } else if (q.imageKey) {
        out.imageKey = q.imageKey
      }
    } else {
      out.text = q.text
      out.modelAnswer = q.modelAnswer
    }
    return out
  })
  if (!quiz.physical && paperFile.value) files.push({file: paperFile.value, name: paperFile.value.name})
  // prefixed so it can never collide with the question paper's file name
  let schemeName = null
  if (schemeFile.value) {
    schemeName = `scheme-${schemeFile.value.name.replace(/[^\w.-]+/g, '_')}`
    files.push({file: schemeFile.value, name: schemeName})
  }
  const payload = {
    classId: quiz.classId, testType: quiz.type, physical: quiz.physical,
    weekNo: Number(quiz.weekNo), title: quiz.title, topic: quiz.topic,
    minutes: !quiz.physical && quiz.minutes ? Number(quiz.minutes) : null,
    opensAt: quiz.physical ? null : toIso(quiz.opens),
    closesAt: quiz.physical ? null : toIso(quiz.closes),
    heldOn: quiz.physical ? quiz.heldOn : null,
    passMarks: quiz.passMarks === '' || quiz.passMarks == null ? null : Number(quiz.passMarks),
    video: quiz.video, showVideo: quiz.showVideo, status,
    showScheme: quiz.showScheme,
    schemeName,
    removeScheme: schemeRemoved.value && !schemeFile.value,
  }
  if (quiz.physical || (quiz.type === 'structured' && !quiz.questions.length)) {
    payload.totalMarks = Number(quiz.totalMarks) || 0
  }
  if (!locked.value) payload.questions = questions // locked questions are left as they are
  return {payload, files}
}

function nextStatus(mode) {
  if (mode === 'draft') return 'draft'
  if (isPublished.value) return savedStatus.value // "Save changes" keeps the current status
  // Physical tests are records only: students can never attempt them online.
  // The backend must accept this status (see notes).
  if (quiz.physical) return 'recorded'
  return quiz.opens && new Date(quiz.opens) > new Date() ? 'scheduled' : 'open'
}

async function save(mode) {
  const errs = []
  if (!quiz.classId) errs.push('Choose a class.')
  if (!String(quiz.title).trim()) errs.push('Add a title.')
  if (quiz.physical && !quiz.heldOn) errs.push('Choose the date the test was held.')
  if (quiz.video && !vidOk.value) errs.push('The discussion link must be a YouTube link.')
  if (!quiz.physical && quiz.opens && quiz.closes && new Date(quiz.closes) <= new Date(quiz.opens)) errs.push('The closing time must be after the opening time.')
  formErrors.value = errs
  if (errs.length) return

  saving.value = true
  const {payload, files} = build(nextStatus(mode))
  const r = await api.saveQuiz(payload, files, id.value)
  saving.value = false
  if (!r.ok) {
    formErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  router.push('/admin/quizzes')
}
</script>

<template>
  <p v-if="loading" class="muted">Loading...</p>

  <form v-else @submit.prevent>
    <div class="head">
      <h1>{{ isEdit ? 'Edit test' : 'New test' }}</h1>
      <div class="row">
        <router-link to="/admin/quizzes" class="btn ghost">Cancel</router-link>
        <button v-if="!isPublished" type="button" class="btn ghost" :disabled="saving" @click="save('draft')">Save
          draft
        </button>
        <button type="button" class="btn" :disabled="saving || !allReady" @click="save('publish')"
                :title="allReady ? '' : (quiz.physical ? 'Add the date held and the total marks' : 'Every question needs to be complete, and the total marks must be more than 0')">
          {{ isPublished ? 'Save changes' : (quiz.physical ? 'Save record' : 'Publish') }}
        </button>
      </div>
    </div>

    <div v-if="formErrors.length" class="panel errs" role="alert">
      <ul>
        <li v-for="e in formErrors" :key="e">{{ e }}</li>
      </ul>
    </div>

    <section class="panel">
      <h2>Details</h2>
      <div class="form">
        <label>Class
          <select v-model="quiz.classId">
            <option value="" disabled>Choose a class</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </label>
        <label>Delivery
          <select v-model="quiz.physical" :disabled="isEdit">
            <option :value="false">Online (students attempt on the LMS)</option>
            <option :value="true">Physical (record only, no questions)</option>
          </select>
        </label>
        <label>Type
          <select v-model="quiz.type" :disabled="isEdit">
            <option value="mcq">{{ quiz.physical ? 'MCQ test' : 'MCQ quiz (students pick A to D)' }}</option>
            <option value="structured">{{ quiz.physical ? 'Written test' : 'Written test (tutor marks it)' }}</option>
          </select>
        </label>
        <label>Week no<input v-model.number="quiz.weekNo" type="number" min="1" max="200"/></label>
        <label>Title<input v-model="quiz.title" maxlength="200"/></label>
        <label>Topic
          <input v-model="quiz.topic" list="topics" maxlength="60" placeholder="e.g. Mechanics"/>
          <datalist id="topics">
            <option>Mechanics</option>
            <option>Waves</option>
            <option>Electricity</option>
            <option>Oscillations</option>
          </datalist>
        </label>

        <template v-if="!quiz.physical">
          <label>Time limit (minutes)<input v-model.number="quiz.minutes" type="number" min="1" max="600"/></label>
          <label>Opens<input v-model="quiz.opens" type="datetime-local"/></label>
          <label>Closes<input v-model="quiz.closes" type="datetime-local"/></label>
        </template>
        <template v-else>
          <label>Date held<input v-model="quiz.heldOn" type="date"/></label>
          <label>Total marks<input v-model.number="quiz.totalMarks" type="number" min="0" step="0.5"/></label>
        </template>
        <label>Pass marks (optional)<input v-model.number="quiz.passMarks" type="number" min="0" step="0.5"/></label>
      </div>
      <p v-if="isEdit" class="muted small">The type and delivery cannot be changed after the test is created.</p>
      <p v-if="quiz.physical" class="muted small">
        This test is conducted on paper. Only the record and marks are stored here, so no questions or paper are
        uploaded.
      </p>
    </section>

    <section class="panel">
      <h2>Discussion lesson</h2>
      <p class="muted">Answers are not shared directly. Post a YouTube video that discusses this test instead. Students
        find it under the test in their past tests. You can add it later, after the test closes.</p>
      <div class="form" style="margin-top:1rem">
        <label>YouTube link (optional)<input v-model="quiz.video" type="url"
                                             placeholder="https://www.youtube.com/watch?v=..."/></label>
        <label>Show to students
          <select v-model="quiz.showVideo">
            <option value="closed">After the test closes</option>
            <option value="now">Immediately</option>
          </select>
        </label>
      </div>
      <p v-if="quiz.video && !vidOk" class="err">This does not look like a YouTube link.</p>
      <div v-if="vidOk" class="vprev">
        <youtube-embed :url="quiz.video" :title="quiz.title"/>
      </div>
    </section>

    <section class="panel">
      <h2>Marking scheme / tutor answer sheet</h2>
      <p class="muted">Upload a PDF with the answers or marking scheme. It is optional, and you can add it later.
        Only tutors see it unless you choose otherwise below.</p>

      <p v-if="scheme && !schemeFile" style="margin:.8rem 0 0">
        <a :href="scheme.url" target="_blank" rel="noopener noreferrer">{{ scheme.name }}</a>
        <span class="muted">(current file)</span>
        <button type="button" class="btn danger sm" @click="removeStoredScheme">Remove</button>
      </p>
      <p v-if="schemeFile" style="margin:.8rem 0 0">{{ schemeFile.name }}
        <button type="button" class="btn danger sm" @click="schemeFile = null">Remove</button>
      </p>

      <label class="btn ghost sm filebtn" style="margin-top:.8rem">
        {{ hasScheme ? 'Replace PDF' : 'Upload PDF' }}
        <input class="sr" type="file" accept="application/pdf" @change="pickScheme"/>
      </label>
      <p v-if="schemeError" class="err">{{ schemeError }}</p>

      <div v-if="hasScheme" class="form" style="margin-top:1rem">
        <label>Show to students
          <select v-model="quiz.showScheme">
            <option value="tutor">Tutors only</option>
            <option value="closed">After the test closes</option>
            <option value="now">Immediately</option>
          </select>
        </label>
      </div>
    </section>

    <p v-if="locked && !quiz.physical" class="panel notice" role="status">
      {{ attemptCount }} student{{ attemptCount === 1 ? ' has' : 's have' }} already attempted this test, so its
      questions are locked. You can still change the dates, the discussion lesson and the status.
    </p>

    <!-- ===== Online tests only: paper, total marks, questions ===== -->
    <template v-if="!quiz.physical">
      <!-- Written test: paper, total marks -->
      <fieldset v-if="quiz.type === 'structured'" :disabled="locked" class="bare">
        <section class="panel">
          <h2>Question paper</h2>
          <p class="muted">Upload the paper as a PDF, add typed questions below, or both.</p>
          <p v-if="paper && !paperFile" style="margin:.8rem 0 0"><a :href="paper.url" target="_blank"
                                                                    rel="noopener noreferrer">{{ paper.name }}</a>
            <span class="muted">(current paper)</span></p>
          <p v-if="paperFile" style="margin:.8rem 0 0">{{ paperFile.name }}
            <button type="button" class="btn danger sm" @click="paperFile = null">Remove</button>
          </p>
          <label class="btn ghost sm filebtn" style="margin-top:.8rem">{{ hasPaper ? 'Replace PDF' : 'Upload PDF' }}
            <input class="sr" type="file" accept="application/pdf" @change="pickPaper"/>
          </label>
          <p v-if="paperError" class="err">{{ paperError }}</p>
          <div v-if="!quiz.questions.length" class="form" style="margin-top:1rem">
            <label>Total marks<input v-model.number="quiz.totalMarks" type="number" min="0" step="0.5"/></label>
          </div>
          <p v-else class="muted small" style="margin-top:1rem">Total marks: {{ marksTotal }} (the sum of the questions
            below).</p>
        </section>
      </fieldset>

      <p class="muted">
        <template v-if="quiz.type === 'mcq'">Each question is an image that already contains the question and its
          options A to D. Students only choose a letter.
        </template>
        <template v-else>Typed questions are optional when the PDF has them all. Students answer in a text box and can
          attach photos or a PDF of their written work.
        </template>
        {{ readyCount }} of {{ quiz.questions.length }} questions ready.
      </p>

      <fieldset :disabled="locked" class="bare">
        <section v-for="(q, i) in quiz.questions" :key="q.key" class="panel">
          <div class="head">
            <h2>Question {{ i + 1 }} <span class="tag" :class="ready(q) ? 'ok' : 'warn'">{{
                ready(q) ? 'Ready' : 'Incomplete'
              }}</span></h2>
            <button type="button" class="btn danger sm" @click="remove(i)">Remove</button>
          </div>

          <!-- MCQ: image + correct letter -->
          <div v-if="quiz.type === 'mcq'" class="qgrid">
            <div>
              <p class="muted lab">Question image</p>
              <div class="drop">
                <img v-if="q.img" :src="q.img" :alt="`Question ${i + 1} preview`"/>
                <label v-else class="pick">Upload question image
                  <input class="sr" type="file" accept="image/jpeg,image/png,image/webp" @change="pick(q, $event)"/>
                </label>
              </div>
              <div v-if="q.img" class="row file">
                <span class="muted name">{{ q.imgName || 'Current image' }}</span>
                <label class="btn ghost sm">Replace<input class="sr" type="file"
                                                          accept="image/jpeg,image/png,image/webp"
                                                          @change="pick(q, $event)"/></label>
                <button type="button" class="btn danger sm" @click="clearImg(q)">Remove</button>
              </div>
            </div>
            <div>
              <p class="muted lab">Correct answer</p>
              <div class="letters" role="radiogroup" :aria-label="`Correct answer for question ${i + 1}`">
                <label v-for="(l, j) in '12345'" :key="l" class="lt" :class="{ on: q.answer === j }">
                  <input class="sr" type="radio" :name="`ans-${q.key}`" :value="j" v-model="q.answer"/>{{ l }}
                </label>
              </div>
              <p class="muted small" style="margin-top:.7rem">Used for marking only. Students never see the correct
                answer.</p>
            </div>
          </div>

          <!-- Written: text, marks, marking guide -->
          <div v-else class="form">
            <label style="grid-column: 1 / -1">Question<textarea v-model="q.text" rows="3"
                                                                 maxlength="5000"></textarea></label>
            <label>Marks<input v-model.number="q.marks" type="number" min="0.5" step="0.5"/></label>
            <label style="grid-column: 1 / -1">Marking guide (only tutors see this)<textarea v-model="q.modelAnswer"
                                                                                             rows="3"
                                                                                             maxlength="5000"></textarea></label>
          </div>
          <p v-if="q.error" class="err">{{ q.error }}</p>
        </section>

        <button type="button" class="btn ghost" style="justify-self:start" @click="add">Add question</button>
      </fieldset>
    </template>
  </form>
</template>

<style scoped>
.bare {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
  display: grid;
  gap: 1.5rem;
}

.qgrid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
}

.lab {
  margin: 0 0 .5rem;
}

.small {
  font-size: .8rem;
  margin: 0 0 .6rem;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  padding: .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  resize: vertical;
}

.drop {
  min-height: 150px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--accent);
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.drop img {
  display: block;
  width: 100%;
  height: auto;
}

.pick {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 150px;
  color: var(--secondary);
  font-weight: 600;
  cursor: pointer;
  background: var(--surface-2);
}

.pick:hover, .pick:focus-within {
  background: var(--accent-glow);
}

.file {
  margin-top: .6rem;
  align-items: center;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.letters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: .6rem;
}

.lt {
  display: grid;
  place-items: center;
  padding: .8rem 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: 600 1.3rem var(--font-display);
  cursor: pointer;
}

.lt:hover {
  border-color: var(--accent);
}

.lt.on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

.lt:focus-within, label.btn:focus-within, .pick:focus-within {
  outline: 2px solid var(--heading);
  outline-offset: 2px;
}

.filebtn {
  display: inline-block;
  cursor: pointer;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.vprev {
  max-width: 420px;
  margin-top: 1rem;
}

.err {
  color: var(--danger);
  margin: .8rem 0 0;
  font-size: .9rem;
}

.errs {
  border-color: var(--danger);
}

.errs ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--danger);
}

.notice {
  margin: 0;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .qgrid {
    grid-template-columns: 1fr;
  }
}
</style>
