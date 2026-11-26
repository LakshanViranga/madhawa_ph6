// One place for every admin API call (see http.js for the result shape).
import { http } from '../api/http.js'

const api = {
    dashboard: () => http.get('/admin/dashboard'),

    batches: () => http.get('/admin/batches'),
    createBatch: (name) => http.post('/admin/batches', { name }),

    classes: () => http.get('/classes'), // staff get join codes and counts
    createClass: (body) => http.post('/admin/classes', body),
    updateClass: (id, body) => http.patch(`/admin/classes/${id}`, body),
    resetJoinCode: (id) => http.post(`/admin/classes/${id}/join-code`),

    lessons: (classId) => http.get(`/classes/${classId}/lessons`),
    createSession: (classId, body) => http.post(`/admin/classes/${classId}/sessions`, body),
    updateSession: (id, body) => http.patch(`/admin/sessions/${id}`, body),
    deleteSession: (id) => http.delete(`/admin/sessions/${id}`),
    createRecording: (classId, body) => http.post(`/admin/classes/${classId}/recordings`, body),
    updateRecording: (id, body) => http.patch(`/admin/recordings/${id}`, body),
    deleteRecording: (id) => http.delete(`/admin/recordings/${id}`),

    me: () => http.get('/auth/me'),
    users: () => http.get('/staff/users'),
    createUser: (body) => http.post('/staff/users', body),
    updateUser: (id, body) => http.patch(`/staff/users/${id}`, body),
    resetUserPassword: (id, password) => http.post(`/staff/users/${id}/password`, password ? { password } : {}),
    unlockUser: (id) => http.post(`/staff/users/${id}/unlock`),

    quizzes: (params) => http.get('/admin/quizzes', params),
    quiz: (id) => http.get(`/admin/quizzes/${id}`),
    // payload = plain object, files = [{ file, name }] (question images and the PDF paper)
    saveQuiz: (payload, files, id) => {
        console.log(payload)
        const fd = new FormData()
        fd.append('data', JSON.stringify(payload))
        files.forEach(({ file, name }) => fd.append('files', file, name))
        return id ? http.put(`/admin/quizzes/${id}`, fd) : http.post('/admin/quizzes', fd)
    },
    setQuizStatus: (id, status) => http.patch(`/admin/quizzes/${id}/status`, { status }),
    setDiscussion: (id, link, show) => http.put(`/admin/quizzes/${id}/discussion`, { link, show }),
    deleteQuiz: (id) => http.delete(`/admin/quizzes/${id}`),

    //Results
    getQuizResults: (id) => http.get(`/result/quizzes/${id}/results`),

    //Issues
    getIssues: () => http.get(`/issue/admin`),
    getIssue: (id) => http.get(`/issue/admin/${id}/`),
    updateIssue: (id, issue) => http.patch(`/issue/admin/${id}`, issue),

    //material
    createMaterial: (payload, files, id) => {
        const fd = new FormData()
        fd.append('data', JSON.stringify(payload))
        files.forEach(({ file, name }) => fd.append('files', file, name))
        return http.post(`/admin/materials/${id}/materials`, fd )
    },

    updateMaterial: (payload, files, id) => {
        const fd = new FormData()
        fd.append('data', JSON.stringify(payload))
        files.forEach(({ file, name }) => fd.append('files', file, name))
        return http.post(`/admin/materials/${id}/materials`, fd )
    },

    removeMaterial: (id) => http.delete(`/admin/materials/${id}`),

    // announcement
    createAnnouncement: (body) => http.post(`/announcement`, body),
    listAnnouncements: (query) => http.get(`/announcement`, query),
    updateAnnouncement: (id, body) => http.patch(`/announcement/${id}`, body),
    deleteAnnouncement: (id) => http.delete(`/announcement/${id}`),

    // students of class
    students: (classId) => http.get(`/classes/${classId}/students`),
    gradingPhysicalTest: (quizId, entries) => http.put(`/attempt/quizzes/${quizId}/attempts/grade/physical`, {entries})
}

export const useAdmin = () => api
