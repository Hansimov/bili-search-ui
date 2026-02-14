<template>
  <!-- 侧边栏遮罩层 -->
  <transition name="overlay-fade">
    <div v-if="showOverlay" class="sidebar-overlay" @click="closeSidebar" />
  </transition>

  <!-- 侧边栏 -->
  <aside
    class="app-sidebar"
    :class="sidebarClasses"
    @click="handleSidebarClick"
  >
    <!--
      sidebar-inner: fixed-width wrapper that prevents per-frame child reflows
      during the sidebar width CSS transition. The outer .app-sidebar transitions
      width with overflow:hidden, clipping this wrapper. Children inside are always
      laid out at the expanded width (260px / 280px) and never reflow.
    -->
    <div class="sidebar-inner">
      <!-- Logo / 收起按钮 -->
      <div class="sidebar-header">
        <div class="sidebar-toggle" @click="handleToggle">
          <q-icon name="menu" size="20px" class="sidebar-nav-icon" />
          <q-tooltip
            v-if="!sidebarExpanded"
            anchor="center right"
            self="center left"
            transition-show="fade"
            transition-hide="fade"
          >
            展开侧边栏
          </q-tooltip>
        </div>
        <router-link
          v-if="sidebarExpanded"
          to="/"
          class="sidebar-logo"
          @click="onNavigate"
        >
          <span class="sidebar-logo-text">blbl.top</span>
        </router-link>
      </div>

      <!-- 导航项 -->
      <div class="sidebar-nav">
        <!-- 新建搜索 -->
        <div
          class="sidebar-nav-item"
          :class="{ 'nav-item-collapsed': !sidebarExpanded }"
          @click="navigateToSearch"
        >
          <q-icon name="add" size="22px" class="sidebar-nav-icon" />
          <transition name="fade">
            <span v-if="sidebarExpanded" class="nav-label">新建搜索</span>
          </transition>
          <q-tooltip
            v-if="!sidebarExpanded"
            anchor="center right"
            self="center left"
            transition-show="fade"
            transition-hide="fade"
          >
            新建搜索
          </q-tooltip>
        </div>

        <!-- 历史记录 -->
        <div
          class="sidebar-nav-item"
          :class="{
            'nav-item-collapsed': !sidebarExpanded,
            'nav-item-active': !showHistoryList,
          }"
          @click="toggleHistory"
        >
          <q-icon name="history" size="22px" class="sidebar-nav-icon" />
          <transition name="fade">
            <span v-if="sidebarExpanded" class="nav-label">历史记录</span>
          </transition>
          <template v-if="sidebarExpanded">
            <q-space />
            <q-icon
              :name="showHistoryList ? 'expand_less' : 'expand_more'"
              size="18px"
              class="history-toggle-icon"
            />
            <q-btn
              v-if="searchHistoryStore.totalCount > 0"
              flat
              round
              dense
              icon="delete"
              size="xs"
              class="history-clear-btn"
              @click.stop="confirmClearHistory"
            >
              <q-tooltip>清除历史</q-tooltip>
            </q-btn>
          </template>
          <q-tooltip
            v-if="!sidebarExpanded"
            anchor="center right"
            self="center left"
            transition-show="fade"
            transition-hide="fade"
          >
            历史记录
          </q-tooltip>
        </div>
      </div>

      <!-- 搜索历史列表（仅展开模式） -->
      <transition name="fade">
        <div v-if="sidebarExpanded && showHistoryList" class="sidebar-history">
          <q-scroll-area class="history-scroll-area" @scroll="onHistoryScroll">
            <div
              v-if="searchHistoryStore.totalCount === 0"
              class="history-empty"
            >
              暂无搜索记录
            </div>
            <template v-else>
              <!-- 置顶记录 -->
              <div
                v-if="searchHistoryStore.pinnedItems.length > 0"
                class="history-group"
              >
                <div class="history-group-label">置顶</div>
                <div
                  v-for="item in searchHistoryStore.pinnedItems"
                  :key="'pin-' + item.id"
                  class="history-item pinned"
                  :title="getItemTooltip(item)"
                  @click="searchFromHistory(item.query)"
                >
                  <q-icon
                    name="push_pin"
                    size="14px"
                    class="history-item-icon"
                  />
                  <span class="history-item-text">
                    {{ item.displayName || item.query }}
                  </span>
                  <transition name="fade">
                    <span
                      v-if="copiedItemId === item.id"
                      class="copied-indicator"
                    >
                      链接已复制
                    </span>
                  </transition>
                  <q-btn
                    flat
                    round
                    dense
                    icon="more_horiz"
                    size="xs"
                    class="history-more-btn"
                    @click.stop
                  >
                    <q-menu
                      anchor="bottom right"
                      self="top right"
                      class="history-item-menu"
                    >
                      <q-list dense>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="startRename(item)"
                        >
                          <q-item-section side
                            ><q-icon name="edit" size="16px"
                          /></q-item-section>
                          <q-item-section>重命名</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="searchHistoryStore.togglePin(item.id)"
                        >
                          <q-item-section side
                            ><q-icon name="push_pin" size="16px"
                          /></q-item-section>
                          <q-item-section>取消置顶</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="copySearchLink(item.query, item.id)"
                        >
                          <q-item-section side
                            ><q-icon name="link" size="16px"
                          /></q-item-section>
                          <q-item-section>复制链接</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="searchHistoryStore.removeRecord(item.id)"
                        >
                          <q-item-section side
                            ><q-icon
                              name="delete"
                              size="16px"
                              class="text-negative"
                          /></q-item-section>
                          <q-item-section class="text-negative"
                            >删除</q-item-section
                          >
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </div>

              <!-- 按时间分组的最近记录 -->
              <div
                v-for="group in visibleGroupedRecentItems"
                :key="group.label"
                class="history-group"
              >
                <div class="history-group-label">{{ group.label }}</div>
                <div
                  v-for="item in group.items"
                  :key="'recent-' + item.id"
                  class="history-item"
                  :title="getItemTooltip(item)"
                  @click="searchFromHistory(item.query)"
                >
                  <q-icon
                    name="schedule"
                    size="14px"
                    class="history-item-icon"
                  />
                  <span class="history-item-text">
                    {{ item.displayName || item.query }}
                  </span>
                  <transition name="fade">
                    <span
                      v-if="copiedItemId === item.id"
                      class="copied-indicator"
                    >
                      链接已复制
                    </span>
                  </transition>
                  <q-btn
                    flat
                    round
                    dense
                    icon="more_horiz"
                    size="xs"
                    class="history-more-btn"
                    @click.stop
                  >
                    <q-menu
                      anchor="bottom right"
                      self="top right"
                      class="history-item-menu"
                    >
                      <q-list dense>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="startRename(item)"
                        >
                          <q-item-section side
                            ><q-icon name="edit" size="16px"
                          /></q-item-section>
                          <q-item-section>重命名</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="searchHistoryStore.togglePin(item.id)"
                        >
                          <q-item-section side
                            ><q-icon name="push_pin" size="16px"
                          /></q-item-section>
                          <q-item-section>置顶</q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="copySearchLink(item.query, item.id)"
                        >
                          <q-item-section side
                            ><q-icon name="link" size="16px"
                          /></q-item-section>
                          <q-item-section>复制链接</q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item
                          clickable
                          v-close-popup
                          @click.stop="searchHistoryStore.removeRecord(item.id)"
                        >
                          <q-item-section side
                            ><q-icon
                              name="delete"
                              size="16px"
                              class="text-negative"
                          /></q-item-section>
                          <q-item-section class="text-negative"
                            >删除</q-item-section
                          >
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </div>
            </template>
          </q-scroll-area>
        </div>
      </transition>

      <!-- 重命名对话框 -->
      <q-dialog v-model="showRenameDialog">
        <q-card style="min-width: 300px">
          <q-card-section>
            <div class="text-h6">重命名</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-input
              v-model="renameValue"
              dense
              autofocus
              @keyup.enter="confirmRename"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              label="取消"
              color="grey"
              @click="showRenameDialog = false"
            />
            <q-btn flat label="确认" color="primary" @click="confirmRename" />
          </q-card-actions>
        </q-card>
      </q-dialog>

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
            size="22px"
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
            transition-show="fade"
            transition-hide="fade"
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
            <q-avatar size="22px" class="sidebar-avatar">
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
            <q-menu
              v-model="showUserMenu"
              anchor="top right"
              self="bottom right"
              class="sidebar-user-menu"
            >
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
                  class="user-menu-item user-stat-item"
                >
                  <q-item-section class="stat-label-section">
                    <q-item-label>{{ stat.label }}</q-item-label>
                  </q-item-section>
                  <q-item-section class="stat-value-section" side>
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
              size="22px"
              class="sidebar-login-icon"
            />
            <transition name="fade">
              <span v-if="sidebarExpanded" class="sidebar-user-name">
                登录
              </span>
            </transition>
          </template>
          <q-tooltip
            v-if="!sidebarExpanded"
            anchor="center right"
            self="center left"
            transition-show="fade"
            transition-hide="fade"
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
            <div
              v-if="authStore.qrCodeState.error"
              class="text-negative q-pa-md"
            >
              {{ authStore.qrCodeState.error }}
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn
              flat
              label="关闭"
              color="primary"
              @click="closeLoginDialog"
            />
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
            <q-btn
              flat
              label="确认清除"
              color="negative"
              @click="clearHistory"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
    <!-- /.sidebar-inner -->

    <!-- 侧边栏右边缘手柄：点击切换展开/收起（仅桌面端） -->
    <div
      v-if="hasSidebar && !isTablet"
      class="sidebar-edge-handle"
      :class="sidebarExpanded ? 'edge-collapse' : 'edge-expand'"
      @click.stop="layoutStore.toggleSidebar()"
    >
      <div class="edge-handle-indicator">
        <svg
          v-if="sidebarExpanded"
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M10 3L4 8L10 13"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 3L12 8L6 13"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Dark, copyToClipboard } from 'quasar';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useAccountStore } from 'src/stores/accountStore';
import { useAuthStore } from 'src/stores/authStore';
import {
  useSearchHistoryStore,
  formatFullTime,
} from 'src/stores/searchHistoryStore';
import type { SearchHistoryItem } from 'src/stores/searchHistoryStore';
import { explore, restoreExploreFromCache } from 'src/functions/explore';

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
const showRenameDialog = ref(false);
const renameValue = ref('');
const renameItemId = ref('');

