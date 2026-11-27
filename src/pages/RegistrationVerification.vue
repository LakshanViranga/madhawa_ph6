<script setup>
import {ref, computed, onMounted, onBeforeUnmount, nextTick} from 'vue'
import AuthLayout from '@/components/AuthLayout.vue'
import {useRouter, useRoute} from 'vue-router'
import {useStudentAuth} from '@/composables/useStudentAuth.js'
import {formatLkMobile} from '@/utils/phone.js'

const router = useRouter()
const route = useRoute()
const {verifyRegistration, resendRegistrationCode} = useStudentAuth()

const CODE_LENGTH = 6
const code = ref('')
const submitted = ref(false)
const busy = ref(false)
const resendBusy = ref(false)
const verified = ref(false)
const error = ref('')
const resendMessage = ref('')
const secondsLeft = ref(60)
let timer = null

// The registration page sends the normalized mobile number (the login ID):
// router.push({ path: '/lms/verification', query: { phone } })
const phone = computed(() => String(route.query.phone || ''))
const phoneShown = computed(() => (phone.value ? formatLkMobile(phone.value) : ''))
const maskedPhone = computed(() => {
  const value = phone.value.replace(/\s+/g, '')
  if (!value) return 'your mobile number'
  if (value.length < 6) return value
  return `${value.slice(0, 3)} ${'•'.repeat(Math.max(0, value.length - 5))}${value.slice(-2)}`
})

const canVerify = computed(() => code.value.length === CODE_LENGTH && !busy.value)
const canResend = computed(() => secondsLeft.value === 0 && !resendBusy.value)

function startTimer() {
  clearInterval(timer)
  secondsLeft.value = 60
  timer = setInterval(() => {
    if (secondsLeft.value > 0) {
      secondsLeft.value -= 1
    } else {
      clearInterval(timer)
    }
  }, 1000)
}

function handleInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
  code.value = value
  error.value = ''
  resendMessage.value = ''
}

function handlePaste(event) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') || ''
  code.value = pasted.replace(/\D/g, '').slice(0, CODE_LENGTH)
  error.value = ''
}

async function verify() {
  submitted.value = true
  error.value = ''

  if (code.value.length !== CODE_LENGTH) {
    error.value = `Enter the ${CODE_LENGTH}-digit verification code.`
    await nextTick()
    document.getElementById('verification-code')?.focus()
    return
  }

  busy.value = true

  try {
    const response = await verifyRegistration({
      phone: phone.value,
      code: code.value,
    })

    if (!response?.ok) {
      error.value = response?.message || 'That code is incorrect or has expired. Please try again.'
      code.value = ''
      await nextTick()
      document.getElementById('verification-code')?.focus()
      return
    }

    // Self-verification: the account is active as soon as the code is confirmed.
    verified.value = true
  } catch (err) {
    error.value = 'We could not verify your code right now. Please try again.'
  } finally {
    busy.value = false
  }
}

async function resend() {
  if (!canResend.value) return

  resendBusy.value = true
  error.value = ''
  resendMessage.value = ''

  try {
    const response = await resendRegistrationCode({phone: phone.value})

    if (!response?.ok) {
      error.value = response?.message || 'We could not send a new code. Please try again.'
      return
    }

    code.value = ''
    resendMessage.value = 'A new verification code has been sent to your mobile number.'
    startTimer()

    await nextTick()
    document.getElementById('verification-code')?.focus()
  } catch (err) {
    error.value = 'We could not send a new code right now. Please try again.'
  } finally {
    resendBusy.value = false
  }
}

onMounted(() => {
  // Without a phone number there is nothing to verify, so send the person back to register.
  if (!phone.value) {
    router.replace('/lms/register')
    return
  }
  startTimer()
})

onBeforeUnmount(() => {
  clearInterval(timer)
})
</script>

