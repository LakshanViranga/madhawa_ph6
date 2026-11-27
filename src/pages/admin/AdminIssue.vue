<script setup>
import {ref, reactive, computed, nextTick, onBeforeUnmount, onMounted} from 'vue'
import {normalizeLkMobile, formatLkMobile} from '@/utils/phone.js'
import { useAdmin } from "@/composables/useAdmin.js";

const api = useAdmin()

// Same wording as the student's "Report a problem" page
const categories = {
  quiz: 'A quiz or test',
  lesson: 'A lesson or recording',
  marks: 'My marks or results',
  account: 'My account or login',
  other: 'Something else',
}
const statusLabel = {open: 'Open', in_progress: 'In progress', resolved: 'Resolved'}
const statusClass = {open: 'warn', in_progress: '', resolved: 'ok'}
const tabs = [['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['all', 'All']]

const classes = ref([])

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()
// A small picture standing in for a screenshot
const shot = (text) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#eee"/>` +
    `<text x="24" y="140" font-family="sans-serif" font-size="22" fill="#333">${text}</text></svg>`)

const issues = ref([])
const counts = ref({})

// ---- filters ----
const status = ref('open')
const classId = ref('')
const category = ref('')
const q = ref('')
const sort = ref('newest')

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  return issues.value
      .filter((i) => (status.value === 'all' || i.status === status.value)
          && (!classId.value || i.classId === classId.value)
          && (!category.value || i.category === category.value)
          && (!term || [i.subject, i.student.name, i.student.loginId].some((t) => t.toLowerCase().includes(term))))
      .sort((a, b) => (sort.value === 'newest' ? 1 : -1) * (new Date(b.createdAt) - new Date(a.createdAt)))
})

// ---- the open issue ----
const selectedId = ref(null)
const selected = computed(() => issues.value.find((i) => i.id === selectedId.value) ?? null)
const heading = ref(null)
const zoom = ref(null)

async function select(id) {
  selectedId.value = id
  zoom.value = null
  await nextTick()
  heading.value?.focus() // a keyboard or screen reader user lands on the issue they chose
}

// Drafts are kept per issue, so switching to another issue and back does not lose what was typed
const replyDrafts = reactive({})
const noteDrafts = reactive({})
const reply = computed({
  get: () => (selected.value ? replyDrafts[selected.value.id] ?? selected.value.reply ?? '' : ''),
  set: (v) => {
    replyDrafts[selected.value.id] = v
  },
})
const note = computed({
  get: () => (selected.value ? noteDrafts[selected.value.id] ?? selected.value.note ?? '' : ''),
  set: (v) => {
    noteDrafts[selected.value.id] = v
  },
})
const replyReady = computed(() => reply.value.trim() !== '' && reply.value.trim() !== (selected.value?.reply ?? ''))
const noteChanged = computed(() => note.value.trim() !== (selected.value?.note ?? ''))

// ---- saving ----
const busy = ref(false)
const message = ref('')
let messageTimer = null
const flash = (text) => {
  message.value = text
  clearTimeout(messageTimer)
  messageTimer = setTimeout(() => (message.value = ''), 4000)
}
onBeforeUnmount(() => clearTimeout(messageTimer))

// Real call: PATCH /api/admin/issues/:id with { status?, reply?, note? }
const send = () => new Promise((resolve) => setTimeout(resolve, 400))

async function setStatus(issue, next) {
  busy.value = true
  await api.updateIssue(issue.id, {
    status: next,
  })
  busy.value = false
  issue.status = next
  flash(`Marked as ${statusLabel[next].toLowerCase()}.`)
}

// A reply moves an open issue to "In progress", or closes it when asked to
async function saveReply(resolve = false) {
  const issue = selected.value
  const text = reply.value.trim()
  busy.value = true
  await api.updateIssue(issue.id, {
    status: resolve ? 'resolved' : issue.status === 'open' ? 'in_progress' : issue.status,
    reply: text,
  })
  busy.value = false
  issue.reply = text
  issue.repliedAt = new Date().toISOString()
  issue.status = resolve ? 'resolved' : issue.status === 'open' ? 'in_progress' : issue.status
  delete replyDrafts[issue.id]
  flash(resolve ? 'Reply saved and the issue is resolved. The student sees it on their page.' : 'Reply saved. The student sees it on their page.')
}

