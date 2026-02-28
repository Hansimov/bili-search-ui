<template>
  <q-card flat class="results-tabs-card">
    <!-- LLM 聊天面板：显示在搜索结果上方（smart/think 模式） -->
    <div
      v-if="showChatPanel"
      ref="chatContainerRef"
      class="chat-results-container"
      @scroll="handleChatScroll"
    >
      <ChatResponsePanel @retry="retryChat" @showResults="openResultsDialog" />
    </div>

    <!-- 回到底部按钮 -->
    <transition name="fade-up">
      <q-btn
        v-if="showScrollToBottom"
        round
        dense
        flat
        icon="keyboard_arrow_down"
        class="scroll-to-bottom-btn"
        size="sm"
        title="回到底部"
        @click="scrollToBottom"
      />
    </transition>

    <!-- 直接查找模式：正常显示搜索结果 -->
    <div v-if="!showChatPanel" class="results-panels-card">
      <q-tab-panels
        keep-alive
        v-model="activeTab"
        transition-prev="fade"
        transition-next="fade"
        transition-duration="0"
      >
        <q-tab-panel name="videos">
          <ResultsList />
        </q-tab-panel>
        <q-tab-panel name="graph">
          <div class="q-gutter-xs graph-results-list"></div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- 搜索结果对话框（非全屏，页面中间淡入） -->
    <q-dialog
      v-model="showResultsDialog"
      transition-show="fade"
      transition-hide="fade"
    >
      <q-card class="results-dialog-card">
        <q-toolbar class="results-dialog-toolbar">
          <q-icon
            name="search"
            size="20px"
            class="q-mr-sm"
            style="opacity: 0.5"
          />
          <q-toolbar-title class="results-dialog-title">
            搜索结果
            <span v-if="resultsSummaryText" class="results-dialog-count">{{
              resultsSummaryText
            }}</span>
          </q-toolbar-title>
          <q-btn
            flat
            round
            dense
            icon="close"
            @click="showResultsDialog = false"
          />
        </q-toolbar>
        <q-card-section class="results-dialog-body">
          <ResultsList displayMode="dialog" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script>
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { chat } from 'src/functions/chat';
import ResultsList from 'src/components/ResultsList.vue';
import ChatResponsePanel from 'src/components/ChatResponsePanel.vue';

/** 判断滚动容器是否接近底部的阈值（px） */
const SCROLL_BOTTOM_THRESHOLD = 60;

