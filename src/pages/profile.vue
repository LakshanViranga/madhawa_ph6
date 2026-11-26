
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import LmsHeader from '@/components/LmsHeader.vue'
import { useStudent } from '@/composables/useStudent.js'
import AppLoader from "@/pages/AppLoader.vue";

const api = useStudent()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const loadError = ref('')
const error = ref('')
const message = ref('')

const isEditing = ref(false)
const showDeleteConfirmation = ref(false)
const deleteConfirmation = ref('')

const profile = ref({
  name: '',
  phone: '',
  city: '',
  batch: '',
  school: '',
})

const originalProfile = ref(null)

const sampleData = {
  "id": 125,
  "name": "Kasun Perera",
  "phone": "0771234567",
  "city": "Negombo",
  "batch": "2026 A/L",
  "school": "Maris Stella College"
}

async function loadProfile() {
  loading.value = true
  loadError.value = ''

  try {
    // Implement profile() in useStudent.js
     const r = await api.profileView()
    //
    if (!r.ok) {
      loadError.value = r.error || 'Unable to load your profile.'
      return
    }

    profile.value = {
      name: r.data.name ?? '',
      phone: r.data.phone ?? '',
      city: r.data.city ?? '',
      batch: r.data.batch ?? '',
      school: r.data.school ?? '',
    }

    originalProfile.value = { ...profile.value }
  } catch (e) {
    loadError.value = 'Something went wrong while loading your profile.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)

function editProfile() {
  originalProfile.value = { ...profile.value }
  error.value = ''
  message.value = ''
  isEditing.value = true
}

function cancelEdit() {
  profile.value = { ...originalProfile.value }
  isEditing.value = false
  error.value = ''
}

async function saveProfile() {
  error.value = ''
  message.value = ''

  if (!profile.value.name.trim()) {
    error.value = 'Please enter your student name.'
    return
  }
  saving.value = true

  try {
    const r = await api.updateProfile({
      name: profile.value.name.trim(),
      phone: profile.value.phone.trim(),
      city: profile.value.city.trim(),
      batch: profile.value.batch.trim(),
      school: profile.value.school.trim(),
    })

    if (!r.ok) {
      error.value = r.error || 'Unable to update your profile.'
      return
    }

    if (r.data) {
      profile.value = {
        name: r.data.name ?? profile.value.name,
        phone: r.data.phone ?? profile.value.phone,
        city: r.data.city ?? profile.value.city,
        batch: r.data.batch ?? profile.value.batch,
        school: r.data.school ?? profile.value.school,
      }
    }

    originalProfile.value = { ...profile.value }
    isEditing.value = false
    message.value = 'Your profile has been updated.'
  } catch (e) {
    error.value = 'Something went wrong while updating your profile.'
  } finally {
    saving.value = false
  }
}

async function deleteAccount() {
  if (deleteConfirmation.value !== 'DELETE') return

  error.value = ''
  deleting.value = true

  try {
    // Implement deleteAccount() in useStudent.js
    const r = await api.deleteAccount()

    if (!r.ok) {
      error.value = r.error || 'Unable to delete your account.'
      showDeleteConfirmation.value = false
      return
    }

    // Redirect after successful deletion
    router.replace('/lms/login')
  } catch (e) {
    error.value = 'Something went wrong while deleting your account.'
  } finally {
    deleting.value = false
  }
}

function closeDeleteDialog() {
  if (deleting.value) return

  showDeleteConfirmation.value = false
  deleteConfirmation.value = ''
}

</script>

<template>
  <div class="page">
    <main class="wrap">
      <h1>My Profile</h1>

      <p class="muted intro">
        Manage your personal information and account settings.
      </p>

      <p v-if="loadError" class="err" role="alert">
        {{ loadError }}
        <button class="text-button" @click="loadProfile">Try again</button>
      </p>

      <AppLoader v-else-if="loading" variant="cards" />
      <template v-else>
        <!-- Personal information -->
        <section class="panel profile-panel">
          <div class="panel-heading">
            <div>
              <h2>Personal information</h2>
              <p class="muted">Your student details</p>
            </div>

            <button
                v-if="!isEditing"
                class="btn ghost edit-btn"
                type="button"
                @click="editProfile"
            >
              Edit profile
            </button>
          </div>

          <form @submit.prevent="saveProfile">
            <div class="fields">
              <div class="field">
                <label for="student-name">Student name</label>
                <input
                    id="student-name"
                    v-model="profile.name"
                    type="text"
                    placeholder="Enter your full name"
                    :readonly="!isEditing"
                    :disabled="saving"
                    required
                />
              </div>

              <div class="field">
                <label for="student-phone">Phone number <span class="info" v-if="isEditing">To changed batch create issue or inform tutor</span></label>
                <input
                    id="student-phone"
                    v-model="profile.phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    readonly
                    :disabled="saving"
                    required
                />
              </div>

              <div class="field">
                <label for="student-city">City</label>
                <input
                    id="student-city"
                    v-model="profile.city"
                    type="text"
                    placeholder="Enter your city"
                    :readonly="!isEditing"
                    :disabled="saving"
                />
              </div>

              <div class="field">
                <label for="student-batch">Batch <span class="info" v-if="isEditing">To changed batch create issue or inform tutor</span></label>
                <input
                    id="student-batch"
                    v-model="profile.batch"
                    type="text"
                    placeholder="Your batch"
                    readonly
                    :disabled="saving"
                />
              </div>

              <div class="field full">
                <label for="student-school">School</label>
                <input
                    id="student-school"
                    v-model="profile.school"
                    type="text"
                    placeholder="Enter your school"
                    :readonly="!isEditing"
                    :disabled="saving"
                />
              </div>
            </div>

            <p v-if="error && !showDeleteConfirmation" class="err" role="alert">
              {{ error }}
            </p>

            <p v-if="message" class="ok" role="status">
              {{ message }}
            </p>

            <div v-if="isEditing" class="form-actions">
              <button
                  class="btn ghost"
                  type="button"
                  :disabled="saving"
                  @click="cancelEdit"
              >
                Cancel
              </button>

              <button class="btn" type="submit" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </form>
        </section>

        <!-- Account information -->
        <section class="panel account-panel">
          <h2>Account information</h2>
          <p class="muted">
            Keep your contact and student details up to date to help us
            provide the correct learning experience.
          </p>
        </section>

        <!-- Delete account -->
        <section class="panel danger-panel">
          <div>
            <h2>Delete account</h2>
            <p class="muted">
              Permanently delete your student account. Your access to
              classes and learning materials may be affected.
              This action cannot be undone.
            </p>
          </div>

          <button
              class="delete-btn"
              type="button"
              @click="showDeleteConfirmation = true"
          >
            Delete my account
          </button>
        </section>
      </template>
    </main>

    <!-- Delete confirmation -->
    <div
        v-if="showDeleteConfirmation"
        class="modal-overlay"
        @click.self="closeDeleteDialog"
    >
      <section
          class="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
      >
        <div class="warning-icon">!</div>

        <h2 id="delete-title">Delete your account?</h2>

        <p class="muted">
          This action is permanent. Your account and associated data
          may be deleted according to the platform's data-retention policy.
        </p>

        <div class="confirm-field">
          <label for="delete-confirm">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
              id="delete-confirm"
              v-model="deleteConfirmation"
              type="text"
              placeholder="Type DELETE"
              autocomplete="off"
              :disabled="deleting"
          />
        </div>

        <p v-if="error" class="err" role="alert">{{ error }}</p>

        <div class="modal-actions">
          <button
              class="btn ghost"
              type="button"
              :disabled="deleting"
              @click="closeDeleteDialog"
          >
            Cancel
          </button>

          <button
              class="delete-btn"
              type="button"
              :disabled="deleteConfirmation !== 'DELETE' || deleting"
              @click="deleteAccount"
          >
            {{ deleting ? 'Deleting...' : 'Permanently delete' }}
          </button>
        </div>
      </section>
    </div>
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

.wrap {
  max-width: 1020px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0 0 .5rem;
}

h2 {
  font: 600 1.15rem var(--font-display);
  margin: .2rem 0 .4rem;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: 0;
}

.intro {
  margin-bottom: 1.5rem;
}

.empty {
  margin: 1.5rem 0;
}

.panel {
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  margin-bottom: 1.2rem;
}

.profile-panel {
  border-color: var(--gold);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid var(--line);
}

.panel-heading .muted {
  margin-top: .2rem;
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: .45rem;
  min-width: 0;
}

.field.full {
  grid-column: 1 / -1;
}

.field label,
.confirm-field label {
  color: var(--muted);
  font-size: .85rem;
  font-weight: 600;
}

.field input,
.confirm-field input {
  width: 100%;
  box-sizing: border-box;
  padding: .7rem .9rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: 500 .95rem var(--font-body);
  outline: none;
  transition: border-color .2s, box-shadow .2s;
}

.field input:focus,
.confirm-field input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px var(--gold-glow);
}

.field input:read-only {
  color: var(--text);
  opacity: .85;
  cursor: default;
}

.field input:disabled {
  opacity: .6;
}

.btn {
  display: inline-block;
  padding: .65rem 1.2rem;
  border-radius: 6px;
  border: 1px solid var(--gold);
  background: var(--gold);
  color: var(--on-gold);
  font: 600 .92rem var(--font-body);
  text-decoration: none;
  cursor: pointer;
  transition: background .2s, opacity .2s;
}

.btn:hover {
  background: var(--gold-soft);
}

.btn.ghost {
  background: transparent;
  color: var(--gold);
}

.btn.ghost:hover {
  background: var(--gold-glow);
}

.btn:disabled,
.delete-btn:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.edit-btn {
  flex-shrink: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: .6rem;
  margin-top: 1.4rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--line);
}

