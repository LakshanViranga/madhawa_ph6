<script setup>
import {onMounted, ref} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {useStudentAuth} from '@/composables/useStudentAuth.js'
import {normalizeLkMobile} from '@/utils/phone.js'
import { useAuthStore } from "@/stores/authStore.js";
import { useHead } from "@unhead/vue";

useHead({
  title: 'Login | Tharka',
  meta: [
    {
      name: 'description',
      content: 'Log in to your Tharka account to access your learning resources, account details and personalized educational services.'
    },
    {
      name: 'robots',
      content: 'noindex, follow'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://tharka.lk/lms/login'
    }
  ]
})

const {init, login} = useStudentAuth()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// The mobile number is the login ID. It can be prefilled with ?phone=
const id = ref(String(route.query.phone || ''))
const password = ref('')
const show = ref(false)
const busy = ref(false)
const error = ref('')
let fails = 0
let lockUntil = 0

const submit = async () => {
  const wait = Math.ceil((lockUntil - Date.now()) / 1000)
  if (wait > 0) return (error.value = `Too many attempts. Try again in ${wait} seconds.`)

  // Same normalization as registration, so 077 123 4567 and 0771234567 are the same ID
  const phone = normalizeLkMobile(id.value)
  if (!phone) return (error.value = 'Enter the mobile number you registered with, for example 077 123 4567.')

  busy.value = true
  error.value = ''
  try {
    const res = await login(phone, password.value)
    if (res?.ok) {
      password.value = ''
      fails = 0
      const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
          ? route.query.redirect
          : '/lms'
      authStore.setUser(res.user)
      router.push(target)
      return
    }
    error.value = res?.error || 'Login failed.'
    if (++fails >= 5) {
      lockUntil = Date.now() + 30000
      fails = 0
    }
  } catch (err) {
    error.value = 'We could not log you in right now. Please try again.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  init()
})
</script>

<template>
  <main class="login">
    <section class="side" aria-hidden="true">
      <router-link to="/" class="brand">Tharka</router-link>
      <svg class="wave" viewBox="0 0 600 120" preserveAspectRatio="none">
        <path d="M0 60 C 50 0, 100 0, 150 60 S 250 120, 300 60 S 400 0, 450 60 S 550 120, 600 60"/>
      </svg>
      <p class="quote">One quiz a week. Every mark counts toward your A.</p>
    </section>

    <section class="panel">
      <form class="box" @submit.prevent="submit">
        <h1>Student login</h1>
        <p class="muted">Log in with the mobile number you registered with and your password.</p>

        <label>Mobile number
          <input v-model="id" type="tel" inputmode="tel" placeholder="e.g. 077 123 4567" autocomplete="username"
                 required/>
        </label>

        <label>Password
          <span class="pw">
            <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" required/>
            <button type="button" class="toggle" @click="show = !show">{{ show ? 'Hide' : 'Show' }}</button>
          </span>
        </label>

        <button class="btn" type="submit" :disabled="busy">{{ busy ? 'Checking...' : 'Log in' }}</button>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <p class="help">Forgot your password? <a href="https://wa.me/94771234567" target="_blank" rel="noopener">Message
          your teacher on WhatsApp</a></p>
        <p class="help">New student?
          <router-link to="/lms/register">Create an account</router-link>
        </p>
        <router-link to="/" class="back">Back to website</router-link>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}

.side {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2.5rem;
  background: var(--bg-alt);
  border-right: 1px solid var(--line);
}

.brand {
  font: 600 1.4rem var(--font-display);
  color: var(--gold);
  text-decoration: none;
  position: relative;
  z-index: 1;
}

.wave {
  position: absolute;
  left: 0;
  right: 0;
  top: 40%;
  width: 100%;
  height: 160px;
  opacity: .6;
}

.wave path {
  fill: none;
  stroke: var(--gold);
  stroke-width: 2;
  stroke-dasharray: 1400;
  stroke-dashoffset: 1400;
  animation: draw 3s ease-out forwards;
}

.err {
  margin: 0;
  color: var(--danger);
  font-size: .9rem;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.quote {
  position: relative;
  font: 600 clamp(1.5rem, 3vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  max-width: 16ch;
  line-height: 1.2;
  margin: 0;
}

.panel {
  display: grid;
  place-items: center;
  padding: 2rem 1.25rem;
}

.box {
  width: 100%;
  max-width: 380px;
  display: grid;
  gap: 1.1rem;
}

h1 {
  font: 600 2rem var(--font-display);
  margin: 0;
  color: var(--gold-soft);
}

.muted {
  color: var(--muted);
  margin: 0 0 .5rem;
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

.btn {
  padding: .85rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 1rem var(--font-body);
  cursor: pointer;
}

.btn:hover {
  background: var(--gold-soft);
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.help {
  font-size: .85rem;
  color: var(--muted);
  margin: 0;
}

.help a, .back {
  color: var(--gold);
}

.back {
  font-size: .9rem;
  text-decoration: none;
}

a:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .login {
    grid-template-columns: 1fr;
  }

  .side {
    min-height: 150px;
    padding: 1.5rem;
  }

  .quote, .wave {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wave path {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
