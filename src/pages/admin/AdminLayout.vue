<script setup>
import {ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import PrefsSwitch from '@/components/PrefsSwitch.vue' // adjust to your folder name
import {useAdminAuth} from '@/composables/useAdminAuth.js'
import {useNoIndex} from '@/composables/useNoIndex.js'
import '@/assets/admin.css'
import { useAuthStore } from "@/stores/authStore.js";

const route = useRoute()
const router = useRouter()
const {logout} = useAdminAuth()
const authStore = useAuthStore()

useNoIndex()

const open = ref(false)
const loggingOut = ref(false)

const links = [
  ['Dashboard', '/admin'],
  ['Classes', '/admin/classes'],
  ['Quizzes', '/admin/quizzes'],
  ['Students', '/admin/students'],
  ['Requests', '/admin/registrations'],
  ['Results', '/admin/results'],
  ['Users', '/admin/users'],
  ['Issues', '/admin/issues'],
  ['Announcements', '/admin/announcements'],
]

// Close the mobile sidebar after any navigation
watch(() => route.fullPath, () => (open.value = false))

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authStore.logout()                     // wait until the session is cleared
  } finally {
    loggingOut.value = false
  }
  router.replace('/admin/login')        // replace so Back doesn't return to a protected page
}
</script>

<template>
  <div class="admin">
    <!-- Sidebar -->
    <aside :class="{ open }">
      <router-link to="/" class="brand">Your Name</router-link>
      <small>Admin panel</small>

      <nav aria-label="Admin">
        <router-link
            v-for="[label, to] in links"
            :key="to"
            :to="to"
            exact-active-class="on"
            :active-class="to === '/admin' ? '' : 'on'"
        >
          {{ label }}
        </router-link>
      </nav>
    </aside>

    <div class="main">
      <!-- Header -->
      <header class="top">
        <button
            type="button"
            class="menu"
            aria-label="Menu"
            :aria-expanded="open"
            @click="open = !open"
        >
          Menu
        </button>

        <div class="right">
          <PrefsSwitch/>
          <button
              type="button"
              class="btn ghost sm"
              :disabled="loggingOut"
              @click="handleLogout"
          >
            {{ loggingOut ? 'Logging out...' : 'Log out' }}
          </button>
        </div>
      </header>

      <!-- Page content -->
      <div class="content">
        <router-view/>
      </div>
    </div>
  </div>
</template>
