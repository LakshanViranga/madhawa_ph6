// Every student API call. Results look like { ok, data } or { ok: false, status, error, errors } (see http.js).
import { http } from '../api/http.js'

const api = {
    classes: () => http.get('/classes'),
    joinClass: (code) => http.post('/classes/join', { code }),
    lessons: (classId) => http.get(`/classes/${classId}/lessons`),

    // type: 'mcq' | 'structured'
    tests: (classId, type) => http.get(`/classes/${classId}/tests`, { type }),
    progress: (classId, type) => http.get(`/result/classes/${classId}/students/me/progress`, { type }),

    // Taking a test
    start: (quizId) => http.post(`/attempt/quizzes/${quizId}/attempts`), // starts, or resumes a running attempt
    content: (quizId) => http.get(`/attempt/quizzes/${quizId}/content`), // questions and paper, no answer key
    saveAnswers: (quizId, answers) => http.put(`/attempt/quizzes/${quizId}/attempts/current/answers`, { answers }),
    submitMcq: (quizId, answers) => http.post(`/attempt/quizzes/${quizId}/attempts/current/submit`, { answers }),
    submitWritten: (quizId, answers, files) => {
        const fd = new FormData()
        fd.append('data', JSON.stringify({ answers }))
        files.forEach((f) => fd.append('files', f))
        return http.post(`/attempt/quizzes/${quizId}/attempts/current/submit`, fd)
    },
    myResult: (quizId) => http.get(`/result/quizzes/${quizId}/results/students/me`),
    weeklyRanking: (classId, type) => http.get(`/result/classes/${classId}/rankings`, { type }),

    profileView: () => http.get('/profile/me'),
    updateProfile: (update) => http.put('/profile/me', {update}),

    // payload = plain object, files = [{ file, name }] (question images and the PDF paper)
    createIssue: (payload, files) => {
        const fd = new FormData()
        fd.append('data', JSON.stringify(payload))
        files.forEach(({ file, name }) => fd.append('files', file, name))
        return http.post('/issue/student', fd)
    },
    getIssues: () => http.get('/issue/student'),

    // notification
    listNotification: (params) => http.get(`/notifications`, params),
    markNotificationRead: (id) => http.patch(`/notifications/${id}`, {read: true}),
    markAllNotificationsRead: () => http.patch(`/notifications`, {read: true}),
    leaveClass: (classId) => http.get(`/classes/${classId}/unenroll`),

    getMineAnnouncement: () => http.get(`/announcement/me`),
    eligibleClasses: () => http.get(`/classes/eligible`),
    requestJoinCode: (id) => http.get(`/classes/${id}/join`),
}

export const useStudent = () => api
