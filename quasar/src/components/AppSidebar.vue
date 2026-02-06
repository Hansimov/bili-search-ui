<template>
  <!-- 侧边栏遮罩层 -->
  <transition name="overlay-fade">
    <div v-if="showOverlay" class="sidebar-overlay" @click="closeSidebar" />
  </transition>

  <!-- 侧边栏 -->
  <aside class="app-sidebar" :class="sidebarClasses">
    <!-- Logo / 收起按钮 -->
    <div class="sidebar-header">
      <router-link
        v-if="sidebarExpanded"
        to="/"
        class="sidebar-logo"
        @click="onNavigate"
      >
        <q-icon name="fa-solid fa-tv" size="20px" class="sidebar-logo-icon" />
        <span class="sidebar-logo-text">blbl.top</span>
      </router-link>
      <q-btn
        flat
        round
        dense
        :icon="sidebarExpanded ? 'menu_open' : 'menu'"
        size="sm"
        class="sidebar-toggle-btn"
        @click="handleToggle"
      >
        <q-tooltip
          v-if="!sidebarExpanded"
          anchor="center right"
          self="center left"
        >
          展开侧边栏
        </q-tooltip>
      </q-btn>
    </div>

    <!-- 导航项 -->
    <div class="sidebar-nav">
      <!-- 新搜索 -->
      <q-btn
        flat
        no-caps
        class="sidebar-nav-item"
        :class="{ 'nav-item-collapsed': !sidebarExpanded }"
        @click="navigateToSearch"
      >
        <q-icon name="edit" size="20px" />
        <transition name="fade">
          <span v-if="sidebarExpanded" class="nav-label">新搜索</span>
        </transition>
        <q-tooltip
          v-if="!sidebarExpanded"
          anchor="center right"
          self="center left"
        >
          新搜索
        </q-tooltip>
      </q-btn>

      <!-- 搜索历史 -->
      <q-btn
        flat
        no-caps
        class="sidebar-nav-item"
        :class="{
          'nav-item-collapsed': !sidebarExpanded,
          'nav-item-active': showHistoryList,
        }"
        @click="toggleHistory"
      >
        <q-icon name="history" size="20px" />
        <transition name="fade">
          <span v-if="sidebarExpanded" class="nav-label">搜索历史</span>
        </transition>
        <q-tooltip
          v-if="!sidebarExpanded"
          anchor="center right"
          self="center left"
        >
          搜索历史
        </q-tooltip>
      </q-btn>
    </div>

    <!-- 搜索历史列表（仅展开模式） -->
    <transition name="fade">
      <div v-if="sidebarExpanded && showHistoryList" class="sidebar-history">
        <div class="history-section-header">
          <span class="history-section-title">搜索记录</span>
          <q-btn
            v-if="searchHistoryStore.totalCount > 0"
            flat
            round
            dense
            icon="delete_sweep"
            size="xs"
            class="history-clear-btn"
            @click="confirmClearHistory"
          >
            <q-tooltip>清除历史</q-tooltip>
          </q-btn>
        </div>

        <q-scroll-area class="history-scroll-area">
          <div v-if="searchHistoryStore.totalCount === 0" class="history-empty">
            暂无搜索记录
          </div>
          <template v-else>
            <!-- 置顶记录 -->
            <div
              v-for="item in searchHistoryStore.pinnedItems"
              :key="'pin-' + item.query"
              class="history-item pinned"
              @click="searchFromHistory(item.query)"
            >
              <q-icon name="push_pin" size="14px" class="history-item-icon" />
              <span class="history-item-text" :title="item.query">
                {{ item.query }}
              </span>
              <div class="history-item-actions">
                <q-btn
                  flat
                  round
                  dense
                  icon="push_pin"
                  size="xs"
                  class="history-action-btn pinned-btn"
                  @click.stop="searchHistoryStore.togglePin(item.query)"
                >
                  <q-tooltip>取消置顶</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="close"
                  size="xs"
                  class="history-action-btn"
                  @click.stop="searchHistoryStore.removeRecord(item.query)"
                >
                  <q-tooltip>删除</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- 最近记录 -->
            <div
              v-for="item in searchHistoryStore.recentItems.slice(0, 30)"
              :key="'recent-' + item.query"
              class="history-item"
              @click="searchFromHistory(item.query)"
            >
              <q-icon name="schedule" size="14px" class="history-item-icon" />
              <span class="history-item-text" :title="item.query">
                {{ item.query }}
              </span>
              <div class="history-item-actions">
                <q-btn
                  flat
                  round
                  dense
                  icon="push_pin"
                  size="xs"
                  class="history-action-btn"
                  @click.stop="searchHistoryStore.togglePin(item.query)"
                >
                  <q-tooltip>置顶</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  icon="close"
                  size="xs"
                  class="history-action-btn"
                  @click.stop="searchHistoryStore.removeRecord(item.query)"
                >
                  <q-tooltip>删除</q-tooltip>
                </q-btn>
              </div>
            </div>
          </template>
        </q-scroll-area>
      </div>
    </transition>

    <!-- 底部区域 -->
    <div class="sidebar-bottom">
      <!-- 主题切换 -->
      <div
        class="sidebar-bottom-item"
        :class="{ 'item-collapsed': !sidebarExpanded }"
        @click="toggleDarkMode"
      >
        <q-icon
          :name="isDark ? 'bedtime' : 'wb_sunny'"
          size="20px"
          class="sidebar-item-icon"
        />
        <transition name="fade">
          <span v-if="sidebarExpanded" class="sidebar-bottom-label">
            {{ isDark ? '深色' : '浅色' }}
          </span>
        </transition>
        <q-tooltip
          v-if="!sidebarExpanded"
          anchor="center right"
          self="center left"
        >
          {{ isDark ? '浅色模式' : '深色模式' }}
        </q-tooltip>
      </div>

      <!-- 用户登录 -->
      <div
        class="sidebar-bottom-item sidebar-user"
        :class="{ 'item-collapsed': !sidebarExpanded }"
        @click="handleUserClick"
      >
        <template v-if="accountStore.isLoggedIn && accountStore.userAvatar">
          <q-avatar size="28px" class="sidebar-avatar">
            <img
              :src="accountStore.userAvatar"
              :alt="accountStore.userName"
              referrerpolicy="no-referrer"
            />
          </q-avatar>
          <transition name="fade">
            <span v-if="sidebarExpanded" class="sidebar-user-name">
              {{ accountStore.userName }}
            </span>
          </transition>

          <!-- 已登录用户的菜单 -->
          <q-menu v-model="showUserMenu" anchor="top right" self="bottom right">
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label>{{ accountStore.userName }}</q-item-label>
                  <q-item-label caption>
                    UID: {{ accountStore.userMid }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item
                v-for="(stat, idx) in statsItems"
                :key="idx"
                dense
                class="user-menu-item"
              >
                <q-item-section class="text-right">
                  <q-item-label>{{ stat.label }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label class="text-weight-medium">
                    {{ stat.value }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item
                clickable
                v-close-popup
                @click="accountStore.handleUpdateFollowings"
                :disable="accountStore.isUpdatingFollowings"
                class="user-menu-item"
              >
                <q-item-section class="text-right">
                  <q-item-label>
                    {{
                      accountStore.isUpdatingFollowings
                        ? '同步中...'
                        : '同步关注'
                    }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-spinner
                    v-if="accountStore.isUpdatingFollowings"
                    size="xs"
                    color="primary"
                  />
                  <q-icon v-else size="xs" name="refresh" />
                </q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="showLogoutDialog = true"
                class="user-menu-item"
              >
                <q-item-section class="text-right">
                  <q-item-label>退出登录</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon size="xs" name="logout" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </template>
        <template v-else>
          <q-icon
            name="account_circle"
            size="28px"
            class="sidebar-login-icon"
          />
          <transition name="fade">
            <span v-if="sidebarExpanded" class="sidebar-user-name"> 登录 </span>
          </transition>
        </template>
        <q-tooltip
          v-if="!sidebarExpanded"
          anchor="center right"
          self="center left"
        >
          {{ accountStore.isLoggedIn ? accountStore.userName : '登录' }}
        </q-tooltip>
      </div>
    </div>

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
          <q-btn flat label="关闭" color="primary" @click="closeLoginDialog" />
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

    <!-- 退出确认对话框 -->
    <q-dialog v-model="showLogoutDialog">
      <q-card class="q-card-logout">
        <q-card-section>
          <div class="text-h6">退出登录</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body1">确定要退出登录吗？</div>
          <div class="text-caption text-grey q-mt-sm">
            退出后需要重新扫码登录
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="取消"
            color="grey"
            @click="showLogoutDialog = false"
          />
          <q-btn
            flat
            label="确认退出"
            color="negative"
            @click="confirmLogout"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 清除历史确认对话框 -->
    <q-dialog v-model="showClearHistoryDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">清除搜索历史</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body1">确定要清除所有搜索历史记录吗？</div>
          <div class="text-caption text-grey q-mt-sm">置顶记录也会被清除</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="取消"
            color="grey"
            @click="showClearHistoryDialog = false"
          />
          <q-btn flat label="确认清除" color="negative" @click="clearHistory" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Dark } from 'quasar';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useAccountStore } from 'src/stores/accountStore';
import { useAuthStore } from 'src/stores/authStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { explore } from 'src/functions/explore';

const router = useRouter();
const layoutStore = useLayoutStore();
const accountStore = useAccountStore();
const authStore = useAuthStore();
const searchHistoryStore = useSearchHistoryStore();

// State
const showHistoryList = ref(true);
const showLoginDialog = ref(false);
const showLogoutDialog = ref(false);
const showUserMenu = ref(false);
const showClearHistoryDialog = ref(false);

// Dark mode
const isDark = ref(JSON.parse(localStorage.getItem('isDark') || 'true'));
Dark.set(isDark.value);

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  Dark.set(isDark.value);
  localStorage.setItem('isDark', JSON.stringify(isDark.value));
};

// Desktop mode
const isDesktop = computed(() => layoutStore.isDesktopMode());

// Sidebar state computeds
const sidebarExpanded = computed(() => {
  if (!isDesktop.value) return true; // 移动端侧边栏始终为展开状态
  return layoutStore.isSidebarExpanded;
});

const showOverlay = computed(() => {
  if (!isDesktop.value) {
    return layoutStore.isMobileSidebarOpen;
  }
  // 窄屏桌面端展开时显示遮罩层
  return layoutStore.isSidebarExpanded && layoutStore.screenWidth < 1400;
});

const sidebarClasses = computed(() => ({
  'sidebar-expanded': sidebarExpanded.value,
  'sidebar-collapsed': !sidebarExpanded.value,
  'sidebar-desktop': isDesktop.value,
  'sidebar-mobile': !isDesktop.value,
  'sidebar-mobile-open': !isDesktop.value && layoutStore.isMobileSidebarOpen,
}));

// User stats
const statsItems = computed(() => [
  {
    label: '关注',
    value: accountStore.userAttention || accountStore.followingCount,
  },
  { label: '粉丝', value: accountStore.userFans },
  { label: '硬币', value: accountStore.userCoins },
  { label: '投稿', value: accountStore.userArchiveCount },
]);

// QR code options
const qrCodeOptions = computed(() => ({
  width: 200,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
  errorCorrectionLevel: 'M',
}));

// Navigation
const navigateToSearch = () => {
  router.push('/');
  if (!isDesktop.value) layoutStore.closeMobileSidebar();
};

const onNavigate = () => {
  if (!isDesktop.value) layoutStore.closeMobileSidebar();
};

const searchFromHistory = (query: string) => {
  explore({ queryValue: query, setQuery: true, setRoute: true });
  if (!isDesktop.value) layoutStore.closeMobileSidebar();
};

// Sidebar toggle
const handleToggle = () => {
  if (isDesktop.value) {
    layoutStore.toggleSidebar();
  } else {
    layoutStore.toggleMobileSidebar();
  }
};

const closeSidebar = () => {
  if (!isDesktop.value) {
    layoutStore.closeMobileSidebar();
  } else {
    // 窄屏桌面端点击遮罩层收起侧边栏
    layoutStore.toggleSidebar();
  }
};

// History
const toggleHistory = () => {
  if (sidebarExpanded.value) {
    showHistoryList.value = !showHistoryList.value;
  } else {
    layoutStore.toggleSidebar();
    showHistoryList.value = true;
  }
};

const confirmClearHistory = () => {
  showClearHistoryDialog.value = true;
};

const clearHistory = () => {
  searchHistoryStore.clearAll();
  showClearHistoryDialog.value = false;
};

// User management
const handleUserClick = () => {
  if (!accountStore.isLoggedIn) {
    showLoginDialog.value = true;
  }
};

const closeLoginDialog = () => {
  showLoginDialog.value = false;
};

const refreshQRCode = async () => {
  await authStore.generateQrCode();
};

const confirmLogout = () => {
  showLogoutDialog.value = false;
  accountStore.handleLogout();
};

// Watch login state
watch(
  () => accountStore.isLoggedIn,
  (newValue) => {
    if (newValue) {
      setTimeout(() => {
        showLoginDialog.value = false;
      }, 1500);
    }
  }
);

watch(showLoginDialog, async (newValue) => {
  if (newValue) {
    await authStore.generateQrCode();
  } else {
    authStore.cleanup();
  }
});

// Load search history on mount
onMounted(async () => {
  await searchHistoryStore.loadHistory();
});

onUnmounted(() => {
  authStore.cleanup();
});
</script>

<style scoped>
/* ============ 遮罩层 ============ */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 2050;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* ============ 侧边栏容器 ============ */
.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 2100;
  transition: width 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}

