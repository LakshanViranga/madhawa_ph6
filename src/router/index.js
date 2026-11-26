import {createRouter, createWebHistory} from 'vue-router'
import HomeView from '../pages/HomeView.vue'
import LmsLoginView from "../pages/LmsLoginView.vue";
import GalleryView from "@/pages/GalleryView.vue";
import Progress from "../pages/Progress.vue";
import ResourcesView from "@/pages/ResourcesView.vue";
import ComingSoon from "@/pages/ComingSoon.vue";
import {features} from "@/data/features.js";
import PrivacyView from "@/pages/PrivacyView.vue";
import AnnouncementsView from "@/pages/AnnouncementsView.vue";
import NotfoundView from "@/pages/NotfoundView.vue";
import ClassesPage from "@/pages/ClassesPage.vue";
import LessonsPage from "@/pages/LessonsPage.vue";
import ClassQuizPage from "@/pages/ClassQuizPage.vue";
import ClassTestPage from "@/pages/ClassTestPage.vue";
import RegistrationPage from "@/pages/RegistrationPage.vue";
import ReportIssue from "@/pages/ReportIssue.vue";
import Notifications from "@/pages/Notifications.vue";
import Profile from "@/pages/profile.vue";
import RegistrationVerification from "@/pages/RegistrationVerification.vue";
import LmsLayout from "@/pages/LmsLayout.vue";
import StudentDashboard from "@/pages/StudentDashboard.vue";
import { useAuthStore } from "@/stores/authStore.js";
import AdminLogin from "@/pages/admin/AdminLogin.vue";

// While the portal is not ready, every /lms address (login, quiz, progress, anything else) shows the Coming soon page.
const studentPortal = features.studentPortal
    ? [
        {path: '/lms/login', name: 'lms-login', component: LmsLoginView, meta: {guestOnly: true}},
        {path: '/lms/register', name: 'lms-register', component: RegistrationPage, meta: {guestOnly: true}},
        {path: '/lms/verification', name: 'lms-verify', component: RegistrationVerification, meta: {guestOnly: true}},
        {
            path: '/lms',
            component: LmsLayout,
            meta: {
                requiresAuth: true
            },
            children: [
                {path: '', name: 'lms-dashboard', component: StudentDashboard},
                {path: '/lms/classes/:classId/quiz', name: 'lms-quiz', component: ClassQuizPage},
                {path: '/lms/progress', name: 'lms-progress', component: Progress},
                {path: '/lms/classes', name: 'lms-classes', component: ClassesPage},
                {path: '/lms/issue', name: 'lms-issue', component: ReportIssue},
                {path: '/lms/classes/:classId/lessons', name: 'lms-lessons', component: LessonsPage},
                {path: '/lms/classes/:classId/tests', name: 'lms-tests', component: ClassTestPage},
                {path: '/lms/notifications', name: 'lms-notification', component: Notifications},
                {path: '/lms/profile', name: 'lms-profile', component: Profile},
            ]
        }
    ]
    : [{path: '/lms/:pathMatch(.*)*', name: 'portal-soon', component: ComingSoon}]

const routes = [
    {path: '/', name: 'home', component: HomeView},
    {path: '/gallery', name: 'gallery', component: GalleryView},
    {path: '/resources', name: 'resources', component: ResourcesView},
    {path: '/privacy', component: PrivacyView},
    {path: '/announcements', component: AnnouncementsView},
    ...studentPortal,
    // Redirect unknown URLs to home
    {path: '/:pathMatch(.*)*', name: 'not', component: NotfoundView},
    {path: '/admin/login', name: 'adminLogin', component: AdminLogin, meta: {guestOnly: true}},
    {
        path: '/admin',
        component: () => import('@/pages/admin/AdminLayout.vue'),
        meta: {
            requiresAuth: true
        },
        children: [
            {path: '', component: () => import('@/pages/admin/AdminDashboard.vue')},
            {path: 'quizzes', component: () => import('@/pages/admin/AdminQuizzes.vue')},
            {path: 'classes', component: () => import('@/pages/admin/AdminClasses.vue')},
            {path: 'classes/:classId/lessons', component: () => import('@/pages/admin/AdminLessons.vue')},
            {path: 'quizzes/:id', component: () => import('@/pages/admin/AdminQuizEditor.vue')},
            {path: 'students', component: () => import('@/pages/admin/AdminStudents.vue')},
            {path: 'results', component: () => import('@/pages/admin/AdminResults.vue')},
            {path: 'users', component: () => import('@/pages/admin/AdminUsers.vue')},
            {path: 'issues', component: () => import('@/pages/admin/AdminIssue.vue')},
            {path: 'registrations', component: () => import('@/pages/admin/AdminRegistrations.vue')},
            {path: 'announcements', component: () => import('@/pages/admin/AdminAnnouncement.vue')},
        ],
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: (to) => (to.hash ? {el: to.hash, behavior: 'smooth'} : {top: 0}),
})

async function isAuthenticated(){
    const authStore = useAuthStore()

    // Check the session once, when the app first needs it
    if (!authStore.checked) {
        await authStore.checkSession()
    }

    return authStore.isLoggedIn
}
router.beforeEach(async (to) => {
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const guestOnly = to.matched.some((record) => record.meta.guestOnly)
    const loggedIn =  await isAuthenticated()
    const isAdminRoute = to.path.startsWith('/admin')

    // Protected route: every /lms dashboard page and every /admin page
    if (requiresAuth && !loggedIn) {
        return {
            path: isAdminRoute ? '/admin/login' : '/lms/login',
            query: {redirect: to.fullPath}, // send the user back here after login
        }
    }

    // Optional role check for admin pages
    // if (to.path.startsWith('/admin') && loggedIn && !isAdmin()) {
    //     return {path: '/lms'}
    // }

    // Already logged in: skip the login/register pages
    if (guestOnly && loggedIn) {
        return {path: isAdminRoute ? '/admin' : '/lms'}
    }

    return true
})

export default router
