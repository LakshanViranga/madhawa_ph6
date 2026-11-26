<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'
import AppLoader from '@/pages/AppLoader.vue'

const api = useAdmin()

// must match the service limits
const LIMITS = {title: 200, body: 5000, maxClasses: 20}

const classes = ref([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  const r = await api.classes()
  if (!r.ok) {
    loadError.value = r.error
    return
  }
  classes.value = r.data.filter(c => c.status !== 'archived')
  loading.value = false
}
onMounted(load)

// ---- create form ----
const title = ref('')
const body = ref('')
const classIds = ref([])
const pinned = ref(false)
const schedule = ref(false)
const publishAt = ref('')
const hasExpiry = ref(false)
const expiresAt = ref('')
const search = ref('')

const busy = ref(false)
const errors = ref([])
const success = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return classes.value
  return classes.value.filter(c =>
      [c.title, c.subject, c.batch].filter(Boolean).join(' ').toLowerCase().includes(q))
})

const selected = computed(() => new Set(classIds.value))
const atLimit = computed(() => classIds.value.length >= LIMITS.maxClasses)
const selectedClasses = computed(() => classes.value.filter(c => selected.value.has(c.id)))

function toggle(id) {
  if (selected.value.has(id)) {
    classIds.value = classIds.value.filter(x => x !== id)
  } else if (!atLimit.value) {
    classIds.value = [...classIds.value, id]
  }
}

function selectShown() {
  const next = new Set(classIds.value)
  for (const c of filtered.value) {
    if (next.size >= LIMITS.maxClasses) break
    next.add(c.id)
  }
  classIds.value = [...next]
}

const clearSelection = () => (classIds.value = [])

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// ---- validation (same rules as the server) ----
function validate() {
  const e = []
  if (!title.value.trim()) e.push('Title is required.')
  if (!body.value.trim()) e.push('Message is required.')
  if (!classIds.value.length) e.push('Select at least one class.')

  const pub = schedule.value && publishAt.value ? new Date(publishAt.value) : null
  const exp = hasExpiry.value && expiresAt.value ? new Date(expiresAt.value) : null
  if (schedule.value && !pub) e.push('Choose a publish date and time.')
  if (hasExpiry.value && !exp) e.push('Choose an expiry date and time.')
  if (pub && pub <= new Date()) e.push('Publish time must be in the future.')
  if (exp && exp <= (pub ?? new Date())) e.push('Expiry must be after the publish time.')
  return {e, pub, exp}
}

async function submit() {
  success.value = ''
  const {e, pub, exp} = validate()
  errors.value = e
  if (e.length) {
    window.scrollTo({top: 0, behavior: 'smooth'})
    return
  }

  busy.value = true
  const r = await api.createAnnouncement({
    title: title.value.trim(),
    body: body.value.trim(),
    classIds: classIds.value,
    pinned: pinned.value,
    publishAt: pub ? pub.toISOString() : null,
    expiresAt: exp ? exp.toISOString() : null,
  })
  busy.value = false

  if (!r.ok) {
    errors.value = Array.isArray(r.errors) && r.errors.length ? r.errors : [r.error]
    window.scrollTo({top: 0, behavior: 'smooth'})
    return
  }
  const n = r.data?.recipients
  success.value = n != null
      ? `Announcement ${schedule.value ? 'scheduled' : 'sent'} to ${n} ${n === 1 ? 'student' : 'students'}.`
      : `Announcement ${schedule.value ? 'scheduled' : 'sent'}.`
  reset()
  window.scrollTo({top: 0, behavior: 'smooth'})
}

function reset() {
  title.value = ''
  body.value = ''
  classIds.value = []
  pinned.value = false
  schedule.value = false
  publishAt.value = ''
  hasExpiry.value = false
  expiresAt.value = ''
  search.value = ''
  errors.value = []
}

// ---- posted announcements (list, edit, delete) ----
const tab = ref('new')
const items = ref([])
const itemsLoading = ref(false)
const itemsError = ref('')
const notice = ref('')
const filter = ref('all')
const listSearch = ref('')

const editingId = ref(null)
const deletingId = ref(null)
const draft = ref({})
const editErrors = ref([])
const saving = ref(false)

