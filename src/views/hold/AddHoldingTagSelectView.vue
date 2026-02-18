<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import { fetchFundData, type FundDetailResult } from '@/api/fundApi'
import { HOLDING_ACCOUNT_SUMMARY_NAME, useTagStore } from '@/stores/tags'
import { useFundStore } from '@/stores/funds'

const route = useRoute()
const router = useRouter()
const tagStore = useTagStore()
const fundStore = useFundStore()

const loading = ref(false)
const detail = ref<FundDetailResult | null>(null)
const selectedTagId = ref(0)

const code = computed(() => String(route.params.code || '').trim())

const backToPath = computed(() => {
  const from = route.query.from
  if (typeof from === 'string' && from.trim()) {
    return from
  }
  return `/fund/${code.value}`
})

const holdingTagOptions = computed(() => {
  const filtered = tagStore.holdingTags.filter((item) => item.name !== HOLDING_ACCOUNT_SUMMARY_NAME)
  return filtered.length ? filtered : [...tagStore.holdingTags]
})

const loadDetail = async () => {
  if (!code.value) {
    detail.value = null
    return
  }

  loading.value = true
  try {
    detail.value = await fetchFundData(code.value)
  } catch (error) {
    console.error(error)
    showToast('基金信息加载失败')
  } finally {
    loading.value = false
  }
}

const pickTag = (tagId: number) => {
  selectedTagId.value = tagId
}

const tagHoldCount = (tagId: number) => {
  return fundStore.getHoldingFundsByTag(tagId).length
}

const toNext = () => {
  const targetTagId = selectedTagId.value || holdingTagOptions.value[0]?.id || 0
  if (!targetTagId) {
    showToast('暂无可用持有分组')
    return
  }

  router.push({
    path: `/fund/${code.value}/add-holding/input`,
    query: {
      tagId: String(targetTagId),
      from: backToPath.value
    }
  })
}

watch(
  () => holdingTagOptions.value,
  (list) => {
    if (selectedTagId.value && list.some((item) => item.id === selectedTagId.value)) {
      return
    }
    selectedTagId.value = list[0]?.id || 0
  },
  { immediate: true }
)

watch(
  () => code.value,
  () => {
    void loadDetail()
  },
  { immediate: true }
)
</script>

<template>
  <div class="page add-holding-tag-page">
    <BaseTopNav title="添加到选中账户" :back-to="backToPath" />

    <section v-if="loading" class="card loading-wrap">
      <van-loading size="28" />
    </section>

    <template v-else-if="detail">
      <section class="card tag-list">
        <button
          v-for="tag in holdingTagOptions"
          :key="tag.id"
          type="button"
          class="tag-item"
          @click="pickTag(tag.id)"
        >
          <span class="radio-dot" :class="{ checked: selectedTagId === tag.id }"></span>
          <strong>{{ tag.name }}</strong>
          <span class="count">持有{{ tagHoldCount(tag.id) }}只</span>
        </button>
      </section>
    </template>

    <section class="bottom-actions">
      <van-button block round type="primary" color="#3b63e6" @click="toNext">下一步</van-button>
    </section>
  </div>
</template>

<style scoped>
.add-holding-tag-page {
  min-height: calc(100vh - 3.5rem - env(safe-area-inset-bottom));
  background: #f4f5f8;
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}

.loading-wrap {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fund-brief {
  margin-top: 8px;
  padding: 14px 12px;
}

.fund-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.fund-name {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.2;
  color: #4c4f84;
}

.fund-code {
  color: #5f6486;
  font-size: 0.875rem;
  font-weight: 600;
}

.fund-nav-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #5d637f;
  font-size: 1rem;
}

.fund-nav-row strong {
  font-size: 1.0625rem;
  color: #1f2740;
}

.change-text.rise {
  color: #e34a4a;
}

.change-text.fall {
  color: #22a06b;
}

.tag-list {
  margin-top: 8px;
  padding: 0;
}

.tag-item {
  width: 100%;
  min-height: 74px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: #fff;
  display: grid;
  grid-template-columns: 30px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  cursor: pointer;
  text-align: left;
}

.tag-item:last-child {
  border-bottom: 0;
}

.radio-dot {
  width: 20px;
  height: 20px;
  border: 2px solid #b6bdcf;
  border-radius: 50%;
  box-sizing: border-box;
}

.radio-dot.checked {
  border-color: #3b63e6;
  box-shadow: inset 0 0 0 4px #fff, inset 0 0 0 12px #3b63e6;
}

.tag-item strong {
  font-size: 1.125rem;
  color: #111b3a;
}

.count {
  font-size: 1.0625rem;
  color: #b4bacb;
}

.bottom-actions {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(10px + env(safe-area-inset-bottom));
}

.bottom-actions :deep(.van-button) {
  height: 58px;
  font-size: 1.0625rem;
}
</style>
