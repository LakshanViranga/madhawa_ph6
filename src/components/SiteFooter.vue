<script setup>
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import WhatsappButton from '@/components/WhatsappButton.vue'
import {tutor, credit} from '@/data/tutor'
import {socialIcons} from '@/data/socialIcons'
import {features} from '@/data/features'

const {t} = useI18n()

// Visitors see only the pages that have a link. While you build the site (npm run dev) every
// button is shown, with the ones that have no link yet dimmed, so you can see the design.
const socials = computed(() => (import.meta.env.DEV ? tutor.socials : tutor.socials.filter((s) => s.url)))
const creditIsFacebook = /facebook\.com/i.test(credit.url)
</script>

<template>
  <footer class="foot">
    <div class="inner">
      <div class="row">
        <span>© {{ new Date().getFullYear() }} {{ tutor.name }}. {{ t('site.rights') }}</span>
        <nav class="links" aria-label="Footer">
          <router-link to="/announcements">{{ t('site.announcements') }}</router-link>
          <router-link to="/privacy">{{ t('site.privacy') }}</router-link>
          <router-link to="/lms/login">{{ t('site.studentLogin') }}<span v-if="!features.studentPortal"
                                                                         class="soon">{{ t('comingsoon.badge') }}</span>
          </router-link>
        </nav>
      </div>

      <div v-if="socials.length" class="follow">
        <span class="follow-label">{{ t('site.follow') }}</span>
        <ul class="social">
          <li v-for="s in socials" :key="s.key">
            <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer"
               :aria-label="`${s.name} (opens in a new tab)`" :title="s.name">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path :d="socialIcons[s.key]"/>
              </svg>
            </a>
            <!-- Only shown while building the site: reminds you to add the link in src/data/tutor.js -->
            <span v-else class="off" :title="`Add the ${s.name} link in src/data/tutor.js`">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path
                  :d="socialIcons[s.key]"/></svg>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <p class="credit">
      {{ t('site.developedBy') }}
      <a v-if="credit.url" :href="credit.url" target="_blank" rel="noopener" class="by">
        <svg v-if="creditIsFacebook" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path :d="socialIcons.facebook"/>
        </svg>
        {{ credit.name }}<span class="sr"> (opens in a new tab)</span>
      </a>
      <b v-else>{{ credit.name }}</b>
    </p>
  </footer>
  <!-- On every public page, because every public page has this footer -->
  <WhatsappButton/>
</template>

<style scoped>
/* The footer spans the whole page, so its top line and the credit line run edge to edge like the lines between sections */
.foot {
  border-top: 1px solid var(--line);
  color: var(--muted);
  font: .9rem var(--font-body);
}

.inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: .75rem 1.5rem;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.foot a {
  color: var(--gold);
  text-decoration: none;
}

.foot a:hover {
  text-decoration: underline;
}

.soon {
  margin-left: .4rem;
  padding: 0 .5rem;
  border: 1px solid var(--line);
  border-radius: 99px;
  font-size: .72rem;
  color: var(--muted);
}

.follow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem 1rem;
  margin-top: 1.5rem;
}

.follow-label {
  font-size: .85rem;
}

.social {
  display: flex;
  flex-wrap: wrap;
  gap: .6rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.social a, .social .off {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--gold);
  transition: background .15s, border-color .15s, color .15s;
}

.social a:hover {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
  text-decoration: none;
}

.social .off {
  color: var(--muted);
  border-style: dashed;
  opacity: .55;
  cursor: help;
}

.credit {
  margin: 0;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--line);
  font-size: .82rem;
  text-align: center;
  max-width: none;
}

.credit b, .credit .by {
  color: var(--gold);
  font-weight: 600;
}

.credit .by {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

a:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

@media (max-width: 760px) {
  .credit {
    padding-bottom: 5.5rem;
  }
}

/* room for the WhatsApp button */
@media (prefers-reduced-motion: reduce) {
  .social a {
    transition: none;
  }
}
</style>