export default {
  components: {
    ResultsList,
    ChatResponsePanel,
  },
  setup() {
    const layoutStore = useLayoutStore();
    const searchModeStore = useSearchModeStore();
    const chatStore = useChatStore();
    const exploreStore = useExploreStore();

    /**
     * 是否显示聊天面板（inline 布局）
     * 基于首次会话的模式决定，而非当前选择的模式
     * 这样在对话过程中切换模式不会导致布局跳变
     */
    const isChatMode = computed(() => {
      // 如果首次会话是 chat 模式，一直显示 inline 布局
      if (searchModeStore.shouldUseInlineLayout) {
        return (
          chatStore.isLoading ||
          chatStore.hasContent ||
          chatStore.hasError ||
          chatStore.isDone ||
          chatStore.isAborted
        );
      }
      // 否则不显示聊天面板（使用全屏结果列表）
      return false;
    });

    /** 搜索结果摘要文本 */
    const resultsSummaryText = computed(() => {
      const total = exploreStore.latestHitsResult?.output?.hits?.length || 0;
      if (total > 0) return `${total} 条`;
      return '';
    });

    /** 结果对话框 */
    const showResultsDialog = ref(false);

    /** 打开搜索结果对话框 */
    const openResultsDialog = () => {
      showResultsDialog.value = true;
    };

    const retryChat = () => {
      const session = chatStore.currentSession;
      if (session.query) {
        chat({
          queryValue: session.query,
          mode: session.mode,
          setQuery: false,
          setRoute: false,
        });
      }
    };

    // ====== Auto-scroll & "回到底部" 按钮逻辑 ======

    /** 聊天滚动容器 ref */
    const chatContainerRef = ref(null);

    /** 用户是否手动向上滚动（脱离底部） */
    const userScrolledUp = ref(false);

    /** 是否正在执行程序化滚动（用于区分用户滚动和自动滚动） */
    let isProgrammaticScroll = false;

    /** 判断滚动容器是否在底部附近 */
    const isNearBottom = (el) => {
      if (!el) return true;
      return (
        el.scrollHeight - el.scrollTop - el.clientHeight <
        SCROLL_BOTTOM_THRESHOLD
      );
    };

    /** 处理聊天容器滚动事件 */
    const handleChatScroll = () => {
      // 忽略程序化滚动引发的 scroll 事件
      if (isProgrammaticScroll) return;
      const el = chatContainerRef.value;
      if (!el) return;
      userScrolledUp.value = !isNearBottom(el);
    };

    /** 平滑滚动到底部 */
    const scrollToBottom = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      isProgrammaticScroll = true;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      userScrolledUp.value = false;
      // 等滚动动画结束后恢复标志
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 400);
    };

    /** 立即滚动到底部（无动画，用于流式内容更新） */
    const scrollToBottomInstant = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      isProgrammaticScroll = true;
      el.scrollTop = el.scrollHeight;
      // 短延迟后恢复标志
      setTimeout(() => {
        isProgrammaticScroll = false;
      }, 50);
    };

    /** 是否显示 "回到底部" 按钮 */
    const showScrollToBottom = computed(
      () => isChatMode.value && userScrolledUp.value
    );

    // 监听聊天内容变化，自动滚动到底部
    // 使用多个 watch 源覆盖所有流式更新阶段
    watch(
      () => [
        chatStore.currentSession.content,
        chatStore.currentSession.thinkingContent,
        chatStore.currentSession.toolEvents.length,
        chatStore.currentSession.isLoading,
      ],
      () => {
        if (!isChatMode.value) return;
        if (userScrolledUp.value) return;
        nextTick(() => scrollToBottomInstant());
      }
    );

    // 新的聊天开始时（isLoading 变为 true），重置滚动状态
    watch(
      () => chatStore.currentSession.isLoading,
      (loading, prevLoading) => {
        if (loading && !prevLoading) {
          userScrolledUp.value = false;
          nextTick(() => scrollToBottomInstant());
        }
      }
    );

    // ====== Chat 面板与输入框对齐 ======

    /**
     * 计算并更新 chat 面板的左侧偏移，使其与输入框精确对齐。
     * 核心思路：测量 chat 容器的 viewport 左侧位置，与输入框左侧位置比较，
     * 差值即为 chat 内容需要的左侧偏移量。这样无论 sidebar、padding、滚动条怎么变，
     * 对齐始终精确。
     */
    const updateChatAlignment = () => {
      nextTick(() => {
        const container = chatContainerRef.value;
        if (!container) return;
        const root = document.documentElement;
        const inputLeft = parseFloat(
          root.style.getPropertyValue('--search-input-left-edge') || '0'
        );
        const containerLeft = container.getBoundingClientRect().left;
        const offset = Math.max(0, inputLeft - containerLeft);
        root.style.setProperty('--chat-align-offset', `${offset}px`);
      });
    };

    // 当 chat 面板变为可见时计算对齐
    watch(isChatMode, (visible) => {
      if (visible) updateChatAlignment();
    });

    // 当输入框位置变化时重新计算（侧边栏展开/收起、窗口 resize 等）
    watch(
      () => layoutStore.searchBarTotalHeight,
      () => {
        if (isChatMode.value) updateChatAlignment();
      }
    );

    const handleWindowResize = () => {
      // 延迟 1 帧，确保 SearchInput 的 updateSearchBarHeight 已先更新 CSS 变量
      requestAnimationFrame(() => {
        if (isChatMode.value) updateChatAlignment();
      });
    };

    onMounted(() => {
      window.addEventListener('resize', handleWindowResize);
      if (isChatMode.value) updateChatAlignment();
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleWindowResize);
    });

    return {
      activeTab: computed(() => layoutStore.activeTab || 'videos'),
      showChatPanel: isChatMode,
      resultsSummaryText,
      showResultsDialog,
      openResultsDialog,
      retryChat,
      chatContainerRef,
      handleChatScroll,
      scrollToBottom,
      showScrollToBottom,
    };
  },
};
</script>

