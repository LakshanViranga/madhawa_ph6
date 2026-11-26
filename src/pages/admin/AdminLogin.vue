<script setup>
import {ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import PrefsSwitch from '@/components/PrefsSwitch.vue' // adjust to your folder name
import {useAdminAuth} from '@/composables/useAdminAuth'
import {useNoIndex} from '@/composables/useNoIndex'
import '@/assets/admin.css'
import { useAuthStore } from "@/stores/authStore.js";

const route = useRoute()
const router = useRouter()
const {login} = useAdminAuth()
const authStore = useAuthStore()

useNoIndex()

const email = ref('')
const password = ref('')
const show = ref(false)
const busy = ref(false)
const error = ref('')
let fails = 0
let lockUntil = 0

// Only allow redirects back into the admin area (prevents open redirects)
function redirectTarget() {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/admin') && !target.startsWith('/admin/login')
      ? target
      : '/admin'
}

async function submit() {
  const wait = Math.ceil((lockUntil - Date.now()) / 1000)
  if (wait > 0) {
    error.value = `Too many attempts. Try again in ${wait} seconds.`
    return
  }

  busy.value = true
  error.value = ''
  const res = await login(email.value.trim(), password.value)
  busy.value = false

  if (res.ok) {
    password.value = ''
    fails = 0
    authStore.setUser(res.user)
    router.replace(redirectTarget())
    return
  }

  error.value = res.error || 'Login failed.'
  if (++fails >= 5) {
    lockUntil = Date.now() + 30000
    fails = 0
  }
}
</script>

<template>
  <main class="gate">
    <div class="corner">
      <PrefsSwitch/>
    </div>

    <form class="box" @submit.prevent="submit">
      <router-link to="/" class="brand">Your Name</router-link>
      <h1>Admin login</h1>
      <p class="muted">For the teacher only. Students log in at the student portal.</p>

      <label>Email
        <input v-model="email" type="email" autocomplete="username" required/>
      </label>

      <label>Password
        <span class="pw">
          <input
              v-model="password"
              :type="show ? 'text' : 'password'"
              autocomplete="current-password"
              required
          />
          <button type="button" class="toggle" @click="show = !show">
            {{ show ? 'Hide' : 'Show' }}
          </button>
        </span>
      </label>

      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <button class="go" type="submit" :disabled="busy">
        {{ busy ? 'Checking...' : 'Log in' }}
      </button>

      <router-link to="/lms/login" class="back">Go to student login</router-link>
    </form>
  </main>
</template>

<style scoped>
.gate {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem 1.25rem;
  position: relative;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}

.corner {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.box {
  width: 100%;
  max-width: 380px;
  display: grid;
  gap: 1.1rem;
  padding: 2rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--surface);
}

.brand {
  font: 600 1.3rem var(--font-display);
  color: var(--gold);
  text-decoration: none;
}

h1 {
  font: 600 1.9rem var(--font-display);
  color: var(--gold-soft);
  margin: 0;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

label {
  display: grid;
  gap: .4rem;
  font-size: .9rem;
  color: var(--muted);
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: .8rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

input:focus {
  border-color: var(--gold);
  outline: none;
}

.pw {
  position: relative;
  display: block;
}

.pw input {
  padding-right: 4.5rem;
}

.toggle {
  position: absolute;
  right: .5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: 0;
  color: var(--gold);
  font: 600 .85rem var(--font-body);
  cursor: pointer;
}

.err {
  margin: 0;
  color: var(--danger);
  font-size: .9rem;
}

.go {
  padding: .85rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 1rem var(--font-body);
  cursor: pointer;
}

.go:hover:not(:disabled) {
  background: var(--gold-soft);
}

.go:disabled {
  opacity: .6;
  cursor: wait;
}

.back {
  color: var(--gold);
  font-size: .9rem;
  text-decoration: none;
}

a:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}
</style>
