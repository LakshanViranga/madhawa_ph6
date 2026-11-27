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
    <!-- Atmosphere: soft glow plus slowly turning orbits behind the card -->
    <div class="bg" aria-hidden="true">
      <span class="glow"></span>
      <svg class="orbits" viewBox="0 0 400 400">
        <g transform="translate(200 200)">
          <ellipse rx="190" ry="68"/>
          <ellipse rx="190" ry="68" transform="rotate(60)"/>
          <ellipse rx="190" ry="68" transform="rotate(120)"/>
          <circle r="7"/>
        </g>
      </svg>
    </div>

    <header class="top">
      <router-link to="/" class="brand">Tharka</router-link>
      <router-link to="/" class="back">Back to website</router-link>
    </header>

    <section class="stage">
      <form class="card" @submit.prevent="submit">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M2 12c2.5-8 5.5-8 8 0s5.5 8 8 0 2.5-4 4-4"/>
          </svg>
        </span>
        <h1>Welcome back</h1>
        <p class="sub">Log in with the mobile number you registered with and your password.</p>

        <label>
          <span class="lbl">Mobile number</span>
          <span class="field">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>
            <input v-model="id" type="tel" inputmode="tel" placeholder="e.g. 077 123 4567" autocomplete="username" required/>
          </span>
        </label>

        <label>
          <span class="lbl">Password</span>
          <span class="field">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" required/>
            <button type="button" class="toggle" :aria-pressed="show" @click="show = !show">{{ show ? 'Hide' : 'Show' }}</button>
          </span>
        </label>

        <p v-if="error" class="err" role="alert">{{ error }}</p>

        <button class="btn" type="submit" :disabled="busy">
          <span v-if="busy" class="spinner" aria-hidden="true"></span>
          {{ busy ? 'Checking...' : 'Log in' }}
        </button>

        <p class="or"><span>New here?</span></p>

        <div class="alt">
          <router-link to="/lms/register" class="ghost">Create an account</router-link>
          <a class="ghost" href="https://wa.me/94771234567" target="_blank" rel="noopener">Forgot password? WhatsApp</a>
        </div>
      </form>

      <ul class="perks" aria-label="What you get">
        <li>Weekly quiz</li>
        <li>Marks and progress</li>
        <li>Discussion videos</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.login {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}

/* Background */
.bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.glow {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(900px, 140vw);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, var(--accent-glow), transparent);
}

.orbits {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(820px, 150vw);
  transform: translate(-50%, -50%);
  fill: none;
  stroke: var(--secondary);
  stroke-width: 1;
  opacity: .28;
  animation: turn 60s linear infinite;
}

.orbits circle {
  fill: var(--accent);
  stroke: none;
}

@keyframes turn {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* Top bar */
.top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem clamp(1.25rem, 4vw, 2.5rem);
}

.brand {
  font: 700 1.3rem var(--font-display);
  color: var(--heading);
  text-decoration: none;
}

.back {
  padding: .45rem .95rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-glass);
  color: var(--text);
  font-size: .88rem;
  text-decoration: none;
  transition: border-color .2s;
}

.back:hover {
  border-color: var(--secondary);
}

/* Card */
.stage {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem 3rem;
}

.card {
  width: min(420px, 100%);
  display: grid;
  gap: 1rem;
  padding: 2.25rem 2rem;
  background: var(--bg-glass);
  backdrop-filter: blur(14px);
  border: 1px solid var(--line);
  border-radius: 28px;
  box-shadow: 0 24px 70px var(--accent-glow);
  animation: lift .8s cubic-bezier(.2, .7, .2, 1) both;
}

@keyframes lift {
  from {
    opacity: 0;
    transform: translateY(24px) scale(.97);
  }
}

.mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: var(--accent);
  color: var(--on-accent);
}

h1 {
  margin: .25rem 0 0;
  font: 700 2rem/1.15 var(--font-display);
  color: var(--heading);
}

.sub {
  margin: 0 0 .5rem;
  color: var(--muted);
  font-size: .95rem;
  line-height: 1.6;
}

label {
  display: grid;
  gap: .4rem;
}

.lbl {
  font-size: .85rem;
  font-weight: 600;
  color: var(--muted);
}

.field {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: 0 .9rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  color: var(--muted);
  transition: border-color .2s, box-shadow .2s;
}

.field:focus-within {
  border-color: var(--secondary);
  box-shadow: 0 0 0 4px var(--accent-glow);
  color: var(--secondary);
}

.field input {
  flex: 1;
  min-width: 0;
  padding: .9rem 0;
  background: none;
  border: 0;
  outline: none;
  color: var(--text);
  font: inherit;
}

.toggle {
  padding: .3rem .5rem;
  background: none;
  border: 0;
  color: var(--secondary);
  font: 700 .82rem var(--font-body);
  cursor: pointer;
}

.err {
  margin: 0;
  padding: .7rem .9rem;
  background: var(--accent-glow);
  border: 1px solid var(--danger);
  border-radius: 12px;
  color: var(--danger);
  font-size: .9rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
  margin-top: .25rem;
  padding: .95rem;
  border: 0;
  border-radius: 14px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font: 700 1rem var(--font-body);
  cursor: pointer;
  transition: transform .15s, box-shadow .2s;
}

.btn:hover:not(:disabled) {
  box-shadow: 0 0 0 5px var(--accent-glow);
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: scale(.98);
}

.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.or {
  position: relative;
  margin: .5rem 0 0;
  text-align: center;
  color: var(--muted);
  font-size: .82rem;
}

.or::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px solid var(--line);
}

.or span {
  position: relative;
  padding: 0 .75rem;
  background: var(--bg);
  border-radius: 99px;
}

.alt {
  display: grid;
  gap: .6rem;
}

.ghost {
  padding: .75rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  color: var(--text);
  font-size: .92rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: border-color .2s, color .2s;
}

.ghost:hover {
  border-color: var(--secondary);
  color: var(--secondary);
}

/* Perks under the card */
.perks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.perks li {
  padding: .4rem .9rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-glass);
  color: var(--muted);
  font-size: .82rem;
}

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

@media (max-width: 480px) {
  .card {
    padding: 1.75rem 1.25rem;
    border-radius: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbits, .card, .spinner {
    animation: none;
  }
}
</style>
