<template>
  <div class="search-input-wrapper" ref="wrapperRef">
    <div
      class="search-input-box"
      :class="{ 'search-input-box-dense': isDense }"
    >
      <!-- 主输入区域 -->
      <div class="search-input-row">
        <q-icon
          :name="currentModeIcon"
          :color="currentModeIconColor"
          size="20px"
          class="search-prepend-icon"
        />
        <textarea
          ref="textareaRef"
          class="search-native-input"
          :placeholder="searchInputPlaceholder"
          :value="queryModel"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          rows="1"
        ></textarea>
        <q-btn
          flat
          round
          dense
          icon="north_east"
          color="blue-5"
          class="send-btn"
          size="sm"
          title="发送"
          @click="submitQuery"
        >
        </q-btn>
      </div>

      <!-- 底部工具栏（在边框内） -->
      <div class="search-toolbar">
        <div class="toolbar-modes">
          <q-btn
            v-for="mode in modeOptions"
            :key="mode.value"
            dense
            flat
            no-caps
            size="sm"
            :class="{
              'mode-btn': true,
              'mode-btn-active': currentMode === mode.value,
            }"
            :title="mode.description"
            @click="selectMode(mode.value)"
          >
            <q-icon :name="mode.icon" size="14px" class="q-mr-xs" />
            <span class="mode-label">{{ mode.label }}</span>
          </q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useRoute } from 'vue-router';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';
import {
  useSearchModeStore,
  type SearchMode,
} from 'src/stores/searchModeStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { explore } from 'src/functions/explore';
import { getSmartSuggestService } from 'src/services/smartSuggestService';

/** 各模式的 placeholder 文本 */
const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
  direct: '直接查找 · 输入关键词，返回视频匹配结果',
  smart: '智能回答 · 输入问题，返回 AI 的回答',
  think: '深度思考 · 输入问题，返回 AI 的回答（开启思考模式）',
  research: '深度研究 · 输入研究目标，返回深度研究报告',
};

/** 各模式的 icon color */
const MODE_ICON_COLORS: Record<SearchMode, string> = {
  direct: 'blue-5',
  smart: 'teal-5',
  think: 'purple-5',
  research: 'deep-orange-5',
};

/** textarea 单行高度 & 最大行数 */
const TEXTAREA_LINE_HEIGHT = 24; // px, matches CSS line-height
const TEXTAREA_MAX_ROWS = 6;

export default {
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const exploreStore = useExploreStore();
    const searchModeStore = useSearchModeStore();
    const searchHistoryStore = useSearchHistoryStore();
    const route = useRoute();
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const wrapperRef = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    const queryModel = computed({
      get: () => queryStore.query || '',
      set: (value: string) =>
        queryStore.setQuery({
          newQuery: value,
        }),
    });

    const isDense = computed(() => route.path !== '/');
    const currentMode = computed(() => searchModeStore.currentMode);
    const modeOptions = computed(() => searchModeStore.modeOptions);
    const currentModeIcon = computed(
      () => searchModeStore.currentModeOption.icon
    );
    const currentModeIconColor = computed(
      () => MODE_ICON_COLORS[searchModeStore.currentMode]
    );

    const selectMode = (mode: SearchMode) => {
      searchModeStore.setMode(mode);
    };

    // ====== Textarea auto-resize ======

    /** 调整 textarea 高度以适应内容 */
    const autoResize = () => {
      const el = textareaRef.value;
      if (!el) return;
      // 重置为单行以获取 scrollHeight
      el.style.height = 'auto';
      const maxHeight = TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_ROWS;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    };

    /** 更新 --search-bar-total-height CSS 变量 */
    const updateSearchBarHeight = () => {
      const el = wrapperRef.value;
      if (!el) return;
      const height = el.offsetHeight;
      // 加上 sticky 容器 padding (16px * 2 = 32px)
      document.documentElement.style.setProperty(
        '--search-bar-total-height',
        `${height + 32}px`
      );
    };

    // ====== 事件处理 ======

    /** 处理输入 — 更新 store + 触发自动调整 + 重置建议导航 */
    const handleInput = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;
      queryModel.value = target.value;
      autoResize();
      // 用户输入新内容时重置建议导航状态
      layoutStore.resetSuggestNavigation();
    };

    /** Keydown 处理：Enter 提交, Shift+Enter 换行, 上下箭头导航建议 */
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        layoutStore.resetSuggestNavigation();
        submitQuery();
        return;
      }
      // 上下箭头导航建议列表
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        navigateSuggestion(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      // Escape: 恢复原始查询并关闭建议
      if (event.key === 'Escape') {
        if (layoutStore.preNavQuery !== null) {
          queryModel.value = layoutStore.preNavQuery;
        }
        layoutStore.resetSuggestNavigation();
        layoutStore.setIsSuggestVisible(false);
        return;
      }
      // Shift+Enter: 默认行为（插入换行）
    };

    /** 导航建议列表（direction: 1=下, -1=上） */
    const navigateSuggestion = (direction: number) => {
      const smartService = getSmartSuggestService();
      // 使用导航前的原始查询来获取建议列表
      const queryForSuggest = layoutStore.preNavQuery ?? queryModel.value;
      if (!queryForSuggest || !queryForSuggest.trim()) return;

      const suggestions = smartService.suggest(queryForSuggest);
      if (suggestions.length === 0) return;

      // 保存导航前的查询（仅首次）
      layoutStore.savePreNavQuery(queryModel.value);

      const current = layoutStore.suggestSelectedIndex;
      let newIndex: number;

      if (direction === 1) {
        // 向下：-1 → 0, 0 → 1, ..., last → -1（回到原始）
        newIndex = current >= suggestions.length - 1 ? -1 : current + 1;
      } else {
        // 向上：-1 → last, 0 → -1（回到原始）, 1 → 0, ...
        newIndex = current <= -1 ? suggestions.length - 1 : current - 1;
      }

      layoutStore.setSuggestSelectedIndex(newIndex);

      if (newIndex === -1) {
        // 回到原始输入
        queryModel.value = layoutStore.preNavQuery ?? '';
      } else {
        queryModel.value = suggestions[newIndex].text;
      }
    };

    const handleBlur = () => {
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    const handleFocus = async () => {
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
      await initSmartSuggest();
    };

    const handleGlobalClick = () => {
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    /** 初始化智能补全服务：确保搜索历史已加载到索引中 */
    const initSmartSuggest = async () => {
      const smartService = getSmartSuggestService();
      await searchHistoryStore.loadHistory();
      // 每次都刷新历史到索引（addFromHistory 内部会去重）
      if (searchHistoryStore.items.length > 0) {
        smartService.addFromHistory(searchHistoryStore.items);
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleGlobalClick);
      // 初始化高度
      autoResize();
      updateSearchBarHeight();
      // 监听 wrapper 尺寸变化
      if (wrapperRef.value) {
        resizeObserver = new ResizeObserver(() => {
          updateSearchBarHeight();
        });
        resizeObserver.observe(wrapperRef.value);
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleGlobalClick);
      resizeObserver?.disconnect();
    });

    const submitQuery = async () => {
      if (!queryModel.value || !queryModel.value.trim()) return;
      await explore({
        queryValue: queryModel.value,
        setQuery: true,
        setRoute: true,
      });
      layoutStore.setCurrentPage(1);
    };

    // URL 驱动的搜索 (route.query.q 变化时)
    watch(
      () => route.query.q,
      (newQuery, oldQuery) => {
        if (newQuery && newQuery !== oldQuery) {
          if (exploreStore.isRestoringSession) {
            return;
          }
          const currentQuery = queryStore.query;
          if (newQuery !== currentQuery || !exploreStore.isExploreLoading) {
            queryStore.setQuery({
              newQuery: String(newQuery),
            });
            if (
              !exploreStore.hasResults ||
              exploreStore.isExploreLoading === false
            ) {
              submitQuery();
            }
          }
        }
      },
      { immediate: true }
    );

    // 当 store 中的 query 被外部修改时同步 textarea 高度
    watch(
      () => queryStore.query,
      () => {
        nextTick(() => autoResize());
      }
    );

    const searchInputPlaceholder = computed(
      () => MODE_PLACEHOLDERS[searchModeStore.currentMode]
    );

    return {
      textareaRef,
      wrapperRef,
      queryModel,
      isDense,
      currentMode,
      currentModeIcon,
      currentModeIconColor,
      modeOptions,
      selectMode,
      handleFocus,
      handleBlur,
      handleInput,
      handleKeydown,
      submitQuery,
      searchInputPlaceholder,
    };
  },
};
</script>

