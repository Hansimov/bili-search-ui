<template>
  <q-btn
    flat
    :icon="isLoggedIn ? 'account_circle' : 'login'"
    :label="isLoggedIn ? userInfo?.username || '已登录' : '登录'"
    @click="handleButtonClick"
  />

  <q-dialog v-model="showLoginDialog">
    <q-card class="q-card-qrcode shadow-transition">
      <q-card-section>
        <div class="text-h6">扫码登录</div>
      </q-card-section>

      <q-card-section class="q-pt-none text-center">
        <div v-if="qrCodeState.loading" class="q-pa-md">
          <q-spinner size="40px" />
          <div class="q-mt-md">生成二维码中...</div>
        </div>

        <div v-else-if="canShowQRCode" class="q-pa-md">
          <div class="qr-container q-mb-md">
            <vue-qrcode
              :value="qrCodeState.qrCodeUrl"
              tag="canvas"
              :options="qrCodeOptions"
              @ready="onQRReady"
            />
          </div>
          <div class="text-subtitle2 q-mb-md">
            {{ qrCodeState.statusMessage }}
          </div>
          <div class="text-grey q-mb-sm">
            请使用哔哩哔哩手机客户端扫描二维码
          </div>
          <div class="text-grey">
            二维码将在 {{ qrCodeState.remainingTime }} 秒后过期
          </div>
        </div>

        <div v-if="qrCodeState.error" class="text-negative q-pa-md">
          {{ qrCodeState.error }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="关闭" color="primary" @click="closeDialog" />
        <q-btn
          flat
          label="刷新"
          color="primary"
          @click="refreshQRCode"
          v-if="!qrCodeState.loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from 'src/stores/authStore';

const authStore = useAuthStore();
const { qrCodeState } = storeToRefs(authStore);
const { isLoggedIn, userInfo, canShowQRCode } = storeToRefs(authStore);

const showLoginDialog = ref(false);

const qrCodeOptions = computed(() => ({
  width: 200,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  errorCorrectionLevel: 'M',
}));

const handleButtonClick = () => {
  if (isLoggedIn.value) {
    // 已登录状态下可以显示用户菜单或其他操作
    handleUserMenu();
  } else {
    // 未登录状态下显示登录对话框
    showLoginDialog.value = true;
  }
};

const handleUserMenu = () => {
  // 这里可以实现用户菜单逻辑
  console.log('Show user menu');
};

const onQRReady = (canvas: HTMLCanvasElement) => {
  console.log('QR code ready:', canvas);
};

const closeDialog = () => {
  showLoginDialog.value = false;
};

const refreshQRCode = () => {
  authStore.generateQrCode();
};

// 监听登录状态变化
watch(isLoggedIn, (newValue) => {
  if (newValue) {
    // 登录成功后关闭对话框
    setTimeout(() => {
      showLoginDialog.value = false;
    }, 1500);
  }
});

// 监听对话框显示状态
watch(showLoginDialog, (newValue) => {
  if (newValue) {
    authStore.generateQrCode();
  } else {
    authStore.resetQRCodeState();
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  authStore.clearTimers();
});
</script>

<style scoped>
.q-card-qrcode {
  min-width: 350px;
  max-width: 400px;
}

.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
}

.qr-container canvas {
  border-radius: 4px;
}

.body--dark .qr-container {
  background-color: #1e1e1e;
  border-color: #333;
}
</style>
