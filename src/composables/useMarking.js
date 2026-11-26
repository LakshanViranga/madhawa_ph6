import { ref, reactive, computed } from 'vue'
import { http } from '../api/http.js'

// Marking a written test. It only uses endpoints that already exist:
//   GET /admin/quizzes/:id                       the test: questions, marks, marking guides, question paper
//   GET /quizzes/:id/results                     who handed in, and who still waits for marks
//   GET /quizzes/:id/results/students/:studentId one student's answers and uploaded files
//   PUT /quizzes/:id/attempts/:studentId/grade   save the marks

const twoDecimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6
const round2 = (n) => Math.round(n * 100) / 100

export function useMarking(quizId) {
    const loading = ref(true)
    const error = ref('')
    const quiz = ref(null)       // the test
    const students = ref([])     // one row per student who handed in
    const selectedId = ref('')
    const attempt = ref(null)    // the chosen student's work
    const loadingAttempt = ref(false)
    const attemptError = ref('')
    const saving = ref(false)
    const saveError = ref('')
    const showProblems = ref(false)
    const dirty = ref(false)     // something was typed and not saved yet

    // What the marker types. marks and comments are keyed by question number (1, 2, 3 ...).
    const form = reactive({ marks: {}, comments: {}, total: '', feedback: '' })
    let latest = 0               // the newest student asked for; an older, slower answer is ignored

    // ---- who is in the list ----
    // Oldest first, so the student who has waited longest is marked first
    const waiting = computed(() =>
        students.value.filter((s) => s.marks == null).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)))
    const marked = computed(() => students.value.filter((s) => s.marks != null))
    const waitingOthers = computed(() => waiting.value.some((s) => s.studentId !== selectedId.value))

    // ---- the questions, with the student's typed answer next to each ----
    const questions = computed(() =>
        (quiz.value?.questions ?? []).map((q, i) => {
            const answer = attempt.value?.answers?.find((a) => a.position === i + 1)
            return { position: i + 1, text: q.text, image: q.image, max: Number(q.marks), guide: q.modelAnswer, answer: answer?.text ?? '' }
        }))
    const hasQuestions = computed(() => questions.value.length > 0)
    // A test with only a PDF paper has no questions: one total mark is given instead
    const maxTotal = computed(() =>
        hasQuestions.value ? round2(questions.value.reduce((s, q) => s + q.max, 0)) : Number(quiz.value?.totalMarks ?? 0))

    // ---- checking what was typed (the server checks again) ----
    function check(value, max) {
        if (value === '' || value == null) return 'Enter the marks.'
        const n = Number(value)
        if (!Number.isFinite(n) || n < 0) return 'Marks cannot be negative.'
        if (n > max) return `At most ${max}.`
        if (!twoDecimals(n)) return 'Use at most 2 decimals.'
        return ''
    }
    const problem = (position) => check(form.marks[position], questions.value[position - 1]?.max ?? 0)
    const totalProblem = computed(() => check(form.total, maxTotal.value))
    const firstProblem = computed(() => {
        if (!hasQuestions.value) return totalProblem.value ? 'total' : ''
        const q = questions.value.find((x) => problem(x.position))
        return q ? q.position : ''
    })
    const canSave = computed(() => firstProblem.value === '')

    // What the marks add up to so far (rounded, so 0.1 + 0.2 shows as 0.3)
    const entered = computed(() => {
        if (!hasQuestions.value) return Number.isFinite(Number(form.total)) && form.total !== '' ? round2(Number(form.total)) : 0
        return round2(questions.value.reduce((s, q) => {
            const n = Number(form.marks[q.position])
            return s + (form.marks[q.position] !== '' && form.marks[q.position] != null && Number.isFinite(n) ? n : 0)
        }, 0))
    })

    const markDirty = () => { dirty.value = true }

    // ---- loading ----
    async function init() {
        loading.value = true
        error.value = ''
        const [t, r] = await Promise.all([http.get(`/admin/quizzes/${quizId}`), http.get(`result/quizzes/${quizId}/results`)])
        if (!t.ok || !r.ok) {
            error.value = (!t.ok ? t : r).error
            loading.value = false
            return
        }
        quiz.value = t.data
        students.value = r.data.rows
        loading.value = false
        const first = waiting.value[0] ?? students.value[0]
        if (first) await select(first.studentId)
    }

    async function select(studentId) {
        const mine = ++latest
        selectedId.value = studentId
        attempt.value = null
        attemptError.value = ''
        saveError.value = ''
        loadingAttempt.value = true
        const r = await http.get(`/result/quizzes/${quizId}/results/students/${studentId}`)
        if (mine !== latest) return
        loadingAttempt.value = false
        if (!r.ok) {
            attemptError.value = r.error
            return
        }
        attempt.value = r.data
        // Start from what was marked before, so a mark can be changed
        form.marks = {}
        form.comments = {}
        for (const a of r.data.answers) {
            form.marks[a.position] = a.marksAwarded ?? ''
            form.comments[a.position] = a.feedback ?? ''
        }
        form.total = r.data.marks ?? ''
        form.feedback = r.data.feedback ?? ''
        dirty.value = false
        showProblems.value = false
    }

    // ---- saving ----
    async function save() {
        showProblems.value = true
        if (!canSave.value) return { ok: false, problem: firstProblem.value }

        const feedback = form.feedback.trim() || undefined
        const body = hasQuestions.value
            ? {
                answers: questions.value.map((q) => ({
                    position: q.position,
                    marks: Number(form.marks[q.position]),
                    feedback: form.comments[q.position]?.trim() || undefined,
                })),
                feedback,
            }
            : { total: Number(form.total), feedback }

        saving.value = true
        saveError.value = ''
        const r = await http.put(`/attempt/quizzes/${quizId}/attempts/${selectedId.value}/grade`, body)
        saving.value = false
        if (!r.ok) {
            saveError.value = r.errors?.length ? r.errors.join(' ') : r.error
            return { ok: false }
        }

        const row = students.value.find((s) => s.studentId === selectedId.value)
        if (row) {
            row.marks = r.data.marks
            row.total = r.data.total
            row.status = r.data.status
        }
        dirty.value = false
        return { ok: true, studentId: selectedId.value }
    }

    // The next student still waiting, other than the one on screen
    const nextWaiting = () => waiting.value.find((s) => s.studentId !== selectedId.value)

    return {
        loading, error, quiz, students, waiting, marked, waitingOthers,
        selectedId, attempt, loadingAttempt, attemptError,
        questions, hasQuestions, maxTotal, form, entered,
        problem, totalProblem, firstProblem, canSave, showProblems, dirty, markDirty,
        saving, saveError, init, select, save, nextWaiting,
    }
}
