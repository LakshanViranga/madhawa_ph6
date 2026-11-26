<script setup>
import {ref, computed, nextTick, onMounted, onBeforeUnmount} from 'vue'
import {useI18n} from 'vue-i18n'
import {useHead} from '@unhead/vue'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'
import VideoCarousel from '@/components/VideoCarousel.vue'
import RegistrationForm from '@/components/RegistrationForm.vue'
import ClassInfoDialog from '@/components/ClassInfoDialog.vue'
import {tutor, waLink} from '@/data/tutor'
import {classes, timetable} from '@/data/classes'
import {locations} from '@/data/locations'
import {faq} from '@/data/faq'
import {resources} from '@/data/resources'
import {featured as gallery, thumb, thumbFallback} from '@/data/gallery'
import {features} from '@/data/features.js'
import {telegram} from '@/data/telegram.js'
import {useLocalized} from '@/composables/useLocalized'
import {useSeo} from '@/composables/useSeo'
import {useClassChoice} from '@/composables/useClassChoice'

const {t} = useI18n()
const {L} = useLocalized()

useHead({
  title: 'Ravishka D. Amarasekare | A/L Physics classes | Online & Physical',
  meta: [
    {
      name: 'description',
      content: 'Trusted A/L Physics classes with weekly quizzes and clear progress tracking. Online and Physical Classes in Sinhala'
    },
    {property: 'og:title', content: 'Tharka | Ravishka D. Amarasekare | A/L Physics classes'},
    {
      property: 'og:description',
      content: 'Physics, taught so it stays with you. Weekly quizzes, clear progress tracking, Online and Physical Sinhala classes.'
    },
    {property: 'og:type', content: 'website'},
    {property: 'og:url', content: 'https://tharka.lk/'},
  ],
})
useSeo(() => ({title: `${tutor.name} | ${tutor.tagline}`, description: t('hero.lead'), path: '/'}))

const hide = (e) => {
  e.target.style.display = 'none'
}
const previewResources = resources.slice(0, 3)
const telLink = `tel:${tutor.phone.replace(/\s/g, '')}`
const mapLinkFor = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Directives ---------- */
// v-reveal: tiles rise and sharpen into place when scrolled into view. Set --i for stagger.
const vReveal = {
  mounted(el) {
    if (reduceMotion || !('IntersectionObserver' in window)) return
    el.classList.add('rv')
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add('rv-in');
        io.disconnect()
      }
    }, {threshold: 0.12})
    io.observe(el)
  },
}
// v-count: counts up once when visible. v-count="{ to: 90, prefix: '', suffix: '%' }"
const vCount = {
  mounted(el, {value: {to, prefix = '', suffix = ''}}) {
    const fmt = (n) => `${prefix}${Math.round(n).toLocaleString('en-US')}${suffix}`
    el.textContent = fmt(to)
    if (reduceMotion || !('IntersectionObserver' in window)) return
    el.textContent = fmt(0)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min((now - start) / 1400, 1)
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, {threshold: 0.6})
    io.observe(el)
  },
}

const titleWords = computed(() => t('hero.title').split(' '))

/* ---------- Program explorer ---------- */
const selId = ref(classes[0]?.id)
const chip = ref('') // '' = all sessions, 'online', or a location id
const selected = computed(() => classes.find((c) => c.id === selId.value) || classes[0])
const chips = computed(() => [
  {id: '', label: 'All'},
  {id: 'online', label: 'Online'},
  ...locations.map((l) => ({id: l.id, label: l.name})),
])
const sessions = computed(() => {
  if (!selected.value) return []
  const mine = timetable.filter((r) => L(r.class) === L(selected.value.title))
  const rows = mine.length ? mine : timetable // fall back to the whole timetable if names do not match
  return rows.filter((r) => {
    if (chip.value === 'online') return r.where !== 'physical'
    if (chip.value) return r.venue === chip.value
    return true
  })
})
const venueName = (r) => (r.venue ? locations.find((x) => x.id === r.venue)?.name : '') || (r.where === 'physical' ? 'Physical' : 'Online')

async function pickVenue(id) {
  chip.value = id
  await nextTick()
  document.getElementById('programs')?.scrollIntoView({behavior: 'smooth'})
}

const openClass = ref(null)
const {choose} = useClassChoice()

async function join(c) {
  openClass.value = null
  choose(L(c.title))
  await nextTick()
  document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'})
}

