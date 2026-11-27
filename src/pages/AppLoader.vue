<script setup>
// What shows while a page waits for its data: a spinner, or grey blocks shaped like the page that is
// about to appear (cards, a list of rows, a table). Screen readers hear the label.
defineProps({
  variant: {type: String, default: 'spinner'}, // spinner | cards | list | table
  label: {type: String, default: 'Loading'},
})
</script>

<template>
  <div class="loader" :data-variant="variant" role="status" aria-live="polite">
    <span class="sr">{{ label }}</span>

    <div v-if="variant === 'spinner'" class="center" aria-hidden="true">
      <span class="ring"></span>
      <span class="text">{{ label }}...</span>
    </div>

    <div v-else-if="variant === 'cards'" class="cards" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="card">
        <span class="sk w40"></span>
        <span class="sk w80 tall"></span>
        <span class="sk w100"></span>
        <span class="sk w60"></span>
        <span class="acts"><span class="sk btn"></span><span class="sk btn"></span></span>
      </div>
    </div>

    <div v-else-if="variant === 'list'" class="rows" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="item">
        <span class="col"><span class="sk w30"></span><span class="sk w70 tall"></span><span
            class="sk w50"></span></span>
        <span class="sk btn"></span>
      </div>
    </div>

    <div v-else class="table" aria-hidden="true">
      <span class="sk head"></span>
      <span v-for="n in 5" :key="n" class="sk line"></span>
    </div>
  </div>
</template>

<style scoped>
.loader {
  width: 100%;
}

.sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* spinner */
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .9rem;
  padding: 3rem 1rem;
}

.ring {
  width: 40px;
  height: 40px;
  border: 3px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

.text {
  color: var(--muted);
  font-size: .9rem;
}

/* skeleton blocks */
.sk {
  display: block;
  height: .8rem;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--line) 25%, var(--surface) 50%, var(--line) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.tall {
  height: 1.2rem;
}

.w30 {
  width: 30%;
}

.w40 {
  width: 40%;
}

.w50 {
  width: 50%;
}

.w60 {
  width: 60%;
}

.w70 {
  width: 70%;
}

.w80 {
  width: 80%;
}

.w100 {
  width: 100%;
}

.btn {
  width: 7rem;
  height: 2.2rem;
  border-radius: 6px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: .8rem;
  padding: 1.3rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.acts {
  display: flex;
  gap: .6rem;
  margin-top: .4rem;
}

.rows {
  display: grid;
  gap: .9rem;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.2rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.col {
  display: flex;
  flex-direction: column;
  gap: .6rem;
  flex: 1;
}

.table {
  display: grid;
  gap: .8rem;
  padding: 1.4rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.head {
  height: 1rem;
  width: 100%;
}

.line {
  height: 1.4rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@keyframes pulse {
  50% {
    opacity: .35;
  }
}

/* People who ask their device for less motion get a slow fade instead of spinning and sliding */
@media (prefers-reduced-motion: reduce) {
  .ring {
    animation: pulse 1.6s ease-in-out infinite;
    border-top-color: var(--accent);
  }

  .sk {
    animation: pulse 1.6s ease-in-out infinite;
    background: var(--line);
  }
}

@media (max-width: 760px) {
  .item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
