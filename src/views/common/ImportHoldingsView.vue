<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'

const route = useRoute()
const router = useRouter()

const scene = computed<'watchlist' | 'holdings'>(() => {
  // Support both watchlist import and holdings import in one view.
  return route.query.scene === 'watchlist' ? 'watchlist' : 'holdings'
})

const pageTitle = computed(() => (scene.value === 'watchlist' ? '\u65b0\u589e\u81ea\u9009' : '\u540c\u6b65\u6301\u4ed3'))
const uploadText = computed(() =>
  scene.value === 'watchlist'
    ? '\u4e0a\u4f20\u81ea\u9009\u9875\u9762\u622a\u56fe'
    : '\u4e0a\u4f20\u6301\u4ed3\u9875\u9762\u622a\u56fe'
)
const manualText = '\u624b\u52a8\u8f93\u5165'

const onUpload = () => {
  // Placeholder action until screenshot import is implemented.
  showToast('\u4e0a\u4f20\u622a\u56fe\u529f\u80fd\u5f00\u53d1\u4e2d')
}

const onManual = () => {
  // Go to fund search and import directly after selecting a fund.
  router.push(`/fund-search?mode=pick-import&scene=${scene.value}`)
}
</script>

<template>
  <div class="page import-page">
    <BaseTopNav :title="pageTitle" />

    <section class="card import-card">
      <div class="btn-wrap">
        <van-button block round plain color="#e0b92f" class="btn" @click="onUpload">{{ uploadText }}</van-button>

        <van-button block plain hairline class="manual" @click="onManual">
          <template #icon>
            <van-icon name="edit" />
          </template>
          {{ manualText }}
        </van-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.import-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 14px 18px;
}

.btn-wrap {
  width: min(320px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  height: 48px;
  font-size: 1.375rem;
  font-weight: 600;
}

.manual {
  color: #7a8092;
  border: 0;
  font-size: 1.125rem;
}
</style>
