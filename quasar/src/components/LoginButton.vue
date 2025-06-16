<template>
  <q-btn
    flat
    :icon="buttonIcon"
    :label="buttonLabel"
    @click="handleButtonClick"
    class="login-button"
  >
    <q-avatar
      v-if="accountStore.isLoggedIn && accountStore.userAvatar"
      size="24px"
      class="q-mr-xs"
    >
      <img :src="accountStore.userAvatar" :alt="accountStore.userName" />
    </q-avatar>
  </q-btn>

  <q-dialog v-model="showLoginDialog">
    <q-card class="q-card-qrcode shadow-transition">
      <q-card-section>
        <div class="text-h6">扫码登录</div>
      </q-card-section>

      <q-card-section class="q-pt-none text-center">
        <div v-if="authStore.isLoading" class="q-pa-md">
          <q-spinner size="40px" />
          <div class="q-mt-md">生成二维码中...</div>
        </div>

        <div v-else-if="authStore.canShowQRCode" class="q-pa-md">
          <div class="qr-container q-mb-md">
            <vue-qrcode
              :value="authStore.qrCodeState.qrCodeUrl"
              tag="canvas"
              :options="qrCodeOptions"
              @ready="onQRReady"
            />
          </div>
          <div class="text-subtitle2 q-mb-md">
            {{ authStore.qrCodeState.statusMessage }}
          </div>
          <div class="text-grey q-mb-sm">
            请使用哔哩哔哩手机客户端扫描二维码
          </div>
          <div class="text-grey">
            二维码将在 {{ authStore.qrCodeState.remainingTime }} 秒后过期
          </div>
        </div>

        <div v-if="authStore.qrCodeState.error" class="text-negative q-pa-md">
          {{ authStore.qrCodeState.error }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="关闭" color="primary" @click="closeDialog" />
        <q-btn
          flat
          label="刷新"
          color="primary"
          @click="refreshQRCode"
          v-if="!authStore.isLoading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- 用户菜单 -->
  <q-menu v-if="accountStore.isLoggedIn" touch-position context-menu>
    <q-list style="min-width: 200px">
      <q-item>
        <q-item-section avatar>
          <q-avatar size="40px">
            <img :src="accountStore.userAvatar" :alt="accountStore.userName" />
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ accountStore.userName }}</q-item-label>
          <q-item-label caption>UID: {{ accountStore.userId }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-separator />

      <q-item clickable v-close-popup @click="handleLogout">
        <q-item-section avatar>
          <q-icon name="logout" />
        </q-item-section>
        <q-item-section>
          <q-item-label>退出登录</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { useAccountStore } from 'src/stores/accountStore';

const authStore = useAuthStore();
const accountStore = useAccountStore();

const showLoginDialog = ref(false);

const buttonIcon = computed(() => {
  if (accountStore.isLoggedIn) {
    return accountStore.userAvatar ? '' : 'account_circle';
  }
  return 'login';
});

const buttonLabel = computed(() => {
  if (accountStore.isLoggedIn) {
    return accountStore.userName || '已登录';
  }
  return '登录';
});

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
  if (!accountStore.isLoggedIn) {
    showLoginDialog.value = true;
  }
  // 已登录状态下，菜单会通过 context-menu 自动显示
};

const handleLogout = () => {
  accountStore.clearSession();
};

const onQRReady = (canvas: HTMLCanvasElement) => {
  console.log('QR code ready:', canvas);
};

const closeDialog = () => {
  showLoginDialog.value = false;
};

const refreshQRCode = async () => {
  await authStore.generateQrCode();
};

// 监听登录状态变化
watch(
  () => accountStore.isLoggedIn,
  (newValue) => {
    if (newValue) {
      // 登录成功后延迟关闭对话框，让用户看到成功状态
      setTimeout(() => {
        showLoginDialog.value = false;
      }, 1500);
    }
  }
);

// 监听对话框显示状态
watch(showLoginDialog, async (newValue) => {
  if (newValue) {
    // 显示对话框时生成二维码
    await authStore.generateQrCode();
  } else {
    // 关闭对话框时清理资源
    authStore.cleanup();
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  authStore.cleanup();
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

.login-button {
  padding: 8px 12px;
}

.login-button .q-avatar {
  margin-right: 4px;
}
</style>
