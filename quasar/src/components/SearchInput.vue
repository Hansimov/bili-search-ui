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
          :rows="minRows"
        ></textarea>
        <q-btn
          v-if="displayValue.trim()"
          flat
          round
          dense
          icon="close"
          class="clear-btn"
          size="xs"
          title="清除"
          @click="clearQuery"
        />
        <q-btn
          v-if="isRequestInProgress"
          flat
          round
          dense
          icon="stop"
          color="negative"
          class="send-btn stop-btn"
          size="sm"
          title="停止"
          @click="stopRequest"
        >
        </q-btn>
        <q-btn
          v-else
          flat
          round
          dense
          icon="north_east"
          :color="currentModeIconColor"
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
          <template v-for="mode in modeOptions" :key="mode.value">
            <!-- 深度研究按钮：禁用但保持动效 -->
            <q-btn
              v-if="mode.value === 'research'"
              dense
              flat
              no-caps
              size="sm"
              :class="{
                'mode-btn': true,
                'mode-btn-disabled': true,
                [`mode-btn-${mode.value}`]: true,
              }"
              title="正在测试，即将推出：生成深度研究报告"
              @mouseenter="hoveredMode = mode.value"
              @mouseleave="hoveredMode = null"
            >
              <q-icon :name="mode.icon" size="14px" class="q-mr-xs" />
              <span class="mode-label">{{ getModeDisplayLabel(mode) }}</span>
            </q-btn>
            <!-- 其他模式按钮：正常交互 -->
            <q-btn
              v-else
              dense
              flat
              no-caps
              size="sm"
              :class="{
                'mode-btn': true,
                'mode-btn-active': currentMode === mode.value,
                [`mode-btn-${mode.value}`]: true,
              }"
              :title="mode.description"
              @click="selectMode(mode.value)"
              @mouseenter="hoveredMode = mode.value"
              @mouseleave="hoveredMode = null"
            >
              <q-icon :name="mode.icon" size="14px" class="q-mr-xs" />
              <span class="mode-label">{{ getModeDisplayLabel(mode) }}</span>
            </q-btn>
          </template>
        </div>
      </div>
    </div>
    <DslHelpDialog v-model="showDslHelp" />
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
  defineAsyncComponent,
} from 'vue';
import { useRoute } from 'vue-router';
import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useChatStore } from 'src/stores/chatStore';
import {
  useSearchModeStore,
  type SearchMode,
} from 'src/stores/searchModeStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';
import { explore, abortExplore } from 'src/functions/explore';
import {
  submitCurrentModeQuery,
  submitSuggestionByMode,
} from 'src/functions/chat';
import {
  getSmartSuggestService,
  suggestIndexVersion,
  type SmartSuggestion,
} from 'src/services/smartSuggestService';
import {
  getDocumentZoom,
  getViewportCssHeight,
  getViewportCssWidth,
  viewportPxToCssPx,
} from 'src/utils/zoom';

const DslHelpDialog = defineAsyncComponent(() => import('./DslHelpDialog.vue'));

/** 各模式的 placeholder 文本 */
const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
  direct: '直接查找 · 输入关键词，直接返回匹配视频',
  smart: '快速问答 · 输入问题，AI 快速回答',
  think: '智能思考 · 输入问题，返回 AI 思考过程和回答',
  research: '深度研究 · 输入研究计划，返回 AI 深度研究报告',
};

/** 各模式的 icon color */
const MODE_ICON_COLORS: Record<SearchMode, string> = {
  direct: 'teal-5',
  smart: 'blue-5',
  think: 'purple-5',
  research: 'deep-orange-5',
};

/** textarea 单行高度 & 最大行数 */
const TEXTAREA_LINE_HEIGHT = 24; // px, matches CSS line-height
const TEXTAREA_MAX_ROWS = 6;
/** 窗口高度低于此值时，输入框默认 1 行；否则 2 行 */
const COMPACT_WINDOW_HEIGHT = 500;

