<script setup>
import { ref, computed, onMounted } from 'vue'
import LmsHeader from '@/components/LmsHeader.vue'
import { useStudent } from '@/composables/useStudent.js'

const api = useStudent()

// ---------------------------------------------------------
// State
//
// Notification object (exactly these fields):
// { id, userId, type, title, message, readAt, createdAt }
//   readAt: null when unread, ISO date string when read
// ---------------------------------------------------------

const notifications = ref([])

const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')

const activeFilter = ref('all')

const unreadCount = ref(0)
const nextCursor = ref(null)
const hasMore = ref(false)

const markingId = ref(null)
const markingAll = ref(false)

const filters = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' }
]

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function getDateGroup(createdAt) {
  const date = new Date(createdAt)
  const now = new Date()

  const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
  )

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  if (date >= startOfToday) {
    return 'Today'
  }

  if (date >= startOfYesterday) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(createdAt) {
  return new Date(createdAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// A notification is unread until the server sets readAt
function isUnread(notification) {
  return !notification.readAt
}

function setRead(notification) {
  notification.readAt = new Date().toISOString()
}

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

async function loadNotifications({ reset = false } = {}) {
  if (reset) {
    loading.value = true
    loadError.value = ''
    nextCursor.value = null
    hasMore.value = false
  } else {
    loadingMore.value = true
  }

  const params = {
    limit: 20
  }

  if (activeFilter.value === 'unread') {
    params.unread = true
  }

  if (!reset && nextCursor.value) {
    params.before = nextCursor.value
  }

  const r = await api.listNotification(params)

  if (!r.ok) {
    loadError.value = r.error || 'Unable to load notifications.'

    if (reset) {
      notifications.value = []
    }

    loading.value = false
    loadingMore.value = false
    return
  }

  const items = Array.isArray(r.data?.notifications)
      ? r.data.notifications
      : []

  if (reset) {
    notifications.value = items
  } else {
    notifications.value.push(...items)
  }

  unreadCount.value = Number(r.data?.unreadCount ?? 0)
  nextCursor.value = r.data?.nextCursor ?? null
  hasMore.value = Boolean(r.data?.hasMore)

  loadError.value = ''
  loading.value = false
  loadingMore.value = false
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value || !nextCursor.value) {
    return
  }

  await loadNotifications()
}

async function changeFilter(filter) {
  if (activeFilter.value === filter) {
    return
  }

  activeFilter.value = filter

  await loadNotifications({
    reset: true
  })
}

// ---------------------------------------------------------
// Read actions
// ---------------------------------------------------------

async function markAsRead(notification) {
  if (!isUnread(notification) || markingId.value === notification.id) {
    return
  }

  markingId.value = notification.id

  const r = await api.markNotificationRead(notification.id)

  markingId.value = null

  if (!r.ok) {
    return
  }

  setRead(notification)

  unreadCount.value = Math.max(0, unreadCount.value - 1)
}

async function markAllAsRead() {
  if (unreadCount.value === 0 || markingAll.value) {
    return
  }

  markingAll.value = true

  const r = await api.markAllNotificationsRead()

  markingAll.value = false

  if (!r.ok) {
    return
  }

  notifications.value.forEach(notification => {
    if (isUnread(notification)) {
      setRead(notification)
    }
  })

  unreadCount.value = 0
}

// ---------------------------------------------------------
// Computed
// ---------------------------------------------------------

const filteredNotifications = computed(() => {
  // Filtering is normally done by the server.
  // This local filter is intentionally kept as a safety net
  // for already-loaded notifications.
  if (activeFilter.value === 'unread') {
    return notifications.value.filter(isUnread)
  }

  return notifications.value
})

const groupedNotifications = computed(() => {
  const groups = new Map()

  for (const notification of filteredNotifications.value) {
    const group = getDateGroup(notification.createdAt)

    if (!groups.has(group)) {
      groups.set(group, [])
    }

    groups.get(group).push(notification)
  }

  return Array.from(groups.entries())
})

// ---------------------------------------------------------
// Type
//
// The notification object has no link field, so the label,
// icon and destination are all derived from `type`.
// Adjust the keys to match the `type` values your API sends.
// ---------------------------------------------------------

const typeInfo = {
  lesson: {
    label: 'Lesson',
    icon: 'book',
    to: '/lms/classes'
  },

  assignment: {
    label: 'Assignment',
    icon: 'clipboard',
    to: '/lms/classes'
  },

  progress: {
    label: 'Progress',
    icon: 'chart',
    to: '/lms/progress'
  },

  issue: {
    label: 'Support',
    icon: 'check',
    to: '/lms/issue'
  },

  general: {
    label: 'General',
    icon: 'bell',
    to: null
  }
}

function getType(type) {
  return typeInfo[type] || typeInfo.general
}

// ---------------------------------------------------------
// Initial load
// ---------------------------------------------------------

onMounted(() => {
  loadNotifications({
    reset: true
  })
})
</script>

<template>
  <div class="page">
    <main class="wrap">

      <!-- Heading -->
      <section class="page-heading">
        <div>
          <h1>Notifications</h1>

          <p class="muted">
            Stay updated with your classes and learning activities.
          </p>
        </div>

        <button
            v-if="unreadCount > 0"
            class="mark-all"
            type="button"
            :disabled="markingAll"
            @click="markAllAsRead"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>

          <span>
            {{ markingAll ? 'Marking...' : 'Mark all as read' }}
          </span>
        </button>
      </section>

      <!-- Summary -->
      <section class="summary">
        <div class="summary-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            />
          </svg>
        </div>

        <div class="summary-content">
          <strong>
            {{ unreadCount }} unread
            {{ unreadCount === 1 ? 'notification' : 'notifications' }}
          </strong>

          <span>
            {{
              unreadCount > 0
                  ? 'You have updates waiting for you.'
                  : 'You are all caught up!'
            }}
          </span>
        </div>

        <span class="summary-count">
          {{ unreadCount }}
        </span>
      </section>

      <!-- Main panel -->
      <section class="panel">

        <!-- Toolbar -->
        <div class="toolbar">

          <div
              class="seg"
              role="group"
              aria-label="Notification filter"
          >
            <button
                v-for="filter in filters"
                :key="filter.key"
                type="button"
                :class="{ on: activeFilter === filter.key }"
                :aria-pressed="activeFilter === filter.key"
                :disabled="loading"
                @click="changeFilter(filter.key)"
            >
              {{ filter.label }}

              <span
                  v-if="filter.key === 'unread'"
                  class="filter-count"
              >
                {{ unreadCount }}
              </span>
            </button>
          </div>

          <span
              v-if="!loading"
              class="total-count"
          >
            {{ notifications.length }}
            loaded
          </span>
        </div>

        <!-- Initial loading -->
        <div
            v-if="loading"
            class="loading-state"
            aria-live="polite"
        >
          <div class="loading-spinner"></div>

          <span>Loading notifications...</span>
        </div>

        <!-- Error -->
        <div
            v-else-if="loadError && !notifications.length"
            class="error-state"
        >
          <div class="error-icon">
            !
          </div>

          <h2>Unable to load notifications</h2>

          <p class="muted">
            {{ loadError }}
          </p>

          <button
              type="button"
              class="retry-button"
              @click="loadNotifications({ reset: true })"
          >
            Try again
          </button>
        </div>

        <!-- Notification groups -->
        <div
            v-else-if="groupedNotifications.length"
            class="notification-groups"
        >

          <div
              v-for="[group, items] in groupedNotifications"
              :key="group"
              class="notification-group"
          >
            <h2>{{ group }}</h2>

            <div class="notification-list">

              <article
                  v-for="notification in items"
                  :key="notification.id"
                  class="notification-item"
                  :class="{ unread: isUnread(notification) }"
              >

                <!-- Type icon -->
                <div
                    class="category-icon"
                    :class="notification.type"
                >

                  <!-- Lesson -->
                  <svg
                      v-if="getType(notification.type).icon === 'book'"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                  >
                    <path
                        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"
                    />
                    <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
                  </svg>

                  <!-- Assignment -->
                  <svg
                      v-else-if="getType(notification.type).icon === 'clipboard'"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                  >
                    <rect
                        x="5"
                        y="4"
                        width="14"
                        height="17"
                        rx="2"
                    />
                    <path
                        d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"
                    />
                  </svg>

                  <!-- Progress -->
                  <svg
                      v-else-if="getType(notification.type).icon === 'chart'"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                  >
                    <path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8" />
                  </svg>

                  <!-- Support -->
                  <svg
                      v-else-if="getType(notification.type).icon === 'check'"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>

                  <!-- General -->
                  <svg
                      v-else
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                  >
                    <path
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                    />
                  </svg>

                </div>

                <!-- Content -->
                <div class="notification-body">

                  <div class="notification-title-row">
                    <h3>
                      {{ notification.title }}
                    </h3>

                    <span
                        v-if="isUnread(notification)"
                        class="unread-indicator"
                        aria-label="Unread"
                    ></span>
                  </div>

                  <p>
                    {{ notification.message }}
                  </p>

                  <div class="notification-meta">

                    <span class="category-label">
                      {{ getType(notification.type).label }}
                    </span>

                    <span class="meta-dot">·</span>

                    <time :datetime="notification.createdAt">
                      {{ formatTime(notification.createdAt) }}
                    </time>

                  </div>
                </div>

                <!-- Actions -->
                <div class="notification-actions">

                  <button
                      v-if="isUnread(notification)"
                      type="button"
                      class="read-button"
                      title="Mark as read"
                      aria-label="Mark as read"
                      :disabled="markingId === notification.id"
                      @click="markAsRead(notification)"
                  >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>

                  <router-link
                      v-if="getType(notification.type).to"
                      :to="getType(notification.type).to"
                      class="open-link"
                      :aria-label="'Open ' + notification.title"
                      @click="markAsRead(notification)"
                  >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                      <path d="M7 17L17 7M7 7h10v10" />
                    </svg>
                  </router-link>

                </div>

              </article>

            </div>
          </div>

          <!-- Load more -->
          <div class="pagination">

            <button
                v-if="hasMore"
                type="button"
                class="load-more"
                :disabled="loadingMore"
                @click="loadMore"
            >
              <span
                  v-if="loadingMore"
                  class="button-spinner"
              ></span>

              {{
                loadingMore
                    ? 'Loading older notifications...'
                    : 'Load older notifications'
              }}
            </button>

            <div
                v-else
                class="end-message"
            >
              <span class="end-line"></span>

              <span>
                You're all caught up
              </span>

              <span class="end-line"></span>
            </div>

            <p
                v-if="loadError"
                class="pagination-error"
            >
              {{ loadError }}
              <button
                  type="button"
                  @click="loadMore"
              >
                Try again
              </button>
            </p>

          </div>

        </div>

        <!-- Empty -->
        <div
            v-else
            class="empty-state"
        >
          <div class="empty-icon">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
              <path
                  d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
              />
            </svg>
          </div>

          <h2>
            {{
              activeFilter === 'unread'
                  ? 'You are all caught up!'
                  : 'No notifications yet'
            }}
          </h2>

          <p class="muted">
            {{
              activeFilter === 'unread'
                  ? 'You have no unread notifications at the moment.'
                  : 'Your class updates and announcements will appear here.'
            }}
          </p>

          <button
              v-if="activeFilter === 'unread'"
              type="button"
              class="show-all"
              @click="changeFilter('all')"
          >
            View all notifications
          </button>
        </div>

      </section>

      <p class="page-note">
        Important updates about your learning journey will appear here.
      </p>

    </main>
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
  display: grid;
  gap: 1.5rem;
}

