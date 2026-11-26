<script setup>
import { onMounted, onUnmounted } from 'vue'
import LmsHeader from '@/components/LmsHeader.vue'
import { useNotifications } from '@/composables/useNotifications.js'
import { useUserStore} from "@/stores/userStore.js";
import { useStudent } from "@/composables/useStudent.js";
import { useAuthStore } from "@/stores/authStore.js";
import {useRouter} from 'vue-router'

const { notifications, load, startPolling, reset } = useNotifications()
const userStore = useUserStore()
const authStore = useAuthStore()
const api = useStudent()
const router = useRouter()

onMounted(() => {
  load()
  startPolling()      // refresh every 60s; remove if you don't need it
})

async function markAllNotifications() {
   await api.markAllNotificationsRead()
}

async function markNotifications(id) {
  await api.markNotificationRead(id)
}

async function logout() {
  await authStore.logout()
  router.replace('/lms/login')
}
// leaving /lms (logout) clears data so the next user never sees stale items
onUnmounted(reset)
</script>

<template>
  <div class="page">
    <lms-header :notifications="notifications" :who="userStore.username"
                @mark-all-read="markAllNotifications" @mark-read="markNotifications" @logout="logout"/>
    <router-view />
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
</style>
