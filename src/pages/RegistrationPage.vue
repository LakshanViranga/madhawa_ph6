<script setup>
import {ref, reactive, computed, nextTick, onMounted} from 'vue'
import {normalizeLkMobile} from '@/utils/phone.js'
import {tenantName} from '@/config/tenant.js'
import {useStudentAuth} from '@/composables/useStudentAuth.js'
import {useRouter} from 'vue-router'
import {useHead} from "@unhead/vue";

useHead({
  title: 'Register | Create Your Tharka Account',
  meta: [
    {
      name: 'description',
      content: 'Create your Tharka account to access educational resources, learning materials and personalized learning features.'
    },
    {
      name: 'robots',
      content: 'noindex, follow'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: 'https://tharka.lk/lms/register'
    }
  ]
})
// The institute name comes from the build (vite.config define); the guard keeps the page working without it.
const tenant = (typeof tenantName !== 'undefined' && tenantName) || 'your class'
const {register, getBatchList} = useStudentAuth()
const router = useRouter()

const batches = ref([])
const MIN_PASSWORD = 10 // the same minimum the admin screens use

const form = reactive({name: '', phone: '', batchId: '', password: '', confirm: '', agree: false})
const touched = reactive({})
const submitted = ref(false)
const busy = ref(false)
const show = ref(false)
const serverError = ref('')

const textFields = [
  {key: 'name', label: 'Full name', type: 'text', autocomplete: 'name', placeholder: 'e.g. Kasun Perera', hint: ''},
  {
    key: 'phone',
    label: 'Mobile number (your login ID)',
    type: 'tel',
    autocomplete: 'tel',
    placeholder: '077 123 4567',
    hint: 'We will send a verification code to this number. You will use it to log in.'
  },
]

const errors = computed(() => {
  const e = {}
  const name = form.name.trim()
  if (name.length < 2 || name.length > 100) e.name = 'Enter your full name.'
  if (!normalizeLkMobile(form.phone)) e.phone = 'Enter a Sri Lankan mobile number, for example 077 123 4567.'
  if (!form.batchId) e.batchId = 'Choose your batch.'
  if (form.password.length < MIN_PASSWORD || form.password.length > 200) e.password = `Use at least ${MIN_PASSWORD} characters.`
  if (form.confirm !== form.password || !form.confirm) e.confirm = 'The two passwords do not match.'
  if (!form.agree) e.agree = 'Please tick the box so we can send you a verification code.'
  return e
})

// A message shows after the person leaves the field, or after they press the button
const shown = (key) => (submitted.value || touched[key] ? errors.value[key] ?? '' : '')
const summary = computed(() => (submitted.value ? Object.entries(errors.value) : []))
const aria = (key) => ({'aria-invalid': Boolean(shown(key)), 'aria-describedby': shown(key) ? `e-${key}` : undefined})

const focusField = (key) => document.getElementById(`f-${key}`)?.focus()

async function submit() {
  submitted.value = true
  serverError.value = ''
  const first = Object.keys(errors.value)[0]
  if (first) {
    await nextTick()
    focusField(first) // a keyboard or screen reader user lands on the first problem
    return
  }
  busy.value = true
  try {
    await send()
  } catch (err) {
    serverError.value = 'Something went wrong. Please check your connection and try again.'
  } finally {
    busy.value = false
  }
}

// The mobile number is the login ID, so send the normalized form to keep it consistent with login.
// On success the account exists but is unverified; the verification page finishes the sign-up.
const send = async () => {
  const phone = normalizeLkMobile(form.phone)
  const response = await register({
    name: form.name.trim(),
    phone,
    batch: form.batchId,
    password: form.password,
  })
  if (response?.ok) {
    router.push({path: '/lms/verification', query: {phone}})
  } else {
    serverError.value = response?.message || 'We could not create your account. Please try again.'
  }
}

onMounted(async () => {
  batches.value = await getBatchList()
})
</script>

