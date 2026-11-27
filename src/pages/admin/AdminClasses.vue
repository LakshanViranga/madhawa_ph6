<script setup>
import {ref, reactive, onMounted} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'
import ClassStudentDrawer from "@/components/ClassStudentDrawer.vue";
import {useConfirm} from '@/composables/useConfirm.js'

const confirm = useConfirm()
const studentsFor = ref(null)
const api = useAdmin()
const classes = ref([])
const batches = ref([])
const loading = ref(true)
const error = ref('')

const editing = ref(null) // null = form closed, 'new' or a class id
const saving = ref(false)
const formErrors = ref([])
const newBatch = ref('')
const copied = ref('')

const blank = () => ({
  title: '',
  subject: '',
  description: '',
  batchId: '',
  status: 'active',
  startDate: '',
  endDate: ''
})
const form = reactive(blank())

async function load() {
  const [c, b] = await Promise.all([api.classes(), api.batches()])
  if (c.ok) classes.value = c.data
  else error.value = c.error
  if (b.ok) batches.value = b.data
  loading.value = false
}

onMounted(load)

function open(c) {
  formErrors.value = []
  editing.value = c ? c.id : 'new'
  Object.assign(form, blank(), c ? {
    title: c.title, subject: c.subject ?? '', description: c.description ?? '',
    batchId: batches.value.find((b) => b.name === c.batch)?.id ?? '',
    status: c.status, startDate: c.startDate?.slice(0, 10) ?? '', endDate: c.endDate?.slice(0, 10) ?? '',
  } : {})
}

async function save() {
  formErrors.value = []
  saving.value = true
  const body = {
    ...form,
    batchId: form.batchId || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null
  }
  const r = editing.value === 'new' ? await api.createClass(body) : await api.updateClass(editing.value, body)
  saving.value = false
  if (!r.ok) {
    formErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  editing.value = null
  await load()
}

async function addBatch() {
  const name = newBatch.value.trim()
  if (!name) return
  const r = await api.createBatch(name)
  if (!r.ok) {
    formErrors.value = [r.error]
    return
  }
  batches.value.push(r.data)
  form.batchId = r.data.id
  newBatch.value = ''
}

async function patch(c, body) {
  error.value = ''
  const r = await api.updateClass(c.id, body)
  if (!r.ok) {
    error.value = r.error
    return
  }
  Object.assign(c, r.data)
}

async function copy(c) {
  try {
    await navigator.clipboard.writeText(c.joinCode)
    copied.value = c.id
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    error.value = 'Could not copy. Select the code and copy it by hand.'
  }
}

const tagClass = (s) => (s === 'active' ? 'ok' : s === 'draft' ? 'warn' : '')
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit'
}) : 'None scheduled')

async function resetCode(c) {
  await confirm({
    title: 'Make a new code?',
    message: 'The old code stops working straight away. Students already in the class stay in it.',
    confirmText: 'Make new code',
    action: async () => {
      const r = await api.resetJoinCode(c.id)
      if (r.ok) Object.assign(c, r.data)
      else error.value = r.error
    },
  })
}
</script>