async function loadItems() {
  itemsLoading.value = true
  itemsError.value = ''
  const r = await api.listAnnouncements()
  itemsLoading.value = false
  if (!r.ok) {
    itemsError.value = r.error
    return
  }
  items.value = r.data ?? []
}

// reload every time the tab is opened, so new posts always show
watch(tab, (t) => {
  notice.value = ''
  editingId.value = null
  deletingId.value = null
  if (t === 'posted') loadItems()
})

function statusOf(a) {
  const now = Date.now()
  if (new Date(a.createdAt).getTime() > now) return 'scheduled'
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) return 'expired'
  return 'live'
}

const counts = computed(() => {
  const c = {all: items.value.length, live: 0, scheduled: 0, expired: 0}
  for (const a of items.value) c[statusOf(a)]++
  return c
})

const shownItems = computed(() => {
  const s = listSearch.value.trim().toLowerCase()
  return items.value.filter(a =>
      (filter.value === 'all' || statusOf(a) === filter.value) &&
      (!s || `${a.title} ${(a.classes ?? []).map(c => c.title).join(' ')}`.toLowerCase().includes(s)))
})

const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
})

function toLocalInput(iso) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function startEdit(a) {
  deletingId.value = null
  editErrors.value = []
  editingId.value = a.id
  draft.value = {
    title: a.title,
    body: a.body,
    pinned: !!a.pinned,
    hasExpiry: !!a.expiresAt,
    expiresAt: a.expiresAt ? toLocalInput(a.expiresAt) : '',
  }
}

const cancelEdit = () => (editingId.value = null)

async function saveEdit(a) {
  const d = draft.value
  const e = []
  const t = d.title.trim()
  const text = d.body.trim()
  if (!t) e.push('Title is required.')
  if (!text) e.push('Message is required.')
  if (d.hasExpiry && !d.expiresAt) e.push('Choose an expiry date and time.')

  // send only what changed
  const payload = {}
  if (t !== a.title) payload.title = t
  if (text !== a.body) payload.body = text
  if (d.pinned !== !!a.pinned) payload.pinned = d.pinned

  const oldExp = a.expiresAt ? toLocalInput(a.expiresAt) : ''
  const newExp = d.hasExpiry ? d.expiresAt : ''
  if (newExp !== oldExp) {
    if (!newExp) {
      payload.expiresAt = null
    } else if (new Date(newExp) <= new Date()) {
      e.push('Expiry must be a future date.')
    } else {
      payload.expiresAt = new Date(newExp).toISOString()
    }
  }

  editErrors.value = e
  if (e.length) return
  if (!Object.keys(payload).length) {
    editingId.value = null
    return
  }

  saving.value = true
  const r = await api.updateAnnouncement(a.id, payload)
  saving.value = false
  if (!r.ok) {
    editErrors.value = Array.isArray(r.errors) && r.errors.length ? r.errors : [r.error]
    return
  }
  items.value = items.value.map(x => (x.id === a.id ? {...x, ...payload} : x))
  editingId.value = null
  notice.value = 'Announcement updated.'
}

