<script setup>
import {ref, reactive, onMounted} from 'vue'
import {useStudents} from '@/composables/useStudents.js'
import {useAdmin} from "@/composables/useAdmin.js";

const api = useAdmin()
// Call once, here. Everything the page needs comes from this one object.
const {students, loading, saving, error, filters, load, add, approve, hold, remove, resetPassword} = useStudents()

const adding = ref(false)
const form = reactive({student_id: '', name: '', phone: '', batch: 'A/L 2027', password: ''})
const formErrors = ref([])
const created = ref(null) // generated password, shown once
const batches = ref([])

async function initialLoading() {
  await load();
  const [b] = await Promise.all([api.batches()])
  if (b.ok) batches.value = b.data
}

onMounted(initialLoading)

async function addStudent() {
  formErrors.value = []
  const body = {student_id: form.student_id, name: form.name, phone: form.phone, batch: form.batch}
  if (form.password) body.password = form.password // empty = server generates one

  const r = await add(body)
  if (!r.ok) {
    formErrors.value = r.errors.length ? r.errors : [r.error];
    return
  }

  created.value = {name: r.student.name, password: r.temporary_password ?? null}
  Object.assign(form, {student_id: '', name: '', phone: '', password: ''})
  adding.value = false
}

async function resetStudent(s) {
  const r = await resetPassword(s.id)
  if (r.ok) created.value = {name: s.name, password: r.temporary_password}
}
</script>

<template>
  <div class="head">
    <h1>Students</h1>
    <button class="btn" @click="adding = !adding">{{ adding ? 'Close' : 'Add student' }}</button>
  </div>

  <section v-if="created" class="panel">
    <h2>{{ created.name }}</h2>
    <p v-if="created.password" class="muted">Send this password to the student now. It cannot be shown again:
      <b>{{ created.password }}</b></p>
    <p v-else class="muted">Student added.</p>
    <button class="btn ghost sm" @click="created = null">Done</button>
  </section>

  <section v-if="adding" class="panel">
    <h2>New student</h2>
    <form @submit.prevent="addStudent">
      <div class="form">
        <label>Student ID<input v-model="form.student_id" required/></label>
        <label>Full name<input v-model="form.name" required/></label>
        <label>Phone<input v-model="form.phone" type="tel"/></label>
        <label>Batch
          <select v-model="form.batch">
            <option value="">Any batch</option>
            <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </label>
        <label>Password (empty = generate)<input v-model="form.password"/></label>
      </div>
      <ul v-if="formErrors.length">
        <li v-for="e in formErrors" :key="e" style="color:var(--danger)">{{ e }}</li>
      </ul>
      <button class="btn" type="submit" :disabled="saving" style="margin-top:1rem">Create student</button>
    </form>
  </section>

  <section class="panel">
    <div class="row" style="margin-bottom:1rem">
      <label style="flex:1;min-width:200px">Search<input v-model="filters.q" placeholder="Name or student ID"/></label>
      <label>Batch
        <select v-model="filters.batch">
          <option value="">Any batch</option>
          <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </div>
    <p v-if="error" style="color:var(--danger)">{{ error }}</p>

    <div class="scroll">
      <table>
        <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Batch</th>
          <th>Phone</th>
          <th>Status</th>
          <th></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="s in students" :key="s.id">
          <td>{{ s.student_id }}</td>
          <td>{{ s.name }}</td>
          <td>{{ s.batch }}</td>
          <td>{{ s.phone }}</td>
          <td><span class="tag" :class="s.status === 'active' ? 'ok' : 'warn'">{{ s.status }}</span></td>
          <td class="row" style="justify-content:flex-end">
            <button v-if="s.status === 'pending'" class="btn sm" @click="approve(s.id)">Approve</button>
            <button v-if="s.status === 'active'" class="btn sm" @click="hold(s.id)">Hold</button>
            <button class="btn ghost sm" @click="resetStudent(s)">Reset password</button>
            <button class="btn danger sm" @click="remove(s.id)">Remove</button>
          </td>

        </tr>
        <tr v-if="!loading && !students.length">
          <td colspan="6" class="muted">No students found.</td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
