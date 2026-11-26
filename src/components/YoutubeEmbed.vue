<script setup>
import {ref, computed} from 'vue'

const props = defineProps({url: String, title: {type: String, default: 'Discussion lesson'}})

// Accepts watch, youtu.be, shorts, embed and live links
const id = computed(() => (props.url?.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || [])[1] || '')
const playing = ref(false)
const hide = (e) => {
  e.target.style.display = 'none'
}
</script>

<template>
  <div v-if="id" class="frame">
    <iframe v-if="playing" :src="`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`" :title="title"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
    <button v-else type="button" class="poster" data-label="Video" :aria-label="`Play video: ${title}`"
            @click="playing = true">
      <img :src="`https://i.ytimg.com/vi/${id}/hqdefault.jpg`" alt="" loading="lazy" @error="hide"/>
      <span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path
          d="M8 5v14l11-7z"/></svg></span>
    </button>
  </div>
</template>

<style scoped>
.frame {
  position: relative;
  aspect-ratio: 16/9;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-2);
}

.frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: var(--surface-2);
  cursor: pointer;
}

.poster::after {
  content: attr(data-label);
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: .8rem;
}

.poster img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.play {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  width: 56px;
  height: 56px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--gold);
  color: var(--on-gold);
}

.poster:hover .play {
  transform: translate(-50%, -50%) scale(1.1);
}

.poster:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: -4px;
}
</style>