async function remove(a) {
  itemsError.value = ''
  saving.value = true
  const r = await api.deleteAnnouncement(a.id)
  saving.value = false
  deletingId.value = null
  if (!r.ok) {
    itemsError.value = r.error
    return
  }
  items.value = items.value.filter(x => x.id !== a.id)
  notice.value = 'Announcement deleted. Students no longer see it.'
}
</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>Announcements</h1>

      <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>
      <AppLoader v-else-if="loading" variant="cards"/>

      <template v-else>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" :class="{ on: tab === 'new' }"
                  :aria-selected="tab === 'new'" @click="tab = 'new'">New announcement</button>
          <button type="button" role="tab" class="tab" :class="{ on: tab === 'posted' }"
                  :aria-selected="tab === 'posted'" @click="tab = 'posted'">
            Posted<span v-if="items.length" class="tab-count">{{ items.length }}</span>
          </button>
        </div>

        <!-- ================= NEW ================= -->
        <form v-show="tab === 'new'" novalidate @submit.prevent="submit">
          <p v-if="success" class="ok banner" role="status">{{ success }}</p>
          <div v-if="errors.length" class="err banner" role="alert">
            <ul>
              <li v-for="m in errors" :key="m">{{ m }}</li>
            </ul>
          </div>

          <div class="grid">
            <!-- Message -->
            <section class="panel area-msg" aria-labelledby="h-msg">
              <h2 id="h-msg">Message</h2>

              <div class="field">
                <label for="a-title">Title</label>
                <input id="a-title" v-model="title" :maxlength="LIMITS.title" :disabled="busy"
                       placeholder="e.g. Physics class moved to 6:30 PM"/>
                <span class="hint">{{ title.length }} / {{ LIMITS.title }}</span>
              </div>

              <div class="field grow">
                <label for="a-body">Details</label>
                <textarea id="a-body" v-model="body" :maxlength="LIMITS.body" :disabled="busy"
                          placeholder="Write the details students need to know."></textarea>
                <span class="hint">{{ body.length }} / {{ LIMITS.body }}</span>
              </div>
            </section>

            <!-- Classes -->
            <section class="panel area-classes" aria-labelledby="h-cls">
              <div class="head">
                <h2 id="h-cls">Send to classes</h2>
                <span class="count" :class="{ full: atLimit }">{{ classIds.length }} / {{ LIMITS.maxClasses }}</span>
              </div>

              <div class="tools">
                <input v-model="search" type="search" class="search" placeholder="Search classes"
                       aria-label="Search classes"/>
                <button type="button" class="btn-link" :disabled="atLimit" @click="selectShown">Select shown</button>
                <button type="button" class="btn-link" :disabled="!classIds.length" @click="clearSelection">Clear</button>
              </div>

              <ul v-if="selectedClasses.length" class="chips" aria-label="Selected classes">
                <li v-for="c in selectedClasses" :key="c.id">
                  <button type="button" class="chip" :aria-label="`Remove ${c.title}`" @click="toggle(c.id)">
                    {{ c.title }} <span aria-hidden="true">×</span>
                  </button>
                </li>
              </ul>

              <p v-if="!classes.length" class="muted">No active classes found.</p>
              <p v-else-if="!filtered.length" class="muted">No class matches your search.</p>
              <ul v-else class="picker">
                <li v-for="c in filtered" :key="c.id">
                  <label class="opt" :class="{ on: selected.has(c.id), off: !selected.has(c.id) && atLimit }">
                    <input type="checkbox" :checked="selected.has(c.id)"
                           :disabled="busy || (!selected.has(c.id) && atLimit)" @change="toggle(c.id)"/>
                    <span class="what">
                      <span class="title">{{ c.title }}</span>
                      <span class="muted">{{ c.subject }}<template v-if="c.batch"> · {{ c.batch }}</template></span>
                    </span>
                  </label>
                </li>
              </ul>
              <p v-if="atLimit" class="hint">Maximum of {{ LIMITS.maxClasses }} classes reached.</p>
            </section>

            <!-- Options -->
            <section class="panel area-opts" aria-labelledby="h-opt">
              <h2 id="h-opt">Options</h2>
              <div class="cards">
                <div class="card" :class="{ on: pinned }">
                  <label class="check">
                    <input type="checkbox" v-model="pinned" :disabled="busy"/>
                    <span>Pin to top</span>
                  </label>
                  <span class="muted">Shows before newer announcements.</span>
                </div>

                <div class="card" :class="{ on: schedule }">
                  <label class="check">
                    <input type="checkbox" v-model="schedule" :disabled="busy"/>
                    <span>Schedule</span>
                  </label>
                  <span class="muted">Publish at a later time.</span>
                  <input v-if="schedule" v-model="publishAt" type="datetime-local" :min="localNow()"
                         aria-label="Publish at" :disabled="busy"/>
                </div>

                <div class="card" :class="{ on: hasExpiry }">
                  <label class="check">
                    <input type="checkbox" v-model="hasExpiry" :disabled="busy"/>
                    <span>Auto-hide</span>
                  </label>
                  <span class="muted">Remove after a date.</span>
                  <input v-if="hasExpiry" v-model="expiresAt" type="datetime-local" :min="publishAt || localNow()"
                         aria-label="Expires at" :disabled="busy"/>
                </div>
              </div>
            </section>

            <!-- Preview -->
            <section class="panel ann area-preview" aria-labelledby="h-prev">
              <h2 id="h-prev">Student preview</h2>
              <article class="slide">
                <div class="note-top">
                  <span class="badge">New</span>
                  <span class="muted">
                    {{ schedule ? 'Scheduled' : 'Just now' }}<template v-if="selectedClasses.length"> · {{
                      selectedClasses.map(c => c.title).join(', ')
                    }}</template>
                  </span>
                </div>
                <h3 class="ann-title">{{ title || 'Your title appears here' }}</h3>
                <p class="body">{{ body || 'Your message appears here.' }}</p>
              </article>
            </section>
          </div>

          <!-- Sticky action bar -->
          <div class="bar">
            <span class="muted">
              {{ classIds.length
                ? `${classIds.length} ${classIds.length === 1 ? 'class' : 'classes'} selected`
                : 'No class selected' }}
            </span>
            <div class="actions">
              <button type="button" class="btn ghost" :disabled="busy" @click="reset">Clear form</button>
              <button type="submit" class="btn" :disabled="busy">
                {{ busy ? 'Saving...' : schedule ? 'Schedule announcement' : 'Send announcement' }}
              </button>
            </div>
          </div>
        </form>

        <!-- ================= POSTED ================= -->
        <section v-if="tab === 'posted'" class="panel" aria-labelledby="h-posted">
          <div class="head">
            <h2 id="h-posted">Posted announcements</h2>
            <button type="button" class="btn ghost small" @click="tab = 'new'">+ New</button>
          </div>

          <p v-if="notice" class="ok banner" role="status">{{ notice }}</p>
          <p v-if="itemsError" class="err banner" role="alert">{{ itemsError }}</p>

          <div class="tools">
            <input v-model="listSearch" type="search" class="search" placeholder="Search by title or class"
                   aria-label="Search announcements"/>
            <div class="filters" role="group" aria-label="Filter by status">
              <button v-for="f in ['all', 'live', 'scheduled', 'expired']" :key="f" type="button"
                      class="filter" :class="{ on: filter === f }" @click="filter = f">
                {{ f }} ({{ counts[f] }})
              </button>
            </div>
          </div>

          <AppLoader v-if="itemsLoading" variant="cards"/>
          <p v-else-if="!items.length" class="muted">No announcements yet. Create your first one.</p>
          <p v-else-if="!shownItems.length" class="muted">Nothing matches this filter.</p>

          <ul v-else class="posts">
            <li v-for="a in shownItems" :key="a.id" class="post" :class="statusOf(a)">
              <!-- view mode -->
              <template v-if="editingId !== a.id">
                <div class="post-top">
                  <span class="pill" :class="statusOf(a)">{{ statusOf(a) }}</span>
                  <span v-if="a.pinned" class="badge">Pinned</span>
                  <span class="muted">{{ fmt(a.createdAt) }}</span>
                </div>
                <h3 class="ann-title">{{ a.title }}</h3>
                <p class="body">{{ a.body }}</p>
                <p class="muted">
                  {{ (a.classes ?? []).map(c => c.title).join(', ') || 'No classes' }}
                  · {{ a.recipients }} {{ a.recipients === 1 ? 'student' : 'students' }}
                  <template v-if="a.expiresAt"> · hides {{ fmt(a.expiresAt) }}</template>
                </p>

                <div class="post-actions">
                  <template v-if="deletingId === a.id">
                    <span class="muted">Delete this announcement?</span>
                    <button type="button" class="btn danger small" :disabled="saving" @click="remove(a)">
                      {{ saving ? 'Deleting...' : 'Yes, delete' }}
                    </button>
                    <button type="button" class="btn ghost small" :disabled="saving" @click="deletingId = null">Cancel</button>
                  </template>
                  <template v-else>
                    <button type="button" class="btn ghost small" @click="startEdit(a)">Edit</button>
                    <button type="button" class="btn ghost small" @click="deletingId = a.id">Delete</button>
                  </template>
                </div>
              </template>

              <!-- edit mode -->
              <form v-else class="edit" novalidate @submit.prevent="saveEdit(a)">
                <div v-if="editErrors.length" class="err" role="alert">
                  <ul><li v-for="m in editErrors" :key="m">{{ m }}</li></ul>
                </div>

                <div class="field">
                  <label :for="`e-title-${a.id}`">Title</label>
                  <input :id="`e-title-${a.id}`" v-model="draft.title" :maxlength="LIMITS.title" :disabled="saving"/>
                </div>
                <div class="field">
                  <label :for="`e-body-${a.id}`">Details</label>
                  <textarea :id="`e-body-${a.id}`" v-model="draft.body" rows="5" :maxlength="LIMITS.body"
                            :disabled="saving"></textarea>
                </div>

                <div class="edit-opts">
                  <label class="check">
                    <input type="checkbox" v-model="draft.pinned" :disabled="saving"/>
                    <span>Pin to top</span>
                  </label>
                  <label class="check">
                    <input type="checkbox" v-model="draft.hasExpiry" :disabled="saving"/>
                    <span>Auto-hide</span>
                  </label>
                  <input v-if="draft.hasExpiry" v-model="draft.expiresAt" type="datetime-local" :min="localNow()"
                         aria-label="Expires at" :disabled="saving"/>
                </div>

                <p class="muted">Classes and publish time cannot be changed after sending. Delete and post again to change them.</p>

                <div class="post-actions">
                  <button type="button" class="btn ghost small" :disabled="saving" @click="cancelEdit">Cancel</button>
                  <button type="submit" class="btn small" :disabled="saving">{{ saving ? 'Saving...' : 'Save changes' }}</button>
                </div>
              </form>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: 2rem 1.25rem 2rem;
  display: grid;
  gap: 1rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0 0 .5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0 0 .9rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

