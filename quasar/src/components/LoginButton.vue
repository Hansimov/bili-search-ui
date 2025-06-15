<template>
  <q-btn
    flat
    icon="account_circle"
    label="登录"
    @click="showLoginDialog = true"
  />

  <q-dialog v-model="showLoginDialog">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">扫码登录</div>
      </q-card-section>

      <q-card-section class="q-pt-none text-center">
        <div v-if="loading" class="q-pa-md">
          <q-spinner size="40px" />
          <div class="q-mt-md">生成二维码中...</div>
        </div>

        <div v-else-if="qrCodeUrl" class="q-pa-md">
          <div class="qr-container q-mb-md">
            <vue-qrcode
              :value="qrCodeUrl"
              tag="canvas"
              :options="{
                width: 200,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF',
                },
                errorCorrectionLevel: 'M',
              }"
              @ready="onQRReady"
            />
          </div>
          <div class="text-subtitle2 q-mb-md">{{ statusMessage }}</div>
          <div class="text-caption text-grey q-mb-sm">
            请使用哔哩哔哩手机客户端扫描二维码
          </div>
          <div class="text-caption text-grey">
            二维码将在 {{ remainingTime }} 秒后过期
          </div>
        </div>

        <div v-if="error" class="text-negative q-pa-md">
          {{ error }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="关闭" color="primary" @click="closeDialog" />
        <q-btn
          flat
          label="刷新"
          color="primary"
          @click="generateQrCode"
          v-if="!loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const showLoginDialog = ref(false);
const loading = ref(false);
const qrCodeUrl = ref('');
const qrCodeKey = ref('');
const error = ref('');
const statusMessage = ref('等待扫码...');
const remainingTime = ref(180);

let pollTimer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

interface QRResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    url: string;
    qrcode_key: string;
  };
}

interface PollResponse {
  code: number;
  message: string;
  data: {
    code: number;
    message: string;
    url?: string;
    refresh_token?: string;
    timestamp?: number;
  };
}

const generateQrCode = async () => {
  loading.value = true;
  error.value = '';
  remainingTime.value = 180;
  statusMessage.value = '等待扫码...';

  try {
    // 使用代理路径而不是直接访问 B站 API
    const response = await fetch(
      '/bili-passport/x/passport-login/web/qrcode/generate',
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: QRResponse = await response.json();

    if (data.code === 0 && data.data) {
      qrCodeUrl.value = data.data.url;
      qrCodeKey.value = data.data.qrcode_key;

      startPolling();
      startCountdown();
    } else {
      error.value = data.message || '生成二维码失败';
    }
  } catch (err) {
    error.value = '网络请求失败，请检查网络连接或尝试刷新';
    console.error('Generate QR code error:', err);
  } finally {
    loading.value = false;
  }
};

const onQRReady = (canvas: HTMLCanvasElement) => {
  console.log('QR code ready:', canvas);
};

const pollLoginStatus = async () => {
  if (!qrCodeKey.value) return;

  try {
    // 使用代理路径
    const response = await fetch(
      `/bili-passport/x/passport-login/web/qrcode/poll?qrcode_key=${qrCodeKey.value}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Poll request failed:', response.status);
      return;
    }

    const data: PollResponse = await response.json();

    if (data.code === 0 && data.data) {
      switch (data.data.code) {
        case 0:
          statusMessage.value = '登录成功！';
          clearTimers();
          setTimeout(() => {
            showLoginDialog.value = false;
            handleLoginSuccess(data.data);
          }, 1500);
          break;
        case 86038:
          statusMessage.value = '二维码已失效，请刷新重试';
          clearTimers();
          break;
        case 86090:
          statusMessage.value = '已扫码，请在手机上确认登录';
          break;
        case 86101:
          statusMessage.value = '等待扫码...';
          break;
        default:
          statusMessage.value = data.data.message || '未知状态';
      }
    } else {
      console.error('Poll response error:', data);
    }
  } catch (err) {
    console.error('Poll login status error:', err);
  }
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const handleLoginSuccess = (loginData: any) => {
  console.log('Login successful:', loginData);

  if (loginData.refresh_token) {
    localStorage.setItem('bili_refresh_token', loginData.refresh_token);
  }

  // 这里可以添加登录成功后的处理逻辑
  // 比如更新全局状态、跳转页面等
};

const startPolling = () => {
  clearTimers();
  pollLoginStatus();
  pollTimer = setInterval(pollLoginStatus, 2000);
};

const startCountdown = () => {
  countdownTimer = setInterval(() => {
    remainingTime.value--;
    if (remainingTime.value <= 0) {
      statusMessage.value = '二维码已过期，请刷新重试';
      clearTimers();
    }
  }, 1000);
};

const clearTimers = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const closeDialog = () => {
  showLoginDialog.value = false;
};

const resetDialog = () => {
  clearTimers();
  qrCodeUrl.value = '';
  qrCodeKey.value = '';
  error.value = '';
  statusMessage.value = '等待扫码...';
  remainingTime.value = 180;
  loading.value = false;
};

watch(showLoginDialog, (newValue) => {
  if (newValue) {
    generateQrCode();
  } else {
    resetDialog();
  }
});

onUnmounted(() => {
  clearTimers();
});
</script>

<style scoped>
.q-card {
  max-width: 400px;
}

.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
}

.qr-container canvas {
  border-radius: 4px;
}

.body--dark .qr-container {
  background-color: #1e1e1e;
  border-color: #333;
}
</style>
