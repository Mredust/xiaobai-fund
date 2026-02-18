import { defineStore } from 'pinia'
import defaultAvatar from '@/assets/images/default.png'

const createDefaultNickname = () => {
  const random5Digits = Math.floor(10000 + Math.random() * 90000)
  return `用户${random5Digits}`
}

export const useProfileStore = defineStore('profile', {
  state: () => ({
    nickname: createDefaultNickname(),
    companionDays: 217,
    avatar: defaultAvatar,
    dataSource: '数据源'
  }),
  actions: {
    setNickname(value: string) {
      // 更新昵称并忽略空字符串输入。
      const next = value.trim()
      if (!next) {
        return
      }
      this.nickname = next
    },
    setAvatar(value: string) {
      // 更新头像地址，支持网络地址和本地 data url。
      const next = value.trim()
      if (!next) {
        return
      }
      this.avatar = next
    },
    setCompanionDays(value: number) {
      // 更新陪伴天数并保证非负整数。
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