<style lang="scss">
.search-input-wrapper {
  width: var(--search-input-width);
  max-width: var(--search-input-max-width);
}

/* 整体输入框容器（包含输入行+工具栏） */
.search-input-box {
  border: 1.5px solid #c0c0c0;
  border-radius: 22px;
  padding: 8px 14px 4px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: inherit;

  &:focus-within {
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
  }
}

.search-input-box-dense {
  padding: 6px 12px 2px 12px;
  border-radius: 18px;
}

/* 输入行 */
.search-input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.search-prepend-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* textarea 替换 input，支持多行自动增长 */
.search-native-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  line-height: 24px;
  color: inherit;
  min-width: 0;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
  min-height: 24px;
  max-height: calc(24px * 6);
  padding: 0;

  &::placeholder {
    color: #999;
    font-size: 14px;
  }
}

.search-input-box-dense .search-native-input {
  font-size: 15px;
}

.send-btn {
  flex-shrink: 0;
  margin-top: 0px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 1;
  }
}

/* 底部工具栏（边框内） */
.search-toolbar {
  display: flex;
  align-items: center;
  padding: 2px 0 2px 0;
  margin-top: 2px;
}

.toolbar-modes {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 模式按钮 */
.mode-btn {
  font-size: 11px !important;
  padding: 1px 8px !important;
  min-height: 24px !important;
  border-radius: 12px !important;
  transition: all 0.2s ease;
  text-transform: none;

  .mode-label {
    font-size: 11px;
    line-height: 1;
  }
}

/* Light theme */
body.body--light {
  .search-input-box {
    background: white;
    border-color: #d0d0d0;
  }
  .search-native-input {
    color: #333;
  }
  .mode-btn {
    color: #888;
    &:hover {
      color: #333;
      background-color: #f0f0f0;
    }
  }
  .mode-btn-active {
    color: #1976d2 !important;
    background-color: #e3f2fd !important;
    font-weight: 500;
  }
}

/* Dark theme */
body.body--dark {
  .search-input-box {
    background: var(--q-dark-page);
    border-color: #444;
  }
  .search-native-input {
    color: #ddd;
    &::placeholder {
      color: #666;
    }
  }
  .mode-btn {
    color: #888;
    &:hover {
      color: #ccc;
      background-color: #333;
    }
  }
  .mode-btn-active {
    color: #64b5f6 !important;
    background-color: #1a3a5c !important;
    font-weight: 500;
  }
}
</style>