export default {
  components: {
    DslHelpDialog,
  },
  setup() {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const exploreStore = useExploreStore();
    const chatStore = useChatStore();
    const searchModeStore = useSearchModeStore();
    const searchHistoryStore = useSearchHistoryStore();
    const inputHistoryStore = useInputHistoryStore();
    const route = useRoute();
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const wrapperRef = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    /** 默认 1 行，窗口高度足够时可自动增长到多行 */
    const minRows = ref(1);

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

    /** 提交后抑制建议显示，直到用户再次输入或重新聚焦 */
    const suppressSuggest = ref(false);

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
      // 切换到直接查找模式时，抖动侧边栏搜索语法按钮提示用户
      if (mode === 'direct') {
        searchModeStore.triggerDslHelpShake();
      }
    };

    /** 是否显示 DSL 帮助对话框 */
    const showDslHelp = ref(false);

    /** 模式简短标签（未选中未悬浮时显示） */
    const SHORT_MODE_LABELS: Record<SearchMode, string> = {
      direct: '查找',
      smart: '问答',
      think: '思考',
      research: '研究',
    };

    /** 当前鼠标悬浮的模式按钮 */
    const hoveredMode = ref<SearchMode | null>(null);

    /** 获取模式按钮显示标签（选中或悬浮时显示完整标签，否则显示简短标签） */
    const getModeDisplayLabel = (mode: {
      value: SearchMode;
      label: string;
    }) => {
      if (
        currentMode.value === mode.value ||
        hoveredMode.value === mode.value
      ) {
        return mode.label;
      }
      return SHORT_MODE_LABELS[mode.value];
    };

    // ====== Textarea auto-resize ======

    /** 调整 textarea 高度以适应内容（最小 minRows 行） */
    const autoResize = () => {
      const el = textareaRef.value;
      if (!el) return;
      const minHeight = TEXTAREA_LINE_HEIGHT * minRows.value;
      el.style.height = `${minHeight}px`;
      const maxHeight = TEXTAREA_LINE_HEIGHT * TEXTAREA_MAX_ROWS;
      el.style.height = `${Math.max(
        Math.min(el.scrollHeight, maxHeight),
        minHeight
      )}px`;
    };

    /** 更新 --search-bar-total-height 及输入框位置相关 CSS 变量 + layoutStore */
    const updateSearchBarHeight = () => {
      const el = wrapperRef.value;
      if (!el) return;
      const height = el.offsetHeight;
      // 加上搜索栏容器 padding (12px * 2 = 24px)
      const totalHeight = height + 24;
      const rect = el.getBoundingClientRect();
      const zoom = getDocumentZoom();
      const viewportWidthCss = getViewportCssWidth(zoom);
      const viewportHeightCss = getViewportCssHeight(zoom);
      const inputLeftCss = viewportPxToCssPx(rect.left, zoom);
      const inputRightCss =
        viewportWidthCss - viewportPxToCssPx(rect.right, zoom);
      const inputWidthCss = viewportPxToCssPx(rect.width, zoom);
      const root = document.documentElement;
      root.style.setProperty('--search-bar-total-height', `${totalHeight}px`);
      root.style.setProperty('--viewport-width-css', `${viewportWidthCss}px`);
      root.style.setProperty('--viewport-height-css', `${viewportHeightCss}px`);
      // 输入框左侧距 viewport 左边缘的距离（用于 chat 面板对齐）
      root.style.setProperty('--search-input-left-edge', `${inputLeftCss}px`);
      // 输入框右侧距 viewport 右边缘的距离（用于“回到底部”按钮对齐）
      root.style.setProperty('--search-input-right-edge', `${inputRightCss}px`);
      // 输入框实际渲染宽度（用于 chat 面板宽度匹配）
      root.style.setProperty(
        '--search-input-actual-width',
        `${inputWidthCss}px`
      );
      layoutStore.setSearchBarTotalHeight(totalHeight);
    };

    // ====== 事件处理 ======

    /** 处理输入 — 更新 store + 触发自动调整 + 重置建议导航 */
    const handleInput = (event: Event) => {
      suppressSuggest.value = false;
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
            suppressSuggest.value = true;
            void executeSuggestionAction(selected);
            return;
          }
        }
        // 无建议选中，正常提交
        if (displayOverride.value !== null) {
          queryModel.value = displayOverride.value;
          displayOverride.value = null;
        }
        layoutStore.resetSuggestNavigation();
        suppressSuggest.value = true;
        layoutStore.setIsSuggestVisible(false);
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
    const executeSuggestionAction = async (item: SmartSuggestion) => {
      const shouldClearImmediately =
        currentMode.value === 'smart' || currentMode.value === 'think';
      const submittedQuery = item.text;

      if (shouldClearImmediately) {
        clearVisibleQueryImmediately();
      }

      const didSubmit = await submitSuggestionByMode({
        item,
        mode: currentMode.value,
      });

      if (!didSubmit) {
        if (shouldClearImmediately) {
          queryModel.value = submittedQuery;
          if (textareaRef.value) {
            textareaRef.value.value = submittedQuery;
          }
          nextTick(() => autoResize());
        }
        return;
      }

      displayOverride.value = null;
      suppressSuggest.value = true;
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
      suppressSuggest.value = false;
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
      await initSmartSuggest();
    };

    /** 点击输入框 — 确保建议列表可见（处理已聚焦但建议被隐藏的情况） */
    const handleClick = () => {
      if (suppressSuggest.value) return;
      if (!layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
      }
    };

    const handleGlobalClick = () => {
      if (!layoutStore.isMouseInSearchBar) {
        layoutStore.setIsSuggestVisible(false);
      }
    };

    /** 初始化智能补全服务：仅使用输入记录作为 history 建议来源 */
    const initSmartSuggest = async () => {
      const smartService = getSmartSuggestService();
      inputHistoryStore.loadHistory();
      // 每次都刷新输入记录到索引（addFromHistory 内部会去重）
      if (inputHistoryStore.items.length > 0) {
        smartService.addFromHistory(inputHistoryStore.items);
      }
    };

    /** 清除输入框内容 */
    const clearQuery = () => {
      queryModel.value = '';
      displayOverride.value = null;
      if (textareaRef.value) {
        textareaRef.value.value = '';
      }
      layoutStore.resetSuggestNavigation();
      layoutStore.setIsSuggestVisible(false);
      suppressSuggest.value = false;
      nextTick(() => {
        autoResize();
        textareaRef.value?.focus();
      });
    };

    const clearVisibleQueryImmediately = () => {
      queryModel.value = '';
      displayOverride.value = null;
      if (textareaRef.value) {
        textareaRef.value.value = '';
      }
      nextTick(() => autoResize());
    };

    /** 监听窗口 resize，动态调整默认行数 + 更新输入框位置 CSS 变量 */
    const handleWindowResize = () => {
      const newMin = window.innerHeight < COMPACT_WINDOW_HEIGHT ? 1 : 1;
      if (newMin !== minRows.value) {
        minRows.value = newMin;
        nextTick(() => autoResize());
      }
      // 窗口宽度变化时输入框位置会变，必须重新测量并更新 CSS 变量
      updateSearchBarHeight();
    };

    onMounted(() => {
      document.addEventListener('click', handleGlobalClick);
      window.addEventListener('resize', handleWindowResize);
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
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver?.disconnect();
    });

    // 侧边栏展开/收起有 250ms CSS transition，结束后重新测量输入框位置
    watch(
      () => layoutStore.isSidebarExpanded,
      () => {
        setTimeout(() => {
          updateSearchBarHeight();
        }, 280);
      }
    );

    const submitQuery = async () => {
      const mode = searchModeStore.currentMode;
      const submittedQuery = queryModel.value;
      const shouldClearImmediately =
        (mode === 'smart' || mode === 'think') && !!submittedQuery.trim();

      if (shouldClearImmediately) {
        clearVisibleQueryImmediately();
      }

      const didSubmit = await submitCurrentModeQuery({
        queryValue: submittedQuery,
        mode,
        recordInputHistory: true,
        setRoute: true,
      });
      if (!didSubmit) {
        if (shouldClearImmediately) {
          queryModel.value = submittedQuery;
          if (textareaRef.value) {
            textareaRef.value.value = submittedQuery;
          }
          nextTick(() => autoResize());
        }
        return;
      }

      if (shouldClearImmediately) return;
    };

    /** 是否有请求正在进行中（搜索或聊天） */
    const isRequestInProgress = computed(() => {
      return exploreStore.isExploreLoading || chatStore.isLoading;
    });

    /** 中止当前请求（搜索和聊天） */
    const stopRequest = () => {
      abortExplore();
      chatStore.abortCurrentRequest();
    };

    // URL 驱动的搜索
    // - route.query.q 变化时触发 explore（直接查找模式）
    // - route.params.sessionId 变化时尝试恢复 chat 会话（快速问答/智能思考模式）
    // LLM 聊天仅在用户显式提交（回车/点击发送）时触发
    watch(
      () => route.query.q,
      (newQuery, oldQuery) => {
        if (newQuery && newQuery !== oldQuery) {
          if (exploreStore.isRestoringSession) {
            return;
          }
          // 从 URL 恢复搜索模式
          const urlMode = route.query.mode as string | undefined;
          if (urlMode && ['smart', 'think', 'direct'].includes(urlMode)) {
            searchModeStore.setMode(urlMode as SearchMode);
          }

          // Chat 模式下 (smart/think)，URL 变更不触发 explore
          // 搜索由 LLM 工具调用处理
          const effectiveMode = urlMode || searchModeStore.currentMode;
          if (effectiveMode === 'smart' || effectiveMode === 'think') {
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
              // URL 导航只触发搜索，不触发 LLM 聊天
              explore({
                queryValue: String(newQuery),
                setQuery: false,
                setRoute: false,
              });
              layoutStore.setCurrentPage(1);
            }
          }
        }
      },
      { immediate: true }
    );

    // URL 驱动的 chat 会话恢复 (route.params.sessionId 变化时)
    // 当 URL 为 /chat/<sessionId> 时，尝试从搜索历史恢复对应的聊天会话
    watch(
      () => route.params.sessionId as string | undefined,
      async (newChatId) => {
        if (!newChatId) return;
        if (exploreStore.isRestoringSession) return;

        // 如果当前会话已是该 sessionId，无需恢复
        if (chatStore.currentSessionId === newChatId) return;

        // 尝试从 chatStore 历史中恢复
        if (chatStore.restoreBySessionId(newChatId)) {
          return;
        }

        // 尝试从搜索历史的快照中恢复
        await searchHistoryStore.loadHistory();
        const historyItem = searchHistoryStore.findBySessionId(newChatId);
        if (historyItem && historyItem.chatSnapshot) {
          const mode = historyItem.mode || 'smart';
          chatStore.restoreFromSnapshot(historyItem.chatSnapshot);
          chatStore.setCurrentHistoryRecordId(historyItem.id);
          searchModeStore.setMode(mode as SearchMode);
          searchModeStore.forceInitialSessionMode(mode as SearchMode);
          exploreStore.setSubmittedQuery(historyItem.query);
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

    // 当索引更新时（如搜索结果返回后），若输入框仍聚焦且未被抑制则自动显示建议
    watch(suggestIndexVersion, () => {
      if (isInputFocused.value && !suppressSuggest.value) {
        if (!layoutStore.isSuggestVisible) {
          layoutStore.setIsSuggestVisible(true);
        }
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
      isRequestInProgress,
      stopRequest,
      searchInputPlaceholder,
      clearQuery,
      hoveredMode,
      getModeDisplayLabel,
      minRows,
      showDslHelp,
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
  padding: 10px 14px 6px 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: inherit;

  &:focus-within {
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
  }
}

.search-input-box-dense {
  padding: 10px 14px 6px 14px;
  border-radius: 22px;
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

.clear-btn {
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0.35;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.75;
  }
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

/* 停止按钮（方形图标，红色提示） */
.stop-btn {
  opacity: 0.9;
  &:hover {
    opacity: 1;
  }
}

/* 底部工具栏（边框内） */
.search-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 0 4px 0;
  margin-top: 2px;
}

.toolbar-modes {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 模式按钮 */
.mode-btn {
  font-size: 12px !important;
  padding: 3px 10px !important;
  min-height: 28px !important;
  border-radius: 14px !important;
  transition: all 0.2s ease;
  text-transform: none;

  .mode-label {
    font-size: 12px;
    line-height: 1;
  }
}

/* 禁用模式按钮（深度研究）：保持动效但不可点击 */
.mode-btn-disabled {
  cursor: not-allowed !important;
  opacity: 0.45 !important;
  pointer-events: auto; /* 保留 hover 事件以显示 title */
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
  }
  .mode-btn-active {
    font-weight: 500;
  }
  .mode-btn-direct.mode-btn-active {
    color: #00897b !important;
    background-color: rgba(0, 137, 123, 0.1) !important;
  }
  .mode-btn-smart.mode-btn-active {
    color: #1976d2 !important;
    background-color: rgba(25, 118, 210, 0.1) !important;
  }
  .mode-btn-think.mode-btn-active {
    color: #8e24aa !important;
    background-color: rgba(142, 36, 170, 0.1) !important;
  }
  .mode-btn-research.mode-btn-active {
    color: #e64a19 !important;
    background-color: rgba(230, 74, 25, 0.1) !important;
  }
  .mode-btn-direct:hover:not(.mode-btn-active) {
    color: #00897b;
    background-color: rgba(0, 137, 123, 0.06);
  }
  .mode-btn-smart:hover:not(.mode-btn-active) {
    color: #1976d2;
    background-color: rgba(25, 118, 210, 0.06);
  }
  .mode-btn-think:hover:not(.mode-btn-active) {
    color: #8e24aa;
    background-color: rgba(142, 36, 170, 0.06);
  }
  .mode-btn-research:hover:not(.mode-btn-active) {
    color: #e64a19;
    background-color: rgba(230, 74, 25, 0.06);
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
  }
  .mode-btn-active {
    font-weight: 500;
  }
  .mode-btn-direct.mode-btn-active {
    color: #4db6ac !important;
    background-color: rgba(0, 150, 136, 0.18) !important;
  }
  .mode-btn-smart.mode-btn-active {
    color: #64b5f6 !important;
    background-color: rgba(33, 150, 243, 0.18) !important;
  }
  .mode-btn-think.mode-btn-active {
    color: #ce93d8 !important;
    background-color: rgba(156, 39, 176, 0.18) !important;
  }
  .mode-btn-research.mode-btn-active {
    color: #ff8a65 !important;
    background-color: rgba(255, 87, 34, 0.18) !important;
  }
  .mode-btn-direct:hover:not(.mode-btn-active) {
    color: #4db6ac;
    background-color: rgba(0, 150, 136, 0.1);
  }
  .mode-btn-smart:hover:not(.mode-btn-active) {
    color: #64b5f6;
    background-color: rgba(33, 150, 243, 0.1);
  }
  .mode-btn-think:hover:not(.mode-btn-active) {
    color: #ce93d8;
    background-color: rgba(156, 39, 176, 0.1);
  }
  .mode-btn-research:hover:not(.mode-btn-active) {
    color: #ff8a65;
    background-color: rgba(255, 87, 34, 0.1);
  }
}
</style>