/* ---------- Feedback (two marquee rows) ---------- */
const students = [
  {
    q: 'කලින් Physics කියන්නේ මට තේරුම් ගන්න අමාරුම විෂයක්. ඒත් සර් උගන්වන විදිහ නිසා දැන් පාඩම් තේරුම් ගන්න ලේසියි. ගණන් හදන විදිහ පියවරෙන් පියවර පැහැදිලි කරන නිසා මට දැන් Physics ගැන ලොකු විශ්වාසයක් තියෙනවා.',
    w: 'A/L student, 2025', img: '/images/student-1.webp',
  },
  {
    q: 'සර් පාඩම උගන්වන්නේ නිකම්ම කටපාඩම් කරන්න නෙවෙයි, ඇත්තටම තේරුම් ගන්න පුළුවන් විදිහට. Theory එකත් එක්ක ප්‍රශ්න විසඳනකොට විෂය ගැන තියෙන උනන්දුව තවත් වැඩි වෙනවා. Physics දැන් මට ආසම විෂයක්!',
    w: 'A/L student, 2024', img: '/images/student-2.webp',
  },
  {
    q: 'Physics කියන්නේ අමාරු විෂයක් කියලා හිතාගෙන හිටපු මට, දැන් ඒක තර්කානුකූලව හිතලා විසඳන්න පුළුවන් විෂයක් වෙලා. සර්ගේ ඉගැන්වීම ඒ වෙනසට ලොකු හේතුවක්!',
    w: 'A/L student, 2025', img: '/images/student-3.webp',
  },
]
// TODO: replace these placeholders with real parent feedback.
const parents = [
  {
    q: 'Replace with a real parent comment about weekly quizzes and progress updates.',
    w: 'Parent of A/L student, 2025',
    img: ''
  },
  {
    q: 'Replace with a real parent comment about the teaching and the results.',
    w: 'Parent of A/L student, 2024',
    img: ''
  },
]
// Repeat the cards until the row is long enough, then double it so the loop has no gap.
const loop = (list) => {
  const r = Array.from({length: Math.ceil(6 / list.length)}, () => list).flat();
  return [...r, ...r]
}
const studentRow = loop(students)
const parentRow = loop(parents)

