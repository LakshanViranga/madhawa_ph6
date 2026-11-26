<script setup>
import {ref, reactive, computed, onBeforeUnmount, nextTick, onMounted} from 'vue'
import LmsHeader from '@/components/LmsHeader.vue'
import { useStudent } from "@/composables/useStudent.js";
const api = useStudent();

// The student's own classes (GET /api/classes)
const classes = ref([])

const categories = {
  quiz: 'A quiz or test',
  lesson: 'A lesson or recording',
  marks: 'My marks or results',
  account: 'My account or login',
  other: 'Something else',
}

const statusLabel = {open: 'Open', in_progress: 'In progress', resolved: 'Resolved'}

const reports = ref([])

// ---- the form ----
const MAX_FILES = 3
const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_DESCRIPTION = 2000

const form = reactive({category: '', classId: '', subject: '', description: ''})
const submitted = ref(false)
const touched = reactive({})
const busy = ref(false)
const sentMessage = ref('')
const files = ref([]) // [{ key, file, url }]
const fileError = ref('')
let key = 0

const errors = computed(() => {
  const e = {}
  if (!form.category) e.category = 'Choose what the problem is about.'
  const subject = form.subject.trim()
  if (subject.length < 5 || subject.length > 100) e.subject = 'Describe it in a few words (5 to 100 characters).'
  const description = form.description.trim()
  if (description.length < 20) e.description = 'Tell us a little more, at least 20 characters. What did you expect, and what happened?'
  return e
})

const shown = (k) => (submitted.value || touched[k] ? errors.value[k] ?? '' : '')
const aria = (k) => ({'aria-invalid': Boolean(shown(k)), 'aria-describedby': shown(k) ? `e-${k}` : undefined})

function pick(e) {
  fileError.value = ''
  for (const f of e.target.files) {
    if (!TYPES.includes(f.type)) fileError.value = `${f.name}: only JPEG, PNG or WebP pictures.`
    else if (f.size > MAX_BYTES) fileError.value = `${f.name} is over 2 MB. Please use a smaller picture.`
    else if (files.value.length >= MAX_FILES) fileError.value = `You can add up to ${MAX_FILES} pictures.`
    else files.value.push({key: ++key, file: f, url: URL.createObjectURL(f)})
  }
  e.target.value = '' // lets the same picture be chosen again
}

function removeFile(i) {
  URL.revokeObjectURL(files.value[i].url)
  files.value.splice(i, 1)
  fileError.value = ''
}

onBeforeUnmount(() => files.value.forEach((f) => URL.revokeObjectURL(f.url)))

async function submit() {
  sentMessage.value = ''
  submitted.value = true
  const first = Object.keys(errors.value)[0]
  if (first) {
    await nextTick()
    document.getElementById(`f-${first}`)?.focus()
    return
  }
  busy.value = true
  const issue = {
    category: form.category,
    classId: form.classId,
    subject: form.subject,
    description: form.description,
  }
  await api.createIssue(issue, files.value)

  busy.value = false

  const cls = classes.value.find((c) => c.id === form.classId)
  reports.value.unshift({
    id: `new-${Date.now()}`,
    category: form.category,
    className: cls?.title ?? '',
    status: 'open',
    createdAt: new Date().toISOString(),
    subject: form.subject.trim(),
    description: form.description.trim(),
    reply: null,
  })
  sentMessage.value = 'Thank you. Your report was sent. Your teacher will reply here.'
  Object.assign(form, {category: '', classId: '', subject: '', description: ''})
  files.value.forEach((f) => URL.revokeObjectURL(f.url))
  files.value = []
  submitted.value = false
  Object.keys(touched).forEach((k) => delete touched[k])
}

// Real call: POST /api/reports as multipart { category, classId, subject, description } plus the pictures
const send = () => new Promise((resolve) => setTimeout(resolve, 600))

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})

async function init () {
  const [c, r] = await Promise.all([api.classes(), api.getIssues()])
  if (c.ok){
    classes.value = c.data
  }

  if (r.ok){
    reports.value = r.data
  }
}

