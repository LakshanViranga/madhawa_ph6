import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router/index.js'
import i18n from '@/i18n'
import '@/assets/theme.css'
import '@/assets/admin.css'
import '@/assets/site.css'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createPinia } from 'pinia'
import {createHead} from "@unhead/vue/client";

const pinia = createPinia()
const head = createHead()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(router).use(head).use(pinia).use(i18n).mount('#app')
