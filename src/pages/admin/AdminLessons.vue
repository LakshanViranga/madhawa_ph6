<script setup>
import {ref, reactive, computed, watch, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {useAdmin} from '@/composables/useAdmin.js'

// Route: /admin/classes/:classId/lessons
const api = useAdmin()
const route = useRoute()
const classId = computed(() => route.params.classId)

const data = ref(null)
const error = ref('')

async function load() {
  const r = await api.lessons(classId.value)
  if (r.ok) data.value = r.data
  else error.value = r.error
}

onMounted(load)

const toLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const toIso = (v) => (v ? new Date(v).toISOString() : null)
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}) : 'Not scheduled')

// ---------- lessons ----------
const sBlank = () => ({week: 1, title: '', starts: '', ends: '', link: '', notes: ''})
const sForm = reactive(sBlank())
const sEditing = ref(null) // null = closed, 'new' or a lesson id
const sErrors = ref([])
const busy = ref(false)

function openSession(s) {
  sErrors.value = []
  sEditing.value = s ? s.id : 'new'
  Object.assign(sForm, sBlank(), s ? {
    week: s.week, title: s.title, starts: toLocal(s.startsAt), ends: toLocal(s.endsAt),
    link: s.meetingLink ?? '', notes: s.notes ?? '',
  } : {week: (data.value?.sessions[0]?.week ?? 0) + 1})
}