// History lazy-loading: only render up to this many recent items initially
const HISTORY_PAGE_SIZE = 25;
const historyDisplayLimit = ref(HISTORY_PAGE_SIZE);

// Dark mode
const isDark = ref(JSON.parse(localStorage.getItem('isDark') || 'true'));
Dark.set(isDark.value);

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  Dark.set(isDark.value);
  localStorage.setItem('isDark', JSON.stringify(isDark.value));
};

// Responsive mode
const hasSidebar = computed(() => layoutStore.hasSidebar());
const isMobile = computed(() => layoutStore.isMobileMode());
const isTablet = computed(() => layoutStore.isTabletMode());
const isOverlayMode = computed(() => layoutStore.isSidebarOverlayMode());

// Sidebar state computeds
const sidebarExpanded = computed(() => {
  if (isMobile.value) {
    // 移动端：overlay 模式始终为展开状态（侧边栏打开时全展开）
    return true;
  }
  if (isTablet.value) {
    // 平板：常态为收起，展开仅通过 overlay
    return layoutStore.isMobileSidebarOpen;
  }
  // 桌面：正常展开/收起
  return layoutStore.isSidebarExpanded;
});

const showOverlay = computed(() => {
  // mobile：overlay 打开时显示遮罩
  if (isMobile.value) return layoutStore.isMobileSidebarOpen;
  // tablet：展开时显示遮罩（overlay 模式）
  if (isTablet.value) return layoutStore.isMobileSidebarOpen;
  return false;
});

