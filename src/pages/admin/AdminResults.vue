<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useAdmin} from '@/composables/useAdmin.js'

const api = useAdmin()
const search = ref('')
const selectedClassId = ref(null)
const testType = ref('mcq')
const selectedTestId = ref(null)
const classes = ref([])
const quizzes = ref([])

const results = ref(null)
const summeryLoading = ref(true)
const error = ref(null)

onMounted(async () => {
  const rawClasses = await api.classes();
  rawClasses.data.filter((item) => item.status === 'active').forEach((cls) => {
    classes.value.push({
      id: cls.id,
      name: cls.title,
      subject: cls.subject,
      students: cls.studentCount,
      color: 'gold'
    })
  })

  const d = await api.quizzes()
  if (d.ok) {
    quizzes.value = d.data
  }
})

const filteredClasses = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return classes.value
  return classes.value.filter(
      item =>
          item.name.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q),
  )
})

const selectedClass = computed(() =>
    classes.value.find(item => item.id === selectedClassId.value),
)

const availableTests = computed(() => {
  return quizzes.value.length > 0 ? quizzes.value.filter((item) => item.classId === selectedClassId.value && item.type === testType.value) : []
})

const selectedTest = computed(() =>
    availableTests.value.find(item => item.id === selectedTestId.value),
)

watch(testType, () => {
  selectedTestId.value = null
})

function selectClass(id) {
  selectedClassId.value = id
  selectedTestId.value = null
}

function clearClass() {
  selectedClassId.value = null
  selectedTestId.value = null
  testType.value = 'mcq'
}

watch(selectedTestId, async () => {
  if (selectedTestId.value !== null) {
    const d = await api.getQuizResults(selectedTestId.value)
    if (d.ok) {
      results.value = d.data
      summeryLoading.value = false
    } else {
      error.value = d.error
    }
  }
})

