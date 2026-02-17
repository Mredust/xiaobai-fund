import { defineStore } from 'pinia'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    nickname: 'M.红尘',
    companionDays: 217,
    avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    dataSource: '数据源1'
  }),
  actions: {
    setNickname(value: string) {
      // 更新昵称并忽略空字符串。
      const next = value.trim()
      if (!next) {
        return
      }
      this.nickname = next
    },
    setCompanionDays(value: number) {
      // 更新陪伴天数并保证非负。
      this.companionDays = Math.max(0, Math.floor(value))
    },
    setDataSource(value: string) {
      // 更新数据源标识。
      const next = value.trim()
      if (!next) {
        return
      }
      this.dataSource = next
    }
  }
})