const sidebarClasses = computed(() => ({
  'sidebar-expanded': sidebarExpanded.value,
  'sidebar-collapsed': !sidebarExpanded.value,
  'sidebar-desktop': hasSidebar.value,
  'sidebar-mobile': isMobile.value,
  'sidebar-mobile-open': isMobile.value && layoutStore.isMobileSidebarOpen,
  'sidebar-tablet-overlay': isTablet.value && layoutStore.isMobileSidebarOpen,
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
  if (isOverlayMode.value) layoutStore.closeMobileSidebar();
};

const onNavigate = () => {
  if (isOverlayMode.value) layoutStore.closeMobileSidebar();
};

const searchFromHistory = async (query: string) => {
  // 尝试从缓存恢复搜索结果，避免重复的网络请求
  const restored = await restoreExploreFromCache(query);
  if (!restored) {
    // 缓存未命中，执行新的搜索
    await explore({ queryValue: query, setQuery: true, setRoute: true });
  }
  if (isOverlayMode.value) layoutStore.closeMobileSidebar();
};

// Sidebar toggle
const handleToggle = () => {
  if (isOverlayMode.value) {
    // mobile + tablet：使用 overlay 模式
    layoutStore.toggleMobileSidebar();
  } else {
    // desktop：推动内容
    layoutStore.toggleSidebar();
  }
};

// 点击收起状态的侧边栏空白区域展开
const handleSidebarClick = (event: MouseEvent) => {
  if (!sidebarExpanded.value && hasSidebar.value) {
    const target = event.target as HTMLElement;
    const isInteractive = target.closest(
      'button, a, .q-btn, .sidebar-toggle, .sidebar-nav-item, .sidebar-bottom-item'
    );
    if (!isInteractive) {
      handleToggle();
    }
  }
};

const closeSidebar = () => {
  // overlay 关闭（移动端 + 平板展开态）
  if (isOverlayMode.value) {
    layoutStore.closeMobileSidebar();
  }
};

// History
const toggleHistory = () => {
  if (sidebarExpanded.value) {
    showHistoryList.value = !showHistoryList.value;
  } else {
    // 展开侧边栏并显示历史
    handleToggle();
    showHistoryList.value = true;
  }
};

const confirmClearHistory = () => {
  showClearHistoryDialog.value = true;
};

const clearHistory = () => {
  searchHistoryStore.clearAll();
  showClearHistoryDialog.value = false;
  historyDisplayLimit.value = HISTORY_PAGE_SIZE;
};

// Tooltip helper
const getItemTooltip = (item: SearchHistoryItem): string => {
  const displayText = item.displayName || item.query;
  const timeText = formatFullTime(item.timestamp);
  if (item.displayName && item.displayName !== item.query) {
    // 如果已重命名，显示显示名、原始查询、时间
    return `${displayText}\n原始查询：${item.query}\n${timeText}`;
  }
  return `${displayText}\n${timeText}`;
};

// Rename
const startRename = (item: SearchHistoryItem) => {
  renameItemId.value = item.id;
  renameValue.value = item.displayName || item.query;
  showRenameDialog.value = true;
};

const confirmRename = async () => {
  if (renameValue.value.trim()) {
    await searchHistoryStore.renameRecord(
      renameItemId.value,
      renameValue.value
    );
  }
  showRenameDialog.value = false;
};

// Copy link
const copiedItemId = ref<string | null>(null);
const copySearchLink = async (query: string, itemId: string) => {
  const url = `${window.location.origin}/search?q=${encodeURIComponent(query)}`;
  try {
    await copyToClipboard(url);
    copiedItemId.value = itemId;
    setTimeout(() => {
      if (copiedItemId.value === itemId) {
        copiedItemId.value = null;
      }
    }, 1000);
  } catch {
    // 失败时静默处理
  }
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

// Lazy-loaded recent history: limits rendered items for performance
const visibleGroupedRecentItems = computed(() => {
  const allGroups = searchHistoryStore.groupedRecentItems;
  const limit = historyDisplayLimit.value;
  const result: typeof allGroups = [];
  let count = 0;

  for (const group of allGroups) {
    if (count >= limit) break;
    const remaining = limit - count;
    if (group.items.length <= remaining) {
      result.push(group);
      count += group.items.length;
    } else {
      result.push({
        label: group.label,
        items: group.items.slice(0, remaining),
      });
      count += remaining;
    }
  }
  return result;
});

const totalRecentCount = computed(() => searchHistoryStore.recentItems.length);
const hasMoreHistory = computed(
  () => historyDisplayLimit.value < totalRecentCount.value
);

const onHistoryScroll = (info: { verticalPercentage: number }) => {
  // Load more when scrolled past 85%
  if (info.verticalPercentage > 0.85 && hasMoreHistory.value) {
    historyDisplayLimit.value += HISTORY_PAGE_SIZE;
  }
};

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
  z-index: 2100;
  transition: width 0.25s ease, transform 0.25s ease;
  overflow: hidden;
}

/*
 * sidebar-inner: always at the expanded width so children never reflow
 * during the outer container's width CSS transition.
 * The outer .app-sidebar clips this via overflow:hidden.
 */
.sidebar-inner {
  width: 260px;
  min-width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar-mobile .sidebar-inner {
  width: 280px;
  min-width: 280px;
}

/* 桌面端（>= 768px）：推动内容 */
.app-sidebar.sidebar-desktop {
  width: 50px;
}
/* collapsed 状态：整个侧边栏显示 chevron-right 光标 */
.app-sidebar.sidebar-desktop.sidebar-collapsed {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 5l7 7-7 7' stroke='%23555' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")
      12 12,
    e-resize;
}
.app-sidebar.sidebar-desktop.sidebar-expanded {
  width: 260px;
}

/* 平板 overlay 展开态（570-767px）：从收起态变为展开 overlay */
.app-sidebar.sidebar-tablet-overlay {
  width: 260px;
}

/* 移动端（< 570px）：完全隐藏，overlay 滑入 */
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

/* ============ 侧边栏边缘手柄 ============ */
.sidebar-edge-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  z-index: 10;
  transition: background-color 0.15s ease;
}
/* 收起状态：chevron-right 光标（类似 angle-right / ›） */
.sidebar-edge-handle.edge-expand {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M9 5l7 7-7 7' stroke='%23555' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")
      12 12,
    e-resize;
}
/* 展开状态：chevron-left 光标（类似 angle-left / ‹） */
.sidebar-edge-handle.edge-collapse {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M15 5l-7 7 7 7' stroke='%23555' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")
      12 12,
    w-resize;
}
.sidebar-edge-handle:hover {
  background-color: rgba(128, 128, 128, 0.15);
}
.edge-handle-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  color: #888;
}
.sidebar-edge-handle:hover .edge-handle-indicator {
  opacity: 1;
}
body.body--dark .edge-handle-indicator {
  color: #aaa;
}

/* ============ 侧边栏头部 ============ */
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 8px 6px;
  min-height: 36px;
}