async function saveNote() {
  const issue = selected.value
  busy.value = true
  await api.updateIssue(issue.id, {
    note: note.value.trim(),
  })
  busy.value = false
  issue.note = note.value.trim()
  delete noteDrafts[issue.id]
  flash('Note saved. Only staff can see it.')
}

// ---- display helpers ----
const MIN = 60 * 1000

function since(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / MIN))
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'}`
}

const ago = (iso) => `${since(iso)} ago`
// An open issue nobody has answered for a day gets a warning
const waiting = (i) => (i.status === 'open' && !i.reply && Date.now() - new Date(i.createdAt).getTime() > 24 * 60 * MIN ? `Waiting ${since(i.createdAt)}` : '')
const when = (iso) => new Date(iso).toLocaleString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

const phoneOf = (i) => normalizeLkMobile(i.student.phone)
const whatsapp = (i) => (phoneOf(i)
    ? `https://wa.me/${phoneOf(i).slice(1)}?text=${encodeURIComponent(`Hi ${i.student.name}, about your report "${i.subject}": `)}`
    : '')

onMounted(async ()=> {
  const [c, i] = await Promise.all([api.classes(), api.getIssues()])
  if (c.ok){
    classes.value = c.data
  }

  if (i.ok) {
    issues.value = i.data.issues
    counts.value = i.data.counts
  }
})
</script>

