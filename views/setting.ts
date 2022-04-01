import {createApp} from 'vue'
import {createPinia} from 'pinia'

import Setting from './vue/Setting.vue'

createApp(Setting)
.use(createPinia())
.mount('#app')