.wrap > * {
  min-width: 0;
}

/* Heading */

.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

h1 {
  font: 600 clamp(1.6rem, 4vw, 2.2rem) var(--font-display);
  color: var(--gold-soft);
  margin: 0;
}

.muted {
  color: var(--muted);
  font-size: .9rem;
  margin: .25rem 0 0;
}

/* Mark all */

.mark-all {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  padding: .55rem .8rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--gold);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

.mark-all:hover:not(:disabled) {
  background: var(--gold-glow);
}

.mark-all:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.mark-all svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Summary */

.summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: var(--gold-glow);
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
}

.summary-icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.summary-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: .1rem;
}

.summary-content strong {
  font-size: .95rem;
  font-weight: 600;
}

.summary-content span {
  color: var(--muted);
  font-size: .82rem;
}

.summary-count {
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 .4rem;
  border-radius: 50%;
  background: var(--gold);
  color: var(--on-gold);
  font-size: .85rem;
  font-weight: 600;
}

/* Main panel */

.panel {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  overflow: hidden;
}

/* Toolbar */

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--line);
}

.seg {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.seg button {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  padding: .5rem 1rem;
  border: 0;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

.seg button + button {
  border-left: 1px solid var(--line);
}

.seg button:not(.on):hover:not(:disabled) {
  background: var(--gold-glow);
}

.seg button.on {
  background: var(--gold);
  color: var(--on-gold);
  font-weight: 600;
}

.seg button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.filter-count {
  font-size: .7rem;
  opacity: .85;
}

.total-count {
  color: var(--muted);
  font-size: .8rem;
}

/* Groups */

.notification-groups {
  padding: .3rem 1.25rem 1rem;
}

.notification-group {
  margin-top: 1.1rem;
}

.notification-group h2 {
  margin: 0 0 .55rem;
  color: var(--gold-soft);
  font: 600 .95rem var(--font-display);
}

.notification-list {
  display: grid;
}

/* Notification */

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: .9rem;
  padding: 1rem .8rem;
  border: 1px solid transparent;
  border-bottom-color: var(--line);
  border-radius: 5px;
  transition: background .2s ease;
}

.notification-item:last-child {
  border-bottom-color: transparent;
}

.notification-item:hover {
  background: var(--bg);
}

.notification-item.unread {
  background: var(--gold-glow);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--gold);
  background: var(--surface);
}