/* ---------- Gallery lightbox ---------- */
const mosaic = gallery.slice(0, 7)
const lb = ref(-1)
const lbOpen = computed(() => lb.value >= 0)
const step = (d) => {
  lb.value = (lb.value + d + gallery.length) % gallery.length
}
const onKey = (e) => {
  if (!lbOpen.value) return
  if (e.key === 'Escape') lb.value = -1
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ---------- Static content ---------- */
const toppers = [
  {img: '/images/topper-1.webp', n: 'Sasindi Maligya', r: 'A/L 2024, 3A, District 28'},
  {img: '/images/topper-2.webp', n: 'Sachintha Thewarapperuma', r: 'A/L 2022, 2A, 1B, District 29'},
  {img: '/images/topper-3.webp', n: 'Ashen Omalpage', r: 'A/L 2021, 3B'},
]
const about = [
  '2020 A/L පළමු උත්සාහයෙන්ම මොරටුව විශ්වවිද්‍යාලයට පිවිස, දෙවන පන්තියේ ( Second Class) සාමාර්ථයක් සමඟ ඉංජිනේරු උපාධිය සාර්ථකව සම්පූර්ණ කළ මම, අද මගේ දැනුමෙන් නව පරපුරේ වෛද්‍ය, ඉංජිනේරු සිහිනය සැබෑ කරවීමට කැපවී සිටිමි.',
  'මගේ අරමුණ ලකුණු පමණක් නොව, භෞතික විද්‍යාව තර්කානුකූලව සිතන, අභියෝග ජයගන්නා පරපුරක් බිහි කිරීමයි.',
]
</script>

<template>
  <div class="site">
    <SiteHeader/>
    <AnnouncementBanner/>

    <main id="top">
      <!-- Hero: one bento mosaic -->
      <section class="hero">
        <div class="wrap bento">
          <div class="tile t-head">
            <svg class="spin" viewBox="0 0 200 200" aria-hidden="true">
              <ellipse cx="100" cy="100" rx="90" ry="32"/>
              <ellipse cx="100" cy="100" rx="90" ry="32" transform="rotate(60 100 100)"/>
              <ellipse cx="100" cy="100" rx="90" ry="32" transform="rotate(120 100 100)"/>
              <circle cx="100" cy="100" r="9"/>
            </svg>
            <h1 :aria-label="t('hero.title')">
              <span v-for="(w, i) in titleWords" :key="i" class="word" aria-hidden="true"><span
                  :style="{ '--i': i }">{{ w }}&nbsp;</span></span>
            </h1>
            <p class="subtitle">{{ t('hero.subtitle') }}</p>
            <p class="lead">{{ t('hero.lead') }}</p>
            <div class="actions">
              <a class="cta" href="#contact">{{ t('hero.join') }}</a>
              <a class="cta cta-ghost" href="#programs">{{ t('classes.title') }}</a>
            </div>
          </div>

          <figure class="tile t-photo">
            <img src="/profile.jpeg" :alt="tutor.name" @error="hide"/>
            <figcaption><b>{{ tutor.name }}</b><span>BSc (Hons) Engineering, University of Moratuwa</span></figcaption>
          </figure>

          <div class="tile t-stat"><b v-count="{ to: 5, suffix: '+' }"></b><span>years teaching A/L Physics</span></div>
          <div class="tile t-stat"><b v-count="{ to: 1000, suffix: '+' }"></b><span>students taught</span></div>
          <div class="tile t-stat t-accent"><b v-count="{ to: 95, suffix: '%' }"></b><span>passed with A, B or C</span>
          </div>
          <a class="tile t-stat t-link" href="#locations"><b v-count="{ to: locations.length }"></b><span>physical locations, plus online</span></a>
        </div>
      </section>

      <!-- Program explorer: pick a program, see its sessions, filter by place -->
      <section id="programs" class="sec">
        <div class="wrap">
          <h2>{{ t('classes.title') }}</h2>
          <div class="explore">
            <ul class="tabs" role="tablist" aria-label="Programs">
              <li v-for="c in classes" :key="c.id">
                <button type="button" role="tab" :aria-selected="c.id === selId" :class="{ on: c.id === selId }"
                        @click="selId = c.id">
                  <b>{{ L(c.title) }}</b>
                  <span>{{
                      c.mode === 'both' ? `${t('classes.physical')} + ${t('classes.online')}` : t(c.mode === 'online' ? 'classes.online' : 'classes.physical')
                    }}</span>
                </button>
              </li>
            </ul>

            <Transition name="panel" mode="out-in">
              <article v-if="selected" :key="selected.id" class="panel">
                <div class="panel-img"><img :src="selected.img" :alt="L(selected.title)" @error="hide"/></div>
                <div class="panel-body">
                  <h3>{{ L(selected.title) }}</h3>
                  <p>{{ L(selected.note) }}</p>
                  <p class="meta">{{ L(selected.medium) }}</p>
                  <p class="fee">{{ t('classes.feeNote') }}</p>
                  <div class="actions">
                    <a class="cta" href="#contact" @click="choose(L(selected.title))">{{ t('classes.ask') }}</a>
                    <button class="cta cta-ghost" type="button" @click="openClass = selected">{{
                        t('classes.more')
                      }}
                    </button>
                  </div>
                </div>

                <div class="sessions">
                  <div class="chips" role="group" aria-label="Filter sessions">
                    <button v-for="c in chips" :key="c.id" type="button" :class="{ on: chip === c.id }"
                            :aria-pressed="chip === c.id" @click="chip = c.id">{{ c.label }}
                    </button>
                  </div>
                  <ul>
                    <li v-for="(r, i) in sessions" :key="i">
                      <b>{{ L(r.day) }}</b><span>{{ L(r.time) }}</span><span class="tag"
                                                                             :class="{ on: r.where !== 'physical' }">{{
                        venueName(r)
                      }}</span>
                    </li>
                  </ul>
                  <p v-if="!sessions.length" class="muted">No sessions here yet. Pick another place.</p>
                </div>
              </article>
            </Transition>
          </div>
        </div>
      </section>

      <!-- Locations: type-led rows -->
      <section id="locations" class="sec alt">
        <div class="wrap">
          <h2>Where we teach</h2>
          <ul class="places">
            <li v-for="(l, i) in locations" :key="l.id" v-reveal :style="{ '--i': i }">
              <button class="place-name" type="button" @click="pickVenue(l.id)">{{ l.name }}<span
                  aria-hidden="true">+</span></button>
              <div class="place-info">
                <b>{{ l.place }}</b>
                <span>{{ l.address }}</span>
                <span>{{ l.days }}</span>
              </div>
              <a class="link" :href="mapLinkFor(l.mapQuery)" target="_blank" rel="noopener">Directions</a>
            </li>
            <li class="place-online">
              <button class="place-name" type="button" @click="pickVenue('online')">Online<span
                  aria-hidden="true">+</span></button>
              <div class="place-info"><b>Live from anywhere in Sri Lanka</b><span>Sinhala medium, weekly quizzes included</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <VideoCarousel/>

      <!-- Results: inverted band -->
      <section id="results" class="band">
        <div class="wrap">
          <h2>{{ t('nav.results') }}</h2>
          <div class="big">
            <div><b v-count="{ to: 90, suffix: '%' }"></b><span>passes in 2025</span></div>
            <div><b v-count="{ to: 21, prefix: 'Top ' }"></b><span>District rank, Physics</span></div>
            <div><b v-count="{ to: 20, suffix: '+' }"></b><span>More students to university in the last two years</span>
            </div>
          </div>
          <ul class="toppers">
            <li v-for="(s, i) in toppers" :key="i" v-reveal :style="{ '--i': i }">
              <span class="avatar"><img :src="s.img" :alt="s.n" loading="lazy" @error="hide"/></span>
              <div><b>{{ s.n }}</b><span>{{ s.r }}</span></div>
            </li>
          </ul>
        </div>
      </section>

      <!-- About -->
      <section id="about" class="sec">
        <div class="wrap about">
          <h2>About {{ tutor.name }}</h2>
          <div class="about-text">
            <p v-for="p in about" :key="p">{{ p }}</p>
          </div>
        </div>
      </section>

      <!-- Feedback marquees -->
      <section id="reviews" class="sec alt wall">
        <div class="wrap"><h2>What students and parents say</h2></div>
        <p class="row-label wrap">Students</p>
        <div class="marquee" aria-label="Student feedback">
          <div class="track">
            <figure v-for="(r, i) in studentRow" :key="i" class="quote">
              <blockquote>{{ r.q }}</blockquote>
              <figcaption><span class="avatar"><img :src="r.img" :alt="r.w" loading="lazy" @error="hide"/></span>{{
                  r.w
                }}
              </figcaption>
            </figure>
          </div>
        </div>
        <p class="row-label wrap">Parents</p>
        <div class="marquee rev" aria-label="Parent feedback">
          <div class="track">
            <figure v-for="(r, i) in parentRow" :key="i" class="quote">
              <blockquote>{{ r.q }}</blockquote>
              <figcaption><span class="avatar"></span>{{ r.w }}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <!-- Portal + resources -->
      <section id="resources" class="sec">
        <div class="wrap duo">
          <div class="tile portal">
            <h2>Weekly quiz, marks and progress in one place</h2>
            <p>Registered students log in to take the weekly quiz, see their marks and track their growth in each
              topic.</p>
            <router-link class="cta" to="/lms/login">
              {{ t('site.studentLogin') }}<span v-if="!features.studentPortal" class="soon">{{
                t('comingsoon.badge')
              }}</span>
            </router-link>
          </div>
          <div class="tile">
            <h2>{{ t('resources.title') }}</h2>
            <ul class="files">
              <li v-for="r in previewResources" :key="r.id">
                <div><span class="tag on">{{ t(`resources.${r.kind}`) }}</span>
                  <h3>{{ L(r.title) }}</h3></div>
                <a class="cta cta-ghost" :href="r.file" download>{{ r.size }}</a>
              </li>
            </ul>
            <router-link class="link" to="/resources">{{ t('resources.viewAll') }}</router-link>
          </div>
        </div>
      </section>

      <!-- Gallery: mosaic -->
      <section id="gallery" class="sec alt">
        <div class="wrap">
          <div class="head">
            <h2>{{ t('gallery.title') }}</h2>
            <router-link class="cta cta-ghost" to="/gallery">{{ t('gallery.viewAll') }}</router-link>
          </div>
          <div class="mosaic">
            <button v-for="(g, i) in mosaic" :key="g.src" type="button" class="shot"
                    :aria-label="`Open photo: ${g.alt}`" @click="lb = i">
              <img :src="thumb(g.src)" :alt="g.alt" loading="lazy" decoding="async"
                   @error="thumbFallback($event, g.src)"/>
            </button>
          </div>
        </div>
      </section>

      <Teleport to="body">
        <Transition name="zoom">
          <div v-if="lbOpen" class="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" @click.self="lb = -1">
            <button class="lb-btn lb-close" type="button" aria-label="Close" @click="lb = -1">×</button>
            <button class="lb-btn lb-prev" type="button" aria-label="Previous photo" @click="step(-1)">‹</button>
            <img :src="gallery[lb].src" :alt="gallery[lb].alt"/>
            <button class="lb-btn lb-next" type="button" aria-label="Next photo" @click="step(1)">›</button>
            <p class="lb-cap">{{ gallery[lb].alt }} ({{ lb + 1 }} / {{ gallery.length }})</p>
          </div>
        </Transition>
      </Teleport>

      <!-- FAQ: heading left, answers right -->
      <section id="faq" class="sec">
        <div class="wrap faq">
          <div class="faq-head">
            <h2>{{ t('faq.title') }}</h2>
            <p class="muted">{{ t('faq.lead') }}</p>
            <a class="link" :href="waLink(t('site.whatsappText'))" target="_blank" rel="noopener">{{ t('faq.more') }}
              {{ t('contact.whatsapp') }}</a>
          </div>
          <div>
            <details v-for="(f, i) in faq" :key="i" class="qa">
              <summary>{{ L(f.q) }}</summary>
              <p>{{ L(f.a) }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- Contact -->
      <section id="contact" class="sec alt">
        <div class="wrap contact">
          <div>
            <h2>{{ t('contact.title') }}</h2>
            <p>{{ t('contact.lead') }}</p>
            <div class="actions">
              <a class="cta" :href="waLink(t('site.whatsappText'))" target="_blank"
                 rel="noopener">{{ t('contact.whatsapp') }}</a>
              <a class="cta cta-ghost" :href="telLink">{{ t('contact.call') }} {{ tutor.phone }}</a>
            </div>
            <dl v-if="tutor.address || tutor.hours" class="info">
              <div v-if="tutor.address">
                <dt>{{ t('contact.address') }}</dt>
                <dd>{{ tutor.address }}</dd>
              </div>
              <div v-if="tutor.hours">
                <dt>{{ t('contact.hours') }}</dt>
                <dd>{{ tutor.hours }}</dd>
              </div>
            </dl>
            <div class="pills">
              <a v-for="g in telegram" :key="g.id" :href="g.link" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                      d="M21.7 2.3 18.4 21c-.2 1.3-.9 1.6-1.8 1l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L6 14.5l-4.9-1.5c-1.1-.3-1.1-1 .2-1.5L20.5 4c.9-.3 1.6.2 1.2 1.7Z"
                      fill="currentColor"/>
                </svg>
                {{ g.name }}
              </a>
            </div>
          </div>
          <RegistrationForm/>
        </div>
      </section>
    </main>

    <SiteFooter/>
    <ClassInfoDialog :cls="openClass" @close="openClass = null" @join="join"/>
  </div>
</template>

<style scoped>
.wrap {
  width: min(1120px, 100% - 2.5rem);
  margin-inline: auto;
}

.sec {
  padding: 5rem 0;
  background: var(--bg);
  color: var(--text);
}

.alt {
  background: var(--bg-alt);
}

h2 {
  margin: 0 0 1.5rem;
  font: 700 clamp(1.7rem, 3.6vw, 2.6rem)/1.15 var(--font-display);
  color: var(--heading);
}

h3 {
  margin: 0 0 .4rem;
  font: 600 1.15rem var(--font-display);
  color: var(--heading);
}

p {
  line-height: 1.7;
}

.muted {
  color: var(--muted);
}

.meta {
  color: var(--muted);
  font-size: .9rem;
}

.fee {
  color: var(--secondary);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: .7rem;
  margin-top: 1.5rem;
}

.link {
  color: var(--secondary);
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.head h2 {
  margin: 0;
}

a:focus-visible, summary:focus-visible, button:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 3px;
}

.cta {
  display: inline-block;
  padding: .7rem 1.3rem;
  border-radius: 999px;
  border: 1px solid var(--button-primary-bg);
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  font: 700 .92rem var(--font-body);
  text-decoration: none;
  cursor: pointer;
  transition: transform .15s, box-shadow .2s;
}

.cta:hover {
  box-shadow: 0 0 0 5px var(--accent-glow);
  transform: translateY(-1px);
}

.cta-ghost {
  background: transparent;
  border-color: var(--line);
  color: var(--text);
}

.cta-ghost:hover {
  border-color: var(--secondary);
}

.soon {
  margin-left: .6rem;
  padding: .05rem .55rem;
  border: 1px solid currentColor;
  border-radius: 99px;
  font-size: .72rem;
}

.tag {
  display: inline-block;
  padding: .1rem .65rem;
  border-radius: 99px;
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: .78rem;
}

.tag.on {
  background: var(--accent-glow);
  border-color: var(--secondary);
  color: var(--secondary);
}

.tile {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 28px;
  padding: 1.75rem;
}

.avatar {
  display: inline-block;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  background: var(--surface-2);
  border: 2px solid var(--accent);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Motion */
.rv {
  opacity: 0;
  transform: translateY(28px) scale(.97);
  filter: blur(6px);
  transition: opacity .7s, transform .7s cubic-bezier(.2, .7, .2, 1), filter .7s;
  transition-delay: calc(var(--i, 0) * 100ms);
}

.rv.rv-in {
  opacity: 1;
  transform: none;
  filter: none;
}

.panel-enter-active, .panel-leave-active {
  transition: opacity .25s, transform .25s;
}

.panel-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.panel-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.zoom-enter-active, .zoom-leave-active {
  transition: opacity .25s;
}

.zoom-enter-active img {
  transition: transform .3s cubic-bezier(.2, .7, .2, 1);
}

.zoom-enter-from, .zoom-leave-to {
  opacity: 0;
}

.zoom-enter-from img {
  transform: scale(.85);
}

/* Hero bento */
.hero {
  padding: 1.5rem 0 4rem;
  background: var(--bg);
}

.bento {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: .9rem;
}

.bento > * {
  animation: pop .8s cubic-bezier(.2, .7, .2, 1) both;
}

.bento > :nth-child(2) {
  animation-delay: .15s;
}

.bento > :nth-child(3) {
  animation-delay: .3s;
}

.bento > :nth-child(4) {
  animation-delay: .4s;
}

.bento > :nth-child(5) {
  animation-delay: .5s;
}

.bento > :nth-child(6) {
  animation-delay: .6s;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(26px) scale(.96);
  }
}

.t-head {
  position: relative;
  grid-column: 1 / 9;
  grid-row: 1 / 3;
  padding: 2.5rem;
  overflow: hidden;
  background: var(--bg-alt);
}

.t-head > *:not(.spin) {
  position: relative;
}

.spin {
  position: absolute;
  right: -50px;
  top: -50px;
  width: 280px;
  fill: none;
  stroke: var(--secondary);
  stroke-width: 1.3;
  opacity: .35;
  animation: turn 40s linear infinite;
}

.spin circle {
  fill: var(--accent);
  stroke: none;
}

@keyframes turn {
  to {
    transform: rotate(360deg);
  }
}

h1 {
  margin: 0 0 .75rem;
  max-width: 14ch;
  font: 700 clamp(2.4rem, 6vw, 4.4rem)/1.08 var(--font-display);
  color: var(--heading);
}

.word {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
}

.word > span {
  display: inline-block;
  transform: translateY(105%);
  animation: rise .7s cubic-bezier(.2, .7, .2, 1) forwards;
  animation-delay: calc(var(--i) * 110ms + .15s);
}

@keyframes rise {
  to {
    transform: none;
  }
}

.subtitle {
  margin: 0 0 .8rem;
  max-width: 34ch;
  font: 600 clamp(1.05rem, 2.2vw, 1.35rem)/1.4 var(--font-display);
  color: var(--secondary);
}

.lead {
  max-width: 50ch;
  color: var(--muted);
  font-size: 1.05rem;
}

.t-photo {
  grid-column: 9 / 13;
  grid-row: 1 / 4;
  position: relative;
  margin: 0;
  padding: 0;
  overflow: hidden;
  min-height: 380px;
  background: var(--surface-2);
}

.t-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.t-photo figcaption {
  position: absolute;
  inset: auto .75rem .75rem;
  display: grid;
  gap: .1rem;
  padding: .8rem 1rem;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.t-photo b {
  color: var(--heading);
}

.t-photo span {
  color: var(--muted);
  font-size: .8rem;
}

.t-stat {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 130px;
  padding: 1.2rem;
  color: inherit;
  text-decoration: none;
}

.t-stat b {
  font: 700 1.9rem var(--font-display);
  color: var(--heading);
  font-variant-numeric: tabular-nums;
}

.t-stat span {
  color: var(--muted);
  font-size: .85rem;
  line-height: 1.4;
}

.t-accent {
  background: var(--accent);
  border-color: var(--accent);
}

.t-accent b, .t-accent span {
  color: var(--on-accent);
}

.t-link {
  transition: border-color .2s;
}

.t-link:hover {
  border-color: var(--secondary);
}

/* Explorer */
.explore {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.25rem;
  align-items: start;
}

.tabs {
  display: grid;
  gap: .5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tabs button {
  display: grid;
  gap: .15rem;
  width: 100%;
  padding: 1rem 1.1rem;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color .2s, background .2s;
}

.tabs b {
  font: 600 1rem var(--font-display);
  color: var(--heading);
}

.tabs span {
  font-size: .8rem;
  color: var(--muted);
}

.tabs button:hover {
  border-color: var(--secondary);
}

.tabs button.on {
  background: var(--accent);
  border-color: var(--accent);
}

.tabs button.on b, .tabs button.on span {
  color: var(--on-accent);
}

.panel {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 28px;
}

.panel-img {
  aspect-ratio: 1;
  border-radius: 20px;
  overflow: hidden;
  background: var(--surface-2);
}

.panel-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.panel-body p {
  margin: 0 0 .5rem;
}

.sessions {
  grid-column: 1 / -1;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: .45rem;
  margin-bottom: .75rem;
}

.chips button {
  padding: .35rem .9rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  font: 600 .85rem var(--font-body);
  cursor: pointer;
  transition: background .2s;
}

.chips button.on {
  background: var(--heading);
  border-color: var(--heading);
  color: var(--bg);
}

.sessions ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sessions li {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: .75rem 0;
  border-top: 1px solid var(--line);
}

.sessions li b {
  color: var(--heading);
}

/* Locations */
.places {
  margin: 0;
  padding: 0;
  list-style: none;
}

.places li {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 1.5rem;
  align-items: center;
  padding: 1.4rem 0;
  border-top: 1px solid var(--line);
}

.places li:last-child {
  border-bottom: 1px solid var(--line);
}

.place-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0;
  background: none;
  border: 0;
  color: var(--heading);
  font: 700 clamp(2rem, 5vw, 3.4rem)/1 var(--font-display);
  cursor: pointer;
  text-align: left;
  transition: color .2s, letter-spacing .3s;
}

.place-name span {
  font-size: 1.6rem;
  color: var(--secondary);
  transition: transform .3s;
}

.place-name:hover {
  color: var(--secondary);
  letter-spacing: .02em;
}

.place-name:hover span {
  transform: rotate(90deg);
}

.place-info {
  display: grid;
  gap: .15rem;
  color: var(--muted);
  font-size: .92rem;
}

.place-info b {
  color: var(--text);
}

.place-online {
  grid-template-columns: 1fr 1fr;
}

/* Results band (inverted) */
.band {
  padding: 5rem 0;
  background: var(--heading);
  color: var(--bg);
}

.band h2 {
  color: var(--bg);
}

.big {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 3rem;
}

.big b {
  display: block;
  font: 700 clamp(2.8rem, 8vw, 5.5rem)/1 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.big span {
  display: block;
  margin-top: .5rem;
  max-width: 22ch;
  opacity: .8;
}

.toppers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toppers li {
  display: flex;
  align-items: center;
  gap: .9rem;
  padding: 1rem;
  border: 1px solid currentColor;
  border-radius: 20px;
}

.toppers li {
  border-color: color-mix(in srgb, var(--bg) 30%, transparent);
}

.toppers .avatar {
  width: 56px;
  height: 56px;
  border-color: var(--bg);
}

.toppers b {
  display: block;
}

.toppers span:not(.avatar) {
  font-size: .85rem;
  opacity: .75;
}

/* About */
.about {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 3rem;
  align-items: start;
}

.about h2 {
  margin: 0;
}

.about-text p {
  margin: 0 0 1rem;
  max-width: 62ch;
  font-size: 1.05rem;
}

/* Feedback marquees */
.wall {
  padding-bottom: 4rem;
  overflow: hidden;
}

.row-label {
  margin: 1.5rem auto .75rem;
  color: var(--muted);
  font-size: .85rem;
  font-weight: 700;
}

.marquee {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.track {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: slide 70s linear infinite;
}

.marquee.rev .track {
  animation-direction: reverse;
  animation-duration: 55s;
}

.marquee:hover .track {
  animation-play-state: paused;
}

@keyframes slide {
  to {
    transform: translateX(calc(-50% - .5rem));
  }
}

.quote {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  width: 340px;
  margin: 0;
  padding: 1.4rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 24px;
}

.quote blockquote {
  margin: 0;
  font: .98rem/1.75 var(--font-display);
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.quote figcaption {
  display: flex;
  align-items: center;
  gap: .7rem;
  color: var(--muted);
  font-size: .85rem;
}

/* Portal + resources */
.duo {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  gap: 1rem;
}

.portal {
  background: var(--surface-2);
  border-left: 4px solid var(--accent);
}

.duo h2 {
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
}

.files {
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.files li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: .8rem 0;
  border-top: 1px solid var(--line);
}

.files h3 {
  margin: .35rem 0 0;
  font-size: 1rem;
}

/* Gallery mosaic */
.mosaic {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 170px;
  gap: .75rem;
}

.shot {
  position: relative;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--surface-2);
  cursor: zoom-in;
}

.shot:nth-child(1) {
  grid-column: span 2;
  grid-row: span 2;
}

.shot:nth-child(4) {
  grid-row: span 2;
}

.shot:nth-child(6) {
  grid-column: span 2;
}

.shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .6s;
}

.shot:hover img, .shot:focus-visible img {
  transform: scale(1.08);
}

.lb {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 3.5rem 1rem 4rem;
  background: var(--bg-glass);
  backdrop-filter: blur(8px);
}

.lb img {
  max-width: min(1000px, 100%);
  max-height: 100%;
  border-radius: 16px;
  object-fit: contain;
}

.lb-btn {
  position: absolute;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--heading);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
}

.lb-btn:hover {
  border-color: var(--secondary);
}

.lb-close {
  top: 1rem;
  right: 1rem;
}

.lb-prev {
  left: 1rem;
  top: 50%;
}

.lb-next {
  right: 1rem;
  top: 50%;
}

.lb-cap {
  position: absolute;
  bottom: 1.25rem;
  margin: 0;
  font-size: .9rem;
}

/* FAQ */
.faq {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 3rem;
  align-items: start;
}

.faq-head {
  position: sticky;
  top: 6rem;
}

.qa {
  border-bottom: 1px solid var(--line);
}

.qa:first-child {
  border-top: 1px solid var(--line);
}

.qa summary {
  position: relative;
  padding: 1.1rem 2rem 1.1rem 0;
  cursor: pointer;
  list-style: none;
  font: 600 1.05rem var(--font-display);
  color: var(--heading);
}

.qa summary::-webkit-details-marker {
  display: none;
}

.qa summary::after {
  content: '+';
  position: absolute;
  right: .25rem;
  top: .85rem;
  font-size: 1.5rem;
  color: var(--secondary);
  transition: transform .25s;
}

.qa[open] summary::after {
  transform: rotate(45deg);
}

.qa p {
  margin: 0 0 1.1rem;
  color: var(--muted);
}

/* Contact */
.contact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.info {
  display: grid;
  gap: .9rem;
  margin: 1.5rem 0 0;
}

.info dt {
  font-size: .8rem;
  color: var(--muted);
}

.info dd {
  margin: 0;
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin-top: 1.75rem;
}

.pills a {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  padding: .45rem .95rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: .88rem;
  font-weight: 600;
  text-decoration: none;
  transition: border-color .2s, transform .2s;
}

.pills a:hover {
  border-color: var(--secondary);
  transform: translateY(-2px);
}

.pills svg {
  color: var(--secondary);
}

@media (max-width: 900px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
  }

  .t-head, .t-photo {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .t-head {
    padding: 1.75rem;
  }

  .t-photo {
    min-height: 320px;
    order: 2;
  }

  .t-stat {
    grid-column: span 1;
  }

  .explore, .about, .faq, .contact, .duo {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .tabs {
    display: flex;
    overflow-x: auto;
    padding-bottom: .25rem;
  }

  .tabs li {
    flex: none;
    width: 220px;
  }

  .panel {
    grid-template-columns: 1fr;
  }

  .panel-img {
    aspect-ratio: 16/9;
  }

  .places li, .place-online {
    grid-template-columns: 1fr;
    gap: .6rem;
  }

  .big {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .mosaic {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 140px;
  }

  .faq-head {
    position: static;
  }

  .sessions li {
    grid-template-columns: 1fr auto;
  }

  .sessions li span:nth-child(2) {
    grid-row: 2;
    grid-column: 1;
    color: var(--muted);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bento > *, .word > span, .finder {
    animation: none;
    transform: none;
  }

  .spin {
    animation: none;
  }

  .rv {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }

  .track {
    animation: none;
  }

  .marquee {
    overflow-x: auto;
    mask-image: none;
  }

  .panel-enter-active, .panel-leave-active, .zoom-enter-active, .zoom-leave-active {
    transition: none;
  }
}
</style>
