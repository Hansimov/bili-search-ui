<template>
  <div class="smart-suggestions" v-if="smartSuggestions.length > 0">
    <q-list dense class="smart-suggestions-list">
      <q-item
        v-for="(item, index) in smartSuggestions"
        :key="index"
        clickable
        v-ripple
        class="smart-suggestion-item"
        @click="selectSuggestion(item)"
      >
        <q-item-section avatar class="smart-suggestion-icon">
          <q-icon
            :name="getTypeIcon(item.type)"
            :color="getTypeColor(item.type)"
            size="18px"
          />
        </q-item-section>
        <q-item-section>
          <!-- 用 div 代替 q-item-label 避免 vue/no-v-text-v-html-on-component -->
          <div
            class="smart-suggestion-text"
            v-html="item.highlightedText"
          ></div>
        </q-item-section>
        <q-item-section side>
          <q-badge
            :label="getTypeLabel(item.type)"
            :color="getTypeBadgeColor(item.type)"
            text-color="white"
            class="type-badge"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { explore } from 'src/functions/explore';
import {
  getSmartSuggestService,
  type SmartSuggestion,
  type SuggestionType,
} from 'src/services/smartSuggestService';

export default {
  name: 'SmartSuggestions',
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const router = useRouter();
    const smartService = getSmartSuggestService();

    const smartSuggestions = computed<SmartSuggestion[]>(() => {
      const q = queryStore.query;
      if (!q || !q.trim()) return [];
      return smartService.suggest(q);
    });

    /**
     * 根据建议类型，执行不同的点击行为：
     * - history / keyword / tag → 直接搜索文本
     * - title (视频) → 搜索 bv=... 语句（如果有 bvid）
     * - author (用户) → 搜索 uid=... 语句（如果有 uid）
     */
    const selectSuggestion = async (item: SmartSuggestion) => {
      layoutStore.setIsSuggestVisible(false);

      let searchQuery = item.text;

      if (item.type === 'title' && item.meta?.bvid) {
        searchQuery = `bv=${item.meta.bvid}`;
      } else if (item.type === 'author' && item.meta?.uid) {
        searchQuery = `uid=${item.meta.uid}`;
      }

      queryStore.setQuery({ newQuery: searchQuery });
      await explore({
        queryValue: searchQuery,
        setQuery: true,
        setRoute: true,
      });
      layoutStore.setCurrentPage(1);
    };

    const getTypeIcon = (type: SuggestionType): string => {
      const icons: Record<SuggestionType, string> = {
        history: 'history',
        title: 'movie',
        author: 'person',
        tag: 'label',
        keyword: 'text_fields',
      };
      return icons[type] || 'search';
    };

    const getTypeColor = (type: SuggestionType): string => {
      const colors: Record<SuggestionType, string> = {
        history: 'blue-5',
        title: 'pink-5',
        author: 'teal-5',
        tag: 'orange-5',
        keyword: 'grey-6',
      };
      return colors[type] || 'grey';
    };

    const getTypeLabel = (type: SuggestionType): string => {
      const labels: Record<SuggestionType, string> = {
        history: '历史',
        title: '视频',
        author: 'UP主',
        tag: '标签',
        keyword: '关键词',
      };
      return labels[type] || '';
    };

    const getTypeBadgeColor = (type: SuggestionType): string => {
      const colors: Record<SuggestionType, string> = {
        history: 'blue-4',
        title: 'pink-4',
        author: 'teal-4',
        tag: 'orange-4',
        keyword: 'grey-5',
      };
      return colors[type] || 'grey';
    };

    return {
      smartSuggestions,
      selectSuggestion,
      getTypeIcon,
      getTypeColor,
      getTypeLabel,
      getTypeBadgeColor,
    };
  },
};
</script>

<style lang="scss" scoped>
.smart-suggestions {
  padding: 4px 0;
}

.smart-suggestions-list {
  max-height: min(240px, calc(100vh - 200px));
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
  }
}

.smart-suggestion-item {
  min-height: 34px;
  padding: 3px 12px;
  transition: background-color 0.15s ease;
  border-radius: 4px;
  margin: 0 4px;
}

.smart-suggestion-icon {
  min-width: 28px;
}

.smart-suggestion-text {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

body.body--light {
  .smart-suggestion-item:hover {
    background-color: #f0f0f0;
  }
  .smart-suggestions-list::-webkit-scrollbar-thumb {
    background: #ccc;
  }
}

body.body--dark {
  .smart-suggestion-item:hover {
    background-color: #333;
  }
  .smart-suggestions-list::-webkit-scrollbar-thumb {
    background: #555;
  }
}
</style>

<style lang="scss">
/* 高亮样式（非 scoped，供 v-html 使用） */
.suggest-highlight {
  color: #1976d2;
  font-style: normal;
  font-weight: 600;
}
body.body--dark .suggest-highlight {
  color: #64b5f6;
}
</style>