.category-icon svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title-row {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.notification-title-row h3 {
  margin: 0;
  font-size: .9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.unread-indicator {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--gold);
}

.notification-body > p {
  margin: .25rem 0 .5rem;
  color: var(--muted);
  font-size: .84rem;
  line-height: 1.5;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: .45rem;
  color: var(--muted);
  font-size: .73rem;
  flex-wrap: wrap;
}

.category-label {
  color: var(--gold);
}

.meta-dot {
  color: var(--muted);
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: .3rem;
  flex: none;
}

.read-button,
.open-link {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  text-decoration: none;
}

.read-button:hover:not(:disabled),
.open-link:hover {
  color: var(--gold);
  border-color: var(--line);
  background: var(--surface);
}

.read-button:disabled {
  opacity: .5;
  cursor: wait;
}

.read-button svg,
.open-link svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Pagination */

.pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .8rem;
  padding: 1.5rem 1rem 1rem;
}

.load-more {
  min-width: 220px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: .55rem;
  padding: .65rem 1.2rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: transparent;
  color: var(--gold);
  font: 600 .88rem var(--font-body);
  cursor: pointer;
}

.load-more:hover:not(:disabled) {
  background: var(--gold-glow);
}

.load-more:disabled {
  opacity: .55;
  cursor: wait;
}

