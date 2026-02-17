import type { PiniaPluginContext } from 'pinia'

const STORE_KEY_PREFIX = 'xiaobai-fund:store:'

const getStorageKey = (storeId: string) => {
  // 统一拼接持久化 key，避免和其它项目冲突。
  return `${STORE_KEY_PREFIX}${storeId}`
}

export const persistStorePlugin = ({ store }: PiniaPluginContext) => {
  // 初始化时恢复本地缓存状态，保证刷新后数据不丢失。
  const storageKey = getStorageKey(store.$id)
  const raw = localStorage.getItem(storageKey)
  if (raw) {
    try {
      store.$patch(JSON.parse(raw))
    } catch (error) {
      console.error(error)
      localStorage.removeItem(storageKey)
    }
  }

  // 状态更新后回写 localStorage，统一管理页面持久化数据。
  store.$subscribe(
    (_, state) => {
      localStorage.setItem(storageKey, JSON.stringify(state))
    },
    {
      detached: true
    }
  )
}
