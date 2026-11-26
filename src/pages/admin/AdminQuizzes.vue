<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRoute} from 'vue-router'
import {useAdmin} from '@/composables/useAdmin.js'
import MarkingDialog from "@/components/MarkingDialog.vue";
import PhysicalMarksDialog from "@/components/PhysicalMarkingDialog.vue";

const api = useAdmin()
const rows = ref([])
const classes = ref([])
const loading = ref(true)
const error = ref('')
const busy = ref(null) // id of the row being changed

const classId = ref(useRoute().query.class ?? '') // /admin/quizzes?class=<id> from the Classes screen
const type = ref('')
const delivery = ref('')
const status = ref('')

async function load() {
  const [q, c] = await Promise.all([api.quizzes(), api.classes()])
  if (q.ok) rows.value = q.data
  else error.value = q.error
  if (c.ok) classes.value = c.data
  loading.value = false
}

onMounted(load)

// A physical test that is no longer a draft is shown as "Recorded"
const statusOf = (q) => (q.isPhysical && q.effectiveStatus !== 'draft' ? 'recorded' : q.effectiveStatus)

const shown = computed(() => rows.value.filter((q) =>
    (!classId.value || q.classId === classId.value) &&
    (!type.value || q.type === type.value) &&
    (!delivery.value || (delivery.value === 'physical') === Boolean(q.isPhysical)) &&
    (!status.value || statusOf(q) === status.value)))

const label = {draft: 'Draft', scheduled: 'Scheduled', open: 'Open', closed: 'Closed', recorded: 'Recorded'}
const tagClass = (s) => (s === 'open' || s === 'recorded' ? 'ok' : s === 'draft' ? 'warn' : '')

// heldOn is a plain date (YYYY-MM-DD). Build it from its parts so the timezone cannot shift the day.
const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'})
}

// Publish = scheduled when it opens later, otherwise open straight away. A physical test is recorded.
const publishStatus = (q) => {
  if (q.isPhysical) return 'recorded'
  return q.opensAt && new Date(q.opensAt) > new Date() ? 'scheduled' : 'open'
}
const canReopen = (q) => !q.closesAt || new Date(q.closesAt) > new Date()

async function change(q, next) {
  error.value = ''
  busy.value = q.id
  const r = await api.setQuizStatus(q.id, next)
  busy.value = null
  if (!r.ok) {
    error.value = [r.error, ...(r.errors ?? [])].join(' ')
    return
  }
  await load()
}

async function remove(q) {
  if (!window.confirm(`Delete "${q.title}"? This cannot be undone.`)) return
  error.value = ''
  busy.value = q.id
  const r = await api.deleteQuiz(q.id)
  busy.value = null
  if (!r.ok) {
    error.value = r.error
    return
  }
  await load()
}

const markDialog = ref(false)
const markQuizId = ref(null)
const markQuizTitle = ref(null)

function markOpen(quizId, title) {
  markQuizTitle.value = title
  markQuizId.value = quizId
  markDialog.value = true
}

// Physical tests: the tutor types in each student's marks from the paper
const physicalDialog = ref(false)
const physicalQuizId = ref(null)
const physicalQuizTitle = ref(null)
const physicalClassId = ref(null)

function physicalOpen(quizId, title, classId) {
  physicalQuizId.value = quizId
  physicalQuizTitle.value = title
  physicalDialog.value = true
  physicalClassId.value = classId
}

</script>

