<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PrefsSwitch from "@/components/PrefsSwitch.vue";

const props = defineProps({
  who: {
    type: String,
    default: ''
  },
  /**
   * Array of notification objects, exactly:
   * { id, userId, type, title, message, readAt, createdAt }
   *  - readAt: null/undefined when unread, ISO date string when read
   *  - createdAt: ISO date string
   */
  notifications: {
    type: Array,
    default: () => []
  },
  /** Max items shown in the dropdown */
  maxVisible: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['mark-read', 'mark-all-read', 'logout'])

const menuOpen = ref(false)
const notificationOpen = ref(false)

/* --------------------------------
   Notification helpers
-------------------------------- */

// Icon paths + destination per notification `type`.
// Adjust the keys to match the `type` values your API sends.
const TYPE_CONFIG = {
  lesson: {
    to: '/lms/classes',
    path: 'M4 19h16M6 17V9a6 6 0 0 1 12 0v8M9 21h6'
  },
  progress: {
    to: '/lms/progress',
    path: 'M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3'
  },
  issue: {
    to: '/lms/issue',
    path: 'M20 6L9 17l-5-5'
  }
}

const DEFAULT_CONFIG = {
  to: '/lms/notifications',
  path: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'
}

const configFor = (type) => TYPE_CONFIG[type] || DEFAULT_CONFIG

const isUnread = (n) => !n.readAt

const sortedNotifications = computed(() =>
    [...props.notifications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, props.maxVisible)
)

const unreadCount = computed(
    () => props.notifications.filter(isUnread).length
)

const unreadLabel = computed(() =>
    unreadCount.value === 1
        ? '1 unread notification'
        : `${unreadCount.value} unread notifications`
)

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const timeAgo = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ]

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return 'Just now'
}

/* --------------------------------
   Dropdown state
-------------------------------- */

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  notificationOpen.value = false
}

const toggleNotifications = () => {
  notificationOpen.value = !notificationOpen.value
  menuOpen.value = false
}

const closeDropdowns = () => {
  menuOpen.value = false
  notificationOpen.value = false
}

const logout = () => {
  emit('logout')
  menuOpen.value = false
  notificationOpen.value = false
}

const openNotification = (notification) => {
  if (isUnread(notification)) {
    emit('mark-read', notification.id)
  }
  closeDropdowns()
}