/* tabs */
.tabs {
  display: flex;
  gap: .4rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1rem;
}

.tab {
  padding: .6rem 1.1rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font: 600 .95rem var(--font-body);
  cursor: pointer;
}

.tab:hover {
  color: var(--gold-soft);
}

.tab.on {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

.tab-count {
  margin-left: .5rem;
  padding: .02rem .5rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .75rem;
}

/* layout: two columns, four areas */
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  grid-template-areas:
    "msg classes"
    "opts preview";
  gap: 1rem;
}

.area-msg { grid-area: msg; }
.area-classes { grid-area: classes; }
.area-opts { grid-area: opts; }
.area-preview { grid-area: preview; }

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  min-width: 0;
}

.area-msg, .area-classes {
  display: flex;
  flex-direction: column;
}

.area-msg {
  gap: 1rem;
}

.area-preview {
  border-color: var(--gold);
  background: var(--gold-glow);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .9rem;
}

.head h2 {
  margin: 0;
}

.count {
  padding: .05rem .65rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .8rem;
  color: var(--gold);
}

.count.full {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--on-gold);
}

/* fields */
.field {
  display: grid;
  gap: .4rem;
  min-width: 0;
}

.field.grow {
  flex: 1;
  grid-template-rows: auto 1fr auto;
}