<template>
  <div class="head">
    <h1>Tests</h1>
    <router-link to="/admin/quizzes/new" class="btn">New test</router-link>
  </div>

  <div class="row filters">
    <label>Class
      <select v-model="classId">
        <option value="">All classes</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </label>
    <label>Type
      <select v-model="type">
        <option value="">All types</option>
        <option value="mcq">MCQ quiz</option>
        <option value="structured">Written test</option>
      </select>
    </label>
    <label>Delivery
      <select v-model="delivery">
        <option value="">All</option>
        <option value="online">Online</option>
        <option value="physical">Physical</option>
      </select>
    </label>
    <label>Status
      <select v-model="status">
        <option value="">All</option>
        <option v-for="(l, k) in label" :key="k" :value="k">{{ l }}</option>
      </select>
    </label>
  </div>

  <p v-if="error" class="err" role="alert">{{ error }}</p>

  <section class="panel scroll">
    <p v-if="loading" class="muted">Loading...</p>
    <p v-else-if="!shown.length" class="muted">No tests match. <router-link to="/admin/quizzes/new">Create one</router-link>.</p>
    <table v-else>
      <thead>
      <tr>
        <th>Week</th><th>Title</th><th>Class</th><th>Type</th><th>Delivery</th><th>Held on</th><th>Questions</th><th>Status</th>
        <th>Submitted</th><th>Discussion</th><th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="q in shown" :key="q.id">
        <td>Week {{ q.week }}</td>
        <td>{{ q.title }}</td>
        <td>{{ q.className }}</td>
        <td><span class="tag">{{ q.type === 'structured' ? 'Written' : 'MCQ' }}</span></td>
        <td><span class="tag" :class="{ ok: q.isPhysical }">{{ q.isPhysical ? 'Physical' : 'Online' }}</span></td>
        <td>{{ q.isPhysical ? fmtDate(q.heldOn) : '-' }}</td>
        <td>{{ q.isPhysical ? '-' : (q.questionCount || (q.type === 'structured' ? 'Paper' : 0)) }}</td>
        <td><span class="tag" :class="tagClass(statusOf(q))">{{ label[statusOf(q)] }}</span></td>
        <td>
          <template v-if="q.isPhysical">
            <template v-if="q.status === 'draft'">-</template>
            <template v-else>
              {{ q.submitted }}/{{ q.students }} marked
              <button type="button" class="tag" :class="{ warn: !q.submitted }" @click="physicalOpen(q.id, q.title, q.classId)">
                {{ q.submitted ? 'Edit marks' : 'Enter marks' }}
              </button>
            </template>
          </template>
          <template v-else>
            {{ q.status === 'draft' ? '-' : `${q.submitted}/${q.students}` }}
            <button type="button" v-if="q.needsMarking" class="tag warn" @click="markOpen(q.id, q.title)">{{ q.needsMarking }} to mark</button>
          </template>
        </td>
        <td><span class="tag" :class="{ ok: q.discussionAdded }">{{ q.discussionAdded ? 'Added' : 'Not added' }}</span></td>
        <td class="row" style="justify-content:flex-end">
          <router-link :to="`/admin/quizzes/${q.id}`" class="btn ghost sm">Edit</router-link>
          <router-link :to="{ path: '/admin/results', query: { quiz: q.id } }" class="btn ghost sm">Results</router-link>
          <button v-if="q.status === 'draft'" type="button" class="btn ghost sm" :disabled="busy === q.id"
                  @click="change(q, publishStatus(q))">{{ q.isPhysical ? 'Save record' : 'Publish' }}</button>
          <!-- Physical tests are never open or closed, so they have no Close or Reopen -->
          <button v-else-if="!q.isPhysical && q.effectiveStatus !== 'closed'" type="button" class="btn ghost sm" :disabled="busy === q.id"
                  @click="change(q, 'closed')">Close</button>
          <button v-else-if="!q.isPhysical && canReopen(q)" type="button" class="btn ghost sm" :disabled="busy === q.id"
                  @click="change(q, 'open')">Reopen</button>
          <button type="button" class="btn danger sm" :disabled="busy === q.id" @click="remove(q)">Delete</button>
        </td>
      </tr>
      </tbody>
    </table>
    <p class="muted note">A test that students have already attempted cannot be deleted or moved back to draft. Close it instead. To reopen a test that passed its closing time, edit the closing time first. A physical test is a record only, so it has no opening, closing or online submissions.</p>
  </section>
  <marking-dialog v-if="markDialog" :quiz-id="markQuizId" :title="markQuizTitle" @close="markDialog = false" @saved="load" />
  <physical-marks-dialog v-if="physicalDialog" :quiz-id="physicalQuizId" :title="physicalQuizTitle" :class-id="physicalClassId" @close="physicalDialog = false" @saved="load" />
</template>

<style scoped>
.filters { gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.err { color: var(--danger); margin: 0 0 1rem; }
.note { margin-top: 1rem; font-size: .85rem; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
</style>