/* 桌面端 */
.app-sidebar.sidebar-desktop {
  width: 50px;
}
.app-sidebar.sidebar-desktop.sidebar-expanded {
  width: 260px;
}

/* 移动端 */
.app-sidebar.sidebar-mobile {
  width: 280px;
  transform: translateX(-100%);
}
.app-sidebar.sidebar-mobile.sidebar-mobile-open {
  transform: translateX(0);
}

body.body--light .app-sidebar {
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
}
body.body--dark .app-sidebar {
  background-color: #1a1a1a;
  border-right: 1px solid #333;
}

/* ============ 侧边栏头部 ============ */
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 12px 10px;
  min-height: 48px;
}

/* 展开时：logo 在左，toggle 在右 */
.sidebar-expanded .sidebar-header {
  justify-content: space-between;
}

/* 折叠时：toggle 居中 */
.sidebar-collapsed .sidebar-header {
  justify-content: center;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-logo-icon {
  flex-shrink: 0;
}

.sidebar-logo-text {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

body.body--light .sidebar-logo-text {
  color: #0070f0;
}
body.body--dark .sidebar-logo-text {
  color: #50b0f0;
}

.sidebar-toggle-btn {
  flex-shrink: 0;
  opacity: 0.7;
}
.sidebar-toggle-btn:hover {
  opacity: 1;
}

/* ============ 导航项 ============ */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 4px 8px;
  gap: 2px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  width: 100%;
  min-height: 36px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
}

/* 按钮文字靠左对齐（覆盖 Quasar 默认居中） */
.sidebar-nav-item :deep(.q-btn__content) {
  justify-content: flex-start;
}

.sidebar-nav-item.nav-item-collapsed {
  justify-content: center;
  padding: 8px;
}

.sidebar-nav-item.nav-item-collapsed :deep(.q-btn__content) {
  justify-content: center;
}

body.body--light .sidebar-nav-item:hover {
  background-color: #e8e8e8;
}
body.body--dark .sidebar-nav-item:hover {
  background-color: #2a2a2a;
}

.nav-item-active {
  font-weight: 500;
}
body.body--light .nav-item-active {
  background-color: #e0e0e0;
}
body.body--dark .nav-item-active {
  background-color: #333;
}

.nav-label {
  white-space: nowrap;
}

/* ============ 搜索历史区域 ============ */
.sidebar-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.history-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px;
}

