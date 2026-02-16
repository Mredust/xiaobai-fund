<script setup lang="ts">
interface TagItem {
  id: number
  name: string
}

defineProps<{
  items: TagItem[]
  activeId: number
  showAdd?: boolean
}>()

const emit = defineEmits<{
  change: [id: number]
  add: []
}>()
</script>

<template>
  <div class="tag-strip">
    <div class="tag-scroll">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="tag-btn"
        :class="{ active: item.id === activeId }"
        @click="emit('change', item.id)"
      >
        {{ item.name }}
      </button>
    </div>
    <button v-if="showAdd" type="button" class="add-btn" @click="emit('add')">
      <van-icon name="plus" size="20" />
    </button>
  </div>
</template>

<style scoped>
.tag-strip {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-scroll {
  display: flex;
  align-items: center;
  overflow-x: auto;
  flex: 1;
  gap: 2px;
  scrollbar-width: none;
}

.tag-scroll::-webkit-scrollbar {
  display: none;
}

.tag-btn {
  white-space: nowrap;
  border: 0;
  background: transparent;
  font-size: 1.125rem;
  color: #5f6680;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.tag-btn.active {
  color: #111420;
  font-weight: 700;
}

.add-btn {
  border: 0;
  background: #f2f4fa;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
</style>

