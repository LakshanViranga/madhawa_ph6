<script setup>
import {ref, computed, nextTick, onMounted} from 'vue'
import {useMarking} from '@/composables/useMarking.js'

// Marks a written test. Open it by showing it with v-if, so every opening starts fresh:
//   <marking-dialog v-if="markingFor" :quiz-id="markingFor.id" :title="markingFor.title"
//                   @close="markingFor = null" @saved="load" />
// "saved" is sent after every saved mark, so the page can refresh its "to mark" counts.
const props = defineProps({
  quizId: {type: String, required: true},
  title: {type: String, default: ''},
})
const emit = defineEmits(['close', 'saved'])

const {
  loading, error, quiz, waiting, marked, waitingOthers,
  selectedId, attempt, loadingAttempt, attemptError,
  questions, hasQuestions, maxTotal, form, entered,
  problem, totalProblem, showProblems, dirty, markDirty,
  saving, saveError, init, select, save, nextWaiting,
} = useMarking(props.quizId)

const dlg = ref(null)
const message = ref('')

onMounted(() => {
  dlg.value?.showModal?.() // the browser keeps focus inside and closes it on Escape
  init()
})

// ---- closing, and not losing typed marks by accident ----
const LOSE = 'You have marks that are not saved. Leave without saving them?'

function requestClose() {
  if (dirty.value && !window.confirm(LOSE)) return
  dlg.value?.close()
}

async function choose(studentId) {
  if (studentId === selectedId.value) return
  if (dirty.value && !window.confirm(LOSE)) return
  message.value = ''
  await select(studentId)
}

// ---- saving ----
async function onSave(andNext) {
  message.value = ''
  const result = await save()
  if (!result.ok) {
    if (result.problem !== undefined) { // a mark is missing or wrong: go to it
      await nextTick()
      document.getElementById(`m-${result.problem}`)?.focus()
    }
    return
  }
  emit('saved')
  const next = andNext ? nextWaiting() : null
  if (next) {
    await select(next.studentId)
    message.value = `Saved. ${waiting.value.length} left to mark.`
  } else {
    message.value = waiting.value.length ? 'Saved.' : 'Saved. Everything is marked.'
  }
}

// ---- display ----
const when = (iso) => new Date(iso).toLocaleString('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit'
})
const safeHref = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '')
const paper = computed(() => (quiz.value?.paper && safeHref(quiz.value.paper.url) ? quiz.value.paper : null))
</script>

