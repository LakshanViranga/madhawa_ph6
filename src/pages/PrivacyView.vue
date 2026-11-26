<script setup>
import { useI18n } from 'vue-i18n'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import { tutor, waLink } from '@/data/tutor'
import { useSeo } from '@/composables/useSeo'

const { t } = useI18n()
useSeo(() => ({ title: `${t('privacy.title')} | ${tutor.name}`, description: 'How this website handles student and parent information.', path: '/privacy' }))
</script>

<template>
  <div class="site">
    <SiteHeader />
    <main class="wrap narrow sec prose">
      <router-link class="link" to="/">← {{ t('gallery.back') }}</router-link>
      <h1>{{ t('privacy.title') }}</h1>
      <p class="muted">A plain-language note about the information this website handles. It was last updated in 2026.</p>

      <h2>What we collect</h2>
      <p><b>Class requests.</b> When you use the "Join a class" form we receive the student's name, your phone number, the class you chose and any message you write.</p>
      <p><b>Student accounts.</b> For enrolled students we keep a name, student ID, batch, phone number, quiz answers and marks, and a password that is stored in a scrambled form that nobody can read back.</p>
      <p><b>Photos and names.</b> Photos, names and exam results of students appear on this website only with the permission of the student, or of a parent if the student is under 18.</p>

      <h2>Why we use it</h2>
      <p>We use a class request only to contact you about classes. Quiz answers and marks are used to show students their own progress and to help the teacher see how the class is doing.</p>

      <h2>Who can see it</h2>
      <p>Class requests and student records can be seen only by the teacher. A student can see their own marks. Other students see only initials on leaderboards. We do not sell or share this information with advertisers.</p>

      <h2>Cookies and visitor counts</h2>
      <p>Logging in to the student area sets one cookie that keeps you logged in. We count visits with a tool that does not use cookies and does not follow you from site to site, so there is no cookie banner.</p>

      <h2>How long we keep it</h2>
      <p>Class requests that do not lead to enrolment are deleted after a reasonable time. Student records are kept while the student attends and removed on request afterwards.</p>

      <h2>Your choices</h2>
      <p>You can ask to see, correct or delete your information, or to take a photo down, at any time. Message us on
        <a class="link" :href="waLink(t('site.whatsappText'))" target="_blank" rel="noopener">WhatsApp</a>
        or call {{ tutor.phone }}.
      </p>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.prose h2 { font-size: 1.35rem !important; margin: 2rem 0 .5rem !important; }
.prose p { margin: 0 0 1rem; }
</style>
