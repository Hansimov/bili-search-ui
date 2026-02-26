<template>
  <q-card flat class="results-tabs-card">
    <!-- LLM 聊天面板：显示在搜索结果上方（smart/think 模式） -->
    <div v-if="showChatPanel" class="chat-results-container">
      <ChatResponsePanel @retry="retryChat" @showResults="openResultsDialog" />
    </div>

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
import { computed, ref } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { chat } from 'src/functions/chat';
import ResultsList from 'src/components/ResultsList.vue';
import ChatResponsePanel from 'src/components/ChatResponsePanel.vue';

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

    return {
      activeTab: computed(() => layoutStore.activeTab || 'videos'),
      showChatPanel: isChatMode,
      resultsSummaryText,
      showResultsDialog,
      openResultsDialog,
      retryChat,
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
  align-items: stretch; /* Fill width instead of centering */
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
  max-width: min(800px, 90vw);
  width: 100%;
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
