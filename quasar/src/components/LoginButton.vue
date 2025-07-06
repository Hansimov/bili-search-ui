<template>
  <q-btn
    flat
    :icon="buttonIcon"
    :label="buttonLabel"
    @click="handleButtonClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    class="login-button"
  >
    <q-avatar
      v-if="accountStore.isLoggedIn && accountStore.userAvatar"
      size="24px"
      class="q-mr-xs"
    >
      <img
        :src="accountStore.userAvatar"
        :alt="accountStore.userName"
        referrerpolicy="no-referrer"
      />
    </q-avatar>

    <!-- 用户下拉菜单  -->
    <q-menu
      v-if="accountStore.isLoggedIn"
      v-model="showUserMenu"
      anchor="bottom right"
      self="top right"
      @mouseenter="handleMenuMouseEnter"
      @mouseleave="handleMenuMouseLeave"
    >
      <q-list>
        <!-- 昵称 & UID -->
        <q-item>
          <q-item-section>
            <q-item-label class="text-right">{{
              accountStore.userName
            }}</q-item-label>
            <q-item-label caption class="text-right"
              >UID: {{ accountStore.userMid }}</q-item-label
            >
          </q-item-section>
        </q-item>

        <!-- 数据项 -->
        <q-item
          v-for="(item, idx) in statsItems"
          :key="idx"
          class="user-menu-list-item"
          dense
        >
          <q-item-section class="user-menu-list-label">
            <q-item-label class="text-right">{{ item.label }}</q-item-label>
          </q-item-section>
          <q-item-section side class="user-menu-list-value">
            <q-item-label class="text-weight-medium">
              {{ item.value }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <!-- 更新关注列表 -->
        <q-item
          clickable
          v-close-popup
          @click="accountStore.handleUpdateFollowings"
          class="user-menu-list-item"
          :disable="accountStore.isUpdatingFollowings"
        >
          <q-item-section class="user-menu-list-label">
            <q-item-label class="text-right">
              {{ accountStore.isUpdatingFollowings ? '同步中...' : '同步关注' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side class="user-menu-list-value">
            <q-spinner
              v-if="accountStore.isUpdatingFollowings"
              size="xs"
              color="primary"
            />
            <q-icon v-else size="xs" name="refresh" />
          </q-item-section>
        </q-item>

        <!-- 操作项 -->
        <q-item
          clickable
          v-close-popup
          @click="showLogoutDialog = true"
          class="user-menu-list-item"
        >
          <q-item-section class="user-menu-list-label">
            <q-item-label class="text-right">退出登录</q-item-label>
          </q-item-section>
          <q-item-section side class="user-menu-list-value">
            <q-icon size="xs" name="logout" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>

  <!-- 登录对话框 -->
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

  <!-- 退出登录确认对话框 -->
  <q-dialog v-model="showLogoutDialog">
    <q-card class="q-card-logout">
      <q-card-section>
        <div class="text-h6">退出登录</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="text-body1">确定要退出登录吗？</div>
        <div class="text-caption text-grey q-mt-sm">退出后需要重新扫码登录</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="取消"
          color="grey"
          @click="showLogoutDialog = false"
        />
        <q-btn flat label="确认退出" color="negative" @click="confirmLogout" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { useAccountStore } from 'src/stores/accountStore';

const authStore = useAuthStore();
const accountStore = useAccountStore();

const showLoginDialog = ref(false);
const showUserMenu = ref(false);
const showLogoutDialog = ref(false);
let menuTimer: NodeJS.Timeout | null = null;

const buttonIcon = computed(() => {
  if (accountStore.isLoggedIn) {
    return accountStore.userAvatar ? '' : 'account_circle';
  }
  return 'login';
});

const buttonLabel = computed(() => {
  if (accountStore.isLoggedIn) {
    return ''; // 已登录时不显示 label
  }
  return '登录';
});

const statsItems = computed(() => [
  {
    label: '关注',
    value: accountStore.followingCount || accountStore.userAttention,
  },
  { label: '粉丝', value: accountStore.userFans },
  { label: '硬币', value: accountStore.userCoins },
  { label: '投稿', value: accountStore.userArchiveCount },
]);

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
  // 已登录状态下，点击不做任何操作，菜单通过鼠标悬浮控制
};

const handleMouseEnter = () => {
  if (accountStore.isLoggedIn) {
    if (menuTimer) {
      clearTimeout(menuTimer);
      menuTimer = null;
    }
    showUserMenu.value = true;
  }
};

const handleMouseLeave = () => {
  if (accountStore.isLoggedIn) {
    menuTimer = setTimeout(() => {
      showUserMenu.value = false;
    }, 200); // 200ms 延迟，避免鼠标移动到菜单时闪烁
  }
};

const handleMenuMouseEnter = () => {
  if (menuTimer) {
    clearTimeout(menuTimer);
    menuTimer = null;
  }
};

const handleMenuMouseLeave = () => {
  // showUserMenu.value = true;
};

const confirmLogout = () => {
  showLogoutDialog.value = false;
  accountStore.handleLogout();
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
  if (menuTimer) {
    clearTimeout(menuTimer);
  }
});
</script>

<style scoped>
.q-card-qrcode {
  min-width: 350px;
  max-width: 400px;
}

.q-card-logout {
  min-width: 300px;
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

.user-menu-list-item {
  display: flex;
  align-items: center;
  padding-top: 0px;
  padding-bottom: 0px;
  min-height: 32px;
}

.user-menu-list-label,
.user-menu-list-value {
  flex: 1;
  text-align: right;
}

.user-menu-list-label {
  min-width: 60px;
}
</style>