async function saveSession() {
  sErrors.value = []
  busy.value = true
  const body = {week: Number(sForm.week), title: sForm.title, startsAt: toIso(sForm.starts), endsAt: toIso(sForm.ends), meetingLink: sForm.link, notes: sForm.notes}
  const r = sEditing.value === 'new' ? await api.createSession(classId.value, body) : await api.updateSession(sEditing.value, body)
  busy.value = false
  if (!r.ok) {
    sErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  sEditing.value = null
  await load()
}

async function removeSession(s) {
  if (!window.confirm(`Delete "${s.title}"? Its recordings stay in the class under "More recordings".`)) return
  const r = await api.deleteSession(s.id)
  if (r.ok) await load()
  else error.value = r.error
}

// ---------- recordings ----------
const rBlank = () => ({title: '', url: '', sessionId: '', minutes: '', visible: true, from: '', expires: ''})
const rForm = reactive(rBlank())
const rEditing = ref(null)
const rErrors = ref([])

function openRecording(r, sessionId = '') {
  rErrors.value = []
  rEditing.value = r ? r.id : 'new'
  Object.assign(rForm, rBlank(), r ? {
    title: r.title, url: r.url ?? '', sessionId: r.sessionId ?? '',
    minutes: r.durationSec ? Math.round(r.durationSec / 60) : '', visible: r.visibility !== 'hidden',
    from: toLocal(r.publishedAt), expires: toLocal(r.expiresAt),
  } : {sessionId})
}

async function saveRecording() {
  rErrors.value = []
  busy.value = true
  const body = {
    title: rForm.title, url: rForm.url, sessionId: rForm.sessionId || null,
    durationSec: rForm.minutes ? Math.round(Number(rForm.minutes) * 60) : null,
    visible: rForm.visible, availableFrom: toIso(rForm.from), expiresAt: toIso(rForm.expires),
  }
  const r = rEditing.value === 'new' ? await api.createRecording(classId.value, body) : await api.updateRecording(rEditing.value, body)
  busy.value = false
  if (!r.ok) {
    rErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  rEditing.value = null
  await load()
}

async function removeRecording(r) {
  if (!window.confirm(`Delete the recording "${r.title}"?`)) return
  const res = await api.deleteRecording(r.id)
  if (res.ok) await load()
  else error.value = res.error
}

// ---------- materials ----------
const materialTypes = [
  {value: 'slides', label: 'Slides'},
  {value: 'pdf', label: 'PDF'},
  {value: 'document', label: 'Document'},
  {value: 'worksheet', label: 'Worksheet'},
  {value: 'other', label: 'Other file'},
  {value: 'link', label: 'Link'},
]
const typeLabel = (v) => materialTypes.find((t) => t.value === v)?.label ?? 'Link'

const MAX_MB = 20
const mBlank = () => ({title: '', url: '', sessionId: '', type: 'pdf', visible: true})
const mForm = reactive(mBlank())
const mEditing = ref(null)
const mErrors = ref([])
const mFile = ref(null)        // newly picked file
const mExisting = ref('')      // name of the file already stored (when editing)
const fileInput = ref(null)

const isFileType = computed(() => mForm.type !== 'link')
const accept = computed(() => ({
  pdf: '.pdf,application/pdf',
  slides: '.ppt,.pptx,.key,.pdf',
  document: '.doc,.docx,.txt,.pdf',
  worksheet: '.xls,.xlsx,.doc,.docx,.pdf',
}[mForm.type] ?? ''))

const canSaveMaterial = computed(() =>
    !busy.value && mForm.title.trim() && mForm.sessionId &&
    (isFileType.value ? (mFile.value || mExisting.value) : mForm.url.trim())
)

// switching type clears any picked file
watch(() => mForm.type, () => {
  mFile.value = null
  if (fileInput.value) fileInput.value.value = ''
})

function onFile(e) {
  mErrors.value = []
  const f = e.target.files?.[0] ?? null
  if (f && f.size > MAX_MB * 1024 * 1024) {
    mErrors.value = [`File is too large (max ${MAX_MB} MB).`]
    e.target.value = ''
    mFile.value = null
    return
  }
  mFile.value = f
}

function openMaterial(m, sessionId = '') {
  mErrors.value = []
  mFile.value = null
  mExisting.value = m?.fileName ?? ''
  mEditing.value = m ? m.id : 'new'
  Object.assign(mForm, mBlank(), m ? {
    title: m.title, url: m.fileName ? '' : (m.url ?? ''), sessionId: m.sessionId ?? sessionId,
    type: m.type ?? 'link', visible: m.visibility !== 'hidden',
  } : {sessionId})
  if (fileInput.value) fileInput.value.value = ''
}

async function saveMaterial() {
  mErrors.value = []
  busy.value = true
  // composable builds the FormData: `data` = JSON payload, `files` = [{file, name}]
  const payload = {
    title: mForm.title,
    type: mForm.type,
    visible: mForm.visible,
    ...(isFileType.value ? {} : {url: mForm.url}),
  }
  const files = isFileType.value && mFile.value ? [{file: mFile.value, name: mFile.value.name}] : []
  console.log(mForm)
  const r = mEditing.value === 'new'
      ? await api.createMaterial(payload, files, mForm.sessionId)   // id = lesson (session) id
      : await api.updateMaterial(payload, files, mEditing.value)    // id = material id
  busy.value = false
  if (!r.ok) {
    mErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  mEditing.value = null
  await load()
}

async function removeMaterial(m) {
  if (!window.confirm(`Delete the material "${m.title}"?`)) return
  const res = await api.removeMaterial(m.id)
  if (res.ok) await load()
  else error.value = res.error
}

const sessionOptions = computed(() => data.value?.sessions ?? [])
</script>

<template>
  <router-link to="/admin/classes" class="muted">Back to classes</router-link>
  <div class="head">
    <h1>{{ data ? data.class.title : 'Lessons' }}</h1>
    <div class="row">
      <button type="button" class="btn ghost" @click="openMaterial(null)" :disabled="!sessionOptions.length">Add material</button>
      <button type="button" class="btn ghost" @click="openRecording(null)">Add recording</button>
      <button type="button" class="btn" @click="openSession(null)">Schedule lesson</button>
    </div>
  </div>

  <p v-if="error" class="err" role="alert">{{ error }}</p>
  <p v-else-if="!data" class="muted">Loading...</p>

  <template v-else>
    <!-- Lesson form -->
    <section v-if="sEditing" class="panel">
      <h2>{{ sEditing === 'new' ? 'Schedule a lesson' : 'Edit lesson' }}</h2>
      <div v-if="sErrors.length" class="errs" role="alert"><ul><li v-for="e in sErrors" :key="e">{{ e }}</li></ul></div>
      <div class="form">
        <label>Week<input v-model.number="sForm.week" type="number" min="1" max="200"/></label>
        <label>Title<input v-model="sForm.title" maxlength="150"/></label>
        <label>Starts<input v-model="sForm.starts" type="datetime-local"/></label>
        <label>Ends<input v-model="sForm.ends" type="datetime-local"/></label>
        <label style="grid-column: 1 / -1">Live class link (Zoom, Meet...)<input v-model="sForm.link" type="url" placeholder="https://"/></label>
        <label style="grid-column: 1 / -1">Notes for students<textarea v-model="sForm.notes" rows="2" maxlength="2000"></textarea></label>
      </div>
      <p class="muted small">Students see the join button 15 minutes before the lesson starts.</p>
      <div class="row" style="justify-content:flex-end; margin-top:1rem">
        <button type="button" class="btn ghost" @click="sEditing = null">Cancel</button>
        <button type="button" class="btn" :disabled="busy || !sForm.title.trim()" @click="saveSession">Save lesson</button>
      </div>
    </section>

    <!-- Material form -->
    <section v-if="mEditing" class="panel">
      <h2>{{ mEditing === 'new' ? 'Add lesson material' : 'Edit lesson material' }}</h2>
      <div v-if="mErrors.length" class="errs" role="alert"><ul><li v-for="e in mErrors" :key="e">{{ e }}</li></ul></div>
      <div class="form">
        <label>Title<input v-model="mForm.title" maxlength="150"/></label>
        <label>Type
          <select v-model="mForm.type">
            <option v-for="t in materialTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>
        <label>Lesson
          <select v-model="mForm.sessionId" :disabled="mEditing !== 'new'">
            <option value="" disabled>Choose a lesson</option>
            <option v-for="s in sessionOptions" :key="s.id" :value="s.id">Week {{ s.week }} · {{ s.title }}</option>
          </select>
        </label>
        <label v-if="isFileType" style="grid-column: 1 / -1">
          {{ mExisting ? 'Replace file (optional)' : 'File' }} (max {{ MAX_MB }} MB)
          <input ref="fileInput" type="file" :accept="accept" @change="onFile"/>
        </label>
        <p v-if="isFileType && mExisting && !mFile" class="muted small" style="grid-column: 1 / -1">Current file: {{ mExisting }}</p>
        <label v-if="!isFileType" style="grid-column: 1 / -1">Link (Drive, Dropbox, website...)<input v-model="mForm.url" type="url" placeholder="https://"/></label>
        <label class="inline"><input v-model="mForm.visible" type="checkbox"/> Visible to students</label>
      </div>
      <div class="row" style="justify-content:flex-end; margin-top:1rem">
        <button type="button" class="btn ghost" @click="mEditing = null">Cancel</button>
        <button type="button" class="btn" :disabled="!canSaveMaterial" @click="saveMaterial">Save material</button>
      </div>
    </section>

    <!-- Recording form -->
    <section v-if="rEditing" class="panel">
      <h2>{{ rEditing === 'new' ? 'Add a recording' : 'Edit recording' }}</h2>
      <div v-if="rErrors.length" class="errs" role="alert"><ul><li v-for="e in rErrors" :key="e">{{ e }}</li></ul></div>
      <div class="form">
        <label>Title<input v-model="rForm.title" maxlength="150"/></label>
        <label>Link (YouTube, Drive, Vimeo...)<input v-model="rForm.url" type="url" placeholder="https://"/></label>
        <label>Lesson
          <select v-model="rForm.sessionId">
            <option value="">Not tied to a lesson</option>
            <option v-for="s in sessionOptions" :key="s.id" :value="s.id">Week {{ s.week }} · {{ s.title }}</option>
          </select>
        </label>
        <label>Length (minutes, optional)<input v-model.number="rForm.minutes" type="number" min="0"/></label>
        <label>Available from (empty = now)<input v-model="rForm.from" type="datetime-local"/></label>
        <label>Expires (optional)<input v-model="rForm.expires" type="datetime-local"/></label>
        <label class="inline"><input v-model="rForm.visible" type="checkbox"/> Visible to students</label>
      </div>
      <div class="row" style="justify-content:flex-end; margin-top:1rem">
        <button type="button" class="btn ghost" @click="rEditing = null">Cancel</button>
        <button type="button" class="btn" :disabled="busy || !rForm.title.trim() || !rForm.url.trim()" @click="saveRecording">Save recording</button>
      </div>
    </section>

    <p v-if="!data.sessions.length && !data.otherRecordings.length" class="muted">No lessons yet. Schedule the first one.</p>

    <!-- Lessons with their materials and recordings -->
    <section v-for="s in data.sessions" :key="s.id" class="panel">
      <div class="head">
        <div>
          <span class="muted">Week {{ s.week }} · {{ when(s.startsAt) }}</span>
          <h2>{{ s.title }}</h2>
        </div>
        <div class="row">
          <button type="button" class="btn ghost sm" @click="openMaterial(null, s.id)">Add material</button>
          <button type="button" class="btn ghost sm" @click="openRecording(null, s.id)">Add recording</button>
          <button type="button" class="btn ghost sm" @click="openSession(s)">Edit</button>
          <button type="button" class="btn danger sm" @click="removeSession(s)">Delete</button>
        </div>
      </div>
      <p v-if="s.notes" class="muted">{{ s.notes }}</p>
      <p v-if="s.meetingLink" class="muted"><a :href="s.meetingLink" target="_blank" rel="noopener noreferrer">Live class link</a></p>

      <!-- Materials -->
      <template v-if="s.materials?.length">
        <h3 class="sub">Materials</h3>
        <table>
          <tbody>
          <tr v-for="m in s.materials" :key="m.id">
            <td><a :href="m.url" target="_blank" rel="noopener noreferrer">{{ m.title }}</a></td>
            <td><span class="tag">{{ typeLabel(m.type) }}</span></td>
            <td><span class="tag" :class="m.visibility === 'hidden' ? 'warn' : 'ok'">{{ m.visibility === 'hidden' ? 'Hidden' : 'Visible' }}</span></td>
            <td class="row" style="justify-content:flex-end">
              <button type="button" class="btn ghost sm" @click="openMaterial(m)">Edit</button>
              <button type="button" class="btn danger sm" @click="removeMaterial(m)">Delete</button>
            </td>
          </tr>
          </tbody>
        </table>
      </template>

      <!-- Recordings -->
      <template v-if="s.recordings.length">
        <h3 class="sub">Recordings</h3>
        <table>
          <tbody>
          <tr v-for="r in s.recordings" :key="r.id">
            <td>{{ r.title }}</td>
            <td><span class="tag">{{ r.provider }}</span></td>
            <td><span class="tag" :class="r.visibility === 'hidden' ? 'warn' : 'ok'">{{ r.visibility === 'hidden' ? 'Hidden' : 'Visible' }}</span></td>
            <td class="row" style="justify-content:flex-end">
              <button type="button" class="btn ghost sm" @click="openRecording(r)">Edit</button>
              <button type="button" class="btn danger sm" @click="removeRecording(r)">Delete</button>
            </td>
          </tr>
          </tbody>
        </table>
      </template>
    </section>

    <section v-if="data.otherRecordings.length" class="panel">
      <h2>More recordings</h2>
      <table>
        <tbody>
        <tr v-for="r in data.otherRecordings" :key="r.id">
          <td>{{ r.title }}</td>
          <td><span class="tag">{{ r.provider }}</span></td>
          <td><span class="tag" :class="r.visibility === 'hidden' ? 'warn' : 'ok'">{{ r.visibility === 'hidden' ? 'Hidden' : 'Visible' }}</span></td>
          <td class="row" style="justify-content:flex-end">
            <button type="button" class="btn ghost sm" @click="openRecording(r)">Edit</button>
            <button type="button" class="btn danger sm" @click="removeRecording(r)">Delete</button>
          </td>
        </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>

<style scoped>
.err { color: var(--danger); }
.errs ul { margin: 0 0 1rem; padding-left: 1.2rem; color: var(--danger); }
.small { font-size: .8rem; margin: .6rem 0 0; }
.inline { display: flex; align-items: center; gap: .5rem; }
.sub { margin: 1rem 0 .3rem; font-size: .9rem; color: var(--muted, inherit); }
textarea { width: 100%; box-sizing: border-box; padding: .7rem; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--text); font: inherit; resize: vertical; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
</style>
