<script setup>
import {useI18n} from 'vue-i18n'
import {classes} from '@/data/classes'
import {waLink} from '@/data/tutor'
import {useLocalized} from '@/composables/useLocalized'
import {useRegistration} from '@/composables/useRegistration'

const {t} = useI18n()
const {L} = useLocalized()
const {form, sending, sent, failed, error, submit} = useRegistration()
</script>

<template>
  <div v-if="sent" class="done" role="status">
    <h3>{{ t('contact.sentTitle') }}</h3>
    <p>{{ t('contact.sentText') }}</p>
    <p class="muted">{{ t('contact.whatsappAlso') }}</p>
    <a class="btn btn-gold" :href="waLink(t('site.whatsappText'))" target="_blank"
       rel="noopener">{{ t('contact.whatsapp') }}</a>
  </div>

  <form v-else class="form" @submit.prevent="submit">
    <label>{{ t('contact.name') }}
      <input v-model="form.student_name" name="student_name" type="text" autocomplete="name" maxlength="100" required/>
    </label>
    <label>{{ t('contact.phone') }}
      <input v-model="form.phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20"
             placeholder="077 123 4567" required/>
    </label>
    <label>{{ t('contact.class') }}
      <select v-model="form.class_name" name="class_name">
        <option value="">{{ t('contact.notSure') }}</option>
        <option v-for="c in classes" :key="c.id" :value="L(c.title)">{{ L(c.title) }}</option>
      </select>
    </label>
    <label>{{ t('contact.message') }}
      <textarea v-model="form.message" name="message" rows="3" maxlength="500"></textarea>
    </label>

    <!-- Spam trap: people never see this field, bots fill it in -->
    <div class="trap" aria-hidden="true">
      <label>Website<input v-model="form.website" name="website" type="text" tabindex="-1" autocomplete="off"/></label>
    </div>

    <p v-if="failed" class="err" role="alert">
      {{ error || t('contact.error') }}
      <a class="link" :href="waLink(t('site.whatsappText'))" target="_blank" rel="noopener">{{
          t('contact.whatsapp')
        }}</a>
    </p>
    <button class="btn btn-gold" type="submit" :disabled="sending">
      {{ sending ? t('contact.sending') : t('contact.submit') }}
    </button>
  </form>
</template>

<style scoped>
.trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.done {
  padding: 1.5rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
}

.done .btn {
  margin-top: .5rem;
}
</style>
