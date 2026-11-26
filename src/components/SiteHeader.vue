<script setup>
import {ref, computed} from 'vue'
import {useRoute} from 'vue-router'
import {useI18n} from 'vue-i18n'
import PrefsSwitch from '@/components/PrefsSwitch.vue'
import {tutor} from '@/data/tutor'

const {t} = useI18n()
const route = useRoute()
const open = ref(false)

// Section links start with "/" so they also work from other pages, such as the gallery.
const home = (hash) => ({path: '/', hash})
const links = computed(() => [
  {label: t('nav.classes'), to: home('#programs')},
  {label: 'Locations', to: home('#locations')},
  {label: t('nav.results'), to: home('#results')},
  {label: t('nav.gallery'), to: '/gallery', page: true},
  {label: t('nav.contact'), to: home('#contact')},
])
const isActive = (l) => !!l.page && route.path === l.to
</script>

<template>
  <header class="pill-wrap">
    <div class="pill">
      <router-link class="brand" to="/" @click="open = false">{{ tutor.name }}</router-link>

      <nav :class="{ open }" aria-label="Main">
        <router-link v-for="l in links" :key="l.label" :to="l.to" active-class="" exact-active-class=""
                     :class="{ on: isActive(l) }" :aria-current="isActive(l) ? 'page' : undefined" @click="open = false">
          {{ l.label }}
        </router-link>
      </nav>

      <div class="right">
        <PrefsSwitch/>
        <router-link class="login" to="/lms/login">{{ t('nav.studentLogin') }}</router-link>
        <button class="burger" type="button" :aria-expanded="open" aria-label="Menu" @click="open = !open">
          <span></span><span></span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.pill-wrap {
  position: sticky;
  top: .75rem;
  z-index: 20;
  width: min(1120px, 100% - 1.5rem);
  margin: .75rem auto 0;
  font-family: var(--font-body);
}

.pill {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .5rem .55rem .5rem 1.25rem;
  background: var(--bg-glass);
  backdrop-filter: blur(14px);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: 0 8px 30px var(--accent-glow);
}

.brand {
  color: var(--heading);
  text-decoration: none;
  font: 700 1.05rem var(--font-display);
  white-space: nowrap;
}

nav {
  display: flex;
  gap: .1rem;
  margin-inline: auto;
}

nav a {
  padding: .45rem .85rem;
  border-radius: 999px;
  color: var(--text);
  text-decoration: none;
  font-size: .92rem;
  transition: background .2s;
}

nav a:hover {
  background: var(--accent-glow);
}

nav a.on {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}

.right {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.login {
  padding: .55rem 1.2rem;
  border-radius: 999px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font-size: .9rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: transform .15s;
}

.login:hover {
  transform: scale(1.04);
}

.burger {
  display: none;
  width: 38px;
  height: 38px;
  padding: 0;
  place-content: center;
  gap: 5px;
  background: none;
  border: 1px solid var(--line);
  border-radius: 50%;
  cursor: pointer;
}

.burger span {
  display: block;
  width: 16px;
  height: 2px;
  background: var(--heading);
}

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

@media (max-width: 900px) {
  .burger {
    display: grid;
  }

  .right {
    margin-left: auto;
  }

  nav {
    display: none;
    position: absolute;
    top: calc(100% + .5rem);
    left: 0;
    right: 0;
    flex-direction: column;
    gap: .15rem;
    margin: 0;
    padding: .75rem;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 24px;
  }

  nav.open {
    display: flex;
  }

  nav a {
    padding: .8rem 1rem;
    border-radius: 14px;
  }
}

@media (max-width: 420px) {
  .login {
    display: none;
  }
}
</style>
