<script setup lang="ts">
import {ref} from 'vue'
import {showToast} from 'vant'
import BaseTopNav from '@/components/BaseTopNav.vue'
import {useProfileStore} from '@/stores/profile'

const profileStore = useProfileStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const showNicknamePopup = ref(false)
const nicknameInput = ref(profileStore.nickname)

const openAvatarPicker = () => {
  // 点击头像行后触发系统相册选择图片。
  fileInputRef.value?.click()
}

const onAvatarSelected = (event: Event) => {
  // 读取本地图片并写入 store。
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      profileStore.setAvatar(reader.result)
      showToast('头像已更新')
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

const openNicknameEditor = () => {
  // 打开昵称编辑弹层并回填当前昵称。
  nicknameInput.value = profileStore.nickname
  showNicknamePopup.value = true
}

const saveNickname = () => {
  // 保存昵称到 store。
  const next = nicknameInput.value.trim()
  if (!next) {
    showToast('昵称不能为空')
    return
  }

  profileStore.setNickname(next)
  showNicknamePopup.value = false
  showToast('昵称已更新')
}
</script>

<template>
  <div class="page profile-info-page">
    <BaseTopNav title="个人信息"/>

    <section class="info-card card">
      <button type="button" class="info-row" @click="openAvatarPicker">
        <span class="label">头像</span>
        <div class="row-right">
          <van-image width="2.875rem" height="2.875rem" :src="profileStore.avatar" alt="头像" class="avatar"/>
          <van-icon name="arrow" size="1rem"/>
        </div>
      </button>

      <button type="button" class="info-row" @click="openNicknameEditor">
        <span class="label">昵称</span>
        <div class="row-right">
          <span class="nickname">{{ profileStore.nickname }}</span>
          <van-icon name="arrow" size="1rem"/>
        </div>
      </button>
    </section>

    <input ref="fileInputRef" class="hidden-input" type="file" accept="image/*" @change="onAvatarSelected"/>

    <van-popup v-model:show="showNicknamePopup" position="bottom" round>
      <div class="nickname-popup">
        <van-field v-model="nicknameInput" label="昵称" maxlength="16" placeholder="请输入昵称"/>
        <van-button block type="primary" color="#4b6bde" @click="saveNickname">保存</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.profile-info-page {
  padding: 0;
  min-height: 100vh;
  background: #f3f4f8;
}

.info-card {
  margin: 0.5rem;
}

.info-row {
  width: 100%;
  border: 0;
  border-bottom: 0.0625rem solid #eef0f5;
  background: #fff;
  min-height: 4rem;
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-row:last-child {
  border-bottom: 0;
}

.label {
  font-size: 1.125rem;
  color: #1f2741;
}

.row-right {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #a5acbf;
}

.avatar {
  border-radius: 50%;
  overflow: hidden;
}

.nickname {
  max-width: 11rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.0625rem;
  color: #1f2741;
  font-family: 'STKaiti', 'KaiTi', serif;
}

.hidden-input {
  display: none;
}

.nickname-popup {
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
