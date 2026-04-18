<template>
  <q-card
    flat
    class="results-tabs-card"
    :class="{ 'results-tabs-card--direct': !showChatPanel }"
  >
    <!-- LLM 聊天面板：显示在搜索结果上方（smart/think 模式） -->
    <div
      v-if="showChatPanel"
      ref="chatContainerRef"
      class="chat-results-container"
      @scroll="handleChatScroll"
    >
      <ChatResponsePanel
        @retry="retryChat"
        @continue="continueChat"
        @edit="editChatQuery"
        @showResults="openResultsDialog"
      />
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
      <SearchModeEmptyState
        v-if="showDirectEmptyLanding"
        mode="direct"
        variant="page"
        show-direct-quick-help
        class="results-empty-landing"
      />
      <q-tab-panels
        v-else
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
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  watch,
  nextTick,
} from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useQueryStore } from 'src/stores/queryStore';
import { chat } from 'src/functions/chat';
import ResultsList from 'src/components/ResultsList.vue';
import SearchModeEmptyState from 'src/components/SearchModeEmptyState.vue';

const ChatResponsePanel = defineAsyncComponent(() =>
  import('src/components/ChatResponsePanel.vue')
);

/** 判断滚动容器是否接近底部的阈值（px） */
const SCROLL_BOTTOM_THRESHOLD = 60;

