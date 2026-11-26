<script setup>
import {ref, computed, onMounted, watch} from 'vue'
import LmsHeader from '@/components/LmsHeader.vue'
import {useStudent} from "@/composables/useStudent.js";
import AppLoader from "@/pages/AppLoader.vue";

const api = useStudent();

// Classes the student belongs to (GET /api/classes). The picker only shows when there is more than one.
const classes = ref([])
const classId = ref('')

const type = ref('mcq') // all | mcq | structured
const filters = [['mcq', 'MCQ quizzes'], ['structured', 'Written tests']]

const weeksAll = [[55, 52], [60, 55], [58, 57], [70, 60], [90, 64], [60, 58], [80, 66], [85, 68]]
const mkWeeks = (pairs) => pairs.map(([you, average], i) => ({week: 5 + i, label: `W${5 + i}`, you, average}))


const hasSelectedClass = computed(() => !!classId.value)

async function init() {
  const c = await api.classes()
  if (c.ok) {
    classes.value = c.data
  }
}

onMounted(async () => {
  await init()
})

const mcqProgress = ref()
const writeProgress = ref()
const mcqRanking = ref()
const writeRanking = ref()
const error = ref()
const loading = ref(true)

watch(classId, async () => {
  const [m, t, mr, tr] = await Promise.all([api.progress(classId.value, 'mcq'), api.progress(classId.value, 'structured'), api.weeklyRanking(classId.value, 'mcq'), api.weeklyRanking(classId.value, 'structured')])
  if (m.ok) mcqProgress.value = m.data
  if (t.ok) writeProgress.value = t.data
  if (mr.ok) mcqRanking.value = mr.data
  if (tr.ok) writeRanking.value = tr.data
  loading.value = false
})

const data = computed(() => {
  if (type.value === 'mcq') {
    return mcqProgress.value
  } else if (type.value === 'structured') {
    return writeProgress.value
  }
})

const ranking = computed(() => {
  if (type.value === 'mcq') {
    return mcqRanking.value
  } else if (type.value === 'structured') {
    return writeRanking.value
  }
})
const weeks = computed(() => data.value.weeks)
const typeName = computed(() => filters.find(([k]) => k === type.value)[1])

// Chart geometry
const W = 600, H = 240, P = {l: 36, r: 12, t: 12, b: 28}
const x = (i) => P.l + (i * (W - P.l - P.r)) / Math.max(1, weeks.value.length - 1)
const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b)