<template>
  <dialog ref="dlg" class="marking" aria-labelledby="mk-title" @close="emit('close')" @cancel.prevent="requestClose">
    <header class="mk-head">
      <div>
        <h2 id="mk-title">Mark: {{ title }}</h2>
        <p v-if="!loading && !error" class="muted">{{ waiting.length }} waiting · {{ marked.length }} marked</p>
      </div>
      <button type="button" class="btn ghost sm" @click="requestClose">Close</button>
    </header>

    <p v-if="loading" class="muted pad">Loading...</p>
    <div v-else-if="error" class="pad" role="alert">
      <p class="err">{{ error }}</p>
      <button type="button" class="btn ghost sm" @click="init">Try again</button>
    </div>

    <div v-else class="mk-grid">
      <!-- Who handed in -->
      <nav class="mk-list" aria-label="Students">
        <h3>To mark ({{ waiting.length }})</h3>
        <p v-if="!waiting.length" class="muted">Nobody is waiting.</p>
        <ul>
          <li v-for="s in waiting" :key="s.studentId">
            <button type="button" class="who" :class="{ on: s.studentId === selectedId }"
                    :aria-current="s.studentId === selectedId ? 'true' : undefined" @click="choose(s.studentId)">
              <b>{{ s.name }}</b>
              <small class="muted">{{ s.loginId }} · handed in {{ when(s.submittedAt) }}</small>
            </button>
          </li>
        </ul>

        <details v-if="marked.length" class="done">
          <summary>Marked ({{ marked.length }})</summary>
          <ul>
            <li v-for="s in marked" :key="s.studentId">
              <button type="button" class="who" :class="{ on: s.studentId === selectedId }"
                      :aria-current="s.studentId === selectedId ? 'true' : undefined" @click="choose(s.studentId)">
                <b>{{ s.name }}</b>
                <small class="muted">{{ s.marks }}/{{ s.total }} · you can change it</small>
              </button>
            </li>
          </ul>
        </details>
      </nav>

      <!-- The chosen student's work and the marks -->
      <section class="mk-work" aria-live="polite">
        <p v-if="message" class="ok" role="status">{{ message }}</p>

        <p v-if="loadingAttempt" class="muted">Loading...</p>
        <div v-else-if="attemptError" role="alert">
          <p class="err">{{ attemptError }}</p>
          <button type="button" class="btn ghost sm" @click="select(selectedId)">Try again</button>
        </div>
        <p v-else-if="!attempt" class="muted">
          {{
            waiting.length ? 'Choose a student to mark.' : 'Everything is marked. Choose a student from the list to change their marks.'
          }}
        </p>

        <template v-else>
          <div class="student">
            <h3>{{ attempt.student.name }}</h3>
            <span class="muted">{{ attempt.student.loginId }} · handed in {{ when(attempt.submittedAt) }}</span>
            <span v-if="attempt.marks != null" class="muted">Marked {{ attempt.marks }}/{{ attempt.total }}</span>
          </div>

          <p v-if="paper" class="muted"><a :href="paper.url" target="_blank" rel="noopener noreferrer">Open the question
            paper</a></p>

          <div v-if="attempt.files.length" class="files">
            <b>Work they uploaded</b>
            <ul>
              <li v-for="f in attempt.files" :key="f.id">
                <a v-if="safeHref(f.url)" :href="f.url" target="_blank" rel="noopener noreferrer">{{ f.name }}</a>
                <span v-else>{{ f.name }}</span>
              </li>
            </ul>
          </div>

          <!-- Test with questions: marks for each -->
          <template v-if="hasQuestions">
            <article v-for="q in questions" :key="q.position" class="q">
              <header>
                <b>Question {{ q.position }}</b>
                <span class="muted">{{ q.max }} marks</span>
              </header>
              <p v-if="q.text" class="text">{{ q.text }}</p>
              <img v-if="q.image" :src="q.image" :alt="`Question ${q.position}`" class="qimg"/>

              <div class="answer">
                <span class="muted">Their answer</span>
                <p class="text">{{ q.answer || 'No typed answer. Look at the uploaded work.' }}</p>
              </div>
              <details v-if="q.guide" class="guide">
                <summary>Marking guide (only you see this)</summary>
                <p class="text">{{ q.guide }}</p>
              </details>

              <div class="give">
                <label :for="`m-${q.position}`">Marks (out of {{ q.max }})
                  <input :id="`m-${q.position}`" v-model.number="form.marks[q.position]" type="number"
                         inputmode="decimal"
                         min="0" :max="q.max" step="0.5" :aria-invalid="Boolean(showProblems && problem(q.position))"
                         :aria-describedby="showProblems && problem(q.position) ? `e-m-${q.position}` : undefined"
                         @input="markDirty"/>
                </label>
                <label :for="`c-${q.position}`" class="grow">Comment (optional)
                  <textarea :id="`c-${q.position}`" v-model="form.comments[q.position]" rows="2" maxlength="2000"
                            @input="markDirty"></textarea>
                </label>
              </div>
              <span v-if="showProblems && problem(q.position)" :id="`e-m-${q.position}`"
                    class="err">{{ problem(q.position) }}</span>
            </article>
          </template>

          <!-- Test with only a PDF paper: one total -->
          <div v-else class="q">
            <div class="give">
              <label for="m-total">Total marks (out of {{ maxTotal }})
                <input id="m-total" v-model.number="form.total" type="number" inputmode="decimal" min="0"
                       :max="maxTotal"
                       step="0.5" :aria-invalid="Boolean(showProblems && totalProblem)"
                       :aria-describedby="showProblems && totalProblem ? 'e-m-total' : undefined" @input="markDirty"/>
              </label>
            </div>
            <span v-if="showProblems && totalProblem" id="e-m-total" class="err">{{ totalProblem }}</span>
          </div>

          <label for="m-feedback" class="field">Message to the student (optional)
            <textarea id="m-feedback" v-model="form.feedback" rows="3" maxlength="5000" @input="markDirty"></textarea>
          </label>

          <footer class="mk-foot">
            <span class="total">Total <b>{{ entered }}</b> / {{ maxTotal }}</span>
            <p v-if="saveError" class="err" role="alert">{{ saveError }}</p>
            <button type="button" class="btn ghost sm" :disabled="saving" @click="onSave(false)">Save</button>
            <button v-if="waitingOthers" type="button" class="btn sm" :disabled="saving" @click="onSave(true)">
              {{ saving ? 'Saving...' : 'Save and next' }}
            </button>
          </footer>
        </template>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.marking {
  width: min(1100px, 96vw);
  max-height: 92vh;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-body);
  overflow: hidden;
}

