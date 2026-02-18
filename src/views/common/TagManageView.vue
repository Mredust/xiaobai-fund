<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { showConfirmDialog, showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import {
  HOLDING_ACCOUNT_SUMMARY_NAME,
  TAG_NAME_ALL,
  useTagStore,
  type TagItem
} from '@/stores/tags'
import { useFundStore } from '@/stores/funds'

interface DragMoveEvent {
  draggedContext: {
    element: TagItem
  }
  relatedContext?: {
    element?: TagItem
  }
}

const route = useRoute()
const tagStore = useTagStore()
const fundStore = useFundStore()

const manageScene = computed<'holdings' | 'watchlist'>(() => {
  // 依据路由场景区分“持有标签管理”和“自选标签管理”。
  return route.query.scene === 'watchlist' ? 'watchlist' : 'holdings'
})

const pageTitle = computed(() => {
  // 场景化标题，避免用户误以为两端标签共用。
  return manageScene.value === 'watchlist' ? '自选标签管理' : '持有标签管理'
})

const isAccountSummaryTag = (item: TagItem) => item.name === HOLDING_ACCOUNT_SUMMARY_NAME
const isAllTag = (item: TagItem) => item.name === TAG_NAME_ALL

const canRemoveTag = (item: TagItem) => {
  if (manageScene.value === 'watchlist') {
    return !isAllTag(item)
  }
  return !isAllTag(item) && !isAccountSummaryTag(item)
}

const canEditTag = (item: TagItem) => {
  if (manageScene.value === 'watchlist') {
    return !isAllTag(item)
  }
  return !isAllTag(item) && !isAccountSummaryTag(item)
}

const canClearTag = (item: TagItem) => {
  if (manageScene.value === 'watchlist') {
    return true
  }
  return !isAccountSummaryTag(item)
}

const canSortTag = (item: TagItem) => {
  if (manageScene.value === 'watchlist') {
    return !isAllTag(item)
  }
  return !isAllTag(item) && !isAccountSummaryTag(item)
}

const normalizeWatchTagOrder = (value: TagItem[]) => {
  const allTag = tagStore.watchTags.find((item) => isAllTag(item))
  const customTags = value.filter((item) => !isAllTag(item))

  return [...(allTag ? [allTag] : []), ...customTags]
}

const normalizeHoldingTagOrder = (value: TagItem[]) => {
  const accountSummaryTag = tagStore.holdingTags.find((item) => isAccountSummaryTag(item))
  const allTag = tagStore.holdingTags.find((item) => isAllTag(item))
  const customTags = value.filter((item) => !isAllTag(item) && !isAccountSummaryTag(item))

  return [
    ...(accountSummaryTag ? [accountSummaryTag] : []),
    ...(allTag ? [allTag] : []),
    ...customTags
  ]
}

const reorderCurrentTags = (value: TagItem[]) => {
  // 根据当前场景重排标签；系统标签始终固定在预设位置。
  if (manageScene.value === 'watchlist') {
    tagStore.watchTags = normalizeWatchTagOrder(value)
    if (!tagStore.watchTags.some((item) => item.id === tagStore.activeWatchTagId)) {
      tagStore.activeWatchTagId = tagStore.watchTags[0]?.id ?? 0
    }
    return
  }

  tagStore.reorderHoldingTags(normalizeHoldingTagOrder(value))
}

const tagsModel = computed({
  get: () =>
    manageScene.value === 'watchlist'
      ? tagStore.watchTags
      : tagStore.holdingTags.filter((item) => !isAccountSummaryTag(item)),
  set: (value: TagItem[]) => reorderCurrentTags(value)
})

const onTagMove = (event: DragMoveEvent) => {
  // 系统标签不允许排序，且其他标签不能跨过系统标签区域。
  const dragged = event.draggedContext.element
  if (!canSortTag(dragged)) {
    return false
  }

  const related = event.relatedContext?.element
  if (related && !canSortTag(related)) {
    return false
  }

  return true
}

const showEditDialog = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingId = ref<number | null>(null)
const editName = ref('')

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '新建标签' : '编辑标签'))

const openAddDialog = () => {
  // 打开“新建标签”弹窗并重置输入状态。
  dialogMode.value = 'add'
  editingId.value = null
  editName.value = ''
  showEditDialog.value = true
}

const openEditDialog = (item: TagItem) => {
  // 打开“编辑标签”弹窗并回填当前标签名称。
  if (!canEditTag(item)) {
    showToast('系统标签不可修改')
    return
  }

  dialogMode.value = 'edit'
  editingId.value = item.id
  editName.value = item.name
  showEditDialog.value = true
}

const confirmEdit = () => {
  // 根据场景和弹窗模式执行新增或编辑标签操作。
  const value = editName.value.trim()
  if (!value) {
    showToast('请输入标签名称')
    return false
  }

  if (dialogMode.value === 'add') {
    if (manageScene.value === 'watchlist') {
      tagStore.addWatchTag(value)
    } else {
      tagStore.addHoldingTag(value)
    }
    showToast('标签已添加')
    return true
  }

  if (editingId.value === null) {
    return false
  }

  const currentTag =
    manageScene.value === 'watchlist'
      ? tagStore.watchTags.find((item) => item.id === editingId.value)
      : tagStore.holdingTags.find((item) => item.id === editingId.value)

  if (!currentTag || !canEditTag(currentTag)) {
    showToast('系统标签不可修改')
    return false
  }

  const updated =
    manageScene.value === 'watchlist'
      ? tagStore.updateWatchTag(editingId.value, value)
      : tagStore.updateHoldingTag(editingId.value, value)

  if (!updated) {
    showToast('标签修改失败')
    return false
  }

  showToast('标签已修改')
  return true
}

