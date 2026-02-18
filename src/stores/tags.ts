import { defineStore } from 'pinia'

export interface TagItem {
  id: number
  name: string
}

export const HOLDING_ACCOUNT_SUMMARY_NAME = '账户汇总'
export const TAG_NAME_ALL = '全部'

const isAllTag = (item: TagItem) => item.name === TAG_NAME_ALL
const isHoldingAccountSummaryTag = (item: TagItem) => item.name === HOLDING_ACCOUNT_SUMMARY_NAME

export const useTagStore = defineStore('tags', {
  state: () => ({
    nextTagId: 100,
    holdingTags: [
      { id: 1, name: HOLDING_ACCOUNT_SUMMARY_NAME },
      { id: 2, name: TAG_NAME_ALL }
    ] as TagItem[],
    activeHoldingTagId: 1,
    watchTags: [{ id: 11, name: TAG_NAME_ALL }] as TagItem[],
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
      // 删除标签，系统保留标签“账户汇总/全部”不可删除。
      const target = this.holdingTags.find((item) => item.id === id)
      if (!target || isHoldingAccountSummaryTag(target) || isAllTag(target)) {
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
      if (!target || isHoldingAccountSummaryTag(target) || isAllTag(target)) {
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
      // 按拖拽结果重排自定义标签，系统保留标签始终置顶且顺序固定。
      const accountSummaryTag = this.holdingTags.find((item) => isHoldingAccountSummaryTag(item))
      const allTag = this.holdingTags.find((item) => isAllTag(item))
      const customTags = newOrder.filter((item) => !isHoldingAccountSummaryTag(item) && !isAllTag(item))

      this.holdingTags = [
        ...(accountSummaryTag ? [accountSummaryTag] : []),
        ...(allTag ? [allTag] : []),
        ...customTags
      ]

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
      // 删除自选标签，“全部”标签不可删除。
      const target = this.watchTags.find((item) => item.id === id)
      if (!target || isAllTag(target)) {
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
      if (!target || isAllTag(target)) {
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
      // 按拖拽结果重排自定义标签，“全部”标签始终置顶。
      const allTag = this.watchTags.find((item) => isAllTag(item))
      const customTags = newOrder.filter((item) => !isAllTag(item))

      this.watchTags = [...(allTag ? [allTag] : []), ...customTags]

      if (!this.watchTags.some((item) => item.id === this.activeWatchTagId)) {
        this.activeWatchTagId = this.watchTags[0]?.id ?? 0
      }
    }
  }
})