.marking[open] {
  display: flex;
  flex-direction: column;
}

.marking::backdrop {
  background: rgba(0, 0, 0, .6);
}

.mk-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid var(--line);
}

.mk-head h2 {
  margin: 0;
  font: 600 1.15rem var(--font-display);
}

.mk-head p {
  margin: .2rem 0 0;
}

.pad {
  padding: 1.4rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: .4rem 0 0;
}

.ok {
  margin: 0 0 1rem;
  padding: .6rem 1rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  color: var(--gold);
  font-size: .9rem;
}

a {
  color: var(--gold);
}

.mk-grid {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}

.mk-list {
  padding: 1rem;
  border-right: 1px solid var(--line);
  overflow: auto;
  max-height: calc(92vh - 5rem);
}

.mk-list h3 {
  margin: 0 0 .6rem;
  font: 600 .95rem var(--font-display);
}

.mk-list ul {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  display: grid;
  gap: .4rem;
}

.who {
  width: 100%;
  display: grid;
  gap: .1rem;
  text-align: left;
  padding: .6rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.who:hover {
  border-color: var(--gold);
}

.who.on {
  border-color: var(--gold);
  background: var(--gold-glow);
}

.who small {
  font-size: .8rem;
}

.done summary {
  cursor: pointer;
  margin-bottom: .6rem;
  font-weight: 600;
}

.mk-work {
  padding: 1rem 1.4rem 1.4rem;
  overflow: auto;
  max-height: calc(92vh - 5rem);
  display: grid;
  gap: 1rem;
  align-content: start;
}

.student {
  display: grid;
  gap: .1rem;
}

.student h3 {
  margin: 0;
  font: 600 1.1rem var(--font-display);
}

.files ul {
  margin: .3rem 0 0;
  padding-left: 1.2rem;
}

.q {
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  display: grid;
  gap: .7rem;
}

.q header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.qimg {
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}

.answer {
  padding: .7rem .9rem;
  border-left: 3px solid var(--gold);
  background: var(--surface);
  border-radius: 0 6px 6px 0;
  display: grid;
  gap: .2rem;
}

.guide summary {
  cursor: pointer;
  color: var(--muted);
  font-size: .9rem;
}

.guide p {
  margin-top: .4rem;
}

.give {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.give label, .field {
  display: grid;
  gap: .3rem;
  font-size: .9rem;
  color: var(--muted);
}

.give .grow {
  flex: 1;
  min-width: 220px;
}

input[type='number'] {
  width: 9rem;
}

input, textarea {
  box-sizing: border-box;
  padding: .6rem;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

textarea {
  width: 100%;
  resize: vertical;
}

input:focus, textarea:focus {
  border-color: var(--gold);
  outline: none;
}

[aria-invalid='true'] {
  border-color: var(--danger);
}

.mk-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: .6rem;
  align-items: center;
  flex-wrap: wrap;
  padding: .8rem 0 0;
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.mk-foot .total {
  margin-right: auto;
  color: var(--muted);
}

.mk-foot .total b {
  color: var(--gold);
  font: 600 1.3rem var(--font-display);
}

.mk-foot .err {
  flex-basis: 100%;
  order: -1;
  margin: 0;
}

.btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

button:focus-visible, a:focus-visible, summary:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .mk-grid {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .mk-list {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    max-height: 14rem;
  }

  .mk-work {
    max-height: none;
  }
}
</style>