const markAllRead = () => {
  emit('mark-all-read')
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    closeDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="bar">
    <!-- Brand -->
    <router-link to="/" class="brand">
      Tharka
    </router-link>

    <!-- Main navigation -->
    <nav class="tabs" aria-label="Student area">
      <router-link
          to="/lms/"
          exact-active-class="on"
      >
        Dashboard
      </router-link>
      <router-link
          to="/lms/classes"
         exact-active-class="on"
      >
        Classes
      </router-link>

      <router-link
          to="/lms/progress"
          exact-active-class="on"
      >
        My progress
      </router-link>

      <router-link
          to="/lms/issue"
          exact-active-class="on"
      >
        Report Issue
      </router-link>
    </nav>

    <!-- Right side -->
    <div class="actions">

      <!-- Notification -->
      <div class="notification-wrapper">
        <button
            type="button"
            class="notification"
            :aria-expanded="notificationOpen"
            aria-haspopup="menu"
            :aria-label="unreadCount ? `Notifications, ${unreadLabel}` : 'Notifications'"
            @click="toggleNotifications"
        >
          <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            />
          </svg>

          <span
              v-if="unreadCount"
              class="notification-dot"
              aria-hidden="true"
          ></span>
        </button>

        <!-- Notification dropdown -->
        <Transition name="menu">
          <div
              v-if="notificationOpen"
              class="notification-menu"
              role="menu"
          >
            <!-- Header -->
            <div class="notification-header">
              <strong>Notifications</strong>

              <button
                  v-if="unreadCount"
                  type="button"
                  class="mark-read"
                  @click="markAllRead"
              >
                Mark all as read
              </button>
            </div>

            <!-- Notification list -->
            <div class="notification-list">

              <p v-if="!sortedNotifications.length" class="notification-empty">
                You're all caught up. New notifications will appear here.
              </p>

              <router-link
                  v-for="n in sortedNotifications"
                  :key="n.id"
                  :to="configFor(n.type).to"
                  class="notification-item"
                  :class="{ unread: isUnread(n) }"
                  role="menuitem"
                  @click="openNotification(n)"
              >
                <span class="notification-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path :d="configFor(n.type).path" />
                  </svg>
                </span>

                <span class="notification-content">
                  <strong>{{ n.title }}</strong>
                  <span>{{ n.message }}</span>
                  <small>
                    <time :datetime="n.createdAt">{{ timeAgo(n.createdAt) }}</time>
                  </small>
                </span>
              </router-link>

            </div>

            <!-- View all -->
            <div class="notification-footer">
              <router-link
                  to="/lms/notifications"
                  class="view-all"
                  @click="closeDropdowns"
              >
                View all notifications
                <span aria-hidden="true">→</span>
              </router-link>
            </div>
          </div>
        </Transition>
      </div>
      <prefs-switch/>
      <!-- User name -->
      <span v-if="who" class="who">
        {{ who }}
      </span>

      <!-- Hamburger -->
      <div class="menu-wrapper">
        <button
            type="button"
            class="menu-button"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            aria-label="Open user menu"
            @click="toggleMenu"
        >
          <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- User dropdown -->
        <Transition name="menu">
          <div
              v-if="menuOpen"
              class="user-menu"
              role="menu"
          >
            <div v-if="who" class="mobile-user">
              <span class="mobile-user-label">Signed in as</span>
              <strong>{{ who }}</strong>
            </div>

            <router-link
                to="/lms/profile"
                class="menu-item"
                role="menuitem"
                @click="closeDropdowns"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M20 21a8 8 0 0 0-16 0
                     M12 11a4 4 0 1 0 0-8
                     4 4 0 0 0 0 8z"
                />
              </svg>

              <span>Profile</span>
            </router-link>

            <div class="menu-divider"></div>

            <button
                type="button"
                class="menu-item logout"
                role="menuitem"
                @click="logout"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                    d="M10 17l5-5-5-5
                     M15 12H3
                     M21 19V5a2 2 0 0 0-2-2h-6"
                />
              </svg>

              <span>Log out</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .8rem 1.25rem;
  border-bottom: 1px solid var(--line);
  background: var(--bg-glass);
}

.brand {
  font: 600 1.2rem var(--font-display);
  color: var(--gold);
  text-decoration: none;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  gap: 1.25rem;
  margin-right: auto;
}

.tabs a {
  color: var(--text);
  text-decoration: none;
  font-size: .95rem;
  padding-bottom: 2px;
}

.tabs a.on {
  color: var(--gold);
  border-bottom: 2px solid var(--gold);
}

.actions {
  display: flex;
  align-items: center;
  gap: .9rem;
}

.who {
  color: var(--muted);
  font-size: .9rem;
}

/* --------------------------------
   Notification
-------------------------------- */

.notification-wrapper {
  position: relative;
}

.notification {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 0;
  color: var(--text);
  background: transparent;
  border-radius: 50%;
  cursor: pointer;

  transition:
      background .2s ease,
      color .2s ease;
}

.notification:hover,
.notification[aria-expanded="true"] {
  color: var(--gold);
  background: var(--bg-glass);
}

.notification svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.notification-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
  border: 2px solid var(--bg-glass);
}

/* Notification dropdown */

.notification-menu {
  position: absolute;
  top: calc(100% + .65rem);
  right: 0;
  width: 360px;
  max-width: calc(100vw - 2rem);

  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg-glass);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .18);
  backdrop-filter: blur(12px);

  overflow: hidden;
  z-index: 100;
}

/* Header */

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .8rem .9rem;
  border-bottom: 1px solid var(--line);
}

.notification-header strong {
  color: var(--text);
  font-size: .95rem;
}

.mark-read {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--gold);
  font-size: .72rem;
  cursor: pointer;
}

.mark-read:hover {
  text-decoration: underline;
}

/* List */

.notification-list {
  max-height: 330px;
  overflow-y: auto;
}

.notification-empty {
  margin: 0;
  padding: 1.5rem .9rem;
  color: var(--muted);
  font-size: .8rem;
  line-height: 1.4;
  text-align: center;
}

