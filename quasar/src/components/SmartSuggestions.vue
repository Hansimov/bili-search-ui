<template>
  <div
    class="smart-suggestions"
    v-if="smartSuggestions.length > 0"
    ref="suggestionsRef"
  >
    <q-list dense class="smart-suggestions-list">
      <q-item
        v-for="(item, index) in smartSuggestions"
        :key="index"
        clickable
        v-ripple
        class="smart-suggestion-item"
        :class="{ 'smart-suggestion-active': index === suggestSelectedIndex }"
        :title="item.text"
        @click="selectSuggestion(item)"
      >
        <q-item-section side class="smart-suggestion-left">
          <div class="suggestion-type-info">
            <q-icon
              :name="getTypeIcon(item.type)"
              size="18px"
              class="type-icon"
              :class="[
                { 'tag-icon-flip': item.type === 'tag' },
                'icon-' + item.type,
              ]"
            />
            <span class="type-badge" :class="getTypeBadgeClass(item.type)">{{
              getTypeLabel(item.type)
            }}</span>
          </div>
        </q-item-section>
        <q-item-section>
          <!-- 用 div 代替 q-item-label 避免 vue/no-v-text-v-html-on-component -->
          <div
            class="smart-suggestion-text"
            :class="'text-' + item.type"
            v-html="item.highlightedText"
          ></div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { getSearchMode, useSearchModeStore } from 'src/stores/searchModeStore';
import {
  getSmartSuggestService,
  suggestIndexVersion,
  type SmartSuggestion,
  type SuggestionType,
} from 'src/services/smartSuggestService';
import {
  resolveSuggestionQuery,
  submitSuggestionByMode,
} from 'src/functions/chat';

const SEARCH_INPUT_FOCUS_EVENT = 'bili-search:focus-input';

