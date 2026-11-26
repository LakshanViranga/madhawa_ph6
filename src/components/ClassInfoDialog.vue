<script setup>
import {ref, watch, nextTick, computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {timetable} from '@/data/classes'
import {waLink} from '@/data/tutor'
import {useLocalized} from '@/composables/useLocalized'

// A window with the full details of one class. Open it by giving it a class (cls); it tells the page when it closes.
const props = defineProps({cls: {type: Object, default: null}})
const emit = defineEmits(['close', 'join'])

const {t} = useI18n()
const {L} = useLocalized()
const dialog = ref(null)

// <dialog> gives us Esc to close, a trapped keyboard focus and a dimmed background
watch(() => props.cls, async (c) => {
  await nextTick()
  const d = dialog.value
  if (!d) return
  if (c && !d.open) {
    document.body.style.overflow = 'hidden';
    d.showModal()
  } else if (!c && d.open) d.close()
})

function closed() { // runs for every way the window closes: button, Esc, or a click outside
  document.body.style.overflow = ''
  emit('close')
}

const onBackdrop = (e) => {
  if (e.target === dialog.value) dialog.value.close()
}
const hide = (e) => {
  e.target.style.display = 'none'
}

const modeLabel = (m) => (m === 'both' ? `${t('classes.physical')} + ${t('classes.online')}` : t(m === 'online' ? 'classes.online' : 'classes.physical'))
const rows = computed(() => (props.cls ? timetable.filter((r) => r.classId === props.cls.id) : []))
const askLink = computed(() => (props.cls ? waLink(t('classes.waText', {name: L(props.cls.title)})) : '#'))
</script>

<template>
  <dialog ref="dialog" class="ci" aria-labelledby="ci-title" @close="closed" @click="onBackdrop">
    <article v-if="cls" class="box">
      <button class="x" type="button" :aria-label="t('classes.close')" @click="dialog.close()">✕</button>
      <h2 id="ci-title">{{ L(cls.title) }}</h2>
      <p class="chips"><span class="tag on">{{ L(cls.medium) }}</span><span class="tag">{{ modeLabel(cls.mode) }}</span>
      </p>

      <p v-if="cls.about">{{ L(cls.about) }}</p>

      <section v-if="cls.topics?.length">
        <h3>{{ t('classes.learn') }}</h3>
        <ul>
          <li v-for="(x, i) in cls.topics" :key="i">{{ L(x) }}</li>
        </ul>
      </section>
      <section v-if="cls.includes?.length">
        <h3>{{ t('classes.includes') }}</h3>
        <ul>
          <li v-for="(x, i) in cls.includes" :key="i">{{ L(x) }}</li>
        </ul>
      </section>
      <section v-if="cls.audience">
        <h3>{{ t('classes.audience') }}</h3>
        <p>{{ L(cls.audience) }}</p>
      </section>
      <section>
        <h3>{{ t('classes.schedule') }}</h3>
        <ul>
          <li v-if="!rows.length">{{ L(cls.day) }}</li>
          <li v-for="(r, i) in rows" :key="i">{{ L(r.day) }}, {{ L(r.time) }} <span class="muted">({{
              modeLabel(r.where)
            }})</span></li>
        </ul>
      </section>

      <p class="note">{{ t('classes.feeNote') }}</p>

      <div class="actions">
        <button class="btn btn-gold" type="button" @click="emit('join', cls)">{{ t('classes.join') }}</button>
        <a class="btn btn-line" :href="askLink" target="_blank" rel="noopener">{{ t('classes.askWhatsapp') }}</a>
      </div>
    </article>
  </dialog>
</template>

<style scoped>
.ci {
  width: min(640px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  padding: 0;
  overflow: auto;
  border: 1px solid var(--gold);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
}

.ci::backdrop {
  background: rgba(0, 0, 0, .8);
}

.box {
  position: relative;
  padding: 0 1.5rem 1.5rem;
}

.x {
  position: sticky;
  top: .75rem;
  float: right;
  z-index: 2;
  width: 38px;
  height: 38px;
  margin: .75rem -.5rem 0 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
}

.x:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.img {
  aspect-ratio: 21 / 9;
  margin: 0 -1.5rem 1.25rem;
}

h2 {
  margin: 0 0 .5rem;
  font: 600 1.7rem var(--font-display);
  color: var(--gold-soft);
  line-height: 1.15;
}

h3 {
  margin: 1.4rem 0 .4rem;
  font: 600 1.05rem var(--font-display);
  color: var(--gold);
}

p {
  margin: 0 0 .75rem;
  max-width: none;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-bottom: 1rem;
}

ul {
  margin: 0;
  padding-left: 1.2rem;
}

li {
  margin: .2rem 0;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
}

.note {
  margin-top: 1.4rem;
  padding: .75rem 1rem;
  border: 1px dashed var(--gold);
  border-radius: 6px;
  color: var(--muted);
  font-size: .92rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
  margin-top: 1.25rem;
}

.x:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 2px;
}
</style>