.account-panel h2 {
  margin-bottom: .5rem;
}

.account-panel p {
  max-width: 650px;
  line-height: 1.7;
}

.danger-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  border-color: rgba(220, 70, 70, .35);
  margin-top: 2rem;
}

.danger-panel h2 {
  color: var(--danger);
}

.danger-panel p {
  max-width: 620px;
  line-height: 1.7;
}

.delete-btn {
  flex-shrink: 0;
  padding: .65rem 1.2rem;
  border: 1px solid var(--danger);
  border-radius: 6px;
  background: transparent;
  color: var(--danger);
  font: 600 .9rem var(--font-body);
  cursor: pointer;
  transition: .2s;
}

.info {
  color: var(--danger);
}

.delete-btn:hover:not(:disabled) {
  background: var(--danger);
  color: white;
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: .8rem 0 0;
}

.ok {
  color: var(--gold);
  font-size: .9rem;
  margin: .8rem 0 0;
}

.text-button {
  border: 0;
  padding: 0;
  margin-left: .5rem;
  background: transparent;
  color: var(--gold);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}

/* Confirmation dialog */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, .65);
  backdrop-filter: blur(4px);
}

.confirm-modal {
  width: min(100%, 430px);
  padding: 1.6rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .3);
}

.warning-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: rgba(220, 70, 70, .12);
  color: var(--danger);
  font-weight: 800;
  font-size: 1.3rem;
}

.confirm-modal > p {
  line-height: 1.7;
  margin: .7rem 0 1.2rem;
}

.confirm-field {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

.confirm-field strong {
  color: var(--text);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .6rem;
  margin-top: 1.4rem;
}

@media (max-width: 600px) {
  .wrap {
    padding: 1.5rem 1rem 3rem;
  }

  .panel {
    padding: 1.1rem;
  }

  .fields {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .field.full {
    grid-column: auto;
  }

  .danger-panel {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
  }

  .danger-panel .delete-btn {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}

button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}
</style>