.sidebar-logo {
  margin-left: auto;
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

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.7;
  margin-left: 2px;
}
.sidebar-toggle:hover {
  opacity: 1;
}
body.body--light .sidebar-toggle:hover {
  background-color: #e8e8e8;
}
body.body--dark .sidebar-toggle:hover {
  background-color: #2a2a2a;
}

/* ============ 导航项 ============ */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
  gap: 2px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 36px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-nav-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-nav-item.nav-item-collapsed {
  padding: 8px;
  width: 38px;
  flex-shrink: 0;
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
  background-color: rgba(0, 0, 0, 0.04);
}
body.body--dark .nav-item-active {
  background-color: rgba(255, 255, 255, 0.04);
}

.nav-label {
  white-space: nowrap;
}

.history-toggle-icon {
  flex-shrink: 0;
  opacity: 0.4;
  transition: transform 0.2s ease;
}

/* ============ 搜索历史区域 ============ */
.sidebar-history {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
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
}

.sidebar-history :deep(.q-scrollarea__container) {
  overflow-x: hidden !important;
}

/* 隐藏 q-scroll-area 的水平滚动条 */
.sidebar-history :deep(.q-scrollarea__bar--h),
.sidebar-history :deep(.q-scrollarea__thumb--h) {
  display: none !important;
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
  min-width: 0;
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
  min-width: 0;
}

