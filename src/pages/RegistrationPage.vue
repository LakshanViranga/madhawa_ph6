<script setup>
import {ref, reactive, computed, nextTick, onMounted} from 'vue'
import AuthLayout from '@/components/AuthLayout.vue'
import {normalizeLkMobile} from '@/utils/phone.js'
import {tenantName} from '@/config/tenant.js'
import {useStudentAuth} from '@/composables/useStudentAuth.js'
import {useRouter} from 'vue-router'
import { useHead } from "@unhead/vue";

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
  <AuthLayout quote="Join the class. One quiz a week.">
    <form class="box" novalidate @submit.prevent="submit">
      <h1>Create your account</h1>
      <p class="muted">Register for {{ tenant }}. We will verify your mobile number in the next step.</p>

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

      <label v-for="f in textFields" :key="f.key" :for="`f-${f.key}`">{{ f.label }}
        <input :id="`f-${f.key}`" v-model="form[f.key]" :type="f.type" :autocomplete="f.autocomplete"
               :placeholder="f.placeholder" maxlength="100" v-bind="aria(f.key)" @blur="touched[f.key] = true"/>
        <span v-if="shown(f.key)" :id="`e-${f.key}`" class="fe">{{ shown(f.key) }}</span>
        <span v-else-if="f.hint" class="hint">{{ f.hint }}</span>
      </label>

      <label for="f-batchId">Batch
        <select id="f-batchId" v-model="form.batchId" v-bind="aria('batchId')" @blur="touched.batchId = true">
          <option value="" disabled>Choose your batch</option>
          <option v-for="b in batches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <span v-if="shown('batchId')" id="e-batchId" class="fe">{{ shown('batchId') }}</span>
      </label>

      <label for="f-password">Password
        <span class="pw">
          <input id="f-password" v-model="form.password" :type="show ? 'text' : 'password'" autocomplete="new-password"
                 maxlength="200" v-bind="aria('password')" @blur="touched.password = true"/>
          <button type="button" class="toggle" :aria-pressed="show" @click="show = !show">{{
              show ? 'Hide' : 'Show'
            }}</button>
        </span>
        <span v-if="shown('password')" id="e-password" class="fe">{{ shown('password') }}</span>
        <span v-else class="hint">At least {{ MIN_PASSWORD }} characters. A few random words make a good password.</span>
      </label>

      <label for="f-confirm">Confirm password
        <input id="f-confirm" v-model="form.confirm" :type="show ? 'text' : 'password'" autocomplete="new-password"
               maxlength="200" v-bind="aria('confirm')" @blur="touched.confirm = true"/>
        <span v-if="shown('confirm')" id="e-confirm" class="fe">{{ shown('confirm') }}</span>
      </label>

      <div>
        <label class="agree" for="f-agree">
          <input id="f-agree" v-model="form.agree" type="checkbox" v-bind="aria('agree')"
                 @change="touched.agree = true"/>
          <span>I agree to receive a verification code on this mobile number.</span>
        </label>
        <span v-if="shown('agree')" id="e-agree" class="fe">{{ shown('agree') }}</span>
      </div>

      <button class="btn" type="submit" :disabled="busy">{{
          busy ? 'Creating your account...' : 'Create account'
        }}
      </button>
      <p class="help">Already registered?
        <router-link to="/lms/login">Log in</router-link>
      </p>
      <router-link to="/" class="back">Back to website</router-link>
    </form>
  </AuthLayout>
</template>

<style scoped>
.box {
  width: 100%;
  max-width: 400px;
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

input:not([type='checkbox']), select {
  width: 100%;
  box-sizing: border-box;
  padding: .8rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

input:focus, select:focus {
  border-color: var(--gold);
  outline: none;
}

input[aria-invalid='true'], select[aria-invalid='true'] {
  border-color: var(--danger);
}

.hint {
  font-size: .8rem;
  color: var(--muted);
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
  background: none;
  border: 0;
  color: var(--gold);
  font: 600 .85rem var(--font-body);
  cursor: pointer;
}

.agree {
  display: flex;
  gap: .7rem;
  align-items: flex-start;
  color: var(--text);
}

.agree input {
  margin-top: .25rem;
  accent-color: var(--gold);
}

.summary {
  padding: .9rem 1rem;
  border: 1px solid var(--danger);
  border-radius: 6px;
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

a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}
</style>
