<template>
  <div class="search-history-panel" v-if="hasHistory">
    <div class="history-header">
      <span class="history-title">
        <q-icon name="history" size="14px" class="q-mr-xs" />
        搜索历史
      </span>
      <q-btn
        flat
        dense
        no-caps
        size="xs"
        label="清除"
        icon="delete_outline"
        class="clear-btn"
        title="清除建议栏输入记录（不影响侧边栏历史记录）"
        @click="clearInputHistory"
      />
    </div>

    <!-- 紧凑 chip 布局 -->
    <div class="history-chips">
      <!-- 置顶记录 -->
      <q-chip
        v-for="item in pinnedItems"
        :key="item.id"
        clickable
        dense
        outline
        color="amber-7"
        text-color="amber-9"
        icon="push_pin"
        class="history-chip pinned-chip"
        @click="searchFromHistory(item)"
        removable
        @remove="removeItem(item)"
      >
        {{ item.query }}
      </q-chip>

      <!-- 最近搜索（显示全部，超出 4 行时滚动） -->
      <q-chip
        v-for="item in recentItems"
        :key="item.id"
        clickable
        dense
        outline
        class="history-chip"
        @click="searchFromHistory(item)"
        removable
        @remove="removeItem(item)"
      >
        {{ item.query }}
      </q-chip>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, onMounted } from 'vue';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';
import type { InputHistoryItem } from 'src/stores/inputHistoryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { submitByMode } from 'src/functions/chat';

export default {
  name: 'SearchHistoryPanel',
  setup() {
    const inputHistoryStore = useInputHistoryStore();
    const layoutStore = useLayoutStore();
    const searchModeStore = useSearchModeStore();
    const chatStore = useChatStore();

    onMounted(() => {
      inputHistoryStore.loadHistory();
    });

    // 建议栏只展示输入记录，按 query 去重（保留最新一条）
    const pinnedItems = computed(() => {
      return [] as InputHistoryItem[];
    });

    const recentItems = computed(() => {
      // 按 query 去重，仅保留最新的一条（已按时间倒序）
      const seen = new Set<string>();
      return inputHistoryStore.sortedItems.filter((item) => {
        const key = item.query.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    const hasHistory = computed(() => recentItems.value.length > 0);

    const searchFromHistory = async (item: InputHistoryItem) => {
      const query = item.query;
      const mode = searchModeStore.currentMode;
      searchModeStore.setInitialSessionMode(mode);

      layoutStore.setIsSuggestVisible(false);

      // 输入记录点击后按当前模式提交；chat 模式始终新开会话
      if (mode === 'smart' || mode === 'think') {
        chatStore.startNewChat();
      }
      await submitByMode({
        queryValue: query,
        mode,
        setQuery: true,
        setRoute: true,
      });
      layoutStore.setCurrentPage(1);
    };

    const removeItem = (item: InputHistoryItem) => {
      inputHistoryStore.removeRecord(item.id);
    };

    const clearInputHistory = () => {
      inputHistoryStore.clearAll();
    };

    return {
      hasHistory,
      pinnedItems,
      recentItems,
      searchFromHistory,
      removeItem,
      clearInputHistory,
    };
  },
};
</script>

<style lang="scss" scoped>
.search-history-panel {
  padding: 4px 4px 2px 4px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px;
}

.history-title {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.6;
  display: flex;
  align-items: center;
}

.clear-btn {
  font-size: 10px;
  opacity: 0.4;
  &:hover {
    opacity: 1;
  }
}

/* 紧凑 chip 布局：flex-wrap 多行排列，最多 4 行后出现滚动条 */
.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 6px;
  /* 每行高度约 28-30px (含 gap)，4 行约 128px */
  max-height: 128px;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 4px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 2px;
  }
}

.history-chip {
  font-size: 12px;
  max-width: 200px;
  cursor: pointer;
  /* 确保长文本被截断并显示省略号，避免 chip 之间混叠 */
  overflow: hidden;
  :deep(.q-chip__content) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.pinned-chip {
  font-weight: 500;
}

body.body--light {
  .history-chip {
    border-color: #d0d0d0;
    color: #555;
  }
  .history-chips::-webkit-scrollbar-thumb {
    background: #ccc;
  }
}

body.body--dark {
  .history-chip {
    border-color: #555;
    color: #aaa;
  }
  .history-chips::-webkit-scrollbar-thumb {
    background: #555;
  }
}
</style>