.copied-indicator {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0.7;
  white-space: nowrap;
}
body.body--light .copied-indicator {
  background-color: rgba(0, 0, 0, 0.06);
  color: #333;
}
body.body--dark .copied-indicator {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ccc;
}

.history-more-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
  width: 24px;
  height: 24px;
}

.history-item:hover .history-more-btn {
  opacity: 0.6;
}

.history-more-btn:hover {
  opacity: 1 !important;
}

/* 使用 :deep() 确保 scoped 样式能穿透到 q-btn 内部 */
.history-item :deep(.history-more-btn) {
  opacity: 0;
}
.history-item:hover :deep(.history-more-btn) {
  opacity: 0.6;
}
.history-item :deep(.history-more-btn:hover) {
  opacity: 1;
}

/* 时间分组 */
.history-group {
  margin-bottom: 4px;
}

.history-group-label {
  padding: 8px 16px 2px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  opacity: 0.45;
  user-select: none;
}

/* ============ 底部区域 ============ */
.sidebar-bottom {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 6px;
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
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  min-height: 36px;
}

.sidebar-bottom-item.item-collapsed {
  padding: 8px;
  width: 38px;
  flex-shrink: 0;
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
  font-size: 14px;
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
  font-size: 14px;
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

<style>
/* ============ 用户信息弹出菜单（非scoped，q-menu 传送到 body） ============ */
.sidebar-user-menu {
  border-radius: 12px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
  min-width: 160px;
}
.sidebar-user-menu .q-list {
  padding: 6px;
}
.sidebar-user-menu .q-item {
  border-radius: 8px;
  min-height: 36px;
  padding: 6px 12px;
  font-size: 14px;
}
.sidebar-user-menu .q-separator {
  margin: 4px 8px;
}
body.body--light .sidebar-user-menu {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
}
body.body--dark .sidebar-user-menu {
  background-color: #1a1a1a;
  border: 1px solid #333;
}
body.body--light .sidebar-user-menu .q-item:hover {
  background-color: #e8e8e8;
}
body.body--dark .sidebar-user-menu .q-item:hover {
  background-color: #2a2a2a;
}
.sidebar-user-menu .user-stat-item {
  min-height: 28px;
}
.sidebar-user-menu .user-stat-item .stat-label-section {
  text-align: left;
  flex: 1;
  min-width: 0;
}
.sidebar-user-menu .user-stat-item .stat-value-section {
  text-align: right;
  flex: none;
  min-width: 48px;
  justify-content: flex-end;
}

/* ============ 历史记录操作菜单（非scoped，q-menu 传送到 body） ============ */
.history-item-menu {
  border-radius: 10px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
  min-width: 140px;
}
.history-item-menu .q-list {
  padding: 4px;
}
.history-item-menu .q-item {
  border-radius: 6px;
  min-height: 32px;
  padding: 4px 10px;
  font-size: 13px;
}
.history-item-menu .q-item-section--side {
  min-width: 24px;
  padding-right: 6px;
}
.history-item-menu .q-separator {
  margin: 3px 6px;
}
body.body--light .history-item-menu {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
}
body.body--dark .history-item-menu {
  background-color: #1a1a1a;
  border: 1px solid #333;
}
body.body--light .history-item-menu .q-item:hover {
  background-color: #e8e8e8;
}
body.body--dark .history-item-menu .q-item:hover {
  background-color: #2a2a2a;
}
</style>
