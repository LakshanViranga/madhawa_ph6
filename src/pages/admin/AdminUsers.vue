<script setup>
import {ref, reactive, computed, onMounted} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'

// Route: /admin/users  (admins only; students are managed on their own page)
const api = useAdmin()

const users = ref([])
const meId = ref('')
const loading = ref(true)
const error = ref('')

const filter = ref('all')
const tabs = [['all', 'Everyone'], ['admin', 'Admins'], ['tutor', 'Tutors']]
const roleLabel = {admin: 'Admin', tutor: 'Tutor'}

const shown = computed(() => users.value.filter((u) => filter.value === 'all' || u.role === filter.value))
const count = (role) => users.value.filter((u) => u.role === role).length

async function load() {
  const [u, m] = await Promise.all([api.users(), api.me()])
  if (u.ok) {
    users.value = u.data
    error.value = ''
  } else {
    error.value = u.status === 403 ? 'Only admins can manage users.' : u.error
  }
  if (m.ok) meId.value = m.data.user.id
  loading.value = false
}

onMounted(load)

// ---- add / edit ----
const blank = () => ({name: '', loginId: '', role: 'tutor', password: ''})
const form = reactive(blank())
const editing = ref(null) // null = closed, 'new', or a user id
const saving = ref(false)
const formErrors = ref([])
const showPassword = ref(false)

const editingSelf = computed(() => editing.value === meId.value)

function open(u) {
  formErrors.value = []
  showPassword.value = false
  editing.value = u ? u.id : 'new'
  Object.assign(form, blank(), u ? {name: u.name, loginId: u.loginId, role: u.role} : {})
}

async function save() {
  formErrors.value = []
  saving.value = true
  const creating = editing.value === 'new'
  const r = creating
      ? await api.createUser({
        name: form.name,
        loginId: form.loginId,
        role: form.role,
        password: form.password || undefined
      })
      : await api.updateUser(editing.value, {name: form.name, role: form.role})
  saving.value = false
  if (!r.ok) {
    formErrors.value = r.errors?.length ? r.errors : [r.error]
    return
  }
  if (creating && r.data.temporaryPassword) {
    reveal.value = {name: r.data.user.name, loginId: r.data.user.loginId, password: r.data.temporaryPassword}
  }
  editing.value = null
  await load()
}

// ---- a password shown once ----
const reveal = ref(null) // { name, loginId, password }
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(reveal.value.password)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    error.value = 'Could not copy. Select the password and copy it by hand.'
  }
}

// ---- row actions ----
async function patch(u, body, confirmText) {
  if (confirmText && !window.confirm(confirmText)) return
  error.value = ''
  const r = await api.updateUser(u.id, body)
  if (!r.ok) {
    error.value = r.error
    return
  }
  Object.assign(u, r.data)
}

async function resetPassword(u) {
  if (!window.confirm(`Make a new password for ${u.name}? Their old password stops working straight away.`)) return
  error.value = ''
  const r = await api.resetUserPassword(u.id)
  if (!r.ok) {
    error.value = r.error
    return
  }
  reveal.value = {name: u.name, loginId: u.loginId, password: r.data.temporaryPassword}
  await load()
}

async function unlock(u) {
  error.value = ''
  const r = await api.unlockUser(u.id)
  if (!r.ok) {
    error.value = r.error
    return
  }
  Object.assign(u, r.data)
}

const statusOf = (u) => (!u.active ? 'Deactivated' : u.locked ? 'Locked' : 'Active')
const day = (iso) => new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})
</script>

