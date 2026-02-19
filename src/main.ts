import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import { persistStorePlugin } from './stores/plugins/persist'
import { useFundStore } from './stores/funds'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

pinia.use(persistStorePlugin)

const fundStore = useFundStore(pinia)
fundStore.runDueSipPlans()
setInterval(() => {
  fundStore.runDueSipPlans()
}, 60 * 60 * 1000)

app.use(pinia)
app.use(router)
app.use(Vant)
app.mount('#app')