.notification-item {
  display: flex;
  gap: .7rem;
  padding: .8rem .9rem;

  color: var(--text);
  text-decoration: none;

  border-bottom: 1px solid var(--line);

  transition:
      background .2s ease;
}

.notification-item:hover {
  background: var(--bg-glass);
}

.notification-item.unread {
  background: color-mix(
      in srgb,
      var(--gold) 5%,
      transparent
  );
}

.notification-item:not(.unread) .notification-content strong {
  font-weight: 500;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;
  flex-shrink: 0;

  color: var(--gold);

  border: 1px solid var(--line);
  border-radius: 50%;
}

.notification-icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.notification-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: .15rem;
}

.notification-content strong {
  color: var(--text);
  font-size: .82rem;
  font-weight: 600;
}

.notification-content span {
  color: var(--muted);
  font-size: .76rem;
  line-height: 1.35;
}

.notification-content small {
  color: var(--muted);
  font-size: .68rem;
  margin-top: .1rem;
}

/* Footer */

.notification-footer {
  padding: .65rem .9rem;
  text-align: center;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: .4rem;

  color: var(--gold);
  text-decoration: none;
  font-size: .8rem;
  font-weight: 500;
}

.view-all:hover {
  text-decoration: underline;
}

/* --------------------------------
   Hamburger
-------------------------------- */

.menu-wrapper {
  position: relative;
}

.menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 38px;
  height: 38px;
  padding: 0;

  border: 0;
  border-radius: 50%;

  color: var(--text);
  background: transparent;

  cursor: pointer;

  transition:
      background .2s ease,
      color .2s ease;
}

.menu-button:hover,
.menu-button[aria-expanded="true"] {
  color: var(--gold);
  background: var(--bg-glass);
}

.menu-button svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* User dropdown */

.user-menu {
  position: absolute;
  top: calc(100% + .65rem);
  right: 0;
  width: 220px;

  padding: .45rem;

  border: 1px solid var(--line);
  border-radius: 12px;

  background: var(--bg-glass);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .18);

  z-index: 100;
  backdrop-filter: blur(12px);
}

.mobile-user {
  display: flex;
  flex-direction: column;
  gap: .15rem;
  padding: .65rem .7rem .75rem;
}

.mobile-user-label {
  color: var(--muted);
  font-size: .72rem;
}

.mobile-user strong {
  color: var(--text);
  font-size: .9rem;
  font-weight: 600;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: .7rem;

  width: 100%;
  box-sizing: border-box;

  padding: .65rem .7rem;

  /* button resets (no effect on <a>) */
  margin: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: .9rem;
  text-align: left;
  cursor: pointer;

  border-radius: 8px;

  color: var(--text);
  text-decoration: none;

  transition:
      background .2s ease,
      color .2s ease;
}

.menu-item:hover {
  color: var(--gold);
  background: var(--bg-glass);
}

.menu-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;

  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.menu-item.logout {
  color: var(--gold);
}

.menu-divider {
  height: 1px;
  margin: .35rem .5rem;
  background: var(--line);
}

/* --------------------------------
   Animation
-------------------------------- */

.menu-enter-active,
.menu-leave-active {
  transition:
      opacity .15s ease,
      transform .15s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (prefers-reduced-motion: reduce) {
  .menu-enter-active,
  .menu-leave-active {
    transition: none;
  }
}

/* --------------------------------
   Focus
-------------------------------- */

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--gold-soft);
  outline-offset: 3px;
}

/* --------------------------------
   Mobile
-------------------------------- */

@media (max-width: 760px) {
  .bar {
    padding: .7rem 1rem;
    gap: .75rem;
  }

  .tabs {
    display: none;
  }

  .actions {
    margin-left: auto;
    gap: .45rem;
  }

  .who {
    display: none;
  }

  .notification,
  .menu-button {
    width: 36px;
    height: 36px;
  }

  .notification-menu {
    position: fixed;
    top: 62px;
    right: 1rem;
    left: 1rem;
    width: auto;
    max-width: none;
  }

  .user-menu {
    width: 210px;
  }
}
</style>