<template>
  <div class="head">
    <h1>Users</h1>
    <button type="button" class="btn" @click="open(null)">Add user</button>
  </div>

  <p class="muted note">
    Admins can manage everything, including users. Tutors can manage classes, lessons and tests, but not users.
    Students are managed on the Students page.
  </p>

  <p v-if="error" class="err" role="alert">{{ error }}</p>

  <!-- A password is shown once, right after it is made -->
  <section v-if="reveal" class="panel reveal" role="status" aria-live="polite">
    <h2>Temporary password for {{ reveal.name }}</h2>
    <p class="muted">Login ID: <b>{{ reveal.loginId }}</b></p>
    <p><code class="pw">{{ reveal.password }}</code>
      <button type="button" class="btn ghost sm" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
    </p>
    <p class="muted">This is the only time it is shown. Send it to them privately, for example by message, not by a
      shared chat.</p>
    <button type="button" class="btn" @click="reveal = null">I have saved it</button>
  </section>

  <!-- Add / edit form -->
  <section v-if="editing" class="panel">
    <h2>{{ editing === 'new' ? 'Add a user' : 'Edit user' }}</h2>
    <div v-if="formErrors.length" class="errs" role="alert">
      <ul>
        <li v-for="e in formErrors" :key="e">{{ e }}</li>
      </ul>
    </div>
    <div class="form">
      <label>Name<input v-model="form.name" maxlength="100" autocomplete="off"/></label>
      <label>Login ID (email)
        <input v-model="form.loginId" type="email" maxlength="100" autocomplete="off" :disabled="editing !== 'new'"
               placeholder="name@example.com"/>
      </label>
      <label>Role
        <select v-model="form.role" :disabled="editingSelf">
          <option value="tutor">Tutor (classes, lessons and tests)</option>
          <option value="admin">Admin (everything, including users)</option>
        </select>
      </label>
      <label v-if="editing === 'new'">Password (optional)
        <span class="pwrow">
          <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
                 maxlength="200" placeholder="Leave empty to make one for me"/>
          <button type="button" class="btn ghost sm"
                  @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </span>
      </label>
    </div>
    <p v-if="editingSelf" class="muted small">You cannot change your own role. Ask another admin.</p>
    <p v-else-if="editing === 'new'" class="muted small">A password you type needs at least 10 characters. If you leave
      it empty, a random one is made and shown once.</p>
    <div class="row" style="justify-content:flex-end; margin-top:1rem">
      <button type="button" class="btn ghost" @click="editing = null">Cancel</button>
      <button type="button" class="btn"
              :disabled="saving || !form.name.trim() || (editing === 'new' && !form.loginId.trim())" @click="save">
        {{ saving ? 'Saving...' : editing === 'new' ? 'Add user' : 'Save changes' }}
      </button>
    </div>
  </section>

  <div class="seg" role="group" aria-label="Filter users">
    <button v-for="[key, label] in tabs" :key="key" type="button" :class="{ on: filter === key }"
            :aria-pressed="filter === key" @click="filter = key">
      {{ label }}
      <template v-if="key !== 'all'"> ({{ count(key) }})</template>
    </button>
  </div>

  <section class="panel scroll">
    <p v-if="loading" class="muted">Loading...</p>
    <p v-else-if="!shown.length" class="muted">No users here yet.</p>
    <table v-else>
      <thead>
      <tr>
        <th>Name</th>
        <th>Login ID</th>
        <th>Role</th>
        <th>Status</th>
        <th>Added</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="u in shown" :key="u.id">
        <td>{{ u.name }} <span v-if="u.id === meId" class="muted">(you)</span></td>
        <td>{{ u.loginId }}</td>
        <td><span class="tag">{{ roleLabel[u.role] }}</span></td>
        <td><span class="tag" :class="statusOf(u) === 'Active' ? 'ok' : 'warn'">{{ statusOf(u) }}</span></td>
        <td class="muted">{{ day(u.createdAt) }}</td>
        <td class="row" style="justify-content:flex-end">
          <button type="button" class="btn ghost sm" @click="open(u)">Edit</button>
          <button type="button" class="btn ghost sm" @click="resetPassword(u)">New password</button>
          <button v-if="u.locked" type="button" class="btn ghost sm" @click="unlock(u)">Unlock</button>
          <button v-if="u.active" type="button" class="btn danger sm" :disabled="u.id === meId"
                  :title="u.id === meId ? 'You cannot deactivate yourself' : ''"
                  @click="patch(u, { active: false }, `Deactivate ${u.name}? They are signed out and cannot log in until you activate them again.`)">
            Deactivate
          </button>
          <button v-else type="button" class="btn ghost sm" @click="patch(u, { active: true })">Activate</button>
        </td>
      </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.note {
  margin: 0 0 1rem;
}

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
  margin: .6rem 0 0;
}

.reveal {
  border-color: var(--accent);
}

.pw {
  display: inline-block;
  margin-right: .6rem;
  padding: .4rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: 600 1.15rem monospace;
  letter-spacing: .06em;
  color: var(--secondary);
  user-select: all;
}

.pwrow {
  display: flex;
  gap: .5rem;
  align-items: center;
}

.pwrow input {
  flex: 1;
}

.seg {
  display: inline-flex;
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

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}
</style>