// A week without a result leaves a gap instead of a false zero
function path(key) {
  let d = ''
  let pen = false
  weeks.value.forEach((w, i) => {
    if (w[key] == null) {
      pen = false;
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i)} ${y(w[key])}`
    pen = true
  })
  return d
}

const youPath = computed(() => path('you'))
const avgPath = computed(() => path('average'))
const youPoints = computed(() => weeks.value.map((w, i) => ({i, w})).filter((p) => p.w.you != null))
const firstWeek = computed(() => weeks.value.find((w) => w.you != null)?.week)
const hasChart = computed(() => youPoints.value.length > 0)

const pct = (v) => (v == null ? 'No result yet' : `${v}%`)
</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>My progress</h1>

      <!-- Pre-selection visualization -->
      <section v-if="!hasSelectedClass" class="class-gate" aria-labelledby="class-gate-title">
        <div class="class-gate-copy">
          <span class="class-gate-icon" aria-hidden="true">↗</span>

          <div>
            <h2 id="class-gate-title">Select a class to view your progress</h2>
            <p>
              Your marks, weekly progress, topic growth, rank and leaderboard are
              shown for the selected class.
            </p>
          </div>
        </div>

        <div class="preview" aria-hidden="true">
          <div class="preview-card">
            <span></span>
            <strong></strong>
            <small></small>
          </div>

          <div class="preview-chart">
            <div class="preview-grid"></div>
            <svg viewBox="0 0 360 110" preserveAspectRatio="none">
              <path
                  d="M5 88 C45 78 65 82 95 66 S145 74 175 52 S220 58 250 38 S300 45 355 20"
                  class="preview-line"
              />
            </svg>
          </div>

          <div class="preview-bars">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>

        <label class="gate-picker">
          <span>Class</span>
          <select v-model="classId">
            <option :value="null" disabled>Select a class</option>
            <option
                v-for="c in classes"
                :key="c.id"
                :value="c.id"
            >
              {{ c.title }}
            </option>
          </select>
        </label>
      </section>
      <AppLoader v-else-if="hasSelectedClass && loading" variant="cards"/>
      <div v-else>
        <!-- Class and test type -->
        <div class="tools">
          <label v-if="classes.length > 0" class="pick">Class
            <select v-model="classId">
              <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
          </label>
          <div class="seg" role="group" aria-label="Test type">
            <button v-for="[key, label] in filters" :key="key" :class="{ on: type === key }"
                    :aria-pressed="type === key" @click="() => {
    type = key
    console.log('Button clicked:', type)
  }">{{ label }}
            </button>
          </div>
        </div>

        <p v-if="writeProgress.pending > 0 && type !== 'mcq'" class="notice" role="status">
          {{ data.pending }} written test{{ data.pending === 1 ? ' is' : 's are' }} waiting for marks. It will count
          here
          once your tutor has marked it.
        </p>

        <!-- Rank cards -->
        <section class="ranks">
          <div class="card hero">
            <span class="muted">Overall rank</span>
            <template v-if="data.overall">
              <b>{{ data.overall.rank }}<small>/{{ data.overall.of }}</small></b>
              <span class="muted">Average {{ data.overall.averagePct }}% across {{
                  data.overall.quizzesTaken
                }} marked {{ data.overall.quizzesTaken === 1 ? 'test' : 'tests' }}</span>
            </template>
            <template v-else>
              <b>-</b>
              <span class="muted">No marked results yet</span>
            </template>
          </div>
          <div class="card">
            <span class="muted">This week's place</span>
            <template v-if="data.thisWeek?.rank">
              <b>{{ data.thisWeek.rank }}<small>/{{ data.thisWeek.of }}</small></b>
              <span class="muted">Week {{ data.thisWeek.week }} · {{ data.thisWeek.marks }}/{{ data.thisWeek.total }} marks</span>
            </template>
            <template v-else>
              <b>-</b>
              <span class="muted">{{
                  data.thisWeek ? `Week ${data.thisWeek.week}: not ranked yet` : 'No results yet'
                }}</span>
            </template>
          </div>
          <div class="card">
            <span class="muted">{{ firstWeek ? `Change since Week ${firstWeek}` : 'Change over time' }}</span>
            <template v-if="data.change != null">
              <b>{{ data.change > 0 ? '+' : '' }}{{ data.change }}<small>%</small></b>
            </template>
            <template v-else>
              <b>-</b>
            </template>
            <span class="muted">{{
                data.change != null ? (data.strongest ? `Strongest: ${data.strongest}` : '') : 'Needs results from two weeks'
              }}</span>
          </div>
        </section>

        <div class="layout">
          <!-- Chart -->
          <section class="panel">
            <h2>Marks by week</h2>
            <div class="legend">
              <span><i class="dot you"></i>You</span>
              <span><i class="dot avg"></i>Class average</span>
            </div>
            <template v-if="hasChart">
              <svg :viewBox="`0 0 ${W} ${H}`" role="img"
                   :aria-label="`Line chart of your weekly marks for ${typeName.toLowerCase()} compared with the class average`">
                <g v-for="v in [0, 25, 50, 75, 100]" :key="v">
                  <line :x1="P.l" :x2="W - P.r" :y1="y(v)" :y2="y(v)" class="grid"/>
                  <text :x="P.l - 6" :y="y(v) + 4" class="axis" text-anchor="end">{{ v }}</text>
                </g>
                <text v-for="(w, i) in weeks" :key="w.week" :x="x(i)" :y="H - 8" class="axis" text-anchor="middle">
                  {{ w.label }}
                </text>
                <path :d="avgPath" class="avg-line"/>
                <path :d="youPath" class="you-line"/>
                <circle v-for="p in youPoints" :key="p.w.week" :cx="x(p.i)" :cy="y(p.w.you)" r="4" class="pt">
                  <title>{{ p.w.label }}: {{ p.w.you }}%</title>
                </circle>
              </svg>
            </template>
            <p v-else class="muted empty">Your marked results will appear here as a chart.</p>
            <p v-if="data.weakest" class="muted">Weakest topic right now: <b class="gold">{{ data.weakest }}</b>. Try
              the
              {{ data.weakest }} past papers this week.</p>
          </section>

          <!-- Leaderboard -->
          <section class="panel">
            <h2>{{ data.thisWeek ? `Week ${data.thisWeek.week} leaderboard` : 'Weekly leaderboard' }}</h2>
            <ol v-if="ranking.leaderboard" class="board">
              <li v-for="(s, i) in ranking.leaderboard" :key="i" :class="{ me: s.you }">
                <span class="pos">{{ s.rank }}</span>
                <span class="nm">{{ s.name }}<em v-if="s.you"> (you)</em></span>
                <span class="val"><b>{{ s.averagePct }}%</b><small>{{ s.marks }}/{{ s.total }}</small></span>
              </li>
            </ol>
            <p v-else class="muted empty">The leaderboard shows once you have a marked result this week.</p>
            <p class="muted">Only initials are shown to other students. Ranked by average percentage.</p>
          </section>
        </div>

        <!-- MCQ quizzes next to written tests -->
        <section class="panel">
          <h2>MCQ quizzes and written tests</h2>
          <div v-for="t in data.types" :key="t.type" class="topic">
            <div class="row">
              <span>{{ t.label }} <small class="muted">· {{ t.taken }} marked</small></span>
              <span>{{ pct(t.you) }} <small class="muted">(class {{
                  t.average != null ? t.average + '%' : '-'
                }})</small></span>
            </div>
            <div class="track">
              <div class="fill" :style="{ width: (t.you ?? 0) + '%' }"></div>
            </div>
          </div>
        </section>

        <!-- Topics -->
        <section class="panel">
          <h2>Topic growth <small v-if="type !== 'all'" class="muted">· {{ typeName }}</small></h2>
          <div v-for="t in data.topics" :key="t.topic" class="topic">
            <div class="row"><span>{{ t.topic }}</span><span>{{ pct(t.pct) }}</span></div>
            <div class="track">
              <div class="fill" :style="{ width: (t.pct ?? 0) + '%' }"></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
}

.wrap {
  max-width: 1020px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  display: grid;
  gap: 1.5rem;
}

/* Everything inside the wrapper div (the content shown once a class is chosen) needs the same spacing as the
   direct children of .wrap. Without this the tools, rank cards, chart and panels sit tight against each other. */
.wrap > div {
  display: grid;
  gap: 1.5rem;
}

.wrap > * {
  min-width: 0; /* a wide grid child must shrink with the screen instead of pushing the page sideways */
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: 0 0 .75rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.gold {
  color: var(--gold);
}

.empty {
  padding: 1rem 0;
}

/* The dropdown list itself, so its text stays readable in the dark theme */
select option {
  background: var(--surface);
  color: var(--text);
}

.tools {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.pick {
  display: flex;
  align-items: center;
  gap: .6rem;
  color: var(--muted);
  font-size: .9rem;
}

.pick select {
  padding: .45rem .7rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.seg {
  display: inline-flex;
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

.seg button:not(.on):hover {
  background: var(--gold-glow);
}

.seg button.on {
  background: var(--gold);
  color: var(--on-gold);
  font-weight: 600;
}

.notice {
  margin: 0;
  padding: .8rem 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--muted);
  font-size: .9rem;
}

.ranks {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: .2rem;
  padding: 1.3rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.card.hero {
  border-color: var(--gold);
}

.card b {
  font: 600 2.6rem var(--font-display);
  color: var(--gold);
  line-height: 1.1;
}

.card small {
  font-size: 1rem;
  color: var(--muted);
}

.layout {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.legend {
  display: flex;
  gap: 1.25rem;
  font-size: .85rem;
  color: var(--muted);
  margin-bottom: .5rem;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: .4rem;
}

.dot.you {
  background: var(--gold);
}

.dot.avg {
  background: var(--muted);
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid {
  stroke: var(--line);
  stroke-width: 1;
}

.axis {
  fill: var(--muted);
  font-size: 11px;
}

.you-line {
  fill: none;
  stroke: var(--gold);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.avg-line {
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-dasharray: 5 5;
}

.pt {
  fill: var(--bg);
  stroke: var(--gold);
  stroke-width: 2.5;
}

.board {
  list-style: none;
  margin: 0 0 .75rem;
  padding: 0;
  display: grid;
  gap: .4rem;
}

.board li {
  display: flex;
  align-items: center;
  gap: .8rem;
  padding: .6rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.board li.me {
  border-color: var(--gold);
  background: var(--gold-glow);
}

.pos {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: .85rem;
  flex: none;
}

.board li:first-child .pos {
  background: var(--gold);
  color: var(--on-gold);
}

.nm {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere; /* a long name wraps instead of pushing the marks out of the row */
}

.nm em {
  color: var(--gold);
  font-style: normal;
  font-size: .85rem;
}

.val {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
  flex: none;
}

.val small {
  color: var(--muted);
  font-size: .75rem;
}

.topic {
  margin-bottom: 1rem;
}

.topic .row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: .9rem;
  margin-bottom: .35rem;
}

.track {
  height: 8px;
  border-radius: 4px;
  background: var(--line);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--gold);
  border-radius: 4px;
}

a:focus-visible, button:focus-visible, select:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

/* The tab buttons sit inside a box that clips overflow, which cut off the focus ring: draw it inside instead */
.seg button:focus-visible {
  outline-offset: -3px;
}

/* ---- Before a class is chosen ---- */

.class-gate {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.class-gate-copy {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.class-gate-copy h2 {
  margin: 0 0 .35rem;
}

.class-gate-copy p {
  max-width: 650px;
  color: var(--muted);
  font-size: .92rem;
  margin: 0;
}

.class-gate-icon {
  width: 42px;
  height: 42px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  font-size: 1.25rem;
}

.preview {
  display: grid;
  grid-template-columns: .8fr 1.5fr .8fr;
  gap: 1rem;
  min-height: 145px;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  opacity: .7;
}

.preview-card,
.preview-chart,
.preview-bars {
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
}

.preview-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: .65rem;
  padding: 1rem;
}

.preview-card span {
  width: 45%;
  height: 8px;
  border-radius: 4px;
  background: var(--line);
}

.preview-card strong {
  width: 65%;
  height: 26px;
  border-radius: 4px;
  background: var(--line);
}

.preview-card small {
  width: 80%;
  height: 7px;
  border-radius: 4px;
  background: var(--line);
}

.preview-chart {
  position: relative;
  padding: .8rem;
  overflow: hidden;
}

/* Faint horizontal lines behind the curve. It used to be position:absolute with no size and no
   positioned parent, so nothing showed. */
.preview-grid {
  position: absolute;
  inset: .8rem;
  background: repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px 25%);
  opacity: .6;
}

.preview-chart svg {
  position: relative; /* above the grid lines */
  width: 100%;
  height: 100%;
  min-height: 100px;
}

.preview-line {
  fill: none;
  stroke: var(--gold);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .65;
}

.preview-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-evenly;
  gap: .6rem;
  padding: 1rem;
}

.preview-bars i {
  display: block;
  width: 18%;
  border-radius: 3px 3px 0 0;
  background: var(--line);
}

.preview-bars i:nth-child(1) {
  height: 35%;
}

.preview-bars i:nth-child(2) {
  height: 58%;
}

.preview-bars i:nth-child(3) {
  height: 78%;
}

.preview-bars i:nth-child(4) {
  height: 48%;
}

.gate-picker {
  display: flex;
  align-items: center;
  gap: .75rem;
  color: var(--text);
  font-size: .9rem;
}

.gate-picker span {
  color: var(--muted);
}

.gate-picker select {
  min-width: 220px;
  padding: .6rem .75rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

@media (max-width: 760px) {
  .ranks, .layout {
    grid-template-columns: 1fr;
  }

  .seg {
    width: 100%;
  }

  .seg button {
    flex: 1;
    padding: .5rem .4rem;
  }

  .preview {
    grid-template-columns: 1fr;
  }

  .preview-card,
  .preview-chart,
  .preview-bars {
    min-height: 100px;
  }

  .gate-picker {
    align-items: stretch;
    flex-direction: column;
  }

  .gate-picker select {
    width: 100%;
    min-width: 0;
  }
}
</style>