const removeTag = async (item: TagItem) => {
  // 通过左侧减号移除当前场景标签，移除前进行安全确认。
  if (!canRemoveTag(item)) {
    showToast('系统标签不可移除')
    return
  }

  try {
    await showConfirmDialog({
      title: '安全提示',
      message:
        manageScene.value === 'watchlist'
          ? '此标签下的自选基金也会删除，\n您确定删除此标签吗？'
          : '此账户下的持有基金也会删除，\n您确定删除此账户吗？',
      cancelButtonText: '取消',
      confirmButtonText: '确定删除'
    })
  } catch {
    return
  }

  const removed =
    manageScene.value === 'watchlist' ? tagStore.removeWatchTag(item.id) : tagStore.removeHoldingTag(item.id)

  if (!removed) {
    showToast('标签不可移除')
    return
  }

  if (manageScene.value === 'watchlist') {
    // 标签删除后同步清理该标签下的自选基金数据。
    fundStore.clearWatchFunds(item.id)
  } else {
    // 标签删除后同步清理该标签下的持有基金数据。
    fundStore.clearHoldingFunds(item.id)
  }

  showToast(`已移除 ${item.name}`)
}

const clearTag = async (item: TagItem) => {
  // 清空前弹出确认框，并清空当前场景对应数据。
  if (!canClearTag(item)) {
    showToast('系统标签不可清空')
    return
  }

  try {
    await showConfirmDialog({
      title: '安全提示',
      message:
        manageScene.value === 'watchlist'
          ? '点击确定清空后，将清空该标签下的所有自选基金'
          : '点击确定清空后，将清空该标签下的所有持有基金',
      cancelButtonText: '取消',
      confirmButtonText: '确定删除'
    })

    if (manageScene.value === 'watchlist') {
      if (isAllTag(item)) {
        Object.keys(fundStore.watchFundsByTag).forEach((key) => {
          fundStore.clearWatchFunds(Number(key))
        })
      } else {
        fundStore.clearWatchFunds(item.id)
      }
    } else {
      fundStore.clearHoldingFunds(item.id)
    }
    showToast(`已清空 ${item.name}`)
  } catch {}
}
</script>

<template>
  <div class="page tag-manage-page">
    <BaseTopNav :title="pageTitle" />

    <section class="manage-card card">
      <header class="list-header">
        <span>标签名称</span>
        <span>修改</span>
        <span>清空</span>
        <span>排序</span>
      </header>

      <draggable
        v-model="tagsModel"
        item-key="id"
        :move="onTagMove"
        handle=".sort-handle"
        :delay="250"
        :delay-on-touch-only="true"
        :touch-start-threshold="8"
        ghost-class="drag-ghost"
      >
        <template #item="{ element }">
          <article class="row-item">
            <div class="left">
              <button v-if="canRemoveTag(element)" type="button" class="icon-btn" @click="removeTag(element)">
                <van-icon name="minus" size="20" />
              </button>
              <span v-else class="icon-slot" aria-hidden="true"></span>
              <span class="name">{{ element.name }}</span>
            </div>
            <div class="right">
              <button v-if="canEditTag(element)" type="button" class="icon-btn" @click="openEditDialog(element)">
                <van-icon name="edit" size="19" />
              </button>
              <span v-else class="icon-slot" aria-hidden="true"></span>
              <button v-if="canClearTag(element)" type="button" class="icon-btn" @click="clearTag(element)">
                <van-icon name="delete-o" size="19" />
              </button>
              <span v-else class="icon-slot" aria-hidden="true"></span>
              <button v-if="canSortTag(element)" type="button" class="icon-btn sort-handle">
                <van-icon name="bars" size="20" />
              </button>
              <span v-else class="icon-slot" aria-hidden="true"></span>
            </div>
          </article>
        </template>
      </draggable>

      <div class="add-wrap">
        <van-button plain block icon="plus" type="primary" @click="openAddDialog">添加标签</van-button>
      </div>
    </section>

    <van-dialog
      v-model:show="showEditDialog"
      :title="dialogTitle"
      show-cancel-button
      @confirm="confirmEdit"
    >
      <div class="dialog-content">
        <van-field v-model="editName" placeholder="请输入标签名称" autofocus clearable />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.tag-manage-page {
  padding-top: 0;
}

.manage-card {
  padding: 6px 12px 14px;
}

.list-header {
  display: flex;
  padding: 8px 0 12px;
  color: var(--text-sub);
  font-size: 0.875rem;
}

.list-header > span:nth-child(1) {
  flex: 1;
  padding-left: 46px;
  text-align: left;
}

.list-header > span {
  width: 52px;
  text-align: center;
  flex-shrink: 0;
}

.row-item {
  display: flex;
  align-items: center;
  border-top: 1px solid var(--line);
  min-height: 62px;
}

.left,
.right {
  display: flex;
  align-items: center;
}

.left {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 1.1875rem;
  margin-left: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.right {
  width: 156px;
  display: grid;
  grid-template-columns: repeat(3, 52px);
  justify-items: center;
  align-items: center;
}

.icon-btn {
  border: 0;
  background: transparent;
  color: #22263c;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.sort-handle {
  cursor: grab;
}

.sort-handle:active {
  cursor: grabbing;
}

.icon-slot {
  width: 36px;
  height: 36px;
  display: inline-block;
}

.add-wrap {
  margin-top: 22px;
  padding: 0 4px;
}

:deep(.drag-ghost) {
  background: #f2f5ff;
}

.dialog-content {
  padding: 12px 14px 8px;
}
</style>
