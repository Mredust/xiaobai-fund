<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {showToast} from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import {type WatchFundItem, useFundStore} from '@/stores/funds'
import {TAG_NAME_ALL, useTagStore} from '@/stores/tags'

const TEXT = {
  pageTitle: '\u6279\u91cf\u7f16\u8f91',
  selectAll: '\u5168\u9009',
  empty: '\u5f53\u524d\u6807\u7b7e\u6682\u65e0\u57fa\u91d1',
  delete: '\u5220\u9664',
  moveGroup: '\u79fb\u52a8\u5206\u7ec4',
  done: '\u5b8c\u6210',
  deletedPrefix: '\u5df2\u5220\u9664',
  deletedSuffix: '\u53ea\u57fa\u91d1',
  noFundDeleted: '\u6ca1\u6709\u53ef\u5220\u9664\u57fa\u91d1',
  targetTag: '\u76ee\u6807\u5206\u7ec4',
  chooseTag: '\u8bf7\u9009\u62e9\u76ee\u6807\u5206\u7ec4',
  movedPrefix: '\u5df2\u6dfb\u52a0\u5230',
  alreadyExists: '\u76ee\u6807\u5206\u7ec4\u5df2\u5b58\u5728\u6240\u9009\u57fa\u91d1',
  createTag: '+ \u65b0\u5efa',
  moveToTitle: '\u79fb\u52a8\u5230\u4ee5\u4e0b\u5206\u7ec4',
  confirm: '\u786e\u8ba4'
} as const

const route = useRoute()
const router = useRouter()
const tagStore = useTagStore()
const fundStore = useFundStore()

const watchTags = computed(() => tagStore.watchTags)

const routeTagId = computed(() => {
  const parsed = Number(route.query.tagId)
  return Number.isFinite(parsed) ? parsed : 0
})

const currentTagId = computed(() => {
  if (watchTags.value.some((item) => item.id === routeTagId.value)) {
    return routeTagId.value
  }
  return tagStore.activeWatchTagId
})

const currentTag = computed(() => watchTags.value.find((item) => item.id === currentTagId.value) || null)

const isAllTag = computed(() => currentTag.value?.name === TAG_NAME_ALL)

const watchFunds = computed<WatchFundItem[]>(() => {
  if (!currentTag.value) {
    return []
  }

  if (!isAllTag.value) {
    return fundStore.getWatchFundsByTag(currentTagId.value)
  }

  const mergedCodes = new Set<string>()
  const mergedFunds: WatchFundItem[] = []

  watchTags.value.forEach((tag) => {
    fundStore.getWatchFundsByTag(tag.id).forEach((item) => {
      if (mergedCodes.has(item.code)) {
        return
      }
      mergedCodes.add(item.code)
      mergedFunds.push(item)
    })
  })

  return mergedFunds
})

const selectedCodes = ref<string[]>([])

watch(watchFunds, (rows) => {
  const availableCodes = new Set(rows.map((item) => item.code))
  selectedCodes.value = selectedCodes.value.filter((code) => availableCodes.has(code))
})

const selectedCount = computed(() => selectedCodes.value.length)
const hasSelection = computed(() => selectedCount.value > 0)

const allSelectedModel = computed({
  get: () => watchFunds.value.length > 0 && selectedCodes.value.length === watchFunds.value.length,
  set: (value: boolean) => {
    selectedCodes.value = value ? watchFunds.value.map((item) => item.code) : []
  }
})

const actionDisabled = computed(() => !hasSelection.value)

const selectedFundMap = computed(() => {
  const map = new Map<string, WatchFundItem>()
  watchFunds.value.forEach((item) => {
    map.set(item.code, item)
  })
  return map
})

const toggleCode = (code: string) => {
  if (selectedCodes.value.includes(code)) {
    selectedCodes.value = selectedCodes.value.filter((item) => item !== code)
    return
  }
  selectedCodes.value = [...selectedCodes.value, code]
}

const removeSelected = () => {
  if (!hasSelection.value) {
    return
  }

  const codes = [...selectedCodes.value]
  let removedCount = 0

  if (isAllTag.value) {
    const tagIds = watchTags.value.map((item) => item.id)
    codes.forEach((code) => {
      const hasAny = tagIds.some((tagId) => fundStore.isWatchFund(code, tagId))
      if (!hasAny) {
        return
      }
      tagIds.forEach((tagId) => {
        fundStore.removeWatchFund(code, tagId)
      })
      removedCount += 1
    })
  } else {
    codes.forEach((code) => {
      if (fundStore.removeWatchFund(code, currentTagId.value)) {
        removedCount += 1
      }
    })
  }

  selectedCodes.value = []
  if (removedCount > 0) {
    showToast(`${TEXT.deletedPrefix} ${removedCount} ${TEXT.deletedSuffix}`)
    return
  }

  showToast(TEXT.noFundDeleted)
}

const showMovePopup = ref(false)
const selectedTargetTagId = ref(0)

const openMovePopup = () => {
  if (!hasSelection.value) {
    return
  }

  const fallback = watchTags.value.find((item) => item.id !== currentTagId.value)?.id || watchTags.value[0]?.id || 0
  selectedTargetTagId.value = fallback
  showMovePopup.value = true
}

const closeMovePopup = () => {
  showMovePopup.value = false
}

const targetTagName = computed(
  () => watchTags.value.find((item) => item.id === selectedTargetTagId.value)?.name || TEXT.targetTag
)