label {
  font-weight: 600;
  font-size: .95rem;
}

.hint {
  color: var(--muted);
  font-size: .8rem;
  text-align: right;
}

input:not([type='checkbox']), textarea {
  width: 100%;
  box-sizing: border-box;
  padding: .7rem .9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: 400 1rem var(--font-body);
}

textarea {
  resize: vertical;
  min-height: 200px;
  height: 100%;
  line-height: 1.5;
}

/* class picker */
.tools {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: .7rem;
}

.search {
  flex: 1;
  min-width: 160px;
}

.chips {
  list-style: none;
  margin: 0 0 .7rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}

.chip {
  padding: .15rem .65rem;
  border: 1px solid var(--gold);
  border-radius: 99px;
  background: var(--gold-glow);
  color: var(--gold-soft);
  font: 500 .8rem var(--font-body);
  cursor: pointer;
}

.chip:hover {
  background: var(--gold);
  color: var(--on-gold);
}

.picker {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1 1 0;
  min-height: 260px;
  max-height: 480px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: .5rem;
  align-content: start;
}

.opt {
  display: flex;
  align-items: center;
  gap: .7rem;
  height: 100%;
  box-sizing: border-box;
  padding: .65rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 400;
}

.opt:hover,
.opt.on {
  background: var(--gold-glow);
}

