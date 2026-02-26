<template>
  <q-card flat class="results-tabs-card">
    <!-- LLM 聊天面板：显示在搜索结果上方（smart/think 模式） -->
    <div v-if="showChatPanel" class="chat-results-container">
      <ChatResponsePanel @retry="retryChat" />
    </div>

    <!-- 搜索结果列表：始终显示 -->
    <div class="results-panels-card">
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
  </q-card>
</template>

<script>
import { computed } from 'vue';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
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

    const isChatMode = computed(() => {
      // 显示聊天面板条件：当前为聊天模式 且 有正在进行或已完成的聊天
      return (
        searchModeStore.isChatMode &&
        (chatStore.isLoading || chatStore.hasContent || chatStore.hasError)
      );
    });

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
  justify-content: center;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 80px; /* 为底部搜索栏留空间 */
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
</style>
