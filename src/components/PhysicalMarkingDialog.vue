<script setup>
import {ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'

const props = defineProps({
  quizId: {type: [String, Number], required: true},
  classId: {type: [String, Number], required: true},
  title: {type: String, default: ''},
})
const emit = defineEmits(['close', 'saved'])

const api = useAdmin()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const total = ref(0)
const pass = ref(null)
const students = ref([]) // { id, name, phone, marks, absent }
const search = ref('')
const report = ref(null) // result of the last CSV upload: { applied, absent, skipped, problems, fatal }

const onKey = (e) => {
  if (e.key === 'Escape' && !saving.value) emit('close')
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  const [r, s] = await Promise.all([api.quiz(props.quizId), api.students(props.classId)])
  if (r.ok) {
    total.value = Number(r.data.totalMarks) || 0
    pass.value = r.data.passMarks ?? null
    // students.value = r.data.students.map((s) => ({
    //   id: s.id, name: s.name, phone: s.phone ?? '', marks: s.marks ?? '', absent: Boolean(s.absent),
    // }))
  } else {
    error.value = r.error
  }

  if (s.ok){
    students.value = s.data.students
    console.log(students.value)
  } else {
    error.value = r.error
  }
  loading.value = false
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const shown = computed(() => {
  const t = search.value.trim().toLowerCase()
  return t ? students.value.filter((s) => s.name.toLowerCase().includes(t)) : students.value
})

// '' means "not entered yet", which is allowed
function rowError(s) {
  if (s.absent || s.marks === '' || s.marks == null) return ''
  const n = Number(s.marks)
  if (Number.isNaN(n) || n < 0) return 'Enter a number from 0'
  if (n > total.value) return `Maximum is ${total.value}`
  return ''
}

function result(s) {
  if (s.absent) return 'Absent'
  if (pass.value == null || s.marks === '' || rowError(s)) return ''
  return Number(s.marks) >= pass.value ? 'Pass' : 'Fail'
}

const entered = computed(() => students.value.filter((s) => s.absent || (s.marks !== '' && s.marks != null)).length)
const invalid = computed(() => students.value.filter((s) => rowError(s)).length)
const noPhone = computed(() => students.value.filter((s) => !phoneKey(s.phone)).length)

// ---------------------------------------------------------------------
// CSV template and upload
// ---------------------------------------------------------------------

// Excel drops the leading 0 of a phone number (0771234567 becomes 771234567), and numbers may be
// written as +94..., 94... or 0.... So match on the last 9 digits, which is the same for all of them.
function phoneKey(v) {
  const digits = String(v ?? '').replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : ''
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Stops a name such as "=SUM(A1)" from running as a formula when the file is opened in Excel
const safeText = (v) => (/^[=+\-@]/.test(String(v ?? '')) ? `'${v}` : v)

function downloadTemplate() {
  const lines = [
    ['Phone No', 'Name', 'Marks'],
    ...students.value.map((s) => [s.phone, safeText(s.name), s.absent ? 'AB' : s.marks]),
  ]
  // BOM so Excel reads names in other scripts correctly
  const csv = '\uFEFF' + lines.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}))
  const a = document.createElement('a')
  const name = (props.title || 'test').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'test'
  a.href = url
  a.download = `${name}-marks.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Small CSV reader: quoted fields, "" escapes, and a comma, semicolon or tab separator
function parseCsv(text, delim) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''))
}

async function importCsv(e) {
  const f = e.target.files[0]
  e.target.value = '' // lets the same file be chosen again
  report.value = null
  if (!f) return
  if (f.size > 1024 * 1024) return (report.value = {fatal: 'That file is over 1 MB.', problems: []})

  let text
  try {
    text = (await f.text()).replace(/^\uFEFF/, '')
  } catch {
    return (report.value = {fatal: 'The file could not be read.', problems: []})
  }

  const firstLine = text.split(/\r?\n/, 1)[0]
  const delim = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]
  const rows = parseCsv(text, delim)
  if (rows.length < 2) return (report.value = {fatal: 'The file has no rows.', problems: []})

  const head = rows[0].map((h) => h.trim().toLowerCase())
  const phoneCol = head.findIndex((h) => /phone|mobile|contact/.test(h))
  const marksCol = head.findIndex((h) => /mark|score/.test(h))
  if (phoneCol < 0 || marksCol < 0) {
    return (report.value = {fatal: 'The first row must have the columns "Phone No" and "Marks".', problems: []})
  }

  const byPhone = new Map()
  students.value.forEach((s) => {
    const k = phoneKey(s.phone)
    if (!k) return
    if (!byPhone.has(k)) byPhone.set(k, [])
    byPhone.get(k).push(s)
  })

  const problems = []
  const seen = new Set()
  let applied = 0
  let absent = 0
  let skipped = 0

  rows.slice(1).forEach((row, i) => {
    const at = `Row ${i + 2}`
    const rawPhone = (row[phoneCol] ?? '').trim()
    const rawMarks = (row[marksCol] ?? '').trim()

    const key = phoneKey(rawPhone)
    if (!key) return problems.push(`${at}: "${rawPhone}" is not a valid phone number.`)
    if (seen.has(key)) return problems.push(`${at}: ${rawPhone} appears more than once, so this row was skipped.`)
    seen.add(key)

    const found = byPhone.get(key)
    if (!found) return problems.push(`${at}: ${rawPhone} is not a student of this class.`)
    if (found.length > 1) return problems.push(`${at}: ${rawPhone} matches more than one student.`)
    const s = found[0]

    if (rawMarks === '') {
      skipped++ // blank means "leave as it is"
      return
    }
    if (/^(ab|abs|absent|a)$/i.test(rawMarks)) {
      s.absent = true
      s.marks = ''
      absent++
      return
    }
    const n = Number(rawMarks.replace(',', '.'))
    if (Number.isNaN(n) || n < 0) return problems.push(`${at} (${s.name}): "${rawMarks}" is not a valid mark.`)
    if (n > total.value) return problems.push(`${at} (${s.name}): ${n} is more than the maximum ${total.value}.`)
    s.marks = n
    s.absent = false
    applied++
  })

  report.value = {applied, absent, skipped, problems}
}

// ---------------------------------------------------------------------

async function save() {
  if (invalid.value) return
  error.value = ''
  saving.value = true
  const entries = students.value.map((s) => ({
    studentId: s.id,
    absent: s.absent,
    marks: s.absent || s.marks === '' || s.marks == null ? null : Number(s.marks),
  }))
  const r = await api.gradingPhysicalTest(props.quizId, entries)
  saving.value = false
  if (!r.ok) {
    error.value = [r.error, ...(r.errors ?? [])].filter(Boolean).join(' ')
    return
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="!saving && emit('close')">
    <div class="box" role="dialog" aria-modal="true" aria-labelledby="pm-title">
      <div class="head">
        <h2 id="pm-title">Marks: {{ title }}</h2>
        <button type="button" class="btn ghost sm" :disabled="saving" @click="emit('close')">Close</button>
      </div>

      <p v-if="loading" class="muted">Loading...</p>
      <template v-else>
        <p class="muted">
          Total marks {{ total }}<template v-if="pass != null">, pass marks {{ pass }}</template>.
          Leave marks empty if a student has no result yet. {{ entered }} of {{ students.length }} entered.
        </p>

        <!-- CSV: download the class list, fill in marks offline, upload it back -->
        <div class="csv">
          <div class="row tools">
            <button type="button" class="btn ghost sm" :disabled="!students.length" @click="downloadTemplate">
              Download CSV template
            </button>
            <label class="btn ghost sm filebtn" :class="{ off: !students.length }">
              Upload CSV
              <input class="sr" type="file" accept=".csv,text/csv" :disabled="!students.length" @change="importCsv"/>
            </label>
          </div>
          <p class="muted small">
            The template lists every student with their phone number. Fill the Marks column with a number, or AB for
            absent. Blank rows are left as they are. After uploading, check the marks below and press Save marks.
          </p>
          <p v-if="noPhone" class="muted small">
            {{ noPhone }} student{{ noPhone === 1 ? ' has' : 's have' }} no phone number saved, so
            {{ noPhone === 1 ? 'that student' : 'those students' }} cannot be matched from a file.
          </p>

          <div v-if="report" class="report" :class="{ bad: report.fatal || report.problems.length }" role="status">
            <p v-if="report.fatal" class="err">{{ report.fatal }}</p>
            <template v-else>
              <p>
                Applied {{ report.applied }} mark{{ report.applied === 1 ? '' : 's' }}
                and {{ report.absent }} absent<template v-if="report.skipped">; {{ report.skipped }} blank row{{ report.skipped === 1 ? '' : 's' }} skipped</template>.
                <template v-if="report.problems.length">
                  {{ report.problems.length }} row{{ report.problems.length === 1 ? ' was' : 's were' }} not used:
                </template>
              </p>
              <ul v-if="report.problems.length">
                <li v-for="p in report.problems.slice(0, 8)" :key="p">{{ p }}</li>
                <li v-if="report.problems.length > 8">and {{ report.problems.length - 8 }} more.</li>
              </ul>
            </template>
          </div>
        </div>

        <label class="find">Find a student
          <input v-model="search" type="search" placeholder="Name"/>
        </label>

        <p v-if="!students.length" class="muted">No students are enrolled in this class.</p>
        <div v-else class="list">
          <table>
            <thead>
            <tr>
              <th>Student</th>
              <th>Marks</th>
              <th>Absent</th>
              <th>Result</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="s in shown" :key="s.id">
              <td>{{ s.name }}</td>
              <td>
                <input v-model="s.marks" class="marks" type="number" min="0" :max="total" step="0.5"
                       :disabled="s.absent" :aria-label="`Marks for ${s.name}`"
                       :aria-invalid="Boolean(rowError(s))"/>
                <span v-if="rowError(s)" class="err small">{{ rowError(s) }}</span>
              </td>
              <td><input v-model="s.absent" type="checkbox" :aria-label="`${s.name} was absent`"/></td>
              <td>
                <span v-if="result(s)" class="tag"
                      :class="{ ok: result(s) === 'Pass', warn: result(s) === 'Fail' }">{{ result(s) }}</span>
              </td>
            </tr>
            <tr v-if="!shown.length">
              <td colspan="4" class="muted">No student matches.</td>
            </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <div class="row foot">
        <button type="button" class="btn ghost" :disabled="saving" @click="emit('close')">Cancel</button>
        <button type="button" class="btn" :disabled="saving || loading || invalid > 0 || !students.length"
                @click="save">{{ saving ? 'Saving...' : 'Save marks' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, .55);
}

.box {
  width: min(720px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: .9rem;
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.box h2 {
  margin: 0;
}

.csv {
  display: grid;
  gap: .5rem;
  padding: .9rem;
  border: 1px dashed var(--line);
  border-radius: 6px;
}

.tools {
  gap: .6rem;
  flex-wrap: wrap;
}

.csv .small {
  margin: 0;
}

.filebtn {
  display: inline-block;
  cursor: pointer;
}

.filebtn.off {
  opacity: .4;
  cursor: not-allowed;
}

.filebtn:focus-within {
  outline: 2px solid var(--gold-soft);
  outline-offset: 2px;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.report {
  padding: .6rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: .9rem;
}

.report.bad {
  border-color: var(--danger);
}

.report p {
  margin: 0;
}

.report ul {
  margin: .4rem 0 0;
  padding-left: 1.2rem;
}

.find {
  display: grid;
  gap: .3rem;
}

.list {
  flex: 1;
  overflow: auto;
  min-height: 120px;
}

.marks {
  width: 6rem;
}

.small {
  display: block;
  font-size: .8rem;
  margin: .2rem 0 0;
}

.err {
  color: var(--danger);
  margin: 0;
  font-size: .9rem;
}

.foot {
  justify-content: flex-end;
  gap: .6rem;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}
</style>
