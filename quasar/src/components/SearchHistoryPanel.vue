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
        @click="clearHistory"
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
        @remove="removeItem(item.id)"
      >
        {{ item.displayName || item.query }}
      </q-chip>

      <!-- 最近搜索 -->
      <q-chip
        v-for="item in recentItems.slice(0, 12)"
        :key="item.id"
        clickable
        dense
        outline
        class="history-chip"
        @click="searchFromHistory(item)"
        removable
        @remove="removeItem(item.id)"
      >
        {{ item.displayName || item.query }}
      </q-chip>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, onMounted } from 'vue';
import {
  useSearchHistoryStore,
  type SearchHistoryItem,
} from 'src/stores/searchHistoryStore';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { explore } from 'src/functions/explore';

export default {
  name: 'SearchHistoryPanel',
  setup() {
    const historyStore = useSearchHistoryStore();
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();

    onMounted(async () => {
      await historyStore.loadHistory();
    });

    const hasHistory = computed(() => historyStore.items.length > 0);
    const pinnedItems = computed(() => {
      // 按显示名称/query去重，仅保留最新的一条
      const seen = new Set<string>();
      return historyStore.pinnedItems.filter((item) => {
        const key = (item.displayName || item.query).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    const recentItems = computed(() => {
      // 按显示名称/query去重，仅保留最新的一条（已按时间倒序）
      const seen = new Set<string>();
      return historyStore.recentItems.filter((item) => {
        const key = (item.displayName || item.query).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    const searchFromHistory = async (item: SearchHistoryItem) => {
      const query = item.query;
      queryStore.setQuery({ newQuery: query });
      layoutStore.setIsSuggestVisible(false);
      await explore({
        queryValue: query,
        setQuery: true,
        setRoute: true,
      });
      layoutStore.setCurrentPage(1);
    };

    const removeItem = async (id: string) => {
      await historyStore.removeRecord(id);
    };

    const clearHistory = async () => {
      await historyStore.clearUnpinned();
    };

    return {
      hasHistory,
      pinnedItems,
      recentItems,
      searchFromHistory,
      removeItem,
      clearHistory,
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

/* 紧凑 chip 布局：flex-wrap 多行排列 */
.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 6px;
  max-height: min(160px, calc(100vh - 220px));
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
