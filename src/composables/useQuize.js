import {reactive, ref} from 'vue'
import { request, attempt } from '@/api/http'

// Quizzes for both sides. The server decides what each person receives:
//   admin   -> every quiz, with the correct answers
//   student -> no drafts, and never the correct answers
//
//   const { quizzes, current, load, open } = useQuizzes()
export function useQuizzes() {
    const quizzes = ref([]) // list view: week_no, title, status, question_count, has_discussion ...
    const current = ref(null) // one quiz with its questions, after open(id)
    const loading = ref(false)
    const saving = ref(false)
    const error = ref('')

    async function load() {
        loading.value = true
        error.value = ''
        const r = await attempt(() => request('/api/quizzes'))
        loading.value = false
        if (!r.ok) { error.value = r.error; return r }
        quizzes.value = r.quizzes
        return r
    }

    // Loads one quiz into `current`. Returns the result so a page can handle "not found".
    async function open(id) {
        loading.value = true
        error.value = ''
        current.value = null
        const r = await attempt(() => request(`/api/quizzes/${id}`))
        loading.value = false
        if (!r.ok) { error.value = r.error; return r }
        current.value = r.quiz
        return r
    }

    async function change(fn) {
        saving.value = true
        const r = await attempt(fn)
        saving.value = false
        return r
    }

    // ---- Admin only ----

    // data: { week_no, title, batch?, status?, questions?, discussion_status?, discussion_link? }
    // questions: [{ image: 'https://...', answer: 0 }]  (answer 0 = A ... 3 = D)
    async function create(data) {
        const formData = new FormData()
        formData.append('data', JSON.stringify(data))
        data.questions.forEach((question) => {
            formData.append(`images`, question.imgFile)
        })
        const r = await change(() => request('/api/quizzes', { method: 'POST', body: formData }))
        if (r.ok) await load()
        return r
    }

    // changes: send only what changed. Failure messages list every rule that was broken (r.errors).
    async function update(id, changes) {
        const r = await change(() => request(`/api/quizzes/${id}`, { method: 'PATCH', body: changes }))
        if (r.ok) {
            if (current.value?.id === id) current.value = r.quiz
            await load()
        }
        return r
    }

    const setStatus = (id, status) => update(id, { status }) // 'draft' | 'scheduled' | 'open' | 'closed'
    const setDiscussion = (id, { discussion_status, discussion_link }) => update(id, { discussion_status, discussion_link })

    return { quizzes, current, loading, saving, error, load, open, create, update, setStatus, setDiscussion }
}