.opt.on {
  border-color: var(--gold);
}

.opt.off {
  opacity: .45;
  cursor: not-allowed;
}

.opt input,
.check input {
  accent-color: var(--gold);
}

.what {
  display: flex;
  flex-direction: column;
  gap: .1rem;
  min-width: 0;
}

.title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* option cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: .7rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  padding: .9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.card.on {
  border-color: var(--gold);
  background: var(--gold-glow);
}

.card input[type='datetime-local'] {
  margin-top: .3rem;
  padding: .5rem .6rem;
  font-size: .85rem;
}

.check {
  display: flex;
  align-items: center;
  gap: .6rem;
  cursor: pointer;
}

/* preview (same look as the dashboard carousel slide) */
.slide {
  display: flex;
  flex-direction: column;
  gap: .4rem;
}

.note-top {
  display: flex;
  align-items: center;
  gap: .6rem;
  flex-wrap: wrap;
}

.badge {
  padding: .05rem .55rem;
  border-radius: 99px;
  background: var(--gold);
  color: var(--on-gold);
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.ann-title {
  font: 600 1.25rem var(--font-display);
  color: var(--gold-soft);
  margin: 0;
  overflow-wrap: anywhere;
}

.body {
  margin: 0;
  line-height: 1.55;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

/* sticky action bar */
.bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding: .9rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.actions {
  display: flex;
  gap: .6rem;
  flex-wrap: wrap;
}

/* filters */
.filters {
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
}

.filter {
  padding: .25rem .8rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: transparent;
  color: var(--muted);
  font: 500 .8rem var(--font-body);
  text-transform: capitalize;
  cursor: pointer;
}

.filter.on {
  border-color: var(--gold);
  background: var(--gold-glow);
  color: var(--gold-soft);
}

/* posted list */
.posts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1rem;
}

.post {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  min-width: 0;
  padding: 1.1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.post.expired {
  opacity: .7;
}

.post-top {
  display: flex;
  align-items: center;
  gap: .6rem;
  flex-wrap: wrap;
}

.pill {
  padding: .05rem .6rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--muted);
}

.pill.live {
  border-color: var(--gold);
  color: var(--gold);
}

.pill.scheduled {
  color: var(--gold-soft);
}

.post .body {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: .6rem;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: .4rem;
}

.edit {
  display: grid;
  gap: .8rem;
}

.edit-opts {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
}

.edit-opts input[type='datetime-local'] {
  width: auto;
  padding: .45rem .6rem;
  font-size: .85rem;
}

/* buttons and messages */
.btn {
  display: inline-block;
  padding: .6rem 1.1rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .9rem var(--font-body);
  white-space: nowrap;
  cursor: pointer;
}

.btn:hover {
  background: var(--gold-soft);
}

.btn.ghost {
  background: transparent;
  color: var(--gold);
}

.btn.ghost:hover {
  background: var(--gold-glow);
}

.btn.small {
  padding: .4rem .9rem;
  font-size: .85rem;
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

.btn-link {
  background: none;
  border: 0;
  padding: 0;
  color: var(--muted);
  font: 500 .85rem var(--font-body);
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover:not(:disabled) {
  color: var(--gold-soft);
}

.btn-link:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.banner {
  margin: 0 0 1rem;
  padding: .8rem 1rem;
  border: 1px solid currentColor;
  border-radius: 6px;
}

.err {
  color: var(--danger);
  font-size: .9rem;
}

.err ul {
  margin: 0;
  padding-left: 1.1rem;
}

.ok {
  color: var(--gold);
  font-size: .95rem;
  font-weight: 600;
}

button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "msg"
      "classes"
      "opts"
      "preview";
  }

  .picker {
    max-height: 340px;
  }

  .posts {
    grid-template-columns: 1fr;
  }
}
</style>
