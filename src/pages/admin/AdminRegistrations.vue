<script setup>
import {onMounted} from 'vue'
import {useRegistrations} from '@/composables/useRegistrations'

const {items, counts, status, loading, saving, error, load, setStatus, whatsappUrl} = useRegistrations()
onMounted(load)

const when = (iso) => new Date(iso).toLocaleString('en-LK', {dateStyle: 'medium', timeStyle: 'short'})
const statusClass = (s) => (s === 'new' ? 'warn' : s === 'contacted' ? 'ok' : '')
</script>

<template>
  <div class="head">
    <h1>Class requests <span v-if="counts.new" class="tag warn">{{ counts.new }} new</span></h1>
    <label class="filter">Show
      <select v-model="status">
        <option value="">All</option>
        <option value="new">New ({{ counts.new }})</option>
        <option value="contacted">Contacted ({{ counts.contacted }})</option>
        <option value="done">Done ({{ counts.done }})</option>
      </select>
    </label>
  </div>

  <section class="panel">
    <p v-if="error" class="err" role="alert">{{ error }}
      <button class="btn ghost sm" @click="load">Try again</button>
    </p>
    <div class="scroll">
      <table>
        <thead>
        <tr>
          <th>Received</th>
          <th>Student</th>
          <th>Phone</th>
          <th>Class</th>
          <th>Message</th>
          <th>Status</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="r in items" :key="r.id">
          <td>{{ when(r.created_at) }}</td>
          <td>{{ r.student_name }}</td>
          <td>
            <a :href="`tel:${r.phone}`">{{ r.phone }}</a>
            <a class="wa" :href="whatsappUrl(r.phone)" target="_blank" rel="noopener">WhatsApp</a>
          </td>
          <td>{{ r.class_name || 'Not chosen' }}</td>
          <td class="msg">{{ r.message }}</td>
          <td>
            <select :value="r.status" :disabled="saving" :class="statusClass(r.status)"
                    :aria-label="`Status for ${r.student_name}`" @change="setStatus(r.id, $event.target.value)">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="done">Done</option>
            </select>
          </td>
        </tr>
        <tr v-if="loading && !items.length">
          <td colspan="6" class="muted">Loading...</td>
        </tr>
        <tr v-else-if="!items.length && !error">
          <td colspan="6" class="muted">No requests yet.</td>
        </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.filter {
  min-width: 180px;
}

.wa {
  display: block;
  font-size: .8rem;
  color: var(--secondary);
}

.msg {
  max-width: 260px;
  white-space: pre-wrap;
  color: var(--muted);
}

td a {
  color: var(--text);
}

td select {
  min-width: 120px;
}

td select.warn {
  border-color: var(--danger);
}

td select.ok {
  border-color: var(--accent);
}

.err {
  color: var(--danger);
  font-size: .9rem;
  margin: 0 0 1rem;
}
</style>