<style lang="scss" scoped>
body.body--light .search-bar-row {
  background: white;
}
body.body--dark .search-bar-row {
  background: var(--q-dark-page);
}
.results-tabs-card {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%; /* fill q-page flex row so children can center properly, very important for auto-resize */
  overflow-x: hidden;
  overflow-y: hidden;
}
.results-panels-card {
  background: transparent;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: hidden;
}
.chat-results-container {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 不用 center，由 --chat-align-offset 控制对齐 */
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  /* Add padding at the bottom for the fixed search bar */
  padding-bottom: calc(var(--search-bar-total-height, 96px) + 24px);
  /* Set max height to fill available space minus header */
  max-height: calc(100vh - 50px);
}

/* 聊天模式：内联搜索结果区域 */
.chat-results-inline {
  max-width: var(--search-input-max-width, 95vw);
  width: var(--search-input-width);
  margin: 0 auto;
  padding: 8px 12px 12px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

/* 搜索结果对话框（非全屏） */
.results-dialog-card {
  display: flex;
  flex-direction: column;
  width: 90vw;
  max-width: 1100px;
  height: 80vh;
  max-height: 80vh;
  border-radius: 12px;
}

.results-dialog-toolbar {
  flex-shrink: 0;
  min-height: 48px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}

.results-dialog-title {
  font-size: 15px;
  font-weight: 500;
}

.results-dialog-count {
  font-size: 12px;
  opacity: 0.5;
  font-weight: 400;
  margin-left: 6px;
}

.results-dialog-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 12px;
  min-height: 0;
}

.graph-results-list {
  grid-template-columns: repeat(
    auto-fill,
    minmax(var(--result-item-width), 1fr)
  );
  display: grid;
  max-width: min(1280px, 95vw);
}
body.body--dark .q-tab-panels {
  background: var(--q-dark-page);
}
.q-tab-panel {
  padding: 0px;
}

/* "回到底部" 按钮：右侧对齐输入框，在输入框上方20px */
.scroll-to-bottom-btn {
  position: fixed;
  /* 使用 JS 计算的实际输入框右侧距离 */
  right: var(--search-input-right-edge, 32px);
  /* 在搜索框上方20px */
  bottom: calc(var(--search-bar-total-height, 96px) + 20px);
  z-index: 999; /* 低于建议下拉列表 z-index:1000 */
  border: 1px solid rgba(128, 128, 128, 0.2);
  opacity: 0.85;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
  &:hover {
    opacity: 1;
    transform: scale(1.05);
  }
}

body.body--light .scroll-to-bottom-btn {
  background: rgba(255, 255, 255, 0.92);
  color: #555;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
body.body--dark .scroll-to-bottom-btn {
  background: rgba(40, 40, 40, 0.92);
  color: #bbb;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* 按钮出入动画 */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* 主题适配 */
body.body--light {
  .chat-results-inline {
    background: rgba(0, 0, 0, 0.015);
  }
  .results-dialog-card {
    background: #fff;
  }
}
body.body--dark {
  .chat-results-inline {
    background: rgba(255, 255, 255, 0.02);
  }
  .results-dialog-card {
    background: var(--q-dark-page);
  }
}
</style>