function exportCsv() {
  if (!selectedClass.value || !selectedTest.value) return

  const rows = results.value.rows
  const header = ['#', 'Student', 'Marks']
  const lines = [
    header.join(','),
    ...rows.map((row, index) =>
        [index + 1, `"${row.n}"`, `${row.m}/${row.total || 10}`].join(','),
    ),
  ]

  const blob = new Blob([lines.join('\n')], {type: 'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedClass.value.name}-${selectedTest.value.name}-results.csv`
      .replace(/[^a-z0-9.-]+/gi, '-')
      .toLowerCase()
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="results-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1>Results</h1>
      </div>

      <button
          v-if="selectedClassId && selectedTestId"
          class="btn ghost"
          @click="exportCsv"
      >
        <span>↓</span>
        Export CSV
      </button>
    </header>

    <!-- =========================
         INITIAL / CLASS SELECTION
         ========================= -->
    <template v-if="!selectedClassId">
      <section class="selection-shell">
        <div class="selection-top">
          <div>
            <h2>Select a class</h2>
            <p>
              Choose a class to view its tests and student performance.
            </p>
          </div>

          <div class="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5"/>
              <path d="m16 16 5 5"/>
            </svg>
            <input
                v-model="search"
                type="search"
                placeholder="Search classes..."
            />
          </div>
        </div>

        <div v-if="filteredClasses.length" class="class-grid">
          <button
              v-for="item in filteredClasses"
              :key="item.id"
              class="class-card"
              @click="selectClass(item.id)"
          >
            <div class="class-card-main">
              <div :class="['class-icon', item.color]">
                {{ item.name.charAt(0) }}
              </div>

              <div class="class-info">
                <h3>{{ item.name }}</h3>
                <p>{{ item.subject }}</p>
              </div>
            </div>

            <div class="class-card-footer">
              <span>{{ item.students }} students</span>
              <span class="view-link">View results <b>→</b></span>
            </div>
          </button>
        </div>

        <div v-else class="no-search-results">
          <div class="empty-icon">⌕</div>
          <h3>No classes found</h3>
          <p>Try a different class name or subject.</p>
        </div>

        <div class="selection-empty">
          <div class="empty-illustration">
            <div class="chart-icon">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div>
            <h3>No result selected</h3>
            <p>
              Select a class above to load its assessment results.
              Results will appear after you choose a test.
            </p>
          </div>
        </div>
      </section>
    </template>

    <!-- =========================
         RESULTS DASHBOARD
         ========================= -->
    <template v-else>
      <div class="context-bar">
        <button class="back-button" @click="clearClass">
          <span>←</span>
          All classes
        </button>

        <div class="breadcrumb">
          <strong>{{ selectedClass.name }}</strong>
          <span>·</span>
          <span>{{ selectedClass.subject }}</span>
        </div>
      </div>

      <!-- Filters -->
      <section class="filter-panel">
        <div class="filter">
          <label>Class</label>
          <select v-model="selectedClassId">
            <option
                v-for="item in classes"
                :key="item.id"
                :value="item.id"
            >
              {{ item.name }} · {{ item.subject }}
            </option>
          </select>
        </div>

        <div class="filter">
          <label>Test type</label>
          <select v-model="testType">
            <option value="mcq">MCQ</option>
            <option value="structured">Structured</option>
          </select>
        </div>

        <div class="filter test-filter">
          <label>{{ testType === 'mcq' ? 'Quiz' : 'Structured test' }}</label>
          <select v-model="selectedTestId">
            <option :value="null" disabled>Select a test</option>
            <option
                v-for="test in availableTests"
                :key="test.id"
                :value="test.id"
            >
              {{ test.title }}
            </option>
          </select>
        </div>
      </section>

      <!-- No test selected -->
      <section v-if="!selectedTestId" class="test-empty panel">
        <div class="test-empty-icon">▥</div>
        <h2>Select a {{ testType === 'mcq' ? 'quiz' : 'structured test' }}</h2>
        <p>
          Choose a test from the selector above to load its performance
          dashboard.
        </p>

        <div class="recent-tests">
          <div class="recent-heading">
            <span>Available {{ testType === 'mcq' ? 'quizzes' : 'tests' }}</span>
            <span>{{ availableTests.values.length }}</span>
          </div>

          <button
              v-for="test in availableTests"
              :key="test.id"
              class="recent-test"
              @click="selectedTestId = test.id"
          >
            <div>
              <strong>{{ test.name }}</strong>
              <small>{{ test.date }} · {{ test.questions }} questions</small>
            </div>
            <span>→</span>
          </button>
        </div>
      </section>

      <!-- Dashboard -->
      <template v-else>
        <section class="selected-test">
          <div>
            <div class="selected-test-type">
              {{ testType === 'mcq' ? 'MCQ QUIZ' : 'STRUCTURED TEST' }}
            </div>
            <h2>{{ selectedTest.name }}</h2>
            <p>
              {{ selectedTest.date }}
              <span>·</span>
              {{ selectedTest.questionCount }} questions
              <span>·</span>
              {{ selectedClass.students }} students
              <span>.</span>
              {{ selectedTest.status }}
            </p>
          </div>

          <button class="btn ghost" @click="selectedTestId = null">
            Change test
          </button>
        </section>

        <p v-if="summeryLoading" class="muted">Loading...</p>
        <p v-else-if="error" class="muted">{{error.value}}</p>
        <div v-else>
          <!-- Summary cards -->
          <section class="cards">
            <div class="panel stat">
              <span class="stat-label">Average</span>
              <strong>{{ results.summary.average }}</strong>
              <span class="stat-note">Class average</span>
            </div>

            <div class="panel stat">
              <span class="stat-label">Highest</span>
              <strong>{{ results.summary.highest.marks }} / {{results.summary.highest.total }}</strong>
              <span class="stat-note">Top score</span>
            </div>

            <div class="panel stat">
              <span class="stat-label">Lowest</span>
              <strong>{{ results.summary.lowest.marks }} / {{ results.summary.lowest.total }}</strong>
              <span class="stat-note">Lowest score</span>
            </div>

            <div class="panel stat">
              <span class="stat-label">Pass rate</span>
              <strong>{{ results.summary.passRate }}</strong>
              <span class="stat-note">50% or above</span>
            </div>
          </section>

          <!-- Main analytics -->
          <div class="dashboard-grid">
            <!-- Student marks -->
            <section class="panel student-panel">
              <div class="panel-heading">
                <div>
                  <h2>Student marks</h2>
                  <p>Individual performance in this assessment.</p>
                </div>

                <span class="result-count">
                {{ results.rows.length }} shown
              </span>
              </div>

              <div class="table-wrap">
                <table>
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Marks</th>
                    <th class="progress-column"></th>
                  </tr>
                  </thead>

                  <tbody>
                  <tr
                      v-for="(row, index) in results.rows"
                      :key="row.n"
                  >
                    <td class="rank">{{ index + 1 }}</td>
                    <td class="student-name">{{ row.name }}</td>
                    <td class="marks">
                      {{ row.marks }}/{{ row.total || 10 }}
                    </td>
                    <td class="progress-column">
                      <div class="track">
                        <div
                            class="fill"
                            :class="{ low: (row.marks / (row.total || 10)) < 0.5 }"
                            :style="{
                            width:
                              (row.marks / (row.total || 10)) * 100 + '%'
                          }"
                        ></div>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Question difficulty -->
            <section class="panel difficulty-panel">
              <div class="panel-heading">
                <div>
                  <h2>Question performance</h2>
                  <p>
                    Share of students who answered correctly.
                  </p>
                </div>
              </div>

              <div class="question-list">
                <div
                    v-for="q in results.questions"
                    :key="q.label"
                    class="question"
                >
                  <div class="question-heading">
                    <span>{{ q.label }}</span>
                    <strong :class="{ lowText: q.correctPct < 50 }">
                      {{ q.correctPct }}%
                    </strong>
                  </div>

                  <div class="track">
                    <div
                        class="fill"
                        :class="{ low: q.correctPct < 50 }"
                        :style="{ width: q.correctPct + '%' }"
                    ></div>
                  </div>

                  <span v-if="q.correctPct < 50" class="difficulty-label">
                  Needs attention
                </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* Colours and fonts come only from the project theme variables (--bg, --surface, --line, --text, --muted,
   --gold, --gold-soft, --gold-glow, --on-gold, --danger, --font-body, --font-display), the same ones the other
   pages use. No fixed colours, and nothing here reaches outside this page. */

.results-page,
.results-page *,
.results-page *::before,
.results-page *::after {
  box-sizing: border-box;
}

.results-page {
  width: min(1440px, calc(100% - 48px));
  margin: 0 auto;
  padding: 42px 0 64px;
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h2,
h3 {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

/* Panels and buttons */

.panel {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 1.2rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--gold);
  color: var(--on-gold);
  font: 600 0.92rem var(--font-body);
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

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Initial class selection */

.selection-shell {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}

.selection-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  border-bottom: 1px solid var(--line);
}

.selection-top h2 {
  margin-bottom: 6px;
  font-size: 1.25rem;
}

.selection-top p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.search-box {
  position: relative;
  width: 280px;
}

.search-box svg {
  position: absolute;
  top: 50%;
  left: 13px;
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 1.8;
  transform: translateY(-50%);
}

.search-box input {
  width: 100%;
  height: 42px;
  padding: 0 14px 0 38px;
  border: 1px solid var(--line);
  border-radius: 6px;
  outline: none;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
}

.search-box input::placeholder {
  color: var(--muted);
}

.search-box input:focus {
  border-color: var(--gold);
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 24px 30px 26px;
}

.class-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: inherit;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.class-card:hover {
  border-color: var(--gold);
  background: var(--gold-glow);
}

.class-card-main {
  display: flex;
  align-items: center;
  gap: 13px;
}

/* The page gives every class the "gold" colour; the plain .class-icon looks the same */
.class-icon,
.class-icon.gold {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--gold-glow);
  color: var(--gold);
  font: 600 1rem var(--font-display);
}

.class-info {
  min-width: 0;
}

.class-info h3 {
  margin-bottom: 3px;
  font-size: 1rem;
}

.class-info p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.class-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 13px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
}

.view-link {
  color: var(--gold);
  font-weight: 600;
}

.view-link b {
  margin-left: 4px;
  font-size: 1rem;
}

.selection-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 17px;
  min-height: 150px;
  margin: 0 30px 30px;
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 6px;
  background: var(--bg);
  text-align: left;
}