onMounted(async ()=> {
  await init()
})
</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>Report a problem</h1>

      <div class="layout">
        <!-- The form -->
        <section class="panel">
          <h2>Tell us what went wrong</h2>
          <p class="muted lead">Your teacher reads every report and replies here. For something urgent, such as a quiz
            that is about to close,
            <a href="https://wa.me/94771234567" target="_blank" rel="noopener noreferrer">message your teacher on
              WhatsApp</a>.</p>

          <p v-if="sentMessage" class="ok" role="status">{{ sentMessage }}</p>

          <form class="form" novalidate @submit.prevent="submit">
            <label for="f-category">What is it about?
              <select id="f-category" v-model="form.category" v-bind="aria('category')" @blur="touched.category = true">
                <option value="" disabled>Choose one</option>
                <option v-for="(label, k) in categories" :key="k" :value="k">{{ label }}</option>
              </select>
              <span v-if="shown('category')" id="e-category" class="fe">{{ shown('category') }}</span>
            </label>

            <label for="f-classId">Which class? <span class="opt">(optional)</span>
              <select id="f-classId" v-model="form.classId">
                <option value="">Not about one class</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.title }}</option>
              </select>
            </label>

            <label for="f-subject">In a few words
              <input id="f-subject" v-model="form.subject" maxlength="100"
                     placeholder="e.g. The Week 12 timer jumped to zero"
                     v-bind="aria('subject')" @blur="touched.subject = true"/>
              <span v-if="shown('subject')" id="e-subject" class="fe">{{ shown('subject') }}</span>
            </label>

            <label for="f-description">What happened?
              <textarea id="f-description" v-model="form.description" rows="6" :maxlength="MAX_DESCRIPTION"
                        placeholder="What did you do, what did you expect, and what happened instead?"
                        v-bind="aria('description')" @blur="touched.description = true"></textarea>
              <span class="row">
                <span v-if="shown('description')" id="e-description" class="fe">{{ shown('description') }}</span>
                <span class="count">{{ form.description.length }}/{{ MAX_DESCRIPTION }}</span>
              </span>
            </label>

            <div class="pics">
              <p class="label">Pictures <span class="opt">(optional, up to {{ MAX_FILES }}, 2 MB each)</span></p>
              <ul v-if="files.length" class="thumbs">
                <li v-for="(f, i) in files" :key="f.key">
                  <img :src="f.url" :alt="`Picture ${i + 1}: ${f.file.name}`"/>
                  <button type="button" class="x" :aria-label="`Remove picture ${i + 1}`" @click="removeFile(i)">
                    Remove
                  </button>
                </li>
              </ul>
              <label v-if="files.length < MAX_FILES" class="add" for="f-files">
                Add a picture or screenshot
                <input id="f-files" class="sr" type="file" accept="image/jpeg,image/png,image/webp" multiple
                       @change="pick"/>
              </label>
              <p v-if="fileError" class="fe" role="alert">{{ fileError }}</p>
            </div>

            <button class="btn" type="submit" :disabled="busy">{{ busy ? 'Sending...' : 'Send report' }}</button>
          </form>
        </section>

        <!-- Earlier reports -->
        <aside class="panel">
          <h2>Your reports</h2>
          <p v-if="!reports.length" class="muted">You have not reported anything yet.</p>
          <ul v-else class="reports">
            <li v-for="r in reports" :key="r.id">
              <details>
                <summary>
                  <span class="subject">{{ r.subject }}</span>
                  <span class="meta">
                    <span class="chip" :class="{ soft: r.status !== 'resolved' }">{{ statusLabel[r.status] }}</span>
                    <span class="muted">{{ categories[r.category] }} · {{ day(r.createdAt) }}</span>
                  </span>
                </summary>
                <div class="detail">
                  <p v-if="r.className" class="muted">Class: {{ r.className }}</p>
                  <p class="text">{{ r.description }}</p>
                  <div v-if="r.reply" class="reply">
                    <b>Reply from your teacher</b>
                    <p class="text">{{ r.reply }}</p>
                  </div>
                  <p v-else class="muted">No reply yet.</p>
                </div>
              </details>
            </li>
          </ul>
        </aside>
      </div>
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

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0 0 1.5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0 0 .6rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.lead {
  margin-bottom: 1rem;
}

a {
  color: var(--gold);
}

.layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.ok {
  margin: 0 0 1rem;
  padding: .8rem 1rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  color: var(--gold);
  font-size: .9rem;
}

.form {
  display: grid;
  gap: 1.1rem;
}

label, .label {
  display: grid;
  gap: .4rem;
  font-size: .9rem;
  color: var(--muted);
  margin: 0;
}

.opt {
  font-size: .8rem;
  opacity: .85;
}

input, select, textarea {
  width: 100%;
  box-sizing: border-box;
  padding: .8rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

textarea {
  resize: vertical;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--gold);
  outline: none;
}

[aria-invalid='true'] {
  border-color: var(--danger);
}

.fe {
  font-size: .85rem;
  color: var(--danger);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.count {
  margin-left: auto;
  font-size: .8rem;
  color: var(--muted);
}

.pics {
  display: grid;
  gap: .6rem;
}

.thumbs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: .8rem;
}

.thumbs li {
  display: grid;
  gap: .3rem;
  justify-items: center;
}

.thumbs img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}

.x {
  background: none;
  border: 0;
  color: var(--gold);
  font: inherit;
  font-size: .8rem;
  cursor: pointer;
  padding: 0;
}

.add {
  display: inline-block;
  justify-self: start;
  padding: .6rem 1rem;
  border: 1px dashed var(--gold);
  border-radius: 6px;
  color: var(--gold);
  font-weight: 600;
  cursor: pointer;
}

.add:hover, .add:focus-within {
  background: var(--gold-glow);
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.btn {
  padding: .85rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 1rem var(--font-body);
  cursor: pointer;
}

.btn:hover {
  background: var(--gold-soft);
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.reports {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: .7rem;
}

.reports details {
  border: 1px solid var(--line);
  border-radius: 6px;
}

summary {
  display: grid;
  gap: .3rem;
  padding: .8rem 1rem;
  cursor: pointer;
}

.subject {
  font-weight: 600;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
}

.chip {
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

.detail {
  padding: 0 1rem 1rem;
  display: grid;
  gap: .6rem;
}

.text {
  margin: 0;
  white-space: pre-wrap;
}

.reply {
  padding: .8rem 1rem;
  border-left: 3px solid var(--gold);
  background: var(--bg);
  border-radius: 0 6px 6px 0;
}

.reply p {
  margin-top: .3rem;
}

a:focus-visible, button:focus-visible, summary:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