export default {
  components: {
    ResultsList,
    ChatResponsePanel,
    SearchModeEmptyState,
  },
  setup() {
    const layoutStore = useLayoutStore();
    const searchModeStore = useSearchModeStore();
    const chatStore = useChatStore();
    const exploreStore = useExploreStore();
    const queryStore = useQueryStore();

    /**
     * 是否显示聊天面板（inline 布局）
     * 基于首次会话的模式决定，而非当前选择的模式
     * 这样在对话过程中切换模式不会导致布局跳变
     */
    const isChatMode = computed(() => {
      const hasChatActivity =
        chatStore.conversationHistory.length > 0 ||
        !!chatStore.currentSession.query ||
        chatStore.isLoading ||
        chatStore.hasContent ||
        chatStore.hasError ||
        chatStore.isDone ||
        chatStore.isAborted;

      const isEmptyChatLanding =
        (searchModeStore.currentMode === 'smart' ||
          searchModeStore.currentMode === 'think') &&
        !hasChatActivity;

      // 如果首次会话是 chat 模式，一直显示 inline 布局
      if (searchModeStore.shouldUseInlineLayout) {
        return true;
      }

      return isEmptyChatLanding;
    });

    const showDirectEmptyLanding = computed(() => {
      const hasDraftQuery = !!queryStore.query?.trim();
      const hasSubmittedQuery = !!exploreStore.submittedQuery?.trim();
      return (
        searchModeStore.currentMode === 'direct' &&
        !isChatMode.value &&
        !hasDraftQuery &&
        !hasSubmittedQuery &&
        !exploreStore.isExploreLoading &&
        !exploreStore.hasResults
      );
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

    const requestSearchInputFocus = (detail = { placeCaretAtEnd: true }) => {
      window.dispatchEvent(
        new CustomEvent('bili-search:focus-input', {
          detail,
        })
      );
    };

    const retryChat = async (payload = null) => {
      if (payload?.query) {
        await chat({
          queryValue: payload.query,
          mode: payload.mode || chatStore.currentSession.mode,
          setQuery: false,
          setRoute: false,
          baseHistory: payload.baseHistory,
        });
        return;
      }

      await chatStore.retryCurrentRound();
    };

    const continueChat = async (payload = null) => {
      if (payload?.baseHistory) {
        await chat({
          queryValue: payload.query || '继续',
          mode: payload.mode || chatStore.currentSession.mode,
          setQuery: false,
          setRoute: false,
          baseHistory: payload.baseHistory,
        });
        return;
      }

      await chatStore.continueCurrentRound();
    };

    const editChatQuery = async (payload) => {
      if (!payload?.query) return;
      if (payload.mode) {
        searchModeStore.setMode(payload.mode);
      }
      queryStore.setQuery({
        newQuery: payload.query,
        setRoute: false,
      });
      await nextTick();
      requestSearchInputFocus({ placeCaretAtEnd: true });
    };

    // ====== Auto-scroll & "回到底部" 按钮逻辑 ======

    /** 滚动容器引用：chat 结果容器自身 */
    const chatContainerRef = ref(null);

    /** 用户是否手动向上滚动（脱离底部） */
    const userScrolledUp = ref(false);

    /** 是否正在执行程序化滚动（用于区分用户滚动和自动滚动） */
    let isProgrammaticScroll = false;
    let scrollRaf = 0;
    let resizeObserver = null;
    let observedContentEl = null;
    let intentListenerEl = null;
    let lastUserScrollIntentAt = 0;
    let lastScrollMetrics = {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
    };

    const markUserScrollIntent = () => {
      lastUserScrollIntentAt = Date.now();
    };

    const detachUserScrollIntentListeners = () => {
      if (!intentListenerEl) return;
      intentListenerEl.removeEventListener('wheel', markUserScrollIntent);
      intentListenerEl.removeEventListener('touchmove', markUserScrollIntent);
      intentListenerEl.removeEventListener('mousedown', markUserScrollIntent);
      intentListenerEl = null;
    };

    const attachUserScrollIntentListeners = () => {
      const el = chatContainerRef.value;
      if (!el || el === intentListenerEl) return;
      detachUserScrollIntentListeners();
      el.addEventListener('wheel', markUserScrollIntent, { passive: true });
      el.addEventListener('touchmove', markUserScrollIntent, {
        passive: true,
      });
      el.addEventListener('mousedown', markUserScrollIntent);
      intentListenerEl = el;
    };

    const updateScrollMetrics = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      lastScrollMetrics = {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    };

    const wasPinnedToBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = lastScrollMetrics;
      if (!scrollHeight || !clientHeight) {
        return isNearBottom(chatContainerRef.value);
      }
      return scrollHeight - scrollTop - clientHeight < SCROLL_BOTTOM_THRESHOLD;
    };

    const scheduleScrollToBottomInstant = () => {
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = 0;
        scrollToBottomInstant();
      });
    };

    const disconnectResizeObserver = () => {
      if (resizeObserver && observedContentEl) {
        resizeObserver.unobserve(observedContentEl);
      }
      observedContentEl = null;
    };

    const observeChatContentResize = () => {
      if (typeof ResizeObserver === 'undefined') return;
      const container = chatContainerRef.value;
      if (!container) return;
      const contentEl =
        container.querySelector('.chat-response-panel') ||
        container.firstElementChild;
      if (!contentEl || contentEl === observedContentEl) return;
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (!isChatMode.value) return;
          const shouldKeepPinned = !userScrolledUp.value && wasPinnedToBottom();
          updateScrollMetrics();
          if (shouldKeepPinned) {
            scheduleScrollToBottomInstant();
          }
        });
      }
      disconnectResizeObserver();
      resizeObserver.observe(contentEl);
      observedContentEl = contentEl;
    };

    /** 判断滚动容器是否在底部附近 */
    const isNearBottom = (el) => {
      if (!el) return true;
      return (
        el.scrollHeight - el.scrollTop - el.clientHeight <
        SCROLL_BOTTOM_THRESHOLD
      );
    };

    /** 处理 chat 容器滚动事件 */
    const handleChatScroll = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      if (isProgrammaticScroll) {
        updateScrollMetrics();
        return;
      }
      const shouldKeepPinned = !userScrolledUp.value && wasPinnedToBottom();
      const userInitiated = Date.now() - lastUserScrollIntentAt < 250;
      if (!userInitiated) {
        updateScrollMetrics();
        if (shouldKeepPinned && !isNearBottom(el)) {
          scheduleScrollToBottomInstant();
        }
        return;
      }
      userScrolledUp.value = !isNearBottom(el);
      updateScrollMetrics();
    };

    /** 平滑滚动到底部 */
    const scrollToBottom = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      isProgrammaticScroll = true;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      userScrolledUp.value = false;
      updateScrollMetrics();
      setTimeout(() => {
        isProgrammaticScroll = false;
        updateScrollMetrics();
      }, 400);
    };

    /** 立即滚动到底部（无动画，用于流式内容更新） */
    const scrollToBottomInstant = () => {
      const el = chatContainerRef.value;
      if (!el) return;
      isProgrammaticScroll = true;
      el.scrollTop = el.scrollHeight;
      userScrolledUp.value = false;
      updateScrollMetrics();
      setTimeout(() => {
        isProgrammaticScroll = false;
        updateScrollMetrics();
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
        nextTick(() => scheduleScrollToBottomInstant());
      }
    );

    // 新的聊天开始时（isLoading 变为 true），重置滚动状态
    watch(
      () => chatStore.currentSession.isLoading,
      (loading, prevLoading) => {
        if (loading && !prevLoading) {
          userScrolledUp.value = false;
          nextTick(() => scheduleScrollToBottomInstant());
        }
      }
    );

    watch(
      [chatContainerRef, isChatMode],
      ([container, enabled]) => {
        if (!enabled || !container) {
          disconnectResizeObserver();
          return;
        }
        nextTick(() => {
          updateScrollMetrics();
          observeChatContentResize();
          attachUserScrollIntentListeners();
          if (!userScrolledUp.value) {
            scheduleScrollToBottomInstant();
          }
        });
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      if (scrollRaf) {
        window.cancelAnimationFrame(scrollRaf);
        scrollRaf = 0;
      }
      disconnectResizeObserver();
      detachUserScrollIntentListeners();
    });

    // Chat 面板与输入框对齐：完全依赖 CSS 变量 + align-items: center，
    // 与 SearchInput 使用相同的 --search-input-width / --search-input-max-width，
    // 无需 JS 测量，侧边栏切换时自动跟随布局动画。

    return {
      activeTab: computed(() => layoutStore.activeTab || 'videos'),
      showChatPanel: isChatMode,
      showDirectEmptyLanding,
      resultsSummaryText,
      showResultsDialog,
      openResultsDialog,
      retryChat,
      continueChat,
      editChatQuery,
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
  width: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: hidden;
}

.results-tabs-card--direct {
  height: calc(
    var(--viewport-height-css, 100vh) - 36px -
      var(--search-bar-total-height, 84px) + 2px
  );
}

.results-panels-card {
  background: transparent;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: hidden;
}

.results-empty-landing {
  max-width: var(--search-input-max-width, 95vw);
}

.results-panels-card :deep(.q-tab-panels) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  background: transparent;
}

.results-panels-card :deep(.q-panel) {
  height: 100%;
  min-height: 0;
}

.results-panels-card :deep(.q-tab-panel) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.chat-results-container {
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center; /* 纯 CSS 居中，与 SearchInput 同理 */
  width: 100%;
  min-height: 0;
  height: calc(
    var(--viewport-height-css, 100vh) - 36px -
      var(--search-bar-total-height, 84px) - 10px
  );
  max-height: calc(
    var(--viewport-height-css, 100vh) - 36px -
      var(--search-bar-total-height, 84px) - 10px
  );
  overflow-x: hidden;
  overflow-y: auto;
  overflow-anchor: none;
  scrollbar-gutter: stable;
  /* 底部留出空间，避免最后内容被输入框遮挡 */
  padding-right: 6px;
  padding-bottom: calc(var(--search-bar-total-height, 84px) + 24px);
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

/* "回到底部" 按钮：右侧对齐输入框，在输入框上方 */
.scroll-to-bottom-btn {
  position: fixed;
  right: var(--search-input-right-edge, 32px);
  bottom: calc(var(--search-bar-total-height, 84px) + 8px);
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
