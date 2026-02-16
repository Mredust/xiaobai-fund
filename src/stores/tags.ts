import { defineStore } from 'pinia'

export interface TagItem {
  id: number
  name: string
}

export const useTagStore = defineStore('tags', {
  state: () => ({
    nextTagId: 100,
    holdingTags: [
      { id: 1, name: '账户汇总' },
      { id: 2, name: '全部' },
      { id: 3, name: '支付宝' }
    ] as TagItem[],
    activeHoldingTagId: 1,
    watchTags: [
      { id: 11, name: '全部' },
      { id: 12, name: '黄金白银' },
      { id: 13, name: '有色' },
      { id: 14, name: 'CPO' },
      { id: 15, name: '通信' },
      { id: 16, name: '存储' },
      { id: 17, name: '半导体' }
    ] as TagItem[],
    activeWatchTagId: 11
  }),
  actions: {
    setHoldingActive(id: number) {
      // 切换首页顶部标签激活项。
      this.activeHoldingTagId = id
    },
    setWatchActive(id: number) {
      // 切换自选页顶部标签激活项。
      this.activeWatchTagId = id
    },
    addHoldingTag(name: string) {
      // 新增首页标签并将其置为当前选中。
      const normalized = name.trim()
      if (!normalized) {
        return
      }
      const id = this.nextTagId
      this.nextTagId += 1
      this.holdingTags.push({ id, name: normalized })
      this.activeHoldingTagId = id
    },
    removeHoldingTag(id: number) {
      // 删除标签时至少保留 1 个，防止首页标签栏为空。
      if (this.holdingTags.length <= 1) {
        return false
      }
      const index = this.holdingTags.findIndex((item) => item.id === id)
      if (index === -1) {
        return false
      }
      this.holdingTags.splice(index, 1)
      if (!this.holdingTags.some((item) => item.id === this.activeHoldingTagId)) {
        this.activeHoldingTagId = this.holdingTags[0]?.id ?? 0
      }
      return true
    },
    updateHoldingTag(id: number, name: string) {
      // 更新标签名称，忽略空值输入。
      const target = this.holdingTags.find((item) => item.id === id)
      if (!target) {
        return false
      }
      const normalized = name.trim()
      if (!normalized) {
        return false
      }
      target.name = normalized
      return true
    },
    reorderHoldingTags(newOrder: TagItem[]) {
      // 按拖拽结果重排标签，并保持激活状态有效。
      this.holdingTags = [...newOrder]
      if (!this.holdingTags.some((item) => item.id === this.activeHoldingTagId)) {
        this.activeHoldingTagId = this.holdingTags[0]?.id ?? 0
      }
    },
    addWatchTag(name: string) {
      // 新增自选页标签并将其置为当前选中。
      const normalized = name.trim()
      if (!normalized) {
        return
      }
      const id = this.nextTagId
      this.nextTagId += 1
      this.watchTags.push({ id, name: normalized })
      this.activeWatchTagId = id
    },
    removeWatchTag(id: number) {
      // 删除自选标签时至少保留 1 个，防止自选标签栏为空。
      if (this.watchTags.length <= 1) {
        return false
      }
      const index = this.watchTags.findIndex((item) => item.id === id)
      if (index === -1) {
        return false
      }
      this.watchTags.splice(index, 1)
      if (!this.watchTags.some((item) => item.id === this.activeWatchTagId)) {
        this.activeWatchTagId = this.watchTags[0]?.id ?? 0
      }
      return true
    },
    updateWatchTag(id: number, name: string) {
      // 更新自选标签名称，忽略空值输入。
      const target = this.watchTags.find((item) => item.id === id)
      if (!target) {
        return false
      }
      const normalized = name.trim()
      if (!normalized) {
        return false
      }
      target.name = normalized
      return true
    },
    reorderWatchTags(newOrder: TagItem[]) {
      // 按拖拽结果重排自选标签，并保持激活状态有效。
      this.watchTags = [...newOrder]
      if (!this.watchTags.some((item) => item.id === this.activeWatchTagId)) {
        this.activeWatchTagId = this.watchTags[0]?.id ?? 0
      }
    }
  }
})