<template>
  <div class="head">
    <h1>Classes</h1>
    <button type="button" class="btn" @click="open(null)">New class</button>
  </div>

  <p v-if="error" class="err" role="alert">{{ error }}</p>

  <section v-if="editing" class="panel">
    <h2>{{ editing === 'new' ? 'New class' : 'Edit class' }}</h2>
    <div v-if="formErrors.length" class="errs" role="alert">
      <ul>
        <li v-for="e in formErrors" :key="e">{{ e }}</li>
      </ul>
    </div>
    <div class="form">
      <label>Title<input v-model="form.title" maxlength="120" placeholder="Physics A/L 2027"/></label>
      <label>Subject<input v-model="form.subject" maxlength="80" placeholder="Physics"/></label>
      <label>Batch
        <select v-model="form.batchId">
          <option value="">Any batch</option>
          <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
      <label>Status
        <select v-model="form.status">
          <option value="draft">Draft (hidden from students)</option>
          <option value="active">Active</option>
          <option value="archived">Archived (finished, still viewable)</option>
        </select>
      </label>
      <label>Starts<input v-model="form.startDate" type="date"/></label>
      <label>Ends<input v-model="form.endDate" type="date"/></label>
      <label style="grid-column: 1 / -1">Description<textarea v-model="form.description" rows="2"
                                                              maxlength="1000"></textarea></label>
    </div>
    <div class="row" style="margin-top:1rem; align-items:end">
      <label class="grow">New batch<input v-model="newBatch" maxlength="60" placeholder="Add a batch name"
                                          @keydown.enter.prevent="addBatch"/></label>
      <button type="button" class="btn ghost" @click="addBatch">Add batch</button>
    </div>
    <p class="muted small">A class tied to a batch only accepts students of that batch.</p>
    <div class="row" style="margin-top:1rem; justify-content:flex-end">
      <button type="button" class="btn ghost" @click="editing = null">Cancel</button>
      <button type="button" class="btn" :disabled="saving || !form.title.trim()" @click="save">
        {{ saving ? 'Saving...' : 'Save class' }}
      </button>
    </div>
  </section>

  <section class="panel scroll">
    <p v-if="loading" class="muted">Loading...</p>
    <p v-else-if="!classes.length" class="muted">No classes yet. Create one, then give students its join code.</p>
    <table v-else>
      <thead>
      <tr>
        <th>Class</th>
        <th>Batch</th>
        <th>Students</th>
        <th>Tests</th>
        <th>Next lesson</th>
        <th>Status</th>
        <th>Join code</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="c in classes" :key="c.id">
        <td>{{ c.title }}
          <div class="muted">{{ c.subject }}</div>
        </td>
        <td>{{ c.batch ?? 'Any' }}</td>
        <td>{{ c.studentCount }}</td>
        <td>{{ c.quizCount }}</td>
        <td>{{ when(c.nextSessionAt) }}</td>
        <td><span class="tag" :class="tagClass(c.status)">{{ c.status }}</span></td>
        <td>
          <code class="code">{{ c.joinCode }}</code>
          <div class="row" style="gap:.4rem; margin-top:.3rem">
            <button type="button" class="btn ghost sm" @click="copy(c)">{{
                copied === c.id ? 'Copied' : 'Copy'
              }}
            </button>
            <button type="button" class="btn ghost sm" @click="resetCode(c)">New code</button>
            <button type="button" class="btn ghost sm" @click="patch(c, { joinEnabled: !c.joinEnabled })">
              {{ c.joinEnabled ? 'Stop joining' : 'Allow joining' }}
            </button>
          </div>
          <span v-if="!c.joinEnabled" class="muted small">Joining is off</span>
        </td>
        <td class="row" style="justify-content:flex-end">
          <router-link :to="`/admin/classes/${c.id}/lessons`" class="btn ghost sm">Lessons</router-link>
          <router-link :to="{ path: '/admin/quizzes', query: { class: c.id } }" class="btn ghost sm">Tests</router-link>
          <button type="button" class="btn ghost sm" @click="studentsFor = c">Students</button>
          <button type="button" class="btn ghost sm" @click="open(c)">Edit</button>
          <button v-if="c.status === 'active'" type="button" class="btn danger sm"
                  @click="patch(c, { status: 'archived' })">Archive
          </button>
          <button v-else type="button" class="btn ghost sm" @click="patch(c, { status: 'active' })">Activate</button>
        </td>
      </tr>
      </tbody>
    </table>
  </section>
  <ClassStudentDrawer v-if="studentsFor" :cls="studentsFor"
                       @close="studentsFor = null"
                       @changed="(n) => (studentsFor.studentCount = n)"/>
</template>

<style scoped>
.err {
  color: var(--danger);
  margin: 0 0 1rem;
}

.errs ul {
  margin: 0 0 1rem;
  padding-left: 1.2rem;
  color: var(--danger);
}

.small {
  font-size: .8rem;
  margin: .4rem 0 0;
}

.grow {
  flex: 1;
}

.code {
  font: 600 1rem monospace;
  letter-spacing: .08em;
  color: var(--secondary);
  user-select: all;
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

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--secondary);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
