import type { PiniaPluginContext } from 'pinia'

const STORE_KEY_PREFIX = 'xiaobai-fund:store:'

const getStorageKey = (storeId: string) => `${STORE_KEY_PREFIX}${storeId}`

export const persistStorePlugin = ({ store }: PiniaPluginContext) => {
  const storageKey = getStorageKey(store.$id)
  const raw = localStorage.getItem(storageKey)

  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Only restore declared state keys to avoid polluting store instances.
        const allowedKeys = new Set(Object.keys(store.$state))
        const safePatch = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).filter(([key]) => allowedKeys.has(key))
        )
        store.$patch(safePatch as Record<string, any>)
      }
    } catch (error) {
      console.error(error)
      localStorage.removeItem(storageKey)
    }
  }

  store.$subscribe(
    (_, state) => {
      localStorage.setItem(storageKey, JSON.stringify(state))
    },
    {
      detached: true
    }
  )
}