const confirmMoveGroup = () => {
  if (!hasSelection.value) {
    closeMovePopup()
    return
  }

  const targetTagId = selectedTargetTagId.value
  if (!targetTagId) {
    showToast(TEXT.chooseTag)
    return
  }

  let movedCount = 0
  selectedCodes.value.forEach((code) => {
    const fund = selectedFundMap.value.get(code) || fundStore.getWatchFundByCode(code)
    if (!fund) {
      return
    }
    if (fundStore.addWatchFund({tagId: targetTagId, code: fund.code, name: fund.name})) {
      movedCount += 1
    }
  })

  closeMovePopup()
  showToast(movedCount > 0 ? `${TEXT.movedPrefix}${targetTagName.value}` : TEXT.alreadyExists)
}

const openWatchTagManage = () => {
  closeMovePopup()
  router.push('/tag-manage?scene=watchlist')
}

const finishBatchEdit = () => {
  if (!hasSelection.value) {
    return
  }
  router.back()
}
</script>

<template>
  <div class="page watchlist-batch-page">
    <BaseTopNav :title="currentTag?.name || TEXT.pageTitle"/>

    <section class="card batch-card">
      <div class="batch-head">
        <van-checkbox v-model="allSelectedModel" checked-color="#14b866"/>
        <span>{{ TEXT.selectAll }}</span>
      </div>

      <van-checkbox-group v-model="selectedCodes" class="batch-list">
        <article
            v-for="item in watchFunds"
            :key="item.code"
            class="batch-item"
            @click="toggleCode(item.code)"
        >
          <van-checkbox :name="item.code" checked-color="#14b866" @click.stop/>
          <div class="batch-item-main">
            <strong>{{ item.name }}</strong>
            <span>{{ item.code }}</span>
          </div>
        </article>
      </van-checkbox-group>

      <div v-if="watchFunds.length === 0" class="empty-wrap">
        <van-empty :description="TEXT.empty"/>
      </div>
    </section>

    <footer class="batch-actions">
      <button type="button" class="batch-action danger" :disabled="actionDisabled" @click="removeSelected">
        {{ TEXT.delete }}{{ selectedCount > 0 ? `(${selectedCount})` : '' }}
      </button>
      <button type="button" class="batch-action" :disabled="actionDisabled" @click="openMovePopup">
        {{ TEXT.moveGroup }}
      </button>
      <button type="button" class="batch-action" :disabled="actionDisabled" @click="finishBatchEdit">
        {{ TEXT.done }}
      </button>
    </footer>

    <van-popup v-model:show="showMovePopup" position="bottom" round class="group-popup">
      <div class="group-popup-head">
        <button type="button" class="group-new-btn" @click="openWatchTagManage">{{ TEXT.createTag }}</button>
        <strong>{{ TEXT.moveToTitle }}</strong>
        <button type="button" class="group-close-btn" @click="closeMovePopup">
          <van-icon name="cross" size="20"/>
        </button>
      </div>

      <van-radio-group v-model="selectedTargetTagId" class="group-list">
        <div
            v-for="tag in watchTags"
            :key="tag.id"
            class="group-item"
            role="button"
            tabindex="0"
            @click="selectedTargetTagId = tag.id"
            @keydown.enter.prevent="selectedTargetTagId = tag.id"
            @keydown.space.prevent="selectedTargetTagId = tag.id"
        >
          <van-radio :name="tag.id" checked-color="#2f5bd8"/>
          <span>{{ tag.name }}</span>
        </div>
      </van-radio-group>

      <button type="button" class="group-confirm-btn" @click="confirmMoveGroup">{{ TEXT.confirm }}</button>
    </van-popup>
  </div>
</template>

<style scoped>
.watchlist-batch-page {
  --actions-height: calc(3.625rem + env(safe-area-inset-bottom));
  padding-top: 0;
  min-height: 100vh;
  padding-bottom: var(--actions-height);
}

.batch-card {
  margin-top: 8px;
  border-top: 1px solid var(--line);
}

.batch-head {
  min-height: 56px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  font-size: 1rem;
  color: #273053;
}

.batch-list {
  padding: 0 14px;
}

.batch-item {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.batch-item-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.batch-item-main strong {
  font-size: 1.0625rem;
  font-weight: 500;
  color: #1b223f;
}

.batch-item-main span {
  margin-top: 2px;
  font-size: 0.8125rem;
  color: #7f8597;
}

.empty-wrap {
  padding: 32px 0;
}

.batch-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--actions-height);
  background: #fff;
  border-top: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.batch-action {
  border: 0;
  border-right: 1px solid var(--line);
  background: #fff;
  color: #1a2340;
  font-size: 1.125rem;
  cursor: pointer;
}

.batch-action:last-child {
  border-right: 0;
}

.batch-action.danger {
  color: #e34a4a;
}

.batch-action:disabled {
  color: #c5cada;
  cursor: not-allowed;
}

.group-popup {
  max-height: 70vh;
  overflow: hidden;
}

.group-popup-head {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
}

.group-popup-head strong {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111a37;
}

.group-new-btn,
.group-close-btn {
  border: 0;
  background: transparent;
  color: #2f5bd8;
  font-size: 1rem;
  cursor: pointer;
}

.group-close-btn {
  color: #b6bccd;
  display: inline-flex;
  align-items: center;
}

.group-list {
  max-height: calc(70vh - 134px);
  overflow-y: auto;
}

.group-item {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  font-size: 1.0625rem;
  color: #111a37;
  cursor: pointer;
}

.group-confirm-btn {
  width: 100%;
  height: 62px;
  border: 0;
  background: #fff;
  color: #101a39;
  font-size: 1.125rem;
  font-weight: 700;
  border-top: 1px solid #dde2f1;
  cursor: pointer;
}
</style>
