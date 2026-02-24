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
          :value="displayValue"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          @click="handleClick"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
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
import {
  getSmartSuggestService,
  suggestIndexVersion,
  type SmartSuggestion,
} from 'src/services/smartSuggestService';

/** 各模式的 placeholder 文本 */
const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
  direct: '直接查找 · 输入关键词，直接返回匹配视频',
  smart: '快速问答 · 输入问题，AI 快速回答',
  think: '智能思考 · 输入问题，返回 AI 思考过程和回答',
  research: '深度研究 · 输入研究计划，返回 AI 深度研究报告',
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

    /**
     * 箭头导航时的显示覆盖文本。
     * 当用户用 ↑/↓ 导航建议时，textarea 显示此文本而不修改 queryStore。
     * 仅在 Tab/Enter 确认时才提交到 queryModel。
     */
    const displayOverride = ref<string | null>(null);

    /** 跟踪 textarea 是否处于聚焦状态（比 document.activeElement 更可靠） */
    const isInputFocused = ref(false);

    /** 跟踪 IME 输入法是否正在进行组合输入 */
    const isComposing = ref(false);

    const onCompositionStart = () => {
      isComposing.value = true;
    };
    const onCompositionEnd = () => {
      isComposing.value = false;
    };

    /** textarea 实际显示的值：优先显示 displayOverride，否则显示 queryModel */
    const displayValue = computed(
      () => displayOverride.value ?? queryModel.value
    );

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

    /** 更新 --search-bar-total-height CSS 变量 + layoutStore */
    const updateSearchBarHeight = () => {
      const el = wrapperRef.value;
      if (!el) return;
      const height = el.offsetHeight;
      // 加上 sticky 容器 padding (16px * 2 = 32px)
      const totalHeight = height + 32;
      document.documentElement.style.setProperty(
        '--search-bar-total-height',
        `${totalHeight}px`
      );
      layoutStore.setSearchBarTotalHeight(totalHeight);
    };

    // ====== 事件处理 ======

    /** 处理输入 — 更新 store + 触发自动调整 + 重置建议导航 */
    const handleInput = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;
      queryModel.value = target.value;
      displayOverride.value = null;
      autoResize();
      // 用户输入新内容时重置建议导航状态
      layoutStore.resetSuggestNavigation();
      // 用户输入时重新打开建议（如 Esc 关闭后再输入）
      if (!layoutStore.isSuggestVisible && target.value.trim()) {
        layoutStore.setIsSuggestVisible(true);
      }
    };

    /** Keydown 处理：Enter 提交, Shift+Enter 换行, Tab 确认建议, 上下箭头导航建议 */
    const handleKeydown = (event: KeyboardEvent) => {
      // IME 输入法组合输入期间，跳过所有快捷键处理
      if (event.isComposing || isComposing.value) return;

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const selectedIdx = layoutStore.suggestSelectedIndex;
        if (selectedIdx >= 0) {
          // 有建议选中 → 按类型执行不同操作
          const smartService = getSmartSuggestService();
          const suggestions = smartService.suggest(queryModel.value);
          const selected = suggestions[selectedIdx];
          if (selected) {
            displayOverride.value = null;
            layoutStore.resetSuggestNavigation();
            textareaRef.value?.blur();
            executeSuggestionAction(selected);
            return;
          }
        }
        // 无建议选中，正常提交
        if (displayOverride.value !== null) {
          queryModel.value = displayOverride.value;
          displayOverride.value = null;
        }
        layoutStore.resetSuggestNavigation();
        textareaRef.value?.blur();
        submitQuery();
        return;
      }
      // Tab: 确认当前预览建议到输入框并刷新建议列表（不触发搜索）
      if (event.key === 'Tab') {
        if (displayOverride.value !== null) {
          event.preventDefault();
          queryModel.value = displayOverride.value;
          displayOverride.value = null;
          layoutStore.resetSuggestNavigation();
          autoResize();
          // 确保建议列表可见，以新文本刷新补全
          if (!layoutStore.isSuggestVisible) {
            layoutStore.setIsSuggestVisible(true);
          }
        }
        return;
      }
      // 上下箭头导航建议列表
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        navigateSuggestion(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      // Escape: 取消预览，关闭建议
      if (event.key === 'Escape') {
        displayOverride.value = null;
        layoutStore.resetSuggestNavigation();
        layoutStore.setIsSuggestVisible(false);
        return;
      }
      // Shift+Enter: 默认行为（插入换行）
    };

    /**
     * 执行建议的类型特定操作（与 SmartSuggestions.selectSuggestion 逻辑一致）：
     * - title (视频) → 搜索 bv=... 语句
     * - author (用户) → 搜索 uid=... 语句
     * - 其他 → 搜索建议文本
     */
    const executeSuggestionAction = (item: SmartSuggestion) => {
      layoutStore.setIsSuggestVisible(false);
      let searchQuery = item.text;
      if (item.type === 'title' && item.meta?.bvid) {
        searchQuery = `bv=${item.meta.bvid}`;
      } else if (item.type === 'author' && item.meta?.uid) {
        searchQuery = `uid=${item.meta.uid}`;
      }
      queryModel.value = searchQuery;
      explore({
        queryValue: searchQuery,
        setQuery: true,
        setRoute: true,
      });
      layoutStore.setCurrentPage(1);
    };

    /** 导航建议列表（direction: 1=下, -1=上） — 仅预览，不修改 queryStore */
    const navigateSuggestion = (direction: number) => {
      // 确保建议列表可见
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }

      const smartService = getSmartSuggestService();
      // 始终使用实际查询（queryModel）来获取建议，而非预览文本
      const q = queryModel.value;
      if (!q || !q.trim()) return;

      const suggestions = smartService.suggest(q);
      if (suggestions.length === 0) return;

      let current = layoutStore.suggestSelectedIndex;
      // 防止 index 越界（suggestions 可能因索引变化而长度改变）
      if (current >= suggestions.length) {
        current = suggestions.length - 1;
      }

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
        displayOverride.value = null;
      } else {
        displayOverride.value = suggestions[newIndex].text;
      }
    };

    const handleBlur = () => {
      isInputFocused.value = false;
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    const handleFocus = async () => {
      isInputFocused.value = true;
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
      await initSmartSuggest();
    };

    /** 点击输入框 — 确保建议列表可见（处理已聚焦但建议被隐藏的情况） */
    const handleClick = () => {
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
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

    // 当 store 中的 query 被外部修改时同步 textarea 高度 + 清除导航预览
    watch(
      () => queryStore.query,
      () => {
        displayOverride.value = null;
        nextTick(() => autoResize());
      }
    );

    // 当索引更新时（如搜索结果返回后），若输入框仍聚焦则自动显示建议
    watch(suggestIndexVersion, () => {
      if (isInputFocused.value && !layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
    });

    const searchInputPlaceholder = computed(
      () => MODE_PLACEHOLDERS[searchModeStore.currentMode]
    );

    return {
      textareaRef,
      wrapperRef,
      displayValue,
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
      handleClick,
      onCompositionStart,
      onCompositionEnd,
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