<template>
  <main class="reg">
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
      <form class="card" novalidate @submit.prevent="submit">
        <!-- Two-step indicator: this page is step 1 -->
        <ol class="steps" aria-label="Sign-up steps">
          <li class="on" aria-current="step"><span>1</span>Your details</li>
          <li><span>2</span>Verify mobile</li>
        </ol>

        <h1>Create your account</h1>
        <p class="sub">Register for {{ tenant }}. We will verify your mobile number in the next step.</p>

        <div v-if="summary.length" class="summary" role="alert">
          <p>Please fix {{ summary.length === 1 ? 'this' : 'these' }} before continuing:</p>
          <ul>
            <li v-for="[key, message] in summary" :key="key">
              <a :href="`#f-${key}`" @click.prevent="focusField(key)">{{ message }}</a>
            </li>
          </ul>
        </div>

        <div v-if="serverError" class="summary" role="alert">
          <p>{{ serverError }}</p>
        </div>

        <fieldset class="group">
          <legend>About you</legend>
          <div class="cols">
            <label v-for="f in textFields" :key="f.key" :for="`f-${f.key}`">
              <span class="lbl">{{ f.label }}</span>
              <input :id="`f-${f.key}`" v-model="form[f.key]" :type="f.type" :autocomplete="f.autocomplete"
                     :placeholder="f.placeholder" maxlength="100" v-bind="aria(f.key)" @blur="touched[f.key] = true"/>
              <span v-if="shown(f.key)" :id="`e-${f.key}`" class="fe">{{ shown(f.key) }}</span>
              <span v-else-if="f.hint" class="hint">{{ f.hint }}</span>
            </label>
          </div>

          <label for="f-batchId">
            <span class="lbl">Batch</span>
            <select id="f-batchId" v-model="form.batchId" v-bind="aria('batchId')" @blur="touched.batchId = true">
              <option value="" disabled>Choose your batch</option>
              <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
            <span v-if="shown('batchId')" id="e-batchId" class="fe">{{ shown('batchId') }}</span>
          </label>
        </fieldset>

        <fieldset class="group">
          <legend>Secure your account</legend>
          <div class="cols">
            <label for="f-password">
              <span class="lbl">Password</span>
              <span class="pw">
                <input id="f-password" v-model="form.password" :type="show ? 'text' : 'password'"
                       autocomplete="new-password" maxlength="200" v-bind="aria('password')"
                       @blur="touched.password = true"/>
                <button type="button" class="toggle" :aria-pressed="show"
                        @click="show = !show">{{ show ? 'Hide' : 'Show' }}</button>
              </span>
              <span class="meter" aria-hidden="true">
                <i :class="{ ok: form.password.length >= MIN_PASSWORD }"
                   :style="{ width: Math.min(form.password.length / MIN_PASSWORD, 1) * 100 + '%' }"></i>
              </span>
              <span v-if="shown('password')" id="e-password" class="fe">{{ shown('password') }}</span>
              <span v-else class="hint">At least {{
                  MIN_PASSWORD
                }} characters. A few random words make a good password.</span>
            </label>

            <label for="f-confirm">
              <span class="lbl">Confirm password</span>
              <input id="f-confirm" v-model="form.confirm" :type="show ? 'text' : 'password'"
                     autocomplete="new-password" maxlength="200" v-bind="aria('confirm')"
                     @blur="touched.confirm = true"/>
              <span v-if="shown('confirm')" id="e-confirm" class="fe">{{ shown('confirm') }}</span>
            </label>
          </div>
        </fieldset>

        <div>
          <label class="agree" for="f-agree">
            <input id="f-agree" v-model="form.agree" type="checkbox" v-bind="aria('agree')"
                   @change="touched.agree = true"/>
            <span>I agree to receive a verification code on this mobile number.</span>
          </label>
          <span v-if="shown('agree')" id="e-agree" class="fe">{{ shown('agree') }}</span>
        </div>

        <button class="btn" type="submit" :disabled="busy">
          <span v-if="busy" class="spinner" aria-hidden="true"></span>
          {{ busy ? 'Creating your account...' : 'Create account' }}
        </button>

        <p class="help">Already registered?
          <router-link to="/lms/login">Log in</router-link>
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.reg {
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
  top: 40%;
  width: min(900px, 140vw);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, var(--accent-glow), transparent);
}

