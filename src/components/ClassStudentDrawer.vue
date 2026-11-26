<script setup>
import {ref, computed, watch, onMounted, onBeforeUnmount, nextTick} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'
import {useConfirm} from '@/composables/useConfirm.js'

const props = defineProps({cls: {type: Object, required: true}})
const emit = defineEmits(['close', 'changed'])

const api = useAdmin()
const confirm = useConfirm()

const LIMIT = 25
const students = ref([])
const total = ref(0)
const page = ref(1)
const q = ref('')
const loading = ref(true)
const error = ref('')
const message = ref('')
const selected = ref(new Set())       // student ids, kept across pages until search changes
const searchEl = ref(null)

const pages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))
const from = computed(() => (total.value ? (page.value - 1) * LIMIT + 1 : 0))
const to = computed(() => Math.min(page.value * LIMIT, total.value))
const allOnPage = computed(() => students.value.length > 0 && students.value.every((s) => selected.value.has(s.id)))
const someOnPage = computed(() => students.value.some((s) => selected.value.has(s.id)))

// ignore slow responses that arrive after a newer request
let seq = 0

async function load() {
  const mine = ++seq
  loading.value = true
  error.value = ''
  const r = await api.classStudents(props.cls.id, {q: q.value.trim(), page: page.value, limit: LIMIT})
  if (mine !== seq) return
  loading.value = false
  if (!r.ok) {
    error.value = r.error || 'Could not load students.'
    return
  }
  students.value = r.data.students
  total.value = r.data.total
  emit('changed', r.data.total)
  // removed the last student on a later page: step back
  if (!students.value.length && page.value > 1) {
    page.value -= 1
    load()
  }
}

// search: debounce, go back to page 1, clear selection (hidden rows must not stay selected)
let timer
watch(q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    selected.value = new Set()
    load()
  }, 300)
})

function go(p) {
  if (p < 1 || p > pages.value || p === page.value) return
  page.value = p
  load()
}

function toggle(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}

function toggleAll() {
  const next = new Set(selected.value)
  if (allOnPage.value) students.value.forEach((s) => next.delete(s.id))
  else students.value.forEach((s) => next.add(s.id))
  selected.value = next
}

async function remove(ids, label) {
  error.value = ''
  message.value = ''
  const n = ids.length
  await confirm({
    title: n === 1 ? 'Remove student?' : `Remove ${n} students?`,
    message: n === 1
        ? `${label} will lose access to ${props.cls.title}. They can rejoin with the class code if joining is on.`
        : `These ${n} students will lose access to ${props.cls.title}. They can rejoin with the class code if joining is on.`,
    confirmText: n === 1 ? 'Remove' : `Remove ${n}`,
    danger: true,
    action: async () => {
      const r = await api.removeStudents(props.cls.id, ids)
      if (!r.ok) {
        error.value = r.error || 'Could not remove. Please try again.'
        return
      }
      const next = new Set(selected.value)
      ids.forEach((id) => next.delete(id))
      selected.value = next
      message.value = n === 1 ? `Removed ${label}.` : `Removed ${n} students.`
      await load()
    },
  })
}

const removeOne = (s) => remove([s.id], s.name)
const removeSelected = () => remove([...selected.value])

const joined = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric'
}) : '')

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(async () => {
  document.addEventListener('keydown', onKey)
  load()
  await nextTick()
  searchEl.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @mousedown.self="emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="sd-title">
        <header class="top">
          <div>
            <h2 id="sd-title">{{ cls.title }}</h2>
            <p class="muted">{{ total }} {{ total === 1 ? 'student' : 'students' }} enrolled</p>
          </div>
          <button type="button" class="x" aria-label="Close" @click="emit('close')">&times;</button>
        </header>

        <div class="tools">
          <input ref="searchEl" v-model="q" type="search" placeholder="Search by name or email"
                 aria-label="Search students" autocomplete="off"/>
          <div class="bar">
            <label class="all">
              <input type="checkbox" :checked="allOnPage" :indeterminate.prop="!allOnPage && someOnPage"
                     :disabled="!students.length" @change="toggleAll"/>
              Select this page
            </label>
            <button v-if="selected.size" type="button" class="btn danger" @click="removeSelected">
              Remove selected ({{ selected.size }})
            </button>
          </div>
        </div>

        <p v-if="message" class="ok" role="status">{{ message }}</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>

        <div class="list" :aria-busy="loading">
          <p v-if="loading && !students.length" class="muted pad">Loading...</p>
          <p v-else-if="!students.length" class="muted pad">
            {{ q.trim() ? `No students match "${q.trim()}".` : 'No students in this class yet.' }}
          </p>
          <ul v-else :class="{ dim: loading }">
            <li v-for="s in students" :key="s.id" :class="{ on: selected.has(s.id) }">
              <input type="checkbox" :checked="selected.has(s.id)" :aria-label="`Select ${s.name}`"
                     @change="toggle(s.id)"/>
              <div class="who">
                <strong>{{ s.name }}</strong>
                <span class="muted">{{ s.email }}<template v-if="s.joinedAt"> · joined {{ joined(s.joinedAt) }}</template></span>
              </div>
              <button type="button" class="btn ghost sm" @click="removeOne(s)">Remove</button>
            </li>
          </ul>
        </div>

        <footer v-if="total > LIMIT" class="pager">
          <span class="muted">{{ from }}-{{ to }} of {{ total }}</span>
          <div>
            <button type="button" class="btn ghost sm" :disabled="page <= 1 || loading" @click="go(page - 1)">
              Previous
            </button>
            <span class="muted pg">Page {{ page }} / {{ pages }}</span>
            <button type="button" class="btn ghost sm" :disabled="page >= pages || loading" @click="go(page + 1)">
              Next
            </button>
          </div>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 900; /* below the confirm modal (1000) */
  background: rgb(0 0 0 / .5);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: min(520px, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border-left: 1px solid var(--line);
  font-family: var(--font-body);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.2rem 1.2rem .6rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0;
}

.muted {
  color: var(--muted);
  font-size: .85rem;
  margin: .15rem 0 0;
}

.x {
  background: none;
  border: 0;
  color: var(--muted);
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
}

.tools {
  padding: 0 1.2rem .6rem;
  border-bottom: 1px solid var(--line);
}

.tools input[type='search'] {
  width: 100%;
  box-sizing: border-box;
  padding: .65rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 2.6rem;
  margin-top: .4rem;
}

.all {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .85rem;
  color: var(--muted);
  cursor: pointer;
}

.list {
  flex: 1;
  overflow-y: auto;
}

.list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list ul.dim {
  opacity: .5;
}

li {
  display: flex;
  align-items: center;
  gap: .8rem;
  padding: .7rem 1.2rem;
  border-bottom: 1px solid var(--line);
}

li.on {
  background: var(--gold-glow);
}

.who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.who strong {
  font-weight: 600;
}

.who .muted {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pad {
  padding: 1.2rem;
}

.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .8rem 1.2rem;
  border-top: 1px solid var(--line);
}

.pager .muted {
  margin: 0;
}

.pg {
  margin: 0 .6rem;
}

.ok, .err {
  margin: .6rem 1.2rem 0;
  font-size: .9rem;
}

.ok {
  color: var(--gold);
}

.err {
  color: var(--danger);
}

.btn {
  padding: .5rem .9rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .85rem var(--font-body);
  cursor: pointer;
}

.btn.sm {
  padding: .35rem .7rem;
  font-size: .8rem;
}

.btn.ghost {
  background: transparent;
  color: var(--gold);
}

.btn.danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

button:focus-visible, input:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 2px;
}
</style>