.button-spinner,
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--line);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.end-message {
  width: 100%;
  display: flex;
  align-items: center;
  gap: .7rem;
  color: var(--muted);
  font-size: .75rem;
}

.end-line {
  height: 1px;
  flex: 1;
  background: var(--line);
}

.pagination-error {
  margin: 0;
  color: var(--danger);
  font-size: .8rem;
}

.pagination-error button {
  margin-left: .35rem;
  border: 0;
  background: transparent;
  color: var(--gold);
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}

/* Loading */

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .7rem;
  min-height: 300px;
  color: var(--muted);
  font-size: .85rem;
}

/* Error */

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 1.5rem;
}

.error-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  border: 1px solid var(--danger);
  border-radius: 50%;
  color: var(--danger);
  font-weight: 600;
}

.error-state h2 {
  margin: 0;
  font: 600 1.15rem var(--font-display);
}

.retry-button {
  margin-top: 1rem;
  padding: .55rem .9rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

.retry-button:hover {
  background: var(--gold-glow);
}

/* Empty */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 1.5rem;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 1rem;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--gold);
}

.empty-icon svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.empty-state h2 {
  margin: 0;
  font: 600 1.15rem var(--font-display);
}

.empty-state p {
  max-width: 380px;
}

.show-all {
  margin-top: .75rem;
  padding: .55rem .9rem;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: transparent;
  color: var(--gold);
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

.show-all:hover {
  background: var(--gold-glow);
}

/* Footer */

.page-note {
  margin: 0;
  text-align: center;
  color: var(--muted);
  font-size: .8rem;
}

/* Focus */

button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

.seg button:focus-visible {
  outline-offset: -3px;
}

/* Spinner */

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .button-spinner,
  .loading-spinner {
    animation-duration: 1.6s;
  }
}

/* Mobile */

@media (max-width: 600px) {
  .wrap {
    padding: 1.4rem 1rem 3rem;
    gap: 1.1rem;
  }

  .page-heading {
    align-items: flex-start;
  }

  .page-heading .muted {
    max-width: 260px;
  }

  .mark-all {
    padding: .5rem;
    font-size: 0;
    gap: 0;
  }

  .mark-all svg {
    width: 19px;
    height: 19px;
  }

  .summary {
    padding: .8rem;
    gap: .7rem;
  }

  .summary-icon {
    width: 36px;
    height: 36px;
  }

  .toolbar {
    padding: .8rem;
  }

  .notification-groups {
    padding: .2rem .65rem .8rem;
  }

  .notification-item {
    gap: .65rem;
    padding: .85rem .35rem;
  }

  .category-icon {
    width: 34px;
    height: 34px;
  }

  .category-icon svg {
    width: 17px;
    height: 17px;
  }

  .notification-title-row h3 {
    font-size: .84rem;
  }

  .notification-body > p {
    font-size: .78rem;
  }

  .notification-actions {
    gap: 0;
  }

  .read-button,
  .open-link {
    width: 28px;
    height: 28px;
  }

  .total-count {
    font-size: .72rem;
  }

  .load-more {
    width: 100%;
  }
}
</style>
