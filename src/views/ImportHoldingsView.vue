<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '../components/BaseTopNav.vue'
import { useFundStore } from '../stores/funds'

const router = useRouter()
const fundStore = useFundStore()

const onUpload = () => {
  // 预留上传截图入口，后续接文件上传流程。
  showToast('上传截图功能开发中')
}

const onManual = () => {
  // 点击手动输入进入手动持仓导入页。
  fundStore.resetManualImport()
  router.push('/manual-holdings')
}
</script>

<template>
  <div class="page import-page">
    <BaseTopNav title="导入持仓" />

    <section class="card import-card">
      <img class="guide-image" src="/import-guide.svg" alt="导入持仓示意图" />
      <p class="guide-text">请按示意图上传“持仓”截图</p>

      <div class="btn-wrap">
        <van-button block round plain color="#e0b92f" class="btn" @click="onUpload">上传持仓页面截图</van-button>

        <van-button block plain hairline class="manual" @click="onManual">
          <template #icon>
            <van-icon name="edit" />
          </template>
          手动输入
        </van-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.import-card {
  padding: 12px 14px 18px;
}

.guide-image {
  width: 100%;
  border-radius: var(--radius-md);
  display: block;
}

.guide-text {
  text-align: center;
  font-size: 1.25rem;
  margin: 14px 0 18px;
}

.btn-wrap {
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