export default {
  name: 'SmartSuggestions',
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const searchModeStore = useSearchModeStore();
    const smartService = getSmartSuggestService();

    const suggestionsRef = ref<HTMLElement | null>(null);

    const suggestSelectedIndex = computed(
      () => layoutStore.suggestSelectedIndex
    );

    /**
     * 使用 ref + watch 代替 computed，确保在索引更新（如新搜索结果返回）后
     * 或用户输入变化时，建议列表总是及时刷新。
     * computed 在某些场景下可能因 lazy 求值导致更新延迟。
     */
    const smartSuggestions = ref<SmartSuggestion[]>([]);

    watch(
      [() => queryStore.query, suggestIndexVersion],
      ([q]) => {
        if (!q || !q.trim()) {
          smartSuggestions.value = [];
          return;
        }
        smartSuggestions.value = smartService.suggest(q);
      },
      { immediate: true }
    );

    /**
     * 箭头键导航时滚动选中项到可见区域
     */
    watch(suggestSelectedIndex, (newIdx) => {
      if (newIdx >= 0) {
        nextTick(() => {
          const el = suggestionsRef.value;
          if (!el) return;
          const items = el.querySelectorAll('.smart-suggestion-item');
          const activeItem = items[newIdx] as HTMLElement | undefined;
          if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
      }
    });

    /**
     * 根据建议类型，执行不同的点击行为：
     * - history / keyword / tag → 直接搜索文本
     * - title (视频) → 搜索 bv=... 语句（如果有 bvid）
     * - author (用户) → 搜索 uid=... 语句（如果有 uid）
     */
    const selectSuggestion = async (item: SmartSuggestion) => {
      const mode = searchModeStore.currentMode;

      if (getSearchMode(mode).apiType === 'chat') {
        queryStore.setQuery({
          newQuery: resolveSuggestionQuery(item),
          setRoute: false,
        });
        layoutStore.resetSuggestNavigation();
        layoutStore.setIsSuggestVisible(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(SEARCH_INPUT_FOCUS_EVENT, {
              detail: { placeCaretAtEnd: true },
            })
          );
        }
        return;
      }

      await submitSuggestionByMode({
        item,
        mode,
      });
    };

    const getTypeIcon = (type: SuggestionType): string => {
      const icons: Record<SuggestionType, string> = {
        history: 'history',
        title: 'live_tv',
        author: 'person',
        tag: 'sell',
        phrase: 'text_fields',
      };
      return icons[type] || 'search';
    };

    const getTypeLabel = (type: SuggestionType): string => {
      const labels: Record<SuggestionType, string> = {
        history: '历史',
        title: '视频',
        author: 'UP',
        tag: '标签',
        phrase: '短语',
      };
      return labels[type] || '';
    };

    const getTypeBadgeClass = (type: SuggestionType): string => {
      const classes: Record<SuggestionType, string> = {
        history: 'badge-history',
        title: 'badge-title',
        author: 'badge-author',
        tag: 'badge-tag',
        phrase: 'badge-phrase',
      };
      return classes[type] || '';
    };

    return {
      suggestionsRef,
      smartSuggestions,
      suggestSelectedIndex,
      selectSuggestion,
      getTypeIcon,
      getTypeLabel,
      getTypeBadgeClass,
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
  align-items: center;
}

.smart-suggestion-left {
  min-width: auto !important;
  padding-right: 8px;
  align-self: center;
}

.suggestion-type-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  width: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-tag {
  font-size: 16px !important;
}

.icon-title {
  margin-top: -1px;
}

.tag-icon-flip {
  transform: scaleX(-1);
}

.smart-suggestion-text {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  padding: 0 6px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 18px;
  height: 18px;
  white-space: nowrap;
  min-width: 32px;
  text-align: center;
  box-sizing: border-box;
}

body.body--light {
  .smart-suggestion-item:hover,
  .smart-suggestion-active {
    background-color: #f0f0f0;
  }
  .smart-suggestions-list::-webkit-scrollbar-thumb {
    background: #ccc;
  }
  /* 历史 - 白色/浅灰 */
  .icon-history,
  .badge-history,
  .text-history {
    color: #757575;
  }
  .badge-history {
    background-color: rgba(117, 117, 117, 0.08);
  }
  /* 视频 - 蓝色 */
  .icon-title,
  .badge-title,
  .text-title {
    color: #1565c0;
  }
  .badge-title {
    background-color: rgba(25, 118, 210, 0.1);
  }
  /* UP - 品红/粉色 */
  .icon-author,
  .badge-author,
  .text-author {
    color: #ad1457;
  }
  .badge-author {
    background-color: rgba(173, 20, 87, 0.1);
  }
  /* 标签 - teal */
  .icon-tag,
  .badge-tag,
  .text-tag {
    color: #00695c;
  }
  .badge-tag {
    background-color: rgba(0, 105, 92, 0.1);
  }
  /* 短语 - 灰色 */
  .icon-phrase,
  .badge-phrase,
  .text-phrase {
    color: #616161;
  }
  .badge-phrase {
    background-color: rgba(97, 97, 97, 0.08);
  }
  /* 高亮加深 */
  .text-history .suggest-highlight {
    color: #424242;
  }
  .text-title .suggest-highlight {
    color: #0d47a1;
  }
  .text-author .suggest-highlight {
    color: #880e4f;
  }
  .text-tag .suggest-highlight {
    color: #004d40;
  }
  .text-phrase .suggest-highlight {
    color: #212121;
  }
}

body.body--dark {
  .smart-suggestion-item:hover,
  .smart-suggestion-active {
    background-color: #333;
  }
  .smart-suggestions-list::-webkit-scrollbar-thumb {
    background: #555;
  }
  /* 历史 - 白色/浅灰 */
  .icon-history,
  .badge-history,
  .text-history {
    color: #bdbdbd;
  }
  .badge-history {
    background-color: rgba(189, 189, 189, 0.1);
  }
  /* 视频 - 蓝色 */
  .icon-title,
  .badge-title,
  .text-title {
    color: #64b5f6;
  }
  .badge-title {
    background-color: rgba(100, 181, 246, 0.12);
  }
  /* UP - 品红/粉色 */
  .icon-author,
  .badge-author,
  .text-author {
    color: #f48fb1;
  }
  .badge-author {
    background-color: rgba(244, 143, 177, 0.12);
  }
  /* 标签 - teal */
  .icon-tag,
  .badge-tag,
  .text-tag {
    color: #4db6ac;
  }
  .badge-tag {
    background-color: rgba(77, 182, 172, 0.12);
  }
  /* 短语 - 灰色 */
  .icon-phrase,
  .badge-phrase,
  .text-phrase {
    color: #9e9e9e;
  }
  .badge-phrase {
    background-color: rgba(158, 158, 158, 0.1);
  }
  /* 高亮加深 */
  .text-history .suggest-highlight {
    color: #e0e0e0;
  }
  .text-title .suggest-highlight {
    color: #90caf9;
  }
  .text-author .suggest-highlight {
    color: #fce4ec;
  }
  .text-tag .suggest-highlight {
    color: #b2dfdb;
  }
  .text-phrase .suggest-highlight {
    color: #e0e0e0;
  }
}
</style>

<style lang="scss">
/* 高亮样式（非 scoped，供 v-html 使用） */
.suggest-highlight {
  font-style: normal;
  font-weight: 700;
  color: inherit;
}
</style>
