<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    modelValue?: string
    allowNegative?: boolean
    allowDecimal?: boolean
  }>(),
  {
    title: '',
    modelValue: '',
    allowNegative: true,
    allowDecimal: true
  }
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  change: [value: string]
  confirm: [value: string]
}>()

const draft = ref('')

const displayValue = computed(() => (draft.value ? draft.value : '0'))

const close = () => {
  emit('update:show', false)
}

const syncDraft = () => {
  draft.value = props.modelValue || ''
}

const append = (value: string) => {
  draft.value += value
}

const inputNumber = (digit: string) => {
  if (draft.value === '0') {
    draft.value = digit
    return
  }
  append(digit)
}

const inputDot = () => {
  if (!props.allowDecimal || draft.value.includes('.')) {
    return
  }
  if (!draft.value || draft.value === '-') {
    draft.value = `${draft.value || ''}0.`
    return
  }
  append('.')
}

const inputMinus = () => {
  if (!props.allowNegative) {
    return
  }
  if (!draft.value) {
    draft.value = '-'
    return
  }
  draft.value = draft.value.startsWith('-') ? draft.value.slice(1) : `-${draft.value}`
}

const backspace = () => {
  draft.value = draft.value ? draft.value.slice(0, -1) : ''
}

const clearAll = () => {
  draft.value = ''
}

const onConfirm = () => {
  emit('confirm', draft.value)
  close()
}

watch(
  () => props.show,
  (value) => {
    if (value) {
      syncDraft()
    }
  }
)

watch(
  () => props.modelValue,
  () => {
    if (props.show) {
      syncDraft()
    }
  }
)

watch(
  () => draft.value,
  (value) => {
    emit('change', value)
  }
)
</script>

<template>
  <van-popup :show="show" position="bottom" round @update:show="emit('update:show', $event)">
    <section class="keyboard-sheet">
      <header class="sheet-head">
        <strong>{{ title }}</strong>
        <button type="button" class="close-btn" @click="close">
          <van-icon name="cross" size="22" />
        </button>
      </header>

      <div class="value-line">
        <div class="value-prefix">
          <slot name="prefix" />
        </div>
        <span class="value-main">{{ displayValue }}</span>
      </div>

      <div class="keyboard-grid">
        <button type="button" class="key-btn" @click="inputNumber('1')">1</button>
        <button type="button" class="key-btn" @click="inputNumber('2')">2</button>
        <button type="button" class="key-btn" @click="inputNumber('3')">3</button>
        <button type="button" class="key-btn key-action" @click="backspace">
          <van-icon name="delete-o" size="18" />
        </button>

        <button type="button" class="key-btn" @click="inputNumber('4')">4</button>
        <button type="button" class="key-btn" @click="inputNumber('5')">5</button>
        <button type="button" class="key-btn" @click="inputNumber('6')">6</button>
        <button type="button" class="key-btn key-action" @click="clearAll">清空</button>

        <button type="button" class="key-btn" @click="inputNumber('7')">7</button>
        <button type="button" class="key-btn" @click="inputNumber('8')">8</button>
        <button type="button" class="key-btn" @click="inputNumber('9')">9</button>
        <button type="button" class="key-btn key-confirm" @click="onConfirm">确认</button>

        <button type="button" class="key-btn" :class="{ disabled: !allowNegative }" @click="inputMinus">-</button>
        <button type="button" class="key-btn" @click="inputNumber('0')">0</button>
        <button type="button" class="key-btn" :class="{ disabled: !allowDecimal }" @click="inputDot">.</button>
      </div>
    </section>
  </van-popup>
</template>

<style scoped>
.keyboard-sheet {
  background: #f4f5f8;
  padding: 12px 10px calc(10px + env(safe-area-inset-bottom));
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sheet-head strong {
  font-size: 1rem;
  color: #1f2740;
}

.close-btn {
  border: 0;
  background: transparent;
  color: #9ea5b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.value-line {
  position: relative;
  min-height: 44px;
  border-radius: 10px;
  background: #fff;
  padding: 0 12px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1f2740;
}

.value-prefix {
  position: absolute;
  left: 10px;
  top: 7px;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
}

.value-main {
  margin-left: auto;
}

.keyboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 44px);
  gap: 4px;
}

.key-btn {
  border: 0;
  background: #e9edf2;
  border-radius: 4px;
  color: #161d32;
  font-size: 1rem;
  cursor: pointer;
}

.key-btn:active {
  filter: brightness(0.97);
}

.key-action {
  font-size: 0.875rem;
  color: #2d3550;
}

.key-confirm {
  grid-column: 4;
  grid-row: 3 / span 2;
  background: #4567e4;
  color: #fff;
  font-size: 1.125rem;
}

.disabled {
  color: #a7afc3;
}
</style>