.orbits {
  position: absolute;
  left: 50%;
  top: 40%;
  width: min(820px, 150vw);
  transform: translate(-50%, -50%);
  fill: none;
  stroke: var(--secondary);
  stroke-width: 1;
  opacity: .25;
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
  place-items: start center;
  padding: 1rem 1.25rem 3rem;
}

.card {
  width: min(600px, 100%);
  display: grid;
  gap: 1.1rem;
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

.steps {
  display: flex;
  gap: .5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  flex: 1;
  display: flex;
  align-items: center;
  gap: .55rem;
  padding: .55rem .8rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: .82rem;
  font-weight: 600;
}

.steps span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: .75rem;
}

.steps li.on {
  border-color: var(--accent);
  background: var(--accent-glow);
  color: var(--heading);
}

.steps li.on span {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}

h1 {
  margin: .5rem 0 0;
  font: 700 clamp(1.7rem, 4vw, 2.1rem)/1.15 var(--font-display);
  color: var(--heading);
}

.sub {
  margin: 0;
  color: var(--muted);
  font-size: .95rem;
  line-height: 1.6;
}

.group {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
}

.group legend {
  padding: 0 .5rem;
  color: var(--secondary);
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
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

input:not([type='checkbox']), select {
  width: 100%;
  box-sizing: border-box;
  padding: .85rem .9rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 12px;
  font: inherit;
  transition: border-color .2s, box-shadow .2s;
}

input:focus, select:focus {
  border-color: var(--secondary);
  box-shadow: 0 0 0 4px var(--accent-glow);
  outline: none;
}

input[aria-invalid='true'], select[aria-invalid='true'] {
  border-color: var(--danger);
}

.hint {
  font-size: .8rem;
  color: var(--muted);
  line-height: 1.5;
}

.fe {
  font-size: .85rem;
  color: var(--danger);
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
  padding: .3rem .5rem;
  background: none;
  border: 0;
  color: var(--secondary);
  font: 700 .82rem var(--font-body);
  cursor: pointer;
}

.meter {
  display: block;
  height: 4px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
}

.meter i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--warning);
  transition: width .25s, background .25s;
}

.meter i.ok {
  background: var(--success);
}

.agree {
  display: flex;
  gap: .7rem;
  align-items: flex-start;
  color: var(--text);
  font-size: .92rem;
}

.agree input {
  margin-top: .25rem;
  accent-color: var(--accent);
}

.summary {
  padding: .9rem 1rem;
  border: 1px solid var(--danger);
  border-radius: 14px;
  background: var(--surface);
  font-size: .9rem;
}

.summary p {
  margin: 0 0 .4rem;
  color: var(--danger);
  font-weight: 600;
}

.summary p:last-child {
  margin-bottom: 0;
}

.summary ul {
  margin: 0;
  padding-left: 1.1rem;
}

.summary a {
  color: var(--text);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .6rem;
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

.help {
  margin: 0;
  text-align: center;
  font-size: .88rem;
  color: var(--muted);
}

.help a {
  color: var(--secondary);
  font-weight: 600;
}

a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .card {
    padding: 1.75rem 1.1rem;
    border-radius: 22px;
  }

  .cols {
    grid-template-columns: 1fr;
  }

  .steps li {
    font-size: .75rem;
    padding: .5rem .6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbits, .card, .spinner {
    animation: none;
  }

  .meter i {
    transition: none;
  }
}
</style>