<template>
  <div class="head">
    <h1>Issues</h1>
    <span class="muted">{{ counts.open }} open · {{ counts.in_progress }} in progress</span>
  </div>

  <div class="seg" role="group" aria-label="Status">
    <button v-for="[key, label] in tabs" :key="key" type="button" :class="{ on: status === key }"
            :aria-pressed="status === key" @click="status = key">
      {{ label }} ({{ counts[key] }})
    </button>
  </div>

  <div class="row filters">
    <label class="grow">Search
      <input v-model="q" type="search" placeholder="Student, login ID or subject"/>
    </label>
    <label>Class
      <select v-model="classId">
        <option value="">All classes</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </label>
    <label>About
      <select v-model="category">
        <option value="">Everything</option>
        <option v-for="(label, k) in categories" :key="k" :value="k">{{ label }}</option>
      </select>
    </label>
    <label>Order
      <select v-model="sort">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </label>
  </div>

  <div class="split" :class="{ 'has-selection': selected }">
    <!-- The list -->
    <section class="panel list" aria-label="Issues">
      <p v-if="!shown.length" class="muted">No issues match.</p>
      <ul v-else>
        <li v-for="i in shown" :key="i.id">
          <button type="button" class="item" :class="{ on: i.id === selectedId }"
                  :aria-current="i.id === selectedId ? 'true' : undefined" @click="select(i.id)">
            <b class="subject">{{ i.subject }}</b>
            <span class="who">{{ i.student.name }}<template v-if="i.className"> · {{ i.className }}</template></span>
            <span class="meta">
              <span class="tag" :class="statusClass[i.status]">{{ statusLabel[i.status] }}</span>
              <span v-if="waiting(i)" class="tag warn">{{ waiting(i) }}</span>
              <span class="muted">{{ categories[i.category] }} · {{ ago(i.createdAt) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- The chosen issue -->
    <section class="panel detail" aria-label="Issue details">
      <p v-if="!selected" class="muted">Choose an issue to read it and reply.</p>

      <template v-else>
        <button type="button" class="btn ghost sm back" @click="selectedId = null">Back to the list</button>

        <h2 ref="heading" tabindex="-1">{{ selected.subject }}</h2>
        <p class="meta">
          <span class="tag" :class="statusClass[selected.status]">{{ statusLabel[selected.status] }}</span>
          <span class="muted">{{ categories[selected.category] }}<template
              v-if="selected.className"> · {{ selected.className }}</template> · {{ when(selected.createdAt) }}</span>
        </p>

        <div class="student">
          <b>{{ selected.student.name }}</b> <span class="muted">{{ selected.student.loginId }}</span>
          <a v-if="whatsapp(selected)" :href="whatsapp(selected)" target="_blank" rel="noopener noreferrer">Message on
            WhatsApp ({{ formatLkMobile(phoneOf(selected)) }})</a>
          <span v-else class="muted">No WhatsApp number on file</span>
        </div>

        <p class="text">{{ selected.description }}</p>

        <div v-if="selected.pictures.length" class="pics">
          <button v-for="p in selected.pictures" :key="p.id" type="button" class="thumb"
                  :aria-label="`View picture ${p.name}`" @click="zoom = zoom === p.url ? null : p.url">
            <img :src="p.url" :alt="p.name"/>
          </button>
          <div v-if="zoom" class="zoom">
            <img :src="zoom" alt="Picture sent by the student, full size"/>
            <button type="button" class="btn ghost sm" @click="zoom = null">Close picture</button>
          </div>
        </div>

        <div class="row actions">
          <button v-if="selected.status === 'open'" type="button" class="btn ghost sm" :disabled="busy"
                  @click="setStatus(selected, 'in_progress')">Start working on it
          </button>
          <button v-if="selected.status !== 'resolved'" type="button" class="btn sm" :disabled="busy"
                  @click="setStatus(selected, 'resolved')">Mark resolved
          </button>
          <button v-else type="button" class="btn ghost sm" :disabled="busy" @click="setStatus(selected, 'open')">
            Reopen
          </button>
        </div>

        <p v-if="message" class="ok" role="status">{{ message }}</p>

        <label class="field">Reply to the student
          <textarea v-model="reply" rows="5" maxlength="2000"
                    placeholder="The student reads this on their Report a problem page."></textarea>
        </label>
        <div class="row">
          <span class="muted count">{{ reply.length }}/2000</span>
          <button type="button" class="btn ghost sm" :disabled="busy || !replyReady" @click="saveReply(false)">
            {{ selected.reply ? 'Update reply' : 'Send reply' }}
          </button>
          <button v-if="selected.status !== 'resolved'" type="button" class="btn sm" :disabled="busy || !replyReady"
                  @click="saveReply(true)">
            Send reply and resolve
          </button>
        </div>
        <p v-if="selected.status === 'open'" class="muted hint">A reply moves an open issue to "In progress".</p>

        <label class="field">Private note <span class="muted">(only staff see this)</span>
          <textarea v-model="note" rows="3" maxlength="2000"
                    placeholder="What you checked, what is left to do."></textarea>
        </label>
        <div class="row">
          <button type="button" class="btn ghost sm" :disabled="busy || !noteChanged" @click="saveNote">Save note
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.seg {
  display: inline-flex;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.seg button {
  padding: .5rem 1rem;
  border: 0;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: .9rem;
  cursor: pointer;
}

.seg button + button {
  border-left: 1px solid var(--line);
}

.seg button.on {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}

.filters {
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.grow {
  flex: 1;
  min-width: 200px;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 1.5rem;
  align-items: start;
}

.list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: .6rem;
}

.item {
  width: 100%;
  display: grid;
  gap: .3rem;
  text-align: left;
  padding: .8rem 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.item:hover {
  border-color: var(--accent);
}

.item.on {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.subject {
  font-weight: 600;
}

.who {
  font-size: .9rem;
  color: var(--muted);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  margin: 0;
}

.detail h2 {
  margin: .8rem 0 .4rem;
}

.detail h2:focus {
  outline: none;
}

.student {
  display: flex;
  flex-wrap: wrap;
  gap: .3rem 1rem;
  align-items: baseline;
  margin: .8rem 0;
  padding: .7rem 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.text {
  margin: 1rem 0;
  white-space: pre-wrap;
}

.pics {
  display: flex;
  flex-wrap: wrap;
  gap: .8rem;
  margin-bottom: 1rem;
}

.thumb {
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  cursor: zoom-in;
}

.thumb img {
  display: block;
  width: 110px;
  height: 70px;
  object-fit: cover;
  border-radius: 5px;
}

.zoom {
  flex-basis: 100%;
  display: grid;
  gap: .5rem;
  justify-items: start;
}

.zoom img {
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.actions {
  gap: .6rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.ok {
  margin: 0 0 1rem;
  padding: .7rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--secondary);
  font-size: .9rem;
}

.field {
  display: grid;
  gap: .4rem;
  margin-top: 1.2rem;
  font-size: .9rem;
  color: var(--muted);
}

.field textarea, .filters input, .filters select {
  width: 100%;
  box-sizing: border-box;
  padding: .7rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

.field textarea {
  resize: vertical;
}

.row {
  display: flex;
  gap: .6rem;
  align-items: center;
  margin-top: .6rem;
}

.count {
  margin-right: auto;
}

.hint {
  margin: .4rem 0 0;
  font-size: .85rem;
}

.back {
  display: none;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

/* A phone shows the list or the issue, not both */
@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }

  .split.has-selection .list {
    display: none;
  }

  .split:not(.has-selection) .detail {
    display: none;
  }

  .back {
    display: inline-block;
  }
}
</style>
