<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { showConfirmDialog, showToast } from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import { useTagStore, type TagItem } from '@/stores/tags'
import { useFundStore } from '@/stores/funds'

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

const reorderCurrentTags = (value: TagItem[]) => {
  // 根据当前场景重排标签；自选场景直接改 state，规避热更新导致的方法缺失。
  if (manageScene.value === 'watchlist') {
    tagStore.watchTags = [...value]
    if (!tagStore.watchTags.some((item) => item.id === tagStore.activeWatchTagId)) {
      tagStore.activeWatchTagId = tagStore.watchTags[0]?.id ?? 0
    }
    return
  }
  tagStore.reorderHoldingTags(value)
}

const tagsModel = computed({
  get: () => (manageScene.value === 'watchlist' ? tagStore.watchTags : tagStore.holdingTags),
  set: (value: TagItem[]) => reorderCurrentTags(value)
})

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
      // 自选场景新增标签，直接写 state 以兼容旧 store 实例。
      const id = tagStore.nextTagId
      tagStore.nextTagId += 1
      tagStore.watchTags.push({ id, name: value })
      tagStore.activeWatchTagId = id
    } else {
      tagStore.addHoldingTag(value)
    }
    showToast('标签已添加')
    return true
  }

  if (editingId.value === null) {
    return false
  }

  const updated =
    manageScene.value === 'watchlist'
      ? (() => {
          // 自选场景编辑标签，直接修改对应项名称。
          const target = tagStore.watchTags.find((item) => item.id === editingId.value)
          if (!target) {
            return false
          }
          target.name = value
          return true
        })()
      : tagStore.updateHoldingTag(editingId.value, value)
  if (!updated) {
    showToast('标签修改失败')
    return false
  }

  showToast('标签已修改')
  return true
}

const removeTag = (item: TagItem) => {
  // 通过左侧减号移除当前场景标签。
  const removed =
    manageScene.value === 'watchlist'
      ? (() => {
          // 自选场景移除标签，至少保留一个标签。
          if (tagStore.watchTags.length <= 1) {
            return false
          }
          const index = tagStore.watchTags.findIndex((target) => target.id === item.id)
          if (index < 0) {
            return false
          }
          tagStore.watchTags.splice(index, 1)
          if (!tagStore.watchTags.some((target) => target.id === tagStore.activeWatchTagId)) {
            tagStore.activeWatchTagId = tagStore.watchTags[0]?.id ?? 0
          }
          return true
        })()
      : tagStore.removeHoldingTag(item.id)
  if (!removed) {
    showToast('至少保留一个标签')
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
      fundStore.clearWatchFunds(item.id)
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
        handle=".sort-handle"
        :delay="250"
        :delay-on-touch-only="true"
        :touch-start-threshold="8"
        ghost-class="drag-ghost"
      >
        <template #item="{ element }">
          <article class="row-item">
            <div class="left">
              <button type="button" class="icon-btn" @click="removeTag(element)">
                <van-icon name="minus" size="20" />
              </button>
              <span class="name">{{ element.name }}</span>
            </div>
            <div class="right">
              <button type="button" class="icon-btn" @click="openEditDialog(element)">
                <van-icon name="edit" size="19" />
              </button>
              <button type="button" class="icon-btn" @click="clearTag(element)">
                <van-icon name="delete-o" size="19" />
              </button>
              <button type="button" class="icon-btn sort-handle">
                <van-icon name="bars" size="20" />
              </button>
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
  padding-left: 40px;
}

.list-header > span {
  width: 52px;
  text-align: center;
}

.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  min-height: 62px;
}

.left,
.right {
  display: flex;
  align-items: center;
}

.name {
  font-size: 1.1875rem;
  margin-left: 10px;
}

.right {
  gap: 4px;
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


