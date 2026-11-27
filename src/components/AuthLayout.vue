<script setup>
// The two-column look of the login page, shared by the login, registration and any later sign-in pages.
// The form goes in the default slot.
defineProps({
  brand: {type: String, default: 'Tharka'},
  quote: {type: String, default: 'One quiz a week. Every mark counts toward your A.'},
})
</script>

<template>
  <main class="login">
    <section class="side">
      <router-link to="/" class="brand">{{ brand }}</router-link>
      <svg class="wave" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C 50 0, 100 0, 150 60 S 250 120, 300 60 S 400 0, 450 60 S 550 120, 600 60"/>
      </svg>
      <p class="quote" aria-hidden="true">{{ quote }}</p>
    </section>

    <section class="panel">
      <slot/>
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
  color: var(--secondary);
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
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 1400;
  stroke-dashoffset: 1400;
  animation: draw 3s ease-out forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

.quote {
  position: relative;
  font: 600 clamp(1.5rem, 3vw, 2.2rem) var(--font-display);
  color: var(--heading);
  max-width: 16ch;
  line-height: 1.2;
  margin: 0;
}

.panel {
  display: grid;
  place-items: center;
  padding: 2rem 1.25rem;
}

a:focus-visible {
  outline: 2px solid var(--heading);
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
