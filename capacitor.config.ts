import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.xiaobai.fund',
  appName: '小白基金',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
}

export default config
