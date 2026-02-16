import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.xiaobai.fund',
    appName: 'xiaobai-fund',
    webDir: 'dist',
    server: {
        // 开发地址，生产构建时需要注释掉这行
        // url: "http://192.168.1.5:5173",
        cleartext: true
    },
    android: {
        allowMixedContent: true,  // 允许混合内容（HTTP + HTTPS）
        webContentsDebuggingEnabled: true  // 启用调试
    }
};

export default config;