<template>
  <AuthLayout quote="One small step. Then you're in.">
    <div v-if="verified" class="box" role="status">
      <div class="success-icon" aria-hidden="true">✓</div>

      <h1>Number verified</h1>

      <p class="muted">
        Your account is ready. Log in with your mobile number
        <b v-if="phoneShown">{{ phoneShown }}</b>
        as your login ID, and the password you chose.
      </p>

      <button class="btn" type="button" @click="router.push('/lms/login')">
        Continue to login
      </button>

      <router-link to="/" class="back">Back to website</router-link>
    </div>

    <form v-else class="box" novalidate @submit.prevent="verify">
      <div class="code-icon" aria-hidden="true">
        <span>•••</span>
      </div>

      <h1>Verify your number</h1>

      <p class="muted">
        We sent a 6-digit verification code to
        <b>{{ maskedPhone }}</b>.
        Enter it below to confirm your mobile number. It is also your login ID.
      </p>

      <div
          v-if="error"
          class="summary"
          role="alert"
          aria-live="polite"
      >
        {{ error }}
      </div>

      <label for="verification-code">
        Verification code

        <input
            id="verification-code"
            :value="code"
            class="code-input"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            pattern="[0-9]*"
            placeholder="000000"
            :aria-invalid="Boolean(error)"
            aria-describedby="code-help"
            @input="handleInput"
            @paste="handlePaste"
        />

        <span id="code-help" class="hint">
          Enter the 6 digits from the message we sent you.
        </span>
      </label>

      <button class="btn" type="submit" :disabled="!canVerify">
        {{ busy ? 'Verifying...' : 'Verify number' }}
      </button>

      <p v-if="resendMessage" class="success-message" role="status">
        {{ resendMessage }}
      </p>

      <div class="resend">
        <span class="muted-small">Didn't receive the code?</span>

        <button
            type="button"
            class="resend-btn"
            :disabled="!canResend"
            @click="resend"
        >
          <template v-if="resendBusy">Sending...</template>
          <template v-else-if="secondsLeft > 0">
            Resend in {{ secondsLeft }}s
          </template>
          <template v-else>
            Resend code
          </template>
        </button>
      </div>

      <p class="help">
        Make sure your mobile number is correct and that you have an active
        internet connection.
      </p>

      <router-link to="/lms/register" class="back">
        Back to registration
      </router-link>
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
  color: var(--heading);
}

.muted {
  color: var(--muted);
  margin: 0 0 .5rem;
  line-height: 1.6;
}

.muted-small {
  color: var(--muted);
  font-size: .85rem;
}

.code-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid var(--accent);
  border-radius: 50%;
  color: var(--secondary);
  font: 700 1.1rem var(--font-body);
  letter-spacing: .12em;
}

.code-icon span {
  transform: translateX(.08em);
}

.success-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid var(--accent);
  border-radius: 50%;
  color: var(--on-accent);
  background: var(--accent);
  font: 700 1.5rem var(--font-body);
}

label {
  display: grid;
  gap: .4rem;
  font-size: .9rem;
  color: var(--muted);
}

.code-input {
  width: 100%;
  box-sizing: border-box;
  padding: .85rem .8rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: 600 1.35rem var(--font-body);
  letter-spacing: .45em;
  text-align: center;
}

.code-input::placeholder {
  color: var(--muted);
  opacity: .55;
  letter-spacing: .35em;
}

.code-input:focus {
  border-color: var(--accent);
  outline: none;
}

.code-input[aria-invalid='true'] {
  border-color: var(--danger);
}

.hint {
  font-size: .8rem;
  color: var(--muted);
}

.summary {
  padding: .9rem 1rem;
  border: 1px solid var(--danger);
  border-radius: 6px;
  background: var(--surface);
  color: var(--danger);
  font-size: .9rem;
  line-height: 1.5;
}

.btn {
  padding: .85rem;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font: 600 1rem var(--font-body);
  cursor: pointer;
}

.btn:hover {
  background: var(--heading);
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.resend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .35rem;
  min-height: 1.5rem;
}

.resend-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--secondary);
  font: 600 .85rem var(--font-body);
  cursor: pointer;
}

.resend-btn:hover:not(:disabled) {
  color: var(--heading);
}

.resend-btn:disabled {
  color: var(--muted);
  cursor: not-allowed;
}

.success-message {
  margin: -.35rem 0 0;
  color: var(--heading);
  font-size: .85rem;
  line-height: 1.5;
  text-align: center;
}

.help {
  font-size: .8rem;
  line-height: 1.5;
  color: var(--muted);
  margin: 0;
  text-align: center;
}

.back {
  color: var(--secondary);
  font-size: .9rem;
  text-decoration: none;
  text-align: center;
}

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--heading);
  outline-offset: 3px;
}

@media (max-width: 480px) {
  .box {
    max-width: 100%;
  }

  h1 {
    font-size: 1.8rem;
  }

  .code-input {
    font-size: 1.2rem;
  }
}
</style>