.history-section-title {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-clear-btn {
  opacity: 0.5;
}
.history-clear-btn:hover {
  opacity: 1;
}

.history-scroll-area {
  flex: 1;
  min-height: 100px;
  max-height: calc(100vh - 340px);
}

.history-empty {
  padding: 16px;
  text-align: center;
  opacity: 0.5;
  font-size: 13px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  margin: 1px 8px;
  border-radius: 6px;
  cursor: pointer;
  gap: 8px;
  min-height: 32px;
}

body.body--light .history-item:hover {
  background-color: #e8e8e8;
}
body.body--dark .history-item:hover {
  background-color: #2a2a2a;
}

.history-item-icon {
  flex-shrink: 0;
  opacity: 0.5;
}

.history-item-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-actions {
  display: none;
  flex-shrink: 0;
  gap: 2px;
}

.history-item:hover .history-item-actions {
  display: flex;
}

.history-action-btn {
  opacity: 0.5;
}
.history-action-btn:hover {
  opacity: 1;
}

.pinned-btn {
  opacity: 0.8;
}

body.body--light .pinned-btn {
  color: #0070f0;
}
body.body--dark .pinned-btn {
  color: #50b0f0;
}

/* ============ 底部区域 ============ */
.sidebar-bottom {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
  border-top: 1px solid transparent;
  margin-top: auto;
}

body.body--light .sidebar-bottom {
  border-top-color: #e0e0e0;
}
body.body--dark .sidebar-bottom {
  border-top-color: #333;
}

.sidebar-bottom-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  min-height: 36px;
}

.sidebar-bottom-item.item-collapsed {
  justify-content: center;
  padding: 8px;
}

body.body--light .sidebar-bottom-item:hover {
  background-color: #e8e8e8;
}
body.body--dark .sidebar-bottom-item:hover {
  background-color: #2a2a2a;
}

.sidebar-item-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-bottom-label {
  font-size: 13px;
  opacity: 0.7;
  white-space: nowrap;
}

.sidebar-avatar {
  flex-shrink: 0;
}

.sidebar-login-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-user-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============ 用户菜单 ============ */
.user-menu-item {
  min-height: 32px;
}

/* ============ 对话框 ============ */
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

body.body--dark .qr-container {
  background-color: #1e1e1e;
  border-color: #333;
}

/* ============ 过渡动画 ============ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
