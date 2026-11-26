<script setup>
import {ref, computed, onMounted} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'
import AsyncView from "@/pages/AsyncView.vue";

const api = useAdmin()
const data = ref(null)
const error = ref('')

onMounted(async () => {
  setTimeout(() => {
  }, 10000)
  const r = await api.dashboard()
  if (r.ok) data.value = r.data
  else error.value = r.error
})

const cards = computed(() => {
  const s = data.value.stats
  const wk = s.latestWeek
  return [
    ['Students', s.students.total, s.students.pendingApproval ? `${s.students.pendingApproval} waiting for approval` : 'No one waiting'],
    ['Tests this month', s.tests.thisMonth, `${s.tests.openNow} open now`],
    ['Class average (7 days)', s.average.pct != null ? `${s.average.pct}%` : '-',
      s.average.change != null ? `${s.average.change > 0 ? '+' : ''}${s.average.change}% from last week` : 'No earlier week to compare'],
    [wk.week ? `Week ${wk.week} submitted` : 'Latest week', wk.week ? `${wk.submitted}/${wk.enrolled}` : '-',
      wk.week ? `${Math.max(0, wk.enrolled - wk.submitted)} students pending` : 'No tests yet'],
    ['Waiting to be marked', s.toMark, s.toMark ? 'Written tests handed in' : 'All marked'],
  ]
})

function ago(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

const when = (iso) => new Date(iso).toLocaleString('en-GB', {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'})

// Tag text for an activity row
const tagOf = (a) => {
  if (a.kind === 'registration') return a.detail || 'New student'
  return a.marks == null ? 'To mark' : `${a.marks}/${a.total}`
}
</script>

<template>
  <async-view :loading="!data" :error="error">
  <div class="head">
    <h1>Dashboard</h1>
    <div class="row">
      <router-link to="/admin/classes" class="btn ghost">Classes</router-link>
      <router-link to="/admin/quizzes/new" class="btn">New test</router-link>
    </div>
  </div>
  <p v-if="error" class="err" role="alert">{{ error }}</p>
  <p v-else-if="!data" class="muted">Loading...</p>
  <template v-else>
    <section class="cards">
      <div v-for="[l, v, n] in cards" :key="l" class="panel stat">
        <span class="muted">{{ l }}</span><b>{{ v }}</b><span class="muted">{{ n }}</span>
      </div>
    </section>

    <div class="form" style="grid-template-columns: 1.3fr 1fr">
      <section class="panel">
        <h2>Recent activity</h2>
        <p v-if="!data.activity.length" class="muted">Nothing yet.</p>
        <table v-else>
          <tbody>
          <tr v-for="(a, i) in data.activity" :key="i">
            <td>
              <template v-if="a.kind === 'registration'">New registration: {{ a.name }}</template>
              <template v-else>{{ a.name }} submitted {{ a.detail }}</template>
            </td>
            <td><span class="tag" :class="a.marks == null && a.kind === 'submission' ? 'warn' : 'ok'">{{ tagOf(a) }}</span></td>
            <td class="muted">{{ ago(a.at) }}</td>
          </tr>
          </tbody>
        </table>
      </section>

      <div style="display:grid; gap:1.5rem; align-content:start">
        <section class="panel">
          <h2>Upcoming lessons</h2>
          <p v-if="!data.upcomingLessons.length" class="muted">No lessons scheduled. <router-link to="/admin/classes">Schedule one</router-link>.</p>
          <div v-for="l in data.upcomingLessons" :key="l.id" style="margin-bottom:.8rem">
            <router-link :to="`/admin/classes/${l.classId}/lessons`">{{ l.title }}</router-link>
            <div class="muted">{{ l.className }} · {{ when(l.startsAt) }}</div>
          </div>
        </section>

        <section class="panel">
          <h2>Topics needing attention</h2>
          <p v-if="!data.lowTopics.length" class="muted">Topic averages appear once tests are marked.</p>
          <div v-for="t in data.lowTopics" :key="t.topic" style="margin-bottom:1rem">
            <div class="head" style="margin-bottom:.3rem"><span>{{ t.topic }}</span><span class="muted">{{ t.pct }}% average</span></div>
            <div class="track"><div class="fill" :class="{ low: t.pct < 60 }" :style="{ width: t.pct + '%' }"></div></div>
          </div>
        </section>
      </div>
    </div>
  </template>
  </async-view>
</template>

<style scoped>
.err { color: var(--danger); }
</style>