.empty-illustration {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.chart-icon {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 25px;
}

.chart-icon span {
  width: 5px;
  border-radius: 2px 2px 0 0;
  background: var(--muted);
}

.chart-icon span:nth-child(1) {
  height: 10px;
}

.chart-icon span:nth-child(2) {
  height: 17px;
}

.chart-icon span:nth-child(3) {
  height: 13px;
}

.chart-icon span:nth-child(4) {
  height: 23px;
}

.selection-empty h3 {
  margin-bottom: 4px;
  font-size: 1rem;
}

.selection-empty p {
  max-width: 450px;
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.55;
}

.no-search-results {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--muted);
  font-size: 1.25rem;
}

.no-search-results h3 {
  margin-bottom: 4px;
  font-size: 1rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: .6rem 0 0;
}

.no-search-results p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.85rem;
}

/* Dashboard context */

.context-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--gold);
  font-size: 0.85rem;
  font-weight: 600;
}

.back-button:hover {
  color: var(--gold-soft);
  text-decoration: underline;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.85rem;
}

.breadcrumb strong {
  color: var(--text);
}

/* Filters */

.filter-panel {
  display: grid;
  grid-template-columns: 1fr 0.8fr 1.5fr;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.filter {
  min-width: 0;
}

.filter label {
  display: block;
  margin: 0 0 6px 2px;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.filter select {
  width: 100%;
  height: 42px;
  padding: 0 34px 0 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  outline: none;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
}

.filter select:focus {
  border-color: var(--gold);
}

/* Empty test state */

.test-empty {
  min-height: 480px;
  padding: 54px 28px;
  text-align: center;
}

.test-empty-icon {
  display: grid;
  width: 52px;
  height: 52px;
  margin: 0 auto 18px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--muted);
  font-size: 1.4rem;
}

.test-empty h2 {
  margin-bottom: 7px;
  font-size: 1.15rem;
}

.test-empty > p {
  margin-bottom: 28px;
  color: var(--muted);
  font-size: 0.9rem;
}

.recent-tests {
  width: min(620px, 100%);
  margin: 0 auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  text-align: left;
}

.recent-heading {
  display: flex;
  justify-content: space-between;
  padding: 11px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.recent-test {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  color: inherit;
  text-align: left;
}

.recent-test:last-child {
  border-bottom: 0;
}

.recent-test:hover {
  background: var(--gold-glow);
}

.recent-test strong,
.recent-test small {
  display: block;
}

.recent-test strong {
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.recent-test small {
  color: var(--muted);
  font-size: 0.8rem;
}

.recent-test > span {
  color: var(--gold);
}

/* Selected test */

.selected-test {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
  padding: 21px 23px;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--surface);
}

.selected-test-type {
  margin-bottom: 6px;
  color: var(--gold);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.selected-test h2 {
  margin-bottom: 5px;
  font-size: 1.15rem;
}

.selected-test p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.selected-test p span {
  margin: 0 6px;
  color: var(--muted);
  opacity: 0.6;
}

/* Stats */

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.stat {
  min-height: 125px;
  padding: 18px 19px;
}

.stat-label {
  display: block;
  margin-bottom: 9px;
  color: var(--muted);
  font-size: 0.85rem;
}

.stat strong {
  display: block;
  margin-bottom: 6px;
  color: var(--gold);
  font: 600 1.9rem/1.1 var(--font-display);
}

.stat-note {
  color: var(--muted);
  font-size: 0.8rem;
}

/* Main dashboard */

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.85fr;
  gap: 18px;
}

.student-panel,
.difficulty-panel {
  min-width: 0;
  padding: 20px;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-heading h2 {
  margin-bottom: 4px;
  font-size: 1.15rem;
}

.panel-heading p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 0.85rem;
}

.result-count {
  padding: 0.05rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  color: var(--muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th {
  padding: 9px 8px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid var(--line);
}

tbody tr:last-child td {
  border-bottom: 0;
}

.rank {
  width: 32px;
  color: var(--muted);
  font-size: 0.85rem;
}

.student-name {
  min-width: 170px;
  color: var(--text);
  font-weight: 600;
}

.marks {
  width: 64px;
  color: var(--gold);
  font-weight: 600;
  white-space: nowrap;
}

.progress-column {
  width: 34%;
}

.track {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--line);
}

.fill {
  height: 100%;
  min-width: 3px;
  border-radius: inherit;
  background: var(--gold);
  transition: width 0.3s;
}

.fill.low {
  background: var(--danger);
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.question {
  position: relative;
}

.question-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: var(--text);
  font-size: 0.9rem;
}

.question-heading strong {
  color: var(--muted);
  font-size: 0.85rem;
}

.question-heading strong.lowText {
  color: var(--danger);
}

.difficulty-label {
  display: block;
  margin-top: 5px;
  color: var(--danger);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Keyboard focus, the same ring as the other pages */

button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .fill,
  .class-card {
    transition: none;
  }
}

/* Responsive */

@media (max-width: 1000px) {
  .class-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .results-page {
    width: min(100% - 28px, 1440px);
    padding-top: 28px;
  }

  .page-header {
    flex-direction: column;
    margin-bottom: 22px;
  }

  .selection-top {
    align-items: stretch;
    flex-direction: column;
    padding: 22px;
  }

  .search-box {
    width: 100%;
  }

  .class-grid {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .selection-empty {
    align-items: flex-start;
    margin: 0 18px 18px;
    padding: 20px;
  }

  .filter-panel {
    grid-template-columns: 1fr;
  }

  .selected-test {
    align-items: flex-start;
    flex-direction: column;
  }

  .cards {
    grid-template-columns: 1fr 1fr;
  }

  .dashboard-grid {
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .cards {
    grid-template-columns: 1fr;
  }

  .selection-empty {
    flex-direction: column;
  }

  .student-panel,
  .difficulty-panel {
    padding: 16px;
  }
}
</style>
